"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";

interface UpiSimModalProps {
  amount: number;
  onSuccess: () => void;
  onClose: () => void;
}

// TODO: Replace with the store's actual UPI VPA (e.g. "smartstore@hdfc")
const STORE_UPI_VPA = "smartstationery@upi";
const STORE_NAME = "Smart Stationery";

export default function UpiSimModal({ amount, onSuccess, onClose }: UpiSimModalProps) {
  const [status, setStatus] = useState<"scanning" | "processing" | "success">("scanning");

  // Build a real UPI deep-link so any UPI app can scan and pre-fill the exact amount
  const upiLink = `upi://pay?pa=${encodeURIComponent(STORE_UPI_VPA)}&pn=${encodeURIComponent(STORE_NAME)}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent("POS Payment")}`;

  useEffect(() => {
    // 1.8s scanning -> processing -> 1.4s later success -> 1.3s later callback
    const t1 = setTimeout(() => setStatus("processing"), 1800);
    const t2 = setTimeout(() => setStatus("success"), 3200);
    const t3 = setTimeout(() => onSuccess(), 4500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onSuccess]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="desk-panel w-full max-w-sm p-8 text-center space-y-6 shadow-brass-glow relative overflow-hidden">
        {/* Subtle brass highlight */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-brass-sheen" />

        <div>
          <p className="label-eyebrow text-brass-300">UPI Payment Simulator</p>
          <h3 className="font-display text-lg font-semibold text-ivory mt-1">Scan QR Code</h3>
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
                Paid Successfully
              </p>
            </motion.div>
          )}
        </div>

        <div className="bg-charcoal-900 border border-steel-600/10 p-3 rounded-control">
          <span className="text-[10px] text-steel-400 uppercase font-ledger block">Amount Payable</span>
          <span className="text-xl font-bold text-brass-300 font-ledger">₹{amount.toFixed(2)}</span>
        </div>

        <div className="text-xs text-steel-400 leading-relaxed font-body">
          {status === "scanning" && "Point consumer UPI app scanner to verify transaction."}
          {status === "processing" && "Verifying consumer account funds..."}
          {status === "success" && "Simulation verified. Recording invoice record."}
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
