import { Router } from "express";
import { CatalogController } from "./catalog.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validateBody, validateQuery } from "../../middleware/validate.js";
import {
  createProductSchema,
  updateProductSchema,
  listPublicProductsQuerySchema,
  listAdminProductsQuerySchema,
} from "./catalog.schemas.js";

export const publicCatalogRouter = Router();
export const adminCatalogRouter = Router();

const controller = new CatalogController();

// -----------------------------------------------------------------------------
// Public Storefront Routes: mounted at /api/v1
// -----------------------------------------------------------------------------
publicCatalogRouter.get(
  "/products",
  validateQuery(listPublicProductsQuerySchema),
  controller.listPublicProducts
);
publicCatalogRouter.get("/products/:slug", controller.getPublicProductBySlug);
publicCatalogRouter.get("/categories", controller.listCategories);

// -----------------------------------------------------------------------------
// Admin Catalog Routes: mounted at /api/v1/admin/products
// Requires session authentication & catalog manager authorization
// -----------------------------------------------------------------------------
adminCatalogRouter.use(authenticate, authorize(["ADMIN", "CATALOG_MANAGER"]));

adminCatalogRouter.get(
  "/",
  validateQuery(listAdminProductsQuerySchema),
  controller.listAdminProducts
);
adminCatalogRouter.post(
  "/",
  validateBody(createProductSchema),
  controller.createProduct
);
adminCatalogRouter.get("/:id", controller.getAdminProductById);
adminCatalogRouter.put(
  "/:id",
  validateBody(updateProductSchema),
  controller.updateProduct
);
adminCatalogRouter.patch("/:id/publish", controller.publishProduct);
adminCatalogRouter.patch("/:id/unpublish", controller.unpublishProduct);
adminCatalogRouter.patch("/:id/archive", controller.archiveProduct);
