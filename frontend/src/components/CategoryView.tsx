"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api, Category, ApiRequestError } from "@/lib/api";

export default function CategoryView() {
  const { accessToken, user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Permissions
  const canWrite = user?.role === "ADMIN" || user?.role === "INVENTORY_MANAGER";

  async function fetchCategories() {
    if (!accessToken) return;
    setIsLoading(true);
    try {
      const data = await api.getCategories(accessToken);
      setCategories(data);
    } catch (err) {
      setError("Failed to load categories.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchCategories();
  }, [accessToken]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || !canWrite) return;
    setError(null);
    setIsSubmitting(true);

    try {
      if (editingId) {
        await api.updateCategory(accessToken, editingId, { name, description });
      } else {
        await api.createCategory(accessToken, { name, description });
      }
      setName("");
      setDescription("");
      setEditingId(null);
      fetchCategories();
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError("Operation failed. Try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleEdit(cat: Category) {
    setEditingId(cat.id);
    setName(cat.name);
    setDescription(cat.description || "");
  }

  async function handleDelete(id: string) {
    if (!accessToken || !canWrite) return;
    if (!confirm("Are you sure you want to delete this category? All associated products will be deleted.")) return;
    try {
      await api.deleteCategory(accessToken, id);
      fetchCategories();
    } catch (err) {
      setError("Failed to delete category.");
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="label-eyebrow mb-1">Stationery Classification</p>
          <h1 className="font-display text-3xl font-semibold text-ivory">Categories</h1>
          <p className="font-body text-xs text-steel-400 mt-1">
            Group products by notebooks, writing instruments, and other stock.
          </p>
        </div>
      </header>

      {error && (
        <div className="rounded-control border border-red-950/40 bg-red-950/20 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Create/Edit Category Form (Only visible to Admin & Inventory Managers) */}
        {canWrite ? (
          <div className="desk-panel p-6 h-fit lg:col-span-1">
            <h3 className="font-display text-lg text-brass-300 mb-4 font-semibold">
              {editingId ? "Edit Category Details" : "Create New Category"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label-eyebrow mb-2 block">Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Notebooks"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="control-input text-sm"
                />
              </div>

              <div>
                <label className="label-eyebrow mb-2 block">Description</label>
                <textarea
                  placeholder="Describe category items..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="control-input text-sm h-24 resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={isSubmitting} className="btn-brass flex-1 text-sm py-2">
                  {isSubmitting ? "Saving..." : editingId ? "Save Changes" : "Create Category"}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setName("");
                      setDescription("");
                    }}
                    className="btn-ghost text-sm py-2"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        ) : (
          <div className="desk-panel p-6 h-fit lg:col-span-1">
            <h3 className="font-display text-base text-brass-400 mb-2 font-semibold">Information</h3>
            <p className="font-body text-xs leading-relaxed text-steel-300">
              Only Shop Owners (Admin) and Inventory Managers can create, update, or delete categories. As a Cashier, you have view-only access.
            </p>
          </div>
        )}

        {/* Right Side: Categories List */}
        <div className="lg:col-span-2 space-y-4">
          {isLoading ? (
            <div className="desk-panel p-8 text-center text-steel-400 font-ledger text-xs">
              Retrieving ledger classifications...
            </div>
          ) : categories.length === 0 ? (
            <div className="desk-panel p-8 text-center text-steel-400 font-ledger text-xs">
              No categories found.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="desk-panel p-5 flex flex-col justify-between hover:shadow-brass-glow transition-all"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="font-display text-lg font-bold text-ivory">{cat.name}</h4>
                      <span className="font-ledger text-xs px-2 py-1 rounded bg-charcoal-900 border border-brass-600/20 text-brass-300">
                        {cat._count?.products ?? 0} Products
                      </span>
                    </div>
                    <p className="font-body text-xs text-steel-300 line-clamp-3 mb-4 min-h-[40px]">
                      {cat.description || "No description provided."}
                    </p>
                  </div>

                  {canWrite && (
                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-steel-600/10">
                      <button
                        onClick={() => handleEdit(cat)}
                        className="text-xs text-brass-300 hover:text-brass-200 transition"
                      >
                        Edit
                      </button>
                      <span className="text-steel-600">|</span>
                      <button
                        onClick={() => handleDelete(cat.id)}
                        className="text-xs text-red-400 hover:text-red-300 transition"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
