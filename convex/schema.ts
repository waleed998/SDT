import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  // User profiles with role-based access
  userProfiles: defineTable({
    userId: v.id("users"),
    role: v.union(v.literal("doctor"), v.literal("patient")),
    fullName: v.string(),
    phoneNumber: v.string(),
    email: v.optional(v.string()),
    gender: v.optional(v.union(v.literal("male"), v.literal("female"))),
    age: v.optional(v.number()),
    language: v.union(v.literal("en"), v.literal("ar")),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_role", ["role"])
    .index("by_role_and_active", ["role", "isActive"]),

  // Doctor-specific information
  doctorProfiles: defineTable({
    userId: v.id("users"),
    specialization: v.optional(v.string()),
    licenseNumber: v.optional(v.string()),
    workingHours: v.object({
      monday: v.object({ start: v.string(), end: v.string(), isWorking: v.boolean() }),
      tuesday: v.object({ start: v.string(), end: v.string(), isWorking: v.boolean() }),
      wednesday: v.object({ start: v.string(), end: v.string(), isWorking: v.boolean() }),
      thursday: v.object({ start: v.string(), end: v.string(), isWorking: v.boolean() }),
      friday: v.object({ start: v.string(), end: v.string(), isWorking: v.boolean() }),
      saturday: v.object({ start: v.string(), end: v.string(), isWorking: v.boolean() }),
      sunday: v.object({ start: v.string(), end: v.string(), isWorking: v.boolean() }),
    }),
    isOnline: v.boolean(),
    sessionDuration: v.number(), // in minutes
    leaveDays: v.array(v.string()), // ISO date strings
  }).index("by_user_id", ["userId"]),

  // Patient-specific information
  patientProfiles: defineTable({
    userId: v.id("users"),
    preferredDoctorId: v.optional(v.id("users")),
    medicalHistory: v.object({
      allergies: v.array(v.string()),
      chronicDiseases: v.array(v.string()),
      specialNotes: v.string(),
    }),
    emergencyContact: v.optional(v.object({
      name: v.string(),
      phone: v.string(),
      relationship: v.string(),
    })),
  }).index("by_user_id", ["userId"]),

  // Appointments
  appointments: defineTable({
    patientId: v.id("users"),
    doctorId: v.id("users"),
    appointmentDate: v.string(), // ISO date string
    appointmentTime: v.string(), // HH:MM format
    visitType: v.union(
      v.literal("consultation"),
      v.literal("pain"),
      v.literal("cleaning"),
      v.literal("filling"),
      v.literal("extraction"),
      v.literal("checkup"),
      v.literal("other")
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("rejected"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("no_show")
    ),
    notes: v.optional(v.string()),
    attachments: v.optional(v.array(v.id("_storage"))),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_patient", ["patientId"])
    .index("by_doctor", ["doctorId"])
    .index("by_doctor_and_date", ["doctorId", "appointmentDate"])
    .index("by_status", ["status"])
    .index("by_date", ["appointmentDate"]),

  // Enhanced Medical records
  medicalRecords: defineTable({
    patientId: v.id("users"),
    doctorId: v.id("users"),
    appointmentId: v.id("appointments"),
    sessionDate: v.string(),
    diagnosis: v.string(),
    treatment: v.string(),
    prescription: v.optional(v.string()),
    doctorNotes: v.string(),
    followUpRequired: v.boolean(),
    followUpDate: v.optional(v.string()),
    attachments: v.optional(v.array(v.id("_storage"))),
    teethChart: v.optional(v.record(v.string(), v.string())),
    symptoms: v.array(v.string()),
    vitalSigns: v.optional(v.object({
      bloodPressure: v.optional(v.string()),
      heartRate: v.optional(v.number()),
      temperature: v.optional(v.number()),
    })),
    createdAt: v.number(),
  })
    .index("by_patient", ["patientId"])
    .index("by_doctor", ["doctorId"])
    .index("by_appointment", ["appointmentId"]),

  // Feedback and ratings
  feedback: defineTable({
    patientId: v.id("users"),
    doctorId: v.id("users"),
    appointmentId: v.id("appointments"),
    rating: v.number(), // 1-5 stars
    comment: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_patient", ["patientId"])
    .index("by_doctor", ["doctorId"])
    .index("by_appointment", ["appointmentId"]),

  // Enhanced Notifications
  notifications: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("appointment_request"),
      v.literal("appointment_confirmed"),
      v.literal("appointment_rejected"),
      v.literal("appointment_reminder"),
      v.literal("appointment_cancelled"),
      v.literal("session_summary"),
      v.literal("invoice_created"),
      v.literal("payment_received"),
      v.literal("reminder"),
      v.literal("low_stock")
    ),
    title: v.string(),
    message: v.string(),
    isRead: v.boolean(),
    relatedAppointmentId: v.optional(v.id("appointments")),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_read", ["userId", "isRead"]),

  // Doctor availability slots
  availabilitySlots: defineTable({
    doctorId: v.id("users"),
    date: v.string(), // ISO date string
    timeSlot: v.string(), // HH:MM format
    isBooked: v.boolean(),
    appointmentId: v.optional(v.id("appointments")),
  })
    .index("by_doctor_and_date", ["doctorId", "date"])
    .index("by_doctor_date_available", ["doctorId", "date", "isBooked"]),

  // Invoices and Billing
  invoices: defineTable({
    invoiceNumber: v.string(),
    patientId: v.id("users"),
    doctorId: v.id("users"),
    appointmentId: v.optional(v.id("appointments")),
    items: v.array(v.object({
      description: v.string(),
      quantity: v.number(),
      unitPrice: v.number(),
      total: v.number(),
    })),
    subtotal: v.number(),
    tax: v.number(),
    discount: v.number(),
    total: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("paid"),
      v.literal("overdue"),
      v.literal("cancelled")
    ),
    issueDate: v.string(),
    dueDate: v.string(),
    paymentMethod: v.optional(v.string()),
    paymentDate: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_patient", ["patientId"])
    .index("by_doctor", ["doctorId"])
    .index("by_status", ["status"])
    .index("by_invoice_number", ["invoiceNumber"]),

  // Inventory Management
  inventory: defineTable({
    name: v.string(),
    category: v.union(
      v.literal("instruments"),
      v.literal("materials"),
      v.literal("medications"),
      v.literal("supplies"),
      v.literal("equipment")
    ),
    description: v.optional(v.string()),
    quantity: v.number(),
    minQuantity: v.number(),
    unitPrice: v.number(),
    supplier: v.optional(v.string()),
    expiryDate: v.optional(v.string()),
    batchNumber: v.optional(v.string()),
    status: v.union(v.literal("in_stock"), v.literal("low_stock"), v.literal("out_of_stock")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_category", ["category"])
    .index("by_status", ["status"])
    .index("by_name", ["name"]),

  // Inventory Logs
  inventoryLogs: defineTable({
    itemId: v.id("inventory"),
    userId: v.id("users"),
    operation: v.union(v.literal("add"), v.literal("subtract"), v.literal("set")),
    quantityChange: v.number(),
    previousQuantity: v.number(),
    newQuantity: v.number(),
    reason: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_item", ["itemId"])
    .index("by_user", ["userId"]),

  // Reminders System
  reminders: defineTable({
    doctorId: v.id("users"),
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
    status: v.union(v.literal("active"), v.literal("completed"), v.literal("cancelled")),
    createdAt: v.number(),
  })
    .index("by_doctor", ["doctorId"])
    .index("by_patient", ["patientId"])
    .index("by_date", ["reminderDate"])
    .index("by_status", ["status"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
