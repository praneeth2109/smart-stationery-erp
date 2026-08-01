"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api, DashboardStats, DashboardChartData } from "@/lib/api";
import { speakPaymentAlert, playChimeTone } from "@/lib/soundbox";

export default function DashboardOverviewView() {
  const { accessToken } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [charts, setCharts] = useState<DashboardChartData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchDashboardData() {
    if (!accessToken) return;
    try {
      const statsData = await api.getDashboardStats(accessToken);
      const chartsData = await api.getDashboardCharts(accessToken);
      setStats(statsData);
      setCharts(chartsData);
      setError(null);
    } catch (err) {
      setError("Failed to fetch live dashboard updates.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchDashboardData();

    // 5-second Live Polling Interval
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 5000);

    return () => clearInterval(interval);
  }, [accessToken]);

  if (isLoading && !stats) {
    return (
      <div className="desk-panel p-12 text-center text-steel-400 font-ledger text-xs">
        Polishing desktop brass metrics...
      </div>
    );
  }

  // Find max sales for SVG scaling
  const maxSales = charts?.timeline.reduce((acc, curr) => Math.max(acc, curr.sales), 100) || 100;
  const maxCategoryValue = charts?.categories.reduce((acc, curr) => Math.max(acc, curr.stockValue), 100) || 100;

  return (
    <div className="space-y-8">
      {/* Paytm & PhonePe Merchant Style Quick Action Bar */}
      <div className="card-leather p-4 flex flex-wrap items-center justify-between gap-4 border border-brass-700/30">
        <div className="flex items-center gap-2">
          <span className="text-xl">📱</span>
          <div>
            <h3 className="text-xs font-bold text-parchment uppercase tracking-wider font-ledger">
              Merchant Quick Actions
            </h3>
            <p className="text-[11px] text-steel-400 font-ledger">
              Instant POS Soundbox speaker test & quick desk shortcuts
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              playChimeTone();
              speakPaymentAlert(250, "Demo Customer", "UPI");
            }}
            className="btn-brass text-xs py-2 px-3.5 flex items-center gap-2 font-bold shadow-brass-glow"
          >
            <span>🔊</span> Test Paytm Soundbox
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-control border border-red-950/40 bg-red-950/20 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Metric Cards - Skeuomorphic walnut & gold border frames */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Sales Revenue */}
          <div className="desk-panel p-6 shadow-panel hover:shadow-brass-glow transition-all">
            <p className="label-eyebrow mb-2">Total Sales</p>
            <h2 className="font-display text-3xl font-bold text-brass-300">
              ₹{stats.totalSales.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h2>
            <p className="text-xs text-steel-400 mt-2 font-ledger">Gross receipt sum</p>
          </div>

          {/* Card 2: Net Profit */}
          <div className="desk-panel p-6 shadow-panel hover:shadow-brass-glow transition-all">
            <p className="label-eyebrow mb-2">Net Profit</p>
            <h2 className="font-display text-3xl font-bold text-emerald-400">
              ₹{stats.netProfit.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h2>
            <p className="text-xs text-steel-400 mt-2 font-ledger">
              Margin: {stats.profitMarginPercentage.toFixed(1)}%
            </p>
          </div>

          {/* Card 3: Active Stock */}
          <div className="desk-panel p-6 shadow-panel hover:shadow-brass-glow transition-all">
            <p className="label-eyebrow mb-2">Total Stock</p>
            <h2 className="font-display text-3xl font-bold text-ivory">
              {stats.totalStockItems.toLocaleString()}
            </h2>
            <p className="text-xs text-steel-400 mt-2 font-ledger">Units in store</p>
          </div>

          {/* Card 4: Low Stock Alerts */}
          <div className="desk-panel p-6 shadow-panel hover:shadow-brass-glow transition-all">
            <p className="label-eyebrow mb-2">Stock Alerts</p>
            <h2
              className={`font-display text-3xl font-bold ${
                stats.outOfStockCount + stats.lowStockCount > 0 ? "text-orange-400" : "text-emerald-400"
              }`}
            >
              {stats.outOfStockCount + stats.lowStockCount}
            </h2>
            <p className="text-xs text-steel-400 mt-2 font-ledger">
              {stats.outOfStockCount} Out / {stats.lowStockCount} Low
            </p>
          </div>
        </div>
      )}

      {/* Analytics Charts & Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Interactive Charts */}
        <div className="lg:col-span-2 space-y-8">
          {/* Chart 1: Revenue Timeline (SVG Bar Chart) */}
          <div className="desk-panel p-6 space-y-4">
            <div>
              <p className="label-eyebrow">Financial timeline</p>
              <h3 className="font-display text-lg font-semibold text-ivory">Daily Revenue &amp; Margin</h3>
            </div>

            {charts && charts.timeline.length > 0 ? (
              <div className="pt-6">
                {/* SVG Chart Container */}
                <div className="h-64 flex items-end justify-between gap-4 border-b border-steel-600/30 pb-2 px-2">
                  {charts.timeline.map((day, idx) => {
                    const salesHeight = (day.sales / maxSales) * 80 + 5; // scaled percent
                    const profitHeight = (day.profit / maxSales) * 80 + 5; // scaled percent

                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                        {/* Tooltip on Hover */}
                        <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center bg-charcoal-950 border border-brass-600/40 p-2 rounded text-[10px] font-ledger z-20 shadow-lg text-left min-w-[100px]">
                          <div className="font-semibold text-brass-300">{day.date}</div>
                          <div>Sales: ₹{day.sales.toFixed(0)}</div>
                          <div className="text-emerald-400 font-bold">Profit: ₹{day.profit.toFixed(0)}</div>
                        </div>

                        {/* Bar: Sales */}
                        <div className="w-full flex justify-center gap-1 items-end h-full">
                          <div
                            style={{ height: `${salesHeight}%` }}
                            className="w-4 bg-brass-sheen rounded-t shadow-embossed hover:brightness-110 transition-all duration-300"
                          />
                          {/* Bar: Profit */}
                          <div
                            style={{ height: `${profitHeight}%` }}
                            className="w-4 bg-gradient-to-t from-emerald-800 to-emerald-400 rounded-t shadow-embossed hover:brightness-110 transition-all duration-300"
                          />
                        </div>

                        <span className="font-ledger text-xs text-steel-400 mt-2 block">{day.name}</span>
                      </div>
                    );
                  })}
                </div>
                {/* Chart Legend */}
                <div className="flex justify-center gap-6 mt-4 text-xs font-ledger">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 bg-brass-500 rounded" />
                    <span className="text-steel-300">Sales Revenue</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 bg-emerald-500 rounded" />
                    <span className="text-steel-300">Net Profit</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-steel-500 text-xs font-ledger">
                No recent transaction history found.
              </div>
            )}
          </div>

          {/* Chart 2: Category Distribution */}
          <div className="desk-panel p-6 space-y-4">
            <div>
              <p className="label-eyebrow">Taxonomy allocation</p>
              <h3 className="font-display text-lg font-semibold text-ivory">Category Inventory Values</h3>
            </div>

            {charts && charts.categories.length > 0 ? (
              <div className="space-y-4 pt-2">
                {charts.categories.map((cat) => {
                  const widthPercent = (cat.stockValue / maxCategoryValue) * 100;
                  return (
                    <div key={cat.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-ledger">
                        <span className="text-ivory font-bold">{cat.name}</span>
                        <span className="text-brass-300 font-bold">
                          ₹{cat.stockValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      <div className="h-3 bg-charcoal-900 rounded-full overflow-hidden border border-steel-600/10">
                        <div
                          style={{ width: `${Math.max(widthPercent, 2)}%` }}
                          className="h-full bg-brass-sheen rounded-full transition-all duration-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-steel-500 text-xs font-ledger">
                No categories classified.
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Out of Stock alerts list */}
        <div className="desk-panel p-6 space-y-4 h-fit">
          <div>
            <p className="label-eyebrow text-orange-400">Critical Alerts</p>
            <h3 className="font-display text-lg font-semibold text-ivory">Stock Status alerts</h3>
          </div>

          {stats && stats.alerts.length > 0 ? (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {stats.alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-3 bg-charcoal-900 border border-steel-600/10 rounded-control flex items-center justify-between gap-3 hover:border-brass-600/20 transition"
                >
                  <div className="overflow-hidden">
                    <h4 className="text-sm font-semibold text-ivory truncate">{alert.name}</h4>
                    <p className="text-xs text-steel-400 font-ledger truncate">{alert.sku}</p>
                  </div>
                  <span
                    className={`font-ledger text-xs font-bold px-2 py-1 rounded ${
                      alert.stock === 0
                        ? "bg-red-950/40 text-red-400 border border-red-900/30"
                        : "bg-orange-950/40 text-orange-400 border border-orange-900/30"
                    }`}
                  >
                    {alert.stock === 0 ? "Out of Stock" : `${alert.stock} Left`}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-emerald-400 text-xs font-ledger">
              ✅ All stock levels are healthy!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
