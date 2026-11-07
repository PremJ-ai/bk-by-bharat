"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { trackGA4Event, toGA4Item } from "@/lib/analytics/ga4";

export interface CartItem {
  id: string; // Composite unique key: `${productId}-${size}-${color || 'default'}`
  productId: string;
  variantId?: string;
  name: string;
  slug: string;
  material: string;
  size: string;
  color?: string;
  pricePaise: number;
  quantity: number;
  imageUrl?: string;
}

interface CartContextType {
  items: CartItem[];
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (item: Omit<CartItem, "id">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  itemCount: number;
  subtotalPaise: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "bharat_atelier_cart_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load cart from localStorage on client mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        setItems(JSON.parse(stored));
      }
    } catch {
      // Ignore storage read errors
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Sync cart to localStorage whenever items change
  useEffect(() => {
    if (isInitialized) {
      try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
      } catch {
        // Ignore storage write errors
      }
    }
  }, [items, isInitialized]);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const addItem = (item: Omit<CartItem, "id">) => {
    const compositeId = `${item.productId}-${item.size}-${item.color || "std"}`;
    trackGA4Event("add_to_cart", {
      currency: "INR",
      value: (item.pricePaise * item.quantity) / 100,
      items: [toGA4Item({
        productId: item.productId,
        name: item.name,
        material: item.material,
        size: item.size,
        pricePaise: item.pricePaise,
        quantity: item.quantity,
      })],
    });
    setItems((prev) => {
      const existing = prev.find((i) => i.id === compositeId);
      if (existing) {
        return prev.map((i) =>
          i.id === compositeId ? { ...i, quantity: i.quantity + item.quantity } : i
        );
      }
      return [...prev, { ...item, id: compositeId }];
    });
    setIsOpen(true);
  };

  const removeItem = (id: string) => {
    const removed = items.find((item) => item.id === id);
    if (removed) {
      trackGA4Event("remove_from_cart", {
        currency: "INR",
        value: (removed.pricePaise * removed.quantity) / 100,
        items: [toGA4Item({
          productId: removed.productId,
          name: removed.name,
          material: removed.material,
          size: removed.size,
          pricePaise: removed.pricePaise,
          quantity: removed.quantity,
        })],
      });
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    const changed = items.find((item) => item.id === id);
    if (changed && delta !== 0) {
      const eventItem = {
        productId: changed.productId,
        name: changed.name,
        material: changed.material,
        size: changed.size,
        pricePaise: changed.pricePaise,
        quantity: Math.abs(delta),
      };
      trackGA4Event(delta > 0 ? "add_to_cart" : "remove_from_cart", {
        currency: "INR",
        value: (changed.pricePaise * Math.abs(delta)) / 100,
        items: [toGA4Item(eventItem)],
      });
    }
    setItems((prev) =>
      prev
        .map((i) => {
          if (i.id === id) {
            const nextQty = i.quantity + delta;
            return nextQty > 0 ? { ...i, quantity: nextQty } : null;
          }
          return i;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotalPaise = items.reduce((sum, item) => sum + item.pricePaise * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        isOpen,
        openCart,
        closeCart,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        itemCount,
        subtotalPaise,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
