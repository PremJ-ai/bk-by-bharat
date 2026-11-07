"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useGSAP } from "@gsap/react";
import { Menu, Search, ShoppingBag, Shield, X, ArrowUpRight } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { getStorefrontProducts } from "@/lib/api/catalog";
import type { ProductViewModel } from "@/components/product/product.types";
import { formatINR } from "@/components/product/ProductCard";
import { trackGA4Event } from "@/lib/analytics/ga4";
import {
  gsap,
  isReducedMotion,
  MOTION_TOKENS,
  registerGsapPlugins,
} from "@/lib/motion/gsap";

export function SiteHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const isLandingPage = pathname === "/";
  const { openCart, itemCount } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<ProductViewModel[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!mobileMenuOpen || isReducedMotion() || !headerRef.current) return;

      registerGsapPlugins();
      const menu = headerRef.current.querySelector<HTMLElement>("[data-mobile-menu]");
      if (!menu) return;

      const links = menu.querySelectorAll<HTMLElement>("[data-mobile-menu-item]");
      const timeline = gsap.timeline();
      timeline.fromTo(
        menu,
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
    const updateScrollState = () => {
      const next = window.scrollY > 42;
      setIsScrolled((current) => (current === next ? current : next));
    };

    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });
    return () => window.removeEventListener("scroll", updateScrollState);
  }, []);

  useEffect(() => {
    const query = searchTerm.trim();
    if (query.length < 2) {
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
  }, [searchTerm]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSearchTerm("");
        setMobileMenuOpen(false);
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchTerm.trim();
    if (!query) return;
    // Record search usage without forwarding free-form customer-entered text to GA4.
    trackGA4Event("search", { search_method: "header_search" });
    setSearchResults([]);
    router.push(`/collections/all?search=${encodeURIComponent(query)}`);
  };

  const announcementOffset = isScrolled ? "0px" : "var(--store-announcement-height, 32px)";

  return (
    <header
      ref={headerRef}
      style={isLandingPage ? { top: announcementOffset } : undefined}
      data-scrolled={isScrolled ? "true" : "false"}
      className={`${isLandingPage ? "fixed top-0" : "sticky top-0"} inset-x-0 z-50 border-b transition-all duration-300 ${!isLandingPage || isScrolled
        ? "border-[#e6dccf]/90 bg-[#fbf7f0]/96 shadow-[0_8px_24px_rgba(48,34,25,0.08)] backdrop-blur-xl"
        : "border-[#e6dccf]/35 bg-[#fbf7f0]/70 shadow-none backdrop-blur-md"}`}
    >
      <div className="mx-auto flex h-[68px] max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6 md:h-[76px] md:px-12">
        <div className="flex min-w-0 items-center gap-3 md:gap-8">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
            className="rounded-full p-2 text-[#5b493c] transition-colors hover:bg-white/65 hover:text-[#9b7448] focus:outline-none focus:ring-2 focus:ring-[#b58b5c]/40 md:hidden"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>

          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-7 text-[12px] font-semibold tracking-wide lg:flex"
          >
            <Link href="/collections/all" className="text-[#3b2b21] transition-colors hover:text-[#a57746]">All Works</Link>
            <Link href="/collections/shirts" className="text-[#3b2b21] transition-colors hover:text-[#a57746]">Shirts</Link>
            <Link href="/collections/trousers" className="text-[#3b2b21] transition-colors hover:text-[#a57746]">Trousers</Link>
            <Link href="/collections/tailoring" className="text-[#3b2b21] transition-colors hover:text-[#a57746]">Tailoring</Link>
          </nav>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 text-center">
          <Link href="/" className="group inline-block rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#a57746]">
            <span className="block font-display text-[25px] font-medium leading-none tracking-tight text-[#38281f] transition-colors group-hover:text-[#9b7448] md:text-[29px]">BK</span>
            <span className="mt-1 block text-[8px] uppercase tracking-[0.27em] text-[#746457]">BY BHARAT</span>
          </Link>
        </div>

        <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-2.5 md:gap-4">
          <form onSubmit={submitSearch} className="relative flex items-center">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-[#8f6846]" />
            <input
              ref={searchInputRef}
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search"
              aria-label="Search products"
              aria-autocomplete="list"
              aria-controls="store-search-suggestions"
              className="h-9 w-[104px] rounded-full border border-[#d9ccbb]/80 bg-white/65 py-2 pl-8 pr-3 text-[11px] text-[#35271f] outline-none transition-all placeholder:text-[#887b6d] focus:w-[140px] focus:border-[#b99469] focus:bg-white/95 focus:ring-2 focus:ring-[#b99469]/15 sm:w-[150px] sm:focus:w-[180px] md:h-10 md:w-[190px] md:text-xs lg:w-[220px]"
            />

            {searchTerm.trim().length >= 2 && (
              <div
                id="store-search-suggestions"
                role="listbox"
                aria-label="Catalog search suggestions"
                className="absolute right-0 top-full mt-2 w-[min(88vw,340px)] overflow-hidden rounded-xl border border-[#e5d9ca] bg-[#fffdf9] shadow-[0_18px_40px_rgba(48,34,25,0.16)]"
              >
                {searchLoading ? (
                  <p className="px-4 py-3 text-xs text-[#76685a]">Searching the collection…</p>
                ) : searchError ? (
                  <p role="alert" className="px-4 py-3 text-xs text-[#9c4a3b]">{searchError}</p>
                ) : searchResults.length > 0 ? (
                  <ul className="divide-y divide-[#eee6dc]">
                    {searchResults.map((product) => (
                      <li key={product.id}>
                        <Link
                          href={`/products/${product.slug}`}
                          onClick={() => setSearchTerm("")}
                          className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-[#f7f1e8]"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-semibold text-[#38281f]">{product.name}</span>
                            <span className="mt-0.5 block text-[10px] text-[#817364]">{product.category} · {product.material}</span>
                          </span>
                          <span className="shrink-0 text-[11px] tabular-nums text-[#6f5439]">{formatINR(product.pricePaise)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-4 py-3 text-xs text-[#76685a]">No published garments match that search.</p>
                )}
                <button
                  type="submit"
                  className="flex w-full items-center justify-between border-t border-[#eee6dc] px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-[0.13em] text-[#8b633c] transition-colors hover:bg-[#f7f1e8]"
                >
                  View all results <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </form>

          <Link
            href="/admin"
            aria-label="Staff Administration"
            title="Administrator Portal"
            className="rounded-full p-2 text-[#557466] transition-colors hover:bg-[#e9f0e9] hover:text-[#315c4c] focus:outline-none focus:ring-2 focus:ring-[#6e9886]/30"
          >
            <Shield className="h-[17px] w-[17px]" />
          </Link>

          <button
            type="button"
            onClick={openCart}
            aria-label={`View shopping bag (${itemCount} items)`}
            className="relative rounded-full p-2 text-[#a47743] transition-colors hover:bg-[#f5eadb] hover:text-[#79552c] focus:outline-none focus:ring-2 focus:ring-[#b58b5c]/30"
          >
            <ShoppingBag className="h-[17px] w-[17px]" />
            {itemCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#2e5f4b] px-1 font-sans text-[9px] font-bold text-white">
                {itemCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <nav
          data-mobile-menu
          aria-label="Mobile navigation"
          className="absolute inset-x-0 top-full border-t border-[#e8ddcf] bg-[#fbf7f0]/98 px-6 py-5 shadow-[0_18px_36px_rgba(48,34,25,0.12)] backdrop-blur-xl lg:hidden"
        >
          <div className="flex flex-col gap-4 text-sm font-semibold tracking-wide">
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
                className="py-1 text-[#3b2b21] transition-colors hover:text-[#a57746]"
              >
                {label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
