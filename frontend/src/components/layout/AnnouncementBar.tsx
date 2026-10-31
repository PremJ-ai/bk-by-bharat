"use client";

import { useState } from "react";
import { X } from "lucide-react";

export function AnnouncementBar() {
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) return null;

  return (
    <div
      role="region"
      aria-label="Announcement"
      className="bg-navy text-canvas text-xs uppercase tracking-caps py-2.5 px-4 flex items-center justify-between border-b border-navy-strong select-none"
    >
      <div className="flex-1 text-center font-medium">
        <span>Thoughtful pieces from Bharat Atelier &middot; Explore the current collection</span>
      </div>
      <button
        type="button"
        onClick={() => setIsOpen(false)}
        className="text-canvas/70 hover:text-canvas transition-colors p-1 -mr-1 focus:outline-none focus:ring-1 focus:ring-gold rounded"
        aria-label="Dismiss announcement"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
