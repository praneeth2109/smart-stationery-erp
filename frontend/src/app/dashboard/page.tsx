"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";

export const dynamic = "force-dynamic";
import ProductCatalogView from "@/components/ProductCatalogView";
import CategoryView from "@/components/CategoryView";
import StaffDirectoryView from "@/components/StaffDirectoryView";
import DashboardOverviewView from "@/components/DashboardOverviewView";
import PosBillingView from "@/components/PosBillingView";
import SuppliersView from "@/components/SuppliersView";
import PurchaseOrderListView from "@/components/PurchaseOrderListView";
import AccountingView from "@/components/AccountingView";
import ReportsView from "@/components/ReportsView";
import AuditLogView from "@/components/AuditLogView";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Shop Owner",
  CASHIER: "Cashier",
  INVENTORY_MANAGER: "Inventory Manager",
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-charcoal-950">
        <p className="label-eyebrow">Loading workspace…</p>
      </main>
    );
  }

  // Security guards
  if ((activeTab === "staff" || activeTab === "audit-logs") && user.role !== "ADMIN") {
    setActiveTab("overview");
  }
  if (activeTab === "pos" && user.role !== "ADMIN" && user.role !== "CASHIER") {
    setActiveTab("overview");
  }
  if (
    (activeTab === "suppliers" || activeTab === "purchase-orders" || activeTab === "reports") &&
    user.role !== "ADMIN" &&
    user.role !== "INVENTORY_MANAGER"
  ) {
    setActiveTab("overview");
  }
  if (
    activeTab === "accounting" &&
    user.role !== "ADMIN" &&
    user.role !== "INVENTORY_MANAGER"
  ) {
    setActiveTab("overview");
  }

  function renderContent() {
    if (!user) return null;
    switch (activeTab) {
      case "products":
        return <ProductCatalogView />;
      case "categories":
        return <CategoryView />;
      case "pos":
        return <PosBillingView />;
      case "suppliers":
        return <SuppliersView />;
      case "purchase-orders":
        return <PurchaseOrderListView />;
      case "accounting":
        return <AccountingView />;
      case "reports":
        return <ReportsView />;
      case "audit-logs":
        return <AuditLogView />;
      case "staff":
        return <StaffDirectoryView />;
      case "overview":
      default:
        return <DashboardOverviewView />;
    }
  }

  return (
    <DashboardLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </DashboardLayout>
  );
}

