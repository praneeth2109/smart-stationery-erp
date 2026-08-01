import { Router } from "express";
import { dashboardController } from "@/controllers/dashboard.controller";
import { requireAuth } from "@/middleware/auth.middleware";

const router = Router();

// Retrieve live dashboard statistics (All authenticated staff)
router.get("/stats", requireAuth, dashboardController.getStats);

// Retrieve chart data series (All authenticated staff)
router.get("/charts", requireAuth, dashboardController.getChartData);

export default router;
