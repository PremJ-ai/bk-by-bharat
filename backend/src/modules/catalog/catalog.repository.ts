import { prisma } from "../../db/prisma.js";
import { Prisma, type ProductStatus } from "@prisma/client";
import type { CreateProductInput, UpdateProductInput } from "./catalog.schemas.js";

function toFabricSpecifications(value: CreateProductInput["fabricSpecifications"]) {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.DbNull;

  return {
    fabricName: value.fabricName ?? null,
    composition: value.composition ?? null,
    fibrePercentages: value.fibrePercentages ?? [],
    weightGsm: value.weightGsm ?? null,
    weave: value.weave ?? null,
    texture: value.texture ?? null,
    stretch: value.stretch ?? null,
    origin: value.origin ?? null,
    finish: value.finish ?? null,
    fit: value.fit ?? null,
    pattern: value.pattern ?? null,
    colour: value.colour ?? null,
  } satisfies Prisma.InputJsonObject;
}

function isVideoMedia(media: CreateProductInput["media"][number]): boolean {
  return media.mediaType ? media.mediaType === "VIDEO" : media.mimeType.startsWith("video/");
}

export class CatalogRepository {
  /**
   * Find or create a category by name and slug
   */
  async findOrCreateCategory(name: string, customSlug?: string) {
    const slug = customSlug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    return prisma.category.upsert({
      where: { slug },
      update: { name },
      create: { name, slug },
    });
  }

  /**
   * List all categories with published product count
   */
  async listCategories() {
    return prisma.category.findMany({
      orderBy: { displayOrder: "asc" },
      include: {
        _count: {
          select: {
            products: {
              where: { status: "PUBLISHED" },
            },
          },
        },
      },
    });
  }

  /**
   * Query published products for public storefront
   */
  async findPublishedProducts(options: {
    categorySlug?: string;
    material?: string;
    size?: string;
    inStockOnly?: boolean;
    search?: string;
    sortBy?: string;
    page: number;
    limit: number;
  }) {
    const { categorySlug, material, size, inStockOnly, search, sortBy, page, limit } = options;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      status: "PUBLISHED",
    };

    if (categorySlug && categorySlug !== "all") {
      where.category = { slug: categorySlug.toLowerCase() };
    }

