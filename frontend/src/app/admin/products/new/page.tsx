"use client";

import { useState } from "react";
import Link from "next/link";
import { ProductCard } from "@/components/product/ProductCard";
import type { ProductViewModel } from "@/components/product/product.types";
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
  Image as ImageIcon,
} from "lucide-react";

export default function NewProductPage() {
  // Product Form State
  const [name, setName] = useState("Artisan Gurkha Pant");
  const [slug, setSlug] = useState("artisan-gurkha-pant");
  const [sku, setSku] = useState("TRS-GRK-007");
  const [category, setCategory] = useState("Trousers");
  const [material, setMaterial] = useState("Heavyweight Irish Linen (340gsm)");
  const [priceRupees, setPriceRupees] = useState("11800");
  const [description, setDescription] = useState(
    "Double pleated forward rise with side buckle adjusters and deep reverse pleats."
  );
  const [badge, setBadge] = useState<"New" | "Limited" | "Atelier Pick" | undefined>("New");
  const [stockStatus, setStockStatus] = useState<"in_stock" | "low_stock">("in_stock");

  // AI Media Workflow State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [imageApproved, setImageApproved] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

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

  // AI Image generation simulation
  const handleGenerateAI = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setGeneratedImage(
        "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=800&q=80"
      );
      setImageApproved(false);
    }, 2000);
  };

  const liveProduct: ProductViewModel = {
    id: "draft-preview",
    name: name || "Untitled Garment",
    slug: slug || "draft-garment",
    category,
    material: material || "Pure Natural Textile",
    pricePaise: (parseInt(priceRupees, 10) || 0) * 100,
    currency: "INR",
    stockStatus,
    badge,
    imageUrl: generatedImage && imageApproved ? generatedImage : undefined,
    isFixture: true,
  };

  const handleSaveDraft = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveFeedback("Draft successfully saved. Product remains unpublished in catalog.");
    setTimeout(() => setSaveFeedback(null), 3500);
  };

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageApproved) {
      setSaveFeedback("Publishing requires an approved primary image media record.");
      setTimeout(() => setSaveFeedback(null), 3500);
      return;
    }
    setSaveFeedback("Product published! It is now live on the public storefront.");
    setTimeout(() => setSaveFeedback(null), 3500);
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
              Product Studio &middot; AI-First Media
            </span>
            <h1 className="font-display text-3xl text-ink font-normal">
              Create New Garment
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={handleSaveDraft}
            className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs uppercase tracking-caps font-semibold border border-border hover:border-gold text-ink transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Draft</span>
          </button>
          <button
            type="button"
            onClick={handlePublish}
            className="inline-flex items-center space-x-1.5 px-5 py-2 text-xs uppercase tracking-caps font-semibold bg-navy hover:bg-gold hover:text-navy text-canvas transition-colors shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Publish to Storefront</span>
          </button>
        </div>
      </div>

      {saveFeedback && (
        <div
          role="status"
          className="bg-navy text-canvas p-4 text-xs flex items-center justify-between border-l-4 border-gold shadow-md"
        >
          <span>{saveFeedback}</span>
        </div>
      )}

      {/* Main Grid: Form (7 cols) + Live Card Preview (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form Fields Column */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section 1: Basic Identifiers */}
          <div className="bg-surface border border-border p-6 space-y-4">
            <h3 className="font-display text-lg text-ink font-medium border-b border-border pb-3">
              1. Garment Details
            </h3>

            <div className="space-y-4 text-xs font-sans">
              <div>
                <label className="block uppercase tracking-caps text-muted font-medium mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full bg-canvas border border-border px-3.5 py-2 text-sm text-ink focus:border-gold focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block uppercase tracking-caps text-muted font-medium mb-1">
                    Route Slug (Auto-suggested) *
                  </label>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="w-full bg-canvas border border-border px-3.5 py-2 text-xs font-mono text-ink focus:border-gold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block uppercase tracking-caps text-muted font-medium mb-1">
                    SKU Identifier *
                  </label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full bg-canvas border border-border px-3.5 py-2 text-xs font-mono text-ink focus:border-gold focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block uppercase tracking-caps text-muted font-medium mb-1">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-canvas border border-border px-3.5 py-2 text-xs text-ink focus:border-gold focus:outline-none"
                  >
                    <option value="Shirts">Shirts</option>
                    <option value="Trousers">Trousers</option>
                    <option value="Tailoring">Tailoring</option>
                  </select>
                </div>

                <div>
                  <label className="block uppercase tracking-caps text-muted font-medium mb-1">
                    Price (₹ INR) *
                  </label>
                  <input
                    type="number"
                    required
                    value={priceRupees}
                    onChange={(e) => setPriceRupees(e.target.value)}
                    className="w-full bg-canvas border border-border px-3.5 py-2 text-sm font-semibold tabular-nums text-ink focus:border-gold focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block uppercase tracking-caps text-muted font-medium mb-1">
                  Fabric &amp; Material Composition *
                </label>
                <input
                  type="text"
                  required
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  placeholder="e.g. 100% Belgian Linen (220gsm)"
                  className="w-full bg-canvas border border-border px-3.5 py-2 text-xs text-ink focus:border-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="block uppercase tracking-caps text-muted font-medium mb-1">
                  Short Description *
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-canvas border border-border px-3.5 py-2 text-xs text-ink focus:border-gold focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: AI-First Media Studio */}
          <div className="bg-surface border border-border p-6 space-y-4">
            <div className="border-b border-border pb-3 flex justify-between items-center">
              <div>
                <h3 className="font-display text-lg text-ink font-medium">
                  2. AI Image Generation &amp; Media Studio
                </h3>
                <p className="text-[11px] text-muted font-sans">
                  Generate initial studio asset using standardized menswear art-direction templates.
                </p>
              </div>
              <span className="text-[10px] uppercase tracking-caps bg-gold/10 text-gold px-2 py-0.5 rounded font-medium">
                Milestone 1 Workflow
              </span>
            </div>

            {/* AI Generator Action Panel */}
            <div className="bg-surface-muted border border-border p-5 space-y-4">
              <div className="space-y-1">
                <span className="text-xs uppercase tracking-caps text-navy font-semibold flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-gold" />
                  <span>Art-Direction Prompt Constructor</span>
                </span>
                <p className="text-[11px] text-muted font-mono bg-canvas p-2.5 border border-border leading-relaxed">
                  "Studio product photograph of {name || "garment"}. Category: {category}. Material: {material}. 4:5 vertical crop, neutral warm-gray studio backdrop, tailored lighting, natural cloth drape."
                </p>
              </div>

              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleGenerateAI}
                  disabled={isGenerating}
                  className="bg-navy text-canvas hover:bg-gold hover:text-navy px-4 py-2 text-xs uppercase tracking-caps font-semibold flex items-center space-x-2 transition-colors disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating Asset...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-gold" />
                      <span>Generate First Image</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="border border-border hover:border-gold px-4 py-2 text-xs uppercase tracking-caps font-medium text-ink flex items-center space-x-2 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5 text-muted" />
                  <span>Upload Image Instead</span>
                </button>
              </div>
            </div>

            {/* Generated Image Review Section */}
            {generatedImage && (
              <div className="border border-border p-4 bg-canvas space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="inline-flex items-center space-x-1 text-gold font-medium">
                    <Sparkles className="w-3 h-3" />
                    <span>AI-Generated &middot; Draft Staging Asset</span>
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
