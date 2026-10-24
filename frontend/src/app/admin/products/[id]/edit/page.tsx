"use client";

import { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ProductCard } from "@/components/product/ProductCard";
import type { ProductViewModel } from "@/components/product/product.types";
import {
  getAdminProductById,
  updateAdminProduct,
  publishAdminProduct,
  unpublishAdminProduct,
} from "@/lib/api/catalog";
import { generateAiMedia, uploadMediaAsset } from "@/lib/api/media";
import {
  ArrowLeft,
  Sparkles,
  Upload,
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Product Form State
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState("Shirts");
  const [material, setMaterial] = useState("");
  const [priceRupees, setPriceRupees] = useState("0");
  const [description, setDescription] = useState("");
  const [badge, setBadge] = useState<"New" | "Limited" | "Atelier Pick" | undefined>(undefined);
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED" | "ARCHIVED">("DRAFT");
  const [imageUrl, setImageUrl] = useState<string>("");
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
          setPriceRupees(String(Math.round((prod.pricePaise || 0) / 100)));
          setDescription(prod.description || "");
          setBadge(prod.badge || undefined);
          setStatus(prod.status || "DRAFT");
          setImageUrl(prod.media?.[0]?.url || "");
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
    imageUrl: imageUrl || undefined,
    isFixture: false,
  };

  const handleGenerateAI = async () => {
    try {
      setIsGenerating(true);
      setFeedback(null);
      const asset = await generateAiMedia({
        productName: name || "Garment",
        material: material || "Fabric",
        categoryName: category,
        productId,
      });
      setImageUrl(asset.url);
      setFeedback({ type: "success", message: "AI Lookbook asset generated and staged!" });
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Generation failed." });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setFeedback(null);
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result as string;
          const asset = await uploadMediaAsset({
            fileName: file.name,
            mimeType: file.type || "image/jpeg",
            fileBase64: base64,
            altText: `${name} - ${file.name}`,
          });
          setImageUrl(asset.url);
          setFeedback({ type: "success", message: "Media asset uploaded successfully!" });
        } catch (uploadErr: any) {
          setFeedback({ type: "error", message: uploadErr?.message || "Upload failed." });
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "File reading failed." });
      setIsUploading(false);
    }
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
        material,
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
        media: imageUrl
          ? [
              {
                url: imageUrl,
                altText: `${name} in ${material}`,
                isPrimary: true,
                sortOrder: 0,
              },
            ]
          : [],
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
                  onChange={(e) => setBadge((e.target.value as any) || undefined)}
                  className="w-full bg-canvas border border-border p-2.5 text-xs text-ink focus:border-gold focus:outline-none"
                >
                  <option value="">None</option>
                  <option value="New">New</option>
                  <option value="Limited">Limited</option>
                  <option value="Atelier Pick">Atelier Pick</option>
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
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-canvas border border-border p-2.5 text-xs text-ink focus:border-gold focus:outline-none leading-relaxed"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-caps text-muted font-medium block">
                Primary Image URL
              </label>
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full bg-canvas border border-border p-2.5 text-xs text-ink font-mono focus:border-gold focus:outline-none"
              />

              <div className="flex flex-wrap gap-2 pt-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/avif"
                  className="hidden"
                  onChange={handleFileUpload}
                />

                <button
                  type="button"
                  onClick={handleGenerateAI}
                  disabled={isGenerating}
                  className="bg-navy text-canvas hover:bg-gold hover:text-navy px-3 py-1.5 text-xs uppercase tracking-caps font-semibold flex items-center space-x-1.5 transition-colors disabled:opacity-50"
                >
                  {isGenerating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>{isGenerating ? "Synthesizing..." : "Generate AI Visual"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="border border-border hover:border-gold px-3 py-1.5 text-xs uppercase tracking-caps font-medium text-ink flex items-center space-x-1.5 transition-colors disabled:opacity-50"
                >
                  {isUploading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5 text-muted" />
                  )}
                  <span>{isUploading ? "Uploading..." : "Upload File"}</span>
                </button>
              </div>
            </div>

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
