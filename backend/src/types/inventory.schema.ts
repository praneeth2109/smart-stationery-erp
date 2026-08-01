import { z } from "zod";

export const stockAdjustmentSchema = z.object({
  quantity: z.number().int("Quantity must be an integer"),
  type: z.enum(["RECEIVED", "SOLD", "DAMAGED", "RESERVED", "RETURNED", "ADJUSTMENT"]),
  reason: z.string().optional().nullable(),
});

export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;
