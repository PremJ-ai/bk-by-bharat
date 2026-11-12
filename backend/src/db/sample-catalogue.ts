import { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

/**
 * Publishes a clearly labelled demo catalogue for storefront and checkout QA.
 * Every record is marked isFixture=true. Re-running updates only these fixture
 * records; real products, customer orders, stock reservations and store settings
 * are never overwritten. Replace sample claims, prices, images and stock before
 * treating any fixture as sale-ready merchandise.
 */
const image = (id: string) =>
  `https://images.unsplash.com/${id}?fit=crop&w=1400&q=85&fm=jpg`;

const products = [
  {
    name: "SAMPLE — Riviera Linen Camp Shirt", slug: "demo-riviera-linen-camp-shirt", category: "shirts",
    material: "Belgian-style linen · 220 GSM", pricePaise: 649000, badge: "New",
    description: "An easy camp-collar shirt with a relaxed silhouette and breathable linen texture.",
    longDescription: "Demo product copy for the BK by Bharat catalogue. A relaxed summer shirt with a clean open collar, natural drape and understated button front. Replace all specifications with verified supplier details before sale.",
    fabric: { fabricName: "Linen", composition: "100% linen (sample specification)", fibrePercentages: [{fibre:"Linen",percentage:100}], weightGsm:220, weave:"Plain weave", texture:"Naturally slubbed, airy hand-feel", stretch:"None", origin:"Sample sourcing note — verify origin", finish:"Garment washed", fit:"Relaxed", pattern:"Solid", colour:"Oat" },
    details: ["Relaxed camp collar", "Single chest pocket", "Natural-look buttons", "Straight hem with side vents"],
    care: ["Sample care note: verify the garment label before sale.", "Wash similar colours separately.", "Dry in shade and press on a linen setting."],
    imageId:"photo-1596755094514-f87e34085b2c", alt:"Neutral linen-look men's shirt",
    colour:"Oat", hex:"#D9CBB7", sizes:["XS","S","M","L","XL","XXL"], stock:[3,6,10,10,6,3], sku:"DEMO-RIVIERA"
  },
  {
    name: "SAMPLE — Oxford Essential Shirt", slug: "demo-oxford-essential-shirt", category:"shirts",
    material:"Cotton Oxford · 190 GSM", pricePaise:529000, badge:"Core",
    description:"A crisp everyday Oxford shirt designed for workdays and smart-casual dressing.",
    longDescription:"A versatile demo Oxford with a button-down collar, tidy placket and softly structured cotton texture. Fabric weight and composition are sample data pending supplier confirmation.",
    fabric:{fabricName:"Oxford cotton",composition:"100% cotton (sample specification)",fibrePercentages:[{fibre:"Cotton",percentage:100}],weightGsm:190,weave:"Oxford basket weave",texture:"Fine basket texture",stretch:"None",origin:"Sample sourcing note — verify origin",finish:"Soft washed",fit:"Regular",pattern:"Solid",colour:"Sky blue"},
    details:["Button-down collar","Full button placket","Single chest pocket","Adjustable two-button cuffs"],
    care:["Sample care note: confirm the actual care label.","Machine wash cool with similar colours.","Warm iron; avoid high heat on buttons."],
    imageId:"photo-1602810318383-e386cc2a3ccf",alt:"Light blue men's button-down shirt",
    colour:"Sky Blue",hex:"#AFC6D4",sizes:["XS","S","M","L","XL","XXL"],stock:[2,7,12,12,7,3],sku:"DEMO-OXFORD"
  },
  {
    name:"SAMPLE — Milano Poplin Formal Shirt",slug:"demo-milano-poplin-formal-shirt",category:"shirts",
    material:"Cotton Poplin · 125 GSM",pricePaise:579000,badge:"Formal Edit",
    description:"A clean formal shirt with a smooth poplin surface and sharp collar profile.",
    longDescription:"Demo formal shirting for office, occasion and tailored looks. The smooth surface is paired with a neat silhouette and understated finishing. Verify fibre percentages and construction before publishing as a real product.",
    fabric:{fabricName:"Cotton poplin",composition:"Cotton poplin (sample specification)",weightGsm:125,weave:"Plain poplin weave",texture:"Smooth, crisp and fine",stretch:"None",origin:"Sample sourcing note — verify origin",finish:"Easy-press sample finish",fit:"Slim regular",pattern:"Solid",colour:"White"},
    details:["Semi-spread collar","Clean front placket","Darted back for shape","Convertible cuff styling"],
    care:["Sample care note: confirm the garment label.","Wash cool and remove promptly.","Steam or press on cotton setting."],
    imageId:"photo-1598033129183-c4f50c736f10",alt:"White formal men's shirt",
    colour:"White",hex:"#F2F0EA",sizes:["XS","S","M","L","XL","XXL"],stock:[2,6,10,10,6,2],sku:"DEMO-MILANO"
  },
  {
    name:"SAMPLE — Textured Matka Overshirt",slug:"demo-textured-matka-overshirt",category:"shirts",
    material:"Matka-style textured weave · 240 GSM",pricePaise:789000,badge:"Texture Study",
    description:"A tactile layering piece with a dry hand-feel, utility pockets and relaxed fit.",
    longDescription:"Demo overshirt inspired by irregular slub yarns and heritage woven textures. The listed fibre and origin information is illustrative only and must be confirmed before sale.",
    fabric:{fabricName:"Matka-style slub fabric",composition:"Silk blend (sample specification)",weightGsm:240,weave:"Textured plain weave",texture:"Visible slubs, dry matte hand-feel",stretch:"None",origin:"Sample sourcing note — verify origin",finish:"Natural matte finish",fit:"Relaxed overshirt",pattern:"Textured solid",colour:"Ecru"},
    details:["Relaxed overshirt fit","Twin patch chest pockets","Full button front","Straight hem"],
    care:["Sample care note: confirm fibre and care label.","Professional dry clean recommended for delicate blends.","Store folded in a dry place."],
    imageId:"photo-1521572267360-ee0c2909d518",alt:"Neutral textured casual overshirt",
    colour:"Ecru",hex:"#D9D0C2",sizes:["S","M","L","XL","XXL"],stock:[4,8,9,6,2],sku:"DEMO-MATKA"
  },
  {
    name:"SAMPLE — Savile Wool-Blend Trouser",slug:"demo-savile-wool-blend-trouser",category:"trousers",
    material:"Tropical wool blend · 240 GSM",pricePaise:899000,badge:"Office Edit",
    description:"A tailored straight-leg formal trouser with a clean crease and refined drape.",
    longDescription:"Demo formal trouser for office and occasion styling. Includes a mid-rise waist, clean front and tailored leg line. Confirm actual wool content, lining, measurements and stock before sale.",
    fabric:{fabricName:"Tropical suiting",composition:"Wool blend (sample specification)",weightGsm:240,weave:"Twill suiting",texture:"Smooth with a subtle diagonal grain",stretch:"Low mechanical give",origin:"Sample sourcing note — verify origin",finish:"Tailored press",fit:"Straight tailored",pattern:"Solid",colour:"Charcoal"},
    details:["Mid-rise waistband","Hook-and-bar closure","Slanted side pockets","Pressed front crease","Two welt back pockets"],
    care:["Sample care note: verify the garment label.","Professional dry clean recommended.","Hang on a trouser hanger after wear."],
    imageId:"photo-1624378439575-d8705ad7ae80",alt:"Charcoal tailored men's trousers",
    colour:"Charcoal",hex:"#42413F",sizes:["28","30","32","34","36","38","40"],stock:[2,5,9,12,10,6,2],sku:"DEMO-SAVILE"
  },
  {
    name:"SAMPLE — Florence Cotton-Twill Chino",slug:"demo-florence-cotton-twill-chino",category:"trousers",
    material:"Cotton twill · 310 GSM",pricePaise:699000,badge:"Core",
    description:"A versatile chino with a subtle twill texture and a tapered tailored profile.",
    longDescription:"Demo cotton-twill chino designed to bridge casual and smart dressing. Replace the illustrative fabric data with the confirmed mill specification before publication.",
    fabric:{fabricName:"Cotton twill",composition:"Cotton (sample specification)",weightGsm:310,weave:"2/1 twill",texture:"Compact diagonal rib",stretch:"None",origin:"Sample sourcing note — verify origin",finish:"Garment dyed sample finish",fit:"Tapered regular",pattern:"Solid",colour:"Deep navy"},
    details:["Mid-rise waist","Single forward pleat","Slanted front pockets","Button-through back pockets","Tapered leg opening"],
    care:["Sample care note: confirm the garment label.","Wash inside out with similar colours.","Line dry and warm iron."],
    imageId:"photo-1473966968600-fa801b869a1a",alt:"Navy tailored cotton trousers",
    colour:"Deep Navy",hex:"#182A3A",sizes:["28","30","32","34","36","38","40"],stock:[2,6,10,12,10,6,2],sku:"DEMO-FLORENCE"
  },
  {
    name:"SAMPLE — Gurkha Double-Pleat Trouser",slug:"demo-gurkha-double-pleat-trouser",category:"trousers",
    material:"Linen blend · 260 GSM",pricePaise:949000,badge:"Atelier Pick",
    description:"A high-rise trouser with double pleats, extended waistband and side adjusters.",
    longDescription:"A demo Gurkha-inspired silhouette with a generous rise and sculptural pleats. Fabric blend, construction and measurements are illustrative until verified.",
    fabric:{fabricName:"Linen blend",composition:"Linen blend (sample specification)",weightGsm:260,weave:"Plain weave",texture:"Airy, lightly slubbed",stretch:"None",origin:"Sample sourcing note — verify origin",finish:"Soft washed",fit:"High-rise relaxed taper",pattern:"Solid",colour:"Sand"},
    details:["High-rise extended waistband","Double front pleats","Side adjuster tabs","Button fly detail","Turn-up hem"],
    care:["Sample care note: confirm the actual fibre composition.","Wash or dry clean according to verified label.","Steam gently to refresh pleats."],
    imageId:"photo-1515886657613-9f3515b0c78f",alt:"Tailored neutral trousers styled on a model",
    colour:"Sand",hex:"#B9A487",sizes:["28","30","32","34","36","38","40"],stock:[2,5,9,10,8,5,2],sku:"DEMO-GURKHA"
  },
  {
    name:"SAMPLE — Mercer Pleated Formal Trouser",slug:"demo-mercer-pleated-formal-trouser",category:"trousers",
    material:"Poly-viscose suiting · 220 GSM",pricePaise:749000,badge:"New",
    description:"A modern formal trouser with a single pleat and a streamlined leg.",
    longDescription:"Demo suiting trouser for business and event dressing. Composition, finish and fit notes must be checked against the final garment.",
    fabric:{fabricName:"Suiting blend",composition:"Poly-viscose blend (sample specification)",weightGsm:220,weave:"Fine twill",texture:"Smooth and fluid",stretch:"Low",origin:"Sample sourcing note — verify origin",finish:"Easy-care sample finish",fit:"Tapered tailored",pattern:"Solid",colour:"Black"},
    details:["Single front pleat","Belt loops","Hook-and-bar fastening","Slanted side pockets","Clean hem finish"],
    care:["Sample care note: confirm the garment label.","Wash or dry clean as instructed by supplier.","Press inside out on low heat."],
    imageId:"photo-1594938298603-c8148c4dae35",alt:"Black tailored formal trousers",
    colour:"Black",hex:"#242323",sizes:["28","30","32","34","36","38","40"],stock:[2,5,10,12,9,5,2],sku:"DEMO-MERCER"
  },
  {
    name:"SAMPLE — Camden Unstructured Blazer",slug:"demo-camden-unstructured-blazer",category:"tailoring",
    material:"Wool-linen blend · 280 GSM",pricePaise:1899000,badge:"Tailoring",
    description:"A softly structured blazer with a natural shoulder and versatile two-button front.",
    longDescription:"Demo tailoring piece with a relaxed shoulder line and patch-pocket styling. Fibre percentages, canvassing and tailoring details are illustrative and must be verified before sale.",
    fabric:{fabricName:"Wool-linen suiting",composition:"Wool-linen blend (sample specification)",weightGsm:280,weave:"Basket weave",texture:"Dry, lightly textured surface",stretch:"None",origin:"Sample sourcing note — verify origin",finish:"Soft tailored finish",fit:"Unstructured regular",pattern:"Solid",colour:"Tobacco"},
    details:["Soft natural shoulder","Two-button front","Notch lapel","Patch hip pockets","Half-lined interior"],
    care:["Sample care note: verify the actual care label.","Professional dry clean only if confirmed by supplier.","Store on a broad shoulder hanger."],
    imageId:"photo-1507679799987-c73779587ccf",alt:"Men's tailored blazer in a neutral tone",
    colour:"Tobacco",hex:"#674B38",sizes:["36","38","40","42","44","46"],stock:[1,3,5,5,3,1],sku:"DEMO-CAMDEN"
  },
  {
    name:"SAMPLE — Regent Formal Waistcoat",slug:"demo-regent-formal-waistcoat",category:"tailoring",
    material:"Suiting blend · 220 GSM",pricePaise:899000,badge:"Occasion",
    description:"A refined five-button waistcoat designed to complete a three-piece formal look.",
    longDescription:"Demo waistcoat with a shaped front, adjustable back strap and welt pockets. Replace sample composition, fit and construction claims with verified product information.",
    fabric:{fabricName:"Formal suiting",composition:"Suiting blend (sample specification)",weightGsm:220,weave:"Fine twill",texture:"Smooth suiting face",stretch:"Low mechanical give",origin:"Sample sourcing note — verify origin",finish:"Tailored finish",fit:"Slim regular",pattern:"Solid",colour:"Midnight navy"},
    details:["Five-button front","V-neck front shape","Two welt pockets","Adjustable rear strap","Back lining panel"],
    care:["Sample care note: confirm the actual garment label.","Professional dry clean recommended if stated by supplier.","Hang carefully between wears."],
    imageId:"photo-1598808503746-f34c53b9323e",alt:"Formal men's waistcoat styling",
    colour:"Midnight Navy",hex:"#202C3C",sizes:["36","38","40","42","44","46"],stock:[1,3,5,5,3,1],sku:"DEMO-REGENT"
  }
] as const;

export async function seedAdditionalCatalogue() {
  const categories = [
    { slug:"shirts", name:"Shirts", description:"Linen, Oxford, poplin and textured shirts for work and weekend dressing.", displayOrder:1 },
    { slug:"trousers", name:"Formal Pants", description:"Tailored formal trousers, pleated styles, Gurkha cuts and cotton twill chinos.", displayOrder:2 },
    { slug:"tailoring", name:"Tailoring", description:"Blazers and waistcoats with considered fabrics, structure and finishing.", displayOrder:3 },
  ];
  const categoryIds = new Map<string,string>();
  for (const category of categories) {
    const saved = await prisma.category.upsert({
      where:{slug:category.slug},
      update:{name:category.name,description:category.description,displayOrder:category.displayOrder},
      create:category,
    });
    categoryIds.set(category.slug,saved.id);
  }

  const collectionDefinitions = [
    {slug:"the-linen-edit",name:"The Linen Edit",description:"Breathable linen and textured natural-fibre essentials.",season:"All season",productSlugs:["demo-riviera-linen-camp-shirt","demo-gurkha-double-pleat-trouser","demo-textured-matka-overshirt"]},
    {slug:"the-office-edit",name:"The Office Edit",description:"Formal shirts and tailored trousers for a considered work wardrobe.",season:"Core",productSlugs:["demo-milano-poplin-formal-shirt","demo-oxford-essential-shirt","demo-savile-wool-blend-trouser","demo-mercer-pleated-formal-trouser"]},
    {slug:"the-tailoring-edit",name:"The Tailoring Edit",description:"Soft tailoring, blazers and finishing pieces.",season:"Occasion",productSlugs:["demo-camden-unstructured-blazer","demo-regent-formal-waistcoat","demo-savile-wool-blend-trouser"]},
  ];

  for (const [index,item] of products.entries()) {
    const categoryId = categoryIds.get(item.category);
    if (!categoryId) throw new Error(`Missing category: ${item.category}`);
    const existing = await prisma.product.findUnique({where:{slug:item.slug}});
    if (existing && !existing.isFixture) {
      throw new Error(`Refusing to modify non-demo product ${item.slug}`);
    }
    const product = existing
      ? await prisma.product.update({where:{id:existing.id},data:{
          name:item.name,description:item.description,longDescription:item.longDescription,
          material:item.material,fabricSpecifications:item.fabric as unknown as Prisma.InputJsonValue,badge:item.badge,
          status:"PUBLISHED",publishedAt:existing.publishedAt ?? new Date(),
          pricePaise:item.pricePaise,categoryId,details:[...item.details],
          careInstructions:[...item.care],isFixture:true,
        }})
      : await prisma.product.create({data:{
          name:item.name,slug:item.slug,description:item.description,longDescription:item.longDescription,
          material:item.material,fabricSpecifications:item.fabric as object,badge:item.badge,
          status:"PUBLISHED",publishedAt:new Date(),pricePaise:item.pricePaise,
          categoryId,details:[...item.details],careInstructions:[...item.care],isFixture:true,
        }});

    for (let sizeIndex=0;sizeIndex<item.sizes.length;sizeIndex++) {
      const size=item.sizes[sizeIndex];
      const sku=`${item.sku}-${size}`;
      await prisma.productVariant.upsert({
        where:{sku},
        update:{productId:product.id,size,colorName:item.colour,colorHex:item.hex,stock:item.stock[sizeIndex],isActive:true},
        create:{productId:product.id,sku,size,colorName:item.colour,colorHex:item.hex,stock:item.stock[sizeIndex],reservedStock:0,isActive:true},
      });
    }

    const storageKey=`demo-fixtures/${product.id}/primary-image.jpg`;
    const asset=await prisma.mediaAsset.upsert({
      where:{storageKey},
      update:{url:image(item.imageId),altText:item.alt,status:"READY"},
      create:{storageKey,url:image(item.imageId),altText:item.alt,mimeType:"image/jpeg",fileSizeBytes:420000,source:"EXTERNAL_MIGRATED",status:"READY"},
    });
    const existingMedia=await prisma.productMedia.findFirst({where:{productId:product.id,mediaAssetId:asset.id}});
    if (existingMedia) {
      await prisma.productMedia.update({where:{id:existingMedia.id},data:{isPrimary:true,sortOrder:0,mediaType:"IMAGE"}});
    } else {
      await prisma.productMedia.create({data:{productId:product.id,mediaAssetId:asset.id,mediaType:"IMAGE",isPrimary:true,sortOrder:0}});
    }
    console.log(`✓ Published demo fixture ${index+1}/${products.length}: ${item.slug}`);
  }

  for (const definition of collectionDefinitions) {
    const collection=await prisma.collection.upsert({
      where:{slug:definition.slug},
      update:{name:definition.name,description:definition.description,season:definition.season,displayOrder:collectionDefinitions.indexOf(definition)+1},
      create:{slug:definition.slug,name:definition.name,description:definition.description,season:definition.season,displayOrder:collectionDefinitions.indexOf(definition)+1},
    });
    for (const [displayOrder,slug] of definition.productSlugs.entries()) {
      const product=await prisma.product.findUnique({where:{slug}});
      if (!product) continue;
      await prisma.collectionProduct.upsert({
        where:{collectionId_productId:{collectionId:collection.id,productId:product.id}},
        update:{displayOrder},
        create:{collectionId:collection.id,productId:product.id,displayOrder},
      });
    }
  }

  console.log("Demo catalogue complete: 10 published sample garments, 3 categories, 3 collections and a broad size run.");
  console.log("All demo products are marked isFixture=true. Verify all claims, images, prices and inventory before taking real orders.");
}

