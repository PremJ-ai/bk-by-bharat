"use client";

import React, { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  registerGsapPlugins,
  ScrollSmoother,
  ScrollTrigger,
  isReducedMotion,
  isTouchDevice,
} from "@/lib/motion/gsap";

/**
 * Validates whether a route qualifies for ScrollSmoother.
 * Admin, checkout, and order status routes MUST NEVER run smooth scrolling.
 */
export function isEligibleStorefrontRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/orders") ||
    pathname.startsWith("/order-status")
  ) {
    return false;
  }
  return (
    pathname === "/" ||
    pathname.startsWith("/collections") ||
    pathname.startsWith("/products") ||
    pathname.startsWith("/craft")
  );
}

interface SmoothScrollProviderProps {
  children: React.ReactNode;
}

export function SmoothScrollProvider({ children }: SmoothScrollProviderProps) {
  const pathname = usePathname();
  const smootherRef = useRef<any>(null);

  useEffect(() => {
    const isEligible = isEligibleStorefrontRoute(pathname);

    // 1. Guard against non-eligible routes or users requesting reduced motion
    if (!isEligible || isReducedMotion()) {
      if (smootherRef.current) {
        smootherRef.current.kill();
        smootherRef.current = null;
      }
      return;
    }

    // 2. Safe client plugin registration
    const { hasScrollTrigger, hasScrollSmoother } = registerGsapPlugins();
    if (!hasScrollTrigger) return;

    if (hasScrollSmoother && !isTouchDevice()) {
      const wrapperEl = document.getElementById("smooth-wrapper");
      const contentEl = document.getElementById("smooth-content");
      try {
        if (wrapperEl && contentEl) {
          smootherRef.current = ScrollSmoother.create({
            wrapper: wrapperEl,
            content: contentEl,
            smooth: 0.8,
            effects: true,
            smoothTouch: 0,
            normalizeScroll: false,
          });
        }
      } catch (error) {
        console.info("ScrollSmoother degraded gracefully to native scroll:", error);
      }
    }

    const refreshFrame = window.requestAnimationFrame(() => ScrollTrigger.refresh());

    return () => {
      window.cancelAnimationFrame(refreshFrame);
      if (smootherRef.current) {
        smootherRef.current.kill();
        smootherRef.current = null;
      }
    };
  }, [pathname]);

  return <>{children}</>;
}
