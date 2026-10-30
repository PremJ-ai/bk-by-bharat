import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";
import argon2 from "argon2";
import { MediaService } from "../src/modules/media/media.service.js";

const app = createApp();

describe("Milestone 5: Media Service and Admin Media Endpoints", () => {
  let adminCookie: string;
  let testProductId: string;

  beforeAll(async () => {
    // Clean up previous test admin if left over
    await prisma.adminUser.deleteMany({
      where: { username: "media_admin_test" },
    });
    await prisma.mediaAsset.deleteMany({
      where: { altText: { contains: "TestMedia" } },
    });

    // Create test admin
    const passwordHash = await argon2.hash("SuperSecretMediaAdminPass123!");
    await prisma.adminUser.create({
      data: {
        username: "media_admin_test",
        passwordHash,
        role: "ADMIN",
        status: "ACTIVE",
      },
    });

    // Login to get session cookie
    const loginRes = await request(app)
      .post("/api/v1/admin-auth/login")
      .send({
        username: "media_admin_test",
        password: "SuperSecretMediaAdminPass123!",
      });

    expect(loginRes.status).toBe(200);
    const cookies = loginRes.headers["set-cookie"];
    adminCookie = Array.isArray(cookies) ? cookies.join("; ") : cookies;

    // Create a product to attach media to
    const category = (await prisma.category.findFirst()) || (await prisma.category.create({
      data: { name: "Test Media Category", slug: "test-media-category" },
    }));

    const product = await prisma.product.create({
      data: {
        name: "Test Media Overshirt",
        slug: `test-media-overshirt-${Date.now()}`,
        description: "Test product for media tests",
        material: "Raw Silk",
        categoryId: category.id,
        pricePaise: 500000,
        status: "DRAFT",
      },
    });
    testProductId = product.id;
  });

  afterAll(async () => {
    if (testProductId) {
      await prisma.productMedia.deleteMany({ where: { productId: testProductId } });
      await prisma.productVariant.deleteMany({ where: { productId: testProductId } });
      await prisma.imageGenerationJob.deleteMany({ where: { productId: testProductId } });
      await prisma.product.deleteMany({ where: { id: testProductId } });
    }
    await prisma.mediaAsset.deleteMany({
      where: { altText: { contains: "TestMedia" } },
    });
    await prisma.adminUser.deleteMany({
      where: { username: "media_admin_test" },
    });
  });

  it("rejects unauthenticated requests to media generation", async () => {
    const res = await request(app)
      .post("/api/v1/admin/media/generate")
      .send({
        productName: "Test Overshirt",
        material: "Raw Silk",
        categoryName: "shirts",
      });

    expect(res.status).toBe(401);
  });

  it("generates an AI media asset successfully for an authenticated admin", async () => {
    const res = await request(app)
      .post("/api/v1/admin/media/generate")
      .set("Cookie", adminCookie)
      .send({
        productName: "TestMedia Raw Silk Overshirt",
        material: "Raw Silk",
        categoryName: "shirts",
        productId: testProductId,
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.source).toBe("AI_GENERATED");
    expect(res.body.data.status).toBe("READY");
    expect(res.body.data.url).toMatch(/^https?:\/\//);

    // Verify job in database
    const job = await prisma.imageGenerationJob.findFirst({
      where: { productId: testProductId },
    });
    expect(job).toBeDefined();
    expect(job?.status).toBe("COMPLETED");
  });

  it("rejects uploads with unsupported mime types", async () => {
    const res = await request(app)
      .post("/api/v1/admin/media/upload")
      .set("Cookie", adminCookie)
      .send({
        fileName: "malicious.exe",
        mimeType: "application/x-msdownload",
        fileBase64: "dGVzdA==",
        altText: "TestMedia Invalid",
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("Unsupported media format");
  });

  it("uploads a base64 media asset successfully and persists to disk", async () => {
    // 1x1 transparent PNG base64
    const pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

    const res = await request(app)
      .post("/api/v1/admin/media/upload")
      .set("Cookie", adminCookie)
      .send({
        fileName: "test-swatch.png",
        mimeType: "image/png",
        fileBase64: pngBase64,
        altText: "TestMedia Swatch Upload",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.source).toBe("UPLOADED");
    expect(res.body.data.url).toMatch(/^\/uploads\//);
    expect(res.body.data.fileSizeBytes).toBeGreaterThan(0);
  });

  it("refuses local-disk media operations on Vercel", async () => {
    const previousVercel = process.env.VERCEL;
    process.env.VERCEL = "1";
    const service = new MediaService();

    try {
      await expect(
        service.generateProductImageDraft({
          productName: "TestMedia Garment",
          material: "Linen",
          categoryName: "shirts",
        })
      ).rejects.toMatchObject({ statusCode: 503 });

      await expect(
        service.uploadMedia({
          fileName: "test.png",
          mimeType: "image/png",
          fileBase64: "aW1hZ2U=",
          altText: "TestMedia Vercel upload",
        })
      ).rejects.toMatchObject({ statusCode: 503 });
    } finally {
      if (previousVercel === undefined) {
        delete process.env.VERCEL;
      } else {
        process.env.VERCEL = previousVercel;
      }
    }
  });

  it("handles media reordering and setting primary media on a product", async () => {
    // Link two assets to testProductId
    const asset1 = await prisma.mediaAsset.create({
      data: {
        source: "UPLOADED",
        status: "READY",
        storageKey: `test/1-${Date.now()}.png`,
        url: "/uploads/1.png",
        altText: "TestMedia Asset 1",
        mimeType: "image/png",
        fileSizeBytes: 1024,
      },
    });

    const asset2 = await prisma.mediaAsset.create({
      data: {
        source: "UPLOADED",
        status: "READY",
        storageKey: `test/2-${Date.now()}.png`,
        url: "/uploads/2.png",
        altText: "TestMedia Asset 2",
        mimeType: "image/png",
        fileSizeBytes: 1024,
      },
    });

    await prisma.productMedia.create({
      data: { productId: testProductId, mediaAssetId: asset1.id, sortOrder: 0, isPrimary: true },
    });
    await prisma.productMedia.create({
      data: { productId: testProductId, mediaAssetId: asset2.id, sortOrder: 1, isPrimary: false },
    });

    // Make asset2 primary
    const primaryRes = await request(app)
      .patch(`/api/v1/admin/media/products/${testProductId}/media/primary`)
      .set("Cookie", adminCookie)
      .send({ mediaAssetId: asset2.id });

    expect(primaryRes.status).toBe(200);

    const checkPrimary = await prisma.productMedia.findFirst({
      where: { productId: testProductId, mediaAssetId: asset2.id },
    });
    expect(checkPrimary?.isPrimary).toBe(true);

    const oldPrimary = await prisma.productMedia.findFirst({
      where: { productId: testProductId, mediaAssetId: asset1.id },
    });
    expect(oldPrimary?.isPrimary).toBe(false);

    // Reorder
    const reorderRes = await request(app)
      .patch(`/api/v1/admin/media/products/${testProductId}/media/reorder`)
      .set("Cookie", adminCookie)
      .send({ mediaAssetIdsInOrder: [asset2.id, asset1.id] });

    expect(reorderRes.status).toBe(200);

    // Delete media link
    const delRes = await request(app)
      .delete(`/api/v1/admin/media/products/${testProductId}/media/${asset1.id}`)
      .set("Cookie", adminCookie);

    expect(delRes.status).toBe(200);

    const remaining = await prisma.productMedia.findMany({
      where: { productId: testProductId },
    });
    expect(remaining).toHaveLength(1);
    expect(remaining[0].mediaAssetId).toBe(asset2.id);
  });
});
