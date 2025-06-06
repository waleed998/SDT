import { v } from "convex/values";
import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get dashboard analytics
export const getDashboardAnalytics = query({
  args: {
    period: v.union(v.literal("week"), v.literal("month"), v.literal("year")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    // Verify user is a doctor
    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!userProfile || userProfile.role !== "doctor") {
      return null;
    }

    const now = new Date();
    let startDate: Date;

    switch (args.period) {
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "year":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
    }

    const startTimestamp = startDate.getTime();

    // Get appointments in period
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_doctor", (q) => q.eq("doctorId", userId))
      .filter((q) => q.gte(q.field("createdAt"), startTimestamp))
      .collect();

    // Get invoices in period
    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_doctor", (q) => q.eq("doctorId", userId))
      .filter((q) => q.gte(q.field("createdAt"), startTimestamp))
      .collect();

    // Calculate metrics
    const totalAppointments = appointments.length;
    const completedAppointments = appointments.filter(a => a.status === "completed").length;
    const cancelledAppointments = appointments.filter(a => a.status === "cancelled" || a.status === "no_show").length;
    
    const totalRevenue = invoices
      .filter(i => i.status === "paid")
      .reduce((sum, i) => sum + i.total, 0);
    
    const pendingRevenue = invoices
      .filter(i => i.status === "pending")
      .reduce((sum, i) => sum + i.total, 0);

    // Visit type distribution
    const visitTypes = appointments.reduce((acc, appointment) => {
      acc[appointment.visitType] = (acc[appointment.visitType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Daily appointment counts for charts
    const dailyAppointments = appointments.reduce((acc, appointment) => {
      const date = appointment.appointmentDate;
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalAppointments,
      completedAppointments,
      cancelledAppointments,
      completionRate: totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0,
      totalRevenue,
      pendingRevenue,
      averageRevenuePerAppointment: completedAppointments > 0 ? totalRevenue / completedAppointments : 0,
      visitTypes,
      dailyAppointments,
      period: args.period,
    };
  },
});

// Get patient analytics
export const getPatientAnalytics = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    // Verify user is a doctor
    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!userProfile || userProfile.role !== "doctor") {
      return null;
    }

    // Get all patients who have appointments with this doctor
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_doctor", (q) => q.eq("doctorId", userId))
      .collect();

    const uniquePatients = [...new Set(appointments.map(a => a.patientId))];
    
    // Get patient profiles
    const patients = await Promise.all(
      uniquePatients.map(async (patientId) => {
        const patient = await ctx.db
          .query("userProfiles")
          .withIndex("by_user_id", (q) => q.eq("userId", patientId))
          .unique();
        
        const patientAppointments = appointments.filter(a => a.patientId === patientId);
        const lastVisit = patientAppointments
          .filter(a => a.status === "completed")
          .sort((a, b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime())[0];

        return {
          ...patient,
          totalVisits: patientAppointments.filter(a => a.status === "completed").length,
          lastVisit: lastVisit?.appointmentDate,
          totalSpent: 0, // Would calculate from invoices
        };
      })
    );

    // Age distribution
    const ageGroups = patients.reduce((acc, patient) => {
      if (!patient?.age) return acc;
      
      const ageGroup = patient.age < 18 ? "Under 18" :
                     patient.age < 35 ? "18-34" :
                     patient.age < 55 ? "35-54" :
                     "55+";
      
      acc[ageGroup] = (acc[ageGroup] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Gender distribution
    const genderDistribution = patients.reduce((acc, patient) => {
      const gender = patient?.gender || "Unknown";
      acc[gender] = (acc[gender] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalPatients: uniquePatients.length,
      newPatientsThisMonth: patients.filter(p => {
        if (!p?.createdAt) return false;
        const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        return p.createdAt > monthAgo;
      }).length,
      ageGroups,
      genderDistribution,
      topPatients: patients
        .sort((a, b) => (b?.totalVisits || 0) - (a?.totalVisits || 0))
        .slice(0, 10),
    };
  },
});
