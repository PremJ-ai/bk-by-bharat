import { apiClient } from "./client";

export interface GuestCheckoutPayload {
  customerName: string;
  whatsappNumber: string;
  email?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  stateRegion: string;
  postalCode: string;
  country?: string;
  deliveryNotes?: string;
  whatsappConsent: boolean;
  items: { variantId: string; quantity: number }[];
}

export interface GuestCheckoutResult {
  orderNumber: string;
  guestStatusToken: string;
  status: string;
  subtotalPaise: number;
  totalPaise: number;
  currency: string;
  itemsCount: number;
}

export interface OrderItemModel {
  id: string;
  productName: string;
  sku: string;
  size: string;
  color: string;
  material: string;
  unitPricePaise: number;
  quantity: number;
  lineTotalPaise: number;
  imageUrl?: string | null;
}

export interface InvoiceModel {
  invoiceNumber: string;
  version: number;
  subtotalPaise: number;
  shippingPaise: number;
  otherFeePaise: number;
  otherFeeLabel?: string | null;
  taxPaise: number;
  discountPaise: number;
  totalPaise: number;
  createdAt: string;
}

export interface PaymentProofModel {
  id: string;
  url: string;
  status: "PENDING_REVIEW" | "VERIFIED" | "REJECTED";
  transactionReference?: string | null;
  receivedAt: string;
}

export interface ShipmentModel {
  id: string;
  carrier: string;
  trackingNumber: string;
  trackingUrl?: string | null;
  shippedAt: string;
}

export interface CancellationModel {
  id: string;
  status: string;
  reason: string;
  createdAt: string;
}

export interface PaymentDetailsModel {
  upiId: string;
  payeeName: string;
  paymentInstructions: string;
  upiDeepLink: string;
  qrImageUrl?: string | null;
}

export interface GuestOrderStatusModel {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  customerName: string;
  whatsappNumber: string;
  email?: string | null;
  shippingAddress: {
    line1: string;
    line2?: string | null;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  deliveryNotes?: string | null;
  subtotalPaise: number;
  shippingPaise: number;
  taxPaise: number;
  discountPaise: number;
  totalPaise: number;
  currency: string;
  paymentHoldExpiresAt?: string | null;
  createdAt: string;
  items: OrderItemModel[];
  invoice?: InvoiceModel | null;
  paymentProofs: PaymentProofModel[];
  shipments: ShipmentModel[];
  cancellationRequests: CancellationModel[];
  paymentDetails: PaymentDetailsModel;
}

export interface AdminOrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  customerName: string;
  whatsappNumber: string;
  email?: string | null;
  totalPaise: number;
  itemsCount: number;
  hasPendingProof: boolean;
  invoiceNumber?: string | null;
  createdAt: string;
}

export interface StoreSettingsModel {
  id: string;
  upiId: string;
  payeeName: string;
  paymentInstructions: string;
  whatsappNumber: string;
  shippingDefaultPaise: number;
  qrImageUrl?: string | null;
}

/**
 * Public: Submit Guest Order
 */
