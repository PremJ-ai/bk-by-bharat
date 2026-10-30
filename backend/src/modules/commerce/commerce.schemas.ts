import { z } from "zod";

export const guestCheckoutSchema = z.object({
  customerName: z.string().trim().min(2, "Full name is required").max(100),
  whatsappNumber: z
    .string()
    .trim()
    .regex(/^\+?[1-9]\d{7,14}$/, "Valid WhatsApp contact number with country code is required (e.g. +919876543210)"),
  email: z.string().trim().email("Valid email address is required").optional().or(z.literal("")),
  addressLine1: z.string().trim().min(5, "Delivery street address is required"),
  addressLine2: z.string().trim().optional(),
  city: z.string().trim().min(2, "City is required"),
  stateRegion: z.string().trim().min(2, "State / Region is required"),
  postalCode: z.string().trim().min(4, "Postal / ZIP code is required").max(12),
  country: z.string().trim().default("India"),
  deliveryNotes: z.string().trim().max(500).optional(),
  whatsappConsent: z
    .boolean({ error: "WhatsApp consent is required" })
    .refine((val) => val === true, {
      message: "Consent to receive order updates via WhatsApp is required",
    }),
  items: z
    .array(
      z.object({
        variantId: z.string().uuid("Valid variant identifier is required"),
        quantity: z.number().int().min(1, "Minimum quantity is 1").max(10, "Maximum quantity is 10"),
      })
    )
    .min(1, "At least one item is required to checkout"),
});

export type GuestCheckoutInput = z.infer<typeof guestCheckoutSchema>;

export const createInvoiceSchema = z.object({
  shippingPaise: z.number().int().min(0).default(0),
  otherFeePaise: z.number().int().min(0).default(0),
  otherFeeLabel: z.string().trim().max(100).optional(),
  taxPaise: z.number().int().min(0).default(0),
  discountPaise: z.number().int().min(0).default(0),
  paymentHoldHours: z.number().int().min(1).max(72).default(24),
  notes: z.string().trim().max(500).optional(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

export const submitPaymentProofSchema = z.object({
  token: z.string().trim().min(16, "Valid guest status token is required"),
  fileBase64: z.string().optional(),
  url: z.string().url().optional(),
  mimeType: z.string().default("image/jpeg"),
  transactionReference: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(500).optional(),
});

export type SubmitPaymentProofInput = z.infer<typeof submitPaymentProofSchema>;

export const verifyPaymentSchema = z.object({
  utrReference: z.string().trim().min(4, "UTR / Bank transaction reference is required"),
  adminNotes: z.string().trim().max(500).optional(),
});

export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;

export const createShipmentSchema = z.object({
  carrier: z.string().trim().min(2, "Carrier name is required (e.g. Blue Dart, DHL, Delhivery)"),
  trackingNumber: z.string().trim().min(2, "Tracking number / AWB is required"),
  trackingUrl: z.string().trim().url("Valid tracking URL is required").optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional(),
});

export type CreateShipmentInput = z.infer<typeof createShipmentSchema>;

export const cancelOrderSchema = z.object({
  token: z.string().trim().min(16, "Valid guest status token is required"),
  reason: z.string().trim().min(3, "Cancellation reason is required").max(500),
});

export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;

export const updatePaymentSettingsSchema = z.object({
  upiId: z.string().trim().min(3, "Valid UPI ID is required (e.g. atelier@bank)"),
  payeeName: z.string().trim().min(2, "Payee name is required"),
  paymentInstructions: z.string().trim().min(10, "Payment instructions are required"),
  whatsappNumber: z.string().trim().min(8, "Contact WhatsApp number is required"),
  shippingDefaultPaise: z.number().int().min(0).default(0),
  qrImageUrl: z.string().url().optional().or(z.literal("")),
});

export type UpdatePaymentSettingsInput = z.infer<typeof updatePaymentSettingsSchema>;

export const adminCancellationDecisionSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  reason: z.string().trim().max(500).optional(),
});

export type AdminCancellationDecisionInput = z.infer<typeof adminCancellationDecisionSchema>;

export const processRefundSchema = z.object({
  refundAmountPaise: z.number().int().min(1, "Refund amount must be greater than 0 paise"),
  refundReference: z.string().trim().min(4, "Bank UTR or refund transaction reference is required"),
  reason: z.string().trim().min(3, "Refund reason is required").max(500),
  adminNotes: z.string().trim().max(500).optional(),
});

export type ProcessRefundInput = z.infer<typeof processRefundSchema>;
