import { CatalogRepository } from "./catalog.repository.js";
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
} from "../../lib/errors.js";
import type {
  CreateProductInput,
  UpdateProductInput,
  ListPublicProductsQuery,
  ListAdminProductsQuery,
} from "./catalog.schemas.js";

export class CatalogService {
  constructor(private readonly repository: CatalogRepository = new CatalogRepository()) {}

  /**
   * Helper to generate a URL-safe slug from a product name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  /**
   * Map database product entity to Public Product View Model
   */
  mapToPublicViewModel(product: any) {
    const imageMedia = (product.media || []).filter(
      (m: any) => m.mediaType !== "VIDEO" && !m.mediaAsset?.mimeType?.startsWith("video/")
    );
    const primaryMedia =
      imageMedia.find((m: any) => m.isPrimary) || imageMedia[0];

    const totalStock = product.variants?.reduce(
      (sum: number, v: any) => sum + (v.stock || 0),
      0
    ) || 0;

    let stockStatus: "in_stock" | "low_stock" | "out_of_stock" = "in_stock";
    if (totalStock <= 0) {
      stockStatus = "out_of_stock";
    } else if (totalStock <= 5) {
      stockStatus = "low_stock";
    }

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      category: product.category?.name || "General",
      categorySlug: product.category?.slug || "all",
      material: product.material,
      fabricSpecifications: product.fabricSpecifications,
      pricePaise: product.pricePaise,
      compareAtPricePaise: product.compareAtPricePaise,
      currency: product.currency || "INR",
      badge: product.badge,
      stockStatus,
      totalStock,
      imageUrl: primaryMedia?.mediaAsset?.url || "",
      imageAlt: primaryMedia?.mediaAsset?.altText || product.name,
      isFixture: product.isFixture,
      description: product.description,
      longDescription: product.longDescription,
      details: product.details || [],
      careInstructions: product.careInstructions || [],
      sizes:
        product.variants?.map((v: any) => ({
          id: v.id,
          sku: v.sku,
          size: v.size,
          colorName: v.colorName,
          stock: v.stock,
          available: v.stock > 0 && v.isActive,
          pricePaise: v.priceOverridePaise || product.pricePaise,
        })) || [],
      colors: Array.from(
        new Map(
          (product.variants || []).map((v: any) => [
            v.colorName,
            { name: v.colorName, hex: v.colorHex || "#0A192F" },
          ])
        ).values()
      ),
      galleryImages:
        imageMedia.map((m: any) => m.mediaAsset?.url).filter(Boolean),
      galleryMedia:
        (product.media || []).map((m: any) => ({
          type: m.mediaType || (m.mediaAsset?.mimeType?.startsWith("video/") ? "VIDEO" : "IMAGE"),
          url: m.mediaAsset?.url || "",
          altText: m.mediaAsset?.altText || product.name,
          caption: m.caption || "",
          posterUrl: m.posterUrl || "",
        })).filter((m: any) => m.url),
      publishedAt: product.publishedAt,
    };
  }

  /**
   * Map database product entity to Admin Detail DTO
   */
  mapToAdminDto(product: any) {
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      status: product.status,
      category: product.category?.name || "",
      categoryId: product.categoryId,
      categorySlug: product.category?.slug || "",
      material: product.material,
      fabricSpecifications: product.fabricSpecifications,
      badge: product.badge,
      pricePaise: product.pricePaise,
      compareAtPricePaise: product.compareAtPricePaise,
      currency: product.currency,
      description: product.description,
      longDescription: product.longDescription,
      details: product.details || [],
      careInstructions: product.careInstructions || [],
      isFixture: product.isFixture,
      publishedAt: product.publishedAt,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      variants:
        product.variants?.map((v: any) => ({
          id: v.id,
          sku: v.sku,
          size: v.size,
          colorName: v.colorName,
          colorHex: v.colorHex,
          stock: v.stock,
          reservedStock: v.reservedStock,
          priceOverridePaise: v.priceOverridePaise,
          isActive: v.isActive,
        })) || [],
      media:
        product.media?.map((m: any) => ({
          id: m.id,
          mediaAssetId: m.mediaAssetId,
          url: m.mediaAsset?.url || "",
          altText: m.mediaAsset?.altText || "",
          caption: m.caption || "",
          posterUrl: m.posterUrl || "",
          mediaType: m.mediaType || (m.mediaAsset?.mimeType?.startsWith("video/") ? "VIDEO" : "IMAGE"),
          mimeType: m.mediaAsset?.mimeType || "image/webp",
          fileSizeBytes: m.mediaAsset?.fileSizeBytes || 0,
          isPrimary: m.isPrimary,
          sortOrder: m.sortOrder,
          source: m.mediaAsset?.source,
          storageKey: m.mediaAsset?.storageKey,
        })) || [],
    };
  }

  /**
   * Get public catalog list
   */
  async listPublicProducts(query: ListPublicProductsQuery) {
    const result = await this.repository.findPublishedProducts({
      categorySlug: query.category,
      material: query.material,
      size: query.size,
      inStockOnly: query.inStock === "true",
      search: query.search,
      sortBy: query.sortBy,
      page: query.page,
      limit: query.limit,
    });

    return {
      items: result.items.map((p) => this.mapToPublicViewModel(p)),
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    };
  }

  /**
   * Get single published product by slug
   */
  async getPublicProductBySlug(slug: string) {
    const product = await this.repository.findPublishedProductBySlug(slug);
    if (!product) {
      throw new NotFoundError(`Product '${slug}' not found or unavailable.`);
    }
    return this.mapToPublicViewModel(product);
  }

  /**
   * List all categories
   */
  async listCategories() {
    const categories = await this.repository.listCategories();
    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      displayOrder: c.displayOrder,
      productCount: c._count.products,
    }));
  }

  /**
   * Admin: list all products with filtering & pagination
   */
  async listAdminProducts(query: ListAdminProductsQuery) {
    const result = await this.repository.findAllProductsAdmin({
      status: query.status,
      categorySlug: query.category,
      search: query.search,
      page: query.page,
      limit: query.limit,
    });

    return {
      items: result.items.map((p) => this.mapToAdminDto(p)),
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    };
  }

  /**
   * Admin: get product by ID
   */
  async getAdminProductById(id: string) {
    const product = await this.repository.findProductById(id);
    if (!product) {
      throw new NotFoundError(`Product '${id}' not found.`);
    }
    return this.mapToAdminDto(product);
  }

  /**
   * Admin: create new product with variants and media
   */
  async createProduct(data: CreateProductInput, adminId?: string) {
    // 1. Resolve slug
    const slug = data.slug || this.generateSlug(data.name);
    const existingSlug = await this.repository.findProductBySlug(slug);
    if (existingSlug) {
      throw new ConflictError(`Product with slug '${slug}' already exists.`);
    }

    // 2. Resolve SKUs
    for (const v of data.variants) {
      const existingSku = await this.repository.findVariantBySku(v.sku);
      if (existingSku) {
        throw new ConflictError(`Variant SKU '${v.sku}' already exists.`);
      }
    }

    // 3. Resolve Category
    const category = await this.repository.findOrCreateCategory(
      data.categoryName,
      data.categorySlug
    );

    // 4. Validate publishing preconditions if status is PUBLISHED
    if (data.status === "PUBLISHED") {
      this.validatePublishingRules(data);
    }

    // 5. Create in database
    const created = await this.repository.createProduct(
      {
        ...data,
        slug,
        categoryId: category.id,
      },
      adminId
    );

    const fullProduct = await this.repository.findProductById(created.id);
    return this.mapToAdminDto(fullProduct);
  }

  /**
   * Admin: update existing product
   */
  async updateProduct(id: string, data: UpdateProductInput, adminId?: string) {
    const existing = await this.repository.findProductById(id);
    if (!existing) {
      throw new NotFoundError(`Product '${id}' not found.`);
    }

    // Slug check if changed
    let slug = data.slug;
    if (slug && slug !== existing.slug) {
      const duplicateSlug = await this.repository.findProductBySlug(slug);
      if (duplicateSlug && duplicateSlug.id !== id) {
        throw new ConflictError(`Product with slug '${slug}' already exists.`);
      }
    }

    // SKU uniqueness check
    if (data.variants) {
      for (const v of data.variants) {
        const duplicateSku = await this.repository.findVariantBySku(v.sku);
        if (duplicateSku && duplicateSku.productId !== id) {
          throw new ConflictError(`Variant SKU '${v.sku}' is already assigned to another product.`);
        }
      }
    }

    // Category resolution
    let categoryId = existing.categoryId;
    if (data.categoryName) {
      const category = await this.repository.findOrCreateCategory(
        data.categoryName,
        data.categorySlug
      );
      categoryId = category.id;
    }

    // Check publishing rules if becoming published
    if (data.status === "PUBLISHED") {
      const merged = {
        name: data.name || existing.name,
        pricePaise: data.pricePaise || existing.pricePaise,
        variants: data.variants || existing.variants,
        media: data.media || existing.media.map((m: any) => ({
          url: m.mediaAsset?.url,
          altText: m.mediaAsset?.altText,
          isPrimary: m.isPrimary,
          mediaType: m.mediaType,
          mimeType: m.mediaAsset?.mimeType,
        })),
      };
      this.validatePublishingRules(merged);
    }

    await this.repository.updateProduct(
      id,
      {
        ...data,
        categoryId,
      },
      adminId
    );

    const updated = await this.repository.findProductById(id);
    return this.mapToAdminDto(updated);
  }

  /**
   * Admin: Publish product
   */
  async publishProduct(id: string, adminId?: string) {
    const product = await this.repository.findProductById(id);
    if (!product) {
      throw new NotFoundError(`Product '${id}' not found.`);
    }

    this.validatePublishingRules(product);

    const updated = await this.repository.updateProductStatus(id, "PUBLISHED", adminId);
    return this.mapToAdminDto(updated);
  }

  /**
   * Admin: Unpublish product (revert to DRAFT)
   */
  async unpublishProduct(id: string, adminId?: string) {
    const product = await this.repository.findProductById(id);
    if (!product) {
      throw new NotFoundError(`Product '${id}' not found.`);
    }

    const updated = await this.repository.updateProductStatus(id, "DRAFT", adminId);
    return this.mapToAdminDto(updated);
  }

  /**
   * Admin: Archive product
   */
  async archiveProduct(id: string, adminId?: string) {
    const product = await this.repository.findProductById(id);
    if (!product) {
      throw new NotFoundError(`Product '${id}' not found.`);
    }

    const updated = await this.repository.updateProductStatus(id, "ARCHIVED", adminId);
    return this.mapToAdminDto(updated);
  }

  /**
   * Enforce business rules before a product can be published
   */
  private validatePublishingRules(data: any) {
    if (!data.name || data.name.trim().length < 2) {
      throw new BadRequestError("Publishing requires a valid product name.");
    }

    if (!data.pricePaise || data.pricePaise <= 0) {
      throw new BadRequestError("Publishing requires a valid price greater than zero.");
    }

    if (!data.variants || data.variants.length === 0) {
      throw new BadRequestError("Publishing requires at least one sellable size/variant.");
    }

    const hasActiveVariant = data.variants.some((v: any) => v.isActive !== false);
    if (!hasActiveVariant) {
      throw new BadRequestError("Publishing requires at least one active variant.");
    }

    const hasProductImage = data.media?.some(
      (media: any) =>
        media.mediaType !== "VIDEO" &&
        !(media.mimeType || media.mediaAsset?.mimeType || "").startsWith("video/")
    );
    if (!hasProductImage) {
      throw new BadRequestError("Publishing requires at least one product image.");
    }
  }
}
