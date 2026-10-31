"use client";

import React, { useRef } from "react";
import { useGSAP } from "@gsap/react";
import {
  registerGsapPlugins,
  gsap,
  isReducedMotion,
  MOTION_TOKENS,
} from "@/lib/motion/gsap";

interface StaggeredGridProps {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
  productGrid?: boolean;
}

export function StaggeredGrid({
  children,
  className = "",
  stagger = 0.06,
  productGrid = false,
}: StaggeredGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (isReducedMotion() || !gridRef.current) return;

      registerGsapPlugins();

      const items = gridRef.current.querySelectorAll("[data-grid-item]");
      if (items.length === 0) return;

      gsap.fromTo(
        items,
        {
          opacity: 0,
          y: 24,
          scale: 0.96,
          willChange: "transform, opacity",
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: MOTION_TOKENS.durations.reveal,
          ease: MOTION_TOKENS.eases.reveal,
          stagger,
          scrollTrigger: {
            trigger: gridRef.current,
            start: "top 88%",
            once: true,
            invalidateOnRefresh: true,
          },
          clearProps: "willChange",
        }
      );
    },
    { scope: gridRef, dependencies: [children] }
  );

  return (
    <div ref={gridRef} className={className} data-product-grid={productGrid ? "" : undefined}>
      {children}
    </div>
  );
}
