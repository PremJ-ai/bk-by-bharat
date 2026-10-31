"use client";

import { useState, use, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ProductCard } from "@/components/product/ProductCard";
import type { ProductViewModel } from "@/components/product/product.types";
import { getStorefrontProducts } from "@/lib/api/catalog";
import { SlidersHorizontal, ChevronRight, X, RotateCcw } from "lucide-react";
import { SectionReveal } from "@/components/motion/SectionReveal";
import { StaggeredGrid } from "@/components/motion/StaggeredGrid";

const COLLECTION_PAGE_SIZE = 20;

interface CollectionPageProps {
  params: Promise<{ slug: string }>;
}

export default function CollectionPage({ params }: CollectionPageProps) {
  const resolvedParams = use(params);
  const searchParams = useSearchParams();
  const categorySlug = resolvedParams.slug.toLowerCase();
  const searchQuery = searchParams.get("search")?.trim() || "";

  // Active filter state
  const [selectedCategory, setSelectedCategory] = useState<string>(categorySlug);
  const [sortBy, setSortBy] = useState<string>("newest");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedMaterial, setSelectedMaterial] = useState<string>("all");
  const [selectedSize, setSelectedSize] = useState<string>("all");
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState<boolean>(false);

  // Products from backend
  const [products, setProducts] = useState<ProductViewModel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const activeCategory = selectedCategory || categorySlug;
  const totalPages = Math.ceil(total / COLLECTION_PAGE_SIZE);

  useEffect(() => {
    setSelectedCategory(categorySlug);
  }, [categorySlug]);

  useEffect(() => {
    setPage(1);
  }, [activeCategory, selectedMaterial, selectedSize, inStockOnly, sortBy, searchQuery]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setCatalogError(null);

    getStorefrontProducts({
      category: activeCategory,
      material: selectedMaterial !== "all" ? selectedMaterial : undefined,
      size: selectedSize !== "all" ? selectedSize : undefined,
      inStock: inStockOnly,
      sortBy,
      search: searchQuery || undefined,
      page,
      limit: COLLECTION_PAGE_SIZE,
    })
      .then((res) => {
        if (!cancelled) {
          setProducts(res.items);
          setTotal(res.total);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("Unable to load collection from the catalog API:", err);
          setProducts([]);
          setTotal(0);
          setCatalogError("The catalog is temporarily unavailable. Please try again shortly.");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeCategory, selectedMaterial, selectedSize, inStockOnly, sortBy, searchQuery, page]);

  const filteredProducts = products;

  const hasActiveFilters = selectedMaterial !== "all" || selectedSize !== "all" || inStockOnly;

  const resetFilters = () => {
    setSelectedMaterial("all");
    setSelectedSize("all");
    setInStockOnly(false);
    setSortBy("newest");
  };

  const getCategoryTitle = () => {
    if (activeCategory === "shirts") return "Tailored Shirts";
    if (activeCategory === "trousers") return "Structured Trousers";
    if (activeCategory === "tailoring") return "Atelier Tailoring";
    return "Complete Atelier Collection";
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
        <SectionReveal className="pb-10 border-b border-border">
          <div className="max-w-2xl space-y-3">
            <span className="text-xs uppercase tracking-caps text-gold font-medium block">
              Bharat Atelier collection
            </span>
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl text-ink font-normal leading-[1.08]">
              {getCategoryTitle()}
            </h1>
            <p className="text-muted text-sm sm:text-base leading-relaxed font-sans pt-1">
              Browse available {getCategoryTitle().toLowerCase()} and filter by material, size, and stock.
            </p>
            {searchQuery && (
              <p className="text-sm text-muted" role="status">
                Search results for <span className="font-medium text-ink">“{searchQuery}”</span>
                {" · "}
                <Link
                  href={`/collections/${activeCategory}`}
                  className="text-navy underline underline-offset-4 hover:text-gold"
                >
                  Clear search
                </Link>
              </p>
            )}
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
        </SectionReveal>

        {/* 3. Product Toolbar (Sort & Filters) */}
        <div className="py-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Result Count & Active Filter Indicator */}
          <div className="flex items-center space-x-3 text-xs text-muted font-sans">
            <span className="font-medium text-ink">
            {loading
              ? "Loading designs…"
              : total === 0
              ? "Showing 0 designs"
              : `Showing ${(page - 1) * COLLECTION_PAGE_SIZE + 1}–${Math.min(
                  page * COLLECTION_PAGE_SIZE,
                  total
                )} of ${total} designs`}
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
                <option value="newest">Newest First</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="name-asc">Design Name (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* 4. Product Grid or Empty State */}
        <section className="py-12">
          {catalogError ? (
            <div className="py-24 text-center space-y-4 max-w-md mx-auto" role="alert">
              <h3 className="font-display text-2xl text-ink font-normal">Catalog unavailable</h3>
              <p className="text-muted text-xs leading-relaxed font-sans">{catalogError}</p>
            </div>
          ) : loading ? (
            <div className="py-24 text-center text-sm text-muted" role="status">
              Loading the collection…
            </div>
          ) : filteredProducts.length === 0 ? (
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
            <StaggeredGrid productGrid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product, idx) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  priority={idx < 4}
                />
              ))}
            </StaggeredGrid>
          )}

          {!catalogError && !loading && totalPages > 1 && (
            <nav aria-label="Collection pages" className="mt-10 flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page === 1 || loading}
                className="border border-border px-4 py-2 text-xs uppercase tracking-caps text-ink transition-colors hover:border-gold disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-xs text-muted" aria-live="polite">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page === totalPages || loading}
                className="border border-border px-4 py-2 text-xs uppercase tracking-caps text-ink transition-colors hover:border-gold disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </nav>
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
