import { Router } from "express";
import { userController } from "@/controllers/user.controller";
import { requireAuth, requireRole } from "@/middleware/auth.middleware";
import { validate } from "@/middleware/validate";
import { updateUserSchema } from "@/types/user.schema";
import { Role } from "@/types/enums";

const router = Router();

// Staff accounts administration (strictly Shop Owner/Admin only)
router.get("/", requireAuth, requireRole(Role.ADMIN), userController.list);

router.put(
  "/:id",
  requireAuth,
  requireRole(Role.ADMIN),
  validate(updateUserSchema),
  userController.update
);

router.delete("/:id", requireAuth, requireRole(Role.ADMIN), userController.delete);

export default router;