export async function submitGuestCheckout(
  payload: GuestCheckoutPayload
): Promise<GuestCheckoutResult> {
  const res = await apiClient<GuestCheckoutResult>("/orders/checkout", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

/**
 * Public: Fetch Guest Order Status by Token
 */
export async function getGuestOrderStatus(
  token: string
): Promise<GuestOrderStatusModel> {
  const res = await apiClient<GuestOrderStatusModel>(
    `/orders/status?token=${encodeURIComponent(token)}`
  );
  return res.data;
}

/**
 * Public: request a short-lived signed upload URL for a private payment screenshot.
 */
export async function createPaymentProofUploadUrl(payload: {
  token: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  fileSizeBytes: number;
}): Promise<{ signedUploadUrl: string; storageKey: string }> {
  const res = await apiClient<{ signedUploadUrl: string; storageKey: string }>(
    "/orders/payment-proof/upload-url",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
  return res.data;
}

/**
 * Public: submit proof metadata after the direct private-storage upload completes.
 */
export async function submitPaymentProof(payload: {
  token: string;
  storageKey: string;
  fileSizeBytes: number;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  transactionReference: string;
  notes?: string;
}): Promise<PaymentProofModel> {
  const res = await apiClient<PaymentProofModel>("/orders/payment-proof", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

/**
 * Public: Request Order Cancellation
 */
export async function cancelGuestOrder(
  token: string,
  reason: string
): Promise<{ status: string }> {
  const res = await apiClient<{ status: string }>("/orders/cancel", {
    method: "POST",
    body: JSON.stringify({ token, reason }),
  });
  return res.data;
}

/**
 * Admin: List Orders
 */
export async function getAdminOrders(params?: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: AdminOrderSummary[]; total: number }> {
  const query = new URLSearchParams();
  if (params?.status && params.status !== "ALL") query.set("status", params.status);
  if (params?.search) query.set("search", params.search);
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));

  const qs = query.toString();
  const res = await apiClient<AdminOrderSummary[]>(`/admin/orders${qs ? `?${qs}` : ""}`);
  return {
    items: res.data || [],
    total: res.pagination?.total || (res.data || []).length,
  };
}

/**
 * Admin: Get Order Detail
 */
export async function getAdminOrderById(orderId: string): Promise<any> {
  const res = await apiClient<any>(`/admin/orders/${orderId}`);
  return res.data;
}

/**
 * Admin: Issue Verified Invoice
 */
export async function issueAdminInvoice(
  orderId: string,
  payload: {
    shippingPaise?: number;
    otherFeePaise?: number;
    otherFeeLabel?: string;
    taxPaise?: number;
    discountPaise?: number;
    paymentHoldHours?: number;
    notes?: string;
  }
): Promise<any> {
  const res = await apiClient<any>(`/admin/orders/${orderId}/invoice`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

/**
 * Admin: Verify Payment
 */
export async function verifyAdminPayment(
  orderId: string,
  payload: {
    utrReference: string;
    adminNotes?: string;
  }
): Promise<any> {
  const res = await apiClient<any>(`/admin/orders/${orderId}/verify-payment`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

/**
 * Admin: Dispatch Shipment
 */
export async function shipAdminOrder(
  orderId: string,
  payload: {
    carrier: string;
    trackingNumber: string;
    trackingUrl?: string;
    notes?: string;
  }
): Promise<any> {
  const res = await apiClient<any>(`/admin/orders/${orderId}/ship`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

/**
 * Admin: Get Store Payment Settings
 */
export async function getStorePaymentSettings(): Promise<StoreSettingsModel> {
  const res = await apiClient<StoreSettingsModel>("/admin/settings/payment");
  return res.data;
}

/**
 * Admin: Update Store Payment Settings
 */
export async function updateStorePaymentSettings(
  payload: Partial<StoreSettingsModel>
): Promise<StoreSettingsModel> {
  const res = await apiClient<StoreSettingsModel>("/admin/settings/payment", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return res.data;
}

/**
 * Admin: Decide Cancellation Request (Approve or Reject)
 */
export async function decideAdminCancellation(
  orderId: string,
  payload: {
    decision: "APPROVED" | "REJECTED";
    reason?: string;
  }
): Promise<any> {
  const res = await apiClient<any>(`/admin/orders/${orderId}/cancellation-decision`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

/**
 * Admin: Process Manual Bank/UPI Refund
 */
export async function processAdminRefund(
  orderId: string,
  payload: {
    refundAmountPaise: number;
    refundReference: string;
    reason: string;
    adminNotes?: string;
  }
): Promise<any> {
  const res = await apiClient<any>(`/admin/orders/${orderId}/refund`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

/**
 * Admin: Get WhatsApp Messages
 */
export async function getWhatsAppMessages(params?: {
  phone?: string;
  orderId?: string;
}): Promise<any[]> {
  const query = new URLSearchParams();
  if (params?.phone) query.set("phone", params.phone);
  if (params?.orderId) query.set("orderId", params.orderId);

  const qs = query.toString();
  const res = await apiClient<any[]>(`/whatsapp/messages${qs ? `?${qs}` : ""}`);
  return res.data || [];
}
