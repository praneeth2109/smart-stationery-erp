import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { prisma } from "@/config/prisma";

export const dashboardController = {
  getStats: asyncHandler(async (req: Request, res: Response) => {
    // Run all independent DB reads in parallel
    const [soldMovements, products, expenses, refunds] = await Promise.all([
      prisma.stockMovement.findMany({
        where: { type: "SOLD" },
        select: { quantity: true, unitPrice: true, costPrice: true },
      }),
      prisma.product.findMany({
        select: { id: true, name: true, sku: true, stock: true, lowStockThreshold: true },
      }),
      prisma.expense.findMany({ select: { amount: true } }),
      prisma.refund.findMany({ select: { amount: true } }),
    ]);

    // ── Sales & profit ────────────────────────────────────────────────────
    let totalSales = 0;
    let totalCOGS = 0;

    for (const mov of soldMovements) {
      const qty = Math.abs(mov.quantity);
      totalSales += qty * (mov.unitPrice ?? 0);
      totalCOGS += qty * (mov.costPrice ?? 0);
    }

    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const totalRefunds = refunds.reduce((s, r) => s + r.amount, 0);

    // Gross profit = revenue − COGS − refunds
    // Net profit   = gross profit − operating expenses
    const grossProfit = totalSales - totalCOGS - totalRefunds;
    const netProfit = grossProfit - totalExpenses;
    const profitMarginPercentage = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

    // ── Stock alerts ──────────────────────────────────────────────────────
    let totalStockItems = 0;
    let outOfStockCount = 0;
    let lowStockCount = 0;
    const lowStockAlerts: {
      id: string;
      name: string;
      sku: string;
      stock: number;
      lowStockThreshold: number;
    }[] = [];

    for (const prod of products) {
      totalStockItems += prod.stock;
      const threshold = prod.lowStockThreshold ?? 10;

      if (prod.stock === 0) {
        outOfStockCount++;
        lowStockAlerts.push({ ...prod, lowStockThreshold: threshold });
      } else if (prod.stock <= threshold) {
        lowStockCount++;
        lowStockAlerts.push({ ...prod, lowStockThreshold: threshold });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        totalSales,
        totalCOGS,
        totalExpenses,
        totalRefunds,
        grossProfit,
        netProfit,
        profitMarginPercentage,
        totalStockItems,
        outOfStockCount,
        lowStockCount,
        alerts: lowStockAlerts,
      },
    });
  }),

  getChartData: asyncHandler(async (req: Request, res: Response) => {
    // ── Daily sales timeline (last 7 days) ────────────────────────────────
    const last7Days: { name: string; date: string; sales: number; profit: number }[] = [];
    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const name = daysOfWeek[date.getDay()];
      last7Days.push({ name, date: dateStr, sales: 0, profit: 0 });
    }

    const soldMovements = await prisma.stockMovement.findMany({
      where: {
        type: "SOLD",
        createdAt: {
          gte: new Date(new Date().setDate(new Date().getDate() - 7)),
        },
      },
      select: { quantity: true, unitPrice: true, costPrice: true, createdAt: true },
    });

    for (const mov of soldMovements) {
      const movDateStr = mov.createdAt.toISOString().split("T")[0];
      const targetDay = last7Days.find((d) => d.date === movDateStr);
      if (targetDay) {
        const qty = Math.abs(mov.quantity);
        const salesVal = qty * (mov.unitPrice ?? 0);
        const costVal = qty * (mov.costPrice ?? 0);
        targetDay.sales += salesVal;
        targetDay.profit += salesVal - costVal;
      }
    }

    // ── Category stock value distribution ─────────────────────────────────
    const categories = await prisma.category.findMany({
      include: {
        products: { select: { stock: true, sellingPrice: true } },
      },
    });

    const categoryDistribution = categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      productCount: cat.products.length,
      stockValue: cat.products.reduce(
        (acc, prod) => acc + prod.stock * prod.sellingPrice,
        0
      ),
    }));

    res.status(200).json({
      success: true,
      data: { timeline: last7Days, categories: categoryDistribution },
    });
  }),
};
