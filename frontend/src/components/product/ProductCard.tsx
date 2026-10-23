import Link from "next/link";
import type { ProductViewModel } from "./product.types";
import { CheckCircle2, AlertCircle } from "lucide-react";

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

export function ProductCard({ product }: ProductCardProps) {
  return (
    <article className="group flex flex-col bg-surface border border-border p-4 transition-all duration-300 hover:shadow-[0_8px_24px_-4px_rgba(10,25,47,0.06)]">
      {/* 4:5 Media Container */}
      <div className="relative aspect-[4/5] bg-surface-muted overflow-hidden mb-4 flex items-center justify-center border border-border/50">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.imageAlt || product.name}
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.025]"
            loading="lazy"
          />
        ) : (
          /* Subtle architectural monogram placeholder when no image */
          <div className="flex flex-col items-center justify-center text-center p-6 space-y-2 select-none">
            <span className="font-display text-4xl text-muted/30 font-medium tracking-tight">
              {product.name.split(" ").map((w) => w[0]).join("")}
            </span>
            <span className="text-[10px] uppercase tracking-caps text-muted/60 font-sans">
              {product.category}
            </span>
            {product.isFixture && (
              <span className="mt-2 text-[9px] uppercase tracking-wider text-muted/50 border border-border px-1.5 py-0.5">
                Fixture Draft
              </span>
            )}
          </div>
        )}

        {/* Restrained Badge */}
        {product.badge && (
          <span className="absolute top-3 left-3 bg-navy text-canvas text-[10px] uppercase tracking-caps px-2.5 py-1 font-medium shadow-sm">
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
    </article>
  );
}
