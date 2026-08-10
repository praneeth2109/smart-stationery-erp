import { Router } from "express";
import { productController } from "@/controllers/product.controller";
import { requireAuth, requireRole } from "@/middleware/auth.middleware";
import { validate } from "@/middleware/validate";
import { productSchema } from "@/types/product.schema";
import { Role } from "@/types/enums";

const router = Router();

// Catalog read access (All staff roles)
router.get("/", requireAuth, productController.list);
// Barcode/SKU lookup for POS scanner — must come before /:id to avoid conflict
router.get("/barcode/:code", requireAuth, productController.getByBarcode);
router.get("/:id/substitutes", requireAuth, productController.getSubstitutes);
router.get("/:id", requireAuth, productController.get);

// Catalog write access (Admin/Inventory Manager only)
router.post(
  "/",
  requireAuth,
  requireRole(Role.ADMIN, Role.INVENTORY_MANAGER),
  validate(productSchema),
  productController.create
);

router.put(
  "/:id",
  requireAuth,
  requireRole(Role.ADMIN, Role.INVENTORY_MANAGER),
  validate(productSchema),
  productController.update
);

router.delete(
  "/:id",
  requireAuth,
  requireRole(Role.ADMIN, Role.INVENTORY_MANAGER),
  productController.delete
);

export default router;
