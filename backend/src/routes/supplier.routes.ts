import { Router } from "express";
import { supplierController } from "@/controllers/supplier.controller";
import { requireAuth, requireRole } from "@/middleware/auth.middleware";
import { validate } from "@/middleware/validate";
import { supplierSchema } from "@/types/supplier.schema";
import { Role } from "@/types/enums";

const router = Router();

router.use(requireAuth);
router.use(requireRole(Role.ADMIN, Role.INVENTORY_MANAGER));

router.get("/", supplierController.getSuppliers);
router.post("/", validate(supplierSchema), supplierController.createSupplier);
router.put("/:id", validate(supplierSchema), supplierController.updateSupplier);
router.delete("/:id", supplierController.deleteSupplier);

export default router;
