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
  isPrimary: z.boolean().default(false),
  sortOrder: z.number().int().min(0).default(0),
  source: z.enum(["AI_GENERATED", "UPLOADED", "EXTERNAL_MIGRATED"]).default("UPLOADED"),
  storageKey: z.string().optional(),
  mimeType: z.string().default("image/webp"),
  fileSizeBytes: z.number().int().min(0).default(0),
});

export const createProductSchema = z.object({
  name: z.string().min(2, "Product name must be at least 2 characters").max(120),
  slug: z.string().min(2).max(140).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens").optional(),
  description: z.string().min(10, "Description must be at least 10 characters").max(1000),
  longDescription: z.string().max(4000).optional().nullable(),
  material: z.string().min(2).max(200),
  categoryName: z.string().min(2).max(80),
  categorySlug: z.string().min(2).max(80).optional(),
  badge: z.enum(["New", "Limited", "Atelier Pick", "Core"]).optional().nullable(),
  pricePaise: z.number().int().positive("Price must be greater than zero"),
  compareAtPricePaise: z.number().int().positive().optional().nullable(),
  details: z.array(z.string().min(1)).default([]),
  careInstructions: z.array(z.string().min(1)).default([]),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  variants: z.array(variantInputSchema).min(1, "At least one size/variant must be provided"),
  media: z.array(mediaInputSchema).default([]),
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
