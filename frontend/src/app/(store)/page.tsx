import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { CampaignHero } from "@/components/editorial/CampaignHero";
import { MarqueeTicker } from "@/components/editorial/MarqueeTicker";
import { EditorialSplit } from "@/components/editorial/EditorialSplit";
import { ProductCard } from "@/components/product/ProductCard";
import { getStorefrontCategories, getStorefrontProductBySlug, getStorefrontProducts } from "@/lib/api/catalog";
import type { ProductViewModel } from "@/components/product/product.types";
import type { CategorySummary, DetailedProductModel } from "@/lib/api/catalog";
import { ServiceHighlights } from "@/components/editorial/ServiceHighlights";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SectionReveal } from "@/components/motion/SectionReveal";
import { StaggeredGrid } from "@/components/motion/StaggeredGrid";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

async function loadFeaturedFabric(product: ProductViewModel | undefined): Promise<DetailedProductModel | null> {
  if (!product) return null;
  try {
    return await getStorefrontProductBySlug(product.slug);
  } catch (error) {
    console.error("Unable to load featured product fabric details:", error);
    return null;
  }
}

function ProductGrid({
  products,
  unavailable,
  emptyMessage,
}: {
  products: ProductViewModel[];
  unavailable: boolean;
  emptyMessage: string;
}) {
  if (products.length === 0) {
    return (
      <p className="border border-border bg-surface px-6 py-10 text-center text-sm text-muted">
        {unavailable ? "The collection is temporarily unavailable. Please try again shortly." : emptyMessage}
      </p>
    );
  }
  return (
    <StaggeredGrid productGrid className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} priority={index < 2} />
      ))}
    </StaggeredGrid>
  );
}

