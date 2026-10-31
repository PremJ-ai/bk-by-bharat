"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import {
  gsap,
  isReducedMotion,
  MOTION_TOKENS,
  registerGsapPlugins,
} from "@/lib/motion/gsap";
import type { ProductViewModel } from "@/components/product/product.types";
import { formatINR } from "@/components/product/ProductCard";

interface CampaignHeroProps {
  product?: ProductViewModel;
}

export function CampaignHero({ product }: CampaignHeroProps) {
  const heroRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (isReducedMotion() || !heroRef.current) return;

      registerGsapPlugins();
      const content = heroRef.current.querySelectorAll("[data-hero-reveal]");
      const highlight = heroRef.current.querySelector("[data-hero-highlight]");
      const timeline = gsap.timeline();

      timeline.from(content, {
        opacity: 0,
        y: 14,
        duration: MOTION_TOKENS.durations.reveal,
        ease: MOTION_TOKENS.eases.reveal,
        stagger: 0.1,
      });

      if (highlight) {
        timeline.from(
          highlight,
          {
            opacity: 0,
            y: 10,
            duration: MOTION_TOKENS.durations.editorial,
            ease: MOTION_TOKENS.eases.editorial,
          },
          "-=0.45"
        );
      }
    },
    { scope: heroRef }
  );

  return (
    <section ref={heroRef} className="relative overflow-hidden border-b border-border bg-navy px-6 py-24 text-canvas md:px-12 md:py-36">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#C29B38_1px,transparent_1px)] opacity-10 [background-size:24px_24px]" />
      <div className="relative z-10 mx-auto grid max-w-[1440px] grid-cols-1 items-center gap-12 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <div data-hero-reveal className="inline-flex items-center space-x-2 text-xs font-medium uppercase tracking-[0.2em] text-gold">
            <span className="h-px w-6 bg-gold" />
            <span>Bharat Atelier · Made for considered living</span>
          </div>
          <h1 data-hero-reveal className="font-display text-4xl font-normal leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
            A quieter kind <br />
            <span className="italic font-normal">of statement.</span>
          </h1>
          <p data-hero-reveal className="max-w-xl font-sans text-base font-normal leading-relaxed text-canvas/80 md:text-lg">
            Thoughtful silhouettes, honest materials, and details made to be lived in.
            Discover the pieces in the current atelier collection.
          </p>
          <div data-hero-reveal className="flex flex-wrap gap-4 pt-4">
            <Link href="/collections/all" className="inline-flex items-center space-x-3 bg-canvas px-8 py-3.5 text-sm font-medium uppercase tracking-caps text-navy shadow-sm transition-all duration-300 hover:bg-gold">
              <span>Explore the collection</span>
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link href="/collections/all" className="inline-flex items-center border border-canvas/40 px-8 py-3.5 text-sm font-medium uppercase tracking-caps text-canvas transition-all duration-300 hover:border-gold hover:text-gold">
              Discover the atelier
            </Link>
          </div>
        </div>

        {product && (
          <Link
            href={`/products/${product.slug}`}
            data-hero-highlight
            className="group relative overflow-hidden border border-white/10 bg-navy-strong/80 transition-colors duration-300 hover:border-gold/40 lg:col-span-4"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-navy-strong">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.imageAlt || product.name} loading="eager" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-navy-strong via-navy to-[#5b4a31]">
                  <span className="font-display text-6xl text-gold/40" aria-hidden="true">BA</span>
                  <span className="sr-only">{product.name}</span>
                </div>
              )}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy/40 via-transparent to-transparent" />
            </div>
            <div className="p-6 sm:p-8">
              <span className="mb-2 block text-[10px] font-medium uppercase tracking-caps text-gold">From the current collection</span>
              <h2 className="mb-3 font-display text-2xl text-canvas">{product.name}</h2>
              <div className="flex items-center justify-between border-t border-white/10 pt-4 text-xs text-canvas/70">
                <span>{product.category} · {product.material}</span>
                <span className="font-sans font-medium text-gold">{formatINR(product.pricePaise)}</span>
              </div>
            </div>
          </Link>
        )}
      </div>
    </section>
  );
}
