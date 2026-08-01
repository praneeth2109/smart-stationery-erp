import { z } from "zod";

export const supplierSchema = z.object({
  name: z.string().min(1, "Supplier name is required"),
  contactName: z.string().optional().nullable(),
  email: z
    .string()
    .email("Invalid email format")
    .optional()
    .nullable()
    .or(z.literal("").nullable())
    .or(z.literal("")),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  gstin: z.string().optional().nullable(),
});

export type SupplierInput = z.infer<typeof supplierSchema>;
