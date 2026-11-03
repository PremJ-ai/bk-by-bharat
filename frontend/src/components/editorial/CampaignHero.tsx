"use client";

import Link from "next/link";
import { ArrowUpRight, MoveDown } from "lucide-react";
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
      const image = heroRef.current.querySelector<HTMLElement>("[data-hero-image]");
      const content = heroRef.current.querySelectorAll<HTMLElement>("[data-hero-reveal]");
      const timeline = gsap.timeline();

      if (image) {
        timeline.fromTo(
          image,
          { scale: 1.075 },
          {
            scale: 1,
            duration: 1.6,
            ease: "power2.out",
            force3D: true,
          }
        );
      }

      timeline.fromTo(
        content,
        { opacity: 0, y: 22 },
        {
          opacity: 1,
          y: 0,
          duration: MOTION_TOKENS.durations.editorial,
          ease: MOTION_TOKENS.eases.reveal,
          stagger: 0.11,
          clearProps: "transform,opacity",
        },
        image ? "-=1.05" : 0
      );
    },
    { scope: heroRef }
  );

  return (
    <section
      ref={heroRef}
      aria-label="Bharat Atelier campaign"
      className="group relative isolate flex min-h-[calc(100svh-120px)] items-end overflow-hidden bg-[#29251f] text-canvas"
    >
      {product?.imageUrl ? (
        <img
          data-hero-image
          src={product.imageUrl}
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          loading="eager"
          decoding="async"
          className="absolute inset-0 h-full w-full scale-[1.02] object-cover object-[64%_center] transition-transform duration-[1800ms] ease-out group-hover:scale-[1.04] motion-reduce:transform-none"
        />
      ) : (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_72%_38%,#79664e_0%,#514638_28%,#29251f_70%)]"
        >
          <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(115deg,transparent_35%,#d3c0a0_35.2%,transparent_35.5%)]" />
        </div>
      )}

      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-[#171b1b]/90 via-[#1d211e]/62 to-[#1d211e]/10"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-[#171b1b]/55 via-transparent to-[#171b1b]/10"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-[1440px] items-end justify-between gap-10 px-6 pb-14 pt-24 sm:pb-16 md:px-12 md:pb-20">
        <div className="max-w-3xl">
          <div
            data-hero-reveal
            className="mb-7 flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.28em] text-[#d7bd91] sm:text-xs"
          >
            <span className="h-px w-8 bg-[#c3a477]" />
            <span>Bharat Atelier · The considered edit</span>
          </div>

          <h1
            data-hero-reveal
            className="max-w-3xl font-display text-[clamp(3.25rem,8vw,7.5rem)] font-normal leading-[0.92] tracking-[-0.045em] text-[#f7f2e9]"
          >
            A quieter kind
            <br />
            <span className="font-normal italic text-[#d9c4a0]">of statement.</span>
          </h1>

          <p
            data-hero-reveal
            className="mt-7 max-w-lg text-sm leading-7 text-white/78 sm:text-base sm:leading-8"
          >
            Thoughtful silhouettes. Honest materials. Pieces made to be worn
            and lived in.
          </p>

          <div data-hero-reveal className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-4">
            <Link
              href="/collections/all"
              className="group/cta inline-flex min-h-12 items-center gap-4 bg-[#eee5d5] px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1c2a33] transition-colors duration-300 hover:bg-[#c9ad7e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d9c4a0]"
            >
              <span>Explore the collection</span>
              <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5" />
            </Link>

            {product && (
              <Link
                href={`/products/${product.slug}`}
                className="inline-flex items-center gap-2 border-b border-white/45 pb-1 text-[10px] font-medium uppercase tracking-[0.18em] text-white/85 transition-colors hover:border-[#d9c4a0] hover:text-[#d9c4a0]"
              >
                Featured piece <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>

        <div className="hidden shrink-0 flex-col items-end gap-2 pb-1 text-right lg:flex" data-hero-reveal>
          {product ? (
            <>
              <span className="text-[9px] uppercase tracking-[0.24em] text-white/55">
                From the current collection
              </span>
              <Link
                href={`/products/${product.slug}`}
                className="max-w-64 text-sm text-white/90 transition-colors hover:text-[#d9c4a0]"
              >
                {product.name}
              </Link>
              <span className="text-xs text-[#d9c4a0]">{formatINR(product.pricePaise)}</span>
            </>
          ) : (
            <span className="text-[9px] uppercase tracking-[0.24em] text-white/55">
              Designed with intention · Made to be worn
            </span>
          )}
          <span className="mt-5 h-10 w-px bg-gradient-to-b from-[#d9c4a0] to-transparent" />
          <span className="text-[9px] uppercase tracking-[0.22em] text-white/45">01 / The atelier</span>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="absolute bottom-7 right-6 z-10 flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-white/55 lg:hidden"
      >
        <MoveDown className="h-3.5 w-3.5" />
        Scroll to explore
      </div>
    </section>
  );
}
