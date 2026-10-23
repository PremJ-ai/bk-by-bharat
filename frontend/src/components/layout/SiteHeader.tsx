"use client";

import Link from "next/link";
import { Search, ShoppingBag, Shield } from "lucide-react";
import { useCart } from "@/context/CartContext";

export function SiteHeader() {
  const { openCart, itemCount } = useCart();

  return (
    <header className="sticky top-0 z-40 bg-canvas/95 backdrop-blur-sm border-b border-border/80 transition-colors">
      <div className="max-w-[1440px] mx-auto px-6 md:px-12 h-20 flex items-center justify-between">
        {/* Navigation Categories */}
        <nav className="hidden md:flex items-center space-x-8 text-sm font-medium tracking-wide">
          <Link
            href="/collections/all"
            className="text-ink hover:text-gold transition-colors duration-200"
          >
            All Works
          </Link>
          <Link
            href="/collections/shirts"
            className="text-ink hover:text-gold transition-colors duration-200"
          >
            Shirts
          </Link>
          <Link
            href="/collections/trousers"
            className="text-ink hover:text-gold transition-colors duration-200"
          >
            Trousers
          </Link>
          <Link
            href="/collections/tailoring"
            className="text-ink hover:text-gold transition-colors duration-200"
          >
            Tailoring
          </Link>
        </nav>

        {/* Brand Mark */}
        <div className="text-center">
          <Link href="/" className="inline-block group focus:outline-none">
            <span className="font-display text-2xl md:text-3xl font-medium tracking-tight text-ink group-hover:text-navy transition-colors">
              BHARAT
            </span>
            <span className="block text-[9px] uppercase tracking-[0.25em] text-muted -mt-1 font-sans">
              New Delhi &middot; Est. 2026
            </span>
          </Link>
        </div>

        {/* Header Actions */}
        <div className="flex items-center space-x-5 text-ink">
          <Link
            href="/collections/all"
            aria-label="Search catalog"
            className="p-2 hover:text-gold transition-colors focus:outline-none focus:ring-1 focus:ring-focus rounded"
          >
            <Search className="w-4 h-4" />
          </Link>

          <Link
            href="/admin"
            aria-label="Staff Administration"
            title="Administrator Portal"
            className="p-2 text-muted hover:text-navy transition-colors focus:outline-none focus:ring-1 focus:ring-focus rounded"
          >
            <Shield className="w-4 h-4" />
          </Link>

          <button
            type="button"
            onClick={openCart}
            aria-label={`View shopping bag (${itemCount} items)`}
            className="p-2 hover:text-gold transition-colors relative focus:outline-none focus:ring-1 focus:ring-focus rounded"
          >
            <ShoppingBag className="w-4 h-4" />
            {itemCount > 0 ? (
              <span className="absolute -top-1 -right-1 bg-gold text-navy font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-sans">
                {itemCount}
              </span>
            ) : (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-gold/70 rounded-full" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
