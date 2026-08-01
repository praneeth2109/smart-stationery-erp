import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { prisma } from "@/config/prisma";
import { ApiError } from "@/utils/ApiError";

export const categoryController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    // Return all categories with their product counts
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: "asc" },
    });
    res.status(200).json({ success: true, data: categories });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const { name, description } = req.body;

    const existing = await prisma.category.findUnique({
      where: { name },
    });
    if (existing) {
      throw ApiError.conflict("A category with this name already exists");
    }

    const category = await prisma.category.create({
      data: { name, description },
    });

    res.status(201).json({ success: true, data: category });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, description } = req.body;

    const existing = await prisma.category.findUnique({
      where: { id },
    });
    if (!existing) {
      throw ApiError.notFound("Category not found");
    }

    if (name && name !== existing.name) {
      const nameConflict = await prisma.category.findUnique({
        where: { name },
      });
      if (nameConflict) {
        throw ApiError.conflict("A category with this name already exists");
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data: { name, description },
    });

    res.status(200).json({ success: true, data: category });
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const existing = await prisma.category.findUnique({
      where: { id },
    });
    if (!existing) {
      throw ApiError.notFound("Category not found");
    }

    await prisma.category.delete({
      where: { id },
    });

    res.status(200).json({ success: true, message: "Category deleted successfully" });
  }),
};
