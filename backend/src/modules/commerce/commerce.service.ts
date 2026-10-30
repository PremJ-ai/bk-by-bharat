import crypto from "node:crypto";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { prisma } from "../../db/prisma.js";
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  ServiceUnavailableError,
} from "../../lib/errors.js";
import { WhatsAppService } from "../whatsapp/whatsapp.service.js";
import type {
  GuestCheckoutInput,
  CreateInvoiceInput,
  SubmitPaymentProofInput,
  VerifyPaymentInput,
  CreateShipmentInput,
  UpdatePaymentSettingsInput,
  AdminCancellationDecisionInput,
  ProcessRefundInput,
} from "./commerce.schemas.js";

const PROOFS_DIR = path.resolve(process.cwd(), "uploads", "proofs");
fs.mkdir(PROOFS_DIR, { recursive: true }).catch(() => {});

export class CommerceService {
  constructor(private readonly whatsappService = new WhatsAppService()) {}

  /**
   * Helper to hash an opaque guest status token with SHA-256
   */
  private hashToken(rawToken: string): string {
    return crypto.createHash("sha256").update(rawToken).digest("hex");
  }

  /**
   * Get default store settings
   */
  async getStoreSettings() {
    return prisma.storeSettings.upsert({
      where: { id: "default" },
      update: {},
      create: {
        id: "default",
        upiId: "atelier@bharat.upi",
        payeeName: "Bharat Atelier New Delhi",
        paymentInstructions:
          "Scan QR using any UPI app (GPay, PhonePe, Paytm). Confirm order reference in remarks.",
        whatsappNumber: "+919876543210",
        invoicePrefix: "INV-2026-",
        shippingDefaultPaise: 0,
      },
    });
  }

  /**
   * Helper to identify unconfigured / placeholder payment store credentials
   */
  isPlaceholderStoreSettings(settings: {
    upiId?: string | null;
    payeeName?: string | null;
    whatsappNumber?: string | null;
  }): boolean {
    const placeholderUpiPatterns = [/atelier@bharat\.upi$/i, /@bharat\.upi$/i, /@example/i, /test@/i, /placeholder/i];
    const placeholderPhonePatterns = [/^\+?919876543210$/, /^\+?910000000000$/, /^\+?911234567890$/];
    const placeholderPayeePatterns = [/^Bharat Atelier New Delhi$/i, /placeholder/i, /test payee/i];

    const upi = (settings.upiId || "").trim();
    const payee = (settings.payeeName || "").trim();
    const phone = (settings.whatsappNumber || "").trim();

    return (
      !upi ||
      placeholderUpiPatterns.some((pattern) => pattern.test(upi)) ||
      !payee ||
      placeholderPayeePatterns.some((pattern) => pattern.test(payee)) ||
      !phone ||
      placeholderPhonePatterns.some((pattern) => pattern.test(phone))
    );
  }

