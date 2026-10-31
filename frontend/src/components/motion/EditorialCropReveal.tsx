"use client";

import React, { useRef } from "react";
import { useGSAP } from "@gsap/react";
import {
  registerGsapPlugins,
  gsap,
  isReducedMotion,
  MOTION_TOKENS,
} from "@/lib/motion/gsap";

interface EditorialCropRevealProps {
  children: React.ReactNode;
  className?: string;
}

export function EditorialCropReveal({
  children,
  className = "",
}: EditorialCropRevealProps) {
  const frameRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (isReducedMotion() || !frameRef.current) return;

      registerGsapPlugins();

      gsap.fromTo(
        frameRef.current,
        {
          clipPath: "inset(4% 0% 4% 0%)",
          opacity: 0.8,
        },
        {
          clipPath: "inset(0% 0% 0% 0%)",
          opacity: 1,
          duration: MOTION_TOKENS.durations.editorial,
          ease: MOTION_TOKENS.eases.editorial,
          scrollTrigger: {
            trigger: frameRef.current,
            start: "top 88%",
            once: true,
            invalidateOnRefresh: true,
          },
        }
      );
    },
    { scope: frameRef }
  );

  return (
    <div ref={frameRef} className={`overflow-hidden ${className}`}>
      {children}
    </div>
  );
}
