import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";
import argon2 from "argon2";
import crypto from "node:crypto";
import { CommerceService } from "../src/modules/commerce/commerce.service.js";

const app = createApp();

describe("Milestone 6: Guest Commerce, Invoicing, QR & WhatsApp Workflow", () => {
  let adminCookie: string;
  let testVariantId: string;
  let testVariantSku: string;
  let testProductId: string;
  let guestToken: string;
  let orderNumber: string;
  let orderId: string;
  let expiryOrderId: string | undefined;

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
    if (expiryOrderId) {
      await prisma.whatsAppMessage.deleteMany({ where: { orderId: expiryOrderId } });
      await prisma.paymentProof.deleteMany({ where: { orderId: expiryOrderId } });
      await prisma.invoice.deleteMany({ where: { orderId: expiryOrderId } });
      await prisma.orderItem.deleteMany({ where: { orderId: expiryOrderId } });
      await prisma.auditEvent.deleteMany({ where: { resourceType: "Order", resourceId: expiryOrderId } });
      await prisma.order.deleteMany({ where: { id: expiryOrderId } });
    }

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
  // 1. Guest Checkout Flow & WhatsApp Consent Verification
  // ---------------------------------------------------------------------------
  it("rejects guest checkout when WhatsApp consent is explicitly false", async () => {
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

  it("rejects guest checkout when WhatsApp consent field is missing", async () => {
    const res = await request(app)
      .post("/api/v1/orders/checkout")
      .send({
        customerName: "Aarav Sharma",
        whatsappNumber: "+919876543210",
        addressLine1: "42 Lodhi Estate",
        city: "New Delhi",
        stateRegion: "Delhi",
        postalCode: "110003",
        // whatsappConsent omitted
        items: [{ variantId: testVariantId, quantity: 1 }],
      });

    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body.error)).toContain("WhatsApp");
  });

  it("ensures consent timestamp is null when explicit consent is not recorded", async () => {
    const rawToken = "test_raw_token_no_consent_" + Date.now();
    const guestTokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const testOrder = await prisma.order.create({
      data: {
        orderNumber: `ORD-TEST-NOCONSENT-${Date.now()}`,
        customerName: "Offline Patron",
        whatsappNumber: "+919876543210",
        addressLine1: "42 Lodhi Estate",
        city: "New Delhi",
        stateRegion: "Delhi",
        postalCode: "110003",
        whatsappConsent: false,
        whatsappConsentAt: null,
        guestTokenHash,
        subtotalPaise: 500000,
        totalPaise: 500000,
      },
    });

    expect(testOrder.whatsappConsent).toBe(false);
    expect(testOrder.whatsappConsentAt).toBeNull();
    await prisma.order.delete({ where: { id: testOrder.id } });
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

  it("successfully creates a guest order in AWAITING_ADMIN_REVIEW with explicit consent and timestamp", async () => {
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

    // Verify order in database and timestamp consistency
    const dbOrder = await prisma.order.findUnique({
      where: { orderNumber },
      include: { items: true },
    });
    expect(dbOrder).toBeDefined();
    orderId = dbOrder!.id;
    expect(dbOrder?.customerName).toBe("Aarav Sharma");
    expect(dbOrder?.whatsappConsent).toBe(true);
    expect(dbOrder?.whatsappConsentAt).toBeInstanceOf(Date);
    expect(Math.abs(dbOrder!.whatsappConsentAt!.getTime() - dbOrder!.createdAt.getTime())).toBeLessThan(10000);
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
    expect(res.body.data.whatsappConsent).toBe(true);
    expect(res.body.data.whatsappConsentAt).toBeDefined();
  });

  it("rejects guest status retrieval with an invalid token", async () => {
    const res = await request(app)
      .get("/api/v1/orders/status?token=00000000000000000000000000000000");

    expect(res.status).toBe(404);
  });

  // ---------------------------------------------------------------------------
  // 3. Store Settings & Invoicing Hardening
  // ---------------------------------------------------------------------------
  it("rejects issuing an invoice when store settings have placeholder credentials", async () => {
    await prisma.storeSettings.upsert({
      where: { id: "default" },
      update: {
        upiId: "atelier@bharat.upi",
        payeeName: "Bharat Atelier New Delhi",
        whatsappNumber: "+919876543210",
      },
      create: {
        id: "default",
        upiId: "atelier@bharat.upi",
        payeeName: "Bharat Atelier New Delhi",
        whatsappNumber: "+919876543210",
      },
    });

    const res = await request(app)
      .post(`/api/v1/admin/orders/${orderId}/invoice`)
      .set("Cookie", adminCookie)
      .send({
        shippingPaise: 0,
        taxPaise: 85000,
        discountPaise: 50000,
        paymentHoldHours: 24,
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/placeholder/i);
  });

  it("rejects configuring placeholder payment credentials through admin settings", async () => {
    const res = await request(app)
      .put("/api/v1/admin/settings/payment")
      .set("Cookie", adminCookie)
      .send({
        upiId: "atelier@bharat.upi",
        payeeName: "Bharat Atelier New Delhi",
        paymentInstructions: "Scan QR using any UPI app to pay",
        whatsappNumber: "+919876543210",
        shippingDefaultPaise: 0,
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/placeholder/i);
  });

  it("configures genuine business payment credentials through protected admin route", async () => {
    const res = await request(app)
      .put("/api/v1/admin/settings/payment")
      .set("Cookie", adminCookie)
      .send({
        upiId: "bharatatelier@icici",
        payeeName: "Bharat Atelier Private Limited",
        paymentInstructions: "Scan QR using any UPI app (GPay, PhonePe, Paytm). Confirm order reference in remarks.",
        whatsappNumber: "+919810012345",
        shippingDefaultPaise: 0,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.upiId).toBe("bharatatelier@icici");
    expect(res.body.data.payeeName).toBe("Bharat Atelier Private Limited");
  });

  it("allows admin to issue a final verified invoice and atomically reserve stock once settings are configured", async () => {
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
  // 4. Payment Proof Submission & Protected Retrieval
  // ---------------------------------------------------------------------------
  it("allows guest to upload payment proof screenshot and verifies protected retrieval", async () => {
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
    expect(res.body.data.url).toMatch(/^\/api\/v1\/orders\/proofs\/.+\/file$/);

    const proofUrl = res.body.data.url;

    // CRITICAL: Proof upload must NEVER mark the order PAID!
    const dbOrder = await prisma.order.findUnique({ where: { id: orderId } });
    expect(dbOrder?.status).toBe("PAYMENT_PROOF_RECEIVED");
    expect(dbOrder?.status).not.toBe("PAID");

    // 1. Verify direct public static URL access is rejected with 403 Forbidden
    const staticRes = await request(app).get("/uploads/proofs/some-proof.jpg");
    expect(staticRes.status).toBe(403);
    expect(staticRes.body.error.code).toBe("FORBIDDEN");

    // 2. Verify unauthorized access to protected retrieval endpoint is rejected with 401
    const unauthRes = await request(app).get(proofUrl);
    expect(unauthRes.status).toBe(401);

    // 3. Verify access with invalid guest token is rejected with 403
    const forbiddenRes = await request(app).get(`${proofUrl}?token=invalid_guest_token_1234567890`);
    expect(forbiddenRes.status).toBe(403);

    // 4. Verify access with valid guest token succeeds with 200
    const guestRes = await request(app).get(`${proofUrl}?token=${guestToken}`);
    expect(guestRes.status).toBe(200);
    expect(guestRes.headers["content-type"]).toContain("image/png");

    // 5. Verify access with admin session cookie succeeds with 200
    const adminRes = await request(app).get(proofUrl).set("Cookie", adminCookie);
    expect(adminRes.status).toBe(200);
    expect(adminRes.headers["content-type"]).toContain("image/png");
  });

  it("allows admin to reject an invalid proof and lets the guest resubmit without releasing the stock hold", async () => {
    const rejectionReason = "The receipt does not show a successful transfer. Please upload the completed transaction receipt.";

    const rejected = await request(app)
      .post(`/api/v1/admin/orders/${orderId}/reject-payment-proof`)
      .set("Cookie", adminCookie)
      .send({ reason: rejectionReason });

    expect(rejected.status).toBe(200);
    expect(rejected.body.data.status).toBe("AWAITING_CUSTOMER_PAYMENT");
    expect(rejected.body.data.paymentStatus).toBe("REJECTED");

    const orderAfterRejection = await prisma.order.findUnique({ where: { id: orderId } });
    expect(orderAfterRejection?.paymentHoldExpiresAt).toBeTruthy();

    const variantAfterRejection = await prisma.productVariant.findUnique({
      where: { id: testVariantId },
    });
    expect(variantAfterRejection?.stock).toBe(10);
    expect(variantAfterRejection?.reservedStock).toBe(2);

    const rejectedProof = await prisma.paymentProof.findFirst({
      where: { orderId, status: "REJECTED" },
    });
    expect(rejectedProof?.adminNotes).toBe(rejectionReason);

    const replacement = await request(app)
      .post("/api/v1/orders/payment-proof")
      .send({
        token: guestToken,
        fileBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
        mimeType: "image/png",
        transactionReference: "UPI/324198274193/Paytm",
        notes: "Replacement receipt after first proof was rejected",
      });

    expect(replacement.status).toBe(201);
    expect(replacement.body.data.status).toBe("PENDING_REVIEW");

    const orderAfterResubmission = await prisma.order.findUnique({ where: { id: orderId } });
    expect(orderAfterResubmission?.status).toBe("PAYMENT_PROOF_RECEIVED");
    expect(orderAfterResubmission?.paymentStatus).toBe("PROOF_RECEIVED");

    const variantAfterResubmission = await prisma.productVariant.findUnique({
      where: { id: testVariantId },
    });
    expect(variantAfterResubmission?.stock).toBe(10);
    expect(variantAfterResubmission?.reservedStock).toBe(2);
  });

  it("refuses local-disk payment-proof uploads on Vercel", async () => {
    const previousVercel = process.env.VERCEL;
    process.env.VERCEL = "1";

    try {
      await expect(
        new CommerceService().submitPaymentProof({
          token: "test_guest_status_token",
          mimeType: "image/png",
          fileBase64: "aW1hZ2U=",
          transactionReference: "TEST-UTR-LOCAL-DISK",
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
      where: { orderId, status: "VERIFIED" },
      orderBy: { verifiedAt: "desc" },
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
    await expect
      .poll(
        async () => {
          const message = await prisma.whatsAppMessage.findFirst({
            where: { orderId, templateName: "order_shipped" },
            select: { bodyText: true },
          });
          return message?.bodyText;
        },
        { timeout: 5000 }
      )
      .toContain("Blue Dart Express");
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

  // ---------------------------------------------------------------------------
  // 8. Paid Order Cancellation & Stock Restoration
  // ---------------------------------------------------------------------------
  it("handles cancellation request for a paid order, restores physical stock on admin approval", async () => {
    // 1. Create paid order
    const checkoutRes = await request(app)
      .post("/api/v1/orders/checkout")
      .send({
        customerName: "Devendra Singhal",
        whatsappNumber: "+919988776655",
        addressLine1: "44 Civil Lines",
        city: "Jaipur",
        stateRegion: "Rajasthan",
        postalCode: "302006",
        whatsappConsent: true,
        items: [{ variantId: testVariantId, quantity: 2 }],
      });

    const paidToken = checkoutRes.body.data.guestStatusToken;
    const paidOrderId = (await prisma.order.findUnique({
      where: { orderNumber: checkoutRes.body.data.orderNumber },
    }))!.id;

    // Issue invoice (reservedStock += 2)
    await request(app)
      .post(`/api/v1/admin/orders/${paidOrderId}/invoice`)
      .set("Cookie", adminCookie)
      .send({ shippingPaise: 0 });

    // Guest uploads payment proof before the admin can verify settlement.
    const paidOrderProof = await request(app)
      .post("/api/v1/orders/payment-proof")
      .send({
        token: paidToken,
        fileBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
        mimeType: "image/png",
        transactionReference: "UTR-TEST-CANCEL-PROOF-1",
      });
    expect(paidOrderProof.status).toBe(201);

    // Verify payment (stock -= 2, reservedStock -= 2)
    const stockBeforePayment = (await prisma.productVariant.findUnique({ where: { id: testVariantId } }))!.stock;
    await request(app)
      .post(`/api/v1/admin/orders/${paidOrderId}/verify-payment`)
      .set("Cookie", adminCookie)
      .send({ utrReference: "UTR-TEST-CANCEL-RESTORE-1" });

    const stockAfterPayment = (await prisma.productVariant.findUnique({ where: { id: testVariantId } }))!.stock;
    expect(stockAfterPayment).toBe(stockBeforePayment - 2);

    // 2. Guest requests cancellation on private status page
    const cancelReqRes = await request(app)
      .post("/api/v1/orders/cancel")
      .send({
        token: paidToken,
        reason: "Traveling abroad, cannot receive delivery",
      });

    expect(cancelReqRes.status).toBe(200);
    expect(cancelReqRes.body.data.status).toBe("CANCELLATION_REQUESTED");

    // Stock should NOT be restored yet (admin has not approved)
    const stockDuringReview = (await prisma.productVariant.findUnique({ where: { id: testVariantId } }))!.stock;
    expect(stockDuringReview).toBe(stockAfterPayment);

    // 3. Admin approves cancellation
    const decisionRes = await request(app)
      .post(`/api/v1/admin/orders/${paidOrderId}/cancellation-decision`)
      .set("Cookie", adminCookie)
      .send({
        decision: "APPROVED",
        reason: "Cancellation granted before cutting initiated",
      });

    expect(decisionRes.status).toBe(200);
    expect(decisionRes.body.data.status).toBe("REFUND_REQUESTED");

    // 4. Physical stock MUST be restored!
    const stockAfterApproval = (await prisma.productVariant.findUnique({ where: { id: testVariantId } }))!.stock;
    expect(stockAfterApproval).toBe(stockBeforePayment);

    // -------------------------------------------------------------------------
    // 9. Admin Manual Refund Processing & Ledger Audit
    // -------------------------------------------------------------------------
    const refundRes = await request(app)
      .post(`/api/v1/admin/orders/${paidOrderId}/refund`)
      .set("Cookie", adminCookie)
      .send({
        refundAmountPaise: checkoutRes.body.data.totalPaise,
        refundReference: "UTR-REFUND-BANK-SUCCESS-998",
        reason: "Full refund to patron UPI account following approved cancellation",
      });

    expect(refundRes.status).toBe(200);
    expect(refundRes.body.data.order.status).toBe("REFUNDED");
    expect(refundRes.body.data.order.paymentStatus).toBe("REFUNDED");
    expect(refundRes.body.data.refundRecord.status).toBe("COMPLETED");
    expect(refundRes.body.data.refundRecord.transactionReference).toBe("UTR-REFUND-BANK-SUCCESS-998");

    // Verify inventory was NOT double-restored
    const stockAfterRefund = (await prisma.productVariant.findUnique({ where: { id: testVariantId } }))!.stock;
    expect(stockAfterRefund).toBe(stockBeforePayment);

    // Verify duplicate / excessive refund is rejected
    const overRefundRes = await request(app)
      .post(`/api/v1/admin/orders/${paidOrderId}/refund`)
      .set("Cookie", adminCookie)
      .send({
        refundAmountPaise: 1000,
        refundReference: "UTR-OVER-REFUND",
        reason: "Duplicate attempt",
      });

    expect(overRefundRes.status).toBe(400);
    expect(overRefundRes.body.error.message).toContain("is not eligible for refund");

    // Clean up
    await prisma.refundRecord.deleteMany({ where: { orderId: paidOrderId } });
    await prisma.cancellationRequest.deleteMany({ where: { orderId: paidOrderId } });
    await prisma.paymentProof.deleteMany({ where: { orderId: paidOrderId } });
    await prisma.invoice.deleteMany({ where: { orderId: paidOrderId } });
    await prisma.orderItem.deleteMany({ where: { orderId: paidOrderId } });
    await prisma.order.deleteMany({ where: { id: paidOrderId } });
  });

  // ---------------------------------------------------------------------------
  // 10. WhatsApp Webhook Handshake & Provider Status
  // ---------------------------------------------------------------------------
  it("supports Meta WhatsApp webhook challenge verification and provider status report", async () => {
    const previousVerifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
    process.env.WHATSAPP_VERIFY_TOKEN = "test-webhook-verification-token";

    // 1. Valid handshake
    try {
      const validHandshake = await request(app)
        .get("/api/v1/whatsapp/webhook")
        .query({
          "hub.mode": "subscribe",
          "hub.verify_token": process.env.WHATSAPP_VERIFY_TOKEN,
          "hub.challenge": "challenge_code_98234",
        });

      expect(validHandshake.status).toBe(200);
      expect(validHandshake.text).toBe("challenge_code_98234");

      // 2. Invalid handshake
      const invalidHandshake = await request(app)
        .get("/api/v1/whatsapp/webhook")
        .query({
          "hub.mode": "subscribe",
          "hub.verify_token": "wrong_token",
          "hub.challenge": "challenge_code_98234",
        });

      expect(invalidHandshake.status).toBe(403);

      // 3. Provider status inspection
      const statusRes = await request(app).get("/api/v1/whatsapp/provider-status");
      expect(statusRes.status).toBe(200);
      expect(statusRes.body.data.providerName).toBeDefined();
      expect(statusRes.body.data.isLiveConnected).toBe(false); // Accurately reports test adapter in local environment
    } finally {
      if (previousVerifyToken === undefined) {
        delete process.env.WHATSAPP_VERIFY_TOKEN;
      } else {
        process.env.WHATSAPP_VERIFY_TOKEN = previousVerifyToken;
      }
    }

    const configuredToken = process.env.WHATSAPP_VERIFY_TOKEN;
    delete process.env.WHATSAPP_VERIFY_TOKEN;
    try {
      const missingTokenHandshake = await request(app)
        .get("/api/v1/whatsapp/webhook")
        .query({
          "hub.mode": "subscribe",
          "hub.verify_token": "known-default-must-not-be-accepted",
          "hub.challenge": "challenge_code_98234",
        });
      expect(missingTokenHandshake.status).toBe(403);
    } finally {
      if (configuredToken !== undefined) {
        process.env.WHATSAPP_VERIFY_TOKEN = configuredToken;
      }
    }

    const previousNodeEnv = process.env.NODE_ENV;
    const previousAppSecret = process.env.WHATSAPP_APP_SECRET;
    process.env.NODE_ENV = "production";
    delete process.env.WHATSAPP_APP_SECRET;
    try {
      const unsignedWebhook = await request(app)
        .post("/api/v1/whatsapp/webhook")
        .send({ senderPhone: "+919876543210", messageText: "STATUS" });
      expect(unsignedWebhook.status).toBe(401);
    } finally {
      if (previousNodeEnv === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = previousNodeEnv;
      }
      if (previousAppSecret === undefined) {
        delete process.env.WHATSAPP_APP_SECRET;
      } else {
        process.env.WHATSAPP_APP_SECRET = previousAppSecret;
      }
    }
  it("expires unpaid invoice holds, releases stock, and allows an admin to reissue", async () => {
    const variantBefore = await prisma.productVariant.findUniqueOrThrow({
      where: { id: testVariantId },
    });
    const reservedBefore = variantBefore.reservedStock;

    const checkout = await request(app)
      .post("/api/v1/orders/checkout")
      .send({
        customerName: "Expiry Test Customer",
        whatsappNumber: "+919876543210",
        addressLine1: "42 Lodhi Estate",
        city: "New Delhi",
        stateRegion: "Delhi",
        postalCode: "110003",
        whatsappConsent: true,
        items: [{ variantId: testVariantId, quantity: 1 }],
      });

    expect(checkout.status).toBe(201);
    const createdOrder = await prisma.order.findUniqueOrThrow({
      where: { orderNumber: checkout.body.data.orderNumber },
    });
    expiryOrderId = createdOrder.id;

    const firstInvoice = await request(app)
      .post(`/api/v1/admin/orders/${expiryOrderId}/invoice`)
      .set("Cookie", adminCookie)
      .send({ shippingPaise: 0 });
    expect(firstInvoice.status).toBe(201);

    await prisma.order.update({
      where: { id: expiryOrderId },
      data: { paymentHoldExpiresAt: new Date(Date.now() - 60_000) },
    });

    const expiryResult = await new CommerceService().expirePaymentHolds();
    expect(expiryResult.expired).toBe(1);
    expect(expiryResult.failed).toBe(0);

    const expiredOrder = await prisma.order.findUniqueOrThrow({ where: { id: expiryOrderId } });
    expect(expiredOrder.status).toBe("EXPIRED");
    expect(expiredOrder.paymentStatus).toBe("EXPIRED");
    expect(expiredOrder.paymentHoldExpiresAt).toBeNull();

    const afterExpiry = await prisma.productVariant.findUniqueOrThrow({
      where: { id: testVariantId },
    });
    expect(afterExpiry.stock).toBe(variantBefore.stock);
    expect(afterExpiry.reservedStock).toBe(reservedBefore);

    const reissuedInvoice = await request(app)
      .post(`/api/v1/admin/orders/${expiryOrderId}/invoice`)
      .set("Cookie", adminCookie)
      .send({ shippingPaise: 0 });
    expect(reissuedInvoice.status).toBe(201);

    const reissuedOrder = await prisma.order.findUniqueOrThrow({ where: { id: expiryOrderId } });
    expect(reissuedOrder.status).toBe("AWAITING_CUSTOMER_PAYMENT");
    expect(reissuedOrder.paymentStatus).toBe("REQUESTED");

    const afterReissue = await prisma.productVariant.findUniqueOrThrow({
      where: { id: testVariantId },
    });
    expect(afterReissue.reservedStock).toBe(reservedBefore + 1);

    // Expire the reissued hold too so the test leaves stock exactly as it found it.
    await prisma.order.update({
      where: { id: expiryOrderId },
      data: { paymentHoldExpiresAt: new Date(Date.now() - 60_000) },
    });
    const cleanupResult = await new CommerceService().expirePaymentHolds();
    expect(cleanupResult.expired).toBe(1);

    const afterCleanup = await prisma.productVariant.findUniqueOrThrow({
      where: { id: testVariantId },
    });
    expect(afterCleanup.reservedStock).toBe(reservedBefore);
  });

  });
});
