"use client";

import React, { useRef } from "react";
import { useGSAP } from "@gsap/react";
import {
  registerGsapPlugins,
  gsap,
  isReducedMotion,
  isTouchDevice,
} from "@/lib/motion/gsap";

interface ParallaxFrameProps {
  children: React.ReactNode;
  className?: string;
  speed?: number; // Visual shift fraction (e.g. 0.05 for 5% travel)
}

export function ParallaxFrame({
  children,
  className = "",
  speed = 0.05,
}: ParallaxFrameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (isReducedMotion() || isTouchDevice() || !containerRef.current || !targetRef.current) {
        return;
      }

      registerGsapPlugins();

      const mm = gsap.matchMedia();

      // Only run parallax on desktop screens (>=1024px)
      mm.add("(min-width: 1024px)", () => {
        gsap.fromTo(
          targetRef.current,
          {
            yPercent: -speed * 100,
          },
          {
            yPercent: speed * 100,
            ease: "none",
            scrollTrigger: {
              trigger: containerRef.current,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
          }
        );
      });

      return () => mm.revert();
    },
    { scope: containerRef }
  );

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${className}`}>
      <div ref={targetRef} className="w-full h-full scale-[1.08] will-change-transform">
        {children}
      </div>
    </div>
  );
}
