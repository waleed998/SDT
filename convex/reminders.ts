import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

// Create reminder
export const createReminder = mutation({
  args: {
    patientId: v.id("users"),
    type: v.union(
      v.literal("appointment_followup"),
      v.literal("medication"),
      v.literal("checkup"),
      v.literal("cleaning"),
      v.literal("custom")
    ),
    title: v.string(),
    message: v.string(),
    reminderDate: v.string(),
    isRecurring: v.boolean(),
    recurringInterval: v.optional(v.union(
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("monthly"),
      v.literal("yearly")
    )),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const reminderId = await ctx.db.insert("reminders", {
      doctorId: userId,
      patientId: args.patientId,
      type: args.type,
      title: args.title,
      message: args.message,
      reminderDate: args.reminderDate,
      isRecurring: args.isRecurring,
      recurringInterval: args.recurringInterval,
      status: "active",
      createdAt: Date.now(),
    });

    return reminderId;
  },
});

// Get reminders for doctor
export const getDoctorReminders = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const reminders = await ctx.db
      .query("reminders")
      .withIndex("by_doctor", (q) => q.eq("doctorId", userId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .order("asc")
      .collect();

    // Get patient info for each reminder
    const remindersWithPatients = await Promise.all(
      reminders.map(async (reminder) => {
        const patient = await ctx.db
          .query("userProfiles")
          .withIndex("by_user_id", (q) => q.eq("userId", reminder.patientId))
          .unique();

        return {
          ...reminder,
          patient,
        };
      })
    );

    return remindersWithPatients;
  },
});

// Internal query to get today's reminders
export const getTodayReminders = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("reminders")
      .withIndex("by_date", (q) => q.eq("reminderDate", args.date))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();
  },
});

// Create notification (internal)
export const createNotification = mutation({
  args: {
    userId: v.id("users"),
    type: v.string(),
    title: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("notifications", {
      userId: args.userId,
      type: args.type as any,
      title: args.title,
      message: args.message,
      isRead: false,
      createdAt: Date.now(),
    });
  },
});
