"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api, PurchaseOrder, Supplier, Product, ApiRequestError } from "@/lib/api";
import PurchaseOrderDetailModal from "./PurchaseOrderDetailModal";

interface PoDraftItem {
  product: Product;
  quantity: number;
  unitCost: number;
}

export default function PurchaseOrderListView() {
  const { accessToken } = useAuth();
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected PO for details drawer
  const [selectedPoId, setSelectedPoId] = useState<string | null>(null);

  // Draft Creation modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [draftItems, setDraftItems] = useState<PoDraftItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New item drafting selectors
  const [selectedProductId, setSelectedProductId] = useState("");
  const [draftQty, setDraftQty] = useState("10");
  const [draftCost, setDraftCost] = useState("");

  async function fetchAllData() {
    if (!accessToken) return;
    setIsLoading(true);
    try {
      const orders = await api.getPurchaseOrders(accessToken);
      const sups = await api.getSuppliers(accessToken);
      const prods = await api.getProducts(accessToken);
      setPos(orders);
      setSuppliers(sups);
      setProducts(Array.isArray(prods) ? prods : prods?.data ?? []);
    } catch {
      setError("Failed to fetch procurement records.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchAllData();
  }, [accessToken]);

  // Sync draft cost when selecting product
  useEffect(() => {
    if (selectedProductId) {
      const prod = products.find((p) => p.id === selectedProductId);
      if (prod) {
        setDraftCost(prod.purchasePrice.toString());
      }
    } else {
      setDraftCost("");
    }
  }, [selectedProductId, products]);

  function openCreateModal() {
    setError(null);
    setSelectedSupplierId("");
    setDraftItems([]);
    setSelectedProductId("");
    setDraftQty("10");
    setDraftCost("");
    setIsCreateModalOpen(true);
  }

  function addDraftItem() {
    if (!selectedProductId) return;
    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;

    const qty = parseInt(draftQty) || 0;
    const cost = parseFloat(draftCost) || 0;

    if (qty <= 0) {
      setError("Quantity must be a positive integer.");
      return;
    }
    if (cost < 0) {
      setError("Cost price cannot be negative.");
      return;
    }

    setDraftItems((prev) => {
      const existing = prev.find((i) => i.product.id === prod.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === prod.id ? { ...i, quantity: i.quantity + qty, unitCost: cost } : i
        );
      }
      return [...prev, { product: prod, quantity: qty, unitCost: cost }];
    });

    // Reset item drafts inputs
    setSelectedProductId("");
    setDraftQty("10");
    setDraftCost("");
  }

  function removeDraftItem(prodId: string) {
    setDraftItems((prev) => prev.filter((i) => i.product.id !== prodId));
  }

  async function handleCreatePoSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;

    if (!selectedSupplierId) {
      setError("Please select a wholesaler supplier.");
      return;
    }
    if (draftItems.length === 0) {
      setError("Draft items list is empty.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    const payload = {
      supplierId: selectedSupplierId,
      items: draftItems.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        unitCost: item.unitCost,
      })),
    };

    try {
      await api.createPurchaseOrder(accessToken, payload);
      setIsCreateModalOpen(false);
      fetchAllData();
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError("Failed to submit Purchase Order draft.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  // running total calculation
  const totalAmount = draftItems.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);

  const statusColors = {
    PENDING: "bg-steel-950/40 text-steel-400 border border-steel-900/30",
    ORDERED: "bg-blue-950/40 text-blue-400 border border-blue-900/30",
    RECEIVED: "bg-green-950/40 text-green-300 border border-green-900/30",
    CANCELLED: "bg-red-950/40 text-red-400 border border-red-900/30",
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="label-eyebrow mb-1">Procurement Management</p>
          <h1 className="font-display text-3xl font-semibold text-ivory">Purchase Orders</h1>
        </div>
        <button onClick={openCreateModal} className="btn-brass text-sm py-2 px-5">
          + Draft PO Order
        </button>
      </header>

      {error && (
        <div className="rounded-control border border-red-950/40 bg-red-950/20 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* PO Table */}
      <div className="desk-panel overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-steel-400 font-ledger text-xs">
            Reviewing Purchase Orders ledger...
          </div>
        ) : pos.length === 0 ? (
          <div className="p-12 text-center text-steel-500 font-ledger text-xs">
            No procurement purchase orders created.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-body text-sm">
              <thead>
                <tr className="border-b border-steel-600/20 bg-charcoal-900 font-ledger text-xs text-brass-300/80 uppercase tracking-wider">
                  <th className="px-6 py-4">PO Ref Number</th>
                  <th className="px-6 py-4">Wholesaler</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Total Capital</th>
                  <th className="px-6 py-4">Created Date</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-steel-600/10">
                {pos.map((po) => (
                  <tr key={po.id} className="hover:bg-charcoal-800/20 transition-all">
                    <td className="px-6 py-4 font-semibold text-ivory">{po.poNumber}</td>
                    <td className="px-6 py-4 font-semibold text-parchment">{po.supplier.name}</td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold font-ledger uppercase ${
                          statusColors[po.status]
                        }`}
                      >
                        {po.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-ledger font-bold text-brass-300">
                      ₹{po.totalAmount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-steel-400 font-ledger text-xs">
                      {new Date(po.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => setSelectedPoId(po.id)}
                        className="text-xs text-brass-300 hover:text-brass-200 transition font-ledger font-semibold"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PO Detail Drawer Modal */}
      {selectedPoId && (
        <PurchaseOrderDetailModal
          poId={selectedPoId}
          onClose={() => setSelectedPoId(null)}
          onUpdate={fetchAllData}
        />
      )}

      {/* Create Purchase Order Draft Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="desk-panel w-full max-w-2xl p-6 relative shadow-brass-glow max-h-[90vh] overflow-y-auto flex flex-col justify-between">
            {/* walnut banner */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-brass-sheen" />

            <div>
              <div className="flex items-center justify-between border-b border-steel-600/20 pb-3 mb-4">
                <h3 className="font-display text-lg font-bold text-ivory">Draft New Purchase Order</h3>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-steel-400 hover:text-parchment transition text-lg"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleCreatePoSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Select Wholesaler */}
                  <div>
                    <label className="label-eyebrow mb-1.5 block">Select Supplier Wholesaler *</label>
                    <select
                      required
                      value={selectedSupplierId}
                      onChange={(e) => setSelectedSupplierId(e.target.value)}
                      className="control-input text-xs bg-charcoal-900 cursor-pointer"
                    >
                      <option value="">-- Choose Supplier Wholesaler --</option>
                      {suppliers.map((sup) => (
                        <option key={sup.id} value={sup.id}>
                          {sup.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Draft item inputs panel */}
                <div className="p-4 bg-charcoal-900 border border-steel-600/10 rounded-control space-y-4">
                  <p className="label-eyebrow text-brass-300">Add Restock SKU Details</p>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-5">
                      <label className="label-eyebrow text-[9px] mb-1 block">Catalog Product</label>
                      <select
                        value={selectedProductId}
                        onChange={(e) => setSelectedProductId(e.target.value)}
                        className="control-input text-xs bg-charcoal-950 cursor-pointer"
                      >
                        <option value="">-- Choose Product --</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-3">
                      <label className="label-eyebrow text-[9px] mb-1 block">Quantity</label>
                      <input
                        type="number"
                        placeholder="10"
                        value={draftQty}
                        onChange={(e) => setDraftQty(e.target.value)}
                        className="control-input text-xs font-ledger"
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className="label-eyebrow text-[9px] mb-1 block">Wholesale Unit Cost (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={draftCost}
                        onChange={(e) => setDraftCost(e.target.value)}
                        className="control-input text-xs font-ledger"
                      />
                    </div>

                    <div className="md:col-span-1">
                      <button
                        type="button"
                        onClick={addDraftItem}
                        disabled={!selectedProductId}
                        className="w-full btn-brass text-xs py-2 h-[38px] flex items-center justify-center font-bold disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Draft items list */}
                <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                  {draftItems.length === 0 ? (
                    <div className="py-8 text-center text-steel-500 font-ledger text-xs border border-dashed border-steel-600/10 rounded-control">
                      No SKU items added to restock invoice draft.
                    </div>
                  ) : (
                    <div className="border border-steel-600/10 rounded-control overflow-hidden">
                      <table className="w-full text-left border-collapse text-xs font-body">
                        <thead>
                          <tr className="border-b border-steel-600/20 bg-charcoal-950 font-ledger text-[10px] text-steel-400 uppercase">
                            <th className="px-4 py-2">Item</th>
                            <th className="px-4 py-2 text-right">Qty</th>
                            <th className="px-4 py-2 text-right">Unit Wholesale Cost</th>
                            <th className="px-4 py-2 text-right">Subtotal</th>
                            <th className="px-4 py-2 text-center">Remove</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-steel-600/5">
                          {draftItems.map((item) => (
                            <tr key={item.product.id} className="hover:bg-charcoal-800/10">
                              <td className="px-4 py-2 font-semibold text-ivory">{item.product.name}</td>
                              <td className="px-4 py-2 text-right font-ledger">{item.quantity}</td>
                              <td className="px-4 py-2 text-right font-ledger">₹{item.unitCost.toFixed(2)}</td>
                              <td className="px-4 py-2 text-right font-ledger font-bold text-brass-300">
                                ₹{(item.quantity * item.unitCost).toFixed(2)}
                              </td>
                              <td className="px-4 py-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => removeDraftItem(item.product.id)}
                                  className="text-red-400 hover:text-red-300 font-bold"
                                >
                                  &times;
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-steel-600/20">
                  <div className="text-left">
                    <span className="text-[10px] text-steel-500 uppercase font-ledger block">Agreed PO Cost</span>
                    <span className="text-lg font-bold text-brass-300 font-ledger">₹{totalAmount.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsCreateModalOpen(false)}
                      className="btn-ghost text-xs py-2 px-4"
                    >
                      Discard
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || draftItems.length === 0}
                      className="btn-brass text-xs py-2 px-6"
                    >
                      {isSubmitting ? "Drafting Purchase Order..." : "Draft Purchase Order"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
