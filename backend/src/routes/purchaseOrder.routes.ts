// Purchase Order Routing configurations
import { Router } from "express";
import { purchaseOrderController } from "@/controllers/purchaseOrder.controller";
import { requireAuth, requireRole } from "@/middleware/auth.middleware";
import { validate } from "@/middleware/validate";
import { createPurchaseOrderSchema, updatePoStatusSchema } from "@/types/purchaseOrder.schema";
import { Role } from "@/types/enums";

const router = Router();

router.use(requireAuth);

router.get("/", purchaseOrderController.getPurchaseOrders);
router.get("/:id", purchaseOrderController.getPurchaseOrderById);

// Creation and status updates restricted to Managers and Owners
router.post(
  "/",
  requireRole(Role.ADMIN, Role.INVENTORY_MANAGER),
  validate(createPurchaseOrderSchema),
  purchaseOrderController.createPurchaseOrder
);

router.put(
  "/:id/status",
  requireRole(Role.ADMIN, Role.INVENTORY_MANAGER),
  validate(updatePoStatusSchema),
  purchaseOrderController.updatePoStatus
);

export default router;
