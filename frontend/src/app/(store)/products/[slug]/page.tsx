"use client";

import { useState, use, useEffect } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { getStorefrontProductBySlug, type DetailedProductModel } from "@/lib/api/catalog";
import { ApiError } from "@/lib/api/client";
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
  Loader2,
} from "lucide-react";
import { ProductGallery } from "@/components/media/ProductGallery";
import { EditorialCropReveal } from "@/components/motion/EditorialCropReveal";
import { ParallaxFrame } from "@/components/motion/ParallaxFrame";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export default function ProductDetailPage({ params }: ProductPageProps) {
  const resolvedParams = use(params);
  const [product, setProduct] = useState<DetailedProductModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [productNotFound, setProductNotFound] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const { addItem } = useCart();

  // State
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [openAccordion, setOpenAccordion] = useState<string | null>("details");
  const [addedAnimation, setAddedAnimation] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setCatalogError(null);
    setProductNotFound(false);

    getStorefrontProductBySlug(resolvedParams.slug)
      .then((data) => {
        if (!cancelled && data) {
          setProduct(data);
          setLoading(false);
          const firstAvailableColor = data.colors.find((color) =>
            data.sizes.some((size) => size.colorName === color.name && size.available)
          );
          const initialColor = firstAvailableColor?.name || data.colors[0]?.name || "Standard";
          setSelectedColor(initialColor);
          setSelectedSize(
            data.sizes.find(
              (size) => size.available && (!size.colorName || size.colorName === initialColor)
            )?.size || ""
          );
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          if (error instanceof ApiError && error.status === 404) {
            setProductNotFound(true);
          } else {
            console.error("Unable to load product detail from the catalog API:", error);
            setCatalogError("This product is temporarily unavailable. Please try again shortly.");
          }
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [resolvedParams.slug, retryCount]);

  if (loading && !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <Loader2 className="w-8 h-8 animate-spin text-navy" />
      </div>
    );
  }

  if (productNotFound) {
    notFound();
  }

  if (!product && catalogError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-canvas px-6 text-center">
        <p role="alert" className="max-w-md text-sm leading-relaxed text-muted">{catalogError}</p>
        <button
          type="button"
          onClick={() => setRetryCount((count) => count + 1)}
          className="mt-5 bg-navy px-5 py-3 text-xs font-semibold uppercase tracking-caps text-canvas transition-colors hover:bg-gold hover:text-navy"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!product) {
    return null;
  }

  const selectedSizeObj = product.sizes?.find(
    (size) =>
      size.size === selectedSize &&
      (!size.colorName || !selectedColor || size.colorName === selectedColor)
  );
  const isAvailable = selectedSizeObj?.available ?? false;
  const fabricSpecifications = product.fabricSpecifications;
  const specificationRows = [
    { label: "Fabric", value: fabricSpecifications?.fabricName },
    { label: "Composition", value: fabricSpecifications?.composition },
    { label: "Weight", value: fabricSpecifications?.weightGsm ? `${fabricSpecifications.weightGsm} GSM` : undefined },
    { label: "Weave", value: fabricSpecifications?.weave },
    { label: "Texture", value: fabricSpecifications?.texture },
    { label: "Stretch", value: fabricSpecifications?.stretch },
    { label: "Finish", value: fabricSpecifications?.finish },
    { label: "Fit", value: fabricSpecifications?.fit },
    { label: "Pattern", value: fabricSpecifications?.pattern },
    { label: "Colour", value: fabricSpecifications?.colour },
    { label: "Origin", value: fabricSpecifications?.origin },
  ].filter((row) => row.value !== undefined && row.value !== null && row.value !== "");

  const handleAddToCart = () => {
    if (!selectedSize || !selectedSizeObj?.available) return;

    addItem({
      productId: product.id,
      variantId: selectedSizeObj?.id,
      name: product.name,
      slug: product.slug,
      material: product.material,
      size: selectedSize,
      color: selectedColor,
      pricePaise: selectedSizeObj.pricePaise,
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
            <EditorialCropReveal>
              <ParallaxFrame speed={0.04}>
                <div className="relative">
                  <ProductGallery
                    name={product.name}
                    primaryImage={product.imageUrl}
                    galleryImages={product.galleryImages}
                    media={product.galleryMedia}
                  />
                  {product.badge && (
                    <span className="absolute left-4 top-4 z-10 bg-navy px-3 py-1 text-xs font-medium uppercase tracking-caps text-canvas shadow-sm">
                      {product.badge}
                    </span>
                  )}
                </div>
              </ParallaxFrame>
            </EditorialCropReveal>
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
                  {formatINR(selectedSizeObj?.pricePaise ?? product.pricePaise)}
                </span>
                <span className="text-xs text-muted font-sans">Price shown in INR</span>
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
                      onClick={() => {
                        setSelectedColor(color.name);
                        setSelectedSize((currentSize) => {
                          const availableVariant = product.sizes.find(
                            (size) => size.colorName === color.name && size.available
                          );
                          return availableVariant?.size || currentSize;
                        });
                      }}
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${
                        selectedColor === color.name
                          ? "border-navy scale-110"
                          : "border-transparent hover:scale-105"
                      }`}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                      aria-label={color.name}
                      aria-pressed={selectedColor === color.name}
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
                {[...new Set(product.sizes.map((size) => size.size))].map((size) => {
                  const variant = product.sizes.find(
                    (item) =>
                      item.size === size &&
                      (!item.colorName || !selectedColor || item.colorName === selectedColor)
                  );
                  const isSelected = selectedSize === size;
                  return (
                    <button
                      key={size}
                      type="button"
                      disabled={!variant?.available}
                      onClick={() => setSelectedSize(size)}
                      className={`py-3 text-xs uppercase tracking-caps font-semibold border transition-all text-center focus:outline-none ${
                        !variant?.available
                          ? "bg-surface-muted text-muted/40 border-border/60 cursor-not-allowed line-through"
                          : isSelected
                          ? "bg-navy text-canvas border-navy shadow-sm"
                          : "bg-surface text-ink border-border hover:border-gold hover:text-gold"
                      }`}
                      aria-label={`Size ${size} ${!variant?.available ? "out of stock" : ""}`}
                      aria-pressed={isSelected}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>

              {/* Stock status indicator */}
              <div className="flex items-center space-x-2 pt-1 text-xs">
                {isAvailable ? (
                  <span className="inline-flex items-center text-stock-ok space-x-1.5 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Selected size is in stock</span>
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
                Guest checkout &middot; No account required
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
                    {product.longDescription && <p>{product.longDescription}</p>}
                    {specificationRows.length > 0 && (
                      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 border-y border-border py-3">
                        {specificationRows.map(({ label, value }) => (
                          <div key={label} className="contents">
                            <dt className="font-medium text-ink">{label}</dt>
                            <dd>{value}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                    {fabricSpecifications?.fibrePercentages && fabricSpecifications.fibrePercentages.length > 0 && (
                      <ul className="list-disc space-y-1 pl-4">
                        {fabricSpecifications.fibrePercentages.map((fibre) => (
                          <li key={fibre.fibre}>{fibre.fibre}: {fibre.percentage}%</li>
                        ))}
                      </ul>
                    )}
                    {product.details.length > 0 && (
                      <ul className="list-disc space-y-1 pl-4 pt-1">
                        {product.details.map((detail, index) => <li key={index}>{detail}</li>)}
                      </ul>
                    )}
                    {product.longDescription === undefined &&
                      specificationRows.length === 0 &&
                      product.details.length === 0 && (
                        <p>No additional garment details have been provided.</p>
                      )}
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
                    {fabricSpecifications?.fit
                      ? <p>{fabricSpecifications.fit}</p>
                      : <p>No fit guidance has been provided for this garment.</p>}
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
                    {product.careInstructions.length === 0 && <p>No care instructions have been provided.</p>}
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
                    <p>Delivery and return details are shown as part of the order checkout flow.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Service proof icons */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border text-center text-muted">
              <div className="flex flex-col items-center space-y-1.5">
                <Scissors className="w-4 h-4 text-gold" />
                <span className="text-[10px] uppercase tracking-wider text-ink font-medium">Size selection</span>
              </div>
              <div className="flex flex-col items-center space-y-1.5">
                <Truck className="w-4 h-4 text-gold" />
                <span className="text-[10px] uppercase tracking-wider text-ink font-medium">Guest checkout</span>
              </div>
              <div className="flex flex-col items-center space-y-1.5">
                <ShieldCheck className="w-4 h-4 text-gold" />
                <span className="text-[10px] uppercase tracking-wider text-ink font-medium">Order details</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
