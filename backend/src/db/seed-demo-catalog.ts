import { prisma } from "./prisma.js";

/**
 * Safe sample catalogue bootstrap:
 * - creates draft-only demo products;
 * - marks each product isFixture=true;
 * - never overwrites/deletes existing products, variants, media or store settings;
 * - variants have small sample stock solely for controlled QA after an admin explicitly
 *   chooses to publish a sample product.
 *
 * Run manually with: npm run db:seed:demo --workspace=backend
 * Do not run this as part of a deployment build.
 */
const demoProducts = [
  {
    name: "SAMPLE — Riviera Camp-Collar Shirt",
    slug: "demo-riviera-camp-collar-shirt",
    categorySlug: "shirts",
    material: "100% Belgian Heavy Linen (220gsm)",
    pricePaise: 840000,
    description: "Demo catalogue record for testing a relaxed camp-collar linen shirt.",
    longDescription: "A sample garment record for checking product detail, sizing, basket totals, guest checkout, order history and media presentation. Replace the sample copy and verify supplier, construction and actual inventory before publishing.",
    details: ["Relaxed camp collar", "Mother-of-pearl style button detail", "Single chest pocket", "Straight hem"],
    careInstructions: ["Sample care notes — confirm the actual garment label before sale."],
    variants: [
      { size: "S", sku: "DEMO-RIVIERA-S", stock: 4 },
      { size: "M", sku: "DEMO-RIVIERA-M", stock: 4 },
      { size: "L", sku: "DEMO-RIVIERA-L", stock: 4 },
      { size: "XL", sku: "DEMO-RIVIERA-XL", stock: 4 },
    ],
    imageUrl: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=1200&q=85",
    imageAlt: "Sample menswear camp-collar shirt in a neutral studio",
  },
  {
    name: "SAMPLE — Atelier Band-Collar Tunic",
    slug: "demo-atelier-band-collar-tunic",
    categorySlug: "shirts",
    material: "Cotton and raw silk blend (sample specification)",
    pricePaise: 920000,
    description: "Demo catalogue record for a clean band-collar tunic.",
    longDescription: "Sample garment content for testing the product page and checkout flow. Confirm composition and all product claims against the actual stock before publishing.",
    details: ["Band collar", "Concealed placket", "Long sleeve", "Curved hem"],
    careInstructions: ["Sample care notes — confirm the actual garment label before sale."],
    variants: [
      { size: "S", sku: "DEMO-TUNIC-S", stock: 4 },
      { size: "M", sku: "DEMO-TUNIC-M", stock: 4 },
      { size: "L", sku: "DEMO-TUNIC-L", stock: 4 },
      { size: "XL", sku: "DEMO-TUNIC-XL", stock: 4 },
    ],
    imageUrl: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=1200&q=85",
    imageAlt: "Sample light-coloured band-collar shirt",
  },
  {
    name: "SAMPLE — Double-Pleat Gurkha Trouser",
    slug: "demo-double-pleat-gurkha-trouser",
    categorySlug: "trousers",
    material: "Heavy Irish linen (sample specification)",
    pricePaise: 1240000,
    description: "Demo catalogue record for a high-rise double-pleat trouser.",
    longDescription: "Sample garment content for testing size variants, pricing, cart and order details. Confirm fit, construction, fabric origin and stock before publishing.",
    details: ["High-rise waist", "Double pleats", "Extended waistband", "Side adjusters"],
    careInstructions: ["Sample care notes — confirm the actual garment label before sale."],
    variants: [
      { size: "30", sku: "DEMO-GURKHA-30", stock: 4 },
      { size: "32", sku: "DEMO-GURKHA-32", stock: 4 },
      { size: "34", sku: "DEMO-GURKHA-34", stock: 4 },
      { size: "36", sku: "DEMO-GURKHA-36", stock: 4 },
    ],
    imageUrl: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=1200&q=85",
    imageAlt: "Sample tailored menswear trousers",
  },
  {
    name: "SAMPLE — Florence Single-Pleat Chino",
    slug: "demo-florence-single-pleat-chino",
    categorySlug: "trousers",
    material: "Italian cotton twill (sample specification)",
    pricePaise: 1080000,
    description: "Demo catalogue record for a relaxed single-pleat chino.",
    longDescription: "Sample garment content for validating the product buying journey. Replace all sample specification text and confirm available size runs before publishing.",
    details: ["Single forward pleat", "Slanted front pockets", "Horn-style button closure", "Tapered leg"],
    careInstructions: ["Sample care notes — confirm the actual garment label before sale."],
    variants: [
      { size: "30", sku: "DEMO-CHINO-30", stock: 4 },
      { size: "32", sku: "DEMO-CHINO-32", stock: 4 },
      { size: "34", sku: "DEMO-CHINO-34", stock: 4 },
      { size: "36", sku: "DEMO-CHINO-36", stock: 4 },
    ],
    imageUrl: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=1200&q=85",
    imageAlt: "Sample dark tailored chino trousers",
  },
  {
    name: "SAMPLE — Unstructured Wool-Linen Blazer",
    slug: "demo-unstructured-wool-linen-blazer",
    categorySlug: "tailoring",
    material: "Wool and linen blend (sample specification)",
    pricePaise: 2450000,
    description: "Demo catalogue record for a softly structured tailored blazer.",
    longDescription: "Sample garment content for testing editorial imagery and the full purchase flow. Confirm fibre composition, origin, sizing and actual stock before publishing.",
    details: ["Soft shoulder", "Three-roll-two front", "Patch hip pockets", "Notch lapel"],
    careInstructions: ["Sample care notes — confirm the actual garment label before sale."],
    variants: [
      { size: "38", sku: "DEMO-BLAZER-38", stock: 3 },
      { size: "40", sku: "DEMO-BLAZER-40", stock: 3 },
      { size: "42", sku: "DEMO-BLAZER-42", stock: 3 },
      { size: "44", sku: "DEMO-BLAZER-44", stock: 3 },
    ],
    imageUrl: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=85",
    imageAlt: "Sample dark tailored blazer",
  },
  {
    name: "SAMPLE — Raw Matka Silk Overshirt",
    slug: "demo-raw-matka-silk-overshirt",
    categorySlug: "shirts",
    material: "Matka silk (sample specification)",
    pricePaise: 1460000,
    description: "Demo catalogue record for a textured silk overshirt.",
    longDescription: "Sample garment content for validating gallery images, fit information, prices and checkout. Confirm fibre, sourcing and stock before publishing.",
    details: ["Textured weave", "Twin chest pockets", "Button front", "Relaxed overshirt fit"],
    careInstructions: ["Sample care notes — confirm the actual garment label before sale."],
    variants: [
      { size: "S", sku: "DEMO-MATKA-S", stock: 3 },
      { size: "M", sku: "DEMO-MATKA-M", stock: 3 },
      { size: "L", sku: "DEMO-MATKA-L", stock: 3 },
      { size: "XL", sku: "DEMO-MATKA-XL", stock: 3 },
    ],
    imageUrl: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=85",
    imageAlt: "Sample ecru textured overshirt",
  },
];

