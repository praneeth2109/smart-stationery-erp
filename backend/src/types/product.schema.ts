import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  description: z.string().optional(),
});

export const productSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(200),
  description: z.string().optional().nullable(),
  sku: z.string().min(3, "SKU must be at least 3 characters").max(50),
  barcode: z.string().optional().nullable(),
  purchasePrice: z.number().nonnegative("Purchase price must be a non-negative number"),
  sellingPrice: z.number().nonnegative("Selling price must be a non-negative number"),
  gst: z.number().refine((val) => [0, 5, 12, 18, 28].includes(val), {
    message: "GST must be one of standard rates: 0%, 5%, 12%, 18%, 28%",
  }),
  image: z.string().url("Must be a valid image URL").optional().or(z.literal("")),
  categoryId: z.string().min(1, "Category ID is required"),
  lowStockThreshold: z.number().int().nonnegative("Low stock threshold must be a non-negative integer").default(10),
});
