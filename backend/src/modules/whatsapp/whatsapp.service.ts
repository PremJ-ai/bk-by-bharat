import crypto from "node:crypto";
import { prisma } from "../../db/prisma.js";
import { logger } from "../../lib/logger.js";

export interface WhatsAppProvider {
  readonly name: string;
  isLive(): boolean;
  sendMessage(options: {
    recipientPhone: string;
    templateName?: string;
    bodyText: string;
  }): Promise<{ providerMessageId: string; status: "SENT" | "FAILED"; error?: string }>;
}

/**
 * Built-in Atelier Local WhatsApp Test Adapter.
 * Reliably logs and persists all outbound transactional messages in the PostgreSQL ledger
 * without requiring third-party Meta Business Manager credentials in test/offline environments.
 */
export class LocalAtelierWhatsAppProvider implements WhatsAppProvider {
  public readonly name = "local_atelier_mock";

  isLive(): boolean {
    return false;
  }

  async sendMessage(options: {
    recipientPhone: string;
    templateName?: string;
    bodyText: string;
  }): Promise<{ providerMessageId: string; status: "SENT" | "FAILED"; error?: string }> {
    const providerMessageId = `wam-local-${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
    return {
      providerMessageId,
      status: "SENT",
    };
  }
}

/**
 * Production Meta WhatsApp Business Platform Cloud API Provider.
 * Dispatches live templated messages via https://graph.facebook.com/v21.0/{PHONE_ID}/messages.
 */
export class MetaCloudWhatsAppProvider implements WhatsAppProvider {
  public readonly name = "meta_cloud_api";

  isLive(): boolean {
    return Boolean(process.env.META_WHATSAPP_TOKEN && process.env.META_WHATSAPP_PHONE_ID);
  }

  async sendMessage(options: {
    recipientPhone: string;
    templateName?: string;
    bodyText: string;
  }): Promise<{ providerMessageId: string; status: "SENT" | "FAILED"; error?: string }> {
    if (!this.isLive()) {
      logger.warn("Meta WhatsApp Cloud credentials not configured; falling back to simulation");
      return {
        providerMessageId: `wam-sim-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
        status: "SENT",
      };
    }

    try {
      const sanitizedPhone = options.recipientPhone.replace(/[^0-9]/g, "");
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${process.env.META_WHATSAPP_PHONE_ID}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.META_WHATSAPP_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: sanitizedPhone,
            type: "text",
            text: { preview_url: true, body: options.bodyText },
          }),
        }
      );

      const json = (await res.json()) as any;
      if (!res.ok) {
        return {
          providerMessageId: `wam-err-${Date.now()}`,
          status: "FAILED",
          error: json?.error?.message || "Meta Cloud API returned non-200",
        };
      }

      return {
        providerMessageId: json?.messages?.[0]?.id || `wam-meta-${Date.now()}`,
        status: "SENT",
      };
    } catch (err: any) {
      return {
        providerMessageId: `wam-err-${Date.now()}`,
        status: "FAILED",
        error: err.message,
      };
    }
  }
}

export class WhatsAppService {
  private readonly provider: WhatsAppProvider;

  constructor(provider?: WhatsAppProvider) {
    if (provider) {
      this.provider = provider;
    } else if (process.env.META_WHATSAPP_TOKEN && process.env.META_WHATSAPP_PHONE_ID) {
      this.provider = new MetaCloudWhatsAppProvider();
    } else {
      this.provider = new LocalAtelierWhatsAppProvider();
    }
  }

  /**
   * Return active provider description and readiness
   */
  getProviderInfo() {
    return {
      providerName: this.provider.name,
      isLiveConnected: this.provider.isLive(),
      instructions: this.provider.isLive()
        ? "Connected to Meta WhatsApp Cloud API."
        : "Operating via Local Atelier Audit Adapter. Outbound messages are recorded in PostgreSQL and logged.",
    };
  }

  /**
   * Verify HMAC-SHA256 signature for Meta Cloud Webhooks
   */
  verifyWebhookSignature(rawBody: Buffer | string, signatureHeader?: string): boolean {
    const appSecret = process.env.WHATSAPP_APP_SECRET;
    if (!appSecret) {
      return process.env.NODE_ENV !== "production";
    }
    if (!signatureHeader) return false;

    const parts = signatureHeader.split("=");
    if (parts.length !== 2 || parts[0] !== "sha256") return false;

    const expected = crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
    try {
      return crypto.timingSafeEqual(Buffer.from(parts[1], "hex"), Buffer.from(expected, "hex"));
    } catch {
      return false;
    }
  }

