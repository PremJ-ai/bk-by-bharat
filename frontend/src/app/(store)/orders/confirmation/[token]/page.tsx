"use client";

import { use, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { formatINR } from "@/components/product/ProductCard";
import {
  getGuestOrderStatus,
  submitPaymentProof,
  cancelGuestOrder,
  type GuestOrderStatusModel,
} from "@/lib/api/commerce";
import {
  CheckCircle,
  MessageSquare,
  Clock,
  MapPin,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  X,
  Upload,
  Copy,
  Check,
  Truck,
  Loader2,
  QrCode,
  DollarSign,
} from "lucide-react";

interface ConfirmationPageProps {
  params: Promise<{ token: string }>;
}

export default function OrderConfirmationPage({ params }: ConfirmationPageProps) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  const [order, setOrder] = useState<GuestOrderStatusModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cancellation State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(false);

  // Payment Proof State
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [utrReference, setUtrReference] = useState("");
  const [proofNotes, setProofNotes] = useState("");
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);
  const [proofFeedback, setProofFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchOrder = () => {
    getGuestOrderStatus(token)
      .then((data) => {
        setOrder(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err?.message || "Failed to retrieve order manifest.");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchOrder();
    // Periodically refresh order status every 20 seconds
    const interval = setInterval(fetchOrder, 20000);
    return () => clearInterval(interval);
  }, [token]);

  const handleCopyUpi = () => {
    if (!order?.paymentDetails?.upiId) return;
    navigator.clipboard.writeText(order.paymentDetails.upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleProofFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProofFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setProofPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handlePaymentProofSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofPreview && !utrReference.trim()) {
      setProofFeedback({
        type: "error",
        message: "Please upload your payment screenshot or provide the 12-digit UPI/Bank UTR reference.",
      });
      return;
    }

    try {
      setIsSubmittingProof(true);
      setProofFeedback(null);

      await submitPaymentProof({
        token,
        fileBase64: proofPreview || undefined,
        mimeType: proofFile?.type || "image/jpeg",
        transactionReference: utrReference.trim() || undefined,
        notes: proofNotes.trim() || undefined,
      });

      setProofFeedback({
        type: "success",
        message: "Payment proof submitted successfully. Our accounting desk is verifying the transaction.",
      });
      setProofFile(null);
      setProofPreview(null);
      setUtrReference("");
      setProofNotes("");
      fetchOrder(); // Refresh status immediately
    } catch (err: any) {
      setProofFeedback({
        type: "error",
        message: err?.message || "Failed to submit payment proof.",
      });
    } finally {
      setIsSubmittingProof(false);
    }
  };

  const handleCancelOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelReason.trim()) return;

    try {
      setIsCancelling(true);
      await cancelGuestOrder(token, cancelReason);
      setCancelSuccess(true);
      setTimeout(() => {
        setShowCancelModal(false);
        fetchOrder();
      }, 1200);
    } catch (err: any) {
      alert(err?.message || "Failed to cancel order.");
    } finally {
      setIsCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-6 text-ink">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-navy" />
          <p className="text-xs uppercase tracking-caps text-muted">Retrieving Order Manifest &amp; Ledger...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-6 text-ink">
        <AlertCircle className="w-10 h-10 text-crimson mb-3" />
        <h2 className="font-display text-xl mb-1">Order Not Found</h2>
        <p className="text-xs text-muted mb-6">{error || "The tracking token is invalid or has expired."}</p>
        <Link href="/" className="px-5 py-2.5 bg-navy text-canvas text-xs uppercase tracking-caps font-semibold">
          Return to Storefront
        </Link>
      </div>
    );
  }

  const isAwaitingReview = order.status === "AWAITING_ADMIN_REVIEW";
  const isAwaitingPayment = order.status === "AWAITING_CUSTOMER_PAYMENT";
  const isProofReceived = order.status === "PAYMENT_PROOF_RECEIVED";
  const isPaid = order.status === "PAID" || order.status === "PROCESSING";
  const isShipped = order.status === "SHIPPED" || order.status === "DELIVERED";
  const isCancelled = order.status === "CANCELLED";

  const qrImageUrl =
    order.paymentDetails?.qrImageUrl ||
    `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
      order.paymentDetails?.upiDeepLink || ""
    )}`;

  const whatsappInquiryUrl = `https://wa.me/?text=${encodeURIComponent(
    `Hello Bharat Atelier, inquiring regarding my order ${order.orderNumber}.`
  )}`;

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-ink">
      <AnnouncementBar />
      <SiteHeader />

      <main className="flex-1 max-w-[1040px] w-full mx-auto px-6 md:px-12 py-12">
        {/* Order Status Banner */}
        <div className="bg-surface border border-border p-8 md:p-12 text-center space-y-4 relative overflow-hidden mb-10 shadow-xs">
          <div
            className={`absolute top-0 left-0 right-0 h-[3px] ${
              isCancelled
                ? "bg-crimson"
                : isPaid || isShipped
                ? "bg-stock-ok"
                : "bg-gold"
            }`}
          />

          <div
            className={`inline-flex items-center justify-center w-14 h-14 rounded-full mx-auto ${
              isCancelled
                ? "bg-crimson/10 text-crimson"
                : isPaid || isShipped
                ? "bg-stock-ok/10 text-stock-ok"
                : "bg-gold/10 text-gold"
            }`}
          >
            {isCancelled ? (
              <X className="w-7 h-7" />
            ) : isPaid || isShipped ? (
              <CheckCircle className="w-7 h-7" />
            ) : (
              <Clock className="w-7 h-7" />
            )}
          </div>

          <span className="text-xs uppercase tracking-caps text-gold font-medium block">
            {isAwaitingReview && "Order Staged · Master Tailor Review Underway"}
            {isAwaitingPayment && "Invoice Ready · Payment Requested"}
            {isProofReceived && "Payment Proof Submitted · In Ledger Verification"}
            {isPaid && "Payment Confirmed · Garments in Tailoring Queue"}
            {isShipped && "Dispatched via Luxury Courier"}
            {isCancelled && "Order Cancelled"}
          </span>

          <h1 className="font-display text-3xl sm:text-4xl text-ink font-normal">
            {isCancelled
              ? `Order Cancelled`
              : `Thank You, ${order.customerName}`}
          </h1>

          <p className="text-muted text-sm max-w-lg mx-auto leading-relaxed font-sans">
            {isAwaitingReview &&
              "Your bespoke garment request has been recorded. Our master tailors are verifying the textile lot and will dispatch your verified bill shortly."}
            {isAwaitingPayment &&
              "Your personalized invoice has been issued. Please scan the verified UPI QR code below or tap to pay with any UPI app."}
            {isProofReceived &&
              "We have received your payment screenshot. Our accounting desk is cross-verifying the UTR against our bank settlement ledger."}
            {isPaid &&
              "Your payment is verified. Your garment is now individually scheduled for hand-cutting, stitching, and finishing in our Delhi atelier."}
            {isShipped &&
              "Your heirloom garment has completed hand inspection, pressing, and has been dispatched with luxury tracking."}
            {isCancelled && "This order has been cancelled and any reserved inventory has been released."}
          </p>

          <div className="pt-2 inline-flex flex-wrap items-center justify-center gap-3 text-xs font-mono">
            <span className="bg-surface-muted px-3.5 py-1.5 border border-border">
              <span className="text-muted">Ref: </span>
              <span className="font-semibold text-ink">{order.orderNumber}</span>
            </span>
            <span className="bg-surface-muted px-3.5 py-1.5 border border-border">
              <span className="text-muted">Status: </span>
              <span className="font-semibold text-ink">{order.status}</span>
            </span>
          </div>
        </div>

        {/* Dynamic Action: QR Code & Payment Section (When Awaiting Payment or Proof Upload) */}
        {(isAwaitingPayment || isProofReceived) && (
          <div className="bg-surface border-2 border-gold/40 p-6 md:p-8 mb-10 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-4">
              <div>
                <span className="text-[10px] uppercase tracking-caps text-gold font-semibold flex items-center space-x-1">
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Interactive UPI Settlement</span>
                </span>
                <h3 className="font-display text-2xl text-ink font-normal mt-0.5">
                  Verified Payment Instructions
                </h3>
              </div>
              <div className="text-right">
                <span className="text-xs text-muted block uppercase tracking-caps">Payable Amount</span>
                <span className="font-display text-2xl text-ink font-medium">
                  {formatINR(order.totalPaise)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              {/* QR Code Frame */}
              <div className="md:col-span-5 flex flex-col items-center p-4 bg-canvas border border-border text-center space-y-3">
                <img
                  src={qrImageUrl}
                  alt={`UPI QR Code for ${order.orderNumber}`}
                  className="w-48 h-48 rounded bg-white p-2 border border-border"
                />
                <div className="space-y-1">
                  <span className="text-[11px] text-muted block font-sans">
                    Scan using GPay, PhonePe, Paytm, or BHIM
                  </span>
                  <div className="flex items-center justify-center space-x-1.5 font-mono text-xs text-ink font-semibold bg-surface-muted px-2 py-1 border border-border">
                    <span>{order.paymentDetails.upiId}</span>
                    <button
                      type="button"
                      onClick={handleCopyUpi}
                      className="p-1 hover:text-gold transition-colors"
                      title="Copy UPI ID"
                    >
                      {copiedUpi ? <Check className="w-3.5 h-3.5 text-stock-ok" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <a
                  href={order.paymentDetails.upiDeepLink}
                  className="w-full bg-navy hover:bg-gold hover:text-navy text-canvas py-2.5 text-xs uppercase tracking-caps font-semibold flex items-center justify-center space-x-2 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open UPI App Directly</span>
                </a>
              </div>

              {/* Payment Proof Upload Form */}
              <div className="md:col-span-7 space-y-4">
                <div className="space-y-1">
                  <h4 className="text-xs uppercase tracking-caps text-ink font-semibold">
                    Submit Payment Screenshot / UTR Reference
                  </h4>
                  <p className="text-xs text-muted leading-relaxed font-sans">
                    Once you execute the UPI payment, please upload your transaction receipt or enter your 12-digit bank reference number. An accountant will independently verify the credit.
                  </p>
                </div>

                {proofFeedback && (
                  <div
                    className={`p-3 text-xs flex items-center space-x-2 border ${
                      proofFeedback.type === "success"
                        ? "bg-stock-ok/10 border-stock-ok/30 text-stock-ok"
                        : "bg-crimson/10 border-crimson/30 text-crimson"
                    }`}
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{proofFeedback.message}</span>
                  </div>
                )}

                <form onSubmit={handlePaymentProofSubmit} className="space-y-3">
                  <div>
                    <label className="text-[11px] uppercase tracking-caps text-muted font-medium block mb-1">
                      Bank Transaction UTR / Ref *
                    </label>
                    <input
                      type="text"
                      value={utrReference}
                      onChange={(e) => setUtrReference(e.target.value)}
                      placeholder="e.g. 402918274192"
                      className="w-full bg-canvas border border-border p-2.5 text-xs text-ink font-mono focus:border-gold focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] uppercase tracking-caps text-muted font-medium block mb-1">
                      Upload Receipt Screenshot
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleProofFileSelect}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full border border-dashed border-border hover:border-gold p-3 text-xs text-muted flex items-center justify-center space-x-2 transition-colors bg-canvas"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{proofFile ? proofFile.name : "Select Screenshot / Proof Image"}</span>
                    </button>
                    {proofPreview && (
                      <div className="mt-2 text-center">
                        <img
                          src={proofPreview}
                          alt="Proof preview"
                          className="h-20 mx-auto rounded border border-border object-contain"
                        />
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingProof}
                    className="w-full bg-navy hover:bg-gold hover:text-navy text-canvas py-2.5 text-xs uppercase tracking-caps font-semibold flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
                  >
                    {isSubmittingProof ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Transmitting Proof to Atelier...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Confirm &amp; Submit Proof</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Shipment Tracking Section (When Shipped) */}
        {isShipped && order.shipments?.length > 0 && (
          <div className="bg-surface border border-stock-ok/40 p-6 md:p-8 mb-10 space-y-4">
            <div className="flex items-center space-x-2 text-stock-ok">
              <Truck className="w-5 h-5" />
              <h3 className="font-display text-xl text-ink font-medium">Garment Dispatched</h3>
            </div>
            {order.shipments.map((s) => (
              <div key={s.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-canvas border border-border text-xs">
                <div>
                  <span className="text-muted block text-[11px] uppercase tracking-caps">Courier &middot; AWB</span>
                  <span className="font-semibold text-ink text-sm">{s.carrier}</span>
                  <span className="font-mono text-muted ml-2">({s.trackingNumber})</span>
                </div>
                {s.trackingUrl && (
                  <a
                    href={s.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-navy hover:bg-gold hover:text-navy text-canvas text-xs uppercase tracking-caps font-semibold flex items-center space-x-1.5 transition-colors"
                  >
                    <span>Track Live Delivery</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Order Details & Invoicing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          {/* Reserved Items */}
          <div className="bg-surface border border-border p-6 space-y-4">
            <h3 className="font-display text-lg text-ink font-medium border-b border-border pb-2">
              Garments in Manifest
            </h3>
            <div className="divide-y divide-border/60">
              {order.items.map((item, i) => (
                <div key={i} className="py-3 first:pt-0 last:pb-0 flex justify-between text-xs font-sans">
                  <div>
                    <h5 className="font-medium text-ink">{item.productName}</h5>
                    <p className="text-muted text-[11px] mt-0.5">
                      Size: {item.size} {item.color ? `· ${item.color}` : ""} · Qty: {item.quantity}
                    </p>
                  </div>
                  <span className="font-semibold text-ink tabular-nums">
                    {formatINR(item.lineTotalPaise)}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-border space-y-1.5 text-xs">
              <div className="flex justify-between text-muted">
                <span>Subtotal</span>
                <span className="tabular-nums font-mono">{formatINR(order.subtotalPaise)}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Tailored Shipping</span>
                <span className="tabular-nums font-mono">
                  {order.shippingPaise === 0 ? "Complimentary" : formatINR(order.shippingPaise)}
                </span>
              </div>
              {order.taxPaise > 0 && (
                <div className="flex justify-between text-muted">
                  <span>GST / Tax</span>
                  <span className="tabular-nums font-mono">{formatINR(order.taxPaise)}</span>
                </div>
              )}
              {order.discountPaise > 0 && (
                <div className="flex justify-between text-stock-ok">
                  <span>Courtesy Discount</span>
                  <span className="tabular-nums font-mono">-{formatINR(order.discountPaise)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-semibold text-ink pt-2 border-t border-border">
                <span>Total Payable</span>
                <span className="tabular-nums font-mono">{formatINR(order.totalPaise)}</span>
              </div>
            </div>
          </div>

          {/* Destination & Support */}
          <div className="bg-surface border border-border p-6 space-y-4">
            <h3 className="font-display text-lg text-ink font-medium border-b border-border pb-2">
              Delivery Destination &amp; Support
            </h3>
            <div className="text-xs text-muted leading-relaxed space-y-1 font-sans">
              <p className="font-semibold text-ink">{order.customerName}</p>
              <p>{order.shippingAddress.line1}</p>
              {order.shippingAddress.line2 && <p>{order.shippingAddress.line2}</p>}
              <p>
                {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
              </p>
              <p className="pt-1 text-ink font-mono">WhatsApp: {order.whatsappNumber}</p>
            </div>

            <div className="pt-3 border-t border-border space-y-2">
              <a
                href={whatsappInquiryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-[#25D366] hover:bg-[#1EBE5D] text-white py-2.5 px-4 text-xs uppercase tracking-caps font-semibold flex items-center justify-center space-x-2 transition-colors rounded shadow-xs"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Message Atelier on WhatsApp</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              {(isAwaitingReview || isAwaitingPayment) && (
                <button
                  type="button"
                  onClick={() => setShowCancelModal(true)}
                  className="w-full py-2.5 text-xs uppercase tracking-caps text-muted hover:text-crimson transition-colors block text-center"
                >
                  Request Order Cancellation
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Cancellation Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 z-50 bg-navy/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-canvas border border-border max-w-md w-full p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="font-display text-lg text-ink font-normal">Cancel Order</h3>
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="text-muted hover:text-ink"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {cancelSuccess ? (
                <div className="py-4 text-center space-y-2">
                  <CheckCircle className="w-8 h-8 text-stock-ok mx-auto" />
                  <p className="text-xs text-ink">Order cancelled successfully. Reserved stock has been released.</p>
                </div>
              ) : (
                <form onSubmit={handleCancelOrder} className="space-y-4">
                  <p className="text-xs text-muted leading-relaxed font-sans">
                    Are you sure you wish to cancel this order? Any reserved inventory will be released immediately.
                  </p>

                  <div className="space-y-1">
                    <label className="text-[11px] uppercase tracking-caps text-muted block">
                      Reason for cancellation *
                    </label>
                    <textarea
                      rows={3}
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      required
                      placeholder="e.g. Sizing adjustment or changed mind..."
                      className="w-full bg-surface border border-border p-2.5 text-xs text-ink focus:border-gold focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end space-x-2 pt-2 border-t border-border">
                    <button
                      type="button"
                      onClick={() => setShowCancelModal(false)}
                      className="px-4 py-2 border border-border text-xs uppercase tracking-caps font-medium text-muted hover:text-ink"
                    >
                      Keep Order
                    </button>
                    <button
                      type="submit"
                      disabled={isCancelling}
                      className="px-4 py-2 bg-crimson text-white text-xs uppercase tracking-caps font-semibold hover:opacity-90 disabled:opacity-50"
                    >
                      {isCancelling ? "Cancelling..." : "Confirm Cancellation"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
