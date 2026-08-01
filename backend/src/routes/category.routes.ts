import { Router } from "express";
import { categoryController } from "@/controllers/category.controller";
import { requireAuth, requireRole } from "@/middleware/auth.middleware";
import { validate } from "@/middleware/validate";
import { categorySchema } from "@/types/product.schema";
import { Role } from "@/types/enums";

const router = Router();

// Get list of categories (Cashier, Inventory Manager, Admin can read)
router.get("/", requireAuth, categoryController.list);

// Modify categories (Only Admin and Inventory Manager can write)
router.post(
  "/",
  requireAuth,
  requireRole(Role.ADMIN, Role.INVENTORY_MANAGER),
  validate(categorySchema),
  categoryController.create
);

router.put(
  "/:id",
  requireAuth,
  requireRole(Role.ADMIN, Role.INVENTORY_MANAGER),
  validate(categorySchema),
  categoryController.update
);

router.delete(
  "/:id",
  requireAuth,
  requireRole(Role.ADMIN, Role.INVENTORY_MANAGER),
  categoryController.delete
);

export default router;
