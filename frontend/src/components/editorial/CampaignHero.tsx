"use client";

import Link from "next/link";
import { ArrowUpRight, Play } from "lucide-react";
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
      const content = heroRef.current.querySelectorAll<HTMLElement>("[data-hero-reveal]");
      const image = heroRef.current.querySelector<HTMLElement>("[data-hero-image]");
      const timeline = gsap.timeline();

      if (image) {
        timeline.fromTo(
          image,
          { scale: 1.045 },
          { scale: 1, duration: 1.4, ease: "power2.out", force3D: true }
        );
      }

      timeline.fromTo(
        content,
        { opacity: 0, y: 16 },
        {
          opacity: 1,
          y: 0,
          duration: MOTION_TOKENS.durations.reveal,
          ease: MOTION_TOKENS.eases.reveal,
          stagger: 0.09,
          clearProps: "transform,opacity",
        },
        image ? "-=0.95" : 0
      );
    },
    { scope: heroRef }
  );

  return (
    <section
      ref={heroRef}
      aria-label="Bharat Atelier campaign"
      className="group relative isolate flex min-h-[calc(100svh-32px)] items-end overflow-hidden bg-[#302219] text-[#fbf6ee]"
    >
      <div className="absolute inset-0 bg-[#302219]">
        {product?.imageUrl ? (
          <img
            data-hero-image
            src={product.imageUrl}
            alt={product.imageAlt || product.name}
            fetchPriority="high"
            loading="eager"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover object-[64%_center] motion-safe:transition-transform motion-safe:duration-[1800ms] group-hover:scale-[1.015]"
          />
        ) : (
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_72%_38%,#8b7258_0%,#594333_38%,#302219_78%)]"
          />
        )}
        {product?.videoUrl && (
          <video
            src={product.videoUrl}
            poster={product.videoPosterUrl || product.imageUrl}
            muted
            autoPlay
            loop
            playsInline
            preload="metadata"
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover motion-reduce:hidden"
          />
        )}
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-[#201711]/82 via-[#241b15]/48 to-[#241b15]/10"
        />
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-[#201711]/45 via-transparent to-[#201711]/10"
        />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-[1440px] items-end justify-between gap-8 px-6 pb-14 pt-44 sm:pb-16 md:px-12 md:pb-20">
        <div className="max-w-2xl">
          <div
            data-hero-reveal
            className="mb-6 flex items-center gap-3 text-[9px] font-semibold uppercase tracking-[0.25em] text-[#d7b181] sm:text-[10px]"
          >
            <span className="h-px w-7 bg-[#c39a68]" />
            <span>Bharat Atelier · Made for considered living</span>
          </div>

          <h1
            data-hero-reveal
            className="max-w-xl font-display text-[clamp(2.65rem,5.6vw,5.4rem)] font-normal leading-[0.94] tracking-[-0.045em] text-[#fbf6ee]"
          >
            A quieter kind
            <br />
            <span className="italic text-[#e4c9a5]">of statement.</span>
          </h1>

          <p
            data-hero-reveal
            className="mt-5 max-w-md text-[12px] leading-6 text-white/82 sm:text-sm"
          >
            Thoughtful shirts, refined trousers, and considered tailoring.
          </p>

          <div data-hero-reveal className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/collections/all"
              className="group/cta inline-flex min-h-11 items-center gap-3 bg-[#fbf6ee] px-5 py-3 text-[9px] font-bold uppercase tracking-[0.16em] text-[#302219] transition-colors duration-300 hover:bg-[#d9bb91] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e4c9a5]"
            >
              Explore the collection
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5" />
            </Link>
            <Link
              href="/collections/all"
              className="inline-flex min-h-11 items-center gap-2 border border-white/55 px-5 py-3 text-[9px] font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:border-[#e4c9a5] hover:text-[#e4c9a5]"
            >
              Discover the atelier
            </Link>
          </div>
        </div>

        {product && (
          <Link
            href={`/products/${product.slug}`}
            data-hero-reveal
            className="hidden max-w-64 shrink-0 border-l border-white/40 pl-5 text-right text-white/85 transition-colors hover:text-[#e4c9a5] lg:block"
          >
            <span className="mb-2 flex items-center justify-end gap-2 text-[9px] uppercase tracking-[0.18em] text-white/65">
              {product.videoUrl ? <Play className="h-3 w-3" /> : null}
              {product.videoUrl ? "View model film" : "From the current edit"}
            </span>
            <span className="block font-display text-xl">{product.name}</span>
            <span className="mt-1 block text-[10px] text-white/65">
              {product.category} · {formatINR(product.pricePaise)}
            </span>
          </Link>
        )}
      </div>
    </section>
  );
}