  /**
   * Guest Checkout: authoritative server-side price calculation and order creation
   */
  async createGuestOrder(input: GuestCheckoutInput) {
    // 1. Load all requested variants and check stock & pricing authoritatively
    const variantIds = input.items.map((i) => i.variantId);
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: {
        product: {
          include: {
            media: {
              where: { isPrimary: true },
              include: { mediaAsset: true },
            },
          },
        },
      },
    });

    if (variants.length !== input.items.length) {
      throw new BadRequestError("One or more selected garment variants could not be found.");
    }

    // Map items with authoritative snapshots
    let subtotalPaise = 0;
    const validatedItems = input.items.map((cartItem) => {
      const v = variants.find((item) => item.id === cartItem.variantId)!;

      if (!v.isActive || v.product.status !== "PUBLISHED") {
        throw new BadRequestError(`Garment "${v.product.name}" (${v.size}) is currently unavailable.`);
      }

      const availableStock = v.stock - v.reservedStock;
      if (availableStock < cartItem.quantity) {
        throw new BadRequestError(
          `Insufficient stock for "${v.product.name}" in Size ${v.size}. Available: ${Math.max(0, availableStock)}, Requested: ${cartItem.quantity}`
        );
      }

      const unitPricePaise = v.priceOverridePaise || v.product.pricePaise;
      const lineTotalPaise = unitPricePaise * cartItem.quantity;
      subtotalPaise += lineTotalPaise;

      return {
        variantId: v.id,
        productId: v.productId,
        productName: v.product.name,
        sku: v.sku,
        size: v.size,
        color: v.colorName,
        material: v.product.material,
        unitPricePaise,
        quantity: cartItem.quantity,
        lineTotalPaise,
        imageUrl: v.product.media?.[0]?.mediaAsset?.url || null,
      };
    });

    // 2. Reject missing or false consent if required, and determine consent timestamp
    if (input.whatsappConsent !== true) {
      throw new BadRequestError("Consent to receive order updates via WhatsApp is required.");
    }
    const consentTimestamp = input.whatsappConsent === true ? new Date() : null;

    // 3. Generate cryptographically random guest status token and human order number
    const rawToken = crypto.randomBytes(32).toString("hex");
    const guestTokenHash = this.hashToken(rawToken);
    const orderNumber = `ORD-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    // 4. Persist Order in database transaction
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          status: "AWAITING_ADMIN_REVIEW",
          paymentStatus: "NOT_REQUESTED",
          fulfillmentStatus: "UNFULFILLED",
          customerName: input.customerName,
          whatsappNumber: input.whatsappNumber,
          email: input.email || null,
          addressLine1: input.addressLine1,
          addressLine2: input.addressLine2 || null,
          city: input.city,
          stateRegion: input.stateRegion,
          postalCode: input.postalCode,
          country: input.country || "India",
          deliveryNotes: input.deliveryNotes || null,
          whatsappConsent: input.whatsappConsent === true,
          whatsappConsentAt: consentTimestamp,
          guestTokenHash,
          subtotalPaise,
          totalPaise: subtotalPaise,
          items: {
            create: validatedItems,
          },
        },
        include: {
          items: true,
        },
      });

      return newOrder;
    });

    // 5. Send asynchronous WhatsApp confirmation
    this.whatsappService
      .notifyOrderReceived({
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        whatsappNumber: order.whatsappNumber,
        subtotalPaise: order.subtotalPaise,
        rawToken,
      })
      .catch(() => {});

    return {
      orderNumber: order.orderNumber,
      guestStatusToken: rawToken,
      status: order.status,
      subtotalPaise: order.subtotalPaise,
      totalPaise: order.totalPaise,
      currency: order.currency,
      itemsCount: order.items.length,
      whatsappConsent: order.whatsappConsent,
      whatsappConsentAt: order.whatsappConsentAt,
    };
  }

  /**
   * Guest Order Status by raw private token
   */
  async getGuestOrderByToken(rawToken: string) {
    const guestTokenHash = this.hashToken(rawToken);

    const [order, settings] = await Promise.all([
      prisma.order.findUnique({
        where: { guestTokenHash },
        include: {
          items: true,
          invoices: {
            where: { isCurrent: true },
          },
          paymentProofs: {
            orderBy: { receivedAt: "desc" },
          },
          shipments: {
            orderBy: { shippedAt: "desc" },
          },
          cancellationRequests: {
            orderBy: { createdAt: "desc" },
          },
          refundRecords: {
            orderBy: { createdAt: "desc" },
          },
        },
      }),
      this.getStoreSettings(),
    ]);

    if (!order) {
      throw new NotFoundError("Order not found or tracking token has expired.");
    }

    const currentInvoice = order.invoices[0] || null;
    const finalAmountInr = (order.totalPaise / 100).toFixed(2);
    const hasValidPaymentSettings = !this.isPlaceholderStoreSettings(settings);
    const upiDeepLink = hasValidPaymentSettings
      ? `upi://pay?pa=${encodeURIComponent(settings.upiId)}&pn=${encodeURIComponent(
          settings.payeeName
        )}&am=${finalAmountInr}&cu=INR&tn=${encodeURIComponent(`Atelier ${order.orderNumber}`)}`
      : null;

    return {
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      fulfillmentStatus: order.fulfillmentStatus,
      customerName: order.customerName,
      whatsappNumber: order.whatsappNumber,
      whatsappConsent: order.whatsappConsent,
      whatsappConsentAt: order.whatsappConsentAt,
      email: order.email,
      shippingAddress: {
        line1: order.addressLine1,
        line2: order.addressLine2,
        city: order.city,
        state: order.stateRegion,
        postalCode: order.postalCode,
        country: order.country,
      },
      deliveryNotes: order.deliveryNotes,
      subtotalPaise: order.subtotalPaise,
      shippingPaise: order.shippingPaise,
      taxPaise: order.taxPaise,
      discountPaise: order.discountPaise,
      totalPaise: order.totalPaise,
      currency: order.currency,
      paymentHoldExpiresAt: order.paymentHoldExpiresAt,
      createdAt: order.createdAt,
      items: order.items.map((i) => ({
        id: i.id,
        productName: i.productName,
        sku: i.sku,
        size: i.size,
        color: i.color,
        material: i.material,
        unitPricePaise: i.unitPricePaise,
        quantity: i.quantity,
        lineTotalPaise: i.lineTotalPaise,
        imageUrl: i.imageUrl,
      })),
      invoice: currentInvoice
        ? {
            invoiceNumber: currentInvoice.invoiceNumber,
            version: currentInvoice.version,
            subtotalPaise: currentInvoice.subtotalPaise,
            shippingPaise: currentInvoice.shippingPaise,
            otherFeePaise: currentInvoice.otherFeePaise,
            otherFeeLabel: currentInvoice.otherFeeLabel,
            taxPaise: currentInvoice.taxPaise,
            discountPaise: currentInvoice.discountPaise,
            totalPaise: currentInvoice.totalPaise,
            createdAt: currentInvoice.createdAt,
          }
        : null,
      paymentProofs: order.paymentProofs.map((p) => ({
        id: p.id,
        url: p.url,
        status: p.status,
        transactionReference: p.transactionReference,
        receivedAt: p.receivedAt,
      })),
      shipments: order.shipments.map((s) => ({
        id: s.id,
        carrier: s.carrier,
        trackingNumber: s.trackingNumber,
        trackingUrl: s.trackingUrl,
        shippedAt: s.shippedAt,
      })),
      cancellationRequests: order.cancellationRequests.map((c) => ({
        id: c.id,
        status: c.status,
        reason: c.reason,
        createdAt: c.createdAt,
      })),
      refundRecords: order.refundRecords.map((r) => ({
        id: r.id,
        amountPaise: r.amountPaise,
        status: r.status,
        reason: r.reason,
        transactionReference: r.transactionReference,
        processedAt: r.processedAt,
        createdAt: r.createdAt,
      })),
      paymentDetails: {
        upiId: settings.upiId,
        payeeName: settings.payeeName,
        paymentInstructions: settings.paymentInstructions,
        upiDeepLink,
        qrImageUrl: settings.qrImageUrl || null,
      },
    };
  }

  /**
   * Admin: Generate / Update final verified invoice and reserve stock
   */
  async createInvoice(orderId: string, adminId: string | undefined, input: CreateInvoiceInput) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, invoices: true },
    });

    if (!order) {
      throw new NotFoundError(`Order '${orderId}' not found.`);
    }

    if (order.status === "CANCELLED" || order.status === "PAID") {
      throw new BadRequestError(`Cannot issue an invoice for an order in status ${order.status}.`);
    }

    const settings = await this.getStoreSettings();

    if (this.isPlaceholderStoreSettings(settings)) {
      throw new BadRequestError(
        "Cannot issue payment invoice: Store payment settings contain placeholder credentials (UPI ID, Payee Name, or WhatsApp Number). Configure genuine business values in Admin Settings before requesting payment for real orders."
      );
    }

    // Calculate total
    const totalPaise = Math.max(
      0,
      order.subtotalPaise +
        input.shippingPaise +
        input.otherFeePaise +
        input.taxPaise -
        input.discountPaise
    );

    const holdExpiresAt = new Date(Date.now() + input.paymentHoldHours * 3600 * 1000);
    const invoiceVersion = order.invoices.length + 1;
    const invoiceNumber = `${settings.invoicePrefix}${order.orderNumber.replace(/[^0-9]/g, "").slice(-6) || Date.now().toString().slice(-6)}-v${invoiceVersion}`;

    // Execute in transaction: reserve stock on variants, deactivate old invoices, create new invoice
    const result = await prisma.$transaction(async (tx) => {
      // 1. Atomically reserve stock on variants if not already reserved
      if (order.status === "AWAITING_ADMIN_REVIEW") {
        for (const item of order.items) {
          if (item.variantId) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: {
                reservedStock: { increment: item.quantity },
              },
            });
          }
        }
      }

      // 2. Archive previous active invoices
      await tx.invoice.updateMany({
        where: { orderId: order.id, isCurrent: true },
        data: { isCurrent: false },
      });

      // 3. Create new Invoice
      const invoice = await tx.invoice.create({
        data: {
          orderId: order.id,
          version: invoiceVersion,
          invoiceNumber,
          subtotalPaise: order.subtotalPaise,
          shippingPaise: input.shippingPaise,
          otherFeePaise: input.otherFeePaise,
          otherFeeLabel: input.otherFeeLabel || null,
          taxPaise: input.taxPaise,
          discountPaise: input.discountPaise,
          totalPaise,
          currency: order.currency,
          isCurrent: true,
          createdByAdminId: adminId,
        },
      });

      // 4. Update Order status
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: "AWAITING_CUSTOMER_PAYMENT",
          paymentStatus: "REQUESTED",
          shippingPaise: input.shippingPaise,
          taxPaise: input.taxPaise,
          discountPaise: input.discountPaise,
          totalPaise,
          paymentHoldExpiresAt: holdExpiresAt,
        },
      });

      // 5. Audit event
      await tx.auditEvent.create({
        data: {
          actorAdminId: adminId || null,
          action: "INVOICE_ISSUED",
          resourceType: "Order",
          resourceId: order.id,
          details: { invoiceNumber, totalPaise, holdExpiresAt },
        },
      });

      return { invoice, updatedOrder };
    });

    // Notify customer on WhatsApp
    this.whatsappService
      .notifyInvoiceReady({
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        whatsappNumber: order.whatsappNumber,
        totalPaise,
        upiId: settings.upiId,
        payeeName: settings.payeeName,
        paymentInstructions: settings.paymentInstructions,
        rawToken: order.guestTokenHash, // Order token view
        expiresAt: holdExpiresAt,
      })
      .catch(() => {});

    return result;
  }

  /**
   * Guest: Submit payment proof screenshot & UTR reference
   */
  async submitPaymentProof(input: SubmitPaymentProofInput) {
    if (process.env.VERCEL === "1") {
      throw new ServiceUnavailableError(
        "Payment-proof uploads are unavailable until private persistent storage is configured."
      );
    }

    const guestTokenHash = this.hashToken(input.token);
    const order = await prisma.order.findUnique({
      where: { guestTokenHash },
    });

    if (!order) {
      throw new NotFoundError("Order not found or invalid token.");
    }

    if (
      order.status !== "AWAITING_CUSTOMER_PAYMENT" &&
      order.status !== "PAYMENT_PROOF_RECEIVED" &&
      order.status !== "PAYMENT_UNDER_REVIEW"
    ) {
      throw new BadRequestError(`Cannot submit payment proof for order in status ${order.status}.`);
    }

    let finalUrl = input.url;
    let storageKey = `proofs/${order.orderNumber}-${Date.now()}.jpg`;
    let fileSizeBytes = 0;

    if (input.fileBase64) {
      const cleanBase64 = input.fileBase64.replace(/^data:image\/[a-z]+;base64,/, "");
      const buffer = Buffer.from(cleanBase64, "base64");

      if (buffer.length > 10 * 1024 * 1024) {
        throw new BadRequestError("Proof image exceeds maximum size limit of 10MB.");
      }

      fileSizeBytes = buffer.length;
      const diskPath = path.join(PROOFS_DIR, path.basename(storageKey));
      await fs.writeFile(diskPath, buffer);
    } else if (!finalUrl) {
      throw new BadRequestError("Either fileBase64 or url must be provided.");
    }

    // Persist proof and transition order status to PAYMENT_PROOF_RECEIVED
    const proof = await prisma.$transaction(async (tx) => {
      const p = await tx.paymentProof.create({
        data: {
          orderId: order.id,
          storageKey,
          url: finalUrl || "pending",
          mimeType: input.mimeType || "image/jpeg",
          fileSizeBytes,
          status: "PENDING_REVIEW",
          transactionReference: input.transactionReference || null,
          adminNotes: input.notes || null,
        },
      });

      // Protected URL route for secure retrieval
      const protectedUrl = `/api/v1/orders/proofs/${p.id}/file`;
      const updatedProof = await tx.paymentProof.update({
        where: { id: p.id },
        data: { url: protectedUrl },
      });

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "PAYMENT_PROOF_RECEIVED",
          paymentStatus: "PROOF_RECEIVED",
        },
      });

      return updatedProof;
    });

    // Notify customer on WhatsApp acknowledging proof
    this.whatsappService
      .notifyPaymentProofReceived({
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        whatsappNumber: order.whatsappNumber,
      })
      .catch(() => {});

    return proof;
  }

  /**
   * Admin: Verify payment and finalize stock decrement
   */
  async verifyPayment(orderId: string, adminId: string | undefined, input: VerifyPaymentInput) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, paymentProofs: true },
    });

    if (!order) {
      throw new NotFoundError(`Order '${orderId}' not found.`);
    }

    if (order.status === "PAID") {
      throw new BadRequestError("This order has already been verified and marked as PAID.");
    }

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Permanently decrement stock and release reservation on variants
      for (const item of order.items) {
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: {
              stock: { decrement: item.quantity },
              reservedStock: { decrement: item.quantity },
            },
          });
        }
      }

      // 2. Mark pending payment proofs as VERIFIED
      await tx.paymentProof.updateMany({
        where: { orderId: order.id, status: "PENDING_REVIEW" },
        data: {
          status: "VERIFIED",
          transactionReference: input.utrReference,
          verifiedByAdminId: adminId,
          verifiedAt: new Date(),
          adminNotes: input.adminNotes || "Verified against bank settlement ledger",
        },
      });

      // 3. Mark order as PAID
      const ord = await tx.order.update({
        where: { id: order.id },
        data: {
          status: "PAID",
          paymentStatus: "VERIFIED",
          paymentHoldExpiresAt: null, // Clear expiration
        },
      });

      // 4. Audit Log
      await tx.auditEvent.create({
        data: {
          actorAdminId: adminId || null,
          action: "PAYMENT_VERIFIED",
          resourceType: "Order",
          resourceId: order.id,
          details: { utrReference: input.utrReference, notes: input.adminNotes },
        },
      });

      return ord;
    });

    // Notify customer on WhatsApp
    this.whatsappService
      .notifyPaymentVerified({
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        whatsappNumber: order.whatsappNumber,
      })
      .catch(() => {});

    return updated;
  }

  /**
   * Admin: Dispatch Shipment
   */
  async createShipment(orderId: string, adminId: string | undefined, input: CreateShipmentInput) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundError(`Order '${orderId}' not found.`);
    }

    if (order.status !== "PAID" && order.status !== "PROCESSING" && order.status !== "SHIPPED") {
      throw new BadRequestError(`Cannot dispatch shipment for order in status ${order.status}. Order must be PAID.`);
    }

    const shipment = await prisma.$transaction(async (tx) => {
      const s = await tx.shipment.create({
        data: {
          orderId: order.id,
          carrier: input.carrier,
          trackingNumber: input.trackingNumber,
          trackingUrl: input.trackingUrl || null,
          notes: input.notes || null,
          shippedAt: new Date(),
        },
      });

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "SHIPPED",
          fulfillmentStatus: "SHIPPED",
        },
      });

      await tx.auditEvent.create({
        data: {
          actorAdminId: adminId || null,
          action: "ORDER_SHIPPED",
          resourceType: "Order",
          resourceId: order.id,
          details: { carrier: input.carrier, trackingNumber: input.trackingNumber },
        },
      });

      return s;
    });

    // Notify customer
    this.whatsappService
      .notifyOrderShipped({
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        whatsappNumber: order.whatsappNumber,
        carrier: input.carrier,
        trackingNumber: input.trackingNumber,
        trackingUrl: input.trackingUrl,
      })
      .catch(() => {});

    return shipment;
  }

  /**
   * Guest: Request Cancellation
   * Handles both immediate cancellation of unpaid orders and submission of review-gated
   * cancellation requests for orders in payment-proof review or paid/processing states.
   */
  async cancelOrder(input: { token: string; reason: string }) {
    const guestTokenHash = this.hashToken(input.token);
    const order = await prisma.order.findUnique({
      where: { guestTokenHash },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundError("Order not found or invalid token.");
    }

    if (order.status === "SHIPPED" || order.status === "DELIVERED") {
      throw new BadRequestError(
        `Order ${order.orderNumber} has already been dispatched with our courier. Please contact atelier WhatsApp support to initiate a return or exchange.`
      );
    }

    if (order.status === "CANCELLED" || order.status === "REFUNDED") {
      throw new BadRequestError(`Order ${order.orderNumber} is already ${order.status.toLowerCase()}.`);
    }

    if (order.status === "CANCELLATION_REQUESTED") {
      throw new BadRequestError("A cancellation request for this order is already under review by our atelier team.");
    }

    // Branch 1: Unpaid Orders (Auto-approved under policy; release reserved stock hold)
    if (order.status === "AWAITING_ADMIN_REVIEW" || order.status === "AWAITING_CUSTOMER_PAYMENT") {
      const updated = await prisma.$transaction(async (tx) => {
        if (order.status === "AWAITING_CUSTOMER_PAYMENT") {
          for (const item of order.items) {
            if (item.variantId) {
              await tx.productVariant.update({
                where: { id: item.variantId },
                data: {
                  reservedStock: { decrement: item.quantity },
                },
              });
            }
          }
        }

        await tx.cancellationRequest.create({
          data: {
            orderId: order.id,
            source: "WEBSITE",
            reason: input.reason,
            status: "APPROVED",
          },
        });

        return tx.order.update({
          where: { id: order.id },
          data: {
            status: "CANCELLED",
            paymentHoldExpiresAt: null,
          },
        });
      });

      this.whatsappService
        .notifyCancellationApproved({
          id: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          whatsappNumber: order.whatsappNumber,
        })
        .catch(() => {});

      return updated;
    }

    // Branch 2: Paid, Processing, or Proof Under Review
    // Must be routed to Admin Decision before cancelling or refunding
    const updated = await prisma.$transaction(async (tx) => {
      await tx.cancellationRequest.create({
        data: {
          orderId: order.id,
          source: "WEBSITE",
          reason: input.reason,
          status: "PENDING",
        },
      });

      return tx.order.update({
        where: { id: order.id },
        data: {
          status: "CANCELLATION_REQUESTED",
        },
      });
    });

    this.whatsappService
      .notifyCancellationRequested({
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        whatsappNumber: order.whatsappNumber,
      })
      .catch(() => {});

    return updated;
  }

  /**
   * Admin: Decide Cancellation Request (Approve or Reject)
   * Restores variant inventory exactly once if order was previously paid and decremented.
   */
  async decideCancellation(
    orderId: string,
    adminId: string | undefined,
    input: AdminCancellationDecisionInput
  ) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        cancellationRequests: {
          where: { status: "PENDING" },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!order) {
      throw new NotFoundError(`Order '${orderId}' not found.`);
    }

    if (order.status !== "CANCELLATION_REQUESTED" && order.cancellationRequests.length === 0) {
      throw new BadRequestError(`Order '${order.orderNumber}' does not have a pending cancellation request.`);
    }

    const pendingRequest = order.cancellationRequests[0];

    const updated = await prisma.$transaction(async (tx) => {
      if (input.decision === "APPROVED") {
        // If order was paid, physical inventory was decremented when payment was verified:
        // Restore stock exactly once
        if (order.paymentStatus === "VERIFIED") {
          for (const item of order.items) {
            if (item.variantId) {
              await tx.productVariant.update({
                where: { id: item.variantId },
                data: {
                  stock: { increment: item.quantity },
                },
              });
            }
          }
        } else if (order.status === "AWAITING_CUSTOMER_PAYMENT" || order.status === "PAYMENT_PROOF_RECEIVED") {
          // If only reserved stock hold was active, release reservedStock
          for (const item of order.items) {
            if (item.variantId) {
              await tx.productVariant.update({
                where: { id: item.variantId },
                data: {
                  reservedStock: { decrement: item.quantity },
                },
              });
            }
          }
        }

        if (pendingRequest) {
          await tx.cancellationRequest.update({
            where: { id: pendingRequest.id },
            data: {
              status: "APPROVED",
              decidedByAdminId: adminId || null,
              decidedAt: new Date(),
            },
          });
        }

        // If paid, route to REFUND_REQUESTED so staff knows to return funds; otherwise CANCELLED
        const nextStatus = order.paymentStatus === "VERIFIED" ? "REFUND_REQUESTED" : "CANCELLED";

        const ord = await tx.order.update({
          where: { id: order.id },
          data: {
            status: nextStatus,
            paymentHoldExpiresAt: null,
          },
        });

        await tx.auditEvent.create({
          data: {
            actorAdminId: adminId || null,
            action: "CANCELLATION_APPROVED",
            resourceType: "Order",
            resourceId: order.id,
            details: { reason: input.reason, refundPending: order.paymentStatus === "VERIFIED" },
          },
        });

        return ord;
      } else {
        // REJECTED: restore previous status
        const revertedStatus = order.paymentStatus === "VERIFIED" ? "PAID" : "AWAITING_CUSTOMER_PAYMENT";

        if (pendingRequest) {
          await tx.cancellationRequest.update({
            where: { id: pendingRequest.id },
            data: {
              status: "REJECTED",
              decidedByAdminId: adminId || null,
              decidedAt: new Date(),
            },
          });
        }

        const ord = await tx.order.update({
          where: { id: order.id },
          data: {
            status: revertedStatus,
          },
        });

        await tx.auditEvent.create({
          data: {
            actorAdminId: adminId || null,
            action: "CANCELLATION_REJECTED",
            resourceType: "Order",
            resourceId: order.id,
            details: { reason: input.reason },
          },
        });

        return ord;
      }
    });

    if (input.decision === "APPROVED") {
      this.whatsappService
        .notifyCancellationApproved({
          id: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          whatsappNumber: order.whatsappNumber,
          refundPending: order.paymentStatus === "VERIFIED",
        })
        .catch(() => {});
    } else {
      this.whatsappService
        .notifyCancellationRejected({
          id: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          whatsappNumber: order.whatsappNumber,
          reason: input.reason,
        })
        .catch(() => {});
    }

    return updated;
  }

  /**
   * Admin: Process Manual Bank/UPI Refund
   * Records the verified UTR/transfer reference after the manual bank transfer has occurred.
   * Strictly prevents duplicate refunds or amount overages. Does not double-release inventory.
   */
  async processRefund(
    orderId: string,
    adminId: string | undefined,
    input: ProcessRefundInput
  ) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        refundRecords: {
          where: { status: "COMPLETED" },
        },
      },
    });

    if (!order) {
      throw new NotFoundError(`Order '${orderId}' not found.`);
    }

    const eligibleStatuses = [
      "PAID",
      "PROCESSING",
      "SHIPPED",
      "DELIVERED",
      "CANCELLED",
      "REFUND_REQUESTED",
      "REFUND_PROCESSING",
      "PARTIALLY_REFUNDED",
    ];

    if (!eligibleStatuses.includes(order.status)) {
      throw new BadRequestError(`Order in status '${order.status}' is not eligible for refund.`);
    }

    const alreadyRefundedPaise = order.refundRecords.reduce((sum, r) => sum + r.amountPaise, 0);
    const maxRefundablePaise = order.totalPaise - alreadyRefundedPaise;

    if (input.refundAmountPaise > maxRefundablePaise) {
      throw new BadRequestError(
        `Refund amount of ₹${(input.refundAmountPaise / 100).toFixed(2)} exceeds remaining balance of ₹${(maxRefundablePaise / 100).toFixed(2)}.`
      );
    }

    const isFullRefund = alreadyRefundedPaise + input.refundAmountPaise >= order.totalPaise;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create completed RefundRecord entry
      const refundRecord = await tx.refundRecord.create({
        data: {
          orderId: order.id,
          amountPaise: input.refundAmountPaise,
          currency: order.currency,
          status: "COMPLETED",
          reason: input.reason,
          source: "ADMIN",
          adminNotes: input.adminNotes || null,
          transactionReference: input.refundReference,
          processedByAdminId: adminId || null,
          processedAt: new Date(),
        },
      });

      // 2. Update Order status
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED",
          paymentStatus: isFullRefund ? "REFUNDED" : "VERIFIED",
        },
      });

      // 3. Audit Event
      await tx.auditEvent.create({
        data: {
          actorAdminId: adminId || null,
          action: "ORDER_REFUNDED",
          resourceType: "Order",
          resourceId: order.id,
          details: {
            refundAmountPaise: input.refundAmountPaise,
            refundReference: input.refundReference,
            isFullRefund,
            reason: input.reason,
          },
        },
      });

      return { refundRecord, order: updatedOrder };
    });

    // Notify customer over WhatsApp
    this.whatsappService
      .notifyRefundCompleted({
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        whatsappNumber: order.whatsappNumber,
        refundAmountPaise: input.refundAmountPaise,
        transactionReference: input.refundReference,
      })
      .catch(() => {});

    return result;
  }

  /**
   * Admin: List all orders with filters & pagination
   */
  async listAdminOrders(options: {
    status?: string;
    search?: string;
    page: number;
    limit: number;
  }) {
    const { status, search, page, limit } = options;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status && status !== "ALL") {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: "insensitive" } },
        { customerName: { contains: search, mode: "insensitive" } },
        { whatsappNumber: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          items: true,
          invoices: { where: { isCurrent: true } },
          paymentProofs: { where: { status: "PENDING_REVIEW" } },
          shipments: true,
        },
      }),
      prisma.order.count({ where }),
    ]);

    return {
      items: items.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        paymentStatus: o.paymentStatus,
        fulfillmentStatus: o.fulfillmentStatus,
        customerName: o.customerName,
        whatsappNumber: o.whatsappNumber,
        email: o.email,
        totalPaise: o.totalPaise,
        itemsCount: o.items.length,
        hasPendingProof: o.paymentProofs.length > 0,
        invoiceNumber: o.invoices[0]?.invoiceNumber || null,
        createdAt: o.createdAt,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Admin: Get single order detail by ID
   */
  async getAdminOrderById(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        invoices: { orderBy: { version: "desc" } },
        paymentProofs: { orderBy: { receivedAt: "desc" } },
        shipments: { orderBy: { shippedAt: "desc" } },
        cancellationRequests: { orderBy: { createdAt: "desc" } },
        refundRecords: { orderBy: { createdAt: "desc" } },
        whatsappMessages: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!order) {
      throw new NotFoundError(`Order '${orderId}' not found.`);
    }

    return order;
  }

  /**
   * Admin: Update store payment settings
   */
  async updatePaymentSettings(adminId: string | undefined, input: UpdatePaymentSettingsInput) {
    if (this.isPlaceholderStoreSettings(input)) {
      throw new BadRequestError(
        "Cannot configure placeholder payment credentials as active store settings. Provide genuine business values."
      );
    }

    const updated = await prisma.storeSettings.upsert({
      where: { id: "default" },
      update: {
        upiId: input.upiId,
        payeeName: input.payeeName,
        paymentInstructions: input.paymentInstructions,
        whatsappNumber: input.whatsappNumber,
        shippingDefaultPaise: input.shippingDefaultPaise,
        qrImageUrl: input.qrImageUrl || null,
      },
      create: {
        id: "default",
        upiId: input.upiId,
        payeeName: input.payeeName,
        paymentInstructions: input.paymentInstructions,
        whatsappNumber: input.whatsappNumber,
        shippingDefaultPaise: input.shippingDefaultPaise,
        qrImageUrl: input.qrImageUrl || null,
      },
    });

    await prisma.auditEvent.create({
      data: {
        actorAdminId: adminId || null,
        action: "STORE_SETTINGS_UPDATED",
        resourceType: "StoreSettings",
        resourceId: "default",
        details: { upiId: input.upiId, payeeName: input.payeeName },
      },
    });

    return updated;
  }

  /**
   * Protected retrieval of payment proof file (authorizes admin session or guest order token)
   */
  async getProtectedPaymentProofFile(
    proofId: string,
    auth: { adminUserId?: string; guestToken?: string }
  ) {
    const proof = await prisma.paymentProof.findUnique({
      where: { id: proofId },
      include: { order: true },
    });

    if (!proof) {
      throw new NotFoundError("Payment proof record not found.");
    }

    const isAdmin = Boolean(auth.adminUserId);
    const hasValidGuestToken =
      Boolean(auth.guestToken) &&
      this.hashToken(auth.guestToken!) === proof.order.guestTokenHash;

    if (!isAdmin && !hasValidGuestToken) {
      if (!auth.adminUserId && !auth.guestToken) {
        throw new UnauthorizedError("Authentication required to access payment proof files.");
      }
      throw new ForbiddenError("Unauthorized access to payment proof file.");
    }

    if (process.env.VERCEL === "1") {
      throw new ServiceUnavailableError(
        "Payment-proof retrieval is unavailable until private persistent storage is configured."
      );
    }

    const diskPath = path.join(PROOFS_DIR, path.basename(proof.storageKey));
    if (!fsSync.existsSync(diskPath)) {
      throw new NotFoundError("Payment proof file not found on storage.");
    }

    return {
      filePath: diskPath,
      mimeType: proof.mimeType || "image/jpeg",
      fileName: path.basename(proof.storageKey),
    };
  }
}
