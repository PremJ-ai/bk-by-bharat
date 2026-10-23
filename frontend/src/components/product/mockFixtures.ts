import type { ProductViewModel } from "./product.types";

export interface DetailedProduct extends ProductViewModel {
  sku: string;
  description: string;
  longDescription: string;
  galleryImages: string[];
  sizes: { size: string; stock: number; available: boolean }[];
  colors: { name: string; hex: string }[];
  details: string[];
  careInstructions: string[];
  status: "draft" | "published" | "archived";
}

/**
 * Milestone 1 UI catalog fixtures - isolated behind this mock adapter.
 * Replaced in Milestone 3 by database-persisted records via /api/v1/products.
 */
export const MOCK_PRODUCTS: DetailedProduct[] = [
  {
    id: "prod-001",
    sku: "SHR-BEL-001",
    name: "Riviera Camp-Collar Shirt",
    slug: "riviera-camp-collar-shirt",
    category: "Shirts",
    material: "100% Belgian Heavy Linen (220gsm)",
    pricePaise: 840000, // ₹8,400
    currency: "INR",
    stockStatus: "in_stock",
    badge: "New",
    isFixture: true,
    status: "published",
    description: "Relaxed silhouette with an open convertible collar and natural mother-of-pearl buttons.",
    longDescription:
      "Crafted from premium long-staple flax grown in Flanders, this summer staple is washed with natural enzymes for a softened hand. Features single-needle stitching throughout, clean French seams, and a generous box pleat at the yoke for unrestricted movement.",
    imageUrl: "",
    galleryImages: [],
    sizes: [
      { size: "S", stock: 8, available: true },
      { size: "M", stock: 12, available: true },
      { size: "L", stock: 6, available: true },
      { size: "XL", stock: 0, available: false },
    ],
    colors: [
      { name: "Parchment Oatmeal", hex: "#E9E3D7" },
      { name: "Midnight Navy", hex: "#0A192F" },
      { name: "Terracotta Rust", hex: "#8C3A27" },
    ],
    details: [
      "220gsm Belgian flax certified by Masters of Linen",
      "Hand-carved smoked mother-of-pearl buttons",
      "Reinforced convertible camp collar with topstitching",
      "Split back yoke with center box pleat",
      "Straight hem with side vents for untucked drape",
    ],
    careInstructions: [
      "Machine wash cool on delicate cycle with mild eco-detergent",
      "Line dry in shade to preserve natural fiber luster",
      "Iron while slightly damp on linen setting with steam",
      "Professional alteration service available complimentary",
    ],
  },
  {
    id: "prod-002",
    sku: "TRS-GRK-002",
    name: "The High-Rise Gurkha Trouser",
    slug: "the-high-rise-gurkha-trouser",
    category: "Trousers",
    material: "Irish Slub Linen with Brass Adjusters (340gsm)",
    pricePaise: 1240000, // ₹12,400
    currency: "INR",
    stockStatus: "in_stock",
    badge: "Limited",
    isFixture: true,
    status: "published",
    description: "Traditional dual-buckle waistband with deep outward-facing double pleats and a relaxed taper.",
    longDescription:
      "A tribute to classic military tailoring, recut for modern proportion. Cut from substantial 340gsm Irish linen with distinctive slub texture, these trousers feature an extended crossover waistband secured with solid antiqued brass hardware.",
    imageUrl: "",
    galleryImages: [],
    sizes: [
      { size: "30", stock: 4, available: true },
      { size: "32", stock: 10, available: true },
      { size: "34", stock: 8, available: true },
      { size: "36", stock: 2, available: true },
    ],
    colors: [
      { name: "Ecru Flax", hex: "#EDE8DF" },
      { name: "Olive Khaki", hex: "#4B5320" },
      { name: "Charcoal Slate", hex: "#323639" },
    ],
    details: [
      "340gsm heavy Irish linen weave",
      "Extended 4-inch crossover waistband",
      "Custom solid brass side buckle adjusters",
      "Deep inward reverse double pleats",
      "Full curtained cotton waistband with split back",
      "Unfinished 36-inch inseam for personalized tailoring",
    ],
    careInstructions: [
      "Dry clean recommended for initial cleaning",
      "Hand wash cold with wool/linen wash if preferred",
      "Do not tumble dry; press with heavy steam cloth",
    ],
  },
  {
    id: "prod-003",
    sku: "SHR-GIZ-003",
    name: "Architectural Band-Collar Tunic",
    slug: "architectural-band-collar-tunic",
    category: "Shirts",
    material: "Giza 87 Egyptian Cotton Sateen (160gsm)",
    pricePaise: 920000, // ₹9,200
    currency: "INR",
    stockStatus: "low_stock",
    badge: "Atelier Pick",
    isFixture: true,
    status: "published",
    description: "Curved hem tunic featuring a structured stand collar and concealed mother-of-pearl placket.",
    longDescription:
      "Spun from rare extra-long staple Giza 87 cotton harvested along the Nile delta. The high-twist yarn yields an exceptionally smooth, lustrous drape that resists creasing. Tailored with a clean hidden placket for a minimalist, modern aesthetic.",
    imageUrl: "",
    galleryImages: [],
    sizes: [
      { size: "S", stock: 2, available: true },
      { size: "M", stock: 3, available: true },
      { size: "L", stock: 1, available: true },
      { size: "XL", stock: 0, available: false },
    ],
    colors: [
      { name: "Chalk White", hex: "#F8F7F4" },
      { name: "Warm Taupe", hex: "#B8ADA2" },
    ],
    details: [
      "Giza 87 cotton two-ply 120/2 yarn count",
      "Concealed button placket with hand-sewn bar tacks",
      "Curved dramatic hemline with gusset reinforcements",
      "Minimalist 2.5cm band collar",
      "Single-button mitered cuffs",
    ],
    careInstructions: [
      "Machine wash warm (40°C)",
      "Hang to dry on contoured wooden hanger",
      "Medium steam iron",
    ],
  },
  {
    id: "prod-004",
    sku: "TRS-JPN-004",
    name: "Pleated Single-Pleat Chino",
    slug: "pleated-single-pleat-chino",
    category: "Trousers",
    material: "Japanese Cotton Drill (320gsm)",
    pricePaise: 980000, // ₹9,800
    currency: "INR",
    stockStatus: "in_stock",
    isFixture: true,
    status: "published",
    description: "Clean single-pleat trouser crafted from dense Kurabo cotton drill with buttoned flap pockets.",
    longDescription:
      "Woven slowly on shuttle looms in Okayama, Japan. The dense 320gsm drill fabric possesses structural weight that maintains a crisp center crease while softening gracefully with wear.",
    imageUrl: "",
    galleryImages: [],
    sizes: [
      { size: "30", stock: 6, available: true },
      { size: "32", stock: 14, available: true },
      { size: "34", stock: 9, available: true },
      { size: "36", stock: 5, available: true },
    ],
    colors: [
      { name: "Deep Navy", hex: "#0A192F" },
      { name: "British Tan", hex: "#9E7B4F" },
    ],
    details: [
      "Japanese shuttle-loomed cotton drill",
      "Single forward knife pleat",
      "Internal coin pocket tucked under waistband",
      "Rear welt pockets with genuine horn button closure",
      "Pre-shrunk and garment enzyme-washed",
    ],
    careInstructions: [
      "Machine wash cold inside out",
      "Tumble dry low or line dry",
      "Warm iron as required",
    ],
  },
  {
    id: "prod-005",
    sku: "TLR-JCK-005",
    name: "Unstructured Linen Atelier Jacket",
    slug: "unstructured-linen-atelier-jacket",
    category: "Tailoring",
    material: "Heavy Irish Linen with Cotton Half-Lining (380gsm)",
    pricePaise: 2450000, // ₹24,500
    currency: "INR",
    stockStatus: "in_stock",
    badge: "Atelier Pick",
    isFixture: true,
    status: "published",
    description: "Soft shoulder 3-roll-2 jacket with patch pockets and hand-sewn Milanese buttonhole.",
    longDescription:
      "Constructed entirely without shoulder pads or stiff chest canvas. The garment takes the natural shape of the wearer, providing formal elegance with the breathability of lightweight outerwear.",
    imageUrl: "",
    galleryImages: [],
    sizes: [
      { size: "38R", stock: 3, available: true },
      { size: "40R", stock: 5, available: true },
      { size: "42R", stock: 4, available: true },
      { size: "44R", stock: 1, available: true },
    ],
    colors: [
      { name: "Vintage Tobacco", hex: "#6E4D30" },
      { name: "Midnight Navy", hex: "#0A192F" },
    ],
    details: [
      "3-roll-2 button stance with horn buttons",
      "Hand-sewn lapel Milanese buttonhole in silk thread",
      "Curved barchetta chest pocket",
      "Unlined back with taped internal seams",
      "Double vents for seated comfort",
    ],
    careInstructions: [
      "Specialist dry clean only",
      "Store on wide shoulder cedar hanger",
    ],
  },
  {
    id: "prod-006",
    sku: "SHR-SLK-006",
    name: "Mulberry Silk Overshirt",
    slug: "mulberry-silk-overshirt",
    category: "Shirts",
    material: "Raw Matka Silk Weave (200gsm)",
    pricePaise: 1480000, // ₹14,800
    currency: "INR",
    stockStatus: "low_stock",
    badge: "Limited",
    isFixture: true,
    status: "published",
    description: "Textured raw silk utility overshirt with twin chest bellow pockets and straight hem.",
    longDescription:
      "Hand-spun from unrefined mulberry cocoons in West Bengal. Matka silk features an earthy, irregular slub texture resembling fine linen, yet retains the thermal warmth and natural luster unique to wild silk.",
    imageUrl: "",
    galleryImages: [],
    sizes: [
      { size: "S", stock: 1, available: true },
      { size: "M", stock: 4, available: true },
      { size: "L", stock: 2, available: true },
      { size: "XL", stock: 0, available: false },
    ],
    colors: [
      { name: "Natural Ecru", hex: "#F3EFE6" },
      { name: "Charcoal Indigo", hex: "#232B38" },
    ],
    details: [
      "Handloom 100% Matka silk",
      "Subtle slub texture throughout",
      "Reinforced twin flap chest pockets",
      "Straight workwear hem with side vents",
    ],
    careInstructions: [
      "Dry clean or hand wash cold with silk detergent",
      "Never wring or tumble dry",
    ],
  },
];

export const MOCK_STOREFRONT_FIXTURES: ProductViewModel[] = MOCK_PRODUCTS.slice(0, 4);

export function getProductBySlug(slug: string): DetailedProduct | undefined {
  return MOCK_PRODUCTS.find((p) => p.slug === slug);
}

export function getProductsByCategory(category?: string): DetailedProduct[] {
  if (!category || category === "all") return MOCK_PRODUCTS;
  return MOCK_PRODUCTS.filter((p) => p.category.toLowerCase() === category.toLowerCase());
}