  /**
   * Verify Meta webhook subscribe challenge handshake
   */
  verifyWebhookHandshake(mode?: string, token?: string, challenge?: string): string | null {
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
    if (verifyToken && mode === "subscribe" && token === verifyToken && challenge) {
      return challenge;
    }
    return null;
  }

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

    const dispatchResult = await this.provider.sendMessage({
      recipientPhone,
      templateName,
      bodyText,
    });

    const message = await prisma.whatsAppMessage.create({
      data: {
        orderId: orderId || null,
        providerMessageId: dispatchResult.providerMessageId,
        direction: "OUTBOUND",
        recipientPhone,
        templateName,
        bodyText,
        status: dispatchResult.status === "SENT" ? "SENT" : "FAILED",
        errorMessage: dispatchResult.error || null,
      },
    });

    logger.info(
      {
        orderId,
        recipientPhone,
        templateName,
        messageId: message.id,
        provider: this.provider.name,
        live: this.provider.isLive(),
      },
      "WhatsApp outbound message recorded"
    );

    return message;
  }

  /**
   * Handle incoming delivery status update from provider
   */
  async handleDeliveryStatus(options: {
    providerMessageId: string;
    status: "SENT" | "DELIVERED" | "READ" | "FAILED";
    errorMessage?: string;
  }) {
    const { providerMessageId, status, errorMessage } = options;
    const existing = await prisma.whatsAppMessage.findUnique({
      where: { providerMessageId },
    });

    if (!existing) {
      return null;
    }

    return prisma.whatsAppMessage.update({
      where: { id: existing.id },
      data: {
        status,
        errorMessage: errorMessage || existing.errorMessage,
      },
    });
  }

  /**
   * Handle inbound message webhook (from customer, bot, or simulator)
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

    // Attempt association with latest order for this customer
    const latestOrder = await prisma.order.findFirst({
      where: { whatsappNumber: senderPhone },
      orderBy: { createdAt: "desc" },
      include: { items: true },
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

    // Interactive Command Dispatcher
    const trimmed = messageText.trim();
    const upper = trimmed.toUpperCase();

    if (upper.startsWith("CANCEL")) {
      await this.processInboundCancellation(senderPhone, trimmed, latestOrder);
    } else if (upper.startsWith("REFUND")) {
      await this.processInboundRefund(senderPhone, trimmed, latestOrder);
    } else if (upper.startsWith("STATUS")) {
      await this.processInboundStatus(senderPhone, latestOrder);
    }

    return { duplicate: false, messageId: message.id, orderId: latestOrder?.id };
  }

  /**
   * Inbound WhatsApp Command: CANCEL <orderNumber> [reason]
   */
  private async processInboundCancellation(
    senderPhone: string,
    rawText: string,
    defaultOrder: any
  ) {
    const parts = rawText.split(/\s+/);
    const orderNumberArg = parts[1]?.toUpperCase();
    const reason = parts.slice(2).join(" ") || "Customer requested cancellation via WhatsApp";

    let targetOrder = defaultOrder;
    if (orderNumberArg && orderNumberArg.startsWith("ORD-")) {
      const found = await prisma.order.findUnique({
        where: { orderNumber: orderNumberArg },
        include: { items: true },
      });
      if (found && found.whatsappNumber === senderPhone) {
        targetOrder = found;
      }
    }

    if (!targetOrder) {
      await this.sendOutboundMessage({
        recipientPhone: senderPhone,
        templateName: "cancellation_order_not_found",
        bodyText: `Namaste. We could not locate an active order associated with your number. Please include your order reference (e.g. CANCEL ORD-2026-123456).`,
      });
      return;
    }

    // Auto-cancel if unpaid
    if (
      targetOrder.status === "AWAITING_ADMIN_REVIEW" ||
      targetOrder.status === "AWAITING_CUSTOMER_PAYMENT"
    ) {
      await prisma.$transaction(async (tx) => {
        if (targetOrder.status === "AWAITING_CUSTOMER_PAYMENT") {
          for (const item of targetOrder.items) {
            if (item.variantId) {
              await tx.productVariant.update({
                where: { id: item.variantId },
                data: { reservedStock: { decrement: item.quantity } },
              });
            }
          }
        }
        await tx.cancellationRequest.create({
          data: {
            orderId: targetOrder.id,
            source: "WHATSAPP",
            reason,
            status: "APPROVED",
          },
        });
        await tx.order.update({
          where: { id: targetOrder.id },
          data: { status: "CANCELLED", paymentHoldExpiresAt: null },
        });
      });

      await this.sendOutboundMessage({
        orderId: targetOrder.id,
        recipientPhone: senderPhone,
        templateName: "order_cancelled",
        bodyText: `Namaste ${targetOrder.customerName},\n\nYour Order ${targetOrder.orderNumber} has been successfully cancelled as requested. Any reserved items have been returned to our atelier inventory.`,
      });
      return;
    }

    // If paid or processing, create pending request for admin review
    if (
      targetOrder.status === "PAID" ||
      targetOrder.status === "PROCESSING" ||
      targetOrder.status === "PAYMENT_PROOF_RECEIVED" ||
      targetOrder.status === "PAYMENT_UNDER_REVIEW"
    ) {
      await prisma.$transaction(async (tx) => {
        await tx.cancellationRequest.create({
          data: {
            orderId: targetOrder.id,
            source: "WHATSAPP",
            reason,
            status: "PENDING",
          },
        });
        await tx.order.update({
          where: { id: targetOrder.id },
          data: { status: "CANCELLATION_REQUESTED" },
        });
      });

      await this.sendOutboundMessage({
        orderId: targetOrder.id,
        recipientPhone: senderPhone,
        templateName: "cancellation_requested",
        bodyText: `Namaste ${targetOrder.customerName},\n\nWe have received your cancellation request for Order ${targetOrder.orderNumber}.\n\nBecause this order is already ${targetOrder.status.toLowerCase().replace(/_/g, " ")}, our master tailor and finance desk will review the status and notify you shortly regarding cancellation and refund arrangements.`,
      });
      return;
    }

    // If shipped
    if (targetOrder.status === "SHIPPED" || targetOrder.status === "DELIVERED") {
      await this.sendOutboundMessage({
        orderId: targetOrder.id,
        recipientPhone: senderPhone,
        templateName: "cancellation_ineligible",
        bodyText: `Namaste ${targetOrder.customerName},\n\nOrder ${targetOrder.orderNumber} has already been dispatched with our courier. Orders cannot be cancelled post-dispatch, but you may request a return or exchange once delivered by messaging REFUND ${targetOrder.orderNumber}.`,
      });
    }
  }

  /**
   * Inbound WhatsApp Command: REFUND <orderNumber> [reason]
   */
  private async processInboundRefund(
    senderPhone: string,
    rawText: string,
    defaultOrder: any
  ) {
    const parts = rawText.split(/\s+/);
    const orderNumberArg = parts[1]?.toUpperCase();
    const reason = parts.slice(2).join(" ") || "Customer requested refund via WhatsApp";

    let targetOrder = defaultOrder;
    if (orderNumberArg && orderNumberArg.startsWith("ORD-")) {
      const found = await prisma.order.findUnique({
        where: { orderNumber: orderNumberArg },
      });
      if (found && found.whatsappNumber === senderPhone) {
        targetOrder = found;
      }
    }

    if (!targetOrder) {
      await this.sendOutboundMessage({
        recipientPhone: senderPhone,
        templateName: "refund_order_not_found",
        bodyText: `Namaste. We could not find an eligible paid order matching your number. Please include your order reference (e.g. REFUND ORD-2026-123456).`,
      });
      return;
    }

    // Only orders that had payment or cancellation can request refund
    const eligibleStatuses = [
      "PAID",
      "PROCESSING",
      "SHIPPED",
      "DELIVERED",
      "CANCELLED",
      "CANCELLATION_REQUESTED",
    ];

    if (!eligibleStatuses.includes(targetOrder.status)) {
      await this.sendOutboundMessage({
        orderId: targetOrder.id,
        recipientPhone: senderPhone,
        templateName: "refund_ineligible",
        bodyText: `Namaste ${targetOrder.customerName}. Order ${targetOrder.orderNumber} is currently ${targetOrder.status.toLowerCase().replace(/_/g, " ")} and is not eligible for a refund.`,
      });
      return;
    }

    // Create a pending RefundRecord
    await prisma.$transaction(async (tx) => {
      await tx.refundRecord.create({
        data: {
          orderId: targetOrder.id,
          amountPaise: targetOrder.totalPaise,
          currency: targetOrder.currency,
          status: "REQUESTED",
          reason,
          source: "WHATSAPP",
        },
      });

      await tx.order.update({
        where: { id: targetOrder.id },
        data: { status: "REFUND_REQUESTED" },
      });
    });

    await this.sendOutboundMessage({
      orderId: targetOrder.id,
      recipientPhone: senderPhone,
      templateName: "refund_request_received",
      bodyText: `Namaste ${targetOrder.customerName},\n\nWe have logged your refund request for Order ${targetOrder.orderNumber} (Amount: ₹${(targetOrder.totalPaise / 100).toLocaleString("en-IN")}).\n\nOur finance team will review the ledger and initiate a manual bank transfer to your originating UPI account once approved.`,
    });
  }

  /**
   * Inbound WhatsApp Command: STATUS <orderNumber>
   */
  private async processInboundStatus(senderPhone: string, defaultOrder: any) {
    if (!defaultOrder) {
      await this.sendOutboundMessage({
        recipientPhone: senderPhone,
        templateName: "status_not_found",
        bodyText: "Namaste. No orders found for this WhatsApp number. Please check back after placing an order.",
      });
      return;
    }

    await this.sendOutboundMessage({
      orderId: defaultOrder.id,
      recipientPhone: senderPhone,
      templateName: "status_reply",
      bodyText: `Namaste ${defaultOrder.customerName},\n\nOrder Ref: ${defaultOrder.orderNumber}\nCurrent Status: ${defaultOrder.status.replace(/_/g, " ")}\nTotal: ₹${(defaultOrder.totalPaise / 100).toLocaleString("en-IN")}\n\nOur team is at your service. Reply HELP to speak with an atelier specialist.`,
    });
  }

  // ---------------------------------------------------------------------------
  // Outbound Notification Templates
  // ---------------------------------------------------------------------------

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

  async notifyCancellationRequested(order: {
    id: string;
    orderNumber: string;
    customerName: string;
    whatsappNumber: string;
  }) {
    const text =
      `Namaste ${order.customerName},\n\n` +
      `We have received your cancellation request for Order ${order.orderNumber}.\n\n` +
      `Our atelier team is reviewing the current fabrication and payment status. We will update you with our confirmation shortly.`;

    return this.sendOutboundMessage({
      orderId: order.id,
      recipientPhone: order.whatsappNumber,
      templateName: "cancellation_requested",
      bodyText: text,
    });
  }

  async notifyCancellationApproved(order: {
    id: string;
    orderNumber: string;
    customerName: string;
    whatsappNumber: string;
    refundPending?: boolean;
  }) {
    const refundNote = order.refundPending
      ? "\nYour refund has been scheduled and will be returned to your bank account."
      : "";

    const text =
      `Namaste ${order.customerName},\n\n` +
      `Your cancellation request for Order ${order.orderNumber} has been APPROVED.${refundNote}\n\n` +
      `Thank you for your consideration, and we hope to craft for you again soon.`;

    return this.sendOutboundMessage({
      orderId: order.id,
      recipientPhone: order.whatsappNumber,
      templateName: "cancellation_approved",
      bodyText: text,
    });
  }

  async notifyCancellationRejected(order: {
    id: string;
    orderNumber: string;
    customerName: string;
    whatsappNumber: string;
    reason?: string;
  }) {
    const reasonText = order.reason ? `\nReason: ${order.reason}` : "";

    const text =
      `Namaste ${order.customerName},\n\n` +
      `Your cancellation request for Order ${order.orderNumber} could not be approved at this stage.${reasonText}\n\n` +
      `Please contact our atelier desk if you have any questions or require custom assistance.`;

    return this.sendOutboundMessage({
      orderId: order.id,
      recipientPhone: order.whatsappNumber,
      templateName: "cancellation_rejected",
      bodyText: text,
    });
  }

  async notifyRefundCompleted(order: {
    id: string;
    orderNumber: string;
    customerName: string;
    whatsappNumber: string;
    refundAmountPaise: number;
    transactionReference: string;
  }) {
    const amountInr = (order.refundAmountPaise / 100).toLocaleString("en-IN");

    const text =
      `Namaste ${order.customerName},\n\n` +
      `Your refund for Order ${order.orderNumber} has been successfully processed.\n\n` +
      `Amount Refunded: ₹${amountInr}\n` +
      `Bank UTR / Transaction Ref: ${order.transactionReference}\n\n` +
      `The funds have been returned to your original payment account. Please allow standard bank clearing time.`;

    return this.sendOutboundMessage({
      orderId: order.id,
      recipientPhone: order.whatsappNumber,
      templateName: "refund_completed",
      bodyText: text,
    });
  }
}
