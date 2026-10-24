"use client";

import { useState, use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { getProductBySlug } from "@/components/product/mockFixtures";
import { formatINR } from "@/components/product/ProductCard";
import { useCart } from "@/context/CartContext";
import {
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Truck,
  Scissors,
  ShieldCheck,
  ChevronDown,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { ProductMedia } from "@/components/media/ProductMedia";
import { EditorialCropReveal } from "@/components/motion/EditorialCropReveal";
import { ParallaxFrame } from "@/components/motion/ParallaxFrame";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export default function ProductDetailPage({ params }: ProductPageProps) {
  const resolvedParams = use(params);
  const product = getProductBySlug(resolvedParams.slug);

  if (!product) {
    notFound();
  }

  const { addItem } = useCart();

  // State
  const [selectedSize, setSelectedSize] = useState<string>(
    product.sizes.find((s) => s.available)?.size || ""
  );
  const [selectedColor, setSelectedColor] = useState<string>(
    product.colors[0]?.name || "Standard"
  );
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [openAccordion, setOpenAccordion] = useState<string | null>("details");
  const [addedAnimation, setAddedAnimation] = useState<boolean>(false);

  const selectedSizeObj = product.sizes.find((s) => s.size === selectedSize);
  const isAvailable = selectedSizeObj?.available ?? false;

  const handleAddToCart = () => {
    if (!selectedSize || !isAvailable) return;

    addItem({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      material: product.material,
      size: selectedSize,
      color: selectedColor,
      pricePaise: product.pricePaise,
      quantity: 1,
      imageUrl: product.imageUrl,
    });

    setAddedAnimation(true);
    setTimeout(() => setAddedAnimation(false), 1500);
  };

  const toggleAccordion = (section: string) => {
    setOpenAccordion(openAccordion === section ? null : section);
  };

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-ink">
      <AnnouncementBar />
      <SiteHeader />

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-6 md:px-12 py-10">
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumbs" className="mb-8">
          <ol className="flex items-center space-x-2 text-xs uppercase tracking-caps text-muted">
            <li>
              <Link href="/" className="hover:text-gold transition-colors">
                Atelier
              </Link>
            </li>
            <li>
              <ChevronRight className="w-3 h-3 text-border" />
            </li>
            <li>
              <Link
                href={`/collections/${product.category.toLowerCase()}`}
                className="hover:text-gold transition-colors"
              >
                {product.category}
              </Link>
            </li>
            <li>
              <ChevronRight className="w-3 h-3 text-border" />
            </li>
            <li className="text-ink font-medium truncate max-w-[200px]">
              {product.name}
            </li>
          </ol>
        </nav>

        {/* Product Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start pb-20 border-b border-border">
          {/* Left: Media Gallery Column (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Primary Frame with EditorialCropReveal & ParallaxFrame */}
            <EditorialCropReveal>
              <ParallaxFrame speed={0.04}>
                <div className="relative aspect-[4/5] bg-surface-muted border border-border overflow-hidden">
                  <ProductMedia
                    src={product.imageUrl}
                    alt={product.name}
                    priority={true}
                    aspectRatio="aspect-[4/5]"
                  />

                  {/* Badge */}
                  {product.badge && (
                    <span className="absolute top-4 left-4 bg-navy text-canvas text-xs uppercase tracking-caps px-3 py-1 font-medium shadow-sm z-10">
                      {product.badge}
                    </span>
                  )}
                </div>
              </ParallaxFrame>
            </EditorialCropReveal>

            {/* Gallery Thumbnail Staging */}
            <div className="grid grid-cols-4 gap-3">
              {[0, 1, 2, 3].map((idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImageIndex(idx)}
                  className={`aspect-[4/5] bg-surface-muted border transition-all flex items-center justify-center text-xs text-muted/50 ${
                    activeImageIndex === idx
                      ? "border-navy ring-1 ring-navy"
                      : "border-border hover:border-gold"
                  }`}
                  aria-label={`View angle ${idx + 1}`}
                >
                  <span className="font-display text-sm">
                    0{idx + 1}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Right: Purchase & Story Column (5 cols) */}
          <div className="lg:col-span-5 space-y-8 lg:sticky lg:top-28">
            {/* Title & Price Header */}
            <div className="space-y-3 pb-6 border-b border-border">
              <span className="text-xs uppercase tracking-caps text-gold font-medium block">
                {product.category} &middot; {product.sku}
              </span>
              <h1 className="font-display text-3xl sm:text-4xl text-ink font-normal leading-tight">
                {product.name}
              </h1>
              <div className="flex items-center justify-between pt-1">
                <span className="font-sans font-semibold text-2xl text-ink tabular-nums">
                  {formatINR(product.pricePaise)}
                </span>
                <span className="text-xs text-muted font-sans">
                  All applicable duties included &middot; Free courier
                </span>
              </div>
            </div>

            {/* Description */}
            <p className="text-muted text-sm leading-relaxed font-sans">
              {product.description}
            </p>

            {/* Color Swatches */}
            {product.colors.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="uppercase tracking-caps text-muted font-medium">
                    Shade:
                  </span>
                  <span className="text-ink font-medium">{selectedColor}</span>
                </div>
                <div className="flex items-center space-x-2">
                  {product.colors.map((color) => (
                    <button
                      key={color.name}
                      type="button"
                      onClick={() => setSelectedColor(color.name)}
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${
                        selectedColor === color.name
                          ? "border-navy scale-110"
                          : "border-transparent hover:scale-105"
                      }`}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                      aria-label={color.name}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Size Selector Chips */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="uppercase tracking-caps text-muted font-medium">
                  Select Atelier Size:
                </span>
                <button
                  type="button"
                  onClick={() => toggleAccordion("fit")}
                  className="text-gold hover:underline font-medium"
                >
                  Size &amp; Fit Guide
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {product.sizes.map((s) => {
                  const isSelected = selectedSize === s.size;
                  return (
                    <button
                      key={s.size}
                      type="button"
                      disabled={!s.available}
                      onClick={() => setSelectedSize(s.size)}
                      className={`py-3 text-xs uppercase tracking-caps font-semibold border transition-all text-center focus:outline-none ${
                        !s.available
                          ? "bg-surface-muted text-muted/40 border-border/60 cursor-not-allowed line-through"
                          : isSelected
                          ? "bg-navy text-canvas border-navy shadow-sm"
                          : "bg-surface text-ink border-border hover:border-gold hover:text-gold"
                      }`}
                      aria-label={`Size ${s.size} ${!s.available ? "out of stock" : ""}`}
                    >
                      {s.size}
                    </button>
                  );
                })}
              </div>

              {/* Stock status indicator */}
              <div className="flex items-center space-x-2 pt-1 text-xs">
                {isAvailable ? (
                  <span className="inline-flex items-center text-stock-ok space-x-1.5 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>In stock at Delhi atelier &mdash; ready for immediate dispatch</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center text-rust space-x-1.5 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Selected size currently out of stock</span>
                  </span>
                )}
              </div>
            </div>

            {/* Primary Action Button */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!isAvailable}
                className="w-full bg-navy text-canvas hover:bg-gold hover:text-navy py-4 px-6 text-xs uppercase tracking-caps font-semibold flex items-center justify-center space-x-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                {addedAnimation ? (
                  <>
                    <Sparkles className="w-4 h-4 text-gold animate-bounce" />
                    <span>Added to Atelier Bag</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" />
                    <span>Add to Atelier Bag &mdash; {formatINR(product.pricePaise)}</span>
                  </>
                )}
              </button>

              <p className="text-center text-[11px] text-muted font-sans">
                Guest checkout &middot; No account creation required &middot; Direct WhatsApp concierge
              </p>
            </div>

            {/* Product Specifications Accordions */}
            <div className="border-t border-border divide-y divide-border pt-4">
              {/* Accordion 1: Details */}
              <div className="py-3">
                <button
                  type="button"
                  onClick={() => toggleAccordion("details")}
                  className="w-full flex justify-between items-center text-xs uppercase tracking-caps font-medium text-ink hover:text-gold transition-colors py-1"
                >
                  <span>Composition &amp; Construction</span>
                  <ChevronDown
                    className={`w-4 h-4 text-muted transition-transform duration-200 ${
                      openAccordion === "details" ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {openAccordion === "details" && (
                  <div className="pt-3 pb-2 text-xs text-muted leading-relaxed font-sans space-y-2">
                    <p>{product.longDescription}</p>
                    <ul className="list-disc pl-4 space-y-1 pt-1">
                      {product.details.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Accordion 2: Sizing & Fit */}
              <div className="py-3">
                <button
                  type="button"
                  onClick={() => toggleAccordion("fit")}
                  className="w-full flex justify-between items-center text-xs uppercase tracking-caps font-medium text-ink hover:text-gold transition-colors py-1"
                >
                  <span>Tailoring &amp; Fit Notes</span>
                  <ChevronDown
                    className={`w-4 h-4 text-muted transition-transform duration-200 ${
                      openAccordion === "fit" ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {openAccordion === "fit" && (
                  <div className="pt-3 pb-2 text-xs text-muted leading-relaxed font-sans space-y-2">
                    <p>
                      Cut with a relaxed, architectural ease through the chest and shoulders.
                      True to size for a structured drape; size down if you prefer a slim-fitting profile.
                    </p>
                    <div className="bg-surface-muted p-3 border border-border text-[11px]">
                      <span className="font-semibold text-ink block mb-1">Complimentary Studio Alterations:</span>
                      Include your sleeve or inseam measurements in the checkout notes, and our atelier will customize before dispatch at zero charge.
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion 3: Care & Maintenance */}
              <div className="py-3">
                <button
                  type="button"
                  onClick={() => toggleAccordion("care")}
                  className="w-full flex justify-between items-center text-xs uppercase tracking-caps font-medium text-ink hover:text-gold transition-colors py-1"
                >
                  <span>Garment Care &amp; Laundering</span>
                  <ChevronDown
                    className={`w-4 h-4 text-muted transition-transform duration-200 ${
                      openAccordion === "care" ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {openAccordion === "care" && (
                  <div className="pt-3 pb-2 text-xs text-muted leading-relaxed font-sans space-y-1">
                    <ul className="list-disc pl-4 space-y-1">
                      {product.careInstructions.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Accordion 4: Shipping & Guarantees */}
              <div className="py-3">
                <button
                  type="button"
                  onClick={() => toggleAccordion("shipping")}
                  className="w-full flex justify-between items-center text-xs uppercase tracking-caps font-medium text-ink hover:text-gold transition-colors py-1"
                >
                  <span>Delivery &amp; Return Terms</span>
                  <ChevronDown
                    className={`w-4 h-4 text-muted transition-transform duration-200 ${
                      openAccordion === "shipping" ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {openAccordion === "shipping" && (
                  <div className="pt-3 pb-2 text-xs text-muted leading-relaxed font-sans space-y-2">
                    <p>
                      All garments are pressed and shipped in eco-friendly cotton garment bags via express courier.
                      Tracking updates and payment receipt are delivered straight to your WhatsApp.
                    </p>
                    <p>
                      Complimentary 7-day returns or size exchanges on all unworn items in original packaging.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Service proof icons */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border text-center text-muted">
              <div className="flex flex-col items-center space-y-1.5">
                <Scissors className="w-4 h-4 text-gold" />
                <span className="text-[10px] uppercase tracking-wider text-ink font-medium">Bespoke Fit</span>
              </div>
              <div className="flex flex-col items-center space-y-1.5">
                <Truck className="w-4 h-4 text-gold" />
                <span className="text-[10px] uppercase tracking-wider text-ink font-medium">Insured Transit</span>
              </div>
              <div className="flex flex-col items-center space-y-1.5">
                <ShieldCheck className="w-4 h-4 text-gold" />
                <span className="text-[10px] uppercase tracking-wider text-ink font-medium">Direct UPI QR</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
