"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api, Supplier, ApiRequestError } from "@/lib/api";

export default function SuppliersView() {
  const { accessToken } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter
  const [search, setSearch] = useState("");

  // Create/Edit form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [gstin, setGstin] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function fetchSuppliers() {
    if (!accessToken) return;
    setIsLoading(true);
    try {
      const data = await api.getSuppliers(accessToken);
      setSuppliers(data);
    } catch {
      setError("Failed to fetch suppliers database.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchSuppliers();
  }, [accessToken]);

  function openCreateModal() {
    setError(null);
    setEditingSupplier(null);
    setName("");
    setContactName("");
    setEmail("");
    setPhone("");
    setAddress("");
    setGstin("");
    setIsModalOpen(true);
  }

  function openEditModal(sup: Supplier) {
    setError(null);
    setEditingSupplier(sup);
    setName(sup.name);
    setContactName(sup.contactName || "");
    setEmail(sup.email || "");
    setPhone(sup.phone || "");
    setAddress(sup.address || "");
    setGstin(sup.gstin || "");
    setIsModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;

    setError(null);
    setIsSubmitting(true);

    const payload = {
      name,
      contactName: contactName || null,
      email: email || null,
      phone: phone || null,
      address: address || null,
      gstin: gstin || null,
    };

    try {
      if (editingSupplier) {
        await api.updateSupplier(accessToken, editingSupplier.id, payload);
      } else {
        await api.createSupplier(accessToken, payload);
      }
      setIsModalOpen(false);
      fetchSuppliers();
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError("Failed to save supplier registry.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteSupplier(id: string) {
    if (!confirm("Are you sure you want to delete this supplier? This action is irreversible.")) return;
    if (!accessToken) return;

    setError(null);
    try {
      await api.deleteSupplier(accessToken, id);
      fetchSuppliers();
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError("Failed to delete supplier.");
      }
    }
  }

  const filteredSuppliers = suppliers.filter((sup) => {
    return (
      sup.name.toLowerCase().includes(search.toLowerCase()) ||
      (sup.contactName && sup.contactName.toLowerCase().includes(search.toLowerCase())) ||
      (sup.gstin && sup.gstin.toLowerCase().includes(search.toLowerCase()))
    );
  });

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="label-eyebrow mb-1">Procurement Management</p>
          <h1 className="font-display text-3xl font-semibold text-ivory">Suppliers Wholesalers</h1>
        </div>
        <button onClick={openCreateModal} className="btn-brass text-sm py-2 px-5">
          + Add Supplier
        </button>
      </header>

      {error && (
        <div className="rounded-control border border-red-950/40 bg-red-950/20 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Filter panel */}
      <div className="desk-panel p-4 flex items-center justify-between gap-4">
        <input
          type="text"
          placeholder="Filter by Wholesaler Name, Contact or GSTIN..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="control-input text-xs flex-1 max-w-md py-2"
        />
        <span className="font-ledger text-xs text-steel-400">
          Total Wholesalers: {filteredSuppliers.length}
        </span>
      </div>

      {/* Grid listing */}
      {isLoading ? (
        <div className="text-center text-steel-400 font-ledger text-xs py-12">
          Reviewing Wholesaler databases...
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="text-center text-steel-500 font-ledger text-xs py-12">
          No suppliers matching search criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSuppliers.map((sup) => (
            <div
              key={sup.id}
              className="desk-panel p-5 bg-charcoal-900 border border-steel-600/10 flex flex-col justify-between hover:border-brass-600/30 transition-all relative overflow-hidden"
            >
              {/* Subtle top border accent */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-brass-700/20" />

              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-display text-base font-semibold text-ivory">{sup.name}</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-charcoal-950 text-brass-300 border border-brass-700/25">
                    {sup._count?.purchaseOrders || 0} POs
                  </span>
                </div>

                <div className="space-y-1.5 text-xs font-body text-steel-300/90 pt-2 border-t border-steel-600/10">
                  {sup.contactName && (
                    <div className="flex justify-between">
                      <span className="text-steel-500">Contact:</span>
                      <span className="font-semibold text-parchment">{sup.contactName}</span>
                    </div>
                  )}
                  {sup.phone && (
                    <div className="flex justify-between">
                      <span className="text-steel-500">Phone:</span>
                      <span className="font-ledger">{sup.phone}</span>
                    </div>
                  )}
                  {sup.email && (
                    <div className="flex justify-between">
                      <span className="text-steel-500">Email:</span>
                      <span className="truncate max-w-[160px]">{sup.email}</span>
                    </div>
                  )}
                  {sup.gstin && (
                    <div className="flex justify-between">
                      <span className="text-steel-500">GSTIN:</span>
                      <span className="font-ledger text-brass-400">{sup.gstin}</span>
                    </div>
                  )}
                  {sup.address && (
                    <div className="mt-2 pt-2 border-t border-dashed border-steel-600/5 text-[11px] text-steel-400">
                      {sup.address}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 mt-4 border-t border-steel-600/10 text-xs">
                <button
                  onClick={() => openEditModal(sup)}
                  className="text-brass-300 hover:text-brass-200 transition font-medium"
                >
                  Edit details
                </button>
                <span className="text-steel-600">|</span>
                <button
                  onClick={() => handleDeleteSupplier(sup.id)}
                  className="text-red-400 hover:text-red-300 transition font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Supplier Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="desk-panel w-full max-w-md p-6 relative shadow-brass-glow animate-fade-in">
            {/* Walnut border accent */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-brass-sheen" />

            <div className="flex items-center justify-between border-b border-steel-600/20 pb-3 mb-4">
              <h3 className="font-display text-lg font-bold text-ivory">
                {editingSupplier ? "Edit Wholesaler Details" : "Register New Supplier Wholesaler"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-steel-400 hover:text-parchment transition text-lg"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label-eyebrow mb-1.5 block">Wholesaler Company Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Standard Stationery Wholesalers"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="control-input text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-eyebrow mb-1.5 block">Contact Person</label>
                  <input
                    type="text"
                    placeholder="e.g. Rohan Verma"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="control-input text-xs"
                  />
                </div>
                <div>
                  <label className="label-eyebrow mb-1.5 block">GSTIN Identification</label>
                  <input
                    type="text"
                    placeholder="e.g. 06AAAAA1111A1Z1"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    className="control-input text-xs font-ledger uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-eyebrow mb-1.5 block">Contact Email</label>
                  <input
                    type="email"
                    placeholder="orders@supplier.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="control-input text-xs"
                  />
                </div>
                <div>
                  <label className="label-eyebrow mb-1.5 block">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="control-input text-xs font-ledger"
                  />
                </div>
              </div>

              <div>
                <label className="label-eyebrow mb-1.5 block">Registered Warehouse Address</label>
                <textarea
                  placeholder="Enter full billing or factory shipping address..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="control-input text-xs h-20 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-steel-600/20">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-ghost text-xs py-2 px-4"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-brass text-xs py-2 px-6"
                >
                  {isSubmitting ? "Saving Wholesaler..." : "Save Wholesaler"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
