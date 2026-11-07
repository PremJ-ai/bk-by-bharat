export type GA4Item = {
  item_id?: string;
  item_name: string;
  item_brand?: string;
  item_category?: string;
  item_variant?: string;
  price?: number;
  quantity?: number;
};

type GA4EventName =
  | "page_view"
  | "view_item_list"
  | "select_item"
  | "view_item"
  | "search"
  | "add_to_cart"
  | "remove_from_cart"
  | "view_cart"
  | "begin_checkout"
  | "add_shipping_info"
  | "add_payment_info"
  | "purchase"
  | "refund";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackGA4Event(
  eventName: GA4EventName,
  parameters: Record<string, unknown> = {}
): void {
  if (typeof window === "undefined" || !process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) {
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    ((...args: unknown[]) => {
      window.dataLayer?.push(args);
    });

  window.gtag("event", eventName, parameters);
}

export function toGA4Item(item: {
  id?: string;
  productId?: string;
  name: string;
  category?: string;
  material?: string;
  size?: string;
  pricePaise: number;
  quantity?: number;
}): GA4Item {
  return {
    item_id: item.productId || item.id,
    item_name: item.name,
    item_brand: "BK by Bharat",
    item_category: item.category || item.material,
    item_variant: item.size,
    price: item.pricePaise / 100,
    quantity: item.quantity ?? 1,
  };
}
