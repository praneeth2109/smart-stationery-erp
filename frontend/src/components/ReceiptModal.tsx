"use client";

import { useState } from "react";
import { Invoice } from "@/lib/api";

interface ReceiptModalProps {
  invoice: Invoice;
  onClose: () => void;
}

export default function ReceiptModal({ invoice, onClose }: ReceiptModalProps) {
  const [paperSize, setPaperSize] = useState<"58mm" | "80mm" | "A4">("80mm");

  function handlePrint() {
    window.print();
  }

  const paperWidthClass =
    paperSize === "58mm" ? "max-w-[280px]" : paperSize === "80mm" ? "max-w-md" : "max-w-2xl";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto no-print">
      {/* Print-specific layout styling injection */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-receipt-slip,
          #print-receipt-slip * {
            visibility: visible;
          }
          #print-receipt-slip {
            position: absolute;
            left: 0;
            top: 0;
            width: ${paperSize === "58mm" ? "58mm" : paperSize === "80mm" ? "80mm" : "100%"};
            margin: 0 auto;
            padding: 4mm;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className={`desk-panel w-full ${paperWidthClass} p-6 relative max-h-[90vh] overflow-y-auto flex flex-col justify-between no-print transition-all duration-200`}>
        {/* Paper format selector bar */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-steel-600/20 no-print">
          <span className="text-xs font-medium text-steel-400">Thermal Size:</span>
          <div className="flex gap-1 bg-charcoal-900 p-1 rounded-lg border border-steel-600/20">
            {(["58mm", "80mm", "A4"] as const).map((size) => (
              <button
                key={size}
                onClick={() => setPaperSize(size)}
                className={`px-2.5 py-1 text-[11px] rounded font-mono transition-colors ${
                  paperSize === size
                    ? "bg-brass-500 text-charcoal-950 font-bold"
                    : "text-steel-400 hover:text-steel-200"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* Receipt Paper slip */}
        <div
          id="print-receipt-slip"
          className="bg-[#faf6eb] text-charcoal-950 p-5 rounded shadow-lg font-mono text-xs border border-brass-700/20 relative"
        >
          {/* Jagged thermal paper top border simulation */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-[repeating-linear-gradient(90deg,transparent,transparent_4px,#e4c766_4px,#e4c766_8px)] opacity-30" />

          {/* Store info */}
          <div className="text-center space-y-1 mb-5">
            <h2 className="font-display text-base font-bold tracking-wider text-charcoal-900">
              SMART STATIONERY STORE
            </h2>
            <p className="text-[10px] text-steel-600">Main Road, Commercial Hub</p>
            <p className="text-[10px] text-steel-600">GSTIN: 33AAACR1234F1Z1 | Ph: +91 98765 43210</p>
            <div className="h-[1px] border-b border-dashed border-charcoal-950/20 my-2" />
            <div className="flex justify-between text-[10px] text-steel-700 font-bold">
              <span>TAX INVOICE #{invoice.invoiceNumber}</span>
              <span>{new Date(invoice.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between text-[10px] text-steel-600">
              <span>CASHIER: {invoice.cashier?.name || "Store staff"}</span>
              <span>{new Date(invoice.createdAt).toLocaleTimeString()}</span>
            </div>
          </div>

          {/* Customer info (if provided) */}
          {(invoice.customerName || invoice.customerPhone) && (
            <div className="mb-4 pb-2 border-b border-dashed border-charcoal-950/20 text-[10px] text-steel-700">
              {invoice.customerName && <div>CUSTOMER: {invoice.customerName}</div>}
              {invoice.customerPhone && <div>PHONE: {invoice.customerPhone}</div>}
            </div>
          )}

          {/* Cart items */}
          <div className="space-y-2.5 mb-5">
            <div className="grid grid-cols-12 font-bold border-b border-charcoal-950/20 pb-1 text-[10px]">
              <span className="col-span-6">Item</span>
              <span className="col-span-2 text-right">Qty</span>
              <span className="col-span-4 text-right">Total</span>
            </div>

            {invoice.items.map((item) => (
              <div key={item.id} className="grid grid-cols-12 text-[10px] items-start">
                <div className="col-span-6">
                  <div className="font-bold text-charcoal-900 leading-tight">{item.product.name}</div>
                  <div className="text-[8px] text-steel-500">GST {item.gstRate}%</div>
                </div>
                <span className="col-span-2 text-right">{item.quantity}</span>
                <span className="col-span-4 text-right font-bold">₹{item.total.toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Calculation breakups */}
          <div className="space-y-1.5 border-t border-dashed border-charcoal-950/20 pt-3 text-[10px]">
            <div className="flex justify-between text-steel-600">
              <span>Subtotal</span>
              <span>₹{invoice.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-steel-600">
              <span>GST Component</span>
              <span>₹{invoice.gstAmount.toFixed(2)}</span>
            </div>
            {invoice.discount > 0 && (
              <div className="flex justify-between text-red-600 font-bold">
                <span>Discount (-)</span>
                <span>₹{invoice.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="h-[1px] border-b border-dashed border-charcoal-950/30 my-2" />
            <div className="flex justify-between text-sm font-bold text-charcoal-950">
              <span>GRAND TOTAL</span>
              <span>₹{invoice.grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment receipt confirmation */}
          <div className="mt-5 text-center space-y-1 border-t border-dashed border-charcoal-950/20 pt-3 text-[10px]">
            <div className="font-bold text-charcoal-900">
              PAYMENT: {invoice.paymentMethod} • STATUS: {invoice.paymentStatus}
            </div>
            <div className="text-[8px] text-steel-500 italic mt-1">
              Thank you for shopping with us! Please come again.
            </div>
          </div>
        </div>

        {/* Print & Action Buttons */}
        <div className="flex items-center justify-between gap-3 pt-4 mt-3 border-t border-steel-600/10 no-print">
          <button onClick={onClose} className="btn-ghost text-xs py-2 px-4 flex-1">
            Close
          </button>
          <button onClick={handlePrint} className="btn-brass text-xs py-2 px-4 flex-1 flex items-center justify-center gap-1.5">
            <span>🖨️</span> Print Thermal Receipt
          </button>
        </div>
      </div>
    </div>
  );
}
