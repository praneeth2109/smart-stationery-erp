import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { prisma } from "@/config/prisma";
import { ApiError } from "@/utils/ApiError";
import { parsePagination, buildMeta } from "@/utils/pagination";

export const supplierController = {
  getSuppliers: asyncHandler(async (req: Request, res: Response) => {
    const { search } = req.query;
    const pagination = parsePagination(req);

    const where: any = search
      ? {
          OR: [
            { name: { contains: String(search) } },
            { email: { contains: String(search) } },
            { contactName: { contains: String(search) } },
          ],
        }
      : {};

    const [total, suppliers] = await Promise.all([
      prisma.supplier.count({ where }),
      prisma.supplier.findMany({
        where,
        include: {
          _count: { select: { purchaseOrders: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.limit,
      }),
    ]);

    res.json({
      success: true,
      data: suppliers,
      meta: buildMeta(total, pagination),
    });
  }),

  createSupplier: asyncHandler(async (req: Request, res: Response) => {
    const { name, contactName, email, phone, address, gstin } = req.body;

    const supplier = await prisma.supplier.create({
      data: { name, contactName, email, phone, address, gstin },
    });

    res.status(201).json({ success: true, data: supplier });
  }),

  updateSupplier: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, contactName, email, phone, address, gstin } = req.body;

    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing) {
      throw ApiError.notFound("Supplier not found");
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: { name, contactName, email, phone, address, gstin },
    });

    res.json({ success: true, data: supplier });
  }),

  deleteSupplier: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing) {
      throw ApiError.notFound("Supplier not found");
    }

    await prisma.supplier.delete({ where: { id } });
    res.json({ success: true, message: "Supplier deleted successfully" });
  }),
};
