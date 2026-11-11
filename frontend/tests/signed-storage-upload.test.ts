import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { uploadFileToSignedStorage } from "../src/lib/api/signed-storage-upload";

describe("Supabase signed payment-proof upload contract", () => {
  it("sends the raw binary file with PUT and the declared MIME type", async () => {
    const file = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: "image/png" });
    let receivedUrl = "";
    let receivedInit: RequestInit | undefined;

    await uploadFileToSignedStorage({
      signedUploadUrl: "https://project.supabase.co/storage/v1/object/upload/sign/payment-proofs/orders/demo/proof.png?token=signed",
      file,
      mimeType: "image/png",
      publicApiKey: "public-test-key",
      fetcher: async (url, init) => {
        receivedUrl = String(url);
        receivedInit = init;
        return new Response(null, { status: 200 });
      },
    });

    assert.match(receivedUrl, /^https:\/\//);
    assert.equal(receivedInit?.method, "PUT");
    assert.equal(receivedInit?.body, file);
    assert.equal(receivedInit?.headers instanceof Headers, false);
    const headers = new Headers(receivedInit?.headers);
    assert.equal(headers.get("Content-Type"), "image/png");
    assert.equal(headers.get("apikey"), "public-test-key");
    assert.equal(headers.get("Authorization"), "Bearer public-test-key");
    assert.equal(headers.get("x-upsert"), "false");
    assert.equal(receivedInit?.body instanceof FormData, false);
  });

  it("rejects an unsuccessful storage response without reporting an upload success", async () => {
    const file = new Blob([new Uint8Array([1])], { type: "image/jpeg" });
    await assert.rejects(
      uploadFileToSignedStorage({
        signedUploadUrl: "https://project.supabase.co/storage/v1/object/upload/sign/payment-proofs/demo.jpg?token=signed",
        file,
        mimeType: "image/jpeg",
        publicApiKey: "public-test-key",
        fetcher: async () => new Response(null, { status: 413 }),
      }),
      /could not be uploaded/
    );
  });

  it("rejects missing public keys and invalid upload URLs before making a network request", async () => {
    const file = new Blob([new Uint8Array([1])], { type: "image/webp" });
    let calls = 0;
    const fetcher = async () => {
      calls += 1;
      return new Response(null, { status: 200 });
    };

    await assert.rejects(
      uploadFileToSignedStorage({
        signedUploadUrl: "https://project.supabase.co/storage/v1/object/upload/sign/demo",
        file,
        mimeType: "image/webp",
        publicApiKey: "",
        fetcher,
      }),
      /not configured/
    );
    await assert.rejects(
      uploadFileToSignedStorage({
        signedUploadUrl: "/relative/upload-url",
        file,
        mimeType: "image/webp",
        publicApiKey: "public-test-key",
        fetcher,
      }),
      /URL is invalid/
    );
    assert.equal(calls, 0);
  });
});
