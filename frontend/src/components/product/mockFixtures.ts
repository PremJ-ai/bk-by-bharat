import type { ProductViewModel } from "./product.types";

/**
 * Milestone 0 UI fixtures - clearly isolated behind this mock adapter.
 * Replaced in Milestone 3 by real backend API queries to /api/v1/products.
 */
export const MOCK_STOREFRONT_FIXTURES: ProductViewModel[] = [
  {
    id: "fix-001",
    name: "Riviera Camp-Collar Shirt",
    slug: "riviera-camp-collar-shirt",
    category: "Shirts",
    material: "100% Belgian Heavy Linen (220gsm)",
    pricePaise: 840000, // ₹8,400
    currency: "INR",
    stockStatus: "in_stock",
    badge: "New",
    isFixture: true,
  },
  {
    id: "fix-002",
    name: "The High-Rise Gurkha Trouser",
    slug: "the-high-rise-gurkha-trouser",
    category: "Trousers",
    material: "Irish Slub Linen with Brass Adjusters",
    pricePaise: 1240000, // ₹12,400
    currency: "INR",
    stockStatus: "in_stock",
    badge: "Limited",
    isFixture: true,
  },
  {
    id: "fix-003",
    name: "Architectural Band-Collar Tunic",
    slug: "architectural-band-collar-tunic",
    category: "Shirts",
    material: "Giza 87 Egyptian Cotton Sateen",
    pricePaise: 920000, // ₹9,200
    currency: "INR",
    stockStatus: "low_stock",
    badge: "Atelier Pick",
    isFixture: true,
  },
  {
    id: "fix-004",
    name: "Pleated Single-Pleat Chino",
    slug: "pleated-single-pleat-chino",
    category: "Trousers",
    material: "Japanese Cotton Drill (320gsm)",
    pricePaise: 980000, // ₹9,800
    currency: "INR",
    stockStatus: "in_stock",
    isFixture: true,
  },
];
