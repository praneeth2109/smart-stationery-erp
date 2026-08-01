"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { api, AppNotification } from "@/lib/api";

interface NotificationCenterProps {
  onNavigate?: (tab: string) => void;
}

export default function NotificationCenter({ onNavigate }: NotificationCenterProps) {
  const { accessToken } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    loadNotifications();

    // Poll for notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [accessToken]);

  async function loadNotifications() {
    if (!accessToken) return;
    try {
      setLoading(true);
      const res = await api.getNotifications(accessToken);
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
    } catch {
      // silent catch for background polling
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkRead(id: string, linkTab?: string | null) {
    if (!accessToken) return;
    try {
      await api.markNotificationRead(accessToken, id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id || id === "all" ? { ...n, read: true } : n))
      );
      if (id === "all") setUnreadCount(0);
      else setUnreadCount((prev) => Math.max(0, prev - 1));

      if (linkTab && onNavigate) {
        onNavigate(linkTab);
        setIsOpen(false);
      }
    } catch {}
  }

  return (
    <div className="relative">
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-control bg-charcoal-800 border border-steel-600/40 text-parchment hover:border-brass-500/50 transition flex items-center justify-center"
        aria-label="System Notifications"
      >
        <span className="text-base">🔔</span>

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-600 text-white font-mono text-[10px] font-bold flex items-center justify-center border-2 border-charcoal-900 animate-pulse shadow-lg">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Slide-over Popover Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]"
            />

            {/* Notification Drawer */}
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-3 w-80 sm:w-96 rounded-panel border border-brass-700/40 bg-charcoal-900 p-4 shadow-brass-glow z-50 space-y-4"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-steel-600/30 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-base">🔔</span>
                  <h3 className="font-display text-sm font-bold text-parchment">
                    Notifications & Alerts
                  </h3>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-brass-700/30 text-brass-300 border border-brass-600/30">
                      {unreadCount} Unread
                    </span>
                  )}
                </div>

                {unreadCount > 0 && (
                  <button
                    onClick={() => handleMarkRead("all")}
                    className="text-[11px] font-ledger text-brass-400 hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {/* Notification Items List */}
              <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                {notifications.length === 0 ? (
                  <div className="text-center py-8 text-steel-500 text-xs font-ledger">
                    No active notifications.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleMarkRead(n.id, n.linkTab)}
                      className={`p-3 rounded-control border text-left cursor-pointer transition ${
                        !n.read
                          ? "bg-charcoal-800 border-brass-600/40"
                          : "bg-charcoal-950/60 border-steel-600/20 opacity-75 hover:opacity-100"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">
                            {n.type === "OUT_OF_STOCK"
                              ? "⚠️"
                              : n.type === "LOW_STOCK"
                              ? "📦"
                              : n.type === "PO_UPDATE"
                              ? "📜"
                              : "ℹ️"}
                          </span>
                          <p className="text-xs font-bold text-parchment leading-tight">
                            {n.title}
                          </p>
                        </div>
                        <span className="text-[9px] font-mono text-steel-500 whitespace-nowrap">
                          {new Date(n.createdAt).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <p className="text-[11px] text-steel-300 font-ledger mt-1 pl-6">
                        {n.message}
                      </p>

                      {n.linkTab && (
                        <div className="mt-2 pl-6 flex justify-end">
                          <span className="text-[10px] font-bold text-brass-300 font-mono flex items-center gap-1 hover:underline">
                            Action / View Details →
                          </span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
