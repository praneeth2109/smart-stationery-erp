"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api, StaffUser, ApiRequestError } from "@/lib/api";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Shop Owner",
  CASHIER: "Cashier",
  INVENTORY_MANAGER: "Inventory Manager",
};

export default function StaffDirectoryView() {
  const { accessToken, user: currentUser } = useAuth();
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal / Add Staff Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("CASHIER");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function fetchStaff() {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getStaff(accessToken);
      setStaff(data);
    } catch (err) {
      setError("Failed to retrieve staff directory.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchStaff();
  }, [accessToken]);

  async function handleAddStaff(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    setIsSubmitting(true);
    setError(null);

    try {
      await api.registerStaff(accessToken, {
        name,
        email,
        password,
        role,
        phone: phone || undefined,
      });
      setIsModalOpen(false);
      setName("");
      setEmail("");
      setPassword("");
      setRole("CASHIER");
      setPhone("");
      fetchStaff();
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError("Failed to register employee.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleStatus(user: StaffUser) {
    if (!accessToken) return;
    if (user.id === currentUser?.id) return; // Prevent self-suspension

    const newStatus = user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    try {
      await api.updateStaff(accessToken, user.id, { status: newStatus });
      fetchStaff();
    } catch (err) {
      setError("Failed to update status.");
    }
  }

  async function handleRoleChange(user: StaffUser, newRole: string) {
    if (!accessToken) return;
    if (user.id === currentUser?.id) return; // Prevent self role change

    try {
      await api.updateStaff(accessToken, user.id, { role: newRole as any });
      fetchStaff();
    } catch (err) {
      setError("Failed to update role.");
    }
  }

  async function handleDelete(id: string) {
    if (!accessToken) return;
    if (id === currentUser?.id) return; // Prevent self-deletion
    if (!confirm("Are you sure you want to delete this staff member's credentials?")) return;

    try {
      await api.deleteStaff(accessToken, id);
      fetchStaff();
    } catch (err) {
      setError("Failed to delete employee account.");
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="label-eyebrow mb-1">Administrative Desk</p>
          <h1 className="font-display text-3xl font-semibold text-ivory">Staff Directory</h1>
          <p className="font-body text-xs text-steel-400 mt-1">
            Manage employee accounts, assign clearance roles, and suspend/activate access.
          </p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-brass text-sm py-2">
          ➕ Register Employee
        </button>
      </header>

      {error && (
        <div className="rounded-control border border-red-950/40 bg-red-950/20 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Staff List Table */}
      <div className="desk-panel overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-steel-400 font-ledger text-xs">
            Reading security logs...
          </div>
        ) : staff.length === 0 ? (
          <div className="p-12 text-center text-steel-400 font-ledger text-xs">
            No employees registered.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-body text-sm">
              <thead>
                <tr className="border-b border-steel-600/20 bg-charcoal-900 font-ledger text-xs text-brass-300/80 uppercase tracking-wider">
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Contact</th>
                  <th className="px-6 py-4">Role / Clearance</th>
                  <th className="px-6 py-4">Access Status</th>
                  <th className="px-6 py-4">Date Added</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-steel-600/10">
                {staff.map((member) => {
                  const isSelf = member.id === currentUser?.id;
                  return (
                    <tr key={member.id} className="hover:bg-charcoal-800/20 transition-all">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-ivory flex items-center gap-2">
                          {member.name}
                          {isSelf && (
                            <span className="text-[10px] uppercase font-ledger px-1.5 py-0.5 rounded bg-brass-700/30 border border-brass-600/30 text-brass-300">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-steel-400 font-ledger">{member.email}</div>
                      </td>
                      <td className="px-6 py-4 font-ledger text-xs text-parchment/90">
                        {member.phone || "No phone added"}
                      </td>
                      <td className="px-6 py-4">
                        {isSelf ? (
                          <span className="px-2 py-1 rounded bg-charcoal-900 border border-brass-700/20 text-xs text-brass-300 font-semibold">
                            {ROLE_LABEL[member.role]}
                          </span>
                        ) : (
                          <select
                            value={member.role}
                            onChange={(e) => handleRoleChange(member, e.target.value)}
                            className="text-xs font-semibold bg-charcoal-900 border border-steel-600/30 text-parchment rounded px-2 py-1 cursor-pointer focus:outline-none focus:border-brass-600"
                          >
                            <option value="ADMIN">Shop Owner</option>
                            <option value="INVENTORY_MANAGER">Inventory Manager</option>
                            <option value="CASHIER">Cashier</option>
                          </select>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            member.status === "ACTIVE"
                              ? "bg-green-950/40 text-green-300 border border-green-900/30"
                              : "bg-red-950/40 text-red-300 border border-red-900/30"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              member.status === "ACTIVE" ? "bg-green-400" : "bg-red-400"
                            }`}
                          />
                          {member.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-ledger text-xs text-steel-400">
                        {new Date(member.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {isSelf ? (
                          <span className="text-xs text-steel-500 font-ledger">Locked</span>
                        ) : (
                          <div className="flex items-center justify-center gap-3">
                            <button
                              onClick={() => handleToggleStatus(member)}
                              className={`text-xs transition ${
                                member.status === "ACTIVE"
                                  ? "text-orange-400 hover:text-orange-300"
                                  : "text-green-400 hover:text-green-300"
                              }`}
                            >
                              {member.status === "ACTIVE" ? "Suspend" : "Activate"}
                            </button>
                            <span className="text-steel-600">|</span>
                            <button
                              onClick={() => handleDelete(member.id)}
                              className="text-xs text-red-400 hover:text-red-300 transition"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Register Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="desk-panel w-full max-w-md p-8 relative">
            <h3 className="font-display text-xl text-brass-300 mb-6 font-semibold border-b border-steel-600/20 pb-2">
              Register New Employee
            </h3>

            <form onSubmit={handleAddStaff} className="space-y-4">
              <div>
                <label className="label-eyebrow mb-2 block">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="control-input text-sm"
                />
              </div>

              <div>
                <label className="label-eyebrow mb-2 block">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. cashier@stationeryerp.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="control-input text-sm"
                />
              </div>

              <div>
                <label className="label-eyebrow mb-2 block">Initial Password *</label>
                <input
                  type="password"
                  required
                  placeholder="At least 8 chars, 1 capital, 1 number"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="control-input text-sm"
                />
              </div>

              <div>
                <label className="label-eyebrow mb-2 block">Assign Clearance Role *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="control-input text-sm bg-charcoal-900 cursor-pointer"
                >
                  <option value="CASHIER">Cashier</option>
                  <option value="INVENTORY_MANAGER">Inventory Manager</option>
                  <option value="ADMIN">Shop Owner</option>
                </select>
              </div>

              <div>
                <label className="label-eyebrow mb-2 block">Phone Number</label>
                <input
                  type="tel"
                  placeholder="e.g. +91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="control-input text-sm font-ledger"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-steel-600/20">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-ghost text-sm py-2 px-4"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-brass text-sm py-2 px-6"
                >
                  {isSubmitting ? "Creating..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
