"use client";

import React, { useRef } from "react";
import { useGSAP } from "@gsap/react";
import {
  registerGsapPlugins,
  gsap,
  isReducedMotion,
  MOTION_TOKENS,
} from "@/lib/motion/gsap";

interface SectionRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  yOffset?: number;
}

export function SectionReveal({
  children,
  className = "",
  delay = 0,
  yOffset = 28,
}: SectionRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (isReducedMotion() || !containerRef.current) return;

      registerGsapPlugins();

      gsap.fromTo(
        containerRef.current,
        {
          opacity: 0,
          y: yOffset,
        },
        {
          opacity: 1,
          y: 0,
          duration: MOTION_TOKENS.durations.reveal,
          ease: MOTION_TOKENS.eases.reveal,
          delay,
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 82%",
            once: true,
          },
        }
      );
    },
    { scope: containerRef }
  );

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}
