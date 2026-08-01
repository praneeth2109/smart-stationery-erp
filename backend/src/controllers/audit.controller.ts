import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { prisma } from "@/config/prisma";

export const auditController = {
  getLogs: asyncHandler(async (req: Request, res: Response) => {
    const { action, entityType, search, limit = "50", offset = "0" } = req.query;

    const take = parseInt(limit as string, 10) || 50;
    const skip = parseInt(offset as string, 10) || 0;

    const where: any = {};

    if (action && typeof action === "string") {
      where.action = action;
    }

    if (entityType && typeof entityType === "string") {
      where.entityType = entityType;
    }

    if (search && typeof search === "string") {
      where.OR = [
        { action: { contains: search } },
        { entityType: { contains: search } },
        { details: { contains: search } },
        { user: { name: { contains: search } } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take,
        skip,
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        logs,
        total,
        limit: take,
        offset: skip,
      },
    });
  }),
};
