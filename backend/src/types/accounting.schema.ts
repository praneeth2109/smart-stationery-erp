// Zod schemas for Accounting (Phase 6) validation
import { z } from "zod";

// ---------------------------------------------------------------------------
// EXPENSE
// ---------------------------------------------------------------------------

export const expenseCategoryEnum = z.enum([
  "RENT",
  "SALARY",
  "UTILITIES",
  "SUPPLIES",
  "MARKETING",
  "OTHER",
]);

export const createExpenseSchema = z.object({
  category: expenseCategoryEnum,
  description: z.string().min(1, "Description is required").max(500),
  amount: z.number().positive("Amount must be positive"),
  date: z.string().datetime({ message: "Invalid ISO date string" }),
});

export const updateExpenseSchema = createExpenseSchema.partial();

// ---------------------------------------------------------------------------
// SUPPLIER PAYMENT
// ---------------------------------------------------------------------------

export const supplierPaymentSchema = z.object({
  purchaseOrderId: z.string().min(1, "Purchase order is required"),
  supplierId: z.string().min(1, "Supplier is required"),
  amount: z.number().positive("Amount must be positive"),
  paymentMethod: z.enum(["CASH", "UPI", "BANK_TRANSFER", "CHEQUE"]),
  reference: z.string().optional(),
  note: z.string().max(500).optional(),
  paidAt: z.string().datetime({ message: "Invalid ISO date string" }),
});

// ---------------------------------------------------------------------------
// REFUND
// ---------------------------------------------------------------------------

export const createRefundSchema = z.object({
  transactionId: z.string().min(1, "Transaction is required"),
  amount: z.number().positive("Amount must be positive"),
  reason: z.string().min(1, "Reason is required").max(500),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type SupplierPaymentInput = z.infer<typeof supplierPaymentSchema>;
export type CreateRefundInput = z.infer<typeof createRefundSchema>;
