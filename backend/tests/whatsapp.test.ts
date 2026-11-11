import crypto from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../src/db/prisma.js";
import { WhatsAppService } from "../src/modules/whatsapp/whatsapp.service.js";

const whatsappService = new WhatsAppService();

describe("WhatsApp inbound webhook command handling", () => {
  const orderNumber = `ORD-WA-NORMALIZE-${Date.now()}`;
  const legacyPhone = "919876543212";
  const providerMessageId = `wam-regression-${crypto.randomUUID()}`;
  let orderId: string;

  beforeAll(async () => {
    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerName: "WhatsApp Regression Customer",
        whatsappNumber: legacyPhone,
        addressLine1: "1 Test Lane",
        city: "Bikaner",
        stateRegion: "Rajasthan",
        postalCode: "334001",
        country: "India",
        whatsappConsent: true,
        whatsappConsentAt: new Date(),
        guestTokenHash: crypto.createHash("sha256").update(crypto.randomUUID()).digest("hex"),
        subtotalPaise: 10000,
        totalPaise: 10000,
        status: "AWAITING_ADMIN_REVIEW",
      },
    });
    orderId = order.id;
  });

  afterAll(async () => {
    if (orderId) {
      await prisma.whatsAppMessage.deleteMany({ where: { orderId } });
      await prisma.cancellationRequest.deleteMany({ where: { orderId } });
      await prisma.orderItem.deleteMany({ where: { orderId } });
      await prisma.order.deleteMany({ where: { id: orderId } });
    }
  });

  it("matches a Meta +country-code sender to a legacy unprefixed checkout phone and processes CANCEL", async () => {
    const result = await whatsappService.handleInboundMessage({
      senderPhone: "+919876543212",
      messageText: `CANCEL ${orderNumber} Customer changed plans`,
      providerMessageId,
    });

    expect(result).toMatchObject({ duplicate: false, orderId });
    const updatedOrder = await prisma.order.findUnique({ where: { id: orderId } });
    expect(updatedOrder?.status).toBe("CANCELLED");

    const cancellation = await prisma.cancellationRequest.findFirst({ where: { orderId } });
    expect(cancellation).toMatchObject({
      orderId,
      source: "WHATSAPP",
      status: "APPROVED",
      reason: "Customer changed plans",
    });
  });

  it("deduplicates provider webhook retries without applying a second cancellation", async () => {
    const duplicate = await whatsappService.handleInboundMessage({
      senderPhone: "+919876543212",
      messageText: `CANCEL ${orderNumber} Customer changed plans`,
      providerMessageId,
    });

    expect(duplicate).toMatchObject({ duplicate: true });
    expect(await prisma.cancellationRequest.count({ where: { orderId } })).toBe(1);
    expect(await prisma.whatsAppMessage.count({
      where: { orderId, providerMessageId },
    })).toBe(1);
  });

  it("validates Meta webhook HMAC signatures and rejects tampering", () => {
    const previousSecret = process.env.WHATSAPP_APP_SECRET;
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    process.env.WHATSAPP_APP_SECRET = "webhook-signing-test-secret";
    try {
      const rawBody = Buffer.from('{"entry":[{"id":"test"}]}');
      const signature = "sha256=" + crypto
        .createHmac("sha256", process.env.WHATSAPP_APP_SECRET)
        .update(rawBody)
        .digest("hex");

      expect(whatsappService.verifyWebhookSignature(rawBody, signature)).toBe(true);
      expect(whatsappService.verifyWebhookSignature(Buffer.from(rawBody.toString() + " "), signature)).toBe(false);
      expect(whatsappService.verifyWebhookSignature(rawBody, "sha256=bad")).toBe(false);
    } finally {
      if (previousSecret === undefined) delete process.env.WHATSAPP_APP_SECRET;
      else process.env.WHATSAPP_APP_SECRET = previousSecret;
      if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousNodeEnv;
    }
  });
});
