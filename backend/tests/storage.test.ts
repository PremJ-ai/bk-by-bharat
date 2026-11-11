import { afterEach, describe, expect, it, vi } from "vitest";
import { SupabasePrivateStorage } from "../src/modules/storage/supabase-private-storage.js";

const previousUrl = process.env.SUPABASE_URL;
const previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const previousBucket = process.env.PAYMENT_PROOFS_BUCKET;
const previousNodeEnv = process.env.NODE_ENV;

function restoreEnvironment() {
  if (previousUrl === undefined) delete process.env.SUPABASE_URL;
  else process.env.SUPABASE_URL = previousUrl;
  if (previousKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  else process.env.SUPABASE_SERVICE_ROLE_KEY = previousKey;
  if (previousBucket === undefined) delete process.env.PAYMENT_PROOFS_BUCKET;
  else process.env.PAYMENT_PROOFS_BUCKET = previousBucket;
  if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = previousNodeEnv;
}

describe("Supabase private payment-proof storage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    restoreEnvironment();
  });

  it("creates an order-scoped signed upload URL using the private service key", async () => {
    process.env.NODE_ENV = "test";
    process.env.SUPABASE_URL = "https://project.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "server-only-key";
    process.env.PAYMENT_PROOFS_BUCKET = "payment-proofs";

    let requestedUrl = "";
    let requestedInit: RequestInit | undefined;
    vi.stubGlobal("fetch", vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      requestedUrl = String(url);
      requestedInit = init;
      return new Response(JSON.stringify({
        url: "/object/upload/sign/payment-proofs/orders/order-123/proofs/fixture.png?token=temporary",
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }));

    const result = await new SupabasePrivateStorage().createSignedUploadUrl({
      orderId: "order-123",
      mimeType: "image/png",
      fileSizeBytes: 2048,
    });

    expect(requestedUrl).toContain("/object/upload/sign/payment-proofs/orders/order-123/proofs/");
    expect(requestedInit?.method).toBe("POST");
    expect(new Headers(requestedInit?.headers).get("Authorization")).toBe("Bearer server-only-key");
    expect(new Headers(requestedInit?.headers).get("x-upsert")).toBe("false");
    expect(JSON.parse(String(requestedInit?.body))).toEqual({});
    expect(result.storageKey).toMatch(/^orders\/order-123\/proofs\/.+\.png$/);
    expect(result.signedUploadUrl).toContain("?token=temporary");
    expect(result.signedUploadUrl).toMatch(/^https:\/\/project\.supabase\.co/);
  });

  it("verifies the uploaded object belongs to its order and matches metadata", async () => {
    process.env.NODE_ENV = "test";
    process.env.SUPABASE_URL = "https://project.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "server-only-key";

    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      metadata: { size: 2048, mimetype: "image/png" },
    }), { status: 200, headers: { "Content-Type": "application/json" } })));

    await expect(new SupabasePrivateStorage().verifyUploadedObject({
      orderId: "order-123",
      storageKey: "orders/order-123/proofs/example.png",
      mimeType: "image/png",
      fileSizeBytes: 2048,
    })).resolves.toEqual({ fileSizeBytes: 2048, mimeType: "image/png" });
  });

  it("rejects a proof uploaded under another order's storage path", async () => {
    process.env.NODE_ENV = "test";
    process.env.SUPABASE_URL = "https://project.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "server-only-key";

    await expect(new SupabasePrivateStorage().verifyUploadedObject({
      orderId: "order-123",
      storageKey: "orders/someone-else/proofs/example.png",
      mimeType: "image/png",
      fileSizeBytes: 2048,
    })).rejects.toMatchObject({ statusCode: 400 });
  });

  it("rejects unsupported formats and oversized upload tickets before calling storage", async () => {
    process.env.NODE_ENV = "test";
    process.env.SUPABASE_URL = "https://project.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "server-only-key";
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const storage = new SupabasePrivateStorage();

    await expect(storage.createSignedUploadUrl({
      orderId: "order-123",
      mimeType: "application/pdf",
      fileSizeBytes: 2048,
    })).rejects.toMatchObject({ statusCode: 400 });

    await expect(storage.createSignedUploadUrl({
      orderId: "order-123",
      mimeType: "image/png",
      fileSizeBytes: 11 * 1024 * 1024,
    })).rejects.toMatchObject({ statusCode: 400 });

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
