"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ProductCard } from "@/components/product/ProductCard";
import type { ProductViewModel } from "@/components/product/product.types";
import { ProductMediaManager } from "@/components/admin/ProductMediaManager";
import {
  emptyFabricSpecificationForm,
  FabricSpecificationFields,
  toFabricSpecifications,
} from "@/components/admin/FabricSpecificationFields";
import { createAdminProduct } from "@/lib/api/catalog";
import type { AdminProductMediaItem } from "@/lib/api/media";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Eye,
  Save,
  Send,
  Loader2,
} from "lucide-react";

export default function NewProductPage() {
  const router = useRouter();

  // Product Form State
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [sku, setSku] = useState("");
  const [colorName, setColorName] = useState("");
  const [stockBySize, setStockBySize] = useState<Record<string, number>>({});
  const [category, setCategory] = useState("Shirts");
  const [material, setMaterial] = useState("");
  const [priceRupees, setPriceRupees] = useState("");
  const [description, setDescription] = useState("");
  const [longDescription, setLongDescription] = useState("");
  const [detailsText, setDetailsText] = useState("");
  const [careInstructionsText, setCareInstructionsText] = useState("");
  const [fabricSpecifications, setFabricSpecifications] = useState(emptyFabricSpecificationForm);
  const [badge, setBadge] = useState<"New" | "Limited" | "Atelier Pick" | "Core" | undefined>();
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [mediaItems, setMediaItems] = useState<AdminProductMediaItem[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Auto-generate slug when name changes
  const handleNameChange = (val: string) => {
    setName(val);
    const suggested = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setSlug(suggested);
  };

  const pricePaise = (parseInt(priceRupees, 10) || 0) * 100;
  const primaryImage = mediaItems.find((item) => item.mediaType === "IMAGE" && item.isPrimary);

  const liveProduct: ProductViewModel = {
    id: "draft-preview",
    name: name || "Untitled Garment",
    slug: slug || "draft-garment",
    category,
    material: material || "Pure Natural Textile",
    pricePaise,
    currency: "INR",
    stockStatus: "in_stock",
    badge,
    imageUrl: primaryImage?.url,
    isFixture: false,
  };

  const handleSubmit = async (publish: boolean) => {
    try {
      setIsSubmitting(true);
      setFeedback(null);

      if (!name || name.trim().length < 2) {
        throw new Error("Product name is required.");
      }
      if (sku.trim().length < 2) {
        throw new Error("A base SKU prefix is required.");
      }
      if (colorName.trim().length < 1) {
        throw new Error("A color name is required.");
      }
      if (!description || description.trim().length < 10) {
        throw new Error("Description must be at least 10 characters.");
      }
      if (!material || material.trim().length < 2) {
        throw new Error("Fabric material is required.");
      }
      if (!pricePaise || pricePaise <= 0) {
        throw new Error("Please enter a valid price in INR.");
      }
      if (selectedSizes.length === 0) {
        throw new Error("Select at least one size variant.");
      }
      if (publish && !mediaItems.some((item) => item.mediaType === "IMAGE")) {
        throw new Error("Publishing requires at least one product image.");
      }

      const variants = selectedSizes.map((size) => ({
        sku: `${sku}-${size}`,
        size,
        colorName: colorName.trim(),
        colorHex: "#0A192F",
        stock: stockBySize[size] ?? 0,
      }));

      const payload = {
        name,
        slug: slug || undefined,
        description,
        longDescription: longDescription.trim() || undefined,
        material,
        fabricSpecifications: toFabricSpecifications(fabricSpecifications),
        categoryName: category,
        pricePaise,
        badge: badge || undefined,
        status: (publish ? "PUBLISHED" : "DRAFT") as "PUBLISHED" | "DRAFT",
        variants,
        details: detailsText.split("\n").map((item) => item.trim()).filter(Boolean),
        careInstructions: careInstructionsText.split("\n").map((item) => item.trim()).filter(Boolean),
        media: mediaItems,
      };

      const res = await createAdminProduct(payload);

      setFeedback({
        type: "success",
        message: publish
          ? `Product "${res.name}" published to storefront!`
          : `Draft "${res.name}" saved to database.`,
      });

      setTimeout(() => {
        router.push("/admin/products");
      }, 1500);
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err?.message || "Failed to save product.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div className="flex items-center space-x-4">
          <Link
            href="/admin/products"
            className="p-2 border border-border hover:border-gold rounded text-muted hover:text-ink transition-colors"
            title="Return to Product List"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <span className="text-xs uppercase tracking-caps text-gold font-medium block mb-0.5">
              Product Studio &middot; Real PostgreSQL Persistence
            </span>
            <h1 className="font-display text-3xl text-ink font-normal">
              Create New Garment
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSubmit(false)}
            className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs uppercase tracking-caps font-semibold border border-border hover:border-gold text-ink transition-colors disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>Save Draft</span>
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSubmit(true)}
            className="inline-flex items-center space-x-1.5 px-5 py-2 text-xs uppercase tracking-caps font-semibold bg-navy hover:bg-gold hover:text-navy text-canvas transition-colors shadow-sm disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>Publish to Storefront</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          role="status"
          className={`p-4 text-xs flex items-center space-x-2 border-l-4 shadow-sm ${
            feedback.type === "success"
              ? "bg-stock-ok/10 text-stock-ok border-stock-ok"
              : "bg-rust/10 text-rust border-rust"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Main Grid: Form (7 cols) + Live Card Preview (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form Fields Column */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section 1: Basic Identifiers */}
          <div className="bg-surface border border-border p-6 space-y-4">
            <h2 className="font-display text-lg text-ink font-normal pb-3 border-b border-border">
              Garment Silhouette &amp; Categorization
            </h2>

            <div className="space-y-1">
              <label className="text-xs uppercase tracking-caps text-muted font-medium block">
                Product Title *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full bg-canvas border border-border p-2.5 text-xs text-ink focus:border-gold focus:outline-none"
                placeholder="e.g. Double-Pleat Gurkha Trouser"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs uppercase tracking-caps text-muted font-medium block">
                  Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-canvas border border-border p-2.5 text-xs text-ink focus:border-gold focus:outline-none"
                >
                  <option value="Shirts">Shirts</option>
                  <option value="Trousers">Trousers</option>
                  <option value="Tailoring">Tailoring</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-caps text-muted font-medium block">
                  Editorial Badge
                </label>
                <select
                  value={badge || ""}
                  onChange={(event) => {
                    const value = event.target.value;
                    setBadge(
                      value === "New" || value === "Limited" || value === "Atelier Pick" || value === "Core"
                        ? value
                        : undefined
                    );
                  }}
                  className="w-full bg-canvas border border-border p-2.5 text-xs text-ink focus:border-gold focus:outline-none"
                >
                  <option value="">None (Standard)</option>
                  <option value="New">New</option>
                  <option value="Limited">Limited</option>
                  <option value="Atelier Pick">Atelier Pick</option>
                  <option value="Core">Core</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs uppercase tracking-caps text-muted font-medium block">
                  Base SKU Prefix *
                </label>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value.toUpperCase())}
                  className="w-full bg-canvas border border-border p-2.5 text-xs text-ink font-mono focus:border-gold focus:outline-none"
                  placeholder="e.g. TRS-GRK-007"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-caps text-muted font-medium block">
                  URL Route Slug
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full bg-canvas border border-border p-2.5 text-xs text-muted font-mono focus:border-gold focus:outline-none"
                  placeholder="auto-generated-from-name"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Craft Details & Pricing */}
          <div className="bg-surface border border-border p-6 space-y-4">
            <h2 className="font-display text-lg text-ink font-normal pb-3 border-b border-border">
              Material, Tailoring &amp; Price
            </h2>

            <div className="space-y-1">
              <label className="text-xs uppercase tracking-caps text-muted font-medium block">
                Textile &amp; Fabric Specification *
              </label>
              <input
                type="text"
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                className="w-full bg-canvas border border-border p-2.5 text-xs text-ink focus:border-gold focus:outline-none"
                placeholder="e.g. 100% Belgian Heavy Linen (220gsm)"
              />
            </div>

            <FabricSpecificationFields
              value={fabricSpecifications}
              onChange={setFabricSpecifications}
            />

            <div className="space-y-1">
              <label className="text-xs uppercase tracking-caps text-muted font-medium block">
                Selling Price (INR) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-xs">₹</span>
                <input
                  type="number"
                  value={priceRupees}
                  onChange={(e) => setPriceRupees(e.target.value)}
                  className="w-full bg-canvas border border-border pl-8 pr-4 py-2.5 text-xs text-ink font-semibold tabular-nums focus:border-gold focus:outline-none"
                  placeholder="e.g. 11800"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs uppercase tracking-caps text-muted font-medium block">
                Editorial Description *
              </label>
              <textarea
                rows={3}
                maxLength={1000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-canvas border border-border p-2.5 text-xs text-ink focus:border-gold focus:outline-none leading-relaxed"
                placeholder="Describe the cut, drape, construction, and defining details."
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs uppercase tracking-caps text-muted font-medium block">
                Long Description
              </label>
              <textarea
                rows={4}
                maxLength={4000}
                value={longDescription}
                onChange={(event) => setLongDescription(event.target.value)}
                className="w-full bg-canvas border border-border p-2.5 text-xs text-ink focus:border-gold focus:outline-none leading-relaxed"
                placeholder="Optional extended product story and construction notes."
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-xs uppercase tracking-caps text-muted">
                Garment details (one per line)
                <textarea
                  rows={4}
                  value={detailsText}
                  onChange={(event) => setDetailsText(event.target.value)}
                  className="w-full bg-canvas border border-border p-2.5 text-xs normal-case tracking-normal text-ink focus:border-gold focus:outline-none"
                  placeholder={"Double-pleated front\nHorn buttons"}
                />
              </label>
              <label className="space-y-1 text-xs uppercase tracking-caps text-muted">
                Care instructions (one per line)
                <textarea
                  rows={4}
                  value={careInstructionsText}
                  onChange={(event) => setCareInstructionsText(event.target.value)}
                  className="w-full bg-canvas border border-border p-2.5 text-xs normal-case tracking-normal text-ink focus:border-gold focus:outline-none"
                  placeholder={"Dry clean only\nStore on a padded hanger"}
                />
              </label>
            </div>

            {/* Sizing Matrix */}
            <div className="space-y-2 pt-2 border-t border-border">
              <label className="text-xs uppercase tracking-caps text-muted font-medium block">
                Available Size Variants *
              </label>
              <div className="flex flex-wrap gap-2">
                {["S", "M", "L", "XL", "30", "32", "34", "36", "38", "40", "42", "44"].map((sz) => {
                  const selected = selectedSizes.includes(sz);
                  return (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => {
                        if (selected) {
                          if (selectedSizes.length > 1) {
                            setSelectedSizes(selectedSizes.filter((s) => s !== sz));
                          }
                        } else {
                          setSelectedSizes([...selectedSizes, sz]);
                        }
                      }}
                      className={`px-3 py-1.5 text-xs font-mono border transition-colors ${
                        selected
                          ? "bg-navy text-canvas border-navy"
                          : "bg-surface-muted text-muted border-border hover:border-gold"
                      }`}
                    >
                      {sz}
                    </button>
                  );
                })}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-xs uppercase tracking-caps text-muted">
                  Color name *
                  <input
                    value={colorName}
                    onChange={(event) => setColorName(event.target.value)}
                    maxLength={50}
                    placeholder="e.g. Midnight navy"
                    className="w-full border border-border bg-canvas p-2.5 text-xs normal-case tracking-normal text-ink focus:border-gold focus:outline-none"
                  />
                </label>
              </div>
              {selectedSizes.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {selectedSizes.map((size) => (
                    <label key={size} className="space-y-1 text-[10px] uppercase tracking-caps text-muted">
                      Size {size} stock
                      <input
                        type="number"
                        min="0"
                        value={stockBySize[size] ?? 0}
                        onChange={(event) => setStockBySize({
                          ...stockBySize,
                          [size]: Math.max(0, Number(event.target.value) || 0),
                        })}
                        className="w-full border border-border bg-canvas p-2 text-xs normal-case tracking-normal text-ink focus:border-gold focus:outline-none"
                      />
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-surface border border-border p-6">
            <ProductMediaManager
              items={mediaItems}
              onChange={setMediaItems}
              productName={name}
              material={material}
            />
          </div>
        </div>

        {/* Right Column: Live Product Card Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-24">
          <div className="bg-surface border border-border p-4 flex items-center justify-between">
            <span className="text-xs uppercase tracking-caps text-gold font-medium flex items-center space-x-1.5">
              <Eye className="w-4 h-4" />
              <span>Live ProductCard Preview</span>
            </span>
            <span className="text-[11px] text-muted">Renders real component</span>
          </div>

          <div className="max-w-sm mx-auto">
            <ProductCard product={liveProduct} priority />
          </div>

          <p className="text-center text-[11px] text-muted font-sans">
            Storefront and admin use the exact same base <code className="font-mono text-ink">ProductCard</code> contract and price formatters.
          </p>
        </div>
      </div>
    </div>
  );
}
