import { z } from "zod";

export const variantInputSchema = z.object({
  id: z.string().optional(),
  sku: z.string().min(2).max(50),
  size: z.string().min(1).max(20),
  colorName: z.string().min(1).max(50),
  colorHex: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/).optional().nullable(),
  stock: z.number().int().min(0).default(0),
  priceOverridePaise: z.number().int().min(0).optional().nullable(),
  isActive: z.boolean().default(true),
});

export const mediaInputSchema = z.object({
  id: z.string().optional(),
  url: z.string().url().or(z.string().min(1)),
  altText: z.string().min(1).max(255),
  caption: z.string().max(255).optional().nullable(),
  posterUrl: z.string().url().optional().nullable(),
  mediaType: z.enum(["IMAGE", "VIDEO"]).optional(),
  isPrimary: z.boolean().default(false),
  sortOrder: z.number().int().min(0).default(0),
  source: z.enum(["AI_GENERATED", "UPLOADED", "EXTERNAL_MIGRATED"]).default("UPLOADED"),
  storageKey: z.string().optional(),
  mimeType: z.enum([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/avif",
    "video/mp4",
    "video/webm",
  ]).default("image/webp"),
  fileSizeBytes: z.number().int().min(0).default(0),
}).superRefine((media, context) => {
  const isVideo = media.mimeType.startsWith("video/");
  if (media.mediaType && (media.mediaType === "VIDEO") !== isVideo) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Media type must match its MIME type.",
      path: ["mediaType"],
    });
  }
  if (media.fileSizeBytes > (isVideo ? 50 : 10) * 1024 * 1024) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Media file exceeds the allowed size for its type.",
      path: ["fileSizeBytes"],
    });
  }
  if (isVideo && media.isPrimary) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "A video cannot be the primary product image.",
      path: ["isPrimary"],
    });
  }
  if (!isVideo && media.posterUrl) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "A poster URL is only valid for video media.",
      path: ["posterUrl"],
    });
  }
});

const productMediaSchema = z.array(mediaInputSchema).default([]).superRefine((media, context) => {
  const images = media.filter((item) => item.mimeType.startsWith("image/"));
  const videos = media.filter((item) => item.mimeType.startsWith("video/"));

  if (images.length > 4) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "A product can have up to four images.",
    });
  }
  if (videos.length > 1) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "A product can have one video.",
    });
  }
  if (images.filter((item) => item.isPrimary).length > 1) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "A product can have only one primary image.",
    });
  }
});

const fabricSpecificationsSchema = z.object({
  fabricName: z.string().max(200).optional(),
  composition: z.string().max(200).optional(),
  fibrePercentages: z.array(z.object({
    fibre: z.string().min(1).max(60),
    percentage: z.number().int().min(0).max(100),
  })).max(8).optional(),
  weightGsm: z.number().int().min(1).max(2000).optional(),
  weave: z.string().max(100).optional(),
  texture: z.string().max(120).optional(),
  stretch: z.string().max(120).optional(),
  origin: z.string().max(120).optional(),
  finish: z.string().max(120).optional(),
  fit: z.string().max(120).optional(),
  pattern: z.string().max(120).optional(),
  colour: z.string().max(120).optional(),
}).superRefine((specifications, context) => {
  const fibres = specifications.fibrePercentages;
  if (fibres?.length && fibres.reduce((total, item) => total + item.percentage, 0) !== 100) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Fibre percentages must total 100%.",
      path: ["fibrePercentages"],
    });
  }
}).optional().nullable();

export const createProductSchema = z.object({
  name: z.string().min(2, "Product name must be at least 2 characters").max(120),
  slug: z.string().min(2).max(140).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens").optional(),
  description: z.string().min(10, "Description must be at least 10 characters").max(1000),
  longDescription: z.string().max(4000).optional().nullable(),
  material: z.string().min(2).max(200),
  fabricSpecifications: fabricSpecificationsSchema,
  categoryName: z.string().min(2).max(80),
  categorySlug: z.string().min(2).max(80).optional(),
  badge: z.enum(["New", "Limited", "Atelier Pick", "Core"]).optional().nullable(),
  pricePaise: z.number().int().positive("Price must be greater than zero"),
  compareAtPricePaise: z.number().int().positive().optional().nullable(),
  details: z.array(z.string().min(1)).default([]),
  careInstructions: z.array(z.string().min(1)).default([]),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  variants: z.array(variantInputSchema).min(1, "At least one size/variant must be provided"),
  media: productMediaSchema,
});

export const updateProductSchema = createProductSchema.partial().extend({
  id: z.string().optional(),
});

export const listPublicProductsQuerySchema = z.object({
  category: z.string().optional(),
  material: z.string().optional(),
  size: z.string().optional(),
  inStock: z.enum(["true", "false"]).optional(),
  search: z.string().optional(),
  sortBy: z.enum(["featured", "price-asc", "price-desc", "name-asc", "newest"]).default("featured"),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

export const listAdminProductsQuerySchema = z.object({
  status: z.enum(["ALL", "DRAFT", "PUBLISHED", "ARCHIVED"]).default("ALL"),
  category: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(30),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ListPublicProductsQuery = z.infer<typeof listPublicProductsQuerySchema>;
export type ListAdminProductsQuery = z.infer<typeof listAdminProductsQuerySchema>;
