import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { prisma } from "@/config/prisma";
import { ApiError } from "@/utils/ApiError";
import { randomBytes } from "crypto";

/** Generates a collision-safe invoice number using a random 6-char hex suffix. */
function generateInvoiceNumber(): string {
  const dateCode = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = randomBytes(3).toString("hex").toUpperCase(); // e.g. A3F1C2
  return `INV-${dateCode}-${suffix}`;
}

export const posController = {
  checkout: asyncHandler(async (req: Request, res: Response) => {
    const { customerName, customerPhone, discount, paymentMethod, items } = req.body;
    const cashierId = req.user?.userId;

    if (!items || items.length === 0) {
      throw ApiError.badRequest("No items in basket");
    }

    const transactionResult = await prisma.$transaction(async (tx) => {
      // 1. Retrieve all products in this checkout
      const productIds = items.map((item: any) => item.productId);
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
      });

      if (products.length !== productIds.length) {
        throw ApiError.badRequest("One or more products in basket do not exist");
      }

      // 2. Validate stock and calculate GST-compliant pricing.
      //
      //    GST compliance (India): discount must reduce the *taxable value*
      //    before GST is applied, not be subtracted from the grand total.
      //
      //    Algorithm:
      //      a) Compute pre-discount gross (sum of inclusive prices × qty).
      //      b) Distribute the flat rupee discount proportionally across items.
      //      c) For each item, back-calculate the GST component from its
      //         discounted inclusive price so taxable value = price / (1 + rate).

      const flatDiscount: number = discount ?? 0;

      // First pass — gross total (before discount) for proportional distribution
      const cartLines: {
        product: (typeof products)[number];
        qty: number;
        grossInclusive: number; // qty × sellingPrice (no discount yet)
      }[] = [];

      let grossTotal = 0;
      for (const cartItem of items) {
        const product = products.find((p) => p.id === cartItem.productId)!;
        if (product.stock < cartItem.quantity) {
          throw ApiError.badRequest(
            `Insufficient stock for product "${product.name}". Available: ${product.stock}`
          );
        }
        const grossInclusive = product.sellingPrice * cartItem.quantity;
        grossTotal += grossInclusive;
        cartLines.push({ product, qty: cartItem.quantity, grossInclusive });
      }

      // Clamp discount so it never exceeds the basket value
      const effectiveDiscount = Math.min(flatDiscount, grossTotal);

      let subtotal = 0;
      let totalGstAmount = 0;
      let invoiceGrandTotal = 0;

      const saleItemsToCreate: {
        productId: string;
        quantity: number;
        price: number;
        gstRate: number;
        gstAmount: number;
        total: number;
      }[] = [];
      const stockMovementToCreate: {
        productId: string;
        quantity: number;
        type: string;
        unitPrice: number;
        costPrice: number;
        reason: string;
        userId: string | null;
      }[] = [];

      for (const line of cartLines) {
        const { product, qty, grossInclusive } = line;
        const gstRate = product.gst;

        // Proportional share of discount for this item
        const itemDiscountShare =
          grossTotal > 0 ? (grossInclusive / grossTotal) * effectiveDiscount : 0;

        // Discounted inclusive price for the whole line
        const discountedInclusive = grossInclusive - itemDiscountShare;

        // Back-calculate taxable value and GST from the discounted inclusive amount
        const itemTaxableValue = discountedInclusive / (1 + gstRate / 100);
        const itemGstAmount = discountedInclusive - itemTaxableValue;

        subtotal += itemTaxableValue;
        totalGstAmount += itemGstAmount;
        invoiceGrandTotal += discountedInclusive;

        saleItemsToCreate.push({
          productId: product.id,
          quantity: qty,
          price: product.sellingPrice, // original unit price (for audit)
          gstRate,
          gstAmount: itemGstAmount,
          total: discountedInclusive,
        });

        stockMovementToCreate.push({
          productId: product.id,
          quantity: -qty,
          type: "SOLD",
          unitPrice: product.sellingPrice,
          costPrice: product.purchasePrice,
          reason: "POS Sale", // will be updated with invoice number below
          userId: cashierId || null,
        });
      }

      const finalGrandTotal = Math.max(0, invoiceGrandTotal);

      // 3. Generate collision-safe invoice number, retry up to 3 times on
      //    the rare chance of a hex collision in the same millisecond.
      let invoiceNumber = generateInvoiceNumber();
      for (let attempt = 0; attempt < 3; attempt++) {
        const clash = await tx.transaction.findUnique({ where: { invoiceNumber } });
        if (!clash) break;
        invoiceNumber = generateInvoiceNumber();
      }

      // 4. Create Transaction
      const transaction = await tx.transaction.create({
        data: {
          invoiceNumber,
          cashierId: cashierId || null,
          customerName,
          customerPhone,
          subtotal,
          discount: effectiveDiscount,
          gstAmount: totalGstAmount,
          grandTotal: finalGrandTotal,
          paymentMethod,
          paymentStatus: "PAID",
          items: {
            create: saleItemsToCreate,
          },
        },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true } },
            },
          },
          cashier: { select: { id: true, name: true } },
        },
      });

      // 5. Decrement stock and log movements
      for (const mov of stockMovementToCreate) {
        mov.reason = `POS Sale ${invoiceNumber}`;

        await tx.stockMovement.create({ data: mov });

        await tx.product.update({
          where: { id: mov.productId },
          data: { stock: { decrement: Math.abs(mov.quantity) } },
        });
      }

      return transaction;
    });

    res.status(201).json({ success: true, data: transactionResult });
  }),
};
