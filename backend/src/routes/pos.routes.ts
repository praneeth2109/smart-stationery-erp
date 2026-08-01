import { Router } from "express";
import { posController } from "@/controllers/pos.controller";
import { requireAuth, requireRole } from "@/middleware/auth.middleware";
import { validate } from "@/middleware/validate";
import { checkoutSchema } from "@/types/pos.schema";
import { Role } from "@/types/enums";

const router = Router();

// Process cart checkout (Owners and Cashiers only)
router.post(
  "/checkout",
  requireAuth,
  requireRole(Role.ADMIN, Role.CASHIER),
  validate(checkoutSchema),
  posController.checkout
);

export default router;
