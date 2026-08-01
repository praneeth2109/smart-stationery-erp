"use client";

import { Invoice } from "@/lib/api";

interface ReceiptModalProps {
  invoice: Invoice;
  onClose: () => void;
}

export default function ReceiptModal({ invoice, onClose }: ReceiptModalProps) {
  function handlePrint() {
    window.print();
  }

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
            width: 100%;
            margin: 0;
            padding: 0;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="desk-panel w-full max-w-md p-6 relative max-h-[90vh] overflow-y-auto flex flex-col justify-between no-print">
        {/* Receipt Paper slip */}
        <div
          id="print-receipt-slip"
          className="bg-[#faf6eb] text-charcoal-950 p-6 rounded shadow-lg font-mono text-xs border border-brass-700/20 relative"
        >
          {/* Jagged thermal paper top border simulation */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-[repeating-linear-gradient(90deg,transparent,transparent_4px,#e4c766_4px,#e4c766_8px)] opacity-30" />

          {/* Store info */}
          <div className="text-center space-y-1 mb-6">
            <h2 className="font-display text-base font-bold tracking-wider text-charcoal-900">
              SMART STATIONERY STORE
            </h2>
            <p className="text-[10px] text-steel-500 uppercase tracking-widest">
              Business Desk Invoice
            </p>
            <div className="h-[1px] border-b border-dashed border-charcoal-950/20 my-2" />
            <div className="flex justify-between text-[10px] text-steel-600">
              <span>INV NO: {invoice.invoiceNumber}</span>
              <span>{new Date(invoice.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between text-[10px] text-steel-600">
              <span>CASHIER: {invoice.cashier?.name || "Store staff"}</span>
              <span>{new Date(invoice.createdAt).toLocaleTimeString()}</span>
            </div>
          </div>

          {/* Customer info (if provided) */}
          {(invoice.customerName || invoice.customerPhone) && (
            <div className="mb-4 pb-2 border-b border-dashed border-charcoal-950/20 text-[10px] text-steel-600">
              {invoice.customerName && <div>CUSTOMER: {invoice.customerName}</div>}
              {invoice.customerPhone && <div>PHONE: {invoice.customerPhone}</div>}
            </div>
          )}

          {/* Cart items */}
          <div className="space-y-3 mb-6">
            <div className="grid grid-cols-12 font-bold border-b border-charcoal-950/20 pb-1 text-[10px]">
              <span className="col-span-6">Description</span>
              <span className="col-span-2 text-right">Qty</span>
              <span className="col-span-4 text-right">Total</span>
            </div>

            {invoice.items.map((item) => (
              <div key={item.id} className="grid grid-cols-12 text-[10px] items-start">
                <div className="col-span-6">
                  <div className="font-bold text-charcoal-900">{item.product.name}</div>
                  <div className="text-[8px] text-steel-500">{item.product.sku} (GST {item.gstRate}%)</div>
                </div>
                <span className="col-span-2 text-right">{item.quantity}</span>
                <span className="col-span-4 text-right font-bold">₹{item.total.toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Calculation breakups */}
          <div className="space-y-1.5 border-t border-dashed border-charcoal-950/20 pt-4 text-[10px]">
            <div className="flex justify-between text-steel-600">
              <span>Subtotal (Excl. Tax)</span>
              <span>₹{invoice.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-steel-600">
              <span>SGST / CGST Tax Component</span>
              <span>₹{invoice.gstAmount.toFixed(2)}</span>
            </div>
            {invoice.discount > 0 && (
              <div className="flex justify-between text-red-600 font-bold">
                <span>Applied Discount (-)</span>
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
          <div className="mt-6 text-center space-y-2 border-t border-dashed border-charcoal-950/20 pt-4 text-[10px]">
            <div className="font-bold text-charcoal-900">
              PAID VIA {invoice.paymentMethod} • STATUS: {invoice.paymentStatus}
            </div>
            <div className="text-[8px] text-steel-500 italic">
              Thank you for shopping at Smart Stationery Store!
            </div>
          </div>
        </div>

        {/* Print & Action Buttons */}
        <div className="flex items-center justify-between gap-3 pt-6 mt-4 border-t border-steel-600/10 no-print">
          <button onClick={onClose} className="btn-ghost text-xs py-2 px-4 flex-1">
            Close invoice
          </button>
          <button onClick={handlePrint} className="btn-brass text-xs py-2 px-4 flex-1">
            🖨️ Print Ticket
          </button>
        </div>
      </div>
    </div>
  );
}
