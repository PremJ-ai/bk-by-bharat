import crypto from "node:crypto";
import { Router, type Request, type Response, type NextFunction } from "express";
import { CommerceService } from "./commerce.service.js";
import { WhatsAppService } from "../whatsapp/whatsapp.service.js";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validateBody, validateQuery } from "../../middleware/validate.js";
import {
  guestCheckoutSchema,
  createInvoiceSchema,
  submitPaymentProofSchema,
  createPaymentProofUploadUrlSchema,
  verifyPaymentSchema,
  rejectPaymentProofSchema,
  createShipmentSchema,
  cancelOrderSchema,
  updatePaymentSettingsSchema,
  adminCancellationDecisionSchema,
  processRefundSchema,
} from "./commerce.schemas.js";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { SESSION_COOKIE_NAME } from "../../config/constants.js";

const commerceService = new CommerceService();
const whatsappService = new WhatsAppService();

// =============================================================================
// Public / Guest Orders Router (/api/v1/orders)
// =============================================================================
export const publicOrdersRouter = Router();

// Guest Checkout: Create initial order awaiting admin review
publicOrdersRouter.post(
  "/checkout",
  validateBody(guestCheckoutSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const order = await commerceService.createGuestOrder(req.body);
      res.status(201).json({
        data: order,
        meta: {
          requestId: req.requestId,
          message: "Guest order placed successfully. Master tailors are reviewing your request.",
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Guest Order Status & Tracking by Opaque Token
publicOrdersRouter.get(
  "/status",
  validateQuery(z.object({ token: z.string().min(16) })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.query.token as string;
      const order = await commerceService.getGuestOrderByToken(token);
      res.status(200).json({
        data: order,
        meta: { requestId: req.requestId },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Guest: create a short-lived private-storage upload URL after checking the order token.
publicOrdersRouter.post(
  "/payment-proof/upload-url",
  validateBody(createPaymentProofUploadUrlSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const upload = await commerceService.createPaymentProofUploadUrl(req.body);
      res.status(200).json({ data: upload, meta: { requestId: req.requestId } });
    } catch (error) {
      next(error);
    }
  }
);

// Guest Submit Payment Proof Screenshot & Reference
publicOrdersRouter.post(
  "/payment-proof",
  validateBody(submitPaymentProofSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const proof = await commerceService.submitPaymentProof(req.body);
      res.status(201).json({
        data: proof,
        meta: {
          requestId: req.requestId,
          message: "Payment proof submitted for independent bank ledger verification.",
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Protected Retrieval of Payment Proof File (Authorizes Admin session OR Guest Token)
publicOrdersRouter.get(
  "/proofs/:proofId/file",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { proofId } = req.params;
      const guestToken =
        (req.query.token as string) || (req.headers["x-guest-token"] as string);

      let adminUserId: string | undefined;
      const sessionToken = req.cookies?.[SESSION_COOKIE_NAME];
      if (sessionToken && typeof sessionToken === "string") {
        const sessionTokenHash = crypto
          .createHash("sha256")
          .update(sessionToken)
          .digest("hex");
        const session = await prisma.adminSession.findUnique({
          where: { sessionTokenHash },
          include: { adminUser: true },
        });
        if (
          session &&
          session.revokedAt === null &&
          session.expiresAt > new Date() &&
          session.adminUser.status === "ACTIVE"
        ) {
          adminUserId = session.adminUserId;
        }
      }

      const fileInfo = await commerceService.getProtectedPaymentProofFile(proofId, {
        adminUserId,
        guestToken,
      });

      res.setHeader("Content-Type", fileInfo.mimeType);
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Cache-Control", "private, no-cache, no-store, must-revalidate");
      if (fileInfo.signedUrl) {
        res.redirect(302, fileInfo.signedUrl);
        return;
      }
      res.setHeader("Content-Disposition", `inline; filename="${fileInfo.fileName}"`);
      res.sendFile(fileInfo.filePath);
    } catch (error) {
      next(error);
    }
  }
);

// Guest Request Cancellation
publicOrdersRouter.post(
  "/cancel",
  validateBody(cancelOrderSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await commerceService.cancelOrder(req.body);
      res.status(200).json({
        data: result,
        meta: {
          requestId: req.requestId,
          message: "Order cancelled successfully and reserved inventory released.",
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// =============================================================================
// Admin Orders Router (/api/v1/admin/orders)
// =============================================================================
export const adminOrdersRouter = Router();

adminOrdersRouter.use(authenticate, authorize(["ADMIN", "SUPPORT"]));

// Admin: List all orders with filters
adminOrdersRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));

    const result = await commerceService.listAdminOrders({ status, search, page, limit });
    res.status(200).json({
      data: result.items,
      pagination: result.pagination,
      meta: { requestId: req.requestId },
    });
  } catch (error) {
    next(error);
  }
});

// Admin: Get single order details
adminOrdersRouter.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await commerceService.getAdminOrderById(req.params.id);
    res.status(200).json({
      data: order,
      meta: { requestId: req.requestId },
    });
  } catch (error) {
    next(error);
  }
});

// Admin: Generate / Update final verified invoice
adminOrdersRouter.post(
  "/:id/invoice",
  validateBody(createInvoiceSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const adminId = req.adminUser?.id;
      const result = await commerceService.createInvoice(req.params.id, adminId, req.body);
      res.status(201).json({
        data: result,
        meta: {
          requestId: req.requestId,
          message: "Verified invoice issued and payment hold initiated.",
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Admin: reject a payment proof and request a corrected submission.
adminOrdersRouter.post(
  "/:id/reject-payment-proof",
  validateBody(rejectPaymentProofSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const adminId = req.adminUser?.id;
      const result = await commerceService.rejectPaymentProof(
        req.params.id,
        adminId,
        req.body.reason
      );
      res.status(200).json({
        data: result,
        meta: {
          requestId: req.requestId,
          message: "Payment proof rejected. The customer can submit a corrected proof; inventory remains reserved.",
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Admin: Verify payment (Never automated on screenshot upload alone!)
adminOrdersRouter.post(
  "/:id/verify-payment",
  validateBody(verifyPaymentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const adminId = req.adminUser?.id;
      const result = await commerceService.verifyPayment(req.params.id, adminId, req.body);
      res.status(200).json({
        data: result,
        meta: {
          requestId: req.requestId,
          message: "Payment independently verified. Order marked PAID and inventory decremented.",
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Admin: Create shipment dispatch
adminOrdersRouter.post(
  "/:id/ship",
  validateBody(createShipmentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const adminId = req.adminUser?.id;
      const result = await commerceService.createShipment(req.params.id, adminId, req.body);
      res.status(201).json({
        data: result,
        meta: {
          requestId: req.requestId,
          message: "Shipment booked and customer notified with tracking details.",
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Admin: Decide cancellation request (Approve or Reject)
adminOrdersRouter.post(
  "/:id/cancellation-decision",
  validateBody(adminCancellationDecisionSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const adminId = req.adminUser?.id;
      const result = await commerceService.decideCancellation(req.params.id, adminId, req.body);
      res.status(200).json({
        data: result,
        meta: {
          requestId: req.requestId,
          message: `Cancellation request ${req.body.decision.toLowerCase()} successfully.`,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Admin: Process manual bank/UPI refund
adminOrdersRouter.post(
  "/:id/refund",
  validateBody(processRefundSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const adminId = req.adminUser?.id;
      const result = await commerceService.processRefund(req.params.id, adminId, req.body);
      res.status(200).json({
        data: result,
        meta: {
          requestId: req.requestId,
          message: "Refund processed and bank transaction reference recorded.",
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// =============================================================================
// Admin Settings Router (/api/v1/admin/settings)
// =============================================================================
export const adminSettingsRouter = Router();

adminSettingsRouter.use(authenticate, authorize(["ADMIN"]));

adminSettingsRouter.get("/payment", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await commerceService.getStoreSettings();
    res.status(200).json({
      data: settings,
      meta: { requestId: req.requestId },
    });
  } catch (error) {
    next(error);
  }
});

adminSettingsRouter.put(
  "/payment",
  validateBody(updatePaymentSettingsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const adminId = req.adminUser?.id;
      const settings = await commerceService.updatePaymentSettings(adminId, req.body);
      res.status(200).json({
        data: settings,
        meta: {
          requestId: req.requestId,
          message: "Store payment settings updated successfully.",
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// =============================================================================
// WhatsApp Webhook & Admin Communication Router (/api/v1/whatsapp)
// =============================================================================
export const whatsappRouter = Router();

// Meta Cloud API Webhook Verification Handshake
whatsappRouter.get("/webhook", (req: Request, res: Response) => {
  const mode = req.query["hub.mode"] as string | undefined;
  const token = req.query["hub.verify_token"] as string | undefined;
  const challenge = req.query["hub.challenge"] as string | undefined;

  const verifiedChallenge = whatsappService.verifyWebhookHandshake(mode, token, challenge);
  if (verifiedChallenge) {
    res.status(200).send(verifiedChallenge);
    return;
  }
  res.status(403).json({ error: "Forbidden: verification token mismatch" });
});

// Inbound webhook from Meta Cloud API or test simulator
whatsappRouter.post("/webhook", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers["x-hub-signature-256"] as string | undefined;
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);

    const isValid = whatsappService.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      res.status(401).json({ error: { message: "Invalid webhook HMAC signature" } });
      return;
    }

    // Check if Meta Cloud API standard format
    if (req.body?.entry?.[0]?.changes?.[0]?.value) {
      const value = req.body.entry[0].changes[0].value;

      // Status updates
      if (value.statuses && Array.isArray(value.statuses)) {
        for (const st of value.statuses) {
          const statusMap: Record<string, "SENT" | "DELIVERED" | "READ" | "FAILED"> = {
            sent: "SENT",
            delivered: "DELIVERED",
            read: "READ",
            failed: "FAILED",
          };
          const mapped = statusMap[st.status] || "SENT";
          await whatsappService.handleDeliveryStatus({
            providerMessageId: st.id,
            status: mapped,
            errorMessage: st.errors?.[0]?.message,
          });
        }
      }

      // Incoming messages
      if (value.messages && Array.isArray(value.messages)) {
        for (const msg of value.messages) {
          const senderPhone = `+${msg.from}`;
          const messageText = msg.text?.body || msg.type || "Media message";
          await whatsappService.handleInboundMessage({
            senderPhone,
            messageText,
            providerMessageId: msg.id,
          });
        }
      }

      res.status(200).json({ status: "success", source: "meta_cloud_webhook" });
      return;
    }

    // Direct / simulator format
    const { senderPhone, messageText, providerMessageId } = req.body;
    if (!senderPhone || !messageText) {
      res.status(400).json({ error: { message: "senderPhone and messageText are required" } });
      return;
    }

    const result = await whatsappService.handleInboundMessage({
      senderPhone,
      messageText,
      providerMessageId,
    });

    res.status(200).json({
      status: "received",
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// Provider status and connectivity report
whatsappRouter.get("/provider-status", (req: Request, res: Response) => {
  res.status(200).json({
    data: whatsappService.getProviderInfo(),
    meta: { requestId: req.requestId },
  });
});

// Admin list of WhatsApp communications
whatsappRouter.get(
  "/messages",
  authenticate,
  authorize(["ADMIN", "SUPPORT"]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const recipientPhone = req.query.phone as string | undefined;
      const orderId = req.query.orderId as string | undefined;

      const where: any = {};
      if (recipientPhone) where.recipientPhone = recipientPhone;
      if (orderId) where.orderId = orderId;

      const messages = await prisma.whatsAppMessage.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      res.status(200).json({
        data: messages,
        meta: { requestId: req.requestId },
      });
    } catch (error) {
      next(error);
    }
  }
);
