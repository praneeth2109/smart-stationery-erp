import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { prisma } from "@/config/prisma";

export const reportsController = {
  // ─── Sales Analytics ───────────────────────────────────────────────────────
  getSalesAnalytics: asyncHandler(async (req: Request, res: Response) => {
    const { period = "30days", startDate, endDate } = req.query;

    let dateFilter: Date | undefined;
    const now = new Date();

    if (period === "today") {
      dateFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === "7days") {
      dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === "30days") {
      dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (period === "year") {
      dateFilter = new Date(now.getFullYear(), 0, 1);
    } else if (startDate && typeof startDate === "string") {
      dateFilter = new Date(startDate);
    }

    const whereClause: any = {
      paymentStatus: "PAID",
      ...(dateFilter
        ? {
            createdAt: {
              gte: dateFilter,
              ...(endDate && typeof endDate === "string" ? { lte: new Date(endDate) } : {}),
            },
          }
        : {}),
    };

    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      include: {
        items: {
          include: {
            product: {
              include: { category: true },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const totalSales = transactions.reduce((sum, t) => sum + t.grandTotal, 0);
    const totalInvoices = transactions.length;
    const averageOrderValue = totalInvoices > 0 ? totalSales / totalInvoices : 0;

    const cashRevenue = transactions
      .filter((t) => t.paymentMethod === "CASH")
      .reduce((sum, t) => sum + t.grandTotal, 0);
    const upiRevenue = transactions
      .filter((t) => t.paymentMethod === "UPI")
      .reduce((sum, t) => sum + t.grandTotal, 0);

    // Sales Trend by date
    const trendMap = new Map<string, { sales: number; invoices: number }>();
    transactions.forEach((t) => {
      const dateKey = new Date(t.createdAt).toISOString().split("T")[0];
      const current = trendMap.get(dateKey) || { sales: 0, invoices: 0 };
      trendMap.set(dateKey, {
        sales: current.sales + t.grandTotal,
        invoices: current.invoices + 1,
      });
    });

    const salesTrend = Array.from(trendMap.entries()).map(([date, data]) => ({
      date,
      sales: Math.round(data.sales * 100) / 100,
      invoices: data.invoices,
    }));

    // Hourly Sales Distribution (Peak Hours: 00 to 23)
    const hourlyDistribution = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      label: `${hour.toString().padStart(2, "0")}:00`,
      amount: 0,
      count: 0,
    }));

    transactions.forEach((t) => {
      const hour = new Date(t.createdAt).getHours();
      hourlyDistribution[hour].amount += t.grandTotal;
      hourlyDistribution[hour].count += 1;
    });

    // Top Selling Products & Category Breakdown
    const productMap = new Map<
      string,
      { id: string; name: string; category: string; quantity: number; revenue: number }
    >();
    const categoryMap = new Map<string, number>();

    transactions.forEach((t) => {
      t.items.forEach((item) => {
        const pId = item.productId;
        const pName = item.product?.name ?? "Unknown Product";
        const catName = item.product?.category?.name ?? "Uncategorized";

        const existingP = productMap.get(pId) || {
          id: pId,
          name: pName,
          category: catName,
          quantity: 0,
          revenue: 0,
        };
        existingP.quantity += item.quantity;
        existingP.revenue += item.total;
        productMap.set(pId, existingP);

        const currentCatRev = categoryMap.get(catName) || 0;
        categoryMap.set(catName, currentCatRev + item.total);
      });
    });

    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map((p) => ({
        ...p,
        revenue: Math.round(p.revenue * 100) / 100,
      }));

    const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, revenue]) => ({
      category,
      revenue: Math.round(revenue * 100) / 100,
      percentage: totalSales > 0 ? Math.round((revenue / totalSales) * 1000) / 10 : 0,
    }));

    res.json({
      success: true,
      data: {
        summary: {
          totalSales: Math.round(totalSales * 100) / 100,
          totalInvoices,
          averageOrderValue: Math.round(averageOrderValue * 100) / 100,
          cashRevenue: Math.round(cashRevenue * 100) / 100,
          upiRevenue: Math.round(upiRevenue * 100) / 100,
        },
        salesTrend,
        hourlyDistribution: hourlyDistribution.map((h) => ({
          ...h,
          amount: Math.round(h.amount * 100) / 100,
        })),
        topProducts,
        categoryBreakdown,
      },
    });
  }),

  // ─── Inventory Turnover & Valuation ───────────────────────────────────────
  getInventoryTurnover: asyncHandler(async (req: Request, res: Response) => {
    const products = await prisma.product.findMany({
      include: {
        category: { select: { name: true } },
        saleItems: {
          select: { quantity: true, total: true },
        },
      },
    });

    const totalProducts = products.length;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let totalCostValuation = 0;
    let totalRetailValuation = 0;

    const items = products.map((p) => {
      if (p.stock <= 0) outOfStockCount++;
      else if (p.stock <= p.lowStockThreshold) lowStockCount++;

      const costValue = p.stock * p.purchasePrice;
      const retailValue = p.stock * p.sellingPrice;
      totalCostValuation += costValue;
      totalRetailValuation += retailValue;

      const totalQuantitySold = p.saleItems.reduce((s, item) => s + item.quantity, 0);

      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category.name,
        stock: p.stock,
        lowStockThreshold: p.lowStockThreshold,
        purchasePrice: p.purchasePrice,
        sellingPrice: p.sellingPrice,
        costValuation: Math.round(costValue * 100) / 100,
        retailValuation: Math.round(retailValue * 100) / 100,
        totalQuantitySold,
        status: p.stock <= 0 ? "OUT_OF_STOCK" : p.stock <= p.lowStockThreshold ? "LOW_STOCK" : "HEALTHY",
      };
    });

    // Fast vs slow movers
    const fastMovers = [...items].sort((a, b) => b.totalQuantitySold - a.totalQuantitySold).slice(0, 5);
    const slowMovers = [...items].sort((a, b) => a.totalQuantitySold - b.totalQuantitySold).slice(0, 5);

    res.json({
      success: true,
      data: {
        summary: {
          totalProducts,
          lowStockCount,
          outOfStockCount,
          totalCostValuation: Math.round(totalCostValuation * 100) / 100,
          totalRetailValuation: Math.round(totalRetailValuation * 100) / 100,
          potentialMargin: Math.round((totalRetailValuation - totalCostValuation) * 100) / 100,
        },
        fastMovers,
        slowMovers,
        items,
      },
    });
  }),

  // ─── GST Tax Summary ───────────────────────────────────────────────────────
  getTaxSummary: asyncHandler(async (req: Request, res: Response) => {
    const saleItems = await prisma.saleItem.findMany({
      include: {
        transaction: { select: { createdAt: true, invoiceNumber: true, paymentStatus: true } },
      },
      where: { transaction: { paymentStatus: "PAID" } },
    });

    const tierMap = new Map<number, { taxableValue: number; gstAmount: number; total: number; itemHits: number }>();

    let totalTaxableTurnover = 0;
    let totalGstCollected = 0;

    saleItems.forEach((item) => {
      const rate = item.gstRate;
      const taxable = item.total - item.gstAmount;
      const currentTier = tierMap.get(rate) || {
        taxableValue: 0,
        gstAmount: 0,
        total: 0,
        itemHits: 0,
      };

      currentTier.taxableValue += taxable;
      currentTier.gstAmount += item.gstAmount;
      currentTier.total += item.total;
      currentTier.itemHits += 1;

      tierMap.set(rate, currentTier);

      totalTaxableTurnover += taxable;
      totalGstCollected += item.gstAmount;
    });

    const gstTiers = Array.from(tierMap.entries())
      .map(([rate, data]) => ({
        gstRate: rate,
        taxableValue: Math.round(data.taxableValue * 100) / 100,
        gstAmount: Math.round(data.gstAmount * 100) / 100,
        total: Math.round(data.total * 100) / 100,
        itemCount: data.itemHits,
      }))
      .sort((a, b) => a.gstRate - b.gstRate);

    res.json({
      success: true,
      data: {
        totalTaxableTurnover: Math.round(totalTaxableTurnover * 100) / 100,
        totalGstCollected: Math.round(totalGstCollected * 100) / 100,
        totalGrossTurnover: Math.round((totalTaxableTurnover + totalGstCollected) * 100) / 100,
        gstTiers,
      },
    });
  }),

  // ─── CSV Export Dataset Generator ──────────────────────────────────────────
  exportCsv: asyncHandler(async (req: Request, res: Response) => {
    const { type = "sales" } = req.query;

    let filename = `report_${type}_${new Date().toISOString().split("T")[0]}.csv`;
    let csvData = "";

    if (type === "sales") {
      const transactions = await prisma.transaction.findMany({
        where: { paymentStatus: "PAID" },
        include: { cashier: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      });

      csvData = "Invoice Number,Date,Cashier,Subtotal,Discount,GST Amount,Grand Total,Payment Method\n";
      transactions.forEach((t) => {
        const dateStr = new Date(t.createdAt).toISOString();
        csvData += `"${t.invoiceNumber}","${dateStr}","${t.cashier?.name ?? "System"}",${t.subtotal},${t.discount},${t.gstAmount},${t.grandTotal},"${t.paymentMethod}"\n`;
      });
    } else if (type === "inventory") {
      const products = await prisma.product.findMany({
        include: { category: { select: { name: true } } },
        orderBy: { name: "asc" },
      });

      csvData = "Product Name,SKU,Barcode,Category,Stock,Purchase Price,Selling Price,GST Rate %,Cost Valuation,Retail Valuation\n";
      products.forEach((p) => {
        const costVal = p.stock * p.purchasePrice;
        const retailVal = p.stock * p.sellingPrice;
        csvData += `"${p.name.replace(/"/g, '""')}","${p.sku}","${p.barcode ?? ""}","${p.category.name}",${p.stock},${p.purchasePrice},${p.sellingPrice},${p.gst},${costVal},${retailVal}\n`;
      });
    } else if (type === "tax") {
      const saleItems = await prisma.saleItem.findMany({
        include: {
          product: { select: { name: true, sku: true } },
          transaction: { select: { invoiceNumber: true, createdAt: true } },
        },
        orderBy: { id: "desc" },
      });

      csvData = "Invoice Number,Date,Product Name,SKU,Quantity,Unit Price,GST Rate %,GST Amount,Total\n";
      saleItems.forEach((item) => {
        const dateStr = new Date(item.transaction.createdAt).toISOString();
        csvData += `"${item.transaction.invoiceNumber}","${dateStr}","${item.product?.name.replace(/"/g, '""')}","${item.product?.sku}",${item.quantity},${item.price},${item.gstRate},${item.gstAmount},${item.total}\n`;
      });
    } else if (type === "accounting") {
      const expenses = await prisma.expense.findMany({ orderBy: { date: "desc" } });
      csvData = "Date,Category,Description,Amount\n";
      expenses.forEach((e) => {
        csvData += `"${new Date(e.date).toISOString().split("T")[0]}","${e.category}","${e.description.replace(/"/g, '""')}",${e.amount}\n`;
      });
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csvData);
  }),
};
