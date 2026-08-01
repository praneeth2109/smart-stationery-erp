// Accounting Controller — Phase 6
// Manages Expenses, Supplier Payments, Refunds, and the P&L summary
import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { prisma } from "@/config/prisma";
import { ApiError } from "@/utils/ApiError";

export const accountingController = {
  // ─── P&L Summary ───────────────────────────────────────────────────────────

  getSummary: asyncHandler(async (req: Request, res: Response) => {
    // Total revenue from paid transactions (grand total)
    const transactions = await prisma.transaction.findMany({
      where: { paymentStatus: "PAID" },
      select: { grandTotal: true, gstAmount: true, discount: true },
    });

    const totalRevenue = transactions.reduce((s, t) => s + t.grandTotal, 0);
    const totalGstCollected = transactions.reduce((s, t) => s + t.gstAmount, 0);
    const totalDiscountsGiven = transactions.reduce((s, t) => s + t.discount, 0);

    // Cost of goods sold (from SOLD stock movements)
    const soldMovements = await prisma.stockMovement.findMany({
      where: { type: "SOLD" },
      select: { quantity: true, costPrice: true },
    });
    const totalCOGS = soldMovements.reduce((s, m) => {
      return s + Math.abs(m.quantity) * (m.costPrice ?? 0);
    }, 0);

    // Total business expenses
    const expenses = await prisma.expense.findMany({ select: { amount: true } });
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

    // Total supplier payments made
    const supplierPayments = await prisma.supplierPayment.findMany({
      select: { amount: true },
    });
    const totalSupplierPayments = supplierPayments.reduce((s, p) => s + p.amount, 0);

    // Total refunds issued
    const refunds = await prisma.refund.findMany({ select: { amount: true } });
    const totalRefunds = refunds.reduce((s, r) => s + r.amount, 0);

    // Gross profit and net profit
    const grossProfit = totalRevenue - totalCOGS - totalRefunds;
    const netProfit = grossProfit - totalExpenses;

    res.json({
      success: true,
      data: {
        totalRevenue,
        totalCOGS,
        totalExpenses,
        totalSupplierPayments,
        totalRefunds,
        totalGstCollected,
        totalDiscountsGiven,
        grossProfit,
        netProfit,
      },
    });
  }),

  // ─── Combined Ledger ────────────────────────────────────────────────────────

  getLedger: asyncHandler(async (req: Request, res: Response) => {
    const [transactions, expenses, supplierPayments, refunds] = await Promise.all([
      prisma.transaction.findMany({
        where: { paymentStatus: "PAID" },
        select: {
          id: true,
          invoiceNumber: true,
          grandTotal: true,
          paymentMethod: true,
          createdAt: true,
          cashier: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.expense.findMany({
        select: {
          id: true,
          category: true,
          description: true,
          amount: true,
          date: true,
          user: { select: { name: true } },
        },
        orderBy: { date: "desc" },
      }),
      prisma.supplierPayment.findMany({
        select: {
          id: true,
          amount: true,
          paymentMethod: true,
          reference: true,
          paidAt: true,
          supplier: { select: { name: true } },
          purchaseOrder: { select: { poNumber: true } },
          user: { select: { name: true } },
        },
        orderBy: { paidAt: "desc" },
      }),
      prisma.refund.findMany({
        select: {
          id: true,
          amount: true,
          reason: true,
          createdAt: true,
          transaction: { select: { invoiceNumber: true } },
          processedBy: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // Normalize into a unified ledger format
    const entries = [
      ...transactions.map((t) => ({
        id: t.id,
        type: "INCOME" as const,
        label: `Sale Invoice ${t.invoiceNumber}`,
        amount: t.grandTotal,
        debit: 0,
        credit: t.grandTotal,
        paymentMethod: t.paymentMethod,
        date: t.createdAt,
        by: t.cashier?.name ?? "System",
      })),
      ...expenses.map((e) => ({
        id: e.id,
        type: "EXPENSE" as const,
        label: `${e.category}: ${e.description}`,
        amount: e.amount,
        debit: e.amount,
        credit: 0,
        paymentMethod: null,
        date: new Date(e.date),
        by: e.user?.name ?? "System",
      })),
      ...supplierPayments.map((p) => ({
        id: p.id,
        type: "SUPPLIER_PAYMENT" as const,
        label: `Supplier Payment — ${p.supplier.name} (${p.purchaseOrder.poNumber})`,
        amount: p.amount,
        debit: p.amount,
        credit: 0,
        paymentMethod: p.paymentMethod,
        date: new Date(p.paidAt),
        by: p.user?.name ?? "System",
      })),
      ...refunds.map((r) => ({
        id: r.id,
        type: "REFUND" as const,
        label: `Refund — Invoice ${r.transaction.invoiceNumber}: ${r.reason}`,
        amount: r.amount,
        debit: r.amount,
        credit: 0,
        paymentMethod: null,
        date: r.createdAt,
        by: r.processedBy?.name ?? "System",
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json({ success: true, data: entries });
  }),

  // ─── EXPENSES ──────────────────────────────────────────────────────────────

  getExpenses: asyncHandler(async (req: Request, res: Response) => {
    const expenses = await prisma.expense.findMany({
      include: { user: { select: { id: true, name: true } } },
      orderBy: { date: "desc" },
    });
    res.json({ success: true, data: expenses });
  }),

  createExpense: asyncHandler(async (req: Request, res: Response) => {
    const { category, description, amount, date } = req.body;
    const userId = req.user?.userId;

    const expense = await prisma.expense.create({
      data: {
        category,
        description,
        amount,
        date: new Date(date),
        userId,
      },
      include: { user: { select: { id: true, name: true } } },
    });

    res.status(201).json({ success: true, data: expense });
  }),

  updateExpense: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { category, description, amount, date } = req.body;

    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound("Expense not found");

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        ...(category && { category }),
        ...(description && { description }),
        ...(amount !== undefined && { amount }),
        ...(date && { date: new Date(date) }),
      },
      include: { user: { select: { id: true, name: true } } },
    });

    res.json({ success: true, data: expense });
  }),

  deleteExpense: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound("Expense not found");

    await prisma.expense.delete({ where: { id } });
    res.json({ success: true, message: "Expense deleted" });
  }),

  // ─── SUPPLIER PAYMENTS ─────────────────────────────────────────────────────

  getSupplierPayments: asyncHandler(async (req: Request, res: Response) => {
    const payments = await prisma.supplierPayment.findMany({
      include: {
        supplier: { select: { id: true, name: true } },
        purchaseOrder: { select: { id: true, poNumber: true, totalAmount: true } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { paidAt: "desc" },
    });
    res.json({ success: true, data: payments });
  }),

  createSupplierPayment: asyncHandler(async (req: Request, res: Response) => {
    const { purchaseOrderId, supplierId, amount, paymentMethod, reference, note, paidAt } =
      req.body;
    const userId = req.user?.userId;

    // Verify PO exists and belongs to supplier
    const po = await prisma.purchaseOrder.findUnique({ where: { id: purchaseOrderId } });
    if (!po) throw ApiError.notFound("Purchase Order not found");
    if (po.supplierId !== supplierId) {
      throw ApiError.badRequest("Supplier does not match the Purchase Order's supplier");
    }

    const payment = await prisma.supplierPayment.create({
      data: {
        purchaseOrderId,
        supplierId,
        amount,
        paymentMethod,
        reference,
        note,
        paidAt: new Date(paidAt),
        userId,
      },
      include: {
        supplier: { select: { id: true, name: true } },
        purchaseOrder: { select: { id: true, poNumber: true, totalAmount: true } },
        user: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({ success: true, data: payment });
  }),

  // ─── REFUNDS ───────────────────────────────────────────────────────────────

  getRefunds: asyncHandler(async (req: Request, res: Response) => {
    const refunds = await prisma.refund.findMany({
      include: {
        transaction: { select: { id: true, invoiceNumber: true, grandTotal: true } },
        processedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: refunds });
  }),

  createRefund: asyncHandler(async (req: Request, res: Response) => {
    const { transactionId, amount, reason } = req.body;
    const processedById = req.user?.userId;

    // Verify transaction exists
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });
    if (!transaction) throw ApiError.notFound("Transaction not found");

    if (amount > transaction.grandTotal) {
      throw ApiError.badRequest(
        `Refund amount (₹${amount}) exceeds invoice total (₹${transaction.grandTotal})`
      );
    }

    const refund = await prisma.refund.create({
      data: { transactionId, amount, reason, processedById },
      include: {
        transaction: { select: { id: true, invoiceNumber: true, grandTotal: true } },
        processedBy: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({ success: true, data: refund });
  }),
};
