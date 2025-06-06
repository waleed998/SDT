import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

// Get available time slots for a doctor on a specific date
export const getAvailableSlots = query({
  args: {
    doctorId: v.id("users"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const doctorProfile = await ctx.db
      .query("doctorProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", args.doctorId))
      .unique();

    if (!doctorProfile) return [];

    const dayOfWeek = new Date(args.date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    
    const workingDay = doctorProfile.workingHours[dayOfWeek as keyof typeof doctorProfile.workingHours];
    
    if (!workingDay.isWorking) return [];

    // Check if doctor is on leave
    if (doctorProfile.leaveDays.includes(args.date)) return [];

    // Generate time slots
    const slots = [];
    const startTime = workingDay.start;
    const endTime = workingDay.end;
    const duration = doctorProfile.sessionDuration;

    let currentTime = startTime;
    while (currentTime < endTime) {
      // Check if slot is already booked
      const existingSlot = await ctx.db
        .query("availabilitySlots")
        .withIndex("by_doctor_and_date", (q) => 
          q.eq("doctorId", args.doctorId).eq("date", args.date)
        )
        .filter((q) => q.eq(q.field("timeSlot"), currentTime))
        .unique();

      if (!existingSlot || !existingSlot.isBooked) {
        slots.push(currentTime);
      }

      // Add duration to current time
      const [hours, minutes] = currentTime.split(":").map(Number);
      const totalMinutes = hours * 60 + minutes + duration;
      const newHours = Math.floor(totalMinutes / 60);
      const newMinutes = totalMinutes % 60;
      currentTime = `${newHours.toString().padStart(2, "0")}:${newMinutes.toString().padStart(2, "0")}`;
    }

    return slots;
  },
});

// Book an appointment
export const bookAppointment = mutation({
  args: {
    doctorId: v.id("users"),
    appointmentDate: v.string(),
    appointmentTime: v.string(),
    visitType: v.union(
      v.literal("consultation"),
      v.literal("pain"),
      v.literal("cleaning"),
      v.literal("filling"),
      v.literal("extraction"),
      v.literal("checkup"),
      v.literal("other")
    ),
    notes: v.optional(v.string()),
    attachments: v.optional(v.array(v.id("_storage"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const now = Date.now();

    // Create appointment
    const appointmentId = await ctx.db.insert("appointments", {
      patientId: userId,
      doctorId: args.doctorId,
      appointmentDate: args.appointmentDate,
      appointmentTime: args.appointmentTime,
      visitType: args.visitType,
      status: "pending",
      notes: args.notes,
      attachments: args.attachments,
      createdAt: now,
      updatedAt: now,
    });

    // Create or update availability slot
    const existingSlot = await ctx.db
      .query("availabilitySlots")
      .withIndex("by_doctor_and_date", (q) => 
        q.eq("doctorId", args.doctorId).eq("date", args.appointmentDate)
      )
      .filter((q) => q.eq(q.field("timeSlot"), args.appointmentTime))
      .unique();

    if (existingSlot) {
      await ctx.db.patch(existingSlot._id, {
        isBooked: true,
        appointmentId,
      });
    } else {
      await ctx.db.insert("availabilitySlots", {
        doctorId: args.doctorId,
        date: args.appointmentDate,
        timeSlot: args.appointmentTime,
        isBooked: true,
        appointmentId,
      });
    }

    // Create notification for doctor
    await ctx.db.insert("notifications", {
      userId: args.doctorId,
      type: "appointment_request",
      title: "New Appointment Request",
      message: `You have a new appointment request for ${args.appointmentDate} at ${args.appointmentTime}`,
      isRead: false,
      relatedAppointmentId: appointmentId,
      createdAt: now,
    });

    return appointmentId;
  },
});

// Get appointments for current user
export const getMyAppointments = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!userProfile) return [];

    let appointments;
    if (userProfile.role === "doctor") {
      appointments = await ctx.db
        .query("appointments")
        .withIndex("by_doctor", (q) => q.eq("doctorId", userId))
        .order("desc")
        .collect();
    } else {
      appointments = await ctx.db
        .query("appointments")
        .withIndex("by_patient", (q) => q.eq("patientId", userId))
        .order("desc")
        .collect();
    }

    // Get related user info for each appointment
    const appointmentsWithUsers = await Promise.all(
      appointments.map(async (appointment) => {
        const otherUserId = userProfile.role === "doctor" 
          ? appointment.patientId 
          : appointment.doctorId;
        
        const otherUser = await ctx.db
          .query("userProfiles")
          .withIndex("by_user_id", (q) => q.eq("userId", otherUserId))
          .unique();

        return {
          ...appointment,
          otherUser,
        };
      })
    );

    return appointmentsWithUsers;
  },
});

// Update appointment status (for doctors)
export const updateAppointmentStatus = mutation({
  args: {
    appointmentId: v.id("appointments"),
    status: v.union(
      v.literal("confirmed"),
      v.literal("rejected"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) throw new Error("Appointment not found");

    // Verify user is the doctor for this appointment
    if (appointment.doctorId !== userId) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.appointmentId, {
      status: args.status,
      updatedAt: Date.now(),
    });

    // Update availability slot if rejected or cancelled
    if (args.status === "rejected" || args.status === "cancelled") {
      const slot = await ctx.db
        .query("availabilitySlots")
        .withIndex("by_doctor_and_date", (q) => 
          q.eq("doctorId", appointment.doctorId).eq("date", appointment.appointmentDate)
        )
        .filter((q) => q.eq(q.field("timeSlot"), appointment.appointmentTime))
        .unique();

      if (slot) {
        await ctx.db.patch(slot._id, {
          isBooked: false,
          appointmentId: undefined,
        });
      }
    }

    // Create notification for patient
    const notificationType = args.status === "confirmed" 
      ? "appointment_confirmed" 
      : args.status === "rejected" 
      ? "appointment_rejected" 
      : "appointment_cancelled";

    const notificationMessage = args.status === "confirmed"
      ? `Your appointment for ${appointment.appointmentDate} at ${appointment.appointmentTime} has been confirmed`
      : args.status === "rejected"
      ? `Your appointment request for ${appointment.appointmentDate} at ${appointment.appointmentTime} has been rejected`
      : `Your appointment for ${appointment.appointmentDate} at ${appointment.appointmentTime} has been cancelled`;

    await ctx.db.insert("notifications", {
      userId: appointment.patientId,
      type: notificationType,
      title: "Appointment Update",
      message: notificationMessage,
      isRead: false,
      relatedAppointmentId: args.appointmentId,
      createdAt: Date.now(),
    });

    return args.appointmentId;
  },
});

// Get today's appointments for doctor
export const getTodayAppointments = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const today = new Date().toISOString().split('T')[0];

    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_doctor_and_date", (q) => q.eq("doctorId", userId).eq("appointmentDate", today))
      .collect();

    const appointmentsWithPatients = await Promise.all(
      appointments.map(async (appointment) => {
        const patient = await ctx.db
          .query("userProfiles")
          .withIndex("by_user_id", (q) => q.eq("userId", appointment.patientId))
          .unique();

        return {
          ...appointment,
          patient,
        };
      })
    );

    return appointmentsWithPatients.sort((a, b) => 
      a.appointmentTime.localeCompare(b.appointmentTime)
    );
  },
});
