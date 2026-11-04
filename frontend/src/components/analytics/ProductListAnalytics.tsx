"use client";

import { useEffect } from "react";
import { trackGA4Event, toGA4Item } from "@/lib/analytics/ga4";
import type { ProductViewModel } from "@/components/product/product.types";

export function ProductListAnalytics({
  products,
  listId,
  listName,
}: {
  products: ProductViewModel[];
  listId: string;
  listName: string;
}) {
  useEffect(() => {
    if (products.length === 0) return;

    trackGA4Event("view_item_list", {
      item_list_id: listId,
      item_list_name: listName,
      items: products.map((product, index) => ({
        ...toGA4Item({
          id: product.id,
          name: product.name,
          category: product.category,
          material: product.material,
          pricePaise: product.pricePaise,
        }),
        index,
      })),
    });
  }, [products, listId, listName]);

  return null;
}
