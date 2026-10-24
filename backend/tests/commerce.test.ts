import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";
import argon2 from "argon2";

const app = createApp();

describe("Milestone 6: Guest Commerce, Invoicing, QR & WhatsApp Workflow", () => {
  let adminCookie: string;
  let testVariantId: string;
  let testVariantSku: string;
  let testProductId: string;
  let guestToken: string;
  let orderNumber: string;
  let orderId: string;

  beforeAll(async () => {
    // 1. Create dedicated admin
    await prisma.adminUser.deleteMany({
      where: { username: "commerce_admin_test" },
    });

    const passwordHash = await argon2.hash("CommerceAdminPass123!");
    await prisma.adminUser.create({
      data: {
        username: "commerce_admin_test",
        passwordHash,
        role: "ADMIN",
        status: "ACTIVE",
      },
    });

    // 2. Login
    const loginRes = await request(app)
      .post("/api/v1/admin-auth/login")
      .send({
        username: "commerce_admin_test",
        password: "CommerceAdminPass123!",
      });

    expect(loginRes.status).toBe(200);
    const cookies = loginRes.headers["set-cookie"];
    adminCookie = Array.isArray(cookies) ? cookies.join("; ") : cookies;

    // 3. Create a test category, published product, and variant with 10 stock
    const category =
      (await prisma.category.findFirst({ where: { slug: "shirts" } })) ||
      (await prisma.category.create({
        data: { name: "Shirts", slug: "shirts" },
      }));

    const product = await prisma.product.create({
      data: {
        name: "Test Tailored Camp Shirt",
        slug: `test-tailored-camp-shirt-${Date.now()}`,
        material: "Belgian Linen",
        description: "Test garment for commerce flows",
        pricePaise: 850000, // ₹8,500
        categoryId: category.id,
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });
    testProductId = product.id;

    testVariantSku = `TEST-COMM-${Date.now()}-M`;
    const variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        sku: testVariantSku,
        size: "M",
        colorName: "Oatmeal",
        stock: 10,
        reservedStock: 0,
        isActive: true,
      },
    });
    testVariantId = variant.id;
  });

  afterAll(async () => {
    // Clean up test order and dependencies
    if (orderId) {
      await prisma.whatsAppMessage.deleteMany({ where: { orderId } });
      await prisma.paymentProof.deleteMany({ where: { orderId } });
      await prisma.shipment.deleteMany({ where: { orderId } });
      await prisma.invoice.deleteMany({ where: { orderId } });
      await prisma.cancellationRequest.deleteMany({ where: { orderId } });
      await prisma.orderItem.deleteMany({ where: { orderId } });
      await prisma.order.deleteMany({ where: { id: orderId } });
    }

    if (testProductId) {
      await prisma.productVariant.deleteMany({ where: { productId: testProductId } });
      await prisma.product.deleteMany({ where: { id: testProductId } });
    }

    await prisma.adminUser.deleteMany({
      where: { username: "commerce_admin_test" },
    });
  });

  // ---------------------------------------------------------------------------
  // 1. Guest Checkout Flow
  // ---------------------------------------------------------------------------
  it("rejects guest checkout without WhatsApp consent", async () => {
    const res = await request(app)
      .post("/api/v1/orders/checkout")
      .send({
        customerName: "Aarav Sharma",
        whatsappNumber: "+919876543210",
        addressLine1: "42 Lodhi Estate",
        city: "New Delhi",
        stateRegion: "Delhi",
        postalCode: "110003",
        whatsappConsent: false,
        items: [{ variantId: testVariantId, quantity: 1 }],
      });

    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body.error)).toContain("WhatsApp");
  });

  it("rejects guest checkout with invalid WhatsApp number format", async () => {
    const res = await request(app)
      .post("/api/v1/orders/checkout")
      .send({
        customerName: "Aarav Sharma",
        whatsappNumber: "invalid-phone",
        addressLine1: "42 Lodhi Estate",
        city: "New Delhi",
        stateRegion: "Delhi",
        postalCode: "110003",
        whatsappConsent: true,
        items: [{ variantId: testVariantId, quantity: 1 }],
      });

    expect(res.status).toBe(400);
  });

  it("successfully creates a guest order in AWAITING_ADMIN_REVIEW with opaque token", async () => {
    const res = await request(app)
      .post("/api/v1/orders/checkout")
      .send({
        customerName: "Aarav Sharma",
        whatsappNumber: "+919876543210",
        email: "aarav@atelier.example",
        addressLine1: "42 Lodhi Estate",
        addressLine2: "Apartment 4B",
        city: "New Delhi",
        stateRegion: "Delhi",
        postalCode: "110003",
        country: "India",
        deliveryNotes: "Deliver during atelier daylight hours",
        whatsappConsent: true,
        items: [{ variantId: testVariantId, quantity: 2 }],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.orderNumber).toMatch(/^ORD-2026-\d+$/);
    expect(res.body.data.guestStatusToken).toBeDefined();
    expect(res.body.data.status).toBe("AWAITING_ADMIN_REVIEW");
    expect(res.body.data.subtotalPaise).toBe(1700000); // 2 * 850000

    guestToken = res.body.data.guestStatusToken;
    orderNumber = res.body.data.orderNumber;

    // Verify order in database
    const dbOrder = await prisma.order.findUnique({
      where: { orderNumber },
      include: { items: true },
    });
    expect(dbOrder).toBeDefined();
    orderId = dbOrder!.id;
    expect(dbOrder?.customerName).toBe("Aarav Sharma");
    expect(dbOrder?.items).toHaveLength(1);
    expect(dbOrder?.items[0].quantity).toBe(2);

    // Verify outbound WhatsApp confirmation was logged
    const wam = await prisma.whatsAppMessage.findFirst({
      where: { orderId: dbOrder!.id, templateName: "order_received" },
    });
    expect(wam).toBeDefined();
    expect(wam?.bodyText).toContain(orderNumber);
  });

  // ---------------------------------------------------------------------------
  // 2. Private Status & Opaque Token
  // ---------------------------------------------------------------------------
  it("allows guest to retrieve status with valid opaque token", async () => {
    const res = await request(app)
      .get(`/api/v1/orders/status?token=${guestToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.orderNumber).toBe(orderNumber);
    expect(res.body.data.status).toBe("AWAITING_ADMIN_REVIEW");
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.paymentDetails).toBeDefined();
    expect(res.body.data.paymentDetails.upiId).toBe("atelier@bharat.upi");
  });

  it("rejects guest status retrieval with an invalid token", async () => {
    const res = await request(app)
      .get("/api/v1/orders/status?token=00000000000000000000000000000000");

    expect(res.status).toBe(404);
  });

  // ---------------------------------------------------------------------------
  // 3. Admin Invoicing & Stock Reservation
  // ---------------------------------------------------------------------------
  it("allows admin to issue a final verified invoice and atomically reserve stock", async () => {
    const res = await request(app)
      .post(`/api/v1/admin/orders/${orderId}/invoice`)
      .set("Cookie", adminCookie)
      .send({
        shippingPaise: 0, // Complimentary
        taxPaise: 85000,  // ₹850 GST
        discountPaise: 50000, // ₹500 First order courtesy
        paymentHoldHours: 24,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.invoice).toBeDefined();
    expect(res.body.data.invoice.invoiceNumber).toMatch(/^INV-2026-/);
    expect(res.body.data.updatedOrder.status).toBe("AWAITING_CUSTOMER_PAYMENT");
    expect(res.body.data.updatedOrder.totalPaise).toBe(1735000); // 1700000 + 85000 - 50000

    // Verify stock reservation on variant
    const variantAfter = await prisma.productVariant.findUnique({
      where: { id: testVariantId },
    });
    expect(variantAfter?.reservedStock).toBe(2);
    expect(variantAfter?.stock).toBe(10); // Original stock unchanged until verified paid
  });

  // ---------------------------------------------------------------------------
  // 4. Payment Proof Submission
  // ---------------------------------------------------------------------------
  it("allows guest to upload payment proof screenshot and UTR reference", async () => {
    const pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

    const res = await request(app)
      .post("/api/v1/orders/payment-proof")
      .send({
        token: guestToken,
        fileBase64: pngBase64,
        mimeType: "image/png",
        transactionReference: "UPI/324198274192/Paytm",
        notes: "Paid via Paytm UPI",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("PENDING_REVIEW");
    expect(res.body.data.transactionReference).toBe("UPI/324198274192/Paytm");

    // CRITICAL: Proof upload must NEVER mark the order PAID!
    const dbOrder = await prisma.order.findUnique({ where: { id: orderId } });
    expect(dbOrder?.status).toBe("PAYMENT_PROOF_RECEIVED");
    expect(dbOrder?.status).not.toBe("PAID");
  });

  // ---------------------------------------------------------------------------
  // 5. Payment Verification & Stock Decrement
  // ---------------------------------------------------------------------------
  it("allows admin to verify payment against bank ledger, permanently decrementing stock", async () => {
    const res = await request(app)
      .post(`/api/v1/admin/orders/${orderId}/verify-payment`)
      .set("Cookie", adminCookie)
      .send({
        utrReference: "HDFC00012398274192",
        adminNotes: "Settled in HDFC current account",
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("PAID");
    expect(res.body.data.paymentStatus).toBe("VERIFIED");

    // Stock must be permanently decremented: 10 - 2 = 8, reservedStock = 0
    const variantAfter = await prisma.productVariant.findUnique({
      where: { id: testVariantId },
    });
    expect(variantAfter?.stock).toBe(8);
    expect(variantAfter?.reservedStock).toBe(0);

    // Verify payment proof record status
    const proof = await prisma.paymentProof.findFirst({
      where: { orderId },
    });
    expect(proof?.status).toBe("VERIFIED");
  });

  // ---------------------------------------------------------------------------
  // 6. Shipment Dispatch
  // ---------------------------------------------------------------------------
  it("allows admin to dispatch shipment and notify guest with tracking details", async () => {
    const res = await request(app)
      .post(`/api/v1/admin/orders/${orderId}/ship`)
      .set("Cookie", adminCookie)
      .send({
        carrier: "Blue Dart Express",
        trackingNumber: "BD982741928IN",
        trackingUrl: "https://www.bluedart.com/tracking?awb=BD982741928IN",
        notes: "Fragile luxury garment packaging",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.carrier).toBe("Blue Dart Express");
    expect(res.body.data.trackingNumber).toBe("BD982741928IN");

    const dbOrder = await prisma.order.findUnique({ where: { id: orderId } });
    expect(dbOrder?.status).toBe("SHIPPED");
    expect(dbOrder?.fulfillmentStatus).toBe("SHIPPED");

    // Verify WhatsApp shipment dispatch message
    const wam = await prisma.whatsAppMessage.findFirst({
      where: { orderId, templateName: "order_shipped" },
    });
    expect(wam).toBeDefined();
    expect(wam?.bodyText).toContain("Blue Dart Express");
  });

  // ---------------------------------------------------------------------------
  // 7. Cancellation & Reserved Stock Release
  // ---------------------------------------------------------------------------
  it("releases reserved stock when an unpaid order is cancelled by guest", async () => {
    // 1. Create a second order
    const checkoutRes = await request(app)
      .post("/api/v1/orders/checkout")
      .send({
        customerName: "Rohan Varma",
        whatsappNumber: "+919123456789",
        addressLine1: "12 Bandra West",
        city: "Mumbai",
        stateRegion: "Maharashtra",
        postalCode: "400050",
        whatsappConsent: true,
        items: [{ variantId: testVariantId, quantity: 1 }],
      });

    expect(checkoutRes.status).toBe(201);
    const cancelToken = checkoutRes.body.data.guestStatusToken;
    const cancelOrderId = (await prisma.order.findUnique({
      where: { orderNumber: checkoutRes.body.data.orderNumber },
    }))!.id;

    // 2. Admin issues invoice, putting it into AWAITING_CUSTOMER_PAYMENT with reservedStock = 1
    await request(app)
      .post(`/api/v1/admin/orders/${cancelOrderId}/invoice`)
      .set("Cookie", adminCookie)
      .send({ shippingPaise: 0 });

    const variantHolding = await prisma.productVariant.findUnique({
      where: { id: testVariantId },
    });
    expect(variantHolding?.reservedStock).toBe(1);

    // 3. Guest cancels
    const cancelRes = await request(app)
      .post("/api/v1/orders/cancel")
      .send({
        token: cancelToken,
        reason: "Changed sizing preference",
      });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.status).toBe("CANCELLED");

    // 4. Reserved stock must be released!
    const variantReleased = await prisma.productVariant.findUnique({
      where: { id: testVariantId },
    });
    expect(variantReleased?.reservedStock).toBe(0);

    // Clean up second order
    await prisma.invoice.deleteMany({ where: { orderId: cancelOrderId } });
    await prisma.cancellationRequest.deleteMany({ where: { orderId: cancelOrderId } });
    await prisma.orderItem.deleteMany({ where: { orderId: cancelOrderId } });
    await prisma.order.deleteMany({ where: { id: cancelOrderId } });
  });
});
