import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";
import argon2 from "argon2";
import { SESSION_COOKIE_NAME } from "../src/config/constants.js";
import crypto from "node:crypto";

const app = createApp();

describe("Catalog Module — Public & Admin Product Persistence", () => {
  let adminSessionCookie: string;
  let adminId: string;
  let testProductId: string;

  beforeAll(async () => {
    // 1. Create a dedicated test admin
    const username = `catalog_admin_${Date.now()}@fashion.local`;
    const passwordHash = await argon2.hash("CatalogPassword123!");
    const admin = await prisma.adminUser.create({
      data: {
        username,
        passwordHash,
        role: "ADMIN",
        status: "ACTIVE",
      },
    });
    adminId = admin.id;

    // 2. Create active session
    const rawSessionToken = crypto.randomBytes(32).toString("hex");
    const sessionTokenHash = crypto.createHash("sha256").update(rawSessionToken).digest("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60);

    await prisma.adminSession.create({
      data: {
        sessionTokenHash,
        adminUserId: admin.id,
        expiresAt,
      },
    });

    adminSessionCookie = `${SESSION_COOKIE_NAME}=${rawSessionToken}`;
  });

  afterAll(async () => {
    // Cleanup test data
    if (testProductId) {
      await prisma.product.deleteMany({ where: { id: testProductId } });
    }
    if (adminId) {
      await prisma.adminUser.deleteMany({ where: { id: adminId } });
    }
  });

  // ---------------------------------------------------------------------------
  // Public Catalog Tests
  // ---------------------------------------------------------------------------
  describe("Public Storefront Catalog", () => {
    it("lists published products with category and pagination metadata", async () => {
      const res = await request(app).get("/api/v1/products");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      const first = res.body.data[0];
      expect(first).toHaveProperty("id");
      expect(first).toHaveProperty("name");
      expect(first).toHaveProperty("slug");
      expect(first).toHaveProperty("pricePaise");
      expect(first).toHaveProperty("sizes");
      expect(first).toHaveProperty("stockStatus");
    });

    it("filters products by category slug", async () => {
      const res = await request(app).get("/api/v1/products?category=shirts");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      for (const item of res.body.data) {
        expect(item.categorySlug).toBe("shirts");
      }
    });

    it("retrieves published product detail by slug", async () => {
      const res = await request(app).get("/api/v1/products/riviera-camp-collar-shirt");

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe("Riviera Camp-Collar Shirt");
      expect(res.body.data.slug).toBe("riviera-camp-collar-shirt");
      expect(res.body.data.material).toContain("Linen");
      expect(res.body.data.sizes.length).toBeGreaterThan(0);
    });

    it("returns 404 for nonexistent product slug", async () => {
      const res = await request(app).get("/api/v1/products/non-existent-garment-silhouette");

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("NOT_FOUND");
    });

    it("lists categories with published product count", async () => {
      const res = await request(app).get("/api/v1/categories");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
    });
  });

  // ---------------------------------------------------------------------------
  // Admin Product Persistence & Authorization Tests
  // ---------------------------------------------------------------------------
  describe("Admin Catalog Operations & Access Control", () => {
    it("rejects unauthorized access to admin product list", async () => {
      const res = await request(app).get("/api/v1/admin/products");

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("allows authenticated admin to create a new product draft", async () => {
      const timestamp = Date.now();
      const payload = {
        name: `Test Pleated Trouser ${timestamp}`,
        slug: `test-pleated-trouser-${timestamp}`,
        description: "Artisan tailored trouser with deep forward pleats.",
        material: "100% Belgian Linen (280gsm)",
        categoryName: "Trousers",
        categorySlug: "trousers",
        pricePaise: 1150000,
        status: "DRAFT",
        variants: [
          { sku: `TEST-TRS-${timestamp}-30`, size: "30", colorName: "Oatmeal", stock: 5 },
          { sku: `TEST-TRS-${timestamp}-32`, size: "32", colorName: "Oatmeal", stock: 8 },
        ],
        media: [
          {
            url: "https://example.com/images/test-trouser.webp",
            altText: "Test Pleated Trouser front view",
            isPrimary: true,
          },
        ],
      };

      const res = await request(app)
        .post("/api/v1/admin/products")
        .set("Cookie", adminSessionCookie)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty("id");
      expect(res.body.data.name).toBe(payload.name);
      expect(res.body.data.status).toBe("DRAFT");
      expect(res.body.data.variants.length).toBe(2);

      testProductId = res.body.data.id;

      // Draft product must NOT appear in public storefront
      const publicCheck = await request(app).get(`/api/v1/products/${payload.slug}`);
      expect(publicCheck.status).toBe(404);
    });

    it("rejects duplicate variant SKU on product creation", async () => {
      const timestamp = Date.now();
      const payload = {
        name: `Duplicate SKU Product ${timestamp}`,
        slug: `duplicate-sku-prod-${timestamp}`,
        description: "Testing SKU uniqueness enforcement.",
        material: "Cotton",
        categoryName: "Shirts",
        pricePaise: 500000,
        status: "DRAFT",
        variants: [
          // Using existing SKU from seed
          { sku: "SHR-BEL-001-S", size: "S", colorName: "White", stock: 1 },
        ],
        media: [{ url: "https://example.com/img.webp", altText: "img" }],
      };

      const res = await request(app)
        .post("/api/v1/admin/products")
        .set("Cookie", adminSessionCookie)
        .send(payload);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("CONFLICT");
    });

    it("successfully publishes product making it available on public storefront", async () => {
      expect(testProductId).toBeDefined();

      const publishRes = await request(app)
        .patch(`/api/v1/admin/products/${testProductId}/publish`)
        .set("Cookie", adminSessionCookie);

      expect(publishRes.status).toBe(200);
      expect(publishRes.body.data.status).toBe("PUBLISHED");

      // Verify product is now visible on public storefront
      const publicCheck = await request(app).get(`/api/v1/products/${publishRes.body.data.slug}`);
      expect(publicCheck.status).toBe(200);
      expect(publicCheck.body.data.id).toBe(testProductId);
    });

    it("allows admin to update product details and price", async () => {
      expect(testProductId).toBeDefined();

      const updateRes = await request(app)
        .put(`/api/v1/admin/products/${testProductId}`)
        .set("Cookie", adminSessionCookie)
        .send({
          pricePaise: 1280000, // Updated price: ₹12,800
          description: "Updated artisan description with revised tailoring notes.",
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.pricePaise).toBe(1280000);
      expect(updateRes.body.data.description).toContain("Updated artisan description");
    });

    it("unpublishes product removing it from public storefront", async () => {
      expect(testProductId).toBeDefined();

      const unpublishRes = await request(app)
        .patch(`/api/v1/admin/products/${testProductId}/unpublish`)
        .set("Cookie", adminSessionCookie);

      expect(unpublishRes.status).toBe(200);
      expect(unpublishRes.body.data.status).toBe("DRAFT");

      // Verify product is immediately removed from public storefront
      const publicCheck = await request(app).get(`/api/v1/products/${unpublishRes.body.data.slug}`);
      expect(publicCheck.status).toBe(404);
    });

    it("archives product cleanly", async () => {
      expect(testProductId).toBeDefined();

      const archiveRes = await request(app)
        .patch(`/api/v1/admin/products/${testProductId}/archive`)
        .set("Cookie", adminSessionCookie);

      expect(archiveRes.status).toBe(200);
      expect(archiveRes.body.data.status).toBe("ARCHIVED");
    });
  });
});
