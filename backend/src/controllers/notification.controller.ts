import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { prisma } from "@/config/prisma";

export const notificationController = {
  getNotifications: asyncHandler(async (req: Request, res: Response) => {
    // 1. Auto-check low stock items and ensure notifications exist
    const lowStockProducts = await prisma.product.findMany({
      where: {
        stock: { lte: prisma.product.fields.lowStockThreshold },
      },
      include: { category: true },
    });

    for (const prod of lowStockProducts) {
      const isOutOfStock = prod.stock <= 0;
      const type = isOutOfStock ? "OUT_OF_STOCK" : "LOW_STOCK";
      const title = isOutOfStock
        ? `⚠️ Out of Stock: ${prod.name}`
        : `📦 Low Stock Alert: ${prod.name}`;
      const message = isOutOfStock
        ? `Product "${prod.name}" (SKU: ${prod.sku}) has 0 units remaining.`
        : `Product "${prod.name}" has ${prod.stock} units left (threshold: ${prod.lowStockThreshold}).`;

      // Check if unread notification already exists
      const existing = await prisma.notification.findFirst({
        where: {
          type,
          title,
          read: false,
        },
      });

      if (!existing) {
        await prisma.notification.create({
          data: {
            type,
            title,
            message,
            priority: isOutOfStock ? "HIGH" : "MEDIUM",
            linkTab: "products",
          },
        });
      }
    }

    // 2. Fetch recent notifications
    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    const unreadCount = notifications.filter((n) => !n.read).length;

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    });
  }),

  markAsRead: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    if (id === "all") {
      await prisma.notification.updateMany({
        where: { read: false },
        data: { read: true },
      });
      res.json({ success: true, message: "All notifications marked as read" });
      return;
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    res.json({ success: true, data: updated });
  }),
};
