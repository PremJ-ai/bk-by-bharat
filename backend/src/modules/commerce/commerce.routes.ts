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
  verifyPaymentSchema,
  createShipmentSchema,
  cancelOrderSchema,
  updatePaymentSettingsSchema,
} from "./commerce.schemas.js";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";

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

adminOrdersRouter.use(authenticate, authorize(["ADMIN", "ORDER_MANAGER"]));

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

// Inbound webhook from customer or simulator
whatsappRouter.post("/webhook", async (req: Request, res: Response, next: NextFunction) => {
  try {
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

// Admin list of WhatsApp communications
whatsappRouter.get(
  "/messages",
  authenticate,
  authorize(["ADMIN", "ORDER_MANAGER"]),
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
