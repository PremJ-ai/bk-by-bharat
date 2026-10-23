import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { CampaignHero } from "@/components/editorial/CampaignHero";
import { MarqueeTicker } from "@/components/editorial/MarqueeTicker";
import { EditorialSplit } from "@/components/editorial/EditorialSplit";
import { ProductCard } from "@/components/product/ProductCard";
import { MOCK_STOREFRONT_FIXTURES } from "@/components/product/mockFixtures";
import { ServiceHighlights } from "@/components/editorial/ServiceHighlights";
import { SiteFooter } from "@/components/layout/SiteFooter";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function StorefrontHomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      {/* 1. Announcement Strip */}
      <AnnouncementBar />

      {/* 2. Site Header */}
      <SiteHeader />

      <main className="flex-1">
        {/* 3. Hero / Brand Landing */}
        <CampaignHero />

        {/* 4. Marquee Ticker */}
        <MarqueeTicker />

        {/* 5. Editorial Split */}
        <EditorialSplit />

        {/* 6. Featured Products Grid */}
        <section className="max-w-[1440px] mx-auto px-6 md:px-12 py-24 border-b border-border">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 space-y-4 md:space-y-0">
            <div>
              <span className="text-xs uppercase tracking-caps text-gold font-medium block mb-2">
                Selected Work
              </span>
              <h2 className="font-display text-3xl md:text-5xl text-ink font-normal">
                Autumn Foundations
              </h2>
            </div>
            <Link
              href="/collections/all"
              className="inline-flex items-center space-x-2 text-navy text-xs uppercase tracking-caps font-semibold hover:text-gold transition-colors"
            >
              <span>View All 16 Silhouettes</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* 4-column responsive grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {MOCK_STOREFRONT_FIXTURES.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                priority={index < 2}
              />
            ))}
          </div>
        </section>

        {/* 7. Service Highlights & Proof Points */}
        <ServiceHighlights />
      </main>

      {/* 8. Site Footer */}
      <SiteFooter />
    </div>
  );
}
