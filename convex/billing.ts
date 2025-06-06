import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Create invoice
export const createInvoice = mutation({
  args: {
    patientId: v.id("users"),
    appointmentId: v.optional(v.id("appointments")),
    items: v.array(v.object({
      description: v.string(),
      quantity: v.number(),
      unitPrice: v.number(),
      total: v.number(),
    })),
    subtotal: v.number(),
    tax: v.number(),
    discount: v.optional(v.number()),
    total: v.number(),
    dueDate: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Verify user is a doctor or admin
    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!userProfile || userProfile.role !== "doctor") {
      throw new Error("Only doctors can create invoices");
    }

    const invoiceNumber = `INV-${Date.now()}`;

    const invoiceId = await ctx.db.insert("invoices", {
      invoiceNumber,
      patientId: args.patientId,
      doctorId: userId,
      appointmentId: args.appointmentId,
      items: args.items,
      subtotal: args.subtotal,
      tax: args.tax,
      discount: args.discount || 0,
      total: args.total,
      status: "pending",
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: args.dueDate,
      notes: args.notes,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create notification for patient
    await ctx.db.insert("notifications", {
      userId: args.patientId,
      type: "invoice_created",
      title: "New Invoice",
      message: `Invoice ${invoiceNumber} has been created. Amount: $${args.total}`,
      isRead: false,
      createdAt: Date.now(),
    });

    return invoiceId;
  },
});

// Get invoices for current user
export const getMyInvoices = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!userProfile) return [];

    let invoices;
    if (userProfile.role === "doctor") {
      invoices = await ctx.db
        .query("invoices")
        .withIndex("by_doctor", (q) => q.eq("doctorId", userId))
        .order("desc")
        .collect();
    } else {
      invoices = await ctx.db
        .query("invoices")
        .withIndex("by_patient", (q) => q.eq("patientId", userId))
        .order("desc")
        .collect();
    }

    // Get related user info for each invoice
    const invoicesWithUsers = await Promise.all(
      invoices.map(async (invoice) => {
        const otherUserId = userProfile.role === "doctor" 
          ? invoice.patientId 
          : invoice.doctorId;
        
        const otherUser = await ctx.db
          .query("userProfiles")
          .withIndex("by_user_id", (q) => q.eq("userId", otherUserId))
          .unique();

        return {
          ...invoice,
          otherUser,
        };
      })
    );

    return invoicesWithUsers;
  },
});

// Update invoice status
export const updateInvoiceStatus = mutation({
  args: {
    invoiceId: v.id("invoices"),
    status: v.union(
      v.literal("pending"),
      v.literal("paid"),
      v.literal("overdue"),
      v.literal("cancelled")
    ),
    paymentMethod: v.optional(v.string()),
    paymentDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) throw new Error("Invoice not found");

    // Verify user is the doctor who created the invoice
    if (invoice.doctorId !== userId) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.invoiceId, {
      status: args.status,
      paymentMethod: args.paymentMethod,
      paymentDate: args.paymentDate,
      updatedAt: Date.now(),
    });

    // Create notification for patient if paid
    if (args.status === "paid") {
      await ctx.db.insert("notifications", {
        userId: invoice.patientId,
        type: "payment_received",
        title: "Payment Received",
        message: `Payment for invoice ${invoice.invoiceNumber} has been received.`,
        isRead: false,
        createdAt: Date.now(),
      });
    }

    return args.invoiceId;
  },
});
