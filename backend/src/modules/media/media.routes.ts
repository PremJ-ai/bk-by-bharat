import { Router, type Request, type Response, type NextFunction } from "express";
import { MediaService } from "./media.service.js";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { z } from "zod";
import { validateBody } from "../../middleware/validate.js";

export const adminMediaRouter = Router();
const mediaService = new MediaService();

// Require admin authentication for all media mutations
adminMediaRouter.use(authenticate, authorize(["ADMIN", "CATALOG_MANAGER"]));

const generateMediaSchema = z.object({
  productName: z.string().min(2),
  material: z.string().min(2),
  categoryName: z.string().min(2),
  productId: z.string().optional(),
});

const createMediaUploadUrlSchema = z.object({
  mimeType: z.enum([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/avif",
    "video/mp4",
    "video/webm",
  ]),
  fileSizeBytes: z.number().int().positive().max(50 * 1024 * 1024),
});

const uploadMediaSchema = z.object({
  fileName: z.string().min(1),
  // Keep this as a string so MediaService can return the specific unsupported-format message.
  mimeType: z.string().min(1),
  storageKey: z.string().trim().min(1).optional(),
  fileSizeBytes: z.number().int().positive().max(50 * 1024 * 1024).optional(),
  fileBase64: z.string().optional(),
  url: z.string().url().optional(),
  altText: z.string().min(1),
}).refine((value) => Boolean(value.storageKey || value.fileBase64 || value.url), {
  message: "A completed upload or valid image URL is required.",
});

const primaryMediaSchema = z.object({
  mediaAssetId: z.string().min(1),
});

const reorderMediaSchema = z.object({
  mediaAssetIdsInOrder: z.array(z.string()).min(1),
});

// Generate AI Product Media Draft
adminMediaRouter.post(
  "/generate",
  validateBody(generateMediaSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const asset = await mediaService.generateProductImageDraft(req.body);
      res.status(201).json({
        data: asset,
        meta: {
          requestId: req.requestId,
          message: "Atelier AI asset generated successfully",
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Create a signed upload ticket for a product image. Router-level middleware requires an admin.
adminMediaRouter.post(
  "/upload-url",
  validateBody(createMediaUploadUrlSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const upload = await mediaService.createMediaUploadUrl(req.body);
      res.status(200).json({
        data: upload,
        meta: { requestId: req.requestId },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Upload Media Asset
adminMediaRouter.post(
  "/upload",
  validateBody(uploadMediaSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const asset = await mediaService.uploadMedia(req.body);
      res.status(201).json({
        data: asset,
        meta: {
          requestId: req.requestId,
          message: "Media asset uploaded successfully",
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Set Primary Media on Product
adminMediaRouter.patch(
  "/products/:id/media/primary",
  validateBody(primaryMediaSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productId = req.params.id;
      const { mediaAssetId } = req.body;
      const result = await mediaService.setPrimaryMedia(productId, mediaAssetId);
      res.status(200).json({
        data: result,
        meta: { requestId: req.requestId },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Reorder Product Media
adminMediaRouter.patch(
  "/products/:id/media/reorder",
  validateBody(reorderMediaSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productId = req.params.id;
      const { mediaAssetIdsInOrder } = req.body;
      const result = await mediaService.reorderMedia(productId, mediaAssetIdsInOrder);
      res.status(200).json({
        data: result,
        meta: { requestId: req.requestId },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Remove Media Link from Product
adminMediaRouter.delete(
  "/products/:id/media/:mediaAssetId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: productId, mediaAssetId } = req.params;
      const result = await mediaService.removeProductMedia(productId, mediaAssetId);
      res.status(200).json({
        data: result,
        meta: { requestId: req.requestId },
      });
    } catch (error) {
      next(error);
    }
  }
);
