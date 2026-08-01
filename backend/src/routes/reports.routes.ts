import { Router } from "express";
import { reportsController } from "@/controllers/reports.controller";
import { requireAuth, requireRole } from "@/middleware/auth.middleware";
import { Role } from "@/types/enums";

const router = Router();

// Protect all report routes — requiring Admin or Inventory Manager role
router.use(requireAuth);
router.use(requireRole(Role.ADMIN, Role.INVENTORY_MANAGER));

router.get("/sales-analytics", reportsController.getSalesAnalytics);
router.get("/inventory-turnover", reportsController.getInventoryTurnover);
router.get("/tax-summary", reportsController.getTaxSummary);
router.get("/export", reportsController.exportCsv);

export default router;
