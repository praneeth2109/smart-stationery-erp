"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import {
  accountingApi,
  AccountingSummary,
  Expense,
  ExpenseCategory,
  LedgerEntry,
  LedgerEntryType,
  Refund,
  SupplierPayment,
  SupplierPaymentMethod,
  ApiRequestError,
} from "@/lib/api";
import { api, PurchaseOrder, Supplier } from "@/lib/api";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "RENT",
  "SALARY",
  "UTILITIES",
  "SUPPLIES",
  "MARKETING",
  "OTHER",
];

const PAYMENT_METHODS: SupplierPaymentMethod[] = [
  "CASH",
  "UPI",
  "BANK_TRANSFER",
  "CHEQUE",
];

const LEDGER_TYPE_STYLES: Record<LedgerEntryType, { label: string; color: string }> = {
  INCOME: { label: "Sale", color: "text-emerald-400 bg-emerald-950/40 border-emerald-800/30" },
  EXPENSE: { label: "Expense", color: "text-red-400 bg-red-950/40 border-red-800/30" },
  SUPPLIER_PAYMENT: {
    label: "Supplier Pay",
    color: "text-orange-400 bg-orange-950/40 border-orange-800/30",
  },
  REFUND: { label: "Refund", color: "text-purple-400 bg-purple-950/40 border-purple-800/30" },
};

