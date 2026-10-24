"use client";

import React, { useEffect, useRef, useState } from "react";
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
  const [smootherActive, setSmootherActive] = useState(false);
  const smootherRef = useRef<any>(null);

  useEffect(() => {
    const isEligible = isEligibleStorefrontRoute(pathname);

    // 1. Guard against non-eligible routes or users requesting reduced motion
    if (!isEligible || isReducedMotion()) {
      if (smootherRef.current) {
        try {
          smootherRef.current.kill();
          smootherRef.current = null;
        } catch {
          // ignore cleanup error
        }
        setSmootherActive(false);
      }
      return;
    }

    // 2. Safe client plugin registration
    const { hasScrollTrigger, hasScrollSmoother } = registerGsapPlugins();
    if (!hasScrollTrigger || !hasScrollSmoother) {
      return;
    }

    // 3. Clear any existing instance to prevent duplicates during React Strict Mode / remounts
    try {
      const existing = ScrollSmoother.get();
      if (existing) {
        existing.kill();
      }

      const wrapperEl = document.getElementById("smooth-wrapper");
      const contentEl = document.getElementById("smooth-content");

      if (wrapperEl && contentEl) {
        smootherRef.current = ScrollSmoother.create({
          wrapper: wrapperEl,
          content: contentEl,
          smooth: 0.8,
          effects: true,
          smoothTouch: 0, // Preserve responsive native touch scrolling on mobile
          normalizeScroll: false, // Prevent synthetic scroll locking
        });

        setSmootherActive(true);
      }
    } catch (err) {
      // Graceful fallback to native scrolling if initialization encounters environment constraints
      console.info("ScrollSmoother degraded gracefully to native scroll:", err);
      setSmootherActive(false);
    }

    // 4. Teardown lifecycle on route change or unmount
    return () => {
      if (smootherRef.current) {
        try {
          smootherRef.current.kill();
          smootherRef.current = null;
        } catch {
          // cleanup best effort
        }
      }
      try {
        ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
      } catch {
        // ignore
      }
      setSmootherActive(false);
    };
  }, [pathname]);

  return <>{children}</>;
}
