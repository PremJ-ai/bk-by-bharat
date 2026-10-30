import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

interface CampaignHeroProps {
  imageUrl?: string;
  imageAlt?: string;
}

export function CampaignHero({
  imageUrl,
  imageAlt = "Bharat Atelier tailored menswear",
}: CampaignHeroProps) {
  return (
    <section className="relative bg-navy text-canvas overflow-hidden py-24 md:py-36 px-6 md:px-12 border-b border-border">
      {/* Editorial Decorative Grid Backing */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#C29B38_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

      <div className="max-w-[1440px] mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Headline Column */}
        <div className="lg:col-span-8 space-y-6">
          <div className="inline-flex items-center space-x-2 text-gold text-xs uppercase tracking-[0.2em] font-medium">
            <span className="w-6 h-[1px] bg-gold" />
            <span>Autumn &middot; Winter 2026 Collection</span>
          </div>

          <h1 className="font-display text-4xl sm:text-6xl md:text-7xl font-normal leading-[1.05] tracking-tight">
            Structure, Drape &amp; <br />
            <span className="italic font-normal">Uncompromised Linen</span>
          </h1>

          <p className="max-w-xl text-canvas/80 text-base md:text-lg leading-relaxed font-sans font-normal">
            Garments sculpted for temperature and presence. Tailored single-needle seams,
            natural horn buttons, and breathable natural fibers crafted in limited batches.
          </p>

          <div className="pt-4 flex flex-wrap gap-4">
            <Link
              href="/collections/shirts"
              className="inline-flex items-center space-x-3 bg-canvas text-navy px-8 py-3.5 text-sm uppercase tracking-caps font-medium hover:bg-gold hover:text-navy transition-all duration-300 shadow-sm"
            >
              <span>Explore Shirts</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>

            <Link
              href="/collections/trousers"
              className="inline-flex items-center space-x-3 border border-canvas/40 text-canvas px-8 py-3.5 text-sm uppercase tracking-caps font-medium hover:border-gold hover:text-gold transition-all duration-300"
            >
              <span>Explore Trousers</span>
            </Link>
          </div>
        </div>

        {/* Right Editorial Spotlight with the featured catalog photograph */}
        <div className="lg:col-span-4 bg-navy-strong/80 border border-white/10 relative overflow-hidden">
          <div className="relative aspect-[4/3] overflow-hidden bg-navy-strong">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={imageAlt}
                loading="eager"
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-navy-strong via-navy to-[#5b4a31]">
                <span className="font-display text-6xl text-gold/40">BA</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-navy/40 via-transparent to-transparent pointer-events-none" />
          </div>

          <div className="p-8">
            <span className="text-[10px] uppercase tracking-caps text-gold block mb-2 font-medium">
              Atelier Highlight
            </span>
            <h3 className="font-display text-2xl text-canvas mb-3">
              The Double-Pleat Gurkha
            </h3>
            <p className="text-canvas/70 text-sm leading-relaxed mb-6">
              Cut from 340gsm Irish linen with an extended waistband and custom brass side-adjusters.
            </p>
            <div className="border-t border-white/10 pt-4 flex justify-between items-center text-xs text-canvas/60">
              <span>Handmade in Delhi</span>
              <span className="text-gold font-medium font-sans">₹12,400</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
