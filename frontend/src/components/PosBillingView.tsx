"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { api, Category, Invoice, Product } from "@/lib/api";
import UpiSimModal from "./UpiSimModal";
import ReceiptModal from "./ReceiptModal";
import { speakPaymentAlert } from "@/lib/soundbox";

interface CartItem {
  product: Product;
  quantity: number;
}

export default function PosBillingView() {
  const { accessToken, user } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [discount, setDiscount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "UPI">("CASH");

  // Barcode Scanning simulator
  const [scanInput, setScanInput] = useState("");
  const scanInputRef = useRef<HTMLInputElement>(null);

  // Filters for left catalog panel
  const [search, setSearch] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  // Modals state
  const [upiSimAmount, setUpiSimAmount] = useState<number | null>(null);
  const [receiptInvoice, setReceiptInvoice] = useState<Invoice | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Smart Substitutes state
  const [outOfStockTarget, setOutOfStockTarget] = useState<Product | null>(null);
  const [substitutes, setSubstitutes] = useState<Product[]>([]);
  const [isSubstitutesLoading, setIsSubstitutesLoading] = useState(false);

  async function fetchProductsAndCategories() {
    if (!accessToken) return;
    setIsLoading(true);
    try {
      const prods = await api.getProducts(accessToken);
      const cats = await api.getCategories(accessToken);
      const productList = Array.isArray(prods) ? prods : prods?.data ?? [];
      setProducts(productList);
      setCategories(cats);
    } catch {
      setError("Failed to initialize billing catalog.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchProductsAndCategories();
  }, [accessToken]);

  // Focus scanner input on load
  useEffect(() => {
    scanInputRef.current?.focus();
  }, [isLoading]);

  async function fetchSubstitutes(product: Product) {
    if (!accessToken) return;
    setOutOfStockTarget(product);
    setIsSubstitutesLoading(true);
    try {
      const res = await api.getProductSubstitutes(accessToken, product.id);
      setSubstitutes(res.substitutes);
    } catch {
      setSubstitutes([]);
    } finally {
      setIsSubstitutesLoading(false);
    }
  }

  // Handle barcode/SKU scanner Enter event
  function handleScannerSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!scanInput.trim()) return;

    setError(null);
    const code = scanInput.trim().toUpperCase();

    // Match by barcode or SKU
    const match = products.find(
      (p) => p.sku.toUpperCase() === code || p.barcode === code
    );

    if (match) {
      if (match.stock <= 0) {
        fetchSubstitutes(match);
        setError(`Product "${match.name}" is OUT OF STOCK. Smart substitutes suggested below!`);
      } else {
        addToCart(match);
        setScanInput("");
      }
    } else {
      setError(`No product matches barcode/SKU code "${code}"`);
    }
  }

  function addToCart(product: Product) {
    if (product.stock <= 0) {
      setError(`Product "${product.name}" is OUT OF STOCK. Smart substitutes suggested below!`);
      fetchSubstitutes(product);
      return;
    }

    setOutOfStockTarget(null);

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          setError(`Cannot add more. Only ${product.stock} items available in stock.`);
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });

    // Refocus scanner input
    scanInputRef.current?.focus();
  }

  function updateQuantity(productId: string, delta: number) {
    setError(null);
    setCart((prev) => {
      const item = prev.find((i) => i.product.id === productId);
      if (!item) return prev;

      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        return prev.filter((i) => i.product.id !== productId);
      }

      if (newQty > item.product.stock) {
        setError(`Cannot add more. Max stock available: ${item.product.stock}`);
        return prev;
      }

      return prev.map((i) =>
        i.product.id === productId ? { ...i, quantity: newQty } : i
      );
    });
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  }

  // Calculate inclusive totals & GST tax breakdown
  const grossInclusiveTotal = cart.reduce(
    (sum, item) => sum + item.product.sellingPrice * item.quantity,
    0
  );

  const flatDiscountValue = parseFloat(discount) || 0;
  const effectiveDiscount = Math.min(flatDiscountValue, grossInclusiveTotal);

  let subtotal = 0;
  let totalGst = 0;

  cart.forEach((item) => {
    const grossLine = item.product.sellingPrice * item.quantity;
    const lineDiscount =
      grossInclusiveTotal > 0
        ? (grossLine / grossInclusiveTotal) * effectiveDiscount
        : 0;
    const discountedLine = grossLine - lineDiscount;

    const lineTaxable = discountedLine / (1 + item.product.gst / 100);
    const lineGst = discountedLine - lineTaxable;

    subtotal += lineTaxable;
    totalGst += lineGst;
  });

  const grandTotal = Math.max(0, grossInclusiveTotal - effectiveDiscount);

  async function handleCheckoutTrigger() {
    if (cart.length === 0) return;
    setError(null);

    if (paymentMethod === "UPI") {
      setUpiSimAmount(grandTotal);
    } else {
      await processCheckout();
    }
  }

  async function processCheckout() {
    if (!accessToken) return;
    setIsSubmitting(true);
    try {
      const payload = {
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        discount: flatDiscountValue,
        paymentMethod,
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
      };

      const invoice = await api.checkout(accessToken, payload);

      // Trigger Paytm/PhonePe style audio voice speaker alert
      speakPaymentAlert(grandTotal, customerName.trim() || undefined, paymentMethod);

      // Open receipt invoice modal
      setReceiptInvoice(invoice);

      // Reset checkout cart
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setDiscount("");
      setUpiSimAmount(null);

      // Refresh product list stock
      fetchProductsAndCategories();
    } catch (err: any) {
      setError(err.message || "Failed to process transaction.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Filter catalog products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode && p.barcode.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory = selectedCategoryId
      ? p.categoryId === selectedCategoryId
      : true;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-brass-700/20 pb-6">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-parchment flex items-center gap-3">
            <span>🛒</span> Executive POS Checkout & Billing
          </h1>
          <p className="text-xs text-steel-400 font-ledger mt-1">
            Barcode scanning, cart GST tax calculation, instant receipting, and ⚡ Smart In-Stock Substitute suggestions
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-brass-400 bg-charcoal-900 px-3 py-1.5 rounded-control border border-brass-700/30">
            Cashier: {user?.name}
          </span>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-control bg-red-950/60 border border-red-800/40 text-red-300 text-xs flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="hover:text-parchment">
            ✕
          </button>
        </div>
      )}

      {/* ⚡ Smart In-Stock Substitute Suggestions Card */}
      {outOfStockTarget && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-leather p-5 border-2 border-amber-500/60 bg-charcoal-900/95 space-y-3 shadow-brass-glow"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl animate-bounce">⚡</span>
              <div>
                <h3 className="text-sm font-bold text-amber-300">
                  "{outOfStockTarget.name}" is OUT OF STOCK (0 Available)
                </h3>
                <p className="text-xs text-steel-400 font-ledger">
                  Recommended In-Stock Substitutes in {outOfStockTarget.category?.name ?? "Same Category"}:
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setOutOfStockTarget(null);
                setSubstitutes([]);
              }}
              className="text-xs text-steel-400 hover:text-parchment"
            >
              ✕ Dismiss
            </button>
          </div>

          {isSubstitutesLoading ? (
            <p className="text-xs text-steel-400 animate-pulse font-ledger">Searching for in-stock alternatives...</p>
          ) : substitutes.length === 0 ? (
            <p className="text-xs text-steel-400 font-ledger">No in-stock substitute items currently found in this category.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {substitutes.map((sub) => (
                <div
                  key={sub.id}
                  className="p-3 rounded-control bg-charcoal-800 border border-steel-600/40 flex justify-between items-center hover:border-brass-500/60 transition"
                >
                  <div className="overflow-hidden mr-2">
                    <p className="text-xs font-bold text-parchment truncate">{sub.name}</p>
                    <p className="text-[11px] text-brass-300 font-mono">₹{sub.sellingPrice} • {sub.stock} in stock</p>
                  </div>
                  <button
                    onClick={() => {
                      addToCart(sub);
                      setOutOfStockTarget(null);
                      setSubstitutes([]);
                    }}
                    className="btn-brass text-[11px] py-1 px-3 font-bold whitespace-nowrap"
                  >
                    + Add Substitute
                  </button>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Main Billing Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Barcode Reader & Product Catalog (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Barcode Scanner Bar */}
          <div className="desk-panel p-4">
            <form onSubmit={handleScannerSubmit} className="flex gap-3 items-center">
              <input
                ref={scanInputRef}
                type="text"
                placeholder="Aim scanner & type/paste Barcode or SKU code..."
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                className="control-input text-sm flex-1"
              />
              <button type="submit" className="btn-brass text-sm py-2 px-5">
                🔊 Beep / Add
              </button>
            </form>
          </div>

          {/* Catalog grid filters */}
          <div className="desk-panel p-4 flex gap-4 items-center">
            <input
              type="text"
              placeholder="Search catalog..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="control-input text-xs flex-1 py-2"
            />
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="control-input text-xs bg-charcoal-900 cursor-pointer py-2 max-w-[180px]"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Product Cards List */}
          <div className="max-h-[460px] overflow-y-auto space-y-3 pr-1">
            {isLoading ? (
              <div className="text-center text-steel-400 font-ledger text-xs py-12">
                Reading inventory records...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center text-steel-500 font-ledger text-xs py-12">
                No matching catalog items found.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredProducts.map((p) => {
                  const isOutOfStock = p.stock <= 0;
                  return (
                    <button
                      key={p.id}
                      onClick={() => addToCart(p)}
                      className={`desk-panel p-4 flex gap-3 text-left transition relative ${
                        isOutOfStock
                          ? "border-amber-900/40 bg-charcoal-900/60 opacity-80"
                          : "hover:border-brass-600/30 cursor-pointer"
                      }`}
                    >
                      {p.image ? (
                        <img
                          src={p.image}
                          alt={p.name}
                          className="h-12 w-12 rounded object-cover border border-steel-600/30 flex-shrink-0"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded bg-charcoal-900 border border-steel-600/30 flex items-center justify-center font-display text-brass-300 font-bold text-lg flex-shrink-0">
                          {p.name[0]}
                        </div>
                      )}
                      <div className="flex-1 overflow-hidden">
                        <h4 className="text-sm font-bold text-parchment truncate">
                          {p.name}
                        </h4>
                        <p className="text-[11px] text-steel-400 font-mono">
                          SKU: {p.sku} {p.barcode ? `• ${p.barcode}` : ""}
                        </p>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs font-bold text-brass-300 font-mono">
                            ₹{p.sellingPrice}
                          </span>
                          <span
                            className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${
                              isOutOfStock
                                ? "bg-red-900/40 text-red-300 border border-red-700/40"
                                : "bg-emerald-900/40 text-emerald-300 border border-emerald-700/40"
                            }`}
                          >
                            {isOutOfStock ? "OUT OF STOCK (⚡ Substitutes)" : `${p.stock} in stock`}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Active Cart Basket & Checkout (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="desk-panel p-6 space-y-6">
            <h3 className="font-display text-lg font-bold text-parchment border-b border-brass-700/20 pb-3 flex justify-between items-center">
              <span>🛒 Active Sale Basket</span>
              <span className="text-xs font-mono text-brass-400">
                {cart.reduce((s, i) => s + i.quantity, 0)} Items
              </span>
            </h3>

            {/* Cart items list */}
            <div className="max-h-[220px] overflow-y-auto space-y-3 pr-1">
              {cart.length === 0 ? (
                <div className="text-center text-steel-500 font-ledger text-xs py-8">
                  Basket is empty. Scan items or select from catalog.
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex items-center justify-between p-3 rounded-control bg-charcoal-900 border border-steel-600/20"
                  >
                    <div className="flex-1 overflow-hidden mr-2">
                      <p className="text-xs font-bold text-parchment truncate">
                        {item.product.name}
                      </p>
                      <p className="text-[10px] text-steel-400 font-mono">
                        ₹{item.product.sellingPrice} × {item.quantity} = ₹
                        {(item.product.sellingPrice * item.quantity).toFixed(2)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="h-6 w-6 rounded bg-charcoal-800 text-steel-300 hover:text-parchment font-bold text-xs flex items-center justify-center border border-steel-600/30"
                      >
                        -
                      </button>
                      <span className="text-xs font-mono text-parchment font-bold w-4 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="h-6 w-6 rounded bg-charcoal-800 text-steel-300 hover:text-parchment font-bold text-xs flex items-center justify-center border border-steel-600/30"
                      >
                        +
                      </button>
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-red-400 hover:text-red-300 text-xs ml-2"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Customer Details */}
            <div className="space-y-3 pt-3 border-t border-steel-600/20">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Customer Name (Optional)"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="control-input text-xs py-2"
                />
                <input
                  type="text"
                  placeholder="Customer Phone (Optional)"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="control-input text-xs py-2"
                />
              </div>

              {/* Discount Input & Payment Method */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-ledger text-steel-400 uppercase">
                    Flat Discount (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="control-input text-xs py-2"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-ledger text-steel-400 uppercase">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as "CASH" | "UPI")}
                    className="control-input text-xs py-2 bg-charcoal-900 cursor-pointer"
                  >
                    <option value="CASH">💵 Cash</option>
                    <option value="UPI">📱 UPI QR Sim</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Totals Summary */}
            <div className="space-y-2 pt-4 border-t border-brass-700/20 font-mono text-xs">
              <div className="flex justify-between text-steel-400">
                <span>Taxable Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-steel-400">
                <span>Estimated GST</span>
                <span>₹{totalGst.toFixed(2)}</span>
              </div>
              {effectiveDiscount > 0 && (
                <div className="flex justify-between text-amber-400">
                  <span>Discount Applied</span>
                  <span>-₹{effectiveDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-parchment pt-2 border-t border-steel-600/30">
                <span>Grand Total</span>
                <span className="text-brass-300">₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Checkout Button */}
            <button
              disabled={cart.length === 0 || isSubmitting}
              onClick={handleCheckoutTrigger}
              className="w-full btn-brass text-sm py-3 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span className="animate-pulse">Processing Order…</span>
              ) : (
                <span>⚡ Complete Sale & Issue Invoice (₹{grandTotal.toFixed(2)})</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* UPI Simulation Modal */}
      {upiSimAmount !== null && (
        <UpiSimModal
          amount={upiSimAmount}
          onSuccess={() => processCheckout()}
          onClose={() => setUpiSimAmount(null)}
        />
      )}

      {/* Receipt Invoice Modal */}
      {receiptInvoice && (
        <ReceiptModal
          invoice={receiptInvoice}
          onClose={() => setReceiptInvoice(null)}
        />
      )}
    </div>
  );
}
