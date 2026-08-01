"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api, PurchaseOrder, ApiRequestError } from "@/lib/api";

interface PurchaseOrderDetailModalProps {
  poId: string;
  onClose: () => void;
  onUpdate: () => void;
}

export default function PurchaseOrderDetailModal({ poId, onClose, onUpdate }: PurchaseOrderDetailModalProps) {
  const { accessToken } = useAuth();
  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function fetchPoDetails() {
    if (!accessToken) return;
    setIsLoading(true);
    try {
      const data = await api.getPurchaseOrderById(accessToken, poId);
      setPo(data);
    } catch {
      setError("Failed to fetch purchase order details.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchPoDetails();
  }, [accessToken, poId]);

  async function handleStatusTransition(status: string) {
    if (!accessToken || !po) return;
    if (status === "RECEIVED" && !confirm("Are you sure you want to receive these products? This will immediately add items to available stock balances.")) return;
    
    setError(null);
    setIsSubmitting(true);

    try {
      await api.updatePoStatus(accessToken, po.id, status);
      // Reload PO details
      await fetchPoDetails();
      // Inform parent (reloads lists/stock numbers)
      onUpdate();
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError("Failed to transition purchase order status.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="desk-panel w-full max-w-lg p-6 text-center text-steel-400 font-ledger text-xs">
          Loading Purchase Order invoice...
        </div>
      </div>
    );
  }

  if (error || !po) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="desk-panel w-full max-w-lg p-6 text-center space-y-4">
          <p className="text-red-400 text-sm font-semibold">{error || "Failed to load PO."}</p>
          <button onClick={onClose} className="btn-brass text-xs py-2 px-6">
            Close Panel
          </button>
        </div>
      </div>
    );
  }

  const statusColors = {
    PENDING: "bg-steel-950/40 text-steel-400 border border-steel-900/30",
    ORDERED: "bg-blue-950/40 text-blue-400 border border-blue-900/30",
    RECEIVED: "bg-green-950/40 text-green-300 border border-green-900/30",
    CANCELLED: "bg-red-950/40 text-red-400 border border-red-900/30",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="desk-panel w-full max-w-xl p-6 relative shadow-brass-glow max-h-[90vh] overflow-y-auto flex flex-col justify-between">
        {/* Top header accent */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-brass-sheen" />

        <div>
          <div className="flex items-center justify-between border-b border-steel-600/20 pb-3 mb-4">
            <div>
              <span className="label-eyebrow text-[9px] text-brass-400">Restock Invoice Details</span>
              <h3 className="font-display text-lg font-bold text-ivory mt-0.5">PO Ref: {po.poNumber}</h3>
            </div>
            <button
              onClick={onClose}
              className="text-steel-400 hover:text-parchment transition text-lg"
            >
              &times;
            </button>
          </div>

          {/* Supplier details panel */}
          <div className="grid grid-cols-2 gap-4 bg-charcoal-900/40 border border-steel-600/5 p-4 rounded-control text-xs mb-4">
            <div className="space-y-1">
              <span className="text-[10px] text-steel-500 uppercase font-ledger block">Supplier Wholesaler</span>
              <span className="font-semibold text-ivory text-sm">{po.supplier.name}</span>
              {po.supplier.gstin && (
                <span className="text-[10px] text-brass-300 block font-ledger">GSTIN: {po.supplier.gstin}</span>
              )}
              {po.supplier.phone && <span className="text-steel-400 block">Ph: {po.supplier.phone}</span>}
            </div>

            <div className="space-y-1 text-right">
              <span className="text-[10px] text-steel-500 uppercase font-ledger block">PO Status</span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-ledger uppercase tracking-wider ${
                  statusColors[po.status]
                }`}
              >
                {po.status}
              </span>
              <span className="text-steel-400 block pt-1">Created: {new Date(po.createdAt).toLocaleDateString()}</span>
              {po.user && <span className="text-steel-400 block text-[10px]">Manager: {po.user.name}</span>}
            </div>
          </div>

          {/* Items breakdown list */}
          <div className="overflow-x-auto mb-4 border border-steel-600/10 rounded-control">
            <table className="w-full text-left border-collapse text-xs font-body">
              <thead>
                <tr className="border-b border-steel-600/20 bg-charcoal-900/60 font-ledger text-[10px] text-brass-300 uppercase tracking-wider">
                  <th className="px-4 py-3">Product Name</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3 text-right">Quantity</th>
                  <th className="px-4 py-3 text-right">Unit Wholesale Cost</th>
                  <th className="px-4 py-3 text-right">Total Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-steel-600/10">
                {po.items?.map((item) => (
                  <tr key={item.id} className="hover:bg-charcoal-800/10">
                    <td className="px-4 py-3 font-semibold text-ivory">{item.product.name}</td>
                    <td className="px-4 py-3 font-ledger text-steel-400">{item.product.sku}</td>
                    <td className="px-4 py-3 text-right font-ledger font-semibold text-parchment">
                      {item.quantity} Units
                    </td>
                    <td className="px-4 py-3 text-right font-ledger text-steel-300">
                      ₹{item.unitCost.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-ledger font-bold text-brass-300">
                      ₹{item.totalCost.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Grand total summaries */}
          <div className="text-right border-t border-dashed border-steel-600/15 pt-3 mb-6">
            <span className="text-[10px] text-steel-500 uppercase font-ledger block">Total Wholesale Capital</span>
            <span className="text-xl font-bold text-brass-300 font-ledger">₹{po.totalAmount.toFixed(2)}</span>
          </div>
        </div>

        {/* Action Panel */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-steel-600/20">
          <button onClick={onClose} className="btn-ghost text-xs py-2 px-4">
            Discard
          </button>

          <div className="flex items-center gap-2">
            {po.status === "PENDING" && (
              <>
                <button
                  disabled={isSubmitting}
                  onClick={() => handleStatusTransition("CANCELLED")}
                  className="bg-red-950/40 text-red-400 border border-red-900/30 hover:bg-red-900/30 transition text-xs font-semibold px-4 py-2 rounded-control"
                >
                  Cancel Order
                </button>
                <button
                  disabled={isSubmitting}
                  onClick={() => handleStatusTransition("ORDERED")}
                  className="btn-brass text-xs py-2 px-6"
                >
                  📤 Mark as Ordered
                </button>
              </>
            )}

            {po.status === "ORDERED" && (
              <>
                <button
                  disabled={isSubmitting}
                  onClick={() => handleStatusTransition("CANCELLED")}
                  className="bg-red-950/40 text-red-400 border border-red-900/30 hover:bg-red-900/30 transition text-xs font-semibold px-4 py-2 rounded-control"
                >
                  Cancel Order
                </button>
                <button
                  disabled={isSubmitting}
                  onClick={() => handleStatusTransition("RECEIVED")}
                  className="bg-green-600 hover:bg-green-500 text-white text-xs font-semibold py-2 px-6 rounded-control shadow-green-glow"
                >
                  📥 Receive Incoming Stock
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