async function main() {
  for (const [index, productData] of demoProducts.entries()) {
    const category = await prisma.category.findUnique({ where: { slug: productData.categorySlug } });
    if (!category) {
      throw new Error(`Missing category "${productData.categorySlug}". Run the normal category setup first.`);
    }

    const existing = await prisma.product.findUnique({ where: { slug: productData.slug } });
    if (existing) {
      if (!existing.isFixture) {
        throw new Error(`Refusing to alter non-demo product "${productData.slug}".`);
      }
      console.log(`↷ Demo product already exists: ${productData.slug}`);
      continue;
    }

    const product = await prisma.product.create({
      data: {
        name: productData.name,
        slug: productData.slug,
        description: productData.description,
        longDescription: productData.longDescription,
        material: productData.material,
        status: "DRAFT",
        pricePaise: productData.pricePaise,
        categoryId: category.id,
        details: productData.details,
        careInstructions: productData.careInstructions,
        isFixture: true,
      },
    });

    await prisma.productVariant.createMany({
      data: productData.variants.map((variant) => ({
        productId: product.id,
        sku: variant.sku,
        size: variant.size,
        colorName: "Sample neutral",
        colorHex: "#D8D0C4",
        stock: variant.stock,
        reservedStock: 0,
        isActive: true,
      })),
    });

    const storageKey = `demo-fixtures/${product.id}/primary-image.webp`;
    const asset = await prisma.mediaAsset.create({
      data: {
        storageKey,
        url: productData.imageUrl,
        altText: productData.imageAlt,
        mimeType: "image/webp",
        fileSizeBytes: 0,
        source: "EXTERNAL_MIGRATED",
      },
    });

    await prisma.productMedia.create({
      data: {
        productId: product.id,
        mediaAssetId: asset.id,
        mediaType: "IMAGE",
        isPrimary: true,
        sortOrder: 0,
      },
    });

    console.log(`✓ Created draft fixture ${index + 1}/${demoProducts.length}: ${productData.slug}`);
  }

  console.log("Demo catalogue is ready in Admin → Products → Drafts.");
  console.log("All demo products remain unpublished and are marked isFixture=true.");
}

main()
  .catch((error) => {
    console.error("Demo catalogue seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
