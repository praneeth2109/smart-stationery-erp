import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { prisma } from "@/config/prisma";
import { ApiError } from "@/utils/ApiError";
import { parsePagination, buildMeta } from "@/utils/pagination";

export const productController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { search, categoryId } = req.query;
    const pagination = parsePagination(req);

    const where: any = {};

    if (categoryId) {
      where.categoryId = String(categoryId);
    }

    if (search) {
      const searchStr = String(search);
      where.OR = [
        { name: { contains: searchStr } },
        { sku: { contains: searchStr } },
        { barcode: { contains: searchStr } },
      ];
    }

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
        },
        orderBy: { name: "asc" },
        skip: pagination.skip,
        take: pagination.limit,
      }),
    ]);

    res.status(200).json({
      success: true,
      data: products,
      meta: buildMeta(total, pagination),
    });
  }),

  get: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!product) {
      throw ApiError.notFound("Product not found");
    }

    res.status(200).json({ success: true, data: product });
  }),

  /** GET /products/barcode/:code — resolve a product by barcode or SKU for POS scanning */
  getByBarcode: asyncHandler(async (req: Request, res: Response) => {
    const code = req.params.code.trim().toUpperCase();

    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { barcode: req.params.code.trim() },
          { sku: { equals: code } },
        ],
      },
      include: { category: { select: { id: true, name: true } } },
    });

    if (!product) {
      throw ApiError.notFound(`No product found for barcode/SKU "${req.params.code}"`);
    }

    res.status(200).json({ success: true, data: product });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const {
      name, description, sku, barcode,
      purchasePrice, sellingPrice, gst, image, categoryId,
      lowStockThreshold,
    } = req.body;

    // Check category exists
    const categoryExists = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!categoryExists) {
      throw ApiError.badRequest("Invalid category ID");
    }

    // Check unique SKU
    const existingSku = await prisma.product.findUnique({ where: { sku } });
    if (existingSku) {
      throw ApiError.conflict("A product with this SKU already exists");
    }

    // Check unique Barcode (if provided)
    if (barcode) {
      const existingBarcode = await prisma.product.findUnique({ where: { barcode } });
      if (existingBarcode) {
        throw ApiError.conflict("A product with this Barcode already exists");
      }
    }

    const product = await prisma.product.create({
      data: {
        name,
        description,
        sku,
        barcode: barcode || null,
        purchasePrice,
        sellingPrice,
        gst,
        image: image || null,
        categoryId,
        lowStockThreshold: lowStockThreshold ?? 10,
      },
      include: { category: true },
    });

    res.status(201).json({ success: true, data: product });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const {
      name, description, sku, barcode,
      purchasePrice, sellingPrice, gst, image, categoryId,
      lowStockThreshold,
    } = req.body;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw ApiError.notFound("Product not found");
    }

    if (categoryId) {
      const categoryExists = await prisma.category.findUnique({ where: { id: categoryId } });
      if (!categoryExists) {
        throw ApiError.badRequest("Invalid category ID");
      }
    }

    // Check unique SKU conflict
    if (sku && sku !== existing.sku) {
      const skuConflict = await prisma.product.findUnique({ where: { sku } });
      if (skuConflict) {
        throw ApiError.conflict("A product with this SKU already exists");
      }
    }

    // Check unique Barcode conflict
    if (barcode && barcode !== existing.barcode) {
      const barcodeConflict = await prisma.product.findUnique({ where: { barcode } });
      if (barcodeConflict) {
        throw ApiError.conflict("A product with this Barcode already exists");
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        name,
        description,
        sku,
        barcode: barcode === "" ? null : barcode,
        purchasePrice,
        sellingPrice,
        gst,
        image: image === "" ? null : image,
        categoryId,
        ...(lowStockThreshold !== undefined && { lowStockThreshold }),
      },
      include: { category: true },
    });

    res.status(200).json({ success: true, data: product });
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw ApiError.notFound("Product not found");
    }

    await prisma.product.delete({ where: { id } });

    res.status(200).json({ success: true, message: "Product deleted successfully" });
  }),

  // ─── Smart Product Substitute Finder ─────────────────────────────────────
  getSubstitutes: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const targetProduct = await prisma.product.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!targetProduct) {
      throw ApiError.notFound("Target product not found");
    }

    // Find in-stock substitute products in the same category
    const substitutes = await prisma.product.findMany({
      where: {
        id: { not: id },
        categoryId: targetProduct.categoryId,
        stock: { gt: 0 },
      },
      include: { category: true },
      take: 6,
      orderBy: [
        { stock: "desc" },
        { sellingPrice: "asc" },
      ],
    });

    res.json({
      success: true,
      data: {
        targetProduct,
        substitutes,
      },
    });
  }),
};
