import { Router } from "express";
import { accountingController } from "@/controllers/accounting.controller";
import { requireAuth, requireRole } from "@/middleware/auth.middleware";
import { validate } from "@/middleware/validate";
import {
  createExpenseSchema,
  updateExpenseSchema,
  supplierPaymentSchema,
  createRefundSchema,
} from "@/types/accounting.schema";
import { Role } from "@/types/enums";

const router = Router();

// All accounting routes require authentication
router.use(requireAuth);

// ─── P&L Summary (any authenticated user can view) ──────────────────────────
router.get("/summary", accountingController.getSummary);

// ─── Full Ledger (any authenticated user can view) ──────────────────────────
router.get("/ledger", accountingController.getLedger);

// ─── Expenses (ADMIN + INVENTORY_MANAGER) ───────────────────────────────────
router.get("/expenses", accountingController.getExpenses);
router.post(
  "/expenses",
  requireRole(Role.ADMIN, Role.INVENTORY_MANAGER),
  validate(createExpenseSchema),
  accountingController.createExpense
);
router.put(
  "/expenses/:id",
  requireRole(Role.ADMIN, Role.INVENTORY_MANAGER),
  validate(updateExpenseSchema),
  accountingController.updateExpense
);
router.delete(
  "/expenses/:id",
  requireRole(Role.ADMIN),
  accountingController.deleteExpense
);

// ─── Supplier Payments (ADMIN + INVENTORY_MANAGER) ──────────────────────────
router.get("/supplier-payments", accountingController.getSupplierPayments);
router.post(
  "/supplier-payments",
  requireRole(Role.ADMIN, Role.INVENTORY_MANAGER),
  validate(supplierPaymentSchema),
  accountingController.createSupplierPayment
);

// ─── Refunds (ADMIN only) ────────────────────────────────────────────────────
router.get("/refunds", accountingController.getRefunds);
router.post(
  "/refunds",
  requireRole(Role.ADMIN),
  validate(createRefundSchema),
  accountingController.createRefund
);

export default router;
