import { Router } from "express";
import authRoutes from "@/routes/auth.routes";
import categoryRoutes from "@/routes/category.routes";
import productRoutes from "@/routes/product.routes";
import userRoutes from "@/routes/user.routes";
import inventoryRoutes from "@/routes/inventory.routes";
import dashboardRoutes from "@/routes/dashboard.routes";
import posRoutes from "@/routes/pos.routes";
import supplierRoutes from "@/routes/supplier.routes";
import purchaseOrderRoutes from "@/routes/purchaseOrder.routes";
import accountingRoutes from "@/routes/accounting.routes";
import reportsRoutes from "@/routes/reports.routes";
import auditRoutes from "@/routes/audit.routes";
import notificationRoutes from "@/routes/notification.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/categories", categoryRoutes);
router.use("/products", productRoutes);
router.use("/users", userRoutes);
router.use("/inventory", inventoryRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/pos", posRoutes);
router.use("/suppliers", supplierRoutes);
router.use("/purchase-orders", purchaseOrderRoutes);
router.use("/accounting", accountingRoutes);
router.use("/reports", reportsRoutes);
router.use("/audit-logs", auditRoutes);
router.use("/notifications", notificationRoutes);

export default router;

