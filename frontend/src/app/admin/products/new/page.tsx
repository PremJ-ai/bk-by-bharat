"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ProductCard } from "@/components/product/ProductCard";
import type { ProductViewModel } from "@/components/product/product.types";
import { createAdminProduct } from "@/lib/api/catalog";
import { generateAiMedia, uploadMediaAsset } from "@/lib/api/media";
import {
  ArrowLeft,
  Sparkles,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Eye,
  Save,
  Send,
  Loader2,
} from "lucide-react";

export default function NewProductPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Product Form State
  const [name, setName] = useState("Artisan Gurkha Pant");
  const [slug, setSlug] = useState("artisan-gurkha-pant");
  const [sku, setSku] = useState("TRS-GRK-007");
  const [category, setCategory] = useState("Trousers");
  const [material, setMaterial] = useState("Heavyweight Irish Linen (340gsm)");
  const [priceRupees, setPriceRupees] = useState("11800");
  const [description, setDescription] = useState(
    "Double pleated forward rise with solid brass side buckle adjusters and deep reverse pleats."
  );
  const [badge, setBadge] = useState<"New" | "Limited" | "Atelier Pick" | undefined>("New");
  const [selectedSizes, setSelectedSizes] = useState<string[]>(["30", "32", "34", "36"]);

  // AI Media Workflow State
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(
    "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=1200&q=85"
  );
  const [imageApproved, setImageApproved] = useState(true);
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

  // AI Image generation trigger
  const handleGenerateAI = async () => {
    try {
      setIsGenerating(true);
      setFeedback(null);
      const asset = await generateAiMedia({
        productName: name || "Bespoke Garment",
        material: material || "Pure Linen",
        categoryName: category,
      });
      setGeneratedImage(asset.url);
      setImageApproved(false);
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Failed to generate AI visual." });
    } finally {
      setIsGenerating(false);
    }
  };

  // Direct file upload handler
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
          setGeneratedImage(asset.url);
          setImageApproved(true);
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

  const pricePaise = (parseInt(priceRupees, 10) || 0) * 100;

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
    imageUrl: generatedImage && imageApproved ? generatedImage : undefined,
    isFixture: false,
  };

  const handleSubmit = async (publish: boolean) => {
    try {
      setIsSubmitting(true);
      setFeedback(null);

      if (!name || name.trim().length < 2) {
        throw new Error("Product name is required.");
      }
      if (!pricePaise || pricePaise <= 0) {
        throw new Error("Please enter a valid price in INR.");
      }
      if (publish && (!generatedImage || !imageApproved)) {
        throw new Error("Publishing requires an approved product image.");
      }

      const variants = selectedSizes.map((size) => ({
        sku: `${sku}-${size}`,
        size,
        colorName: "Standard Atelier",
        colorHex: "#0A192F",
        stock: 8,
      }));

      const media =
        generatedImage && imageApproved
          ? [
              {
                url: generatedImage,
                altText: `${name} in ${material}`,
                isPrimary: true,
                sortOrder: 0,
                source: "AI_GENERATED" as const,
              },
            ]
          : [];

      const payload = {
        name,
        slug: slug || undefined,
        description,
        material,
        categoryName: category,
        pricePaise,
        badge: badge || undefined,
        status: (publish ? "PUBLISHED" : "DRAFT") as "PUBLISHED" | "DRAFT",
        variants,
        media,
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
                  onChange={(e) => setBadge((e.target.value as any) || undefined)}
                  className="w-full bg-canvas border border-border p-2.5 text-xs text-ink focus:border-gold focus:outline-none"
                >
                  <option value="">None (Standard)</option>
                  <option value="New">New</option>
                  <option value="Limited">Limited</option>
                  <option value="Atelier Pick">Atelier Pick</option>
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
                  placeholder="11800"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs uppercase tracking-caps text-muted font-medium block">
                Editorial Description *
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-canvas border border-border p-2.5 text-xs text-ink focus:border-gold focus:outline-none leading-relaxed"
                placeholder="Brief craft notes regarding cut, drape, and buttons..."
              />
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
            </div>
          </div>

          {/* Section 3: AI Media Generation Workflow */}
          <div className="bg-surface border border-border p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="space-y-0.5">
                <h2 className="font-display text-lg text-ink font-normal flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-gold" />
                  <span>AI Atelier Media Generation</span>
                </h2>
                <p className="text-muted text-[11px] font-sans">
                  Produces 4:5 editorial imagery honoring the specified textile and silhouette.
                </p>
              </div>
            </div>

            <div className="bg-surface-muted border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-ink">Synthesis Art Direction</span>
                <span className="text-[10px] uppercase tracking-caps text-gold font-semibold">
                  Studio Lighting &middot; Neutral Void
                </span>
              </div>
              <p className="text-xs text-muted leading-relaxed font-sans">
                Prompt template automatically synthesizes: <span className="text-ink font-medium">{name}</span> constructed from <span className="text-ink font-medium">{material}</span> with architectural studio crop.
              </p>

              <div className="pt-2 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleGenerateAI}
                  disabled={isGenerating}
                  className="bg-navy text-canvas hover:bg-gold hover:text-navy px-4 py-2 text-xs uppercase tracking-caps font-semibold flex items-center space-x-2 transition-colors disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Synthesizing Atelier Asset...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Generate AI Product Image</span>
                    </>
                  )}
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/avif"
                  className="hidden"
                  onChange={handleFileUpload}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="border border-border hover:border-gold px-4 py-2 text-xs uppercase tracking-caps font-medium text-ink flex items-center space-x-2 transition-colors disabled:opacity-50"
                >
                  {isUploading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5 text-muted" />
                  )}
                  <span>{isUploading ? "Uploading..." : "Upload File"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const url = prompt("Enter image URL:", "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=800&q=80");
                    if (url) {
                      setGeneratedImage(url);
                      setImageApproved(true);
                    }
                  }}
                  className="border border-border hover:border-gold px-4 py-2 text-xs uppercase tracking-caps font-medium text-ink flex items-center space-x-2 transition-colors"
                >
                  <span>Set Image URL</span>
                </button>
              </div>
            </div>

            {/* Generated Image Review Section */}
            {generatedImage && (
              <div className="border border-border p-4 bg-canvas space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="inline-flex items-center space-x-1 text-gold font-medium">
                    <Sparkles className="w-3 h-3" />
                    <span>AI-Generated / Staged Asset</span>
                  </span>
                  <span className="text-[11px] text-muted">Dimensions: 800 x 1000px</span>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-border">
                  <span className="text-xs text-muted font-sans">
                    {imageApproved
                      ? "Approved for primary storefront display."
                      : "Review asset and approve for catalog display."}
                  </span>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleGenerateAI}
                      className="border border-border hover:border-gold px-3 py-1.5 text-xs text-ink flex items-center space-x-1"
                    >
                      <RefreshCw className="w-3 h-3 text-muted" />
                      <span>Regenerate</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setImageApproved(!imageApproved)}
                      className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider flex items-center space-x-1 ${
                        imageApproved
                          ? "bg-stock-ok text-white"
                          : "bg-gold text-navy hover:bg-gold/90"
                      }`}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{imageApproved ? "Approved As Primary" : "Approve & Use Image"}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
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
