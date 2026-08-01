// Purchase Order Controller for restocks and supplier management
import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { prisma } from "@/config/prisma";
import { ApiError } from "@/utils/ApiError";
import { parsePagination, buildMeta } from "@/utils/pagination";
import { randomBytes } from "crypto";

/** Collision-safe PO number using date + 6-char hex suffix */
function generatePoNumber(): string {
  const dateCode = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = randomBytes(3).toString("hex").toUpperCase();
  return `PO-${dateCode}-${suffix}`;
}

export const purchaseOrderController = {
  getPurchaseOrders: asyncHandler(async (req: Request, res: Response) => {
    const { status, supplierId } = req.query;
    const pagination = parsePagination(req);

    const where: any = {};
    if (status) where.status = String(status);
    if (supplierId) where.supplierId = String(supplierId);

    const [total, pos] = await Promise.all([
      prisma.purchaseOrder.count({ where }),
      prisma.purchaseOrder.findMany({
        where,
        include: {
          supplier: { select: { id: true, name: true } },
          user: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.limit,
      }),
    ]);

    res.json({
      success: true,
      data: pos,
      meta: buildMeta(total, pagination),
    });
  }),

  getPurchaseOrderById: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        user: {
          select: { id: true, name: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true },
            },
          },
        },
      },
    });

    if (!po) {
      throw ApiError.notFound("Purchase Order not found");
    }

    res.json({ success: true, data: po });
  }),

  createPurchaseOrder: asyncHandler(async (req: Request, res: Response) => {
    const { supplierId, items } = req.body;
    const userId = req.user?.userId;

    if (!items || items.length === 0) {
      throw ApiError.badRequest("At least one product item is required");
    }

    // Verify supplier exists
    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) {
      throw ApiError.notFound("Supplier not found");
    }

    // Verify all products exist and calculate total
    const productIds = items.map((item: any) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== productIds.length) {
      throw ApiError.badRequest("One or more products do not exist in database");
    }

    let totalAmount = 0;
    const poItemsToCreate = [];

    for (const item of items) {
      const product = products.find((p) => p.id === item.productId)!;
      const quantity = item.quantity;
      const unitCost = item.unitCost;
      const itemTotal = quantity * unitCost;

      totalAmount += itemTotal;
      poItemsToCreate.push({
        productId: product.id,
        quantity,
        unitCost,
        totalCost: itemTotal,
      });
    }

    // Generate collision-safe PO number, retry up to 3 times
    let poNumber = generatePoNumber();
    for (let attempt = 0; attempt < 3; attempt++) {
      const clash = await prisma.purchaseOrder.findUnique({ where: { poNumber } });
      if (!clash) break;
      poNumber = generatePoNumber();
    }

    const purchaseOrder = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId,
        totalAmount,
        userId: userId || null,
        status: "PENDING",
        items: {
          create: poItemsToCreate,
        },
      },
      include: {
        supplier: {
          select: { id: true, name: true },
        },
      },
    });

    res.status(201).json({ success: true, data: purchaseOrder });
  }),

  updatePoStatus: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user?.userId;

    const existingPo = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: { include: { product: true } } },
    });

    if (!existingPo) {
      throw ApiError.notFound("Purchase Order not found");
    }

    // Prevent double reception
    if (existingPo.status === "RECEIVED") {
      throw ApiError.badRequest("Purchase Order has already been received and stock replenished");
    }

    // Process status transition
    const poResult = await prisma.$transaction(async (tx) => {
      // If status transitioning to RECEIVED, increment stock levels and log movements
      if (status === "RECEIVED") {
        for (const item of existingPo.items) {
          // Increment stock count
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: { increment: item.quantity },
            },
          });

          // Log stock movement ledger
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              quantity: item.quantity,
              type: "RECEIVED",
              unitPrice: item.unitCost,
              costPrice: item.unitCost,
              reason: `PO Restock ${existingPo.poNumber}`,
              userId: userId || null,
            },
          });
        }
      }

      // Update PO status
      return await tx.purchaseOrder.update({
        where: { id },
        data: { status },
        include: {
          supplier: true,
          items: {
            include: {
              product: {
                select: { id: true, name: true, sku: true },
              },
            },
          },
        },
      });
    });

    res.json({ success: true, data: poResult });
  }),
};
