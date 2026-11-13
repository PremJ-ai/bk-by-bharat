"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, CheckCircle2, ShoppingBag, X } from "lucide-react";
import { ProductMedia } from "@/components/media/ProductMedia";
import { useCart } from "@/context/CartContext";
import { trackGA4Event, toGA4Item } from "@/lib/analytics/ga4";
import type { ProductViewModel } from "./product.types";

interface ProductCardProps {
  product: ProductViewModel;
  priority?: boolean;
}

type PurchaseIntent = "cart" | "buy";

export function formatINR(paise: number): string {
  const rupees = Math.round(paise / 100);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
}

export function ProductCard({ product, priority }: ProductCardProps) {
  const router = useRouter();
  const { addItem } = useCart();
  const [purchaseIntent, setPurchaseIntent] = useState<PurchaseIntent | null>(null);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");

  const productUrl = `/products/${product.slug}`;
  const sizes = product.sizes ?? [];
  const availableSizes = sizes.filter((variant) => variant.available);
  const colors = (product.colors ?? []).filter((color) => Boolean(color.name));
  const selectedVariant = sizes.find(
    (variant) =>
      variant.size === selectedSize &&
      variant.available &&
      (!variant.colorName || !selectedColor || variant.colorName === selectedColor)
  );

  const openPurchaseOptions = (intent: PurchaseIntent) => {
    if (product.stockStatus === "out_of_stock") return;

    const firstAvailable = availableSizes[0];
    if (!firstAvailable) {
      // Keep the detail page as the fallback when a listing payload has no variant data.
      router.push(productUrl);
      return;
    }

    setSelectedSize(firstAvailable.size);
    setSelectedColor(firstAvailable.colorName || colors[0]?.name || "");
    setPurchaseIntent(intent);
  };

  const handleColorChange = (colorName: string) => {
    setSelectedColor(colorName);
    const firstAvailable = sizes.find(
      (variant) =>
        variant.available &&
        (!variant.colorName || variant.colorName === colorName)
    );
    if (firstAvailable) setSelectedSize(firstAvailable.size);
    else setSelectedSize("");
  };

  const confirmPurchase = () => {
    if (!selectedVariant || !purchaseIntent) return;

    const intent = purchaseIntent;
    addItem(
      {
        productId: product.id,
        variantId: selectedVariant.id,
        name: product.name,
        slug: product.slug,
        material: product.material,
        size: selectedVariant.size,
        color: selectedVariant.colorName || selectedColor || undefined,
        pricePaise: selectedVariant.pricePaise ?? product.pricePaise,
        quantity: 1,
        imageUrl: product.imageUrl,
      },
      { openCart: intent === "cart" }
    );

    setPurchaseIntent(null);
    if (intent === "buy") router.push("/checkout");
  };

  const trackProductSelection = () => {
    trackGA4Event("select_item", {
      item_list_name: "Storefront product grid",
      items: [
        toGA4Item({
          id: product.id,
          name: product.name,
          category: product.category,
          material: product.material,
          pricePaise: product.pricePaise,
        }),
      ],
    });
  };

  return (
    <article data-grid-item className="group flex h-full flex-col border border-border bg-surface transition-shadow duration-300 hover:shadow-[0_8px_24px_-4px_rgba(10,25,47,0.08)]">
      <Link
        href={productUrl}
        onClick={trackProductSelection}
        className="block p-4 pb-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-gold"
        aria-label={`View ${product.name} product details`}
      >
        <div className="relative mb-4 aspect-[4/5] overflow-hidden border border-border/50 bg-surface-muted">
          <ProductMedia
            src={product.imageUrl}
            videoSrc={product.videoUrl}
            posterSrc={product.videoPosterUrl || product.imageUrl}
            alt={product.imageAlt || product.name}
            priority={priority}
            aspectRatio="aspect-[4/5]"
            autoplayOnHover
          />
          {product.videoUrl && (
            <span className="pointer-events-none absolute bottom-3 left-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-[#2d211b]/75 px-2.5 py-1 text-[9px] font-medium uppercase tracking-[0.14em] text-white backdrop-blur-sm">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#d8b47c]" />
              Model film · Hover to play
            </span>
          )}
          {product.badge && (
            <span className="absolute left-3 top-3 z-10 bg-navy px-2.5 py-1 text-[10px] font-medium uppercase tracking-caps text-canvas shadow-sm">
              {product.badge}
            </span>
          )}
        </div>

        <div className="space-y-1.5 pb-4">
          <span className="block text-[11px] uppercase tracking-caps text-muted">
            {product.material}
          </span>
          <h3 className="font-display text-lg font-normal leading-snug text-ink transition-colors group-hover:text-gold">
            {product.name}
          </h3>
          <span className="inline-flex items-center gap-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            View product details <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </Link>

      <div className="mt-auto px-4 pb-4">
        <div className="flex items-center justify-between gap-3 border-t border-border/60 py-3">
          <span className="font-sans text-base font-semibold tabular-nums text-ink">
            {formatINR(product.pricePaise)}
          </span>
          <div className="flex items-center gap-1.5 text-xs">
            {product.stockStatus === "in_stock" ? (
              <span className="inline-flex items-center gap-1 text-stock-ok">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span className="text-[11px] font-medium">In Atelier</span>
              </span>
            ) : product.stockStatus === "low_stock" ? (
              <span className="inline-flex items-center gap-1 text-rust">
                <AlertCircle className="h-3.5 w-3.5" />
                <span className="text-[11px] font-medium">Few Left</span>
              </span>
            ) : (
              <span className="text-[11px] text-muted">Sold Out</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => openPurchaseOptions("cart")}
            disabled={product.stockStatus === "out_of_stock"}
            className="inline-flex min-h-10 items-center justify-center gap-1.5 border border-navy px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-navy transition-colors hover:bg-navy hover:text-canvas focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-45"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            Add to cart
          </button>
          <button
            type="button"
            onClick={() => openPurchaseOptions("buy")}
            disabled={product.stockStatus === "out_of_stock"}
            className="inline-flex min-h-10 items-center justify-center gap-1.5 bg-navy px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-canvas transition-colors hover:bg-gold hover:text-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-45"
          >
            Buy now
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {purchaseIntent && (
          <div className="mt-3 space-y-3 border border-border bg-canvas p-3" aria-label="Choose product options">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-caps text-ink">Choose your size</p>
              <button
                type="button"
                onClick={() => setPurchaseIntent(null)}
                aria-label="Close product options"
                className="rounded p-1 text-muted transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {colors.length > 1 && (
              <label className="block space-y-1.5 text-[10px] text-muted">
                <span className="font-medium uppercase tracking-caps">Colour</span>
                <select
                  value={selectedColor}
                  onChange={(event) => handleColorChange(event.target.value)}
                  className="w-full border border-border bg-surface px-2.5 py-2 text-xs text-ink focus:border-gold focus:outline-none"
                >
                  {colors.map((color) => (
                    <option key={color.name} value={color.name}>{color.name}</option>
                  ))}
                </select>
              </label>
            )}

            <div className="grid grid-cols-4 gap-1.5">
              {[...new Set(sizes.map((variant) => variant.size))].map((size) => {
                const variant = sizes.find(
                  (candidate) =>
                    candidate.size === size &&
                    candidate.available &&
                    (!candidate.colorName || !selectedColor || candidate.colorName === selectedColor)
                );
                return (
                  <button
                    key={size}
                    type="button"
                    disabled={!variant}
                    aria-pressed={selectedSize === size}
                    onClick={() => setSelectedSize(size)}
                    className={`min-h-9 border px-1.5 py-2 text-[10px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold ${
                      !variant
                        ? "cursor-not-allowed border-border/60 text-muted/45 line-through"
                        : selectedSize === size
                          ? "border-navy bg-navy text-canvas"
                          : "border-border bg-surface text-ink hover:border-gold"
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>

            {!selectedVariant && (
              <p className="text-[10px] text-rust" role="alert">Choose an available size to continue.</p>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPurchaseIntent(null)}
                className="min-h-10 border border-border px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted hover:text-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmPurchase}
                disabled={!selectedVariant}
                className="min-h-10 bg-[#2e5f4b] px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-white transition-colors hover:bg-[#244c3c] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {purchaseIntent === "buy" ? "Continue to checkout" : "Add selected size"}
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