    if (material) {
      where.material = { contains: material, mode: "insensitive" };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { material: { contains: search, mode: "insensitive" } },
      ];
    }

    if (size && size !== "all") {
      where.variants = {
        some: {
          size: { equals: size, mode: "insensitive" },
          stock: inStockOnly ? { gt: 0 } : undefined,
          isActive: true,
        },
      };
    } else if (inStockOnly) {
      where.variants = {
        some: {
          stock: { gt: 0 },
          isActive: true,
        },
      };
    }

    let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: "desc" };
    if (sortBy === "price-asc") {
      orderBy = { pricePaise: "asc" };
    } else if (sortBy === "price-desc") {
      orderBy = { pricePaise: "desc" };
    } else if (sortBy === "name-asc") {
      orderBy = { name: "asc" };
    } else if (sortBy === "newest") {
      orderBy = { createdAt: "desc" };
    }

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          category: true,
          variants: {
            where: { isActive: true },
            orderBy: { size: "asc" },
          },
          media: {
            include: { mediaAsset: true },
            orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Find single published product by slug
   */
  async findPublishedProductBySlug(slug: string) {
    return prisma.product.findFirst({
      where: {
        slug,
        status: "PUBLISHED",
      },
      include: {
        category: true,
        variants: {
          where: { isActive: true },
          orderBy: { size: "asc" },
        },
        media: {
          include: { mediaAsset: true },
          orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
        },
      },
    });
  }

  /**
   * Admin query for all products with filter & pagination
   */
  async findAllProductsAdmin(options: {
    status?: string;
    categorySlug?: string;
    search?: string;
    page: number;
    limit: number;
  }) {
    const { status, categorySlug, search, page, limit } = options;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {};

    if (status && status !== "ALL") {
      where.status = status as ProductStatus;
    }

    if (categorySlug && categorySlug !== "all") {
      where.category = { slug: categorySlug.toLowerCase() };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
        { variants: { some: { sku: { contains: search, mode: "insensitive" } } } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: "desc" },
        include: {
          category: true,
          variants: true,
          media: {
            include: { mediaAsset: true },
            orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Find product by ID for admin view or update
   */
  async findProductById(id: string) {
    return prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        variants: {
          orderBy: { size: "asc" },
        },
        media: {
          include: { mediaAsset: true },
          orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
        },
      },
    });
  }

  /**
   * Find product by unique slug
   */
  async findProductBySlug(slug: string) {
    return prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        variants: true,
        media: {
          include: { mediaAsset: true },
        },
      },
    });
  }

  /**
   * Find variant by SKU
   */
  async findVariantBySku(sku: string) {
    return prisma.productVariant.findUnique({
      where: { sku },
    });
  }

  /**
   * Transactional creation of Product + Variants + Media + Audit Event
   */
  async createProduct(
    data: CreateProductInput & { slug: string; categoryId: string },
    adminId?: string
  ) {
    return prisma.$transaction(async (tx) => {
      // 1. Create main Product record
      const product = await tx.product.create({
        data: {
          name: data.name,
          slug: data.slug,
          description: data.description,
          longDescription: data.longDescription,
          material: data.material,
          fabricSpecifications: toFabricSpecifications(data.fabricSpecifications),
          badge: data.badge,
          status: data.status,
          pricePaise: data.pricePaise,
          compareAtPricePaise: data.compareAtPricePaise,
          categoryId: data.categoryId,
          details: data.details,
          careInstructions: data.careInstructions,
          publishedAt: data.status === "PUBLISHED" ? new Date() : null,
        },
      });

      // 2. Create Variants
      if (data.variants && data.variants.length > 0) {
        await tx.productVariant.createMany({
          data: data.variants.map((v) => ({
            productId: product.id,
            sku: v.sku,
            size: v.size,
            colorName: v.colorName,
            colorHex: v.colorHex || null,
            stock: v.stock,
            priceOverridePaise: v.priceOverridePaise,
            isActive: v.isActive,
          })),
        });
      }

      // 3. Create or link Media Assets
      if (data.media && data.media.length > 0) {
        const primaryImageIndex = data.media.findIndex(
          (media) => !isVideoMedia(media) && media.isPrimary
        );
        const firstImageIndex = data.media.findIndex((media) => !isVideoMedia(media));
        for (let i = 0; i < data.media.length; i++) {
          const m = data.media[i];
          const storageKey = m.storageKey || `products/${product.id}/media-${i + 1}-${Date.now()}.webp`;

          const asset = await tx.mediaAsset.upsert({
            where: { storageKey },
            update: {
              url: m.url,
              altText: m.altText,
            },
            create: {
              storageKey,
              url: m.url,
              altText: m.altText,
              mimeType: m.mimeType,
              fileSizeBytes: m.fileSizeBytes,
              source: m.source,
            },
          });

          await tx.productMedia.create({
            data: {
              productId: product.id,
              mediaAssetId: asset.id,
              mediaType: m.mediaType ?? (m.mimeType.startsWith("video/") ? "VIDEO" : "IMAGE"),
              caption: m.caption,
              posterUrl: m.posterUrl,
              isPrimary: !isVideoMedia(m) && i === (primaryImageIndex >= 0 ? primaryImageIndex : firstImageIndex),
              sortOrder: m.sortOrder ?? i,
            },
          });
        }
      }

      // 4. Log Audit Event
      await tx.auditEvent.create({
        data: {
          actorAdminId: adminId || null,
          action: "PRODUCT_CREATED",
          resourceType: "PRODUCT",
          resourceId: product.id,
          details: { name: product.name, slug: product.slug, pricePaise: product.pricePaise },
        },
      });

      return product;
    });
  }

  /**
   * Transactional update of product, variants, and media
   */
  async updateProduct(
    id: string,
    data: UpdateProductInput & { categoryId?: string },
    adminId?: string
  ) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.product.findUnique({
        where: { id },
        include: { variants: true, media: true },
      });

      if (!existing) {
        throw new Error("Product not found");
      }

      // Update product fields
      const updated = await tx.product.update({
        where: { id },
        data: {
          name: data.name !== undefined ? data.name : existing.name,
          slug: data.slug !== undefined ? data.slug : existing.slug,
          description: data.description !== undefined ? data.description : existing.description,
          longDescription: data.longDescription !== undefined ? data.longDescription : existing.longDescription,
          material: data.material !== undefined ? data.material : existing.material,
          fabricSpecifications: toFabricSpecifications(data.fabricSpecifications),
          badge: data.badge !== undefined ? data.badge : existing.badge,
          status: data.status !== undefined ? data.status : existing.status,
          pricePaise: data.pricePaise !== undefined ? data.pricePaise : existing.pricePaise,
          compareAtPricePaise: data.compareAtPricePaise !== undefined ? data.compareAtPricePaise : existing.compareAtPricePaise,
          categoryId: data.categoryId || existing.categoryId,
          details: data.details !== undefined ? data.details : existing.details,
          careInstructions: data.careInstructions !== undefined ? data.careInstructions : existing.careInstructions,
          publishedAt: data.status === "PUBLISHED" && existing.status !== "PUBLISHED" ? new Date() : existing.publishedAt,
        },
      });

      // Update variants if supplied
      if (data.variants) {
        // Delete previous variants and recreate cleanly
        await tx.productVariant.deleteMany({ where: { productId: id } });
        await tx.productVariant.createMany({
          data: data.variants.map((v) => ({
            productId: id,
            sku: v.sku,
            size: v.size,
            colorName: v.colorName,
            colorHex: v.colorHex || null,
            stock: v.stock,
            priceOverridePaise: v.priceOverridePaise,
            isActive: v.isActive,
          })),
        });
      }

      // Update media if supplied
      if (data.media) {
        await tx.productMedia.deleteMany({ where: { productId: id } });
        const primaryImageIndex = data.media.findIndex(
          (media) => !isVideoMedia(media) && media.isPrimary
        );
        const firstImageIndex = data.media.findIndex((media) => !isVideoMedia(media));
        for (let i = 0; i < data.media.length; i++) {
          const m = data.media[i];
          const storageKey = m.storageKey || `products/${id}/media-${i + 1}-${Date.now()}.webp`;

          const asset = await tx.mediaAsset.upsert({
            where: { storageKey },
            update: { url: m.url, altText: m.altText },
            create: {
              storageKey,
              url: m.url,
              altText: m.altText,
              mimeType: m.mimeType,
              fileSizeBytes: m.fileSizeBytes,
              source: m.source,
            },
          });

          await tx.productMedia.create({
            data: {
              productId: id,
              mediaAssetId: asset.id,
              mediaType: m.mediaType ?? (m.mimeType.startsWith("video/") ? "VIDEO" : "IMAGE"),
              caption: m.caption,
              posterUrl: m.posterUrl,
              isPrimary: !isVideoMedia(m) && i === (primaryImageIndex >= 0 ? primaryImageIndex : firstImageIndex),
              sortOrder: m.sortOrder ?? i,
            },
          });
        }
      }

      // Audit event
      await tx.auditEvent.create({
        data: {
          actorAdminId: adminId || null,
          action: "PRODUCT_UPDATED",
          resourceType: "PRODUCT",
          resourceId: id,
          details: { name: updated.name, status: updated.status },
        },
      });

      return updated;
    });
  }

  /**
   * Update publication status (PUBLISHED, DRAFT, ARCHIVED)
   */
  async updateProductStatus(id: string, status: ProductStatus, adminId?: string) {
    return prisma.$transaction(async (tx) => {
      const product = await tx.product.update({
        where: { id },
        data: {
          status,
          publishedAt: status === "PUBLISHED" ? new Date() : null,
        },
      });

      await tx.auditEvent.create({
        data: {
          actorAdminId: adminId || null,
          action: `PRODUCT_STATUS_${status}`,
          resourceType: "PRODUCT",
          resourceId: id,
          details: { status },
        },
      });

      return product;
    });
  }
}
