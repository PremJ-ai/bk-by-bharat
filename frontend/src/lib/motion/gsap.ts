"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { Draggable } from "gsap/Draggable";
import { useGSAP } from "@gsap/react";

// Motion Tokens according to design.md Section 6
export const MOTION_TOKENS = {
  durations: {
    fast: 0.22,
    ui: 0.3,
    reveal: 0.75,
    editorial: 1.0,
    loop: 32.0,
  },
  eases: {
    fast: "power2.out",
    ui: "power2.out",
    reveal: "power3.out",
    editorial: "power3.out",
  },
} as const;

let isRegistered = false;

/**
 * Centrally registers GSAP plugins safely in client-side Next.js
 */
export function registerGsapPlugins(): {
  hasScrollTrigger: boolean;
  hasScrollSmoother: boolean;
} {
  if (typeof window === "undefined") {
    return { hasScrollTrigger: false, hasScrollSmoother: false };
  }

  if (!isRegistered) {
    try {
      gsap.registerPlugin(ScrollTrigger, ScrollSmoother, Draggable, useGSAP);
      isRegistered = true;
    } catch (err) {
      console.warn("GSAP plugin registration warning:", err);
    }
  }

  return {
    hasScrollTrigger: typeof ScrollTrigger !== "undefined",
    hasScrollSmoother: typeof ScrollSmoother !== "undefined",
  };
}

/**
 * Checks whether user has requested prefers-reduced-motion
 */
export function isReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Checks if current device is a touch/mobile device
 */
export function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}

export { gsap, ScrollTrigger, ScrollSmoother, Draggable };
