import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { prisma } from "@/config/prisma";
import { ApiError } from "@/utils/ApiError";

export const userController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        phone: true,
        createdAt: true,
      },
      orderBy: { name: "asc" },
    });
    res.status(200).json({ success: true, data: users });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, email, role, status, phone } = req.body;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw ApiError.notFound("User not found");
    }

    // A shop owner cannot suspend themselves or strip their own ADMIN role
    if (existing.id === req.user?.userId) {
      if (status === "SUSPENDED") {
        throw ApiError.badRequest("You cannot suspend your own account");
      }
      if (role && role !== "ADMIN") {
        throw ApiError.badRequest("You cannot change your own admin role");
      }
    }

    if (email && email !== existing.email) {
      const emailConflict = await prisma.user.findUnique({ where: { email } });
      if (emailConflict) {
        throw ApiError.conflict("A user with this email already exists");
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        name,
        email,
        role,
        status,
        phone,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        phone: true,
        createdAt: true,
      },
    });

    res.status(200).json({ success: true, data: updated });
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw ApiError.notFound("User not found");
    }

    // A shop owner cannot delete themselves
    if (existing.id === req.user?.userId) {
      throw ApiError.badRequest("You cannot delete your own account");
    }

    await prisma.user.delete({ where: { id } });

    res.status(200).json({ success: true, message: "User deleted successfully" });
  }),
};
