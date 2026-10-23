"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { formatINR } from "@/components/product/ProductCard";
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";

export function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, subtotalPaise, itemCount } = useCart();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        closeCart();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeCart]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Ambient Scrim */}
      <div
        className="absolute inset-0 bg-navy-strong/60 backdrop-blur-xs transition-opacity duration-300"
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Slide-out Drawer Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Shopping Bag"
        className="absolute inset-y-0 right-0 max-w-full flex pl-10"
      >
        <div className="w-screen max-w-md bg-surface border-l border-border flex flex-col justify-between shadow-2xl">
          {/* Drawer Header */}
          <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-canvas">
            <div className="flex items-center space-x-2">
              <ShoppingBag className="w-4 h-4 text-gold" />
              <h2 className="font-display text-xl text-ink font-normal">
                Atelier Bag
              </h2>
              <span className="text-xs uppercase tracking-caps text-muted">
                ({itemCount} {itemCount === 1 ? "item" : "items"})
              </span>
            </div>
            <button
              type="button"
              onClick={closeCart}
              className="p-1.5 text-muted hover:text-ink transition-colors rounded focus:outline-none focus:ring-1 focus:ring-focus"
              aria-label="Close bag"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-16 space-y-4">
                <div className="w-12 h-12 rounded-full bg-surface-muted border border-border flex items-center justify-center text-muted">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <h3 className="font-display text-2xl text-ink font-normal">
                  Your Bag is Empty
                </h3>
                <p className="text-muted text-xs leading-relaxed max-w-xs font-sans">
                  Explore our small-batch shirts and tailored trousers sculpted from natural fibers.
                </p>
                <div className="pt-2">
                  <Link
                    href="/collections/all"
                    onClick={closeCart}
                    className="inline-block bg-navy text-canvas px-6 py-2.5 text-xs uppercase tracking-caps font-semibold hover:bg-gold hover:text-navy transition-colors"
                  >
                    Browse Collections
                  </Link>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {items.map((item) => (
                  <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex space-x-4">
                    {/* Item Thumbnail */}
                    <div className="w-20 h-24 bg-surface-muted border border-border flex-shrink-0 flex items-center justify-center relative overflow-hidden">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="font-display text-xl text-muted/30">
                          {item.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Item Details */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <h4 className="font-display text-base text-ink font-medium leading-snug">
                            {item.name}
                          </h4>
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="text-muted hover:text-rust transition-colors p-1 -mr-1"
                            title="Remove line"
                            aria-label={`Remove ${item.name} from bag`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-[11px] text-muted font-sans mt-0.5">
                          {item.material}
                        </p>
                        <div className="flex items-center space-x-2 text-xs text-muted mt-1">
                          <span className="font-medium text-ink">Size: {item.size}</span>
                          {item.color && (
                            <>
                              <span>&middot;</span>
                              <span>{item.color}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Quantity & Price */}
                      <div className="flex items-center justify-between pt-2">
                        <div className="inline-flex items-center border border-border">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, -1)}
                            className="p-1 hover:bg-surface-muted transition-colors text-muted hover:text-ink focus:outline-none"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2 text-xs font-semibold tabular-nums text-ink">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, 1)}
                            className="p-1 hover:bg-surface-muted transition-colors text-muted hover:text-ink focus:outline-none"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <span className="font-sans font-semibold text-sm text-ink tabular-nums">
                          {formatINR(item.pricePaise * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Drawer Footer */}
          {items.length > 0 && (
            <div className="p-6 border-t border-border bg-canvas space-y-4">
              <div className="space-y-1.5 text-xs text-muted font-sans">
                <div className="flex justify-between text-ink font-medium text-sm">
                  <span>Subtotal</span>
                  <span className="font-sans font-semibold tabular-nums text-base">
                    {formatINR(subtotalPaise)}
                  </span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>Shipping &amp; Transit</span>
                  <span className="text-stock-ok font-medium">Complimentary</span>
                </div>
                <p className="text-[10px] text-muted/70 pt-1">
                  Tax and final invoice confirmed by studio prior to WhatsApp QR billing.
                </p>
              </div>

              <div className="pt-2">
                <Link
                  href="/checkout"
                  onClick={closeCart}
                  className="w-full bg-navy text-canvas hover:bg-gold hover:text-navy py-3 px-4 text-xs uppercase tracking-caps font-semibold flex items-center justify-center space-x-2 transition-all duration-200 shadow-sm"
                >
                  <span>Proceed to Guest Checkout</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
