import { prisma } from "./prisma.js";

async function main() {
  console.log("🌱 Starting catalog and store settings seed...");

  // 1. Store Settings
  await prisma.storeSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      upiId: "atelier@bharat.upi",
      payeeName: "Bharat Atelier New Delhi",
      paymentInstructions:
        "Scan QR using any UPI app (GPay, PhonePe, Paytm). Confirm order reference in payment remarks.",
      whatsappNumber: "+919876543210",
      invoicePrefix: "INV-2026-",
      shippingDefaultPaise: 0, // Complimentary domestic shipping
    },
  });
  console.log("✓ Store settings initialized.");

  // 2. Categories
  const catShirts = await prisma.category.upsert({
    where: { slug: "shirts" },
    update: { name: "Shirts", displayOrder: 1 },
    create: {
      name: "Shirts",
      slug: "shirts",
      description: "Hand-cut camp collars and band-collar tunics constructed from Belgian linen and Giza cotton.",
      displayOrder: 1,
    },
  });

  const catTrousers = await prisma.category.upsert({
    where: { slug: "trousers" },
    update: { name: "Trousers", displayOrder: 2 },
    create: {
      name: "Trousers",
      slug: "trousers",
      description: "High-rise Gurkha trousers and single-pleat chinos cut with generous rise and uncompromised drape.",
      displayOrder: 2,
    },
  });

  const catTailoring = await prisma.category.upsert({
    where: { slug: "tailoring" },
    update: { name: "Tailoring", displayOrder: 3 },
    create: {
      name: "Tailoring",
      slug: "tailoring",
      description: "Unstructured jackets and heirloom outerwear crafted with soft shoulders and Milanese lapels.",
      displayOrder: 3,
    },
  });
  console.log("✓ Categories initialized (Shirts, Trousers, Tailoring).");

  // 3. Products
  const seedProducts = [
    {
      name: "Riviera Camp-Collar Shirt",
      slug: "riviera-camp-collar-shirt",
      categoryId: catShirts.id,
      categoryName: "Shirts",
      material: "100% Belgian Heavy Linen (220gsm)",
      pricePaise: 840000,
      compareAtPricePaise: 950000,
      badge: "New",
      description: "Relaxed silhouette with an open convertible collar and natural mother-of-pearl buttons.",
      longDescription:
        "Crafted from premium long-staple flax grown in Flanders, this summer staple is washed with natural enzymes for a softened hand. Features single-needle stitching throughout, clean French seams, and a generous box pleat at the yoke for unrestricted movement.",
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
      variants: [
        { sku: "SHR-BEL-001-S", size: "S", colorName: "Parchment Oatmeal", colorHex: "#E9E3D7", stock: 8 },
        { sku: "SHR-BEL-001-M", size: "M", colorName: "Parchment Oatmeal", colorHex: "#E9E3D7", stock: 14 },
        { sku: "SHR-BEL-001-L", size: "L", colorName: "Parchment Oatmeal", colorHex: "#E9E3D7", stock: 6 },
        { sku: "SHR-BEL-001-XL", size: "XL", colorName: "Parchment Oatmeal", colorHex: "#E9E3D7", stock: 2 },
      ],
      media: [
        {
          url: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=1200&q=85",
          altText: "Riviera Camp-Collar Shirt in Parchment Oatmeal Linen",
          isPrimary: true,
        },
      ],
    },
    {
      name: "Atelier Band-Collar Tunic",
      slug: "atelier-band-collar-tunic",
      categoryId: catShirts.id,
      categoryName: "Shirts",
      material: "Giza 87 Egyptian Cotton & Raw Silk (180gsm)",
      pricePaise: 920000,
      badge: "Core",
      description: "Clean mandarin collar tunic with hidden placket and elongated side gussets.",
      longDescription:
        "Woven from rare extra-long staple Egyptian Giza 87 yarn intertwined with mulberry silk, offering a subtle luminous sheen and crisp drape suitable for warm seasons.",
      details: [
        "180gsm Egyptian Giza 87 cotton with 15% Mulberry silk",
        "Hidden front placket with mother-of-pearl buttons",
        "Reinforced curved hem with side pentagon gussets",
        "Two-button barrel cuffs with soft brushed interlining",
      ],
      careInstructions: [
        "Dry clean recommended for initial cleaning",
        "Hand wash cool with pH-neutral silk detergent",
        "Press inside out on medium heat with pressing cloth",
      ],
      variants: [
        { sku: "SHR-GIZ-002-S", size: "S", colorName: "Chalk White", colorHex: "#F5F3EF", stock: 5 },
        { sku: "SHR-GIZ-002-M", size: "M", colorName: "Chalk White", colorHex: "#F5F3EF", stock: 10 },
        { sku: "SHR-GIZ-002-L", size: "L", colorName: "Chalk White", colorHex: "#F5F3EF", stock: 7 },
        { sku: "SHR-GIZ-002-XL", size: "XL", colorName: "Chalk White", colorHex: "#F5F3EF", stock: 3 },
      ],
      media: [
        {
          url: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=1200&q=85",
          altText: "Atelier Band-Collar Tunic front presentation",
          isPrimary: true,
        },
      ],
    },
    {
      name: "Double-Pleat Gurkha Trouser",
      slug: "double-pleat-gurkha-trouser",
      categoryId: catTrousers.id,
      categoryName: "Trousers",
      material: "340gsm Heavy Irish Linen",
      pricePaise: 1240000,
      badge: "Atelier Pick",
      description: "High-rise trouser featuring deep reverse pleats, extended waistband, and solid brass side-adjusters.",
      longDescription:
        "An architectural silhouette cut with a generous high rise and gentle taper toward a 2-inch cuff. Sourced from the historic Baird McNutt mill in Northern Ireland, this 340gsm linen softens with age while preserving crisp pleat lines.",
      details: [
        "340gsm pure Irish linen from Ballymena",
        "Double forward deep reverse pleats",
        "Extended waistband with brass side-cinch buckles",
        "Curved split rear waistband for seating ease",
        "Hand-stitched horn buttons on internal fly",
      ],
      careInstructions: [
        "Specialist dry clean only",
        "Hang with clamped trouser hanger from cuff to relax creases",
        "Warm steam iron on linen setting with damp cloth",
      ],
      variants: [
        { sku: "TRS-GUR-001-30", size: "30", colorName: "British Khaki", colorHex: "#C3A675", stock: 4 },
        { sku: "TRS-GUR-001-32", size: "32", colorName: "British Khaki", colorHex: "#C3A675", stock: 12 },
        { sku: "TRS-GUR-001-34", size: "34", colorName: "British Khaki", colorHex: "#C3A675", stock: 9 },
        { sku: "TRS-GUR-001-36", size: "36", colorName: "British Khaki", colorHex: "#C3A675", stock: 3 },
      ],
      media: [
        {
          url: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=1200&q=85",
          altText: "Double-Pleat Gurkha Trouser in British Khaki Linen",
          isPrimary: true,
        },
      ],
    },
    {
      name: "Single-Pleat Florence Chino",
      slug: "single-pleat-florence-chino",
      categoryId: catTrousers.id,
      categoryName: "Trousers",
      material: "Italian Cotton Twill (310gsm)",
      pricePaise: 1080000,
      description: "Mid-rise relaxed trouser cut from structured garment-dyed Italian twill with a clean single forward pleat.",
      longDescription:
        "Designed for year-round utility, this chino merges casual comfort with tailoring precision. Features slanted front pockets, a tailored coin pocket, and a clean horn-button closure.",
      details: [
        "310gsm compact Italian cotton twill",
        "Garment dyed for rich color depth and softened feel",
        "Single clean forward pleat",
        "Curved curtained waistband with AMF pick stitching",
      ],
      careInstructions: [
        "Machine wash 30°C with similar colors",
        "Line dry in shade",
        "Warm iron while slightly damp",
      ],
      variants: [
        { sku: "TRS-FLO-002-30", size: "30", colorName: "Deep Navy", colorHex: "#0A192F", stock: 6 },
        { sku: "TRS-FLO-002-32", size: "32", colorName: "Deep Navy", colorHex: "#0A192F", stock: 10 },
        { sku: "TRS-FLO-002-34", size: "34", colorName: "Deep Navy", colorHex: "#0A192F", stock: 8 },
        { sku: "TRS-FLO-002-36", size: "36", colorName: "Deep Navy", colorHex: "#0A192F", stock: 4 },
      ],
      media: [
        {
          url: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=1200&q=85",
          altText: "Single-Pleat Florence Chino in Deep Navy",
          isPrimary: true,
        },
      ],
    },
    {
      name: "Unstructured Wool-Linen Blazer",
      slug: "unstructured-wool-linen-blazer",
      categoryId: catTailoring.id,
      categoryName: "Tailoring",
      material: "55% Irish Linen & 45% Tropical Wool (280gsm)",
      pricePaise: 2450000,
      badge: "Limited",
      description: "Deconstructed 3-roll-2 jacket with soft spalla camicia shoulders and generous patch pockets.",
      longDescription:
        "Completely unpadded through the chest and shoulders for a natural drape. Cut from an artisanal blend of breathable tropical wool and crisp Irish flax, featuring hand-sewn barchetta breast pocket and genuine horn buttons.",
      details: [
        "280gsm tropical wool and Irish linen blend",
        "Unstructured soft shoulder (spalla camicia)",
        "3-roll-2 button stance with rolled lapels",
        "Curved barchetta chest pocket & patch hip pockets",
        "Hand-stitched Milanese lapel buttonhole",
      ],
      careInstructions: [
        "Specialist dry clean only",
        "Steam to remove travel wrinkles",
        "Store on contoured wooden suit hanger",
      ],
      variants: [
        { sku: "BLZ-UNS-001-38", size: "38", colorName: "Tobacco Brown", colorHex: "#5C3A21", stock: 3 },
        { sku: "BLZ-UNS-001-40", size: "40", colorName: "Tobacco Brown", colorHex: "#5C3A21", stock: 5 },
        { sku: "BLZ-UNS-001-42", size: "42", colorName: "Tobacco Brown", colorHex: "#5C3A21", stock: 4 },
        { sku: "BLZ-UNS-001-44", size: "44", colorName: "Tobacco Brown", colorHex: "#5C3A21", stock: 1 },
      ],
      media: [
        {
          url: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=85",
          altText: "Unstructured Wool-Linen Blazer in Tobacco Brown",
          isPrimary: true,
        },
      ],
    },
    {
      name: "Raw Matka Silk Overshirt",
      slug: "raw-matka-silk-overshirt",
      categoryId: catShirts.id,
      categoryName: "Shirts",
      material: "100% Handspun Matka Silk (240gsm)",
      pricePaise: 1460000,
      badge: "Atelier Pick",
      description: "Substantial texture overshirt handwoven in Bhagalpur with natural slub irregularities.",
      longDescription:
        "Woven on heritage pit looms from spun silk yarns that retain natural sericin proteins for unique coarse texture and crisp structure. Ideal as a layering piece over fine tees or band-collar shirts.",
      details: [
        "240gsm pure handspun Matka silk",
        "Natural slub texture and matte organic finish",
        "Twin oversized chest flap pockets",
        "Square camp collar with reinforced neck band",
      ],
      careInstructions: [
        "Dry clean only to maintain crisp textured hand",
        "Store in breathable cotton garment bag",
      ],
      variants: [
        { sku: "SHR-MAT-003-S", size: "S", colorName: "Raw Ecru", colorHex: "#F2EDE4", stock: 4 },
        { sku: "SHR-MAT-003-M", size: "M", colorName: "Raw Ecru", colorHex: "#F2EDE4", stock: 7 },
        { sku: "SHR-MAT-003-L", size: "L", colorName: "Raw Ecru", colorHex: "#F2EDE4", stock: 5 },
        { sku: "SHR-MAT-003-XL", size: "XL", colorName: "Raw Ecru", colorHex: "#F2EDE4", stock: 2 },
      ],
      media: [
        {
          url: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=85",
          altText: "Raw Matka Silk Overshirt in Raw Ecru",
          isPrimary: true,
        },
      ],
    },
  ];

  for (const item of seedProducts) {
    const existing = await prisma.product.findUnique({
      where: { slug: item.slug },
    });

    if (existing) {
      console.log(`- Product '${item.slug}' already exists; updating.`);
      await prisma.product.update({
        where: { id: existing.id },
        data: {
          name: item.name,
          description: item.description,
          longDescription: item.longDescription,
          material: item.material,
          badge: item.badge,
          pricePaise: item.pricePaise,
          compareAtPricePaise: item.compareAtPricePaise,
          status: "PUBLISHED",
          publishedAt: new Date(),
          details: item.details,
          careInstructions: item.careInstructions,
        },
      });
      continue;
    }

    const product = await prisma.product.create({
      data: {
        name: item.name,
        slug: item.slug,
        categoryId: item.categoryId,
        material: item.material,
        pricePaise: item.pricePaise,
        compareAtPricePaise: item.compareAtPricePaise,
        badge: item.badge,
        status: "PUBLISHED",
        publishedAt: new Date(),
        description: item.description,
        longDescription: item.longDescription,
        details: item.details,
        careInstructions: item.careInstructions,
        isFixture: false,
      },
    });

    // Variants
    await prisma.productVariant.createMany({
      data: item.variants.map((v) => ({
        productId: product.id,
        sku: v.sku,
        size: v.size,
        colorName: v.colorName,
        colorHex: v.colorHex,
        stock: v.stock,
      })),
    });

    // Media
    for (let i = 0; i < item.media.length; i++) {
      const m = item.media[i];
      const storageKey = `seed/${product.id}/asset-${i + 1}.webp`;
      const asset = await prisma.mediaAsset.upsert({
        where: { storageKey },
        update: { url: m.url, altText: m.altText },
        create: {
          storageKey,
          url: m.url,
          altText: m.altText,
          mimeType: "image/webp",
          fileSizeBytes: 420000,
          source: "EXTERNAL_MIGRATED",
        },
      });

      await prisma.productMedia.create({
        data: {
          productId: product.id,
          mediaAssetId: asset.id,
          isPrimary: m.isPrimary,
          sortOrder: i,
        },
      });
    }

    console.log(`✓ Seeded product: ${item.name} (${item.slug})`);
  }

  console.log("🎉 Catalog seeding completed successfully!");
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
