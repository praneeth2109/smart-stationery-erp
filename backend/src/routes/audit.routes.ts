import { Router } from "express";
import { auditController } from "@/controllers/audit.controller";
import { requireAuth, requireRole } from "@/middleware/auth.middleware";
import { Role } from "@/types/enums";

const router = Router();

// Protect audit log routes — requiring Admin role
router.use(requireAuth);
router.use(requireRole(Role.ADMIN));

router.get("/", auditController.getLogs);

export default router;
