"use client";

import { useState, useEffect, use } from "react";
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
import {
  getAdminProductById,
  updateAdminProduct,
} from "@/lib/api/catalog";
import type { AdminProductMediaItem } from "@/lib/api/media";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Eye,
  Save,
  Send,
  Loader2,
  EyeOff,
} from "lucide-react";

interface EditProductPageProps {
  params: Promise<{ id: string }>;
}

export default function EditProductPage({ params }: EditProductPageProps) {
  const resolvedParams = use(params);
  const productId = resolvedParams.id;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Product Form State
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState("Shirts");
  const [material, setMaterial] = useState("");
  const [fabricSpecifications, setFabricSpecifications] = useState(emptyFabricSpecificationForm);
  const [priceRupees, setPriceRupees] = useState("");
  const [description, setDescription] = useState("");
  const [longDescription, setLongDescription] = useState("");
  const [detailsText, setDetailsText] = useState("");
  const [careInstructionsText, setCareInstructionsText] = useState("");
  const [badge, setBadge] = useState<"New" | "Limited" | "Atelier Pick" | "Core" | undefined>(undefined);
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED" | "ARCHIVED">("DRAFT");
  const [mediaItems, setMediaItems] = useState<AdminProductMediaItem[]>([]);
  const [variants, setVariants] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;

    getAdminProductById(productId)
      .then((prod) => {
        if (!cancelled && prod) {
          setName(prod.name || "");
          setSlug(prod.slug || "");
          setCategory(prod.category || "Shirts");
          setMaterial(prod.material || "");
          setFabricSpecifications({
            ...emptyFabricSpecificationForm(),
            fabricName: prod.fabricSpecifications?.fabricName || "",
            composition: prod.fabricSpecifications?.composition || "",
            fibrePercentages: (prod.fabricSpecifications?.fibrePercentages || []).map((item) => ({
              fibre: item.fibre,
              percentage: String(item.percentage),
            })),
            weightGsm: prod.fabricSpecifications?.weightGsm ? String(prod.fabricSpecifications.weightGsm) : "",
            weave: prod.fabricSpecifications?.weave || "",
            texture: prod.fabricSpecifications?.texture || "",
            stretch: prod.fabricSpecifications?.stretch || "",
            origin: prod.fabricSpecifications?.origin || "",
            finish: prod.fabricSpecifications?.finish || "",
            fit: prod.fabricSpecifications?.fit || "",
            pattern: prod.fabricSpecifications?.pattern || "",
            colour: prod.fabricSpecifications?.colour || "",
          });
          setPriceRupees(String(Math.round((prod.pricePaise || 0) / 100)));
          setDescription(prod.description || "");
          setLongDescription(typeof prod.longDescription === "string" ? prod.longDescription : "");
          setDetailsText((prod.details || []).join("\n"));
          setCareInstructionsText((prod.careInstructions || []).join("\n"));
          setBadge(prod.badge || undefined);
          setStatus(prod.status || "DRAFT");
          setMediaItems((prod.media || []).map((item, index) => ({ ...item, sortOrder: index })));
          setVariants(prod.variants || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setFeedback({
            type: "error",
            message: err?.message || "Failed to load product data.",
          });
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [productId]);

  const pricePaise = (parseInt(priceRupees, 10) || 0) * 100;
  const primaryImage = mediaItems.find((item) => item.mediaType === "IMAGE" && item.isPrimary);

  const liveProduct: ProductViewModel = {
    id: productId,
    name: name || "Untitled Garment",
    slug: slug || "draft-garment",
    category,
    material: material || "Pure Natural Textile",
    pricePaise,
    currency: "INR",
    stockStatus: variants.some((v) => v.stock > 0) ? "in_stock" : "out_of_stock",
    badge,
    imageUrl: primaryImage?.url,
    isFixture: false,
  };

  const handleSave = async (publish?: boolean) => {
    try {
      setIsSubmitting(true);
      setFeedback(null);

      const targetStatus = publish !== undefined ? (publish ? "PUBLISHED" : "DRAFT") : status;

      const payload = {
        name,
        slug,
        description,
        longDescription: longDescription.trim() || undefined,
        material,
        fabricSpecifications: toFabricSpecifications(fabricSpecifications),
        categoryName: category,
        pricePaise,
        badge: badge || undefined,
        status: targetStatus,
        variants: variants.map((v) => ({
          sku: v.sku,
          size: v.size,
          colorName: v.colorName || "Standard",
          stock: Number(v.stock) || 0,
        })),
        details: detailsText.split("\n").map((item) => item.trim()).filter(Boolean),
        careInstructions: careInstructionsText.split("\n").map((item) => item.trim()).filter(Boolean),
        media: mediaItems,
      };

      const res = await updateAdminProduct(productId, payload);
      setStatus(res.status);

      setFeedback({
        type: "success",
        message: `Product "${res.name}" updated successfully!`,
      });

      setTimeout(() => {
        router.push("/admin/products");
      }, 1200);
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err?.message || "Failed to update product.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-navy" />
        <span className="text-xs text-muted">Loading garment from database...</span>
      </div>
    );
  }

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
              Edit Product &middot; {status}
            </span>
            <h1 className="font-display text-3xl text-ink font-normal">
              {name || "Edit Silhouette"}
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSave()}
            className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs uppercase tracking-caps font-semibold border border-border hover:border-gold text-ink transition-colors disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>Save Changes</span>
          </button>

          {status === "PUBLISHED" ? (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSave(false)}
              className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs uppercase tracking-caps font-semibold border border-rust text-rust hover:bg-rust hover:text-white transition-colors disabled:opacity-50"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>Unpublish</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSave(true)}
              className="inline-flex items-center space-x-1.5 px-5 py-2 text-xs uppercase tracking-caps font-semibold bg-navy hover:bg-gold hover:text-navy text-canvas transition-colors shadow-sm disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Publish Live</span>
            </button>
          )}
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
          <div className="bg-surface border border-border p-6 space-y-4">
            <h2 className="font-display text-lg text-ink font-normal pb-3 border-b border-border">
              Core Identifiers
            </h2>

            <div className="space-y-1">
              <label className="text-xs uppercase tracking-caps text-muted font-medium block">
                Product Title *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-canvas border border-border p-2.5 text-xs text-ink focus:border-gold focus:outline-none"
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
                  <option value="">None</option>
                  <option value="New">New</option>
                  <option value="Limited">Limited</option>
                  <option value="Atelier Pick">Atelier Pick</option>
                  <option value="Core">Core</option>
                </select>
              </div>
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
              />
            </div>
          </div>

          <div className="bg-surface border border-border p-6 space-y-4">
            <h2 className="font-display text-lg text-ink font-normal pb-3 border-b border-border">
              Fabric, Tailoring &amp; Price
            </h2>

            <div className="space-y-1">
              <label className="text-xs uppercase tracking-caps text-muted font-medium block">
                Textile Specification *
              </label>
              <input
                type="text"
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                className="w-full bg-canvas border border-border p-2.5 text-xs text-ink focus:border-gold focus:outline-none"
              />
            </div>

            <FabricSpecificationFields
              value={fabricSpecifications}
              onChange={setFabricSpecifications}
            />

            <div className="space-y-1">
              <label className="text-xs uppercase tracking-caps text-muted font-medium block">
                Price (INR) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-xs">₹</span>
                <input
                  type="number"
                  value={priceRupees}
                  onChange={(e) => setPriceRupees(e.target.value)}
                  className="w-full bg-canvas border border-border pl-8 pr-4 py-2.5 text-xs text-ink font-semibold tabular-nums focus:border-gold focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs uppercase tracking-caps text-muted font-medium block">
                Description *
              </label>
              <textarea
                rows={3}
                maxLength={1000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-canvas border border-border p-2.5 text-xs text-ink focus:border-gold focus:outline-none leading-relaxed"
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
                />
              </label>
              <label className="space-y-1 text-xs uppercase tracking-caps text-muted">
                Care instructions (one per line)
                <textarea
                  rows={4}
                  value={careInstructionsText}
                  onChange={(event) => setCareInstructionsText(event.target.value)}
                  className="w-full bg-canvas border border-border p-2.5 text-xs normal-case tracking-normal text-ink focus:border-gold focus:outline-none"
                />
              </label>
            </div>

            <ProductMediaManager
              items={mediaItems}
              onChange={setMediaItems}
              productName={name}
              material={material}
            />

            {/* Inventory table */}
            <div className="space-y-2 pt-2 border-t border-border">
              <label className="text-xs uppercase tracking-caps text-muted font-medium block">
                Variant Inventory Stocks
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {variants.map((v, idx) => (
                  <div key={v.sku || idx} className="p-2 border border-border bg-canvas">
                    <span className="text-[10px] uppercase font-mono text-muted block">Size {v.size}</span>
                    <input
                      type="number"
                      min="0"
                      value={v.stock}
                      onChange={(e) => {
                        const newStock = parseInt(e.target.value, 10) || 0;
                        setVariants(variants.map((item, i) => (i === idx ? { ...item, stock: newStock } : item)));
                      }}
                      className="w-full bg-transparent text-xs font-semibold text-ink border-b border-border/80 focus:border-gold focus:outline-none mt-1"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Product Card Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-24">
          <div className="bg-surface border border-border p-4 flex items-center justify-between">
            <span className="text-xs uppercase tracking-caps text-gold font-medium flex items-center space-x-1.5">
              <Eye className="w-4 h-4" />
              <span>Live Storefront Preview</span>
            </span>
            <span className="text-[11px] text-muted">Real component</span>
          </div>

          <div className="max-w-sm mx-auto">
            <ProductCard product={liveProduct} priority />
          </div>
        </div>
      </div>
    </div>
  );
}
