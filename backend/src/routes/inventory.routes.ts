import { Router } from "express";
import { inventoryController } from "@/controllers/inventory.controller";
import { requireAuth, requireRole } from "@/middleware/auth.middleware";
import { validate } from "@/middleware/validate";
import { stockAdjustmentSchema } from "@/types/inventory.schema";
import { Role } from "@/types/enums";

const router = Router();

// Retrieve movement ledger for a product (All authenticated staff)
router.get("/products/:id/movements", requireAuth, inventoryController.getMovements);

// Log manual stock adjustment (Only Admin/Shop Owner and Inventory Manager)
router.post(
  "/products/:id/adjust",
  requireAuth,
  requireRole(Role.ADMIN, Role.INVENTORY_MANAGER),
  validate(stockAdjustmentSchema),
  inventoryController.adjustStock
);

export default router;
