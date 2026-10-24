"use client";

import React from "react";
import { usePathname } from "next/navigation";
import {
  SmoothScrollProvider,
  isEligibleStorefrontRoute,
} from "@/components/motion/SmoothScrollProvider";

interface StorefrontLayoutProps {
  children: React.ReactNode;
}

export function StorefrontLayout({ children }: StorefrontLayoutProps) {
  const pathname = usePathname();
  const isEligible = isEligibleStorefrontRoute(pathname);

  // When visiting checkout, orders, or admin, do not use the smooth scroll wrapper/content shell.
  // Native scrolling and default positioning are preserved completely.
  if (!isEligible) {
    return <>{children}</>;
  }

  return (
    <SmoothScrollProvider>
      <div id="smooth-wrapper" className="w-full">
        <div id="smooth-content" className="w-full min-h-screen">
          {children}
        </div>
      </div>
    </SmoothScrollProvider>
  );
}
