"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import NotificationCenter from "./NotificationCenter";
import MobileBottomDock from "./MobileBottomDock";

interface DashboardLayoutProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  children: React.ReactNode;
}

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Shop Owner",
  CASHIER: "Cashier",
  INVENTORY_MANAGER: "Inventory Manager",
};

export default function DashboardLayout({
  activeTab,
  setActiveTab,
  children,
}: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  if (!user) return null;

  const navigationItems = [
    { id: "overview", label: "Overview", icon: "📊", roles: ["ADMIN", "CASHIER", "INVENTORY_MANAGER"] },
    { id: "products", label: "Products Catalog", icon: "📦", roles: ["ADMIN", "CASHIER", "INVENTORY_MANAGER"] },
    { id: "categories", label: "Categories", icon: "🏷️", roles: ["ADMIN", "CASHIER", "INVENTORY_MANAGER"] },
    { id: "pos", label: "POS Billing", icon: "🛒", roles: ["ADMIN", "CASHIER"] },
    { id: "suppliers", label: "Suppliers Wholesalers", icon: "📋", roles: ["ADMIN", "INVENTORY_MANAGER"] },
    { id: "purchase-orders", label: "Purchase Orders", icon: "📜", roles: ["ADMIN", "INVENTORY_MANAGER"] },
    { id: "accounting", label: "Accounting Ledger", icon: "🧾", roles: ["ADMIN", "INVENTORY_MANAGER"] },
    { id: "reports", label: "Reports & Analytics", icon: "📈", roles: ["ADMIN", "INVENTORY_MANAGER"] },
    { id: "audit-logs", label: "System Audit Trail", icon: "🔍", roles: ["ADMIN"] },
    { id: "staff", label: "Staff Directory", icon: "👥", roles: ["ADMIN"] },
  ];

  const allowedItems = navigationItems.filter((item) => item.roles.includes(user.role));

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-charcoal-950 font-body text-ivory">
      {/* Mobile Top App Header */}
      <header className="lg:hidden flex items-center justify-between p-4 bg-charcoal-900 border-b border-brass-700/20 z-30">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-brass-500/40 bg-charcoal-800">
            <span className="font-display text-sm text-brass-300 font-bold">S</span>
          </div>
          <div>
            <h2 className="font-ledger text-xs uppercase tracking-wider text-brass-400">
              Stationery ERP
            </h2>
            <p className="text-[10px] text-steel-400 font-ledger">{ROLE_LABEL[user.role]}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <NotificationCenter onNavigate={(tab) => setActiveTab(tab)} />
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="p-2 rounded-control bg-charcoal-800 border border-steel-600/40 text-parchment text-lg"
            aria-label="Toggle App Navigation Menu"
          >
            {isMobileOpen ? "✕" : "☰"}
          </button>
        </div>
      </header>

      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="lg:hidden fixed inset-0 bg-charcoal-950/80 backdrop-blur-sm z-40"
        />
      )}

      {/* Skewomorphic Sidebar */}
      <aside
        className={`w-64 border-r border-brass-700/20 bg-charcoal-900 p-6 flex flex-col justify-between shadow-2xl z-50 fixed inset-y-0 left-0 transition-transform duration-300 lg:static lg:translate-x-0 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Subtle brass header highlight */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-brass-sheen opacity-60" />

        <div>
          {/* Logo Brand area */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-brass-500/40 bg-charcoal-800 shadow-embossed">
              <span className="font-display text-lg text-brass-300 font-bold">S</span>
            </div>
            <h2 className="font-ledger text-xs uppercase tracking-[0.2em] text-brass-400">
              Stationery ERP
            </h2>
            <div className="mt-1 h-[1px] w-24 bg-gradient-to-r from-transparent via-brass-500/30 to-transparent mx-auto" />
          </div>

          {/* Nav Items */}
          <nav className="space-y-1.5 overflow-y-auto max-h-[calc(100vh-250px)]">
            {allowedItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMobileOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-control text-sm font-semibold tracking-wide transition-all ${
                    isActive
                      ? "bg-charcoal-800 text-brass-300 border border-brass-700/30 shadow-brass-glow"
                      : "text-steel-300 hover:bg-charcoal-800/40 hover:text-parchment"
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Desk profile */}
        <div className="border-t border-steel-600/20 pt-4 mt-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-full border border-brass-600/30 bg-charcoal-800 flex items-center justify-center font-display text-xs font-semibold text-brass-200">
              {user.name.split(" ").map((n) => n[0]).join("")}
            </div>
            <div className="overflow-hidden">
              <h4 className="text-xs font-bold text-ivory truncate">{user.name}</h4>
              <p className="text-[10px] text-steel-400 tracking-wider font-ledger">
                {ROLE_LABEL[user.role]}
              </p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="w-full btn-ghost text-xs py-2 px-3 border-steel-600/30 flex items-center justify-center gap-2 hover:border-red-900/50 hover:text-red-300 transition"
          >
            <span>🚪</span> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content desk surface */}
      <main className="flex-1 bg-ambient p-4 sm:p-6 lg:p-8 overflow-y-auto w-full space-y-6">
        {/* Top Header Controls Bar */}
        <div className="flex items-center justify-between border-b border-brass-700/20 pb-4">
          <div className="hidden lg:flex items-center gap-3">
            <span className="text-xs font-ledger text-brass-400 uppercase tracking-widest">
              Executive Desk • {ROLE_LABEL[user.role]}
            </span>
          </div>

          <div className="flex items-center justify-end gap-4 w-full lg:w-auto">
            <NotificationCenter onNavigate={(tab) => setActiveTab(tab)} />
          </div>
        </div>

        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="max-w-7xl mx-auto pb-16 lg:pb-0"
        >
          {children}
        </motion.div>
      </main>

      {/* Paytm/PhonePe Merchant Mobile Bottom Dock */}
      <MobileBottomDock
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        allowedItems={allowedItems}
        onOpenMenu={() => setIsMobileOpen(true)}
      />
    </div>
  );
}
