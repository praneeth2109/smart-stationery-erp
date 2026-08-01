"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import {
  api,
  SalesAnalyticsData,
  InventoryTurnoverData,
  TaxSummaryData,
} from "@/lib/api";

type PeriodOption = "today" | "7days" | "30days" | "year";

export default function ReportsView() {
  const { accessToken } = useAuth();
  const [period, setPeriod] = useState<PeriodOption>("30days");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [salesData, setSalesData] = useState<SalesAnalyticsData | null>(null);
  const [inventoryData, setInventoryData] = useState<InventoryTurnoverData | null>(null);
  const [taxData, setTaxData] = useState<TaxSummaryData | null>(null);

  const [activeSubTab, setActiveSubTab] = useState<"sales" | "inventory" | "gst">("sales");

  useEffect(() => {
    if (!accessToken) return;
    loadData();
  }, [accessToken, period]);

  async function loadData() {
    if (!accessToken) return;
    try {
      setLoading(true);
      setError(null);
      const [salesRes, invRes, taxRes] = await Promise.all([
        api.getSalesAnalytics(accessToken, period),
        api.getInventoryTurnover(accessToken),
        api.getTaxSummary(accessToken),
      ]);
      setSalesData(salesRes);
      setInventoryData(invRes);
      setTaxData(taxRes);
    } catch (err: any) {
      setError(err.message || "Failed to load reports and analytics");
    } finally {
      setLoading(false);
    }
  }

  function handleExportCsv(type: "sales" | "inventory" | "tax" | "accounting") {
    if (!accessToken) return;
    const url = api.getExportCsvUrl(type);
    window.open(url, "_blank");
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="label-eyebrow animate-pulse">Calculating analytics & tax aggregations…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-leather p-8 text-center text-red-400 border border-red-900/40">
        <p className="font-semibold text-lg mb-2">Error Loading Analytics</p>
        <p className="text-sm text-steel-400 mb-4">{error}</p>
        <button onClick={loadData} className="btn-brass py-2 px-4 text-xs">
          Retry Loading
        </button>
      </div>
    );
  }

  const maxHourlyAmount = Math.max(
    ...(salesData?.hourlyDistribution.map((h) => h.amount) || [1])
  );

  return (
    <div className="space-y-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-brass-700/20 pb-6">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-parchment flex items-center gap-3">
            <span>📈</span> Executive Reports & Analytics
          </h1>
          <p className="text-xs text-steel-400 font-ledger mt-1">
            Data insights, peak sales hours analysis, inventory turnover, and GST compliance reporting
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Period Selector */}
          <div className="flex items-center bg-charcoal-900 p-1 rounded-control border border-steel-600/30">
            {(["today", "7days", "30days", "year"] as PeriodOption[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-control transition ${
                  period === p
                    ? "bg-charcoal-800 text-brass-300 border border-brass-700/40 shadow-brass-glow"
                    : "text-steel-400 hover:text-parchment"
                }`}
              >
                {p === "today" ? "Today" : p === "7days" ? "7 Days" : p === "30days" ? "30 Days" : "This Year"}
              </button>
            ))}
          </div>

          {/* Export Dropdown Trigger */}
          <button
            onClick={() => handleExportCsv("sales")}
            className="btn-brass py-2 px-3 text-xs flex items-center gap-2"
          >
            <span>📥</span> Export Sales CSV
          </button>
          <button
            onClick={() => window.print()}
            className="btn-ghost py-2 px-3 text-xs border-steel-600/30 flex items-center gap-2"
          >
            <span>🖨️</span> Print Summary
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      {salesData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="card-leather p-5 border-l-4 border-brass-500">
            <p className="text-xs font-ledger text-steel-400 uppercase tracking-wider">Total Sales</p>
            <p className="font-display text-2xl font-bold text-parchment mt-1">
              ₹{salesData.summary.totalSales.toLocaleString("en-IN")}
            </p>
            <span className="text-[10px] text-steel-400 font-mono mt-1 block">
              {salesData.summary.totalInvoices} Paid Invoices
            </span>
          </div>

          <div className="card-leather p-5 border-l-4 border-blue-500">
            <p className="text-xs font-ledger text-steel-400 uppercase tracking-wider">Avg Order Value</p>
            <p className="font-display text-2xl font-bold text-parchment mt-1">
              ₹{salesData.summary.averageOrderValue.toLocaleString("en-IN")}
            </p>
            <span className="text-[10px] text-steel-400 font-mono mt-1 block">Per transaction average</span>
          </div>

          <div className="card-leather p-5 border-l-4 border-emerald-500">
            <p className="text-xs font-ledger text-steel-400 uppercase tracking-wider">UPI Digital Revenue</p>
            <p className="font-display text-2xl font-bold text-emerald-300 mt-1">
              ₹{salesData.summary.upiRevenue.toLocaleString("en-IN")}
            </p>
            <span className="text-[10px] text-steel-400 font-mono mt-1 block">Instant QR Payments</span>
          </div>

          <div className="card-leather p-5 border-l-4 border-amber-500">
            <p className="text-xs font-ledger text-steel-400 uppercase tracking-wider">Cash Revenue</p>
            <p className="font-display text-2xl font-bold text-amber-300 mt-1">
              ₹{salesData.summary.cashRevenue.toLocaleString("en-IN")}
            </p>
            <span className="text-[10px] text-steel-400 font-mono mt-1 block">Register Cash In Hand</span>
          </div>

          <div className="card-leather p-5 border-l-4 border-purple-500">
            <p className="text-xs font-ledger text-steel-400 uppercase tracking-wider">GST Collected</p>
            <p className="font-display text-2xl font-bold text-purple-300 mt-1">
              ₹{taxData?.totalGstCollected.toLocaleString("en-IN") || 0}
            </p>
            <span className="text-[10px] text-steel-400 font-mono mt-1 block">Tax Liability</span>
          </div>
        </div>
      )}

      {/* Sub Navigation Tabs */}
      <div className="flex border-b border-steel-600/30 gap-6">
        <button
          onClick={() => setActiveSubTab("sales")}
          className={`pb-3 text-sm font-bold tracking-wide transition border-b-2 ${
            activeSubTab === "sales"
              ? "border-brass-400 text-brass-300"
              : "border-transparent text-steel-400 hover:text-parchment"
          }`}
        >
          📊 Sales Trends & Peak Hours
        </button>
        <button
          onClick={() => setActiveSubTab("inventory")}
          className={`pb-3 text-sm font-bold tracking-wide transition border-b-2 ${
            activeSubTab === "inventory"
              ? "border-brass-400 text-brass-300"
              : "border-transparent text-steel-400 hover:text-parchment"
          }`}
        >
          📦 Inventory Turnover & Stock Movers
        </button>
        <button
          onClick={() => setActiveSubTab("gst")}
          className={`pb-3 text-sm font-bold tracking-wide transition border-b-2 ${
            activeSubTab === "gst"
              ? "border-brass-400 text-brass-300"
              : "border-transparent text-steel-400 hover:text-parchment"
          }`}
        >
          🏛️ GST Tax Tier Summary
        </button>
      </div>

      {/* TAB 1: Sales Trends & Peak Hours */}
      {activeSubTab === "sales" && salesData && (
        <div className="space-y-6">
          {/* Peak Hours Analysis Bar Visualizer */}
          <div className="card-leather p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-semibold text-parchment">
                  🕐 Peak Sales Hours Distribution (00:00 - 23:00)
                </h3>
                <p className="text-xs text-steel-400 font-ledger">
                  Hourly breakdown of store revenue to optimize cashier shift scheduling
                </p>
              </div>
              <span className="text-xs font-mono text-brass-400 bg-charcoal-900 px-3 py-1 rounded-control border border-brass-700/30">
                Peak Time Heatmap
              </span>
            </div>

            <div className="pt-4 overflow-x-auto">
              <div className="flex items-end gap-1.5 h-44 min-w-[700px] border-b border-steel-600/30 pb-2">
                {salesData.hourlyDistribution.map((h) => {
                  const heightPercent = maxHourlyAmount > 0 ? (h.amount / maxHourlyAmount) * 100 : 0;
                  const isPeak = heightPercent > 60;
                  return (
                    <div
                      key={h.hour}
                      className="flex-1 flex flex-col items-center group relative cursor-pointer"
                    >
                      {/* Hover Tooltip */}
                      <div className="absolute -top-12 hidden group-hover:flex flex-col items-center bg-charcoal-900 text-xs p-2 rounded border border-brass-700/40 z-20 whitespace-nowrap shadow-xl">
                        <span className="text-brass-300 font-bold">{h.label}</span>
                        <span className="text-parchment font-mono">₹{h.amount.toLocaleString("en-IN")}</span>
                        <span className="text-[10px] text-steel-400">{h.count} transactions</span>
                      </div>

                      {/* Bar Visual */}
                      <div className="w-full bg-charcoal-900 rounded-t h-full flex items-end">
                        <div
                          style={{ height: `${Math.max(heightPercent, 4)}%` }}
                          className={`w-full rounded-t transition-all ${
                            isPeak
                              ? "bg-gradient-to-t from-brass-600 to-amber-300 shadow-brass-glow"
                              : h.amount > 0
                              ? "bg-steel-500 hover:bg-brass-500"
                              : "bg-charcoal-800"
                          }`}
                        />
                      </div>
                      <span className="text-[9px] text-steel-400 font-mono mt-1">{h.hour}h</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Two-column layout: Top Products & Category Share */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Products Card */}
            <div className="card-leather p-6 space-y-4">
              <h3 className="font-display text-lg font-semibold text-parchment flex items-center justify-between">
                <span>⭐ Top 5 Selling Products by Revenue</span>
                <button
                  onClick={() => handleExportCsv("sales")}
                  className="text-xs text-brass-400 hover:underline font-ledger"
                >
                  Export CSV
                </button>
              </h3>

              <div className="space-y-3">
                {salesData.topProducts.map((p, idx) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 rounded-control bg-charcoal-900 border border-steel-600/20"
                  >
                    <div className="flex items-center gap-3">
                      <span className="h-7 w-7 rounded-full bg-brass-700/20 border border-brass-600/40 text-brass-300 text-xs font-bold flex items-center justify-center font-mono">
                        #{idx + 1}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-parchment">{p.name}</p>
                        <p className="text-xs text-steel-400 font-ledger">{p.category}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-brass-300 font-mono">
                        ₹{p.revenue.toLocaleString("en-IN")}
                      </p>
                      <p className="text-[11px] text-steel-400 font-mono">{p.quantity} units sold</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Category Revenue Distribution Share */}
            <div className="card-leather p-6 space-y-4">
              <h3 className="font-display text-lg font-semibold text-parchment">
                🏷️ Category Revenue Share
              </h3>

              <div className="space-y-4">
                {salesData.categoryBreakdown.map((cat) => (
                  <div key={cat.category} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-parchment">{cat.category}</span>
                      <span className="text-brass-300 font-mono">
                        ₹{cat.revenue.toLocaleString("en-IN")} ({cat.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-charcoal-900 rounded-full overflow-hidden border border-steel-600/20">
                      <div
                        className="h-full bg-gradient-to-r from-brass-600 to-amber-400 rounded-full"
                        style={{ width: `${cat.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Inventory Turnover */}
      {activeSubTab === "inventory" && inventoryData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card-leather p-5">
              <p className="text-xs font-ledger text-steel-400 uppercase tracking-wider">Total Inventory Cost Valuation</p>
              <p className="font-display text-2xl font-bold text-parchment mt-1">
                ₹{inventoryData.summary.totalCostValuation.toLocaleString("en-IN")}
              </p>
              <p className="text-[10px] text-steel-400 font-mono mt-1">Purchase cost tied up in stock</p>
            </div>

            <div className="card-leather p-5">
              <p className="text-xs font-ledger text-steel-400 uppercase tracking-wider">Total Retail Valuation</p>
              <p className="font-display text-2xl font-bold text-emerald-300 mt-1">
                ₹{inventoryData.summary.totalRetailValuation.toLocaleString("en-IN")}
              </p>
              <p className="text-[10px] text-steel-400 font-mono mt-1">Expected retail revenue</p>
            </div>

            <div className="card-leather p-5">
              <p className="text-xs font-ledger text-steel-400 uppercase tracking-wider">Potential Gross Profit</p>
              <p className="font-display text-2xl font-bold text-brass-300 mt-1">
                ₹{inventoryData.summary.potentialMargin.toLocaleString("en-IN")}
              </p>
              <p className="text-[10px] text-steel-400 font-mono mt-1">Valuation margin potential</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Fast Movers */}
            <div className="card-leather p-6 space-y-4">
              <h3 className="font-display text-lg font-semibold text-emerald-300 flex items-center gap-2">
                <span>🔥 Fast Movers (Top Sold Items)</span>
              </h3>
              <div className="space-y-2">
                {inventoryData.fastMovers.map((m) => (
                  <div
                    key={m.id}
                    className="flex justify-between items-center p-3 bg-charcoal-900 rounded border border-steel-600/20"
                  >
                    <div>
                      <p className="text-sm font-bold text-parchment">{m.name}</p>
                      <p className="text-xs text-steel-400">{m.category}</p>
                    </div>
                    <div className="text-right font-mono">
                      <p className="text-xs font-bold text-emerald-400">{m.totalQuantitySold} sold</p>
                      <p className="text-[10px] text-steel-400">{m.stock} in stock</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Slow Movers */}
            <div className="card-leather p-6 space-y-4">
              <h3 className="font-display text-lg font-semibold text-amber-300 flex items-center gap-2">
                <span>🧊 Slow Movers (Low Sales Velocity)</span>
              </h3>
              <div className="space-y-2">
                {inventoryData.slowMovers.map((m) => (
                  <div
                    key={m.id}
                    className="flex justify-between items-center p-3 bg-charcoal-900 rounded border border-steel-600/20"
                  >
                    <div>
                      <p className="text-sm font-bold text-parchment">{m.name}</p>
                      <p className="text-xs text-steel-400">{m.category}</p>
                    </div>
                    <div className="text-right font-mono">
                      <p className="text-xs font-bold text-amber-400">{m.totalQuantitySold} sold</p>
                      <p className="text-[10px] text-steel-400">{m.stock} in stock</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => handleExportCsv("inventory")}
              className="btn-brass py-2 px-4 text-xs flex items-center gap-2"
            >
              <span>📥</span> Export Full Inventory Valuation CSV
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: GST Tax Tier Summary */}
      {activeSubTab === "gst" && taxData && (
        <div className="space-y-6">
          <div className="card-leather p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-steel-600/30 pb-4">
              <div>
                <h3 className="font-display text-lg font-semibold text-parchment">
                  🏛️ GST Tax Liability Breakdown by Rate Tier
                </h3>
                <p className="text-xs text-steel-400 font-ledger mt-0.5">
                  Taxable value and tax output split by 0%, 5%, 12%, 18%, and 28% GST brackets
                </p>
              </div>
              <button
                onClick={() => handleExportCsv("tax")}
                className="btn-brass py-2 px-3 text-xs flex items-center gap-2"
              >
                <span>📥</span> Export Tax CSV
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm font-body">
                <thead className="bg-charcoal-900 text-xs font-ledger text-steel-400 uppercase tracking-wider border-b border-steel-600/30">
                  <tr>
                    <th className="p-3">GST Tier Rate</th>
                    <th className="p-3">Taxable Value</th>
                    <th className="p-3">GST Tax Collected</th>
                    <th className="p-3">Total Gross Sales</th>
                    <th className="p-3 text-right">Items Sold</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-steel-600/20">
                  {taxData.gstTiers.map((tier) => (
                    <tr key={tier.gstRate} className="hover:bg-charcoal-900/40">
                      <td className="p-3 font-bold text-brass-300 font-mono">{tier.gstRate}% GST</td>
                      <td className="p-3 font-mono text-parchment">₹{tier.taxableValue.toLocaleString("en-IN")}</td>
                      <td className="p-3 font-mono text-purple-300">₹{tier.gstAmount.toLocaleString("en-IN")}</td>
                      <td className="p-3 font-mono text-emerald-300">₹{tier.total.toLocaleString("en-IN")}</td>
                      <td className="p-3 font-mono text-right text-steel-400">{tier.itemCount}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-charcoal-900/80 font-bold border-t border-brass-700/30">
                  <tr>
                    <td className="p-3 text-brass-400">Total Tax Summary</td>
                    <td className="p-3 font-mono text-parchment">
                      ₹{taxData.totalTaxableTurnover.toLocaleString("en-IN")}
                    </td>
                    <td className="p-3 font-mono text-purple-300">
                      ₹{taxData.totalGstCollected.toLocaleString("en-IN")}
                    </td>
                    <td className="p-3 font-mono text-emerald-300">
                      ₹{taxData.totalGrossTurnover.toLocaleString("en-IN")}
                    </td>
                    <td className="p-3 text-right"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
