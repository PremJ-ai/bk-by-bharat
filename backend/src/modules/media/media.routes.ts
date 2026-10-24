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

const uploadMediaSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  fileBase64: z.string().optional(),
  url: z.string().url().optional(),
  altText: z.string().min(1),
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
