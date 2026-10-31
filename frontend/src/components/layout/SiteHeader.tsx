"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGSAP } from "@gsap/react";
import { Menu, Search, ShoppingBag, Shield, X } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { getStorefrontProducts } from "@/lib/api/catalog";
import type { ProductViewModel } from "@/components/product/product.types";
import { formatINR } from "@/components/product/ProductCard";
import {
  gsap,
  isReducedMotion,
  MOTION_TOKENS,
  registerGsapPlugins,
} from "@/lib/motion/gsap";

export function SiteHeader() {
  const router = useRouter();
  const { openCart, itemCount } = useCart();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<ProductViewModel[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!mobileMenuOpen || isReducedMotion() || !headerRef.current) return;

      registerGsapPlugins();
      const popup = headerRef.current.querySelector<HTMLElement>("[data-mobile-menu]");
      if (!popup) return;

      const links = popup.querySelectorAll<HTMLElement>("[data-mobile-menu-item]");
      const timeline = gsap.timeline();
      timeline.fromTo(
        popup,
        { opacity: 0, y: -8, clipPath: "inset(0 0 100% 0)" },
        {
          opacity: 1,
          y: 0,
          clipPath: "inset(0 0 0% 0)",
          duration: MOTION_TOKENS.durations.ui,
          ease: MOTION_TOKENS.eases.ui,
        }
      );
      timeline.fromTo(
        links,
        { opacity: 0, y: -6 },
        {
          opacity: 1,
          y: 0,
          duration: MOTION_TOKENS.durations.fast,
          stagger: 0.045,
          ease: MOTION_TOKENS.eases.ui,
          clearProps: "transform,opacity",
        },
        "-=0.16"
      );
    },
    { scope: headerRef, dependencies: [mobileMenuOpen], revertOnUpdate: true }
  );

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    const query = searchTerm.trim();
    if (!searchOpen || query.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      setSearchError(null);
      return;
    }

    let cancelled = false;
    setSearchLoading(true);
    setSearchError(null);
    const timer = window.setTimeout(() => {
      getStorefrontProducts({ search: query, limit: 5 })
        .then(({ items }) => {
          if (!cancelled) setSearchResults(items);
        })
        .catch((error: unknown) => {
          if (!cancelled) {
            console.error("Catalog search request failed:", error);
            setSearchResults([]);
            setSearchError("Search is temporarily unavailable. Please try again.");
          }
        })
        .finally(() => {
          if (!cancelled) setSearchLoading(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchOpen, searchTerm]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (searchOpen) {
          setSearchOpen(false);
          searchButtonRef.current?.focus();
        }
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchOpen]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchTerm.trim();
    if (!query) return;
    setSearchOpen(false);
    router.push(`/collections/all?search=${encodeURIComponent(query)}`);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    searchButtonRef.current?.focus();
  };

  return (
    <header ref={headerRef} className="sticky top-0 z-40 bg-canvas/95 backdrop-blur-sm border-b border-border/80 transition-colors">
      <div className="max-w-[1440px] mx-auto px-6 md:px-12 h-20 flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            setMobileMenuOpen((open) => !open);
            setSearchOpen(false);
          }}
          aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileMenuOpen}
          className="md:hidden p-2 -ml-2 text-ink hover:text-gold transition-colors focus:outline-none focus:ring-1 focus:ring-focus rounded"
        >
          {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>

        {/* Navigation Categories */}
        <nav aria-label="Main navigation" className="hidden md:flex items-center space-x-8 text-sm font-medium tracking-wide">
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
              BK
            </span>
            <span className="block text-[9px] uppercase tracking-[0.25em] text-muted -mt-1 font-sans">
              BY BHARAT
            </span>
          </Link>
        </div>

        {/* Header Actions */}
        <div className="flex items-center space-x-5 text-ink">
          <button
            ref={searchButtonRef}
            type="button"
            onClick={() => {
              setSearchOpen((open) => !open);
              setMobileMenuOpen(false);
            }}
            aria-label={searchOpen ? "Close catalog search" : "Search catalog"}
            aria-expanded={searchOpen}
            className="p-2 hover:text-gold transition-colors focus:outline-none focus:ring-1 focus:ring-focus rounded"
          >
            <Search className="w-4 h-4" />
          </button>

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

      {mobileMenuOpen && (
        <nav
          data-mobile-menu
          aria-label="Mobile navigation"
          className="md:hidden absolute inset-x-0 top-full border-b border-border bg-canvas px-6 py-5 shadow-lg"
        >
          <div className="flex flex-col gap-4 text-sm font-medium tracking-wide">
            {[
              ["All Works", "/collections/all"],
              ["Shirts", "/collections/shirts"],
              ["Trousers", "/collections/trousers"],
              ["Tailoring", "/collections/tailoring"],
            ].map(([label, href]) => (
              <Link
                key={href}
                data-mobile-menu-item
                href={href}
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 text-ink hover:text-gold transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>
        </nav>
      )}

      {searchOpen && (
        <div
          role="dialog"
          aria-label="Search the catalog"
          className="absolute inset-x-0 top-full border-b border-border bg-canvas p-5 shadow-xl md:px-12"
        >
          <div className="mx-auto max-w-[1440px]">
            <form onSubmit={submitSearch} className="flex items-center gap-3">
              <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-muted" />
              <input
                ref={searchInputRef}
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search garments, materials, and silhouettes"
                aria-label="Search garments, materials, and silhouettes"
                className="min-w-0 flex-1 border-0 bg-transparent py-2 text-sm text-ink outline-none placeholder:text-muted"
              />
              <button
                type="submit"
                disabled={!searchTerm.trim()}
                className="bg-navy px-4 py-2 text-[10px] font-semibold uppercase tracking-caps text-canvas transition-colors hover:bg-gold hover:text-navy disabled:opacity-50"
              >
                Search
              </button>
              <button
                type="button"
                onClick={closeSearch}
                aria-label="Close search"
                className="p-2 text-muted hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </form>

            {searchTerm.trim().length > 0 && (
              <div className="mt-4 border-t border-border pt-3" aria-live="polite">
                {searchTerm.trim().length < 2 ? (
                  <p className="text-xs text-muted">Enter at least two characters to search.</p>
                ) : searchLoading ? (
                  <p className="text-xs text-muted">Searching the published collection…</p>
                ) : searchError ? (
                  <p role="alert" className="text-xs text-rust">{searchError}</p>
                ) : searchResults.length > 0 ? (
                  <ul className="divide-y divide-border">
                    {searchResults.map((product) => (
                      <li key={product.id}>
                        <Link
                          href={`/products/${product.slug}`}
                          onClick={closeSearch}
                          className="flex items-center justify-between gap-4 py-3 text-sm hover:text-gold"
                        >
                          <span>
                            <span className="block font-medium text-ink">{product.name}</span>
                            <span className="text-xs text-muted">{product.category} · {product.material}</span>
                          </span>
                          <span className="shrink-0 text-xs tabular-nums text-ink">
                            {formatINR(product.pricePaise)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted">No published garments match that search.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
