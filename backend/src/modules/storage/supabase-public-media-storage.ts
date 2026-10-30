import crypto from "node:crypto";
import { BadRequestError, ServiceUnavailableError } from "../../lib/errors.js";

const MAX_MEDIA_BYTES = 10 * 1024 * 1024;
const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

function encodeStoragePath(path: string): string {
  return path.split("/").map((part) => encodeURIComponent(part)).join("/");
}

interface StorageConfig {
  projectUrl: string;
  storageBaseUrl: string;
  serviceRoleKey: string;
  bucket: string;
}

export class SupabasePublicMediaStorage {
  private getConfig(): StorageConfig {
    const projectUrl = process.env.SUPABASE_URL?.replace(/\/+$/, "");
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bucket = process.env.SUPABASE_PUBLIC_MEDIA_BUCKET || "product-media";

    if (!projectUrl || !serviceRoleKey) {
      throw new ServiceUnavailableError(
        "Product-image storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the backend."
      );
    }
    if (process.env.NODE_ENV === "production" && !/^https:\/\//i.test(projectUrl)) {
      throw new ServiceUnavailableError("Supabase Storage must use HTTPS in production.");
    }
    if (!/^[a-z0-9_-]+$/i.test(bucket)) {
      throw new ServiceUnavailableError("SUPABASE_PUBLIC_MEDIA_BUCKET contains an invalid bucket name.");
    }

    return {
      projectUrl,
      storageBaseUrl: projectUrl + "/storage/v1",
      serviceRoleKey,
      bucket,
    };
  }

  private headers(config: StorageConfig): Record<string, string> {
    return {
      apikey: config.serviceRoleKey,
      Authorization: "Bearer " + config.serviceRoleKey,
    };
  }

  private async parseJsonResponse(response: Response, operation: string): Promise<any> {
    if (!response.ok) {
      throw new ServiceUnavailableError(
        "Supabase Storage " + operation + " failed with HTTP " + response.status + ". Check the product-media bucket and server-side credentials."
      );
    }
    try {
      return await response.json();
    } catch {
      throw new ServiceUnavailableError("Supabase Storage " + operation + " returned an invalid response.");
    }
  }

  getPublicUrl(storageKey: string): string {
    const config = this.getConfig();
    return config.storageBaseUrl + "/object/public/" +
      encodeURIComponent(config.bucket) + "/" + encodeStoragePath(storageKey);
  }

  async createSignedUploadUrl(input: {
    mimeType: string;
    fileSizeBytes: number;
  }): Promise<{ signedUploadUrl: string; storageKey: string; publicUrl: string }> {
    const extension = MIME_EXTENSIONS[input.mimeType];
    if (!extension) {
      throw new BadRequestError("Product images must be JPEG, PNG, WebP, or AVIF.");
    }
    if (
      !Number.isInteger(input.fileSizeBytes) ||
      input.fileSizeBytes < 1 ||
      input.fileSizeBytes > MAX_MEDIA_BYTES
    ) {
      throw new BadRequestError("Product images must be between 1 byte and 10MB.");
    }

    const config = this.getConfig();
    const storageKey = "products/" + crypto.randomUUID() + "." + extension;
    const url = config.storageBaseUrl + "/object/upload/sign/" +
      encodeURIComponent(config.bucket) + "/" + encodeStoragePath(storageKey);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        ...this.headers(config),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
    const payload = await this.parseJsonResponse(response, "signed product-image upload URL creation");

    if (typeof payload.url !== "string") {
      throw new ServiceUnavailableError("Supabase Storage did not return a signed product-image upload URL.");
    }

    const signedUploadUrl = /^https?:\/\//i.test(payload.url)
      ? payload.url
      : config.storageBaseUrl + (payload.url.startsWith("/") ? payload.url : "/" + payload.url);

    return {
      signedUploadUrl,
      storageKey,
      publicUrl: this.getPublicUrl(storageKey),
    };
  }

  async verifyUploadedObject(input: {
    storageKey: string;
    mimeType: string;
    fileSizeBytes: number;
  }): Promise<{ fileSizeBytes: number; mimeType: string; publicUrl: string }> {
    if (!input.storageKey.startsWith("products/")) {
      throw new BadRequestError("The uploaded product image has an invalid storage path.");
    }
    if (!MIME_EXTENSIONS[input.mimeType]) {
      throw new BadRequestError("Product images must be JPEG, PNG, WebP, or AVIF.");
    }
    if (
      !Number.isInteger(input.fileSizeBytes) ||
      input.fileSizeBytes < 1 ||
      input.fileSizeBytes > MAX_MEDIA_BYTES
    ) {
      throw new BadRequestError("Product images must be between 1 byte and 10MB.");
    }

    const config = this.getConfig();
    const url = config.storageBaseUrl + "/object/info/authenticated/" +
      encodeURIComponent(config.bucket) + "/" + encodeStoragePath(input.storageKey);
    const response = await fetch(url, { method: "HEAD", headers: this.headers(config) });

    if (!response.ok) {
      throw new BadRequestError("The product image could not be found in Supabase Storage. Please upload it again.");
    }

    const actualSize = Number(response.headers.get("content-length") || 0);
    const actualMime = (response.headers.get("content-type") || "").split(";")[0].toLowerCase();

    if (actualSize > MAX_MEDIA_BYTES || (actualSize > 0 && actualSize !== input.fileSizeBytes)) {
      throw new BadRequestError("The product-image size does not match the selected file.");
    }
    if (actualMime && actualMime !== input.mimeType) {
      throw new BadRequestError("The uploaded content type does not match the selected product image.");
    }

    return {
      fileSizeBytes: actualSize || input.fileSizeBytes,
      mimeType: actualMime || input.mimeType,
      publicUrl: this.getPublicUrl(input.storageKey),
    };
  }
}
