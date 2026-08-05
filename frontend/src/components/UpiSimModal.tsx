"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";

interface UpiSimModalProps {
  amount: number;
  onSuccess: (utrRef?: string) => void;
  onClose: () => void;
}

export default function UpiSimModal({ amount, onSuccess, onClose }: UpiSimModalProps) {
  const envVpa = process.env.NEXT_PUBLIC_STORE_UPI_VPA || "smartstationery@ybl";
  const envStoreName = process.env.NEXT_PUBLIC_STORE_NAME || "Smart Stationery Store";

  const [mode, setMode] = useState<"real" | "demo">("real");
  const [upiVpa, setUpiVpa] = useState<string>(envVpa);
  const [storeName, setStoreName] = useState<string>(envStoreName);
  const [isEditingVpa, setIsEditingVpa] = useState<boolean>(false);
  const [utrNumber, setUtrNumber] = useState<string>("");
  const [status, setStatus] = useState<"scanning" | "processing" | "success">("scanning");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedVpa = localStorage.getItem("STORE_UPI_VPA");
      const savedName = localStorage.getItem("STORE_NAME");
      if (savedVpa) setUpiVpa(savedVpa);
      if (savedName) setStoreName(savedName);
    }
  }, []);

  // Build a real standard UPI deep-link URL (NPCI format)
  // Works with Google Pay, PhonePe, Paytm, BHIM, Cred, Amazon Pay, etc.
  const upiLink = `upi://pay?pa=${encodeURIComponent(upiVpa.trim())}&pn=${encodeURIComponent(storeName.trim())}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent("POS Store Bill")}`;

  // Handle Demo Mode auto-timer
  useEffect(() => {
    if (mode !== "demo") return;

    setStatus("scanning");
    const t1 = setTimeout(() => setStatus("processing"), 1800);
    const t2 = setTimeout(() => setStatus("success"), 3200);
    const t3 = setTimeout(() => onSuccess(utrNumber || "DEMO-UPI-123456"), 4500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [mode, onSuccess, utrNumber]);

  function handleConfirmRealPayment() {
    setStatus("success");
    setTimeout(() => {
      onSuccess(utrNumber.trim() || undefined);
    }, 1000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="desk-panel w-full max-w-md p-6 text-center space-y-5 shadow-brass-glow relative overflow-hidden my-auto">
        {/* Subtle brass highlight */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-brass-sheen" />

        <div className="flex justify-between items-start border-b border-steel-600/20 pb-3">
          <div className="text-left">
            <p className="label-eyebrow text-brass-300">UPI Payment Gateway</p>
            <h3 className="font-display text-lg font-semibold text-ivory mt-0.5">
              {mode === "real" ? "Real Store UPI QR" : "Demo UPI Simulator"}
            </h3>
          </div>

          {/* Mode Switcher */}
          <div className="flex bg-charcoal-900 border border-steel-600/30 rounded-control p-1 text-[11px] font-ledger">
            <button
              onClick={() => setMode("real")}
              className={`px-2.5 py-1 rounded transition-colors ${mode === "real"
                  ? "bg-brass-600/30 text-brass-300 font-semibold border border-brass-500/40"
                  : "text-steel-400 hover:text-ivory"
                }`}
            >
              Real QR
            </button>
            <button
              onClick={() => setMode("demo")}
              className={`px-2.5 py-1 rounded transition-colors ${mode === "demo"
                  ? "bg-amber-600/30 text-amber-300 font-semibold border border-amber-500/40"
                  : "text-steel-400 hover:text-ivory"
                }`}
            >
              Demo Mode
            </button>
          </div>
        </div>

        {/* Real UPI VPA Store Config */}
        <div className="bg-charcoal-900/80 border border-steel-600/20 p-3 rounded-control text-left space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-steel-400 font-ledger uppercase tracking-wider text-[10px]">
              Receiver UPI ID (VPA):
            </span>
            <button
              onClick={() => setIsEditingVpa(!isEditingVpa)}
              className="text-brass-400 hover:text-brass-300 underline text-[11px]"
            >
              {isEditingVpa ? "Save" : "Change VPA"}
            </button>
          </div>

          {isEditingVpa ? (
            <div className="space-y-1.5">
              <input
                type="text"
                value={upiVpa}
                onChange={(e) => setUpiVpa(e.target.value)}
                placeholder="e.g. 9876543210@paytm or shopname@icici"
                className="input-ledger w-full text-xs"
              />
              <p className="text-[10px] text-steel-400">
                💡 Enter your actual GPay / PhonePe / Paytm registered merchant UPI ID to receive money in your bank account.
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold text-brass-300 bg-charcoal-950 px-2 py-1 rounded border border-steel-600/30">
                {upiVpa}
              </span>
              <span className="text-[11px] text-steel-400 font-ledger">({storeName})</span>
            </div>
          )}
        </div>

        {/* Dynamic QR / Status display area */}
        <div className="mx-auto w-52 h-52 bg-white border-4 border-brass-600/40 rounded-panel relative flex items-center justify-center overflow-hidden shadow-inset-deep">
          {status === "scanning" && (
            <>
              {/* Real UPI QR Code with exact amount encoded */}
              <QRCodeSVG
                value={upiLink}
                size={176}
                bgColor="#ffffff"
                fgColor="#1a1a1a"
                level="M"
              />
              {/* Animated scanning laser line */}
              <motion.div
                initial={{ top: "5%" }}
                animate={{ top: "95%" }}
                transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                className="absolute left-2 right-2 h-[2px] bg-brass-400 shadow-[0_0_8px_#C9A227] z-10 opacity-80"
              />
            </>
          )}

          {status === "processing" && (
            <div className="flex flex-col items-center gap-3 bg-white w-full h-full justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
              <p className="font-ledger text-xs text-amber-700">Authorizing transaction...</p>
            </div>
          )}

          {status === "success" && (
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center gap-2 bg-white w-full h-full justify-center"
            >
              <div className="h-12 w-12 rounded-full bg-emerald-100 border border-emerald-500 flex items-center justify-center text-2xl text-emerald-600">
                ✓
              </div>
              <p className="font-ledger text-xs text-emerald-700 font-bold uppercase tracking-wider">
                Payment Verified
              </p>
            </motion.div>
          )}
        </div>

        <div className="bg-charcoal-900 border border-steel-600/10 p-3 rounded-control flex justify-between items-center">
          <span className="text-xs text-steel-400 uppercase font-ledger">Total Bill</span>
          <span className="text-xl font-bold text-brass-300 font-ledger">₹{amount.toFixed(2)}</span>
        </div>

        {/* Real Cashier verification & UTR input */}
        {mode === "real" && status === "scanning" && (
          <div className="space-y-3 text-left">
            <div>
              <label className="text-[11px] text-steel-300 font-ledger block mb-1">
                UPI Reference / UTR Number (Optional):
              </label>
              <input
                type="text"
                value={utrNumber}
                onChange={(e) => setUtrNumber(e.target.value)}
                placeholder="12-digit UTR No. (e.g. 423987123456)"
                className="input-ledger w-full text-xs font-mono"
              />
            </div>

            <button
              onClick={handleConfirmRealPayment}
              className="btn-brass w-full py-2.5 text-xs font-bold tracking-wide flex items-center justify-center gap-2"
            >
              <span>✓ Confirm Payment Received in Bank</span>
            </button>
          </div>
        )}

        <div className="text-xs text-steel-400 leading-relaxed font-body">
          {mode === "real" && (
            <span>
              Customer can scan this QR using <strong>Google Pay, PhonePe, Paytm, or BHIM</strong>. Once you confirm bank credit / soundbox alert, click confirm to print invoice.
            </span>
          )}
          {mode === "demo" && status === "scanning" && "Running 5-second mock transaction timer for demonstration..."}
          {status === "processing" && "Verifying account funds..."}
          {status === "success" && "Transaction recorded. Printing invoice receipt..."}
        </div>

        {status !== "success" && (
          <button onClick={onClose} className="btn-ghost w-full text-xs py-2">
            Cancel transaction
          </button>
        )}
      </div>
    </div>
  );
}

