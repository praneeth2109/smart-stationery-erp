"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { api, Product, Category, ApiRequestError } from "@/lib/api";
import StockMovementModal from "./StockMovementModal";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function StockBadge({ stock }: { stock: number }) {
  if (stock === 0)
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-ledger font-bold bg-red-950/60 text-red-400 border border-red-800/40">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
        Out of Stock
      </span>
    );
  if (stock <= 10)
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-ledger font-bold bg-orange-950/60 text-orange-400 border border-orange-800/40">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse inline-block" />
        Low — {stock} left
      </span>
    );
  return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-ledger font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/30">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
      {stock} in stock
    </span>
  );
}

function ProductPlaceholder({ name, category }: { name: string; category?: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const hueMap: Record<string, string> = {
    Pens: "from-blue-900 to-blue-800",
    Pencils: "from-amber-900 to-amber-800",
    Paper: "from-slate-800 to-slate-700",
    Books: "from-emerald-900 to-emerald-800",
    Art: "from-purple-900 to-purple-800",
    Files: "from-cyan-900 to-cyan-800",
    Stickers: "from-pink-900 to-pink-800",
  };

  const gradient =
    Object.entries(hueMap).find(([key]) =>
      (category || "").toLowerCase().includes(key.toLowerCase())
    )?.[1] ?? "from-charcoal-700 to-charcoal-800";

  return (
    <div
      className={`w-full h-full flex flex-col items-center justify-center bg-gradient-to-br ${gradient} select-none`}
    >
      <span className="text-3xl font-display font-bold text-white/20 tracking-widest">{initials}</span>
      <span className="text-[9px] font-ledger text-white/20 mt-1 uppercase tracking-widest">
        {category || "Product"}
      </span>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="desk-panel p-4 flex items-center gap-3">
      <div className={`w-1 self-stretch rounded-full ${color}`} />
      <div>
        <p className="font-ledger text-xl font-bold text-ivory">{value}</p>
        <p className="label-eyebrow text-[9px]">{label}</p>
      </div>
    </div>
  );
}

// ─── Product Card ─────────────────────────────────────────────────────────────

function ProductCard({
  prod,
  isCashier,
  canWrite,
  onEdit,
  onDelete,
  onLedger,
}: {
  prod: Product;
  isCashier: boolean;
  canWrite: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onLedger: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const margin =
    prod.purchasePrice > 0
      ? (((prod.sellingPrice - prod.purchasePrice) / prod.purchasePrice) * 100).toFixed(1)
      : "—";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="group desk-panel overflow-hidden flex flex-col hover:border-brass-600/40 hover:shadow-brass-glow transition-all duration-300 cursor-default"
    >
      {/* Image section */}
      <div className="relative h-44 bg-charcoal-900 overflow-hidden flex-shrink-0">
        {prod.image && !imgError ? (
          <img
            src={prod.image}
            alt={prod.name}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <ProductPlaceholder name={prod.name} category={prod.category?.name} />
        )}

        {/* Gradient overlay at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-charcoal-950/90 to-transparent" />

        {/* Stock badge — top right */}
        <div className="absolute top-2 right-2">
          <StockBadge stock={prod.stock} />
        </div>

        {/* Category badge — top left */}
        <div className="absolute top-2 left-2">
          <span className="px-2 py-0.5 rounded-full text-[9px] font-ledger font-semibold bg-charcoal-900/80 text-brass-300 border border-brass-700/30 backdrop-blur-sm">
            {prod.category?.name || "Uncategorized"}
          </span>
        </div>

        {/* SKU — pinned on bottom */}
        <p className="absolute bottom-2 left-3 text-[9px] font-ledger text-parchment/60 tracking-widest">
          SKU: {prod.sku}
        </p>
      </div>

      {/* Content section */}
      <div className="p-4 flex flex-col flex-1 gap-3">
        <div>
          <h3 className="font-semibold text-ivory text-sm leading-snug line-clamp-2">
            {prod.name}
          </h3>
          {prod.description && (
            <p className="text-[10px] text-steel-400 mt-1 line-clamp-2">{prod.description}</p>
          )}
        </div>

        {/* Price row */}
        <div className="flex items-end justify-between gap-2">
          <div>
            <span className="text-[9px] font-ledger text-steel-400 block">Selling Price</span>
            <span className="text-base font-bold text-brass-300 font-ledger">
              ₹{prod.sellingPrice.toFixed(2)}
            </span>
          </div>
          {!isCashier && (
            <div className="text-right">
              <span className="text-[9px] font-ledger text-steel-400 block">Cost</span>
              <span className="text-xs font-ledger text-steel-300">
                ₹{prod.purchasePrice.toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {/* Tags row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-1.5 py-0.5 text-[9px] font-ledger rounded border border-steel-600/20 bg-charcoal-900 text-steel-400">
            GST {prod.gst}%
          </span>
          {!isCashier && (
            <span className="px-1.5 py-0.5 text-[9px] font-ledger rounded border border-emerald-800/30 bg-emerald-950/30 text-emerald-400">
              ↑ {margin}% margin
            </span>
          )}
          {prod.barcode && (
            <span className="px-1.5 py-0.5 text-[9px] font-ledger rounded border border-steel-600/20 bg-charcoal-900 text-steel-500 truncate max-w-[80px]">
              {prod.barcode}
            </span>
          )}
        </div>

        {/* Damaged / Reserved */}
        {(prod.damagedStock > 0 || prod.reservedStock > 0) && (
          <div className="flex gap-2">
            {prod.damagedStock > 0 && (
              <span className="text-[9px] font-ledger text-red-400 border border-red-900/30 rounded px-1.5 py-0.5 bg-red-950/20">
                ⚠ {prod.damagedStock} damaged
              </span>
            )}
            {prod.reservedStock > 0 && (
              <span className="text-[9px] font-ledger text-amber-400 border border-amber-900/30 rounded px-1.5 py-0.5 bg-amber-950/20">
                🔒 {prod.reservedStock} reserved
              </span>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2 pt-1 border-t border-steel-600/10 mt-auto">
          <button
            onClick={onLedger}
            className="flex-1 py-1.5 text-[10px] font-semibold text-brass-400 hover:text-brass-300 border border-brass-700/20 hover:border-brass-600/40 rounded-control bg-charcoal-900 hover:bg-brass-950/20 transition"
          >
            📊 Ledger
          </button>
          {canWrite && (
            <>
              <button
                onClick={onEdit}
                className="flex-1 py-1.5 text-[10px] font-semibold text-steel-300 hover:text-ivory border border-steel-600/20 hover:border-steel-500/40 rounded-control bg-charcoal-900 hover:bg-charcoal-800 transition"
              >
                ✏️ Edit
              </button>
              <button
                onClick={onDelete}
                className="py-1.5 px-2.5 text-[10px] font-semibold text-red-400/70 hover:text-red-400 border border-red-900/20 hover:border-red-800/40 rounded-control bg-charcoal-900 hover:bg-red-950/20 transition"
              >
                🗑
              </button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Table Row (extracted so hooks are valid) ─────────────────────────────────

function TableRow({
  prod,
  index,
  isCashier,
  canWrite,
  onEdit,
  onDelete,
  onLedger,
}: {
  prod: Product;
  index: number;
  isCashier: boolean;
  canWrite: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onLedger: () => void;
}) {
  const [imgErr, setImgErr] = useState(false);
  const margin =
    prod.purchasePrice > 0
      ? (((prod.sellingPrice - prod.purchasePrice) / prod.purchasePrice) * 100).toFixed(1)
      : "—";

  return (
    <motion.tr
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.02 }}
      className="hover:bg-charcoal-800/20 transition-all"
    >
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded border border-brass-600/20 overflow-hidden flex-shrink-0 bg-charcoal-900">
            {prod.image && !imgErr ? (
              <img
                src={prod.image}
                alt={prod.name}
                onError={() => setImgErr(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <ProductPlaceholder name={prod.name} category={prod.category?.name} />
            )}
          </div>
          <div>
            <p className="font-semibold text-ivory text-xs">{prod.name}</p>
            <p className="text-[10px] text-steel-400 truncate max-w-[160px]">
              {prod.description || "No description"}
            </p>
          </div>
        </div>
      </td>
      <td className="px-5 py-3 font-ledger text-xs text-parchment/80">
        <p>{prod.sku}</p>
        {prod.barcode && <p className="text-steel-500 text-[9px]">{prod.barcode}</p>}
      </td>
      <td className="px-5 py-3">
        <span className="px-2 py-0.5 rounded bg-charcoal-900 border border-brass-700/20 text-[10px] text-brass-300 font-ledger">
          {prod.category?.name || "—"}
        </span>
      </td>
      {!isCashier && (
        <td className="px-5 py-3 text-right font-ledger text-xs text-steel-300">
          ₹{prod.purchasePrice.toFixed(2)}
        </td>
      )}
      <td className="px-5 py-3 text-right font-ledger font-bold text-brass-300 text-xs">
        ₹{prod.sellingPrice.toFixed(2)}
      </td>
      <td className="px-5 py-3 text-right font-ledger text-xs text-parchment/70">
        {prod.gst}%
      </td>
      {!isCashier && (
        <td className="px-5 py-3 text-right font-ledger text-xs text-emerald-400">{margin}%</td>
      )}
      <td className="px-5 py-3 text-center">
        <StockBadge stock={prod.stock} />
      </td>
      <td className="px-5 py-3 text-center">
        <div className="flex items-center justify-center gap-2">
          <button onClick={onLedger} className="text-[10px] text-brass-300 hover:text-brass-200 transition">
            Ledger
          </button>
          {canWrite && (
            <>
              <span className="text-steel-600">|</span>
              <button onClick={onEdit} className="text-[10px] text-steel-300 hover:text-ivory transition">
                Edit
              </button>
              <span className="text-steel-600">|</span>
              <button onClick={onDelete} className="text-[10px] text-red-400 hover:text-red-300 transition">
                Delete
              </button>
            </>
          )}
        </div>
      </td>
    </motion.tr>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type StockFilter = "all" | "in_stock" | "low_stock" | "out_of_stock";
type ViewMode = "grid" | "table";

export default function ProductCatalogView() {
  const { accessToken, user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ledgerProduct, setLedgerProduct] = useState<Product | null>(null);

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Filters
  const [search, setSearch] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    sku: "",
    barcode: "",
    purchasePrice: "",
    sellingPrice: "",
    gst: "18",
    image: "",
    categoryId: "",
  });
  const [imagePreviewError, setImagePreviewError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Compress + base64-encode an image file using canvas (max 600×600, JPEG 0.75)
  function handleImageFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      const img = new window.Image();
      img.onload = () => {
        const MAX = 600;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL("image/jpeg", 0.75);
        setForm((f) => ({ ...f, image: compressed }));
        setImagePreviewError(false);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  }

  const canWrite = user?.role === "ADMIN" || user?.role === "INVENTORY_MANAGER";
  const isCashier = user?.role === "CASHIER";

  // Derived margin
  const livePurchasePrice = parseFloat(form.purchasePrice) || 0;
  const liveSellingPrice = parseFloat(form.sellingPrice) || 0;
  const liveMargin =
    livePurchasePrice > 0
      ? (((liveSellingPrice - livePurchasePrice) / livePurchasePrice) * 100).toFixed(1)
      : null;
  const liveGstAmount =
    liveSellingPrice > 0
      ? ((liveSellingPrice / (1 + parseFloat(form.gst) / 100)) * (parseFloat(form.gst) / 100)).toFixed(2)
      : null;

  const fetchAll = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    try {
      const [prods, cats] = await Promise.all([
        api.getProducts(accessToken, {
          search: search || undefined,
          categoryId: selectedCategoryId || undefined,
        }),
        api.getCategories(accessToken),
      ]);
      setProducts(Array.isArray(prods) ? prods : prods?.data ?? []);
      setCategories(cats);
    } catch {
      setError("Failed to load product catalog.");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, search, selectedCategoryId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Filtered products (stock filter applied client-side)
  const filteredProducts = products.filter((p) => {
    if (stockFilter === "out_of_stock") return p.stock === 0;
    if (stockFilter === "low_stock") return p.stock > 0 && p.stock <= 10;
    if (stockFilter === "in_stock") return p.stock > 11;
    return true;
  });

  // Stats
  const totalProducts = products.length;
  const inStockCount = products.filter((p) => p.stock > 10).length;
  const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= 10).length;
  const outOfStockCount = products.filter((p) => p.stock === 0).length;

  function openCreateModal() {
    setEditingProduct(null);
    setForm({
      name: "",
      description: "",
      sku: "",
      barcode: "",
      purchasePrice: "",
      sellingPrice: "",
      gst: "18",
      image: "",
      categoryId: categories[0]?.id || "",
    });
    setImagePreviewError(false);
    setIsModalOpen(true);
  }

  function openEditModal(prod: Product) {
    setEditingProduct(prod);
    setForm({
      name: prod.name,
      description: prod.description || "",
      sku: prod.sku,
      barcode: prod.barcode || "",
      purchasePrice: prod.purchasePrice.toString(),
      sellingPrice: prod.sellingPrice.toString(),
      gst: prod.gst.toString(),
      image: prod.image || "",
      categoryId: prod.categoryId,
    });
    setImagePreviewError(false);
    setIsModalOpen(true);
  }

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || !canWrite) return;
    setIsSubmitting(true);
    setError(null);

    const payload = {
      name: form.name,
      description: form.description || null,
      sku: form.sku,
      barcode: form.barcode || null,
      purchasePrice: parseFloat(form.purchasePrice),
      sellingPrice: parseFloat(form.sellingPrice),
      gst: parseFloat(form.gst),
      image: form.image || null,
      categoryId: form.categoryId,
    };

    try {
      if (editingProduct) {
        await api.updateProduct(accessToken, editingProduct.id, payload);
      } else {
        await api.createProduct(accessToken, payload);
      }
      setIsModalOpen(false);
      fetchAll();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Failed to save product.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteProduct(id: string) {
    if (!accessToken || !canWrite) return;
    if (!confirm("Permanently delete this product and all its stock records?")) return;
    try {
      await api.deleteProduct(accessToken, id);
      fetchAll();
    } catch {
      setError("Failed to delete product.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="label-eyebrow mb-1">Retail Desk Registry</p>
          <h1 className="font-display text-3xl font-semibold text-ivory">Products Catalog</h1>
          <p className="text-xs text-steel-400 mt-1 font-body">
            Manage SKUs, pricing, GST codes, and inventory levels.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex rounded-control overflow-hidden border border-steel-600/20">
            <button
              onClick={() => setViewMode("grid")}
              title="Grid view"
              className={`px-3 py-2 text-sm transition ${
                viewMode === "grid"
                  ? "bg-charcoal-800 text-brass-300"
                  : "bg-charcoal-900 text-steel-400 hover:text-parchment"
              }`}
            >
              ⊞
            </button>
            <button
              onClick={() => setViewMode("table")}
              title="Table view"
              className={`px-3 py-2 text-sm transition ${
                viewMode === "table"
                  ? "bg-charcoal-800 text-brass-300"
                  : "bg-charcoal-900 text-steel-400 hover:text-parchment"
              }`}
            >
              ☰
            </button>
          </div>
          {canWrite && (
            <button onClick={openCreateModal} className="btn-brass text-sm py-2 px-5">
              + Add Product
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className="rounded-control border border-red-950/40 bg-red-950/20 px-4 py-3 text-sm text-red-300 flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200 ml-4">
            ×
          </button>
        </div>
      )}

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Products" value={totalProducts} color="bg-brass-500" />
        <StatCard label="In Stock" value={inStockCount} color="bg-emerald-500" />
        <StatCard label="Low Stock" value={lowStockCount} color="bg-orange-500" />
        <StatCard label="Out of Stock" value={outOfStockCount} color="bg-red-500" />
      </div>

      {/* Filters */}
      <div className="desk-panel p-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
        {/* Search */}
        <div className="md:col-span-5">
          <label className="label-eyebrow text-[9px] mb-1.5 block">Search</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-500 text-xs">
              🔍
            </span>
            <input
              type="text"
              placeholder="Name, SKU, barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="control-input text-sm pl-8"
            />
          </div>
        </div>

        {/* Category */}
        <div className="md:col-span-3">
          <label className="label-eyebrow text-[9px] mb-1.5 block">Category</label>
          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="control-input text-sm bg-charcoal-900 cursor-pointer"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Stock filter */}
        <div className="md:col-span-4">
          <label className="label-eyebrow text-[9px] mb-1.5 block">Stock Status</label>
          <div className="flex gap-1.5">
            {(
              [
                { id: "all", label: "All" },
                { id: "in_stock", label: "✅ OK" },
                { id: "low_stock", label: "⚠️ Low" },
                { id: "out_of_stock", label: "❌ Out" },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                onClick={() => setStockFilter(f.id)}
                className={`flex-1 py-1.5 text-[10px] font-ledger font-semibold rounded-control border transition ${
                  stockFilter === f.id
                    ? "bg-brass-900/30 text-brass-300 border-brass-600/40"
                    : "bg-charcoal-900 text-steel-400 border-steel-600/20 hover:text-parchment"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Count */}
      <p className="text-[10px] text-steel-500 font-ledger">
        Showing {filteredProducts.length} of {totalProducts} products
      </p>

      {/* Products Display */}
      {isLoading ? (
        <div className="py-20 text-center space-y-3">
          <div className="mx-auto w-8 h-8 border-2 border-brass-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-steel-400 font-ledger text-xs">Reviewing inventory ledgers...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="desk-panel py-20 text-center">
          <p className="text-4xl mb-3">📦</p>
          <p className="text-steel-400 font-ledger text-xs">No products match your filters.</p>
        </div>
      ) : viewMode === "grid" ? (
        /* ─── GRID VIEW ─── */
        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5"
        >
          <AnimatePresence>
            {filteredProducts.map((prod) => (
              <ProductCard
                key={prod.id}
                prod={prod}
                isCashier={isCashier}
                canWrite={canWrite}
                onEdit={() => openEditModal(prod)}
                onDelete={() => handleDeleteProduct(prod.id)}
                onLedger={() => setLedgerProduct(prod)}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        /* ─── TABLE VIEW ─── */
        <div className="desk-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-body text-sm">
              <thead>
                <tr className="border-b border-steel-600/20 bg-charcoal-900 font-ledger text-xs text-brass-300/80 uppercase tracking-wider">
                  <th className="px-5 py-3">Product</th>
                  <th className="px-5 py-3">SKU / Barcode</th>
                  <th className="px-5 py-3">Category</th>
                  {!isCashier && <th className="px-5 py-3 text-right">Cost</th>}
                  <th className="px-5 py-3 text-right">Price</th>
                  <th className="px-5 py-3 text-right">GST</th>
                  {!isCashier && <th className="px-5 py-3 text-right">Margin</th>}
                  <th className="px-5 py-3 text-center">Stock</th>
                  <th className="px-5 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-steel-600/10">
                {filteredProducts.map((prod, i) => (
                  <TableRow
                    key={prod.id}
                    prod={prod}
                    index={i}
                    isCashier={isCashier}
                    canWrite={canWrite}
                    onEdit={() => openEditModal(prod)}
                    onDelete={() => handleDeleteProduct(prod.id)}
                    onLedger={() => setLedgerProduct(prod)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Create / Edit Modal ─── */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="desk-panel w-full max-w-2xl relative max-h-[92vh] overflow-y-auto"
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-brass-sheen rounded-t" />

              {/* Modal header with image preview */}
              <div className="flex gap-5 p-6 pb-0">
                {/* Image preview panel */}
                <div className="w-28 h-28 rounded-panel border border-brass-600/20 overflow-hidden flex-shrink-0 bg-charcoal-900">
                  {form.image && !imagePreviewError ? (
                    <img
                      src={form.image}
                      alt="Preview"
                      onError={() => setImagePreviewError(true)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ProductPlaceholder
                      name={form.name || "Product"}
                      category={
                        categories.find((c) => c.id === form.categoryId)?.name
                      }
                    />
                  )}
                </div>

                <div className="flex-1">
                  <h3 className="font-display text-lg text-brass-300 font-semibold">
                    {editingProduct ? "Edit Product" : "New Product SKU"}
                  </h3>
                  {/* Live margin calculator */}
                  {liveMargin !== null && (
                    <div className="flex gap-3 mt-2 flex-wrap">
                      <span
                        className={`text-[10px] font-ledger px-2 py-0.5 rounded border ${
                          parseFloat(liveMargin) >= 0
                            ? "text-emerald-400 border-emerald-800/30 bg-emerald-950/30"
                            : "text-red-400 border-red-800/30 bg-red-950/30"
                        }`}
                      >
                        Margin: {liveMargin}%
                      </span>
                      {liveGstAmount && (
                        <span className="text-[10px] font-ledger px-2 py-0.5 rounded border text-brass-400 border-brass-800/30 bg-brass-950/20">
                          GST: ₹{liveGstAmount} per unit
                        </span>
                      )}
                      {liveSellingPrice > 0 && (
                        <span className="text-[10px] font-ledger px-2 py-0.5 rounded border text-sky-400 border-sky-800/30 bg-sky-950/20">
                          Profit: ₹{(liveSellingPrice - livePurchasePrice).toFixed(2)}/unit
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label-eyebrow mb-1.5 block text-[9px]">Product Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Pilot Gel Pen Blue"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      className="control-input text-sm"
                    />
                  </div>
                  <div>
                    <label className="label-eyebrow mb-1.5 block text-[9px]">Category *</label>
                    <select
                      required
                      value={form.categoryId}
                      onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                      className="control-input text-sm bg-charcoal-900 cursor-pointer"
                    >
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label-eyebrow mb-1.5 block text-[9px]">SKU Code *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. PEN-PIL-BLU"
                      value={form.sku}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, sku: e.target.value.toUpperCase() }))
                      }
                      className="control-input text-sm font-ledger tracking-widest"
                    />
                  </div>
                  <div>
                    <label className="label-eyebrow mb-1.5 block text-[9px]">
                      Barcode EAN/UPC
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 4902505163140"
                      value={form.barcode}
                      onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
                      className="control-input text-sm font-ledger"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="label-eyebrow mb-1.5 block text-[9px]">
                      Purchase Price (₹) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={form.purchasePrice}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, purchasePrice: e.target.value }))
                      }
                      className="control-input text-sm font-ledger"
                    />
                  </div>
                  <div>
                    <label className="label-eyebrow mb-1.5 block text-[9px]">
                      Selling Price (₹) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={form.sellingPrice}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, sellingPrice: e.target.value }))
                      }
                      className="control-input text-sm font-ledger"
                    />
                  </div>
                  <div>
                    <label className="label-eyebrow mb-1.5 block text-[9px]">GST Rate *</label>
                    <select
                      value={form.gst}
                      onChange={(e) => setForm((f) => ({ ...f, gst: e.target.value }))}
                      className="control-input text-sm bg-charcoal-900 cursor-pointer"
                    >
                      <option value="0">0% (Exempt)</option>
                      <option value="5">5% GST</option>
                      <option value="12">12% GST</option>
                      <option value="18">18% GST</option>
                      <option value="28">28% GST</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label-eyebrow mb-1.5 block text-[9px]">Product Image</label>

                  {/* Hidden file inputs */}
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageFile(file);
                      e.target.value = "";
                    }}
                  />
                  <input
                    ref={galleryInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageFile(file);
                      e.target.value = "";
                    }}
                  />

                  {/* Picker buttons */}
                  <div className="flex gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-2 py-2 rounded-control border border-brass-700/30 bg-charcoal-900 hover:bg-brass-950/20 hover:border-brass-600/50 text-[11px] font-semibold text-brass-300 transition"
                    >
                      <span className="text-base">📷</span> Take Photo
                    </button>
                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-2 py-2 rounded-control border border-steel-600/30 bg-charcoal-900 hover:bg-charcoal-800 hover:border-steel-500/50 text-[11px] font-semibold text-steel-300 transition"
                    >
                      <span className="text-base">🖼️</span> Choose from Gallery
                    </button>
                    {form.image && (
                      <button
                        type="button"
                        onClick={() => {
                          setForm((f) => ({ ...f, image: "" }));
                          setImagePreviewError(false);
                        }}
                        title="Remove image"
                        className="px-3 py-2 rounded-control border border-red-900/30 bg-charcoal-900 hover:bg-red-950/20 text-red-400 hover:text-red-300 text-xs transition"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Or paste URL divider */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 h-px bg-steel-600/20" />
                    <span className="text-[9px] text-steel-500 font-ledger">or paste URL</span>
                    <div className="flex-1 h-px bg-steel-600/20" />
                  </div>

                  <input
                    type="url"
                    placeholder="https://example.com/product.jpg"
                    value={form.image.startsWith("data:") ? "" : form.image}
                    readOnly={form.image.startsWith("data:")}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, image: e.target.value }));
                      setImagePreviewError(false);
                    }}
                    className="control-input text-sm"
                  />
                  {form.image.startsWith("data:") && (
                    <p className="text-[9px] text-emerald-400 mt-1 font-ledger">
                      ✓ Local photo captured — stored as compressed image.
                    </p>
                  )}
                  {!form.image.startsWith("data:") && (
                    <p className="text-[9px] text-steel-500 mt-1 font-ledger">
                      Paste any public URL, or use the buttons above to capture/upload a photo.
                    </p>
                  )}
                </div>

                <div>
                  <label className="label-eyebrow mb-1.5 block text-[9px]">Description</label>
                  <textarea
                    placeholder="Enter detailed product notes, brand, specs..."
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    className="control-input text-sm h-16 resize-none"
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-400 bg-red-950/20 border border-red-900/30 rounded p-2">
                    {error}
                  </p>
                )}

                <div className="flex items-center justify-end gap-3 pt-2 border-t border-steel-600/20">
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
                    {isSubmitting ? "Saving..." : editingProduct ? "Update Product" : "Create Product"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stock Ledger Modal */}
      {ledgerProduct && (
        <StockMovementModal
          product={ledgerProduct}
          onClose={() => setLedgerProduct(null)}
          onUpdate={async () => {
            if (!accessToken) return;
            try {
              const data = await api.getProducts(accessToken, {
                search: search || undefined,
                categoryId: selectedCategoryId || undefined,
              });
              const productList = Array.isArray(data) ? data : data?.data ?? [];
              setProducts(productList);
              const fresh = productList.find((p) => p.id === ledgerProduct.id);
              if (fresh) setLedgerProduct(fresh);
            } catch {}
          }}
        />
      )}
    </div>
  );
}
