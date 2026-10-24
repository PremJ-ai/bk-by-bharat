import crypto from "node:crypto";
import { prisma } from "../../db/prisma.js";
import { logger } from "../../lib/logger.js";

export class WhatsAppService {
  /**
   * Log and dispatch an outbound WhatsApp message
   */
  async sendOutboundMessage(options: {
    orderId?: string;
    recipientPhone: string;
    templateName: string;
    bodyText: string;
  }) {
    const { orderId, recipientPhone, templateName, bodyText } = options;
    const providerMessageId = `wam-${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;

    const message = await prisma.whatsAppMessage.create({
      data: {
        orderId: orderId || null,
        providerMessageId,
        direction: "OUTBOUND",
        recipientPhone,
        templateName,
        bodyText,
        status: "SENT",
      },
    });

    logger.info(
      { orderId, recipientPhone, templateName, messageId: message.id },
      "WhatsApp outbound message dispatched"
    );

    return message;
  }

  /**
   * Handle inbound message webhook (e.g. customer payment proof reference or query)
   */
  async handleInboundMessage(options: {
    senderPhone: string;
    messageText: string;
    providerMessageId?: string;
  }) {
    const { senderPhone, messageText } = options;
    const providerMessageId =
      options.providerMessageId || `wam-in-${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;

    // Deduplication check
    const existing = await prisma.whatsAppMessage.findUnique({
      where: { providerMessageId },
    });
    if (existing) {
      return { duplicate: true, messageId: existing.id };
    }

    // Try to associate with latest active order for this phone
    const latestOrder = await prisma.order.findFirst({
      where: { whatsappNumber: senderPhone },
      orderBy: { createdAt: "desc" },
    });

    const message = await prisma.whatsAppMessage.create({
      data: {
        orderId: latestOrder?.id || null,
        providerMessageId,
        direction: "INBOUND",
        recipientPhone: senderPhone,
        bodyText: messageText,
        status: "DELIVERED",
      },
    });

    logger.info(
      { orderId: latestOrder?.id, senderPhone, messageId: message.id },
      "WhatsApp inbound message received and recorded"
    );

    return { duplicate: false, messageId: message.id, orderId: latestOrder?.id };
  }

  /**
   * Helper templates
   */
  async notifyOrderReceived(order: {
    id: string;
    orderNumber: string;
    customerName: string;
    whatsappNumber: string;
    subtotalPaise: number;
    rawToken: string;
  }) {
    const amountInr = (order.subtotalPaise / 100).toLocaleString("en-IN");
    const statusUrl = `http://localhost:3000/order-status/${order.rawToken}`;

    const text =
      `Namaste ${order.customerName},\n\n` +
      `Thank you for placing your bespoke order with Bharat Atelier.\n\n` +
      `Order Ref: ${order.orderNumber}\n` +
      `Estimated Subtotal: ₹${amountInr}\n\n` +
      `Our master tailors are reviewing your piece. We will dispatch your final verified invoice and QR payment instructions momentarily.\n\n` +
      `Track your order at any time: ${statusUrl}`;

    return this.sendOutboundMessage({
      orderId: order.id,
      recipientPhone: order.whatsappNumber,
      templateName: "order_received",
      bodyText: text,
    });
  }

  async notifyInvoiceReady(order: {
    id: string;
    orderNumber: string;
    customerName: string;
    whatsappNumber: string;
    totalPaise: number;
    upiId: string;
    payeeName: string;
    paymentInstructions: string;
    rawToken: string;
    expiresAt?: Date | null;
  }) {
    const amountInr = (order.totalPaise / 100).toLocaleString("en-IN");
    const statusUrl = `http://localhost:3000/order-status/${order.rawToken}`;
    const expiresText = order.expiresAt
      ? `\nPayment reservation held until: ${new Date(order.expiresAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
      : "";

    const text =
      `Namaste ${order.customerName},\n\n` +
      `Your bespoke invoice for Order ${order.orderNumber} is ready.\n\n` +
      `Final Payable Amount: ₹${amountInr}${expiresText}\n\n` +
      `Payment Instructions:\n` +
      `• UPI ID: ${order.upiId}\n` +
      `• Payee: ${order.payeeName}\n` +
      `• Note: Please include "${order.orderNumber}" in your UPI remarks.\n\n` +
      `View interactive QR code and upload payment screenshot: ${statusUrl}`;

    return this.sendOutboundMessage({
      orderId: order.id,
      recipientPhone: order.whatsappNumber,
      templateName: "invoice_ready",
      bodyText: text,
    });
  }

  async notifyPaymentProofReceived(order: {
    id: string;
    orderNumber: string;
    customerName: string;
    whatsappNumber: string;
  }) {
    const text =
      `Namaste ${order.customerName},\n\n` +
      `We have received your payment proof for Order ${order.orderNumber}.\n\n` +
      `Our accounting desk is independently verifying the transaction reference against our bank settlement ledger. You will receive an immediate update once confirmed.`;

    return this.sendOutboundMessage({
      orderId: order.id,
      recipientPhone: order.whatsappNumber,
      templateName: "payment_proof_received",
      bodyText: text,
    });
  }

  async notifyPaymentVerified(order: {
    id: string;
    orderNumber: string;
    customerName: string;
    whatsappNumber: string;
    rawToken?: string;
  }) {
    const statusUrl = order.rawToken
      ? `\nTrack tailoring progress: http://localhost:3000/order-status/${order.rawToken}`
      : "";

    const text =
      `Namaste ${order.customerName},\n\n` +
      `Payment confirmed for Order ${order.orderNumber}!\n\n` +
      `Your garment is now officially scheduled in our workshop for cutting and hand finishing. We will notify you as soon as your heirloom piece is dispatched.${statusUrl}`;

    return this.sendOutboundMessage({
      orderId: order.id,
      recipientPhone: order.whatsappNumber,
      templateName: "payment_verified",
      bodyText: text,
    });
  }

  async notifyOrderShipped(order: {
    id: string;
    orderNumber: string;
    customerName: string;
    whatsappNumber: string;
    carrier: string;
    trackingNumber: string;
    trackingUrl?: string | null;
  }) {
    const trackingInfo = order.trackingUrl
      ? `\nTrack shipment: ${order.trackingUrl}`
      : `\nTracking No: ${order.trackingNumber}`;

    const text =
      `Namaste ${order.customerName},\n\n` +
      `Your Atelier order ${order.orderNumber} has been hand-inspected, packed, and dispatched.\n\n` +
      `Courier: ${order.carrier}${trackingInfo}\n\n` +
      `Thank you for celebrating Indian textile craftsmanship with us.`;

    return this.sendOutboundMessage({
      orderId: order.id,
      recipientPhone: order.whatsappNumber,
      templateName: "order_shipped",
      bodyText: text,
    });
  }
}
