import { Router } from "express";
import { authController } from "@/controllers/auth.controller";
import { validate } from "@/middleware/validate";
import { requireAuth, requireRole } from "@/middleware/auth.middleware";
import { loginSchema, refreshSchema, registerSchema } from "@/types/auth.schema";
import { Role } from "@/types/enums";

const router = Router();

// Public
router.post("/login", validate(loginSchema), authController.login);
router.post("/refresh", validate(refreshSchema), authController.refresh);
router.post("/logout", authController.logout);

// Admin-only: only the Shop Owner can create new staff accounts
router.post(
  "/register",
  requireAuth,
  requireRole(Role.ADMIN),
  validate(registerSchema),
  authController.register
);

// Authenticated
router.get("/me", requireAuth, authController.me);

export default router;
