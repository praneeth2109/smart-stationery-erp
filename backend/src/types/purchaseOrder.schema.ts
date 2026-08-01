// Zod schemas for Purchase Order validation
import { z } from "zod";

export const createPurchaseOrderSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, "Product is required"),
        quantity: z.number().int().positive("Quantity must be a positive integer"),
        unitCost: z.number().nonnegative("Unit cost must be a non-negative number"),
      })
    )
    .min(1, "Purchase order must contain at least one item"),
});

export const updatePoStatusSchema = z.object({
  status: z.enum(["PENDING", "ORDERED", "RECEIVED", "CANCELLED"]),
});

export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;
export type UpdatePoStatusInput = z.infer<typeof updatePoStatusSchema>;
