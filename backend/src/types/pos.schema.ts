import { z } from "zod";

export const checkoutSchema = z.object({
  customerName: z.string().optional().nullable(),
  customerPhone: z.string().optional().nullable(),
  discount: z.number().nonnegative("Discount must be a non-negative number").default(0),
  paymentMethod: z.enum(["CASH", "UPI"]),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, "Product ID is required"),
        quantity: z.number().int().positive("Quantity must be a positive integer"),
      })
    )
    .min(1, "Cart must contain at least one item"),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
