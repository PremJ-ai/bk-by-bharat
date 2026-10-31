"use client";

import { useRef } from "react";
import Link from "next/link";
import { useGSAP } from "@gsap/react";
import { Draggable, gsap, isReducedMotion, registerGsapPlugins } from "@/lib/motion/gsap";
import type { ProductViewModel } from "./product.types";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { ProductMedia } from "@/components/media/ProductMedia";

interface ProductCardProps {
  product: ProductViewModel;
  priority?: boolean;
}

export function formatINR(paise: number): string {
  const rupees = Math.round(paise / 100);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
}

export function ProductCard({ product, priority }: ProductCardProps) {
  const cardRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!cardRef.current || isReducedMotion()) return;

      registerGsapPlugins();
      const surface = cardRef.current.querySelector<HTMLElement>("[data-product-card-surface]");
      const bounds = cardRef.current.closest<HTMLElement>("[data-product-grid]");
      if (!surface || !bounds) return;

      const mediaQuery = gsap.matchMedia();
      mediaQuery.add("(hover: hover) and (pointer: fine) and (min-width: 640px)", () => {
        const [draggable] = Draggable.create(surface, {
          type: "x,y",
          bounds,
          dragClickables: true,
          onPress() {
            gsap.to(surface, {
              scale: 1.1,
              boxShadow: "0px 10px 20px rgba(0,0,0,0.2)",
              duration: 0.18,
              ease: "power2.out",
              overwrite: "auto",
            });
            gsap.set(surface, { zIndex: 2 });
          },
          onRelease() {
            gsap.to(surface, {
              x: 0,
              y: 0,
              scale: 1,
              boxShadow: "0px 0px 0px rgba(0,0,0,0)",
              duration: 0.28,
              ease: "power2.out",
              overwrite: "auto",
              onComplete: () => gsap.set(surface, { clearProps: "zIndex" }),
            });
            draggable.update();
          },
        });

        gsap.set(surface, { transformOrigin: "center center" });
        return () => draggable.kill();
      });

      return () => mediaQuery.revert();
    },
    { scope: cardRef }
  );

  return (
    <article
      ref={cardRef}
      data-grid-item
      className="group"
    >
      <div
        data-product-card-surface
        className="flex h-full flex-col bg-surface border border-border p-4 transition-shadow duration-300 hover:shadow-[0_8px_24px_-4px_rgba(10,25,47,0.06)]"
        style={{ touchAction: "pan-y" }}
      >
        {/* 4:5 Media Container */}
        <div className="relative aspect-[4/5] bg-surface-muted overflow-hidden mb-4 border border-border/50">
          <ProductMedia
            src={product.imageUrl}
            alt={product.imageAlt || product.name}
            priority={priority}
            aspectRatio="aspect-[4/5]"
          />

          {/* Restrained Badge */}
          {product.badge && (
            <span className="absolute top-3 left-3 bg-navy text-canvas text-[10px] uppercase tracking-caps px-2.5 py-1 font-medium shadow-sm z-10">
              {product.badge}
            </span>
          )}
        </div>

        {/* Product Metadata */}
        <div className="flex flex-col flex-1 justify-between space-y-3">
          <div>
            <span className="text-[11px] uppercase tracking-caps text-muted block mb-1">
              {product.material}
            </span>
            <h3 className="font-display text-lg text-ink font-normal leading-snug group-hover:text-gold transition-colors">
              <Link href={`/products/${product.slug}`} className="focus:outline-none focus:underline">
                {product.name}
              </Link>
            </h3>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/60">
            <span className="font-sans font-semibold text-base text-ink tabular-nums">
              {formatINR(product.pricePaise)}
            </span>

            {/* Accessible Stock Cue */}
            <div className="flex items-center space-x-1.5 text-xs">
              {product.stockStatus === "in_stock" ? (
                <span className="inline-flex items-center text-stock-ok space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-medium">In Atelier</span>
                </span>
              ) : product.stockStatus === "low_stock" ? (
                <span className="inline-flex items-center text-rust space-x-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-medium">Few Left</span>
                </span>
              ) : (
                <span className="text-muted text-[11px]">Sold Out</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
