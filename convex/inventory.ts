import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Add inventory item
export const addInventoryItem = mutation({
  args: {
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
      throw new Error("Only doctors can manage inventory");
    }

    const itemId = await ctx.db.insert("inventory", {
      name: args.name,
      category: args.category,
      description: args.description,
      quantity: args.quantity,
      minQuantity: args.minQuantity,
      unitPrice: args.unitPrice,
      supplier: args.supplier,
      expiryDate: args.expiryDate,
      batchNumber: args.batchNumber,
      status: args.quantity <= args.minQuantity ? "low_stock" : "in_stock",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return itemId;
  },
});

// Get inventory items
export const getInventoryItems = query({
  args: {
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Verify user is a doctor
    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!userProfile || userProfile.role !== "doctor") {
      return [];
    }

    if (args.category) {
      const items = await ctx.db
        .query("inventory")
        .withIndex("by_category", (q) => q.eq("category", args.category as any))
        .order("desc")
        .collect();
      return items;
    }

    const items = await ctx.db.query("inventory").order("desc").collect();
    return items;
  },
});

// Update inventory quantity
export const updateInventoryQuantity = mutation({
  args: {
    itemId: v.id("inventory"),
    quantity: v.number(),
    operation: v.union(v.literal("add"), v.literal("subtract"), v.literal("set")),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Item not found");

    let newQuantity;
    switch (args.operation) {
      case "add":
        newQuantity = item.quantity + args.quantity;
        break;
      case "subtract":
        newQuantity = Math.max(0, item.quantity - args.quantity);
        break;
      case "set":
        newQuantity = args.quantity;
        break;
    }

    const newStatus = newQuantity <= item.minQuantity ? "low_stock" : "in_stock";

    await ctx.db.patch(args.itemId, {
      quantity: newQuantity,
      status: newStatus,
      updatedAt: Date.now(),
    });

    // Log the inventory change
    await ctx.db.insert("inventoryLogs", {
      itemId: args.itemId,
      userId,
      operation: args.operation,
      quantityChange: args.quantity,
      previousQuantity: item.quantity,
      newQuantity,
      reason: args.reason,
      createdAt: Date.now(),
    });

    return args.itemId;
  },
});

// Get low stock items
export const getLowStockItems = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const items = await ctx.db
      .query("inventory")
      .withIndex("by_status", (q) => q.eq("status", "low_stock"))
      .collect();

    return items;
  },
});
