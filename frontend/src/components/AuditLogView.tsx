"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { api, AuditLogEntry } from "@/lib/api";

export default function AuditLogView() {
  const { accessToken } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [selectedAction, setSelectedAction] = useState("");
  const [offset, setOffset] = useState(0);
  const limit = 20;

  useEffect(() => {
    if (!accessToken) return;
    loadLogs();
  }, [accessToken, search, selectedAction, offset]);

  async function loadLogs() {
    if (!accessToken) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.getAuditLogs(
        accessToken,
        search.trim() || undefined,
        selectedAction || undefined,
        limit,
        offset
      );
      setLogs(res.logs);
      setTotal(res.total);
    } catch (err: any) {
      setError(err.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }

  function getActionBadgeStyle(action: string) {
    if (action.includes("LOGIN")) return "bg-emerald-900/40 text-emerald-300 border-emerald-700/40";
    if (action.includes("LOGOUT")) return "bg-steel-800 text-steel-300 border-steel-600/40";
    if (action.includes("CREATE")) return "bg-blue-900/40 text-blue-300 border-blue-700/40";
    if (action.includes("UPDATE")) return "bg-amber-900/40 text-amber-300 border-amber-700/40";
    if (action.includes("DELETE")) return "bg-red-900/40 text-red-300 border-red-700/40";
    return "bg-brass-900/40 text-brass-300 border-brass-700/40";
  }

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-brass-700/20 pb-6">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-parchment flex items-center gap-3">
            <span>🔍</span> System Audit Trail Logs
          </h1>
          <p className="text-xs text-steel-400 font-ledger mt-1">
            Complete security audit trail tracking user authentication, POS checkouts, inventory updates, and PO workflows
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-brass-400 bg-charcoal-900 px-3 py-1.5 rounded-control border border-brass-700/30">
            {total} Total Audit Events
          </span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="card-leather p-4 flex flex-col sm:flex-row gap-4 justify-between items-center">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-steel-400 text-xs pointer-events-none z-10">🔍</span>
          <input
            type="text"
            placeholder="Search by action, details, user name, or entity..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOffset(0);
            }}
            className="input-field pl-10 text-xs text-parchment bg-charcoal-900 border border-brass-700/30 placeholder:text-steel-400 focus:border-brass-400"
          />
        </div>

        {/* Action Filter */}
        <div className="w-full sm:w-64">
          <select
            value={selectedAction}
            onChange={(e) => {
              setSelectedAction(e.target.value);
              setOffset(0);
            }}
            className="input-field text-xs text-parchment bg-charcoal-900 border border-brass-700/30 cursor-pointer"
          >
            <option value="">All Audit Actions</option>
            <option value="USER_LOGIN">User Login</option>
            <option value="USER_LOGOUT">User Logout</option>
            <option value="TRANSACTION_CREATE">Transaction Created (POS)</option>
            <option value="PRODUCT_CREATE">Product Created</option>
            <option value="PRODUCT_UPDATE">Product Updated</option>
            <option value="PO_CREATE">Purchase Order Created</option>
            <option value="PO_STATUS_CHANGE">PO Status Transition</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <p className="label-eyebrow animate-pulse">Retrieving audit security events…</p>
        </div>
      ) : error ? (
        <div className="card-leather p-6 text-center text-red-400">
          <p className="text-sm font-semibold">{error}</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="card-leather p-8 text-center text-steel-400">
          <p className="text-sm font-ledger">No audit logs found matching criteria.</p>
        </div>
      ) : (
        <div className="card-leather p-6 space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm font-body">
              <thead className="bg-charcoal-900 text-xs font-ledger text-steel-400 uppercase tracking-wider border-b border-steel-600/30">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">User / Operator</th>
                  <th className="p-3">Action Event</th>
                  <th className="p-3">Entity Type</th>
                  <th className="p-3">Details / Context</th>
                  <th className="p-3 text-right">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-steel-600/20">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-charcoal-900/40 transition">
                    <td className="p-3 font-mono text-xs text-steel-300 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("en-IN")}
                    </td>

                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-brass-700/30 border border-brass-600/40 text-brass-300 text-[10px] font-bold flex items-center justify-center font-mono">
                          {log.user ? log.user.name[0] : "S"}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-parchment">
                            {log.user ? log.user.name : "System Daemon"}
                          </p>
                          {log.user && (
                            <span className="text-[10px] text-brass-400 font-ledger">
                              {log.user.role}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="p-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-mono border font-semibold ${getActionBadgeStyle(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>

                    <td className="p-3 font-mono text-xs text-steel-400">
                      {log.entityType} {log.entityId ? `#${log.entityId.slice(-6)}` : ""}
                    </td>

                    <td className="p-3 text-xs text-steel-300 font-mono max-w-md truncate">
                      {log.details || "—"}
                    </td>

                    <td className="p-3 text-right font-mono text-xs text-steel-400">
                      {log.ipAddress || "127.0.0.1"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-steel-600/30 text-xs">
            <span className="text-steel-400 font-mono">
              Showing {offset + 1} - {Math.min(offset + limit, total)} of {total} events
            </span>

            <div className="flex gap-2">
              <button
                disabled={offset === 0}
                onClick={() => setOffset((prev) => Math.max(0, prev - limit))}
                className="btn-ghost py-1.5 px-3 text-xs border-steel-600/30 disabled:opacity-40"
              >
                Previous Page
              </button>
              <button
                disabled={offset + limit >= total}
                onClick={() => setOffset((prev) => prev + limit)}
                className="btn-ghost py-1.5 px-3 text-xs border-steel-600/30 disabled:opacity-40"
              >
                Next Page
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
