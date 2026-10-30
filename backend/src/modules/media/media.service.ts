import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { prisma } from "../../db/prisma.js";
import { getMediaGenerationProvider } from "./media.provider.js";
import { BadRequestError, NotFoundError, ServiceUnavailableError } from "../../lib/errors.js";

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");

// Ensure upload directory exists
fs.mkdir(UPLOADS_DIR, { recursive: true }).catch(() => {});

export class MediaService {
  private readonly provider = getMediaGenerationProvider();

  /**
   * Request AI image generation draft for a product
   */
  async generateProductImageDraft(options: {
    productName: string;
    material: string;
    categoryName: string;
    productId?: string;
    idempotencyKey?: string;
  }) {
    if (process.env.VERCEL === "1") {
      throw new ServiceUnavailableError(
        "Image generation is disabled until persistent media storage is configured for this deployment."
      );
    }

    const { productName, material, categoryName, productId } = options;
    const idempotencyKey = options.idempotencyKey || `gen-${Date.now()}-${crypto.randomBytes(8).toString("hex")}`;

    // 1. Create Job record
    const job = await prisma.imageGenerationJob.create({
      data: {
        productId: productId || null,
        prompt: `Atelier lookbook visual for ${productName} (${material})`,
        status: "PROCESSING",
        idempotencyKey,
        provider: this.provider.name,
      },
    });

    try {
      // 2. Generate via provider
      const result = await this.provider.generateImage({
        productName,
        material,
        category: categoryName,
      });

      // 3. Persist Media Asset
      const asset = await prisma.mediaAsset.create({
        data: {
          source: "AI_GENERATED",
          status: "READY",
          storageKey: result.storageKey,
          url: result.url,
          altText: `${productName} in ${material}`,
          mimeType: result.mimeType,
          fileSizeBytes: result.fileSizeBytes,
          prompt: result.prompt,
          provenance: result.provenance,
        },
      });

      // 4. Update Job to COMPLETED
      await prisma.imageGenerationJob.update({
        where: { id: job.id },
        data: {
          status: "COMPLETED",
          mediaAssetId: asset.id,
        },
      });

      return asset;
    } catch (err: any) {
      await prisma.imageGenerationJob.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          errorMessage: err?.message || "Generation failed",
        },
      });
      throw err;
    }
  }

  /**
   * Upload an image directly (base64 payload or URL)
   */
  async uploadMedia(options: {
    fileName: string;
    mimeType: string;
    fileBase64?: string;
    url?: string;
    altText: string;
  }) {
    const { fileName, mimeType, fileBase64, url, altText } = options;

    if (process.env.VERCEL === "1" && fileBase64) {
      throw new ServiceUnavailableError(
        "File uploads are disabled until persistent media storage is configured for this deployment."
      );
    }

    const allowedMimes = ["image/webp", "image/jpeg", "image/png", "image/avif"];
    if (!allowedMimes.includes(mimeType.toLowerCase())) {
      throw new BadRequestError(`Unsupported media format: ${mimeType}. Allowed formats: webp, jpeg, png, avif.`);
    }

    let finalUrl = url;
    let storageKey = `uploads/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    let fileSizeBytes = 0;

    if (fileBase64) {
      const cleanBase64 = fileBase64.replace(/^data:image\/[a-z]+;base64,/, "");
      const buffer = Buffer.from(cleanBase64, "base64");

      if (buffer.length > 10 * 1024 * 1024) {
        throw new BadRequestError("File exceeds maximum upload size limit of 10MB.");
      }

      fileSizeBytes = buffer.length;
      const diskPath = path.join(UPLOADS_DIR, path.basename(storageKey));
      await fs.writeFile(diskPath, buffer);
      finalUrl = `/uploads/${path.basename(storageKey)}`;
    } else if (!finalUrl) {
      throw new BadRequestError("Either fileBase64 or url must be provided.");
    }

    const asset = await prisma.mediaAsset.create({
      data: {
        source: "UPLOADED",
        status: "READY",
        storageKey,
        url: finalUrl,
        altText,
        mimeType,
        fileSizeBytes,
      },
    });

    return asset;
  }

  /**
   * Set primary media asset for a product
   */
  async setPrimaryMedia(productId: string, mediaAssetId: string) {
    const link = await prisma.productMedia.findFirst({
      where: { productId, mediaAssetId },
    });

    if (!link) {
      throw new NotFoundError("Media asset not associated with this product.");
    }

    await prisma.$transaction([
      prisma.productMedia.updateMany({
        where: { productId },
        data: { isPrimary: false },
      }),
      prisma.productMedia.update({
        where: { id: link.id },
        data: { isPrimary: true },
      }),
    ]);

    return { success: true, primaryMediaAssetId: mediaAssetId };
  }

  /**
   * Reorder media assets on product
   */
  async reorderMedia(productId: string, mediaAssetIdsInOrder: string[]) {
    await prisma.$transaction(
      mediaAssetIdsInOrder.map((assetId, index) =>
        prisma.productMedia.updateMany({
          where: { productId, mediaAssetId: assetId },
          data: { sortOrder: index },
        })
      )
    );

    return { success: true };
  }

  /**
   * Remove media asset from product
   */
  async removeProductMedia(productId: string, mediaAssetId: string) {
    await prisma.productMedia.deleteMany({
      where: { productId, mediaAssetId },
    });

    return { success: true };
  }
}
