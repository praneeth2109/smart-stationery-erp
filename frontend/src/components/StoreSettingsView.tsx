"use client";

import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";

export default function StoreSettingsView() {
  const [storeName, setStoreName] = useState("Smart Stationery Store");
  const [gstin, setGstin] = useState("22AAAAA0000A1Z5");
  const [upiVpa, setUpiVpa] = useState("smartstationery@ybl");
  const [bankName, setBankName] = useState("HDFC Bank");
  const [accountNumber, setAccountNumber] = useState("50100234567890");
  const [ifscCode, setIfscCode] = useState("HDFC0001234");
  const [phone, setPhone] = useState("+91 98765 43210");
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Load from localStorage or process.env on mount
  useEffect(() => {
    const cachedVpa = localStorage.getItem("STORE_UPI_VPA");
    const cachedName = localStorage.getItem("STORE_NAME");
    const cachedGstin = localStorage.getItem("STORE_GSTIN");
    const cachedBank = localStorage.getItem("STORE_BANK_NAME");
    const cachedAcc = localStorage.getItem("STORE_ACC_NO");
    const cachedIfsc = localStorage.getItem("STORE_IFSC");
    const cachedPhone = localStorage.getItem("STORE_PHONE");

    if (cachedVpa) setUpiVpa(cachedVpa);
    else if (process.env.NEXT_PUBLIC_STORE_UPI_VPA) setUpiVpa(process.env.NEXT_PUBLIC_STORE_UPI_VPA);

    if (cachedName) setStoreName(cachedName);
    else if (process.env.NEXT_PUBLIC_STORE_NAME) setStoreName(process.env.NEXT_PUBLIC_STORE_NAME);

    if (cachedGstin) setGstin(cachedGstin);
    if (cachedBank) setBankName(cachedBank);
    if (cachedAcc) setAccountNumber(cachedAcc);
    if (cachedIfsc) setIfscCode(cachedIfsc);
    if (cachedPhone) setPhone(cachedPhone);
  }, []);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    localStorage.setItem("STORE_UPI_VPA", upiVpa.trim());
    localStorage.setItem("STORE_NAME", storeName.trim());
    localStorage.setItem("STORE_GSTIN", gstin.trim());
    localStorage.setItem("STORE_BANK_NAME", bankName.trim());
    localStorage.setItem("STORE_ACC_NO", accountNumber.trim());
    localStorage.setItem("STORE_IFSC", ifscCode.trim());
    localStorage.setItem("STORE_PHONE", phone.trim());

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  }

  // Build live preview UPI link
  const sampleAmount = 100.0;
  const sampleUpiLink = `upi://pay?pa=${encodeURIComponent(upiVpa.trim())}&pn=${encodeURIComponent(storeName.trim())}&am=${sampleAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent("Store POS Setup")}`;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="border-b border-steel-600/20 pb-4">
        <p className="label-eyebrow text-brass-300">Store Configuration & Banking</p>
        <h1 className="font-display text-2xl font-bold text-ivory mt-1">
          Store & Bank Account Settings
        </h1>
        <p className="text-xs text-steel-400 font-body mt-1">
          Connect your business bank account & UPI VPA to receive payments directly into your bank.
        </p>
      </div>

      {savedSuccess && (
        <div className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 p-3 rounded-control text-xs flex items-center gap-2">
          <span>✓</span>
          <span>Store bank settings saved successfully! POS checkout will now use your new bank UPI ID.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Form */}
        <form onSubmit={handleSave} className="lg:col-span-2 desk-panel p-6 space-y-5 shadow-brass-glow">
          <h2 className="font-ledger text-sm text-brass-300 uppercase tracking-wider border-b border-steel-600/20 pb-2">
            🏛️ Merchant Bank & UPI Details
          </h2>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-ledger text-steel-300 block mb-1">Store / Business Name *</label>
                <input
                  type="text"
                  required
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="e.g. RR Stationery Store"
                  className="input-ledger w-full text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-ledger text-steel-300 block mb-1">GSTIN Number</label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  placeholder="e.g. 22AAAAA0000A1Z5"
                  className="input-ledger w-full text-xs font-mono uppercase"
                />
              </div>
            </div>

            <div className="bg-charcoal-900 border border-brass-600/30 p-4 rounded-control space-y-2">
              <label className="text-xs font-ledger text-brass-300 block font-semibold">
                ⚡ Primary Merchant UPI ID (VPA) *
              </label>
              <input
                type="text"
                required
                value={upiVpa}
                onChange={(e) => setUpiVpa(e.target.value)}
                placeholder="e.g. 9876543210@paytm or shopname@icici"
                className="input-ledger w-full text-xs font-mono text-brass-200 border-brass-500/40"
              />
              <p className="text-[11px] text-steel-400 leading-relaxed font-body">
                💡 <strong>Important:</strong> Enter your registered Google Pay, PhonePe, Paytm, or bank UPI ID. Every POS QR code generated will transfer customer funds directly into this bank account with 0% fee.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-ledger text-steel-300 block mb-1">Bank Name</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. HDFC Bank"
                  className="input-ledger w-full text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-ledger text-steel-300 block mb-1">Account Number</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="e.g. 50100234567890"
                  className="input-ledger w-full text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-ledger text-steel-300 block mb-1">IFSC Code</label>
                <input
                  type="text"
                  value={ifscCode}
                  onChange={(e) => setIfscCode(e.target.value)}
                  placeholder="e.g. HDFC0001234"
                  className="input-ledger w-full text-xs font-mono uppercase"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-ledger text-steel-300 block mb-1">Store Support Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                className="input-ledger w-full text-xs"
              />
            </div>
          </div>

          <div className="pt-2">
            <button type="submit" className="btn-brass px-6 py-2.5 text-xs font-bold tracking-wide">
              💾 Save Bank & Store Settings
            </button>
          </div>
        </form>

        {/* Live Preview Card */}
        <div className="desk-panel p-6 space-y-4 text-center shadow-brass-glow flex flex-col items-center justify-center">
          <h3 className="font-ledger text-xs uppercase tracking-wider text-brass-400">
            Live QR Preview
          </h3>
          <p className="text-[11px] text-steel-400 font-body">
            This is what customers will see when paying at counter:
          </p>

          <div className="p-3 bg-white rounded-panel border-2 border-brass-600/40 shadow-inset-deep">
            <QRCodeSVG value={sampleUpiLink} size={160} bgColor="#ffffff" fgColor="#1a1a1a" level="M" />
          </div>

          <div className="space-y-1 text-left w-full bg-charcoal-900 border border-steel-600/20 p-3 rounded-control text-xs font-mono">
            <div className="text-steel-400 text-[10px] uppercase font-ledger">Linked Receiver:</div>
            <div className="text-brass-300 font-bold truncate">{upiVpa || "Not configured"}</div>
            <div className="text-steel-400 text-[11px] font-ledger truncate">{storeName}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
