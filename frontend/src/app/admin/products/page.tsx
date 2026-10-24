"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatINR } from "@/components/product/ProductCard";
import {
  getAdminProducts,
  publishAdminProduct,
  unpublishAdminProduct,
  archiveAdminProduct,
} from "@/lib/api/catalog";
import {
  Plus,
  Search,
  Edit2,
  Archive,
  CheckCircle2,
  Clock,
  Loader2,
  Globe,
  EyeOff,
  AlertCircle,
} from "lucide-react";

export default function AdminProductsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const res = await getAdminProducts({
        status: statusFilter,
        search: searchTerm || undefined,
      });
      setProducts(res.items || []);
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to load products from database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadProducts();
  };

  const handleTogglePublish = async (id: string, currentStatus: string) => {
    try {
      setActionId(id);
      setErrorMessage(null);
      if (currentStatus === "PUBLISHED") {
        await unpublishAdminProduct(id);
      } else {
        await publishAdminProduct(id);
      }
      await loadProducts();
    } catch (err: any) {
      setErrorMessage(err?.message || "Status update failed.");
    } finally {
      setActionId(null);
    }
  };

  const handleArchive = async (id: string) => {
    if (!window.confirm("Are you sure you want to archive this product?")) return;
    try {
      setActionId(id);
      setErrorMessage(null);
      await archiveAdminProduct(id);
      await loadProducts();
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to archive product.");
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <span className="text-xs uppercase tracking-caps text-gold font-medium block mb-1">
            Catalog Management &middot; Real PostgreSQL Database
          </span>
          <h1 className="font-display text-3xl text-ink font-normal">
            Atelier Products &amp; Silhouettes
          </h1>
        </div>

        <Link
          href="/admin/products/new"
          className="inline-flex items-center space-x-2 bg-navy text-canvas hover:bg-gold hover:text-navy px-4 py-2.5 text-xs uppercase tracking-caps font-semibold transition-colors rounded shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </Link>
      </div>

      {errorMessage && (
        <div className="p-3 bg-rust/10 border border-rust/30 text-rust text-xs rounded flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-surface border border-border p-4 flex flex-col md:flex-row justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center space-x-1 text-xs">
          {[
            { id: "ALL", label: "All Items" },
            { id: "PUBLISHED", label: "Published" },
            { id: "DRAFT", label: "Drafts" },
            { id: "ARCHIVED", label: "Archived" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                statusFilter === tab.id
                  ? "bg-navy text-canvas"
                  : "text-muted hover:text-ink hover:bg-surface-muted"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative min-w-[260px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, SKU, or fabric..."
            className="w-full bg-canvas border border-border pl-9 pr-4 py-1.5 text-xs text-ink focus:border-gold focus:outline-none"
          />
        </form>
      </div>

      {/* Product Records Table */}
      <div className="bg-surface border border-border overflow-x-auto shadow-xs">
        <table className="w-full text-left text-xs font-sans">
          <thead className="bg-surface-muted border-b border-border uppercase tracking-caps text-[10px] text-muted">
            <tr>
              <th className="py-3 px-4">Garment</th>
              <th className="py-3 px-4">SKU / Sizes</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Price (INR)</th>
              <th className="py-3 px-4">Total Stock</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-muted">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-navy" />
                  <span>Loading catalog records from database...</span>
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-muted">
                  No products match the selected criteria.
                </td>
              </tr>
            ) : (
              products.map((product) => {
                const totalStock = product.variants?.reduce(
                  (sum: number, v: any) => sum + (v.stock || 0),
                  0
                );
                const isWorking = actionId === product.id;

                return (
                  <tr key={product.id} className="hover:bg-surface-muted/50 transition-colors">
                    {/* Garment Name & Thumbnail */}
                    <td className="py-3 px-4 flex items-center space-x-3">
                      {product.media?.[0]?.url ? (
                        <img
                          src={product.media[0].url}
                          alt={product.name}
                          className="w-10 h-12 object-cover bg-surface-muted border border-border flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-12 bg-surface-muted border border-border flex items-center justify-center flex-shrink-0 text-muted font-display text-xs">
                          {product.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <span className="font-medium text-ink block leading-snug">
                          {product.name}
                        </span>
                        <span className="text-[11px] text-muted">{product.material}</span>
                      </div>
                    </td>

                    {/* SKU / Variants */}
                    <td className="py-3 px-4 font-mono text-[11px] text-muted">
                      {product.variants?.[0]?.sku || "—"}
                      <span className="block text-[10px] text-muted/70 font-sans">
                        {product.variants?.map((v: any) => v.size).join(", ")}
                      </span>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4 text-muted">
                      {product.category || "—"}
                    </td>

                    {/* Price */}
                    <td className="py-3 px-4 font-semibold text-ink tabular-nums">
                      {formatINR(product.pricePaise)}
                    </td>

                    {/* Inventory Status */}
                    <td className="py-3 px-4">
                      {totalStock > 0 ? (
                        <span className="inline-flex items-center text-stock-ok space-x-1 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{totalStock} in atelier</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-rust space-x-1 font-medium">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Out of stock</span>
                        </span>
                      )}
                    </td>

                    {/* Status Pill */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block text-[10px] uppercase tracking-caps px-2 py-0.5 rounded font-medium ${
                          product.status === "PUBLISHED"
                            ? "bg-stock-ok/10 text-stock-ok border border-stock-ok/30"
                            : product.status === "DRAFT"
                            ? "bg-gold/10 text-gold border border-gold/30"
                            : "bg-muted/10 text-muted border border-muted/30"
                        }`}
                      >
                        {product.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right space-x-1.5">
                      {/* Publish / Unpublish Toggle */}
                      {product.status !== "ARCHIVED" && (
                        <button
                          type="button"
                          disabled={isWorking}
                          onClick={() => handleTogglePublish(product.id, product.status)}
                          className={`p-1.5 rounded transition-colors ${
                            product.status === "PUBLISHED"
                              ? "text-muted hover:text-rust hover:bg-surface-muted"
                              : "text-muted hover:text-stock-ok hover:bg-surface-muted"
                          }`}
                          title={product.status === "PUBLISHED" ? "Unpublish to Draft" : "Publish to Storefront"}
                        >
                          {isWorking ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : product.status === "PUBLISHED" ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Globe className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}

                      {/* Edit */}
                      <Link
                        href={`/admin/products/${product.id}/edit`}
                        className="inline-flex items-center p-1.5 text-muted hover:text-navy rounded transition-colors hover:bg-surface-muted"
                        title="Edit Product"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Link>

                      {/* Archive */}
                      {product.status !== "ARCHIVED" && (
                        <button
                          type="button"
                          disabled={isWorking}
                          onClick={() => handleArchive(product.id)}
                          className="p-1.5 text-muted hover:text-rust rounded transition-colors hover:bg-surface-muted"
                          title="Archive Product"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
