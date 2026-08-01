import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { prisma } from "@/config/prisma";
import { ApiError } from "@/utils/ApiError";
import { parsePagination, buildMeta } from "@/utils/pagination";

export const inventoryController = {
  getMovements: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const pagination = parsePagination(req, 100);

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw ApiError.notFound("Product not found");

    const [total, movements] = await Promise.all([
      prisma.stockMovement.count({ where: { productId: id } }),
      prisma.stockMovement.findMany({
        where: { productId: id },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.limit,
      }),
    ]);

    res.status(200).json({
      success: true,
      data: movements,
      meta: buildMeta(total, pagination),
    });
  }),

  adjustStock: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { quantity, type, reason } = req.body;
    const userId = req.user?.userId;

    if (quantity <= 0) {
      throw ApiError.badRequest("Quantity must be a positive integer");
    }

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw ApiError.notFound("Product not found");

    // Perform database transaction to ensure ledger and counts stay atomic
    const updatedProduct = await prisma.$transaction(async (tx) => {
      let stockDelta = 0;
      let damagedDelta = 0;
      let reservedDelta = 0;

      // Determine price states for ledger
      const costPrice = product.purchasePrice;
      const unitPrice = type === "SOLD" ? product.sellingPrice : product.purchasePrice;

      switch (type) {
        case "RECEIVED":
          stockDelta = quantity;
          break;
        case "SOLD":
          if (product.stock < quantity) {
            throw ApiError.badRequest(`Insufficient stock. Available: ${product.stock}`);
          }
          stockDelta = -quantity;
          break;
        case "DAMAGED":
          if (product.stock < quantity) {
            throw ApiError.badRequest(`Insufficient available stock to mark as damaged. Available: ${product.stock}`);
          }
          stockDelta = -quantity;
          damagedDelta = quantity;
          break;
        case "RESERVED":
          if (product.stock < quantity) {
            throw ApiError.badRequest(`Insufficient available stock to reserve. Available: ${product.stock}`);
          }
          stockDelta = -quantity;
          reservedDelta = quantity;
          break;
        case "RETURNED":
          // Customer returned items: goes back to available stock
          stockDelta = quantity;
          break;
        case "ADJUSTMENT":
          // General manual adjustment (e.g. stocktake correction)
          // We assume reason/UI indicates direction: here we allow manual positive or negative increments
          // (Zod schema allows positive, let's treat quantity as delta)
          stockDelta = quantity;
          break;
        default:
          throw ApiError.badRequest("Invalid movement type");
      }

      // 1. Create movement ledger
      await tx.stockMovement.create({
        data: {
          productId: id,
          quantity: type === "SOLD" || type === "DAMAGED" || type === "RESERVED" ? -quantity : quantity,
          type,
          unitPrice,
          costPrice,
          reason: reason || `Manual ${type.toLowerCase()} logging`,
          userId: userId || null,
        },
      });

      // 2. Update product stock levels
      return await tx.product.update({
        where: { id },
        data: {
          stock: { increment: stockDelta },
          damagedStock: { increment: damagedDelta },
          reservedStock: { increment: reservedDelta },
        },
        include: { category: true },
      });
    });

    res.status(200).json({ success: true, data: updatedProduct });
  }),
};
