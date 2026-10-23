"use client";

import { useState, useMemo, use } from "react";
import Link from "next/link";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ProductCard } from "@/components/product/ProductCard";
import { MOCK_PRODUCTS, DetailedProduct } from "@/components/product/mockFixtures";
import { SlidersHorizontal, ChevronRight, X, RotateCcw } from "lucide-react";

interface CollectionPageProps {
  params: Promise<{ slug: string }>;
}

export default function CollectionPage({ params }: CollectionPageProps) {
  const resolvedParams = use(params);
  const categorySlug = resolvedParams.slug.toLowerCase();

  // Active filter state
  const [selectedCategory, setSelectedCategory] = useState<string>(categorySlug);
  const [sortBy, setSortBy] = useState<string>("featured");
  const [selectedMaterial, setSelectedMaterial] = useState<string>("all");
  const [selectedSize, setSelectedSize] = useState<string>("all");
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState<boolean>(false);

  // Sync category if URL slug changes
  const activeCategory = selectedCategory || categorySlug;

  // Filtered and sorted products
  const filteredProducts = useMemo(() => {
    return MOCK_PRODUCTS.filter((product) => {
      // Category match
      if (activeCategory !== "all" && product.category.toLowerCase() !== activeCategory) {
        return false;
      }
      // Material match
      if (selectedMaterial !== "all" && !product.material.toLowerCase().includes(selectedMaterial.toLowerCase())) {
        return false;
      }
      // Size match
      if (selectedSize !== "all" && !product.sizes.some((s) => s.size === selectedSize && s.available)) {
        return false;
      }
      // Stock match
      if (inStockOnly && product.stockStatus !== "in_stock") {
        return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === "price-asc") return a.pricePaise - b.pricePaise;
      if (sortBy === "price-desc") return b.pricePaise - a.pricePaise;
      if (sortBy === "name-asc") return a.name.localeCompare(b.name);
      return 0; // Default featured order
    });
  }, [activeCategory, selectedMaterial, selectedSize, inStockOnly, sortBy]);

  const hasActiveFilters = selectedMaterial !== "all" || selectedSize !== "all" || inStockOnly;

  const resetFilters = () => {
    setSelectedMaterial("all");
    setSelectedSize("all");
    setInStockOnly(false);
    setSortBy("featured");
  };

  const getCategoryTitle = () => {
    if (activeCategory === "shirts") return "Tailored Shirts";
    if (activeCategory === "trousers") return "Structured Trousers";
    if (activeCategory === "tailoring") return "Atelier Tailoring";
    return "Complete Atelier Collection";
  };

  const getCategoryDescription = () => {
    if (activeCategory === "shirts") {
      return "Hand-cut camp collars and band-collar tunics constructed from Belgian linen and Giza 87 Egyptian cotton.";
    }
    if (activeCategory === "trousers") {
      return "High-rise Gurkha trousers and single-pleat chinos cut with generous rise, deep reverse pleats, and uncompromised drape.";
    }
    if (activeCategory === "tailoring") {
      return "Unstructured jackets and heirloom outerwear crafted with soft shoulders, Milanese lapel buttonholes, and zero synthetic padding.";
    }
    return "The complete catalog of editorial menswear essentials crafted in limited runs with artisan precision.";
  };

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-ink">
      <AnnouncementBar />
      <SiteHeader />

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-6 md:px-12 py-10">
        {/* 1. Breadcrumbs */}
        <nav aria-label="Breadcrumbs" className="mb-8">
          <ol className="flex items-center space-x-2 text-xs uppercase tracking-caps text-muted">
            <li>
              <Link href="/" className="hover:text-gold transition-colors">
                Atelier Home
              </Link>
            </li>
            <li>
              <ChevronRight className="w-3 h-3 text-border" />
            </li>
            <li>
              <Link href="/collections/all" className="hover:text-gold transition-colors">
                Collections
              </Link>
            </li>
            <li>
              <ChevronRight className="w-3 h-3 text-border" />
            </li>
            <li className="text-ink font-medium">{getCategoryTitle()}</li>
          </ol>
        </nav>

        {/* 2. Editorial Masthead */}
        <div className="pb-10 border-b border-border">
          <div className="max-w-2xl space-y-3">
            <span className="text-xs uppercase tracking-caps text-gold font-medium block">
              Curated Silhouette &middot; Autumn / Winter 2026
            </span>
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl text-ink font-normal leading-[1.08]">
              {getCategoryTitle()}
            </h1>
            <p className="text-muted text-sm sm:text-base leading-relaxed font-sans pt-1">
              {getCategoryDescription()}
            </p>
          </div>

          {/* Category Navigation Tabs */}
          <div className="mt-8 flex flex-wrap gap-2 pt-2">
            {[
              { id: "all", label: "All Works" },
              { id: "shirts", label: "Shirts" },
              { id: "trousers", label: "Trousers" },
              { id: "tailoring", label: "Tailoring" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedCategory(tab.id)}
                className={`px-4 py-2 text-xs uppercase tracking-caps font-medium transition-colors border ${
                  activeCategory === tab.id
                    ? "bg-navy text-canvas border-navy"
                    : "bg-surface text-ink border-border hover:border-gold hover:text-gold"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Product Toolbar (Sort & Filters) */}
        <div className="py-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Result Count & Active Filter Indicator */}
          <div className="flex items-center space-x-3 text-xs text-muted font-sans">
            <span className="font-medium text-ink">
              Showing {filteredProducts.length} {filteredProducts.length === 1 ? "design" : "designs"}
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center space-x-1 text-gold hover:underline font-medium"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          {/* Filter Controls (Desktop) & Mobile Trigger */}
          <div className="flex items-center space-x-4">
            {/* Mobile Filter Button */}
            <button
              type="button"
              onClick={() => setMobileFilterOpen(true)}
              className="lg:hidden inline-flex items-center space-x-2 bg-surface border border-border px-3.5 py-2 text-xs uppercase tracking-caps font-medium hover:border-gold transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters {hasActiveFilters && "•"}</span>
            </button>

            {/* Desktop Quick Facets */}
            <div className="hidden lg:flex items-center space-x-3 text-xs">
              {/* Material Facet */}
              <select
                aria-label="Filter by material"
                value={selectedMaterial}
                onChange={(e) => setSelectedMaterial(e.target.value)}
                className="bg-surface border border-border px-3 py-1.5 text-xs text-ink focus:outline-none focus:border-gold rounded-none"
              >
                <option value="all">All Materials</option>
                <option value="linen">Belgian &amp; Irish Linen</option>
                <option value="cotton">Giza 87 Egyptian Cotton</option>
                <option value="silk">Raw Matka Silk</option>
              </select>

              {/* Size Facet */}
              <select
                aria-label="Filter by size"
                value={selectedSize}
                onChange={(e) => setSelectedSize(e.target.value)}
                className="bg-surface border border-border px-3 py-1.5 text-xs text-ink focus:outline-none focus:border-gold rounded-none"
              >
                <option value="all">All Sizes</option>
                <option value="S">Size S (38)</option>
                <option value="M">Size M (40)</option>
                <option value="L">Size L (42)</option>
                <option value="30">Waist 30"</option>
                <option value="32">Waist 32"</option>
                <option value="34">Waist 34"</option>
              </select>

              {/* In-stock Toggle */}
              <label className="inline-flex items-center space-x-2 cursor-pointer select-none text-xs text-ink pl-1">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="rounded-none border-border text-navy focus:ring-gold"
                />
                <span>In Atelier Only</span>
              </label>
            </div>

            {/* Sort Select */}
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-muted hidden sm:inline">Sort:</span>
              <select
                aria-label="Sort products"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-surface border border-border px-3 py-1.5 text-xs text-ink focus:outline-none focus:border-gold rounded-none font-medium"
              >
                <option value="featured">Featured Sequence</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="name-asc">Design Name (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* 4. Product Grid or Empty State */}
        <section className="py-12">
          {filteredProducts.length === 0 ? (
            <div className="py-24 text-center space-y-4 max-w-md mx-auto">
              <h3 className="font-display text-2xl text-ink font-normal">
                No matching garments found
              </h3>
              <p className="text-muted text-xs leading-relaxed font-sans">
                Try widening your search or clearing active material and sizing filters.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="bg-navy text-canvas px-6 py-2.5 text-xs uppercase tracking-caps font-semibold hover:bg-gold hover:text-navy transition-colors"
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product, idx) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  priority={idx < 4}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Mobile Filter Drawer / Bottom Sheet */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end lg:hidden">
          <div
            className="fixed inset-0 bg-navy-strong/60 backdrop-blur-xs"
            onClick={() => setMobileFilterOpen(false)}
          />
          <div className="relative bg-surface border-t border-border p-6 max-h-[85vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <h3 className="font-display text-xl text-ink">Filter Collection</h3>
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="p-1 text-muted hover:text-ink"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Material Filter */}
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-caps text-gold font-medium block">
                Material Composition
              </label>
              <select
                value={selectedMaterial}
                onChange={(e) => setSelectedMaterial(e.target.value)}
                className="w-full bg-surface border border-border p-2.5 text-xs text-ink"
              >
                <option value="all">All Natural Fibers</option>
                <option value="linen">Belgian &amp; Irish Linen</option>
                <option value="cotton">Giza 87 Egyptian Cotton</option>
                <option value="silk">Raw Matka Silk</option>
              </select>
            </div>

            {/* Sizing Filter */}
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-caps text-gold font-medium block">
                Available Size
              </label>
              <select
                value={selectedSize}
                onChange={(e) => setSelectedSize(e.target.value)}
                className="w-full bg-surface border border-border p-2.5 text-xs text-ink"
              >
                <option value="all">All Sizes</option>
                <option value="S">Size S (38)</option>
                <option value="M">Size M (40)</option>
                <option value="L">Size L (42)</option>
                <option value="30">Waist 30"</option>
                <option value="32">Waist 32"</option>
                <option value="34">Waist 34"</option>
              </select>
            </div>

            {/* In stock check */}
            <div className="pt-2">
              <label className="flex items-center space-x-2 text-xs text-ink cursor-pointer">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="rounded-none border-border text-navy"
                />
                <span>In Atelier (Ready for Immediate Dispatch)</span>
              </label>
            </div>

            {/* Actions */}
            <div className="pt-4 flex space-x-3">
              <button
                type="button"
                onClick={resetFilters}
                className="flex-1 border border-border py-2.5 text-xs uppercase tracking-caps font-medium text-ink hover:border-gold"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="flex-1 bg-navy text-canvas py-2.5 text-xs uppercase tracking-caps font-semibold hover:bg-gold hover:text-navy"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      <SiteFooter />
    </div>
  );
}
