import crypto from "node:crypto";
import { BadRequestError, ServiceUnavailableError } from "../../lib/errors.js";

const MAX_PROOF_BYTES = 10 * 1024 * 1024;
const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

interface StorageConfig {
  storageBaseUrl: string;
  serviceRoleKey: string;
  bucket: string;
}

function encodeStoragePath(path: string): string {
  return path.split("/").map((part) => encodeURIComponent(part)).join("/");
}

export class SupabasePrivateStorage {
  private getConfig(): StorageConfig {
    const projectUrl = process.env.SUPABASE_URL?.replace(/\/+$/, "");
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bucket = process.env.PAYMENT_PROOFS_BUCKET || "payment-proofs";

    if (!projectUrl || !serviceRoleKey) {
      throw new ServiceUnavailableError(
        "Private payment-proof storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the backend deployment."
      );
    }
    if (process.env.NODE_ENV === "production" && !/^https:\/\//i.test(projectUrl)) {
      throw new ServiceUnavailableError("Supabase Storage must use HTTPS in production.");
    }
    if (!/^[a-z0-9_-]+$/i.test(bucket)) {
      throw new ServiceUnavailableError("PAYMENT_PROOFS_BUCKET contains an invalid bucket name.");
    }

    return {
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
        "Supabase Storage " + operation + " failed with HTTP " + response.status + ". Check the private bucket and server-side storage credentials."
      );
    }
    try {
      return await response.json();
    } catch {
      throw new ServiceUnavailableError("Supabase Storage " + operation + " returned an invalid response.");
    }
  }

  async createSignedUploadUrl(input: {
    orderId: string;
    mimeType: string;
    fileSizeBytes: number;
  }): Promise<{ signedUploadUrl: string; storageKey: string }> {
    const extension = MIME_EXTENSIONS[input.mimeType];
    if (!extension) throw new BadRequestError("Payment proof must be a JPEG, PNG, or WebP image.");
    if (!Number.isInteger(input.fileSizeBytes) || input.fileSizeBytes < 1 || input.fileSizeBytes > MAX_PROOF_BYTES) {
      throw new BadRequestError("Proof image must be between 1 byte and 10MB.");
    }

    const config = this.getConfig();
    const storageKey = "orders/" + input.orderId + "/proofs/" + crypto.randomUUID() + "." + extension;
    const url = config.storageBaseUrl + "/object/upload/sign/" +
      encodeURIComponent(config.bucket) + "/" + encodeStoragePath(storageKey);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        ...this.headers(config),
        "Content-Type": "application/json",
        "x-upsert": "false",
      },
      body: JSON.stringify({}),
    });
    const payload = await this.parseJsonResponse(response, "signed upload URL creation");
    if (typeof payload.url !== "string") {
      throw new ServiceUnavailableError("Supabase Storage did not return a signed upload URL.");
    }

    const signedUploadUrl = /^https?:\/\//i.test(payload.url)
      ? payload.url
      : config.storageBaseUrl + (payload.url.startsWith("/") ? payload.url : "/" + payload.url);
    return { signedUploadUrl, storageKey };
  }

  async verifyUploadedObject(input: {
    orderId: string;
    storageKey: string;
    mimeType: string;
    fileSizeBytes: number;
  }): Promise<{ fileSizeBytes: number; mimeType: string }> {
    if (!input.storageKey.startsWith("orders/" + input.orderId + "/proofs/")) {
      throw new BadRequestError("The uploaded proof does not belong to this order.");
    }
    if (!MIME_EXTENSIONS[input.mimeType]) {
      throw new BadRequestError("Payment proof must be a JPEG, PNG, or WebP image.");
    }
    if (!Number.isInteger(input.fileSizeBytes) || input.fileSizeBytes < 1 || input.fileSizeBytes > MAX_PROOF_BYTES) {
      throw new BadRequestError("Proof image must be between 1 byte and 10MB.");
    }

    const config = this.getConfig();
    const url = config.storageBaseUrl + "/object/info/" +
      encodeURIComponent(config.bucket) + "/" + encodeStoragePath(input.storageKey);
    const response = await fetch(url, { method: "GET", headers: this.headers(config) });

    if (!response.ok) {
      throw new BadRequestError("The payment screenshot could not be found in private storage. Please upload it again.");
    }

    let metadata: any;
    try {
      metadata = await response.json();
    } catch {
      throw new ServiceUnavailableError("Supabase Storage returned invalid payment-proof metadata.");
    }

    const storedMetadata = metadata?.metadata || {};
    const actualSize = Number(storedMetadata.size ?? metadata?.size ?? 0);
    const actualMime = String(
      storedMetadata.mimetype ?? storedMetadata.contentType ?? metadata?.mimetype ?? metadata?.contentType ?? ""
    ).split(";")[0].toLowerCase();

    if (actualSize > MAX_PROOF_BYTES || (actualSize > 0 && actualSize !== input.fileSizeBytes)) {
      throw new BadRequestError("The uploaded proof size does not match the selected file.");
    }
    if (actualMime && actualMime !== input.mimeType) {
      throw new BadRequestError("The uploaded proof content type does not match the selected image.");
    }

    return {
      fileSizeBytes: actualSize || input.fileSizeBytes,
      mimeType: actualMime || input.mimeType,
    };
  }

  async createSignedDownloadUrl(storageKey: string, expiresInSeconds = 90): Promise<string> {
    const config = this.getConfig();
    const url = config.storageBaseUrl + "/object/sign/" +
      encodeURIComponent(config.bucket) + "/" + encodeStoragePath(storageKey);
    const response = await fetch(url, {
      method: "POST",
      headers: { ...this.headers(config), "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn: expiresInSeconds }),
    });
    const payload = await this.parseJsonResponse(response, "signed download URL creation");

    if (typeof payload.signedURL !== "string") {
      throw new ServiceUnavailableError("Supabase Storage did not return a signed download URL.");
    }
    return /^https?:\/\//i.test(payload.signedURL)
      ? payload.signedURL
      : config.storageBaseUrl + (payload.signedURL.startsWith("/") ? payload.signedURL : "/" + payload.signedURL);
  }
}
