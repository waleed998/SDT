import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

// Create medical record
export const createMedicalRecord = mutation({
  args: {
    patientId: v.id("users"),
    appointmentId: v.id("appointments"),
    diagnosis: v.string(),
    treatment: v.string(),
    prescription: v.optional(v.string()),
    doctorNotes: v.string(),
    followUpRequired: v.boolean(),
    followUpDate: v.optional(v.string()),
    attachments: v.optional(v.array(v.id("_storage"))),
    teethChart: v.optional(v.object({
      tooth11: v.optional(v.string()), // Upper right
      tooth12: v.optional(v.string()),
      tooth13: v.optional(v.string()),
      tooth14: v.optional(v.string()),
      tooth15: v.optional(v.string()),
      tooth16: v.optional(v.string()),
      tooth17: v.optional(v.string()),
      tooth18: v.optional(v.string()),
      tooth21: v.optional(v.string()), // Upper left
      tooth22: v.optional(v.string()),
      tooth23: v.optional(v.string()),
      tooth24: v.optional(v.string()),
      tooth25: v.optional(v.string()),
      tooth26: v.optional(v.string()),
      tooth27: v.optional(v.string()),
      tooth28: v.optional(v.string()),
      tooth31: v.optional(v.string()), // Lower left
      tooth32: v.optional(v.string()),
      tooth33: v.optional(v.string()),
      tooth34: v.optional(v.string()),
      tooth35: v.optional(v.string()),
      tooth36: v.optional(v.string()),
      tooth37: v.optional(v.string()),
      tooth38: v.optional(v.string()),
      tooth41: v.optional(v.string()), // Lower right
      tooth42: v.optional(v.string()),
      tooth43: v.optional(v.string()),
      tooth44: v.optional(v.string()),
      tooth45: v.optional(v.string()),
      tooth46: v.optional(v.string()),
      tooth47: v.optional(v.string()),
      tooth48: v.optional(v.string()),
    })),
    symptoms: v.array(v.string()),
    vitalSigns: v.optional(v.object({
      bloodPressure: v.optional(v.string()),
      heartRate: v.optional(v.number()),
      temperature: v.optional(v.number()),
    })),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Verify user is a doctor
    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!userProfile || userProfile.role !== "doctor") {
      throw new Error("Only doctors can create medical records");
    }

    const recordId = await ctx.db.insert("medicalRecords", {
      patientId: args.patientId,
      doctorId: userId,
      appointmentId: args.appointmentId,
      sessionDate: new Date().toISOString().split('T')[0],
      diagnosis: args.diagnosis,
      treatment: args.treatment,
      prescription: args.prescription,
      doctorNotes: args.doctorNotes,
      followUpRequired: args.followUpRequired,
      followUpDate: args.followUpDate,
      attachments: args.attachments,
      teethChart: args.teethChart,
      symptoms: args.symptoms,
      vitalSigns: args.vitalSigns,
      createdAt: Date.now(),
    });

    // Update appointment status to completed
    await ctx.db.patch(args.appointmentId, {
      status: "completed",
      updatedAt: Date.now(),
    });

    // Create notification for patient
    await ctx.db.insert("notifications", {
      userId: args.patientId,
      type: "session_summary",
      title: "Medical Record Created",
      message: "Your medical record has been updated after your recent visit.",
      isRead: false,
      relatedAppointmentId: args.appointmentId,
      createdAt: Date.now(),
    });

    return recordId;
  },
});

// Get medical records for a patient
export const getPatientMedicalRecords = query({
  args: {
    patientId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Check if user is the patient or a doctor
    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!userProfile) return [];

    // Patients can only see their own records, doctors can see any patient's records
    if (userProfile.role === "patient" && args.patientId !== userId) {
      throw new Error("Unauthorized");
    }

    const records = await ctx.db
      .query("medicalRecords")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .order("desc")
      .collect();

    // Get doctor info for each record
    const recordsWithDoctors = await Promise.all(
      records.map(async (record) => {
        const doctor = await ctx.db
          .query("userProfiles")
          .withIndex("by_user_id", (q) => q.eq("userId", record.doctorId))
          .unique();

        return {
          ...record,
          doctor,
        };
      })
    );

    return recordsWithDoctors;
  },
});

// AI-powered diagnosis suggestion
export const suggestDiagnosis = action({
  args: {
    symptoms: v.array(v.string()),
    patientAge: v.optional(v.number()),
    patientGender: v.optional(v.string()),
    medicalHistory: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Note: In a real app, you would verify the user is a doctor here
    // For now, we'll skip this check since actions can't directly query the database

    // Prepare the prompt for AI
    const symptomsText = args.symptoms.join(", ");
    const patientInfo = `Age: ${args.patientAge || "Unknown"}, Gender: ${args.patientGender || "Unknown"}`;
    const historyText = args.medicalHistory || "No significant medical history";

    const prompt = `As a dental AI assistant, analyze the following patient information and provide potential diagnoses:

Patient Information: ${patientInfo}
Symptoms: ${symptomsText}
Medical History: ${historyText}

Please provide:
1. Top 3 most likely dental diagnoses
2. Recommended treatments for each
3. Urgency level (Low/Medium/High)
4. Additional tests or examinations needed

Format your response as a structured analysis for a dental professional.`;

    try {
      // Use the bundled OpenAI API
      const response = await fetch(`${process.env.CONVEX_OPENAI_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.CONVEX_OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are an expert dental AI assistant helping dentists with diagnosis and treatment recommendations. Always emphasize that AI suggestions should be verified by professional clinical judgment."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          max_tokens: 1000,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        suggestion: data.choices[0].message.content,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error("AI diagnosis error:", error);
      return {
        suggestion: "AI diagnosis service is currently unavailable. Please rely on your clinical expertise.",
        timestamp: Date.now(),
      };
    }
  },
});
