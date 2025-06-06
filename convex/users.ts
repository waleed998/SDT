import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get current user profile
export const getCurrentUserProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    return profile;
  },
});

// Create user profile with role selection
export const createUserProfile = mutation({
  args: {
    role: v.union(v.literal("doctor"), v.literal("patient")),
    fullName: v.string(),
    phoneNumber: v.string(),
    email: v.optional(v.string()),
    gender: v.optional(v.union(v.literal("male"), v.literal("female"))),
    age: v.optional(v.number()),
    language: v.union(v.literal("en"), v.literal("ar")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const now = Date.now();

    // Create user profile
    const profileId = await ctx.db.insert("userProfiles", {
      userId,
      role: args.role,
      fullName: args.fullName,
      phoneNumber: args.phoneNumber,
      email: args.email,
      gender: args.gender,
      age: args.age,
      language: args.language,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // Create role-specific profile
    if (args.role === "doctor") {
      await ctx.db.insert("doctorProfiles", {
        userId,
        workingHours: {
          monday: { start: "09:00", end: "17:00", isWorking: true },
          tuesday: { start: "09:00", end: "17:00", isWorking: true },
          wednesday: { start: "09:00", end: "17:00", isWorking: true },
          thursday: { start: "09:00", end: "17:00", isWorking: true },
          friday: { start: "09:00", end: "17:00", isWorking: true },
          saturday: { start: "09:00", end: "14:00", isWorking: true },
          sunday: { start: "09:00", end: "14:00", isWorking: false },
        },
        isOnline: false,
        sessionDuration: 30,
        leaveDays: [],
      });
    } else {
      await ctx.db.insert("patientProfiles", {
        userId,
        medicalHistory: {
          allergies: [],
          chronicDiseases: [],
          specialNotes: "",
        },
      });
    }

    return profileId;
  },
});

// Get all active doctors for patient selection
export const getActiveDoctors = query({
  args: {},
  handler: async (ctx) => {
    const doctors = await ctx.db
      .query("userProfiles")
      .withIndex("by_role_and_active", (q) => q.eq("role", "doctor").eq("isActive", true))
      .collect();

    const doctorsWithProfiles = await Promise.all(
      doctors.map(async (doctor) => {
        const doctorProfile = await ctx.db
          .query("doctorProfiles")
          .withIndex("by_user_id", (q) => q.eq("userId", doctor.userId))
          .unique();

        return {
          ...doctor,
          doctorProfile,
        };
      })
    );

    return doctorsWithProfiles;
  },
});

// Update user profile
export const updateUserProfile = mutation({
  args: {
    fullName: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    email: v.optional(v.string()),
    language: v.optional(v.union(v.literal("en"), v.literal("ar"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!profile) throw new Error("Profile not found");

    await ctx.db.patch(profile._id, {
      ...args,
      updatedAt: Date.now(),
    });
  },
});

// Update doctor status (online/offline)
export const updateDoctorStatus = mutation({
  args: {
    isOnline: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const doctorProfile = await ctx.db
      .query("doctorProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!doctorProfile) throw new Error("Doctor profile not found");

    await ctx.db.patch(doctorProfile._id, {
      isOnline: args.isOnline,
    });
  },
});
