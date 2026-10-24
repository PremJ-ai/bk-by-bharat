"use client";

import React, { useRef, useEffect, useState } from "react";
import { isReducedMotion } from "@/lib/motion/gsap";

interface ProductMediaProps {
  src?: string;
  videoSrc?: string;
  posterSrc?: string;
  alt: string;
  aspectRatio?: string; // e.g. "aspect-[4/5]" or "aspect-[3/4]"
  className?: string;
  priority?: boolean;
  autoplayOnHover?: boolean;
  autoplayOnView?: boolean;
}

export function ProductMedia({
  src,
  videoSrc,
  posterSrc,
  alt,
  aspectRatio = "aspect-[4/5]",
  className = "",
  priority = false,
  autoplayOnHover = true,
  autoplayOnView = false,
}: ProductMediaProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  // Safe play helper catching unhandled play promises
  const safePlay = () => {
    if (!videoRef.current || videoFailed || isReducedMotion()) return;
    const promise = videoRef.current.play();
    if (promise !== undefined) {
      promise
        .then(() => setIsPlaying(true))
        .catch(() => {
          // Autoplay was blocked or aborted by browser policy
          setIsPlaying(false);
        });
    }
  };

  const safePause = () => {
    if (!videoRef.current) return;
    try {
      videoRef.current.pause();
    } catch {
      // ignore
    }
    setIsPlaying(false);
  };

  // Autoplay on view / IntersectionObserver
  useEffect(() => {
    if (!videoSrc || videoFailed || isReducedMotion()) return;

    if (!autoplayOnView) return;

    const target = containerRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            safePlay();
          } else {
            safePause();
          }
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
      safePause();
    };
  }, [videoSrc, videoFailed, autoplayOnView]);

  return (
    <div
      ref={containerRef}
      className={`relative ${aspectRatio} overflow-hidden bg-surface-muted ${className}`}
      onMouseEnter={() => {
        if (videoSrc && autoplayOnHover) safePlay();
      }}
      onMouseLeave={() => {
        if (videoSrc && autoplayOnHover && !autoplayOnView) safePause();
      }}
      onFocus={() => {
        if (videoSrc && autoplayOnHover) safePlay();
      }}
      onBlur={() => {
        if (videoSrc && autoplayOnHover && !autoplayOnView) safePause();
      }}
    >
      {/* Video Presentation */}
      {videoSrc && !videoFailed ? (
        <video
          ref={videoRef}
          src={videoSrc}
          poster={posterSrc || src}
          muted
          loop
          playsInline
          preload="metadata"
          aria-label={alt}
          onError={() => setVideoFailed(true)}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isPlaying ? "opacity-100" : "opacity-90"
          }`}
        />
      ) : src ? (
        /* Image Presentation */
        <img
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.025]"
        />
      ) : (
        /* Fallback placeholder */
        <div className="flex flex-col items-center justify-center w-full h-full text-center p-6 space-y-2 select-none">
          <span className="font-display text-4xl text-muted/30 font-medium tracking-tight">
            {alt.split(" ").map((w) => w[0]).join("")}
          </span>
          <span className="text-[10px] uppercase tracking-caps text-muted/60 font-sans">
            Atelier Visual
          </span>
        </div>
      )}
    </div>
  );
}
