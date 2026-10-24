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
}

export function StaggeredGrid({
  children,
  className = "",
  stagger = 0.06,
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
          y: 20,
        },
        {
          opacity: 1,
          y: 0,
          duration: MOTION_TOKENS.durations.reveal,
          ease: MOTION_TOKENS.eases.reveal,
          stagger,
          scrollTrigger: {
            trigger: gridRef.current,
            start: "top 85%",
            once: true,
          },
        }
      );
    },
    { scope: gridRef, dependencies: [children] }
  );

  return (
    <div ref={gridRef} className={className}>
      {children}
    </div>
  );
}