// ─── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "green" | "red" | "brass" | "blue";
}) {
  const accentMap = {
    green: "text-emerald-400",
    red: "text-red-400",
    brass: "text-brass-300",
    blue: "text-sky-400",
  };
  const color = accent ? accentMap[accent] : "text-ivory";

  return (
    <div className="desk-panel p-5 flex flex-col gap-1">
      <span className="label-eyebrow text-[9px]">{label}</span>
      <span className={`font-ledger text-xl font-bold ${color}`}>{value}</span>
      {sub && <span className="text-[10px] text-steel-400 font-ledger">{sub}</span>}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type Tab = "overview" | "expenses" | "payments" | "refunds";

export default function AccountingView() {
  const { accessToken, user } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [error, setError] = useState<string | null>(null);

  // Data
  const [summary, setSummary] = useState<AccountingSummary | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payments, setPayments] = useState<SupplierPayment[]>([]);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ledger filter
  const [ledgerFilter, setLedgerFilter] = useState<LedgerEntryType | "ALL">("ALL");

  const fetchAll = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    try {
      const [sum, led, exp, pay, ref, pos, sups] = await Promise.all([
        accountingApi.getSummary(accessToken),
        accountingApi.getLedger(accessToken),
        accountingApi.getExpenses(accessToken),
        accountingApi.getSupplierPayments(accessToken),
        accountingApi.getRefunds(accessToken),
        api.getPurchaseOrders(accessToken),
        api.getSuppliers(accessToken),
      ]);
      setSummary(sum);
      setLedger(led);
      setExpenses(exp);
      setPayments(pay);
      setRefunds(ref);
      setPurchaseOrders(pos);
      setSuppliers(sups);
    } catch {
      setError("Failed to load accounting data.");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const isAdmin = user?.role === "ADMIN";
  const canManage = user?.role === "ADMIN" || user?.role === "INVENTORY_MANAGER";

  // ─── Filtered ledger ────────────────────────────────────────────────────────
  const filteredLedger =
    ledgerFilter === "ALL" ? ledger : ledger.filter((e) => e.type === ledgerFilter);

  // ─── TAB: Overview ──────────────────────────────────────────────────────────
  const OverviewTab = () => (
    <div className="space-y-6">
      {/* P&L Summary Cards */}
      {summary ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            <SummaryCard
              label="Total Revenue"
              value={fmt(summary.totalRevenue)}
              sub={`${fmt(summary.totalDiscountsGiven)} discounted`}
              accent="green"
            />
            <SummaryCard
              label="Gross Profit"
              value={fmt(summary.grossProfit)}
              sub="Revenue − COGS − Refunds"
              accent={summary.grossProfit >= 0 ? "green" : "red"}
            />
            <SummaryCard
              label="Net Profit"
              value={fmt(summary.netProfit)}
              sub="Gross − Expenses"
              accent={summary.netProfit >= 0 ? "green" : "red"}
            />
            <SummaryCard
              label="GST Collected"
              value={fmt(summary.totalGstCollected)}
              accent="blue"
            />
            <SummaryCard
              label="Cost of Goods Sold"
              value={fmt(summary.totalCOGS)}
              accent="red"
            />
            <SummaryCard
              label="Business Expenses"
              value={fmt(summary.totalExpenses)}
              sub={`${expenses.length} entries`}
              accent="red"
            />
            <SummaryCard
              label="Supplier Payments"
              value={fmt(summary.totalSupplierPayments)}
              sub={`${payments.length} payments`}
              accent="brass"
            />
            <SummaryCard
              label="Refunds Issued"
              value={fmt(summary.totalRefunds)}
              sub={`${refunds.length} refunds`}
              accent="red"
            />
          </div>

          {/* Ledger filter + table */}
          <div className="desk-panel p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h3 className="font-display text-base font-semibold text-brass-300">
                Transaction Ledger
              </h3>
              <div className="flex gap-2 flex-wrap">
                {(["ALL", "INCOME", "EXPENSE", "SUPPLIER_PAYMENT", "REFUND"] as const).map(
                  (f) => (
                    <button
                      key={f}
                      onClick={() => setLedgerFilter(f)}
                      className={`px-2.5 py-1 text-[10px] rounded font-ledger font-semibold border transition ${
                        ledgerFilter === f
                          ? "bg-brass-600/20 text-brass-300 border-brass-600/40"
                          : "bg-charcoal-900 text-steel-400 border-steel-600/20 hover:text-parchment"
                      }`}
                    >
                      {f === "ALL" ? "All" : LEDGER_TYPE_STYLES[f].label}
                    </button>
                  )
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-ledger">
                <thead>
                  <tr className="border-b border-steel-600/15 text-steel-400 text-left">
                    <th className="pb-2 pr-3 font-normal">Date</th>
                    <th className="pb-2 pr-3 font-normal">Type</th>
                    <th className="pb-2 pr-3 font-normal flex-1">Description</th>
                    <th className="pb-2 pr-3 font-normal text-right text-red-400">Debit</th>
                    <th className="pb-2 font-normal text-right text-emerald-400">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLedger.slice(0, 50).map((entry) => {
                    const s = LEDGER_TYPE_STYLES[entry.type];
                    return (
                      <tr
                        key={entry.id}
                        className="border-b border-steel-600/8 hover:bg-charcoal-900/30 transition"
                      >
                        <td className="py-2 pr-3 text-steel-400 whitespace-nowrap">
                          {fmtDate(entry.date)}
                        </td>
                        <td className="py-2 pr-3">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] border font-semibold uppercase ${s.color}`}
                          >
                            {s.label}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-ivory max-w-[240px] truncate">
                          {entry.label}
                        </td>
                        <td className="py-2 pr-3 text-right text-red-400">
                          {entry.debit > 0 ? fmt(entry.debit) : "—"}
                        </td>
                        <td className="py-2 text-right text-emerald-400">
                          {entry.credit > 0 ? fmt(entry.credit) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredLedger.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-steel-500">
                        No ledger entries found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center text-steel-400 py-16 font-ledger text-xs">
          Loading financial data...
        </div>
      )}
    </div>
  );

  // ─── TAB: Expenses ──────────────────────────────────────────────────────────
  const ExpensesTab = () => {
    const [form, setForm] = useState({
      category: "OTHER" as ExpenseCategory,
      description: "",
      amount: "",
      date: new Date().toISOString().slice(0, 10),
    });

    useEffect(() => {
      if (editingExpense) {
        setForm({
          category: editingExpense.category,
          description: editingExpense.description,
          amount: String(editingExpense.amount),
          date: editingExpense.date.slice(0, 10),
        });
      }
    }, []);

    async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      if (!accessToken) return;
      setIsSubmitting(true);
      setError(null);
      try {
        const payload = {
          category: form.category,
          description: form.description,
          amount: parseFloat(form.amount),
          date: new Date(form.date).toISOString(),
        };
        if (editingExpense) {
          await accountingApi.updateExpense(accessToken, editingExpense.id, payload);
        } else {
          await accountingApi.createExpense(accessToken, payload);
        }
        setShowExpenseModal(false);
        setEditingExpense(null);
        fetchAll();
      } catch (err) {
        setError(err instanceof ApiRequestError ? err.message : "Failed to save expense.");
      } finally {
        setIsSubmitting(false);
      }
    }

    async function handleDelete(id: string) {
      if (!accessToken || !confirm("Delete this expense?")) return;
      try {
        await accountingApi.deleteExpense(accessToken, id);
        fetchAll();
      } catch {
        setError("Failed to delete expense.");
      }
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-semibold text-ivory">Business Expenses</h3>
          {canManage && (
            <button
              onClick={() => {
                setEditingExpense(null);
                setShowExpenseModal(true);
              }}
              className="btn-brass text-xs py-2 px-4"
            >
              + Log Expense
            </button>
          )}
        </div>

        <div className="desk-panel overflow-hidden">
          <table className="w-full text-xs font-ledger">
            <thead>
              <tr className="border-b border-steel-600/15 text-steel-400 text-left">
                <th className="p-3 font-normal">Date</th>
                <th className="p-3 font-normal">Category</th>
                <th className="p-3 font-normal">Description</th>
                <th className="p-3 font-normal">By</th>
                <th className="p-3 font-normal text-right text-red-400">Amount</th>
                {canManage && <th className="p-3 font-normal text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr
                  key={e.id}
                  className="border-b border-steel-600/8 hover:bg-charcoal-900/30 transition"
                >
                  <td className="p-3 text-steel-400">{fmtDate(e.date)}</td>
                  <td className="p-3">
                    <span className="px-1.5 py-0.5 rounded text-[9px] border font-semibold uppercase text-brass-400 bg-brass-950/20 border-brass-800/30">
                      {e.category}
                    </span>
                  </td>
                  <td className="p-3 text-ivory max-w-[220px] truncate">{e.description}</td>
                  <td className="p-3 text-steel-400">{e.user?.name ?? "—"}</td>
                  <td className="p-3 text-right text-red-400 font-bold">{fmt(e.amount)}</td>
                  {canManage && (
                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => {
                          setEditingExpense(e);
                          setShowExpenseModal(true);
                        }}
                        className="text-brass-400 hover:text-brass-300 text-[10px]"
                      >
                        Edit
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(e.id)}
                          className="text-red-400 hover:text-red-300 text-[10px]"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-steel-500">
                    No expenses logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Expense Modal */}
        <AnimatePresence>
          {showExpenseModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="desk-panel w-full max-w-md p-6 space-y-5"
              >
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-brass-sheen rounded-t" />
                <h3 className="font-display text-base font-semibold text-brass-300">
                  {editingExpense ? "Edit Expense" : "Log Business Expense"}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label-eyebrow text-[9px] mb-1.5 block">Category</label>
                      <select
                        value={form.category}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, category: e.target.value as ExpenseCategory }))
                        }
                        className="control-input text-xs py-1.5 w-full bg-charcoal-900"
                        required
                      >
                        {EXPENSE_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label-eyebrow text-[9px] mb-1.5 block">Date</label>
                      <input
                        type="date"
                        value={form.date}
                        onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                        className="control-input text-xs py-1.5 w-full font-ledger"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="label-eyebrow text-[9px] mb-1.5 block">Description</label>
                    <input
                      type="text"
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="e.g. Monthly shop rent"
                      className="control-input text-xs py-1.5 w-full"
                      required
                    />
                  </div>
                  <div>
                    <label className="label-eyebrow text-[9px] mb-1.5 block">Amount (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={form.amount}
                      onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                      placeholder="0.00"
                      className="control-input text-xs py-1.5 w-full font-ledger"
                      required
                    />
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowExpenseModal(false);
                        setEditingExpense(null);
                      }}
                      className="btn-ghost flex-1 text-xs py-2"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="btn-brass flex-1 text-xs py-2"
                    >
                      {isSubmitting ? "Saving..." : editingExpense ? "Update" : "Log Expense"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // ─── TAB: Supplier Payments ─────────────────────────────────────────────────
  const PaymentsTab = () => {
    const [form, setForm] = useState({
      purchaseOrderId: "",
      supplierId: "",
      amount: "",
      paymentMethod: "CASH" as SupplierPaymentMethod,
      reference: "",
      note: "",
      paidAt: new Date().toISOString().slice(0, 10),
    });

    const selectedPo = purchaseOrders.find((p) => p.id === form.purchaseOrderId);

    function handlePoChange(poId: string) {
      const po = purchaseOrders.find((p) => p.id === poId);
      setForm((f) => ({
        ...f,
        purchaseOrderId: poId,
        supplierId: po?.supplierId ?? "",
        amount: po ? String(po.totalAmount) : "",
      }));
    }

    async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      if (!accessToken) return;
      setIsSubmitting(true);
      setError(null);
      try {
        await accountingApi.createSupplierPayment(accessToken, {
          purchaseOrderId: form.purchaseOrderId,
          supplierId: form.supplierId,
          amount: parseFloat(form.amount),
          paymentMethod: form.paymentMethod,
          reference: form.reference || undefined,
          note: form.note || undefined,
          paidAt: new Date(form.paidAt).toISOString(),
        });
        setShowPaymentModal(false);
        fetchAll();
      } catch (err) {
        setError(
          err instanceof ApiRequestError ? err.message : "Failed to record supplier payment."
        );
      } finally {
        setIsSubmitting(false);
      }
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-semibold text-ivory">Supplier Payments</h3>
          {canManage && (
            <button
              onClick={() => setShowPaymentModal(true)}
              className="btn-brass text-xs py-2 px-4"
            >
              + Record Payment
            </button>
          )}
        </div>

        <div className="desk-panel overflow-hidden">
          <table className="w-full text-xs font-ledger">
            <thead>
              <tr className="border-b border-steel-600/15 text-steel-400 text-left">
                <th className="p-3 font-normal">Date</th>
                <th className="p-3 font-normal">PO Number</th>
                <th className="p-3 font-normal">Supplier</th>
                <th className="p-3 font-normal">Method</th>
                <th className="p-3 font-normal">Reference</th>
                <th className="p-3 font-normal">By</th>
                <th className="p-3 font-normal text-right text-orange-400">Amount</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-steel-600/8 hover:bg-charcoal-900/30 transition"
                >
                  <td className="p-3 text-steel-400">{fmtDate(p.paidAt)}</td>
                  <td className="p-3 text-brass-400 font-semibold">{p.purchaseOrder.poNumber}</td>
                  <td className="p-3 text-ivory">{p.supplier.name}</td>
                  <td className="p-3 text-steel-400">{p.paymentMethod.replace("_", " ")}</td>
                  <td className="p-3 text-steel-400 max-w-[120px] truncate">
                    {p.reference ?? "—"}
                  </td>
                  <td className="p-3 text-steel-400">{p.user?.name ?? "—"}</td>
                  <td className="p-3 text-right text-orange-400 font-bold">{fmt(p.amount)}</td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-steel-500">
                    No supplier payments recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Payment Modal */}
        <AnimatePresence>
          {showPaymentModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="desk-panel w-full max-w-md p-6 space-y-5"
              >
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-brass-sheen rounded-t" />
                <h3 className="font-display text-base font-semibold text-brass-300">
                  Record Supplier Payment
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="label-eyebrow text-[9px] mb-1.5 block">
                      Purchase Order
                    </label>
                    <select
                      value={form.purchaseOrderId}
                      onChange={(e) => handlePoChange(e.target.value)}
                      className="control-input text-xs py-1.5 w-full bg-charcoal-900"
                      required
                    >
                      <option value="">— Select a Purchase Order —</option>
                      {purchaseOrders.map((po) => (
                        <option key={po.id} value={po.id}>
                          {po.poNumber} — {po.supplier.name} (₹{po.totalAmount.toFixed(2)})
                        </option>
                      ))}
                    </select>
                    {selectedPo && (
                      <p className="text-[10px] text-steel-400 mt-1 font-ledger">
                        PO Total: {fmt(selectedPo.totalAmount)} · Status:{" "}
                        <span className="text-brass-400">{selectedPo.status}</span>
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label-eyebrow text-[9px] mb-1.5 block">Amount (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={form.amount}
                        onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                        placeholder="0.00"
                        className="control-input text-xs py-1.5 w-full font-ledger"
                        required
                      />
                    </div>
                    <div>
                      <label className="label-eyebrow text-[9px] mb-1.5 block">Date Paid</label>
                      <input
                        type="date"
                        value={form.paidAt}
                        onChange={(e) => setForm((f) => ({ ...f, paidAt: e.target.value }))}
                        className="control-input text-xs py-1.5 w-full font-ledger"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label-eyebrow text-[9px] mb-1.5 block">
                        Payment Method
                      </label>
                      <select
                        value={form.paymentMethod}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            paymentMethod: e.target.value as SupplierPaymentMethod,
                          }))
                        }
                        className="control-input text-xs py-1.5 w-full bg-charcoal-900"
                      >
                        {PAYMENT_METHODS.map((m) => (
                          <option key={m} value={m}>
                            {m.replace("_", " ")}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label-eyebrow text-[9px] mb-1.5 block">
                        Reference No.
                      </label>
                      <input
                        type="text"
                        value={form.reference}
                        onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
                        placeholder="Optional"
                        className="control-input text-xs py-1.5 w-full"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="label-eyebrow text-[9px] mb-1.5 block">Note</label>
                    <input
                      type="text"
                      value={form.note}
                      onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                      placeholder="Optional"
                      className="control-input text-xs py-1.5 w-full"
                    />
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowPaymentModal(false)}
                      className="btn-ghost flex-1 text-xs py-2"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="btn-brass flex-1 text-xs py-2"
                    >
                      {isSubmitting ? "Recording..." : "Record Payment"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // ─── TAB: Refunds ────────────────────────────────────────────────────────────
  const RefundsTab = () => {
    const [form, setForm] = useState({ transactionId: "", amount: "", reason: "" });

    async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      if (!accessToken) return;
      setIsSubmitting(true);
      setError(null);
      try {
        await accountingApi.createRefund(accessToken, {
          transactionId: form.transactionId,
          amount: parseFloat(form.amount),
          reason: form.reason,
        });
        setShowRefundModal(false);
        fetchAll();
      } catch (err) {
        setError(err instanceof ApiRequestError ? err.message : "Failed to process refund.");
      } finally {
        setIsSubmitting(false);
      }
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-semibold text-ivory">Customer Refunds</h3>
          {isAdmin && (
            <button
              onClick={() => setShowRefundModal(true)}
              className="btn-brass text-xs py-2 px-4"
            >
              + Process Refund
            </button>
          )}
        </div>

        <div className="desk-panel overflow-hidden">
          <table className="w-full text-xs font-ledger">
            <thead>
              <tr className="border-b border-steel-600/15 text-steel-400 text-left">
                <th className="p-3 font-normal">Date</th>
                <th className="p-3 font-normal">Invoice</th>
                <th className="p-3 font-normal">Reason</th>
                <th className="p-3 font-normal">Processed By</th>
                <th className="p-3 font-normal text-right text-purple-400">Amount</th>
              </tr>
            </thead>
            <tbody>
              {refunds.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-steel-600/8 hover:bg-charcoal-900/30 transition"
                >
                  <td className="p-3 text-steel-400">{fmtDate(r.createdAt)}</td>
                  <td className="p-3 text-brass-400 font-semibold">
                    {r.transaction.invoiceNumber}
                  </td>
                  <td className="p-3 text-ivory max-w-[220px] truncate">{r.reason}</td>
                  <td className="p-3 text-steel-400">{r.processedBy?.name ?? "—"}</td>
                  <td className="p-3 text-right text-purple-400 font-bold">{fmt(r.amount)}</td>
                </tr>
              ))}
              {refunds.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-steel-500">
                    No refunds processed yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Refund Modal */}
        <AnimatePresence>
          {showRefundModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="desk-panel w-full max-w-md p-6 space-y-5"
              >
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-brass-sheen rounded-t" />
                <h3 className="font-display text-base font-semibold text-brass-300">
                  Process Customer Refund
                </h3>
                <p className="text-[10px] text-steel-400 font-ledger">
                  Enter the Transaction ID from the original sale invoice.
                </p>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="label-eyebrow text-[9px] mb-1.5 block">
                      Transaction ID
                    </label>
                    <input
                      type="text"
                      value={form.transactionId}
                      onChange={(e) => setForm((f) => ({ ...f, transactionId: e.target.value }))}
                      placeholder="Paste Transaction ID (from receipt)"
                      className="control-input text-xs py-1.5 w-full font-ledger"
                      required
                    />
                  </div>
                  <div>
                    <label className="label-eyebrow text-[9px] mb-1.5 block">
                      Refund Amount (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={form.amount}
                      onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                      placeholder="0.00"
                      className="control-input text-xs py-1.5 w-full font-ledger"
                      required
                    />
                  </div>
                  <div>
                    <label className="label-eyebrow text-[9px] mb-1.5 block">Reason</label>
                    <input
                      type="text"
                      value={form.reason}
                      onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                      placeholder="e.g. Damaged product, customer complaint"
                      className="control-input text-xs py-1.5 w-full"
                      required
                    />
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowRefundModal(false)}
                      className="btn-ghost flex-1 text-xs py-2"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="btn-brass flex-1 text-xs py-2"
                    >
                      {isSubmitting ? "Processing..." : "Process Refund"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  const TABS: { id: Tab; label: string }[] = [
    { id: "overview", label: "P&L Overview" },
    { id: "expenses", label: "Expenses" },
    { id: "payments", label: "Supplier Payments" },
    { id: "refunds", label: "Refunds" },
  ];

  return (
    <div className="space-y-6">
      <header>
        <p className="label-eyebrow mb-1">Financial Records</p>
        <h1 className="font-display text-3xl font-semibold text-ivory">Accounting Ledger</h1>
      </header>

      {error && (
        <div className="rounded-control border border-red-950/40 bg-red-950/20 px-4 py-3 text-sm text-red-300">
          {error}
          <button onClick={() => setError(null)} className="ml-3 text-red-400 hover:text-red-200">
            ×
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-steel-600/15 pb-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition -mb-px ${
              activeTab === tab.id
                ? "border-brass-500 text-brass-300"
                : "border-transparent text-steel-400 hover:text-parchment"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {isLoading ? (
        <div className="py-20 text-center text-steel-400 font-ledger text-xs">
          Loading accounting records...
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === "overview" && <OverviewTab />}
            {activeTab === "expenses" && <ExpensesTab />}
            {activeTab === "payments" && <PaymentsTab />}
            {activeTab === "refunds" && <RefundsTab />}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
