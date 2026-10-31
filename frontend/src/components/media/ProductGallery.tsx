"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type TouchEvent,
} from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Play, X } from "lucide-react";

export interface ProductGalleryMedia {
  type: "IMAGE" | "VIDEO";
  url: string;
  altText: string;
  caption?: string;
  posterUrl?: string | null;
}

interface ProductGalleryProps {
  name: string;
  primaryImage?: string;
  media?: ProductGalleryMedia[];
  galleryImages?: string[];
}

export function ProductGallery({ name, primaryImage, media, galleryImages = [] }: ProductGalleryProps) {
  const imageMedia = galleryImages.map((url, index) => ({
    type: "IMAGE" as const,
    url,
    altText: `${name} — view ${index + 1}`,
  }));
  const legacyImageItems: ProductGalleryMedia[] = imageMedia.length
    ? imageMedia
    : primaryImage
      ? [{ type: "IMAGE", url: primaryImage, altText: name }]
      : [];
  const mediaItems = media?.filter((item) => item.url) ?? [];
  const savedPrimaryIndex = mediaItems.findIndex(
    (item) => item.type === "IMAGE" && item.url === primaryImage
  );
  const primaryIndex = savedPrimaryIndex >= 0
    ? savedPrimaryIndex
    : mediaItems.findIndex((item) => item.type === "IMAGE");
  const orderedMedia = mediaItems.length
    ? [
        ...(primaryIndex >= 0 ? [mediaItems[primaryIndex]] : []),
        ...mediaItems.filter((item) => item.type === "VIDEO"),
        ...mediaItems.filter((item, index) => index !== primaryIndex && item.type === "IMAGE"),
      ]
    : legacyImageItems;

  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => setIsMounted(true), []);
  useEffect(() => setActiveIndex((index) => Math.min(index, Math.max(orderedMedia.length - 1, 0))), [orderedMedia.length]);

  const showPrevious = useCallback(() => {
    setActiveIndex((index) => (index - 1 + orderedMedia.length) % orderedMedia.length);
  }, [orderedMedia.length]);
  const showNext = useCallback(() => {
    setActiveIndex((index) => (index + 1) % orderedMedia.length);
  }, [orderedMedia.length]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setLightboxOpen(false);
      if (event.key === "ArrowLeft") showPrevious();
      if (event.key === "ArrowRight") showNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxOpen, showNext, showPrevious]);

  const onGalleryKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      showPrevious();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      showNext();
    } else if (event.key === "Enter" && event.target === event.currentTarget) {
      setLightboxOpen(true);
    }
  };

  const onTouchEnd = (event: TouchEvent<HTMLElement>) => {
    if (touchStartX.current === null) return;
    const distance = event.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(distance) < 40) return;
    if (distance > 0) showPrevious();
    else showNext();
  };

  const renderMedia = (item: ProductGalleryMedia, isLightbox = false) => (
    item.type === "VIDEO" ? (
      <video
        key={item.url}
        src={item.url}
        poster={item.posterUrl || undefined}
        controls
        muted
        playsInline
        preload="metadata"
        aria-label={item.altText || `${name} product video`}
        className="h-full w-full object-contain"
      />
    ) : (
      <img
        key={item.url}
        src={item.url}
        alt={item.altText || name}
        loading={isLightbox ? "eager" : "lazy"}
        className="h-full w-full object-contain"
      />
    )
  );

  if (orderedMedia.length === 0) {
    return (
      <div className="flex aspect-[4/5] items-center justify-center bg-surface-muted text-sm text-muted">
        Product media is not available.
      </div>
    );
  }

  const activeItem = orderedMedia[activeIndex];
  return (
    <section
      aria-label={`${name} product gallery`}
      tabIndex={0}
      onKeyDown={onGalleryKeyDown}
      className="space-y-3 outline-none focus-visible:ring-2 focus-visible:ring-gold"
    >
      <div
        className="relative aspect-[4/5] overflow-hidden border border-border bg-surface-muted"
        onTouchStart={(event) => { touchStartX.current = event.touches[0].clientX; }}
        onTouchEnd={onTouchEnd}
      >
        {renderMedia(activeItem)}
        {activeItem.type === "IMAGE" && (
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            aria-label="Open product image in lightbox"
            className="absolute inset-0 z-[1] cursor-zoom-in"
          />
        )}
        {activeItem.type === "VIDEO" && (
          <span aria-hidden="true" className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1 bg-ink/80 px-2 py-1 text-[10px] uppercase tracking-caps text-white">
            <Play className="h-3 w-3" /> Video
          </span>
        )}
        {orderedMedia.length > 1 && (
          <>
            <button type="button" onClick={showPrevious} aria-label="Previous product media" className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-canvas/90 p-2 text-ink shadow hover:bg-white">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button type="button" onClick={showNext} aria-label="Next product media" className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-canvas/90 p-2 text-ink shadow hover:bg-white">
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
        {activeItem.caption && (
          <p className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-ink/70 to-transparent px-4 pb-4 pt-8 text-xs text-white">
            {activeItem.caption}
          </p>
        )}
      </div>
      {orderedMedia.length > 1 && (
        <div className="grid grid-cols-5 gap-2" role="list" aria-label="Product media thumbnails">
          {orderedMedia.map((item, index) => (
            <button
              key={`${item.type}-${item.url}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={item.type === "VIDEO" ? "View product video" : `View product image ${index + 1}`}
              aria-pressed={activeIndex === index}
              className={`relative aspect-[4/5] overflow-hidden border bg-surface-muted ${
                activeIndex === index ? "border-navy ring-1 ring-navy" : "border-border hover:border-gold"
              }`}
            >
              {item.type === "VIDEO" ? (
                <>
                  {item.posterUrl ? (
                    <img src={item.posterUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full items-center justify-center text-[10px] uppercase text-muted">Video</span>
                  )}
                  <Play className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 fill-canvas text-canvas drop-shadow" />
                </>
              ) : (
                <img src={item.url} alt="" className="h-full w-full object-cover" />
              )}
            </button>
          ))}
        </div>
      )}
      {lightboxOpen && isMounted && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${name} product media`}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/95 p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <button type="button" onClick={() => setLightboxOpen(false)} aria-label="Close lightbox" className="absolute right-4 top-4 z-10 rounded-full bg-canvas/10 p-2 text-white hover:bg-canvas/20">
            <X className="h-6 w-6" />
          </button>
          <div className="relative flex h-full w-full max-w-6xl items-center justify-center" onClick={(event) => event.stopPropagation()}>
            <div className="h-full max-h-[90vh] w-full">{renderMedia(activeItem, true)}</div>
            {orderedMedia.length > 1 && (
              <>
                <button type="button" onClick={showPrevious} aria-label="Previous product media" className="absolute left-2 rounded-full bg-canvas/10 p-2 text-white hover:bg-canvas/20 sm:left-4">
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button type="button" onClick={showNext} aria-label="Next product media" className="absolute right-2 rounded-full bg-canvas/10 p-2 text-white hover:bg-canvas/20 sm:right-4">
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </section>
  );
}