function CategoryTiles({
  categories,
  products,
}: {
  categories: CategorySummary[];
  products: ProductViewModel[];
}) {
  if (categories.length === 0) {
    return <p className="text-sm text-muted">Collections will appear here as they become available.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {categories.slice(0, 4).map((category, index) => {
        const categoryProduct = products.find(
          (product) => product.category.toLowerCase() === category.name.toLowerCase()
        );
        return (
          <Link
            key={category.id}
            href={`/collections/${category.slug}`}
            className={`group relative isolate flex min-h-48 flex-col justify-between overflow-hidden border border-border p-5 transition-colors hover:border-gold md:min-h-64 md:p-7 ${
              index === 0 ? "col-span-2 bg-[#ede5d7]" : index === 1 ? "bg-[#d5c7b1]" : "bg-surface"
            }`}
          >
            {categoryProduct?.imageUrl && (
              <>
                <img src={categoryProduct.imageUrl} alt="" aria-hidden="true" loading="lazy" className="absolute inset-0 -z-10 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                <span aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-ink/75 via-ink/10 to-ink/10" />
              </>
            )}
            <span className={`text-[10px] uppercase tracking-caps ${categoryProduct?.imageUrl ? "text-white/85" : "text-muted"}`}>
              {category.productCount} {category.productCount === 1 ? "piece" : "pieces"}
            </span>
            <span className={`flex items-end justify-between gap-3 font-display text-xl md:text-2xl ${categoryProduct?.imageUrl ? "text-white" : "text-ink"}`}>
              {category.name}
              <ArrowRight className="mb-1 h-4 w-4 shrink-0 text-gold transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        );
      })}
    </div>
  );
}

export default async function StorefrontHomePage() {
  const [newestResult, featuredResult, categoriesResult] = await Promise.allSettled([
    getStorefrontProducts({ limit: 4, sortBy: "newest" }),
    getStorefrontProducts({ limit: 8, sortBy: "featured" }),
    getStorefrontCategories(),
  ]);
  const newest = newestResult.status === "fulfilled" ? newestResult.value : { items: [], total: 0 };
  const featured = featuredResult.status === "fulfilled" ? featuredResult.value : { items: [], total: 0 };
  const categories = categoriesResult.status === "fulfilled" ? categoriesResult.value : [];
  if (newestResult.status === "rejected") {
    console.error("Unable to load new arrivals from the catalog API:", newestResult.reason);
  }
  if (featuredResult.status === "rejected") {
    console.error("Unable to load featured products from the catalog API:", featuredResult.reason);
  }
  if (categoriesResult.status === "rejected") {
    console.error("Unable to load storefront categories from the catalog API:", categoriesResult.reason);
  }
  const featuredProduct = featured.items[0];
  const fabricProduct = await loadFeaturedFabric(featuredProduct);
  const fabricSpecifications = fabricProduct?.fabricSpecifications;
  const featuredError = featuredResult.status === "rejected";
  const newestError = newestResult.status === "rejected";

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <AnnouncementBar />
      <SiteHeader />
      <main className="flex-1">
        <CampaignHero product={featuredProduct} />
        <MarqueeTicker />

        <section className="mx-auto max-w-[1440px] border-b border-border px-6 py-16 md:px-12 md:py-24">
          <SectionReveal className="mb-8 flex flex-col justify-between gap-4 md:mb-12 md:flex-row md:items-end">
            <div>
              <span className="mb-2 block text-xs font-medium uppercase tracking-caps text-gold">Explore by edit</span>
              <h2 className="font-display text-3xl font-normal text-ink md:text-5xl">Collections</h2>
            </div>
            <Link href="/collections/all" className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-caps text-navy transition-colors hover:text-gold">
              All collections <ArrowRight className="h-4 w-4" />
            </Link>
          </SectionReveal>
          <CategoryTiles categories={categories} products={featured.items} />
          {categoriesResult.status === "rejected" && (
            <p role="status" className="mt-4 text-xs text-muted">Collections are temporarily unavailable.</p>
          )}
        </section>

        <section className="mx-auto max-w-[1440px] border-b border-border px-6 py-16 md:px-12 md:py-24">
          <SectionReveal className="mb-8 flex flex-col justify-between gap-4 md:mb-12 md:flex-row md:items-end">
            <div>
              <span className="mb-2 block text-xs font-medium uppercase tracking-caps text-gold">Just arrived</span>
              <h2 className="font-display text-3xl font-normal text-ink md:text-5xl">New Arrivals</h2>
            </div>
            <span className="text-xs uppercase tracking-caps text-muted">{newest.total} available pieces</span>
          </SectionReveal>
          <ProductGrid products={newest.items} unavailable={newestError} emptyMessage="New arrivals will appear here when available." />
        </section>

        {featuredProduct && (
          <section className="relative isolate overflow-hidden border-b border-border bg-[#332b23] text-canvas">
            {featuredProduct.imageUrl && (
              <img src={featuredProduct.imageUrl} alt="" aria-hidden="true" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-25" />
            )}
            <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#211d18] via-[#332b23]/90 to-[#332b23]/55" />
            <div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-8 px-6 py-16 md:flex-row md:items-end md:px-12 md:py-24">
              <div className="max-w-2xl">
                <span className="mb-3 block text-xs uppercase tracking-caps text-gold">Seasonal selection</span>
                <h2 className="font-display text-3xl md:text-5xl">Made for the moments that matter.</h2>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-canvas/75">
                  Discover {featuredProduct.name}, selected from the current {featuredProduct.category.toLowerCase()} collection.
                </p>
              </div>
              <Link href={`/products/${featuredProduct.slug}`} className="inline-flex shrink-0 items-center gap-3 border border-canvas/50 px-6 py-3 text-xs uppercase tracking-caps transition-colors hover:border-gold hover:text-gold">
                Explore the edit <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
        )}

        <EditorialSplit />

        <section className="mx-auto max-w-[1440px] border-b border-border px-6 py-16 md:px-12 md:py-24">
          <SectionReveal className="mb-8 flex flex-col justify-between gap-4 md:mb-12 md:flex-row md:items-end">
            <div>
              <span className="mb-2 block text-xs font-medium uppercase tracking-caps text-gold">The considered edit</span>
              <h2 className="font-display text-3xl font-normal text-ink md:text-5xl">Best of Bharat Atelier</h2>
            </div>
            <div className="flex items-center gap-5">
              <span className="text-xs uppercase tracking-caps text-muted">{featured.total} available pieces</span>
              <Link href="/collections/all" className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-caps text-navy transition-colors hover:text-gold">
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </SectionReveal>
          <ProductGrid products={featured.items} unavailable={featuredError} emptyMessage="There are no featured garments available at this time." />
        </section>

        {fabricProduct && (
          <section className="grid border-b border-border bg-[#eee8de] md:grid-cols-2">
            <div className="flex items-center px-6 py-16 md:px-12 md:py-24">
              <div className="mx-auto max-w-xl">
                <span className="mb-3 block text-xs uppercase tracking-caps text-gold">Material &amp; making</span>
                <h2 className="font-display text-3xl text-ink md:text-5xl">A closer look at the cloth.</h2>
                <p className="mt-5 text-sm leading-relaxed text-muted">
                  {fabricProduct.fabricSpecifications?.fabricName || fabricProduct.material}
                  {fabricProduct.fabricSpecifications?.composition ? ` · ${fabricProduct.fabricSpecifications.composition}` : ""}
                  {fabricProduct.fabricSpecifications?.weave ? ` · ${fabricProduct.fabricSpecifications.weave}` : ""}
                  {fabricProduct.fabricSpecifications?.texture ? ` · ${fabricProduct.fabricSpecifications.texture}` : ""}
                  {fabricProduct.fabricSpecifications?.finish ? ` · ${fabricProduct.fabricSpecifications.finish}` : ""}
                  {!fabricSpecifications && " — view the garment details for its recorded material information."}
                </p>
                {fabricSpecifications?.fibrePercentages && fabricSpecifications.fibrePercentages.length > 0 && (
                  <ul className="mt-4 space-y-1 text-xs text-muted">
                    {fabricSpecifications.fibrePercentages.map((fibre) => (
                      <li key={fibre.fibre}>{fibre.fibre}: {fibre.percentage}%</li>
                    ))}
                  </ul>
                )}
                <Link href={`/products/${fabricProduct.slug}`} className="mt-7 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-caps text-navy hover:text-gold">
                  Discover the piece <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
            <Link href={`/products/${fabricProduct.slug}`} className="relative min-h-72 overflow-hidden bg-[#d5c7b1]">
              {fabricProduct.imageUrl ? (
                <img src={fabricProduct.imageUrl} alt={fabricProduct.imageAlt || fabricProduct.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 hover:scale-[1.02]" />
              ) : (
                <span className="flex h-full min-h-72 items-center justify-center font-display text-2xl text-muted">{fabricProduct.name}</span>
              )}
            </Link>
          </section>
        )}

        <SectionReveal>
          <ServiceHighlights />
        </SectionReveal>
      </main>
      <SiteFooter />
    </div>
  );
}
