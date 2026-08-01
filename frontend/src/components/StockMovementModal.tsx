"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api, Product, StockMovement, ApiRequestError } from "@/lib/api";

interface StockMovementModalProps {
  product: Product;
  onClose: () => void;
  onUpdate: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  RECEIVED: "Stock Received",
  SOLD: "Customer Sale",
  DAMAGED: "Marked Damaged",
  RESERVED: "Reserved Stock",
  RETURNED: "Customer Return",
  ADJUSTMENT: "Manual Correction",
};

const TYPE_COLORS: Record<string, string> = {
  RECEIVED: "text-green-300 bg-green-950/40 border border-green-900/30",
  SOLD: "text-blue-300 bg-blue-950/40 border border-blue-900/30",
  DAMAGED: "text-red-300 bg-red-950/40 border border-red-900/30",
  RESERVED: "text-amber-300 bg-amber-950/40 border border-amber-900/30",
  RETURNED: "text-purple-300 bg-purple-950/40 border border-purple-900/30",
  ADJUSTMENT: "text-steel-300 bg-charcoal-900 border border-steel-600/30",
};

export default function StockMovementModal({ product, onClose, onUpdate }: StockMovementModalProps) {
  const { accessToken, user } = useAuth();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [quantity, setQuantity] = useState("");
  const [type, setType] = useState("RECEIVED");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canWrite = user?.role === "ADMIN" || user?.role === "INVENTORY_MANAGER";

  async function fetchMovements() {
    if (!accessToken) return;
    setIsLoading(true);
    try {
      const data = await api.getInventoryMovements(accessToken, product.id);
      setMovements(data);
    } catch {
      setError("Failed to load movement ledger.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchMovements();
  }, [accessToken, product.id]);

  async function handleAdjust(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || !canWrite) return;
    setIsSubmitting(true);
    setError(null);

    const qtyVal = parseInt(quantity);
    if (isNaN(qtyVal) || qtyVal <= 0) {
      setError("Please enter a valid positive integer quantity.");
      setIsSubmitting(false);
      return;
    }

    try {
      await api.adjustStock(accessToken, product.id, {
        quantity: qtyVal,
        type,
        reason: reason || undefined,
      });

      // Clear form and reload
      setQuantity("");
      setReason("");
      fetchMovements();
      onUpdate(); // trigger catalog update
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError("Failed to submit stock adjustment.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="desk-panel w-full max-w-4xl p-8 relative flex flex-col md:flex-row gap-8 max-h-[90vh] overflow-y-auto">
        {/* Left Side: Ledger logging (Form) */}
        <div className="w-full md:w-2/5 space-y-6">
          <div>
            <p className="label-eyebrow">Stock Balance Card</p>
            <h3 className="font-display text-xl font-bold text-brass-300 mt-1">{product.name}</h3>
            <p className="text-xs text-steel-400 font-ledger">{product.sku}</p>
          </div>

          {/* Active Balance Badges */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-charcoal-900 border border-steel-600/20 p-2.5 rounded text-center">
              <span className="text-[10px] text-steel-400 uppercase font-ledger block">Available</span>
              <span className="text-lg font-bold text-brass-300 font-ledger">{product.stock}</span>
            </div>
            <div className="bg-charcoal-900 border border-steel-600/20 p-2.5 rounded text-center">
              <span className="text-[10px] text-steel-400 uppercase font-ledger block">Damaged</span>
              <span className="text-lg font-bold text-red-400 font-ledger">{product.damagedStock}</span>
            </div>
            <div className="bg-charcoal-900 border border-steel-600/20 p-2.5 rounded text-center">
              <span className="text-[10px] text-steel-400 uppercase font-ledger block">Reserved</span>
              <span className="text-lg font-bold text-amber-400 font-ledger">{product.reservedStock}</span>
            </div>
          </div>

          {canWrite ? (
            <form onSubmit={handleAdjust} className="space-y-4 pt-4 border-t border-steel-600/10">
              <h4 className="font-display text-base text-ivory font-semibold">Post Stock Entry</h4>

              <div>
                <label className="label-eyebrow mb-2 block">Quantity (Integer) *</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 15"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="control-input text-sm font-ledger"
                />
              </div>

              <div>
                <label className="label-eyebrow mb-2 block">Entry Type *</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="control-input text-sm bg-charcoal-900 cursor-pointer"
                >
                  <option value="RECEIVED">Stock In (Received)</option>
                  <option value="DAMAGED">Mark Damaged</option>
                  <option value="RESERVED">Reserve Stock</option>
                  <option value="RETURNED">Customer Return</option>
                  <option value="ADJUSTMENT">Manual Override</option>
                </select>
              </div>

              <div>
                <label className="label-eyebrow mb-2 block">Ledger Reason</label>
                <textarea
                  placeholder="Enter reason for adjustment..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="control-input text-sm h-20 resize-none"
                />
              </div>

              <button type="submit" disabled={isSubmitting} className="btn-brass w-full text-sm py-2">
                {isSubmitting ? "Posting..." : "Post Entry to Ledger"}
              </button>
            </form>
          ) : (
            <div className="p-4 bg-charcoal-900 border border-steel-600/15 rounded-control text-xs text-steel-300 leading-relaxed">
              🔒 <strong>Clearance Notice:</strong> Only Owners and Inventory Managers can create stock adjustments.
            </div>
          )}

          {error && (
            <div className="rounded-control border border-red-950/40 bg-red-950/20 px-3 py-2 text-xs text-red-300">
              {error}
            </div>
          )}
        </div>

        {/* Right Side: Chronological timeline list */}
        <div className="w-full md:w-3/5 flex flex-col justify-between border-t md:border-t-0 md:border-l border-steel-600/20 pt-6 md:pt-0 md:pl-8">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-steel-600/15 pb-2">
              <h4 className="font-display text-base text-ivory font-semibold">Ledger History</h4>
              <button
                onClick={fetchMovements}
                className="text-xs text-brass-400 hover:text-brass-300 font-ledger"
              >
                🔄 Refresh
              </button>
            </div>

            {isLoading ? (
              <div className="py-12 text-center text-steel-400 font-ledger text-xs">
                Analyzing ledger history...
              </div>
            ) : movements.length === 0 ? (
              <div className="py-12 text-center text-steel-500 font-ledger text-xs">
                No movements recorded.
              </div>
            ) : (
              <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
                {movements.map((mov) => {
                  const dateStr = new Date(mov.createdAt).toLocaleString();
                  const qtyString = mov.quantity > 0 ? `+${mov.quantity}` : `${mov.quantity}`;
                  return (
                    <div
                      key={mov.id}
                      className="p-3 bg-charcoal-900/60 border border-steel-600/10 rounded-control flex flex-col gap-2 text-xs hover:border-brass-600/10 transition"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-ledger font-semibold ${TYPE_COLORS[mov.type] || ""}`}>
                          {TYPE_LABELS[mov.type] || mov.type}
                        </span>
                        <span className={`font-ledger font-bold text-sm ${mov.quantity > 0 ? "text-green-400" : "text-red-400"}`}>
                          {qtyString}
                        </span>
                      </div>

                      <p className="text-steel-300 italic">
                        &quot;{mov.reason || "No comments"}&quot;
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-steel-400 font-ledger border-t border-steel-600/5 pt-1.5 mt-1">
                        <span>By: {mov.user?.name || "System"}</span>
                        <span>{dateStr}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-6 mt-6 border-t border-steel-600/15">
            <button onClick={onClose} className="btn-ghost text-sm py-2 px-6">
              Close ledger
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
