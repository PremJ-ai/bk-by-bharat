"use client";

import { useState } from "react";
import Link from "next/link";
import { MOCK_PRODUCTS, DetailedProduct } from "@/components/product/mockFixtures";
import { formatINR } from "@/components/product/ProductCard";
import {
  Plus,
  Search,
  Filter,
  Edit2,
  Archive,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
} from "lucide-react";

export default function AdminProductsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [products, setProducts] = useState<DetailedProduct[]>(MOCK_PRODUCTS);

  const filtered = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.material.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleArchive = (id: string) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: "archived" as const } : p))
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <span className="text-xs uppercase tracking-caps text-gold font-medium block mb-1">
            Catalog Management &middot; Milestone 1 Shell
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

      {/* Filter and Search Bar */}
      <div className="bg-surface border border-border p-4 flex flex-col md:flex-row justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center space-x-1 text-xs">
          {[
            { id: "all", label: "All Items" },
            { id: "published", label: "Published" },
            { id: "draft", label: "Drafts" },
            { id: "archived", label: "Archived" },
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
        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, SKU, or fabric..."
            className="w-full bg-canvas border border-border pl-9 pr-4 py-1.5 text-xs text-ink focus:border-gold focus:outline-none"
          />
        </div>
      </div>

      {/* Product Records Table */}
      <div className="bg-surface border border-border overflow-x-auto shadow-xs">
        <table className="w-full text-left text-xs font-sans">
          <thead className="bg-surface-muted border-b border-border uppercase tracking-caps text-[10px] text-muted">
            <tr>
              <th className="py-3 px-4">Garment</th>
              <th className="py-3 px-4">SKU</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Price (INR)</th>
              <th className="py-3 px-4">Inventory</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-muted">
                  No products match the selected criteria.
                </td>
              </tr>
            ) : (
              filtered.map((product) => (
                <tr key={product.id} className="hover:bg-surface-muted/50 transition-colors">
                  {/* Garment Name & Thumbnail */}
                  <td className="py-3 px-4 flex items-center space-x-3">
                    <div className="w-10 h-12 bg-surface-muted border border-border flex items-center justify-center flex-shrink-0 text-muted font-display text-xs">
                      {product.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <span className="font-medium text-ink block leading-snug">
                        {product.name}
                      </span>
                      <span className="text-[11px] text-muted">{product.material}</span>
                    </div>
                  </td>

                  {/* SKU */}
                  <td className="py-3 px-4 font-mono text-[11px] text-muted">
                    {product.sku}
                  </td>

                  {/* Category */}
                  <td className="py-3 px-4 text-muted">
                    {product.category}
                  </td>

                  {/* Price */}
                  <td className="py-3 px-4 font-semibold text-ink tabular-nums">
                    {formatINR(product.pricePaise)}
                  </td>

                  {/* Inventory Status */}
                  <td className="py-3 px-4">
                    {product.stockStatus === "in_stock" ? (
                      <span className="inline-flex items-center text-stock-ok space-x-1 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>In Atelier</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-rust space-x-1 font-medium">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Low Stock</span>
                      </span>
                    )}
                  </td>

                  {/* Status Pill */}
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block text-[10px] uppercase tracking-caps px-2 py-0.5 rounded font-medium ${
                        product.status === "published"
                          ? "bg-stock-ok/10 text-stock-ok border border-stock-ok/30"
                          : product.status === "draft"
                          ? "bg-gold/10 text-gold border border-gold/30"
                          : "bg-muted/10 text-muted border border-muted/30"
                      }`}
                    >
                      {product.status}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right space-x-2">
                    <Link
                      href={`/admin/products/${product.id}/edit`}
                      className="inline-flex items-center space-x-1 p-1.5 text-muted hover:text-navy rounded transition-colors"
                      title="Edit Product"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span className="sr-only">Edit</span>
                    </Link>

                    {product.status !== "archived" && (
                      <button
                        type="button"
                        onClick={() => handleArchive(product.id)}
                        className="p-1.5 text-muted hover:text-rust rounded transition-colors"
                        title="Archive Product"
                      >
                        <Archive className="w-3.5 h-3.5" />
                        <span className="sr-only">Archive</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
