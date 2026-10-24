import type { Request, Response, NextFunction } from "express";
import { CatalogService } from "./catalog.service.js";
import type {
  CreateProductInput,
  UpdateProductInput,
  ListPublicProductsQuery,
  ListAdminProductsQuery,
} from "./catalog.schemas.js";

export class CatalogController {
  constructor(private readonly service: CatalogService = new CatalogService()) {}

  // ---------------------------------------------------------------------------
  // Public Storefront Endpoints
  // ---------------------------------------------------------------------------

  listPublicProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query as unknown as ListPublicProductsQuery;
      const result = await this.service.listPublicProducts(query);
      res.status(200).json({
        data: result.items,
        pagination: result.pagination,
        meta: { requestId: req.requestId },
      });
    } catch (error) {
      next(error);
    }
  };

  getPublicProductBySlug = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const slug = req.params.slug as string;
      const product = await this.service.getPublicProductBySlug(slug);
      res.status(200).json({
        data: product,
        meta: { requestId: req.requestId },
      });
    } catch (error) {
      next(error);
    }
  };

  listCategories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const categories = await this.service.listCategories();
      res.status(200).json({
        data: categories,
        meta: { requestId: req.requestId },
      });
    } catch (error) {
      next(error);
    }
  };

  // ---------------------------------------------------------------------------
  // Admin Endpoints
  // ---------------------------------------------------------------------------

  listAdminProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query as unknown as ListAdminProductsQuery;
      const result = await this.service.listAdminProducts(query);
      res.status(200).json({
        data: result.items,
        pagination: result.pagination,
        meta: { requestId: req.requestId },
      });
    } catch (error) {
      next(error);
    }
  };

  getAdminProductById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const product = await this.service.getAdminProductById(id);
      res.status(200).json({
        data: product,
        meta: { requestId: req.requestId },
      });
    } catch (error) {
      next(error);
    }
  };

  createProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = req.body as CreateProductInput;
      const adminId = req.adminUser?.id;
      const created = await this.service.createProduct(input, adminId);
      res.status(201).json({
        data: created,
        meta: {
          requestId: req.requestId,
          message: "Product created successfully",
        },
      });
    } catch (error) {
      next(error);
    }
  };

  updateProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const input = req.body as UpdateProductInput;
      const adminId = req.adminUser?.id;
      const updated = await this.service.updateProduct(id, input, adminId);
      res.status(200).json({
        data: updated,
        meta: {
          requestId: req.requestId,
          message: "Product updated successfully",
        },
      });
    } catch (error) {
      next(error);
    }
  };

  publishProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const adminId = req.adminUser?.id;
      const published = await this.service.publishProduct(id, adminId);
      res.status(200).json({
        data: published,
        meta: {
          requestId: req.requestId,
          message: "Product published to storefront",
        },
      });
    } catch (error) {
      next(error);
    }
  };

  unpublishProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const adminId = req.adminUser?.id;
      const unpublished = await this.service.unpublishProduct(id, adminId);
      res.status(200).json({
        data: unpublished,
        meta: {
          requestId: req.requestId,
          message: "Product reverted to draft",
        },
      });
    } catch (error) {
      next(error);
    }
  };

  archiveProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const adminId = req.adminUser?.id;
      const archived = await this.service.archiveProduct(id, adminId);
      res.status(200).json({
        data: archived,
        meta: {
          requestId: req.requestId,
          message: "Product archived",
        },
      });
    } catch (error) {
      next(error);
    }
  };
}
