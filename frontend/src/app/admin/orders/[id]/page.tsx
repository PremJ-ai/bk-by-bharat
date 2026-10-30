"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { formatINR } from "@/components/product/ProductCard";
import {
  getAdminOrderById,
  issueAdminInvoice,
  verifyAdminPayment,
  shipAdminOrder,
  decideAdminCancellation,
  processAdminRefund,
} from "@/lib/api/commerce";
import {
  ArrowLeft,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Truck,
  DollarSign,
  ShieldCheck,
  Send,
  ExternalLink,
  FileText,
  Clock,
  Loader2,
  RefreshCw,
  Eye,
  Check,
} from "lucide-react";

interface AdminOrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function AdminOrderDetailPage({ params }: AdminOrderDetailPageProps) {
  const resolvedParams = use(params);
  const orderId = resolvedParams.id;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Invoice Builder State
  const [shippingRupees, setShippingRupees] = useState("0");
  const [taxRupees, setTaxRupees] = useState("0");
  const [discountRupees, setDiscountRupees] = useState("0");
  const [isIssuingInvoice, setIsIssuingInvoice] = useState(false);

  // Payment Verification State
  const [utrReference, setUtrReference] = useState("");
  const [verifierNotes, setVerifierNotes] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  // Shipment State
  const [carrier, setCarrier] = useState("Blue Dart Apex Express");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [isShipping, setIsShipping] = useState(false);

  // Cancellation Decision State
  const [cancellationReason, setCancellationReason] = useState("");
  const [isDecidingCancellation, setIsDecidingCancellation] = useState(false);

  // Refund Processing State
  const [refundRupees, setRefundRupees] = useState("");
  const [refundUtr, setRefundUtr] = useState("");
  const [refundReason, setRefundReason] = useState("Manual refund to original payment source");
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);

  const loadOrderDetail = async () => {
    try {
      const data = await getAdminOrderById(orderId);
      setOrder(data);
      // Pre-fill invoice defaults
      setShippingRupees(String(Math.round((data.shippingPaise || 0) / 100)));
      setTaxRupees(String(Math.round((data.taxPaise || 0) / 100)));
      setDiscountRupees(String(Math.round((data.discountPaise || 0) / 100)));

      // Pre-fill latest proof UTR if available
      const latestProof = data.paymentProofs?.[0];
      if (latestProof?.transactionReference) {
        setUtrReference(latestProof.transactionReference);
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Failed to load order." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrderDetail();
  }, [orderId]);

  const handleIssueInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsIssuingInvoice(true);
      setFeedback(null);

      const shippingPaise = (parseInt(shippingRupees, 10) || 0) * 100;
      const taxPaise = (parseInt(taxRupees, 10) || 0) * 100;
      const discountPaise = (parseInt(discountRupees, 10) || 0) * 100;

      await issueAdminInvoice(orderId, {
        shippingPaise,
        taxPaise,
        discountPaise,
      });

      setFeedback({
        type: "success",
        message: "Final verified invoice issued and stock reservation locked. Customer notified on WhatsApp.",
      });
      await loadOrderDetail();
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Failed to issue invoice." });
    } finally {
      setIsIssuingInvoice(false);
    }
  };

  const handleVerifyPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!utrReference.trim()) {
      setFeedback({ type: "error", message: "UTR / Transaction reference is required to verify payment." });
      return;
    }

    try {
      setIsVerifying(true);
      setFeedback(null);

      await verifyAdminPayment(orderId, {
        utrReference: utrReference.trim(),
        adminNotes: verifierNotes.trim() || undefined,
      });

      setFeedback({
        type: "success",
        message: "Payment verified against bank settlement ledger! Order marked PAID and inventory decremented.",
      });
      await loadOrderDetail();
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Payment verification failed." });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleShipOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!carrier.trim() || !trackingNumber.trim()) {
      setFeedback({ type: "error", message: "Carrier and tracking number are required." });
      return;
    }

    try {
      setIsShipping(true);
      setFeedback(null);

      await shipAdminOrder(orderId, {
        carrier: carrier.trim(),
        trackingNumber: trackingNumber.trim(),
        trackingUrl: trackingUrl.trim() || undefined,
      });

      setFeedback({
        type: "success",
        message: "Shipment recorded and customer notified with tracking details on WhatsApp.",
      });
      await loadOrderDetail();
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Failed to dispatch shipment." });
    } finally {
      setIsShipping(false);
    }
  };

  const handleCancellationDecision = async (decision: "APPROVED" | "REJECTED") => {
    try {
      setIsDecidingCancellation(true);
      setFeedback(null);
      await decideAdminCancellation(orderId, {
        decision,
        reason: cancellationReason.trim() || undefined,
      });
      setFeedback({
        type: "success",
        message: `Cancellation request ${decision.toLowerCase()} successfully.`,
      });
      setCancellationReason("");
      await loadOrderDetail();
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Failed to submit cancellation decision." });
    } finally {
      setIsDecidingCancellation(false);
    }
  };

  const handleProcessRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsProcessingRefund(true);
      setFeedback(null);
      const refundAmountPaise = Math.round(parseFloat(refundRupees) * 100);
      await processAdminRefund(orderId, {
        refundAmountPaise,
        refundReference: refundUtr.trim(),
        reason: refundReason.trim(),
      });
      setFeedback({
        type: "success",
        message: "Manual refund recorded and ledger updated.",
      });
      setRefundRupees("");
      setRefundUtr("");
      await loadOrderDetail();
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Failed to process refund." });
    } finally {
      setIsProcessingRefund(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-navy" />
        <p className="text-xs text-muted uppercase tracking-caps">Loading order manifest &amp; audit history...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-24 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-crimson mx-auto" />
        <p className="text-sm font-medium">Order not found.</p>
        <Link href="/admin/orders" className="text-xs text-gold uppercase tracking-caps">
          &larr; Back to Orders Queue
        </Link>
      </div>
    );
  }

  const isAwaitingReview = order.status === "AWAITING_ADMIN_REVIEW";
  const isAwaitingPayment = order.status === "AWAITING_CUSTOMER_PAYMENT";
  const isProofReceived = order.status === "PAYMENT_PROOF_RECEIVED";
  const isPaid = order.status === "PAID" || order.status === "PROCESSING";
  const isShipped = order.status === "SHIPPED" || order.status === "DELIVERED";

  const currentInvoice = order.invoices?.find((inv: any) => inv.isCurrent) || order.invoices?.[0];

  const calcSubtotal = order.subtotalPaise;
  const calcShipping = (parseInt(shippingRupees, 10) || 0) * 100;
  const calcTax = (parseInt(taxRupees, 10) || 0) * 100;
  const calcDiscount = (parseInt(discountRupees, 10) || 0) * 100;
  const previewGrandTotal = Math.max(0, calcSubtotal + calcShipping + calcTax - calcDiscount);

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div className="flex items-center space-x-4">
          <Link
            href="/admin/orders"
            className="p-2 border border-border hover:border-gold hover:text-gold transition-colors text-muted"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs uppercase tracking-caps text-gold font-semibold font-mono">
                {order.orderNumber}
              </span>
              <span className="text-xs font-mono px-2 py-0.5 bg-surface border border-border">
                {order.status}
              </span>
            </div>
            <h1 className="font-display text-2xl text-ink font-normal mt-0.5">
              Patron: {order.customerName}
            </h1>
          </div>
        </div>

        <button
          type="button"
          onClick={loadOrderDetail}
          className="inline-flex items-center space-x-2 bg-surface border border-border px-3.5 py-1.5 text-xs uppercase tracking-caps font-semibold text-ink hover:border-gold transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Sync Order</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`p-3 text-xs flex items-center space-x-2 border ${
            feedback.type === "success"
              ? "bg-stock-ok/10 border-stock-ok/30 text-stock-ok"
              : "bg-crimson/10 border-crimson/30 text-crimson"
          }`}
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Main Grid: 7 cols left (manifest, invoice, proof) / 5 cols right (actions) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section 1: Customer & Delivery Details */}
          <div className="bg-surface border border-border p-6 space-y-3">
            <h2 className="text-xs uppercase tracking-caps text-muted font-semibold pb-2 border-b border-border">
              Patron Contact &amp; Shipping Destination
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-muted block text-[11px]">WhatsApp &middot; Phone</span>
                <span className="font-mono font-semibold text-ink">{order.whatsappNumber}</span>
                {order.email && <span className="block text-muted">{order.email}</span>}
              </div>
              <div>
                <span className="text-muted block text-[11px]">Delivery Address</span>
                <p className="text-ink leading-relaxed">
                  {order.addressLine1}
                  {order.addressLine2 && `, ${order.addressLine2}`}
                  <br />
                  {order.city}, {order.stateRegion} {order.postalCode}
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Manifest Items */}
          <div className="bg-surface border border-border p-6 space-y-4">
            <h2 className="text-xs uppercase tracking-caps text-muted font-semibold pb-2 border-b border-border">
              Ordered Garments &amp; Inventory Snapshots
            </h2>
            <div className="divide-y divide-border/60">
              {order.items.map((item: any) => (
                <div key={item.id} className="py-3 first:pt-0 last:pb-0 flex justify-between items-center text-xs">
                  <div>
                    <h4 className="font-medium text-ink text-sm">{item.productName}</h4>
                    <p className="text-muted text-[11px] mt-0.5 font-mono">
                      SKU: {item.sku} &middot; Size {item.size} &middot; Qty: {item.quantity}
                    </p>
                  </div>
                  <span className="font-mono font-semibold text-ink tabular-nums text-sm">
                    {formatINR(item.lineTotalPaise)}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-border flex justify-between text-xs font-semibold">
              <span>Items Subtotal</span>
              <span className="font-mono tabular-nums">{formatINR(order.subtotalPaise)}</span>
            </div>
          </div>

          {/* Section 3: Uploaded Payment Proofs (if any) */}
          <div className="bg-surface border border-border p-6 space-y-4">
            <h2 className="text-xs uppercase tracking-caps text-muted font-semibold pb-2 border-b border-border flex items-center justify-between">
              <span>Customer Payment Proofs &amp; Bank UTR</span>
              <span className="text-[10px] text-muted">
                {order.paymentProofs?.length || 0} proof(s) submitted
              </span>
            </h2>

            {order.paymentProofs?.length === 0 ? (
              <p className="text-xs text-muted py-2">No payment screenshots submitted by patron yet.</p>
            ) : (
              <div className="space-y-4">
                {order.paymentProofs.map((p: any) => (
                  <div key={p.id} className="p-3 bg-canvas border border-border space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-semibold text-ink">
                        UTR: {p.transactionReference || "Unspecified by patron"}
                      </span>
                      <span
                        className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded ${
                          p.status === "VERIFIED"
                            ? "bg-stock-ok/10 text-stock-ok"
                            : "bg-rust/10 text-rust"
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>

                    {p.url && (
                      <div className="pt-2">
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-2 text-gold hover:underline text-xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Full-Size Receipt Image</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 4: Cancellation Requests & Refund Records */}
          <div className="bg-surface border border-border p-6 space-y-4">
            <h2 className="text-xs uppercase tracking-caps text-muted font-semibold pb-2 border-b border-border flex items-center justify-between">
              <span>Cancellation &amp; Refund Ledger</span>
              <span className="text-[10px] text-muted">
                {(order.cancellationRequests?.length || 0) + (order.refundRecords?.length || 0)} event(s)
              </span>
            </h2>

            {order.cancellationRequests?.length === 0 && (!order.refundRecords || order.refundRecords.length === 0) ? (
              <p className="text-xs text-muted py-2">No cancellation or refund events on record.</p>
            ) : (
              <div className="space-y-3">
                {order.cancellationRequests?.map((c: any) => (
                  <div key={c.id} className="p-3 bg-canvas border border-border space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-ink">
                        Cancellation Request ({c.source})
                      </span>
                      <span
                        className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded ${
                          c.status === "APPROVED"
                            ? "bg-stock-ok/10 text-stock-ok"
                            : c.status === "REJECTED"
                            ? "bg-crimson/10 text-crimson"
                            : "bg-gold/10 text-gold"
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>
                    <p className="text-muted text-[11px]">{c.reason}</p>
                    <span className="text-[10px] text-muted/70 block">
                      {new Date(c.createdAt).toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}

                {order.refundRecords?.map((r: any) => (
                  <div key={r.id} className="p-3 bg-canvas border border-border space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-ink">
                        Refund: {formatINR(r.amountPaise)}
                      </span>
                      <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-stock-ok/10 text-stock-ok">
                        {r.status}
                      </span>
                    </div>
                    <p className="text-muted text-[11px]">
                      UTR: <span className="font-mono text-ink">{r.transactionReference}</span> &middot; {r.reason}
                    </p>
                    <span className="text-[10px] text-muted/70 block">
                      {new Date(r.processedAt || r.createdAt).toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Workflow Action Panels (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Action 1: Verified Invoice Builder */}
          <div className="bg-surface border border-border p-6 space-y-4">
            <div className="border-b border-border pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-caps text-gold font-semibold">
                  Step 01
                </span>
                <h3 className="font-display text-lg text-ink font-normal">
                  Issue Verified Invoice
                </h3>
              </div>
              {currentInvoice && (
                <span className="text-[10px] font-mono text-muted bg-surface-muted px-2 py-0.5 border border-border">
                  {currentInvoice.invoiceNumber}
                </span>
              )}
            </div>

            <form onSubmit={handleIssueInvoice} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] uppercase tracking-caps text-muted block mb-1">
                    Shipping (INR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={shippingRupees}
                    onChange={(e) => setShippingRupees(e.target.value)}
                    className="w-full bg-canvas border border-border p-2 text-xs text-ink font-mono focus:border-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-caps text-muted block mb-1">
                    GST / Tax (INR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={taxRupees}
                    onChange={(e) => setTaxRupees(e.target.value)}
                    className="w-full bg-canvas border border-border p-2 text-xs text-ink font-mono focus:border-gold focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-caps text-muted block mb-1">
                  Courtesy Discount (INR)
                </label>
                <input
                  type="number"
                  min="0"
                  value={discountRupees}
                  onChange={(e) => setDiscountRupees(e.target.value)}
                  className="w-full bg-canvas border border-border p-2 text-xs text-ink font-mono focus:border-gold focus:outline-none"
                />
              </div>

              <div className="p-3 bg-surface-muted border border-border flex justify-between items-center text-xs">
                <span className="font-semibold text-ink">Final Payable:</span>
                <span className="font-mono text-sm font-bold text-ink">
                  {formatINR(previewGrandTotal)}
                </span>
              </div>

              <button
                type="submit"
                disabled={isIssuingInvoice || isPaid || isShipped}
                className="w-full bg-navy hover:bg-gold hover:text-navy text-canvas py-2.5 text-xs uppercase tracking-caps font-semibold flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
              >
                {isIssuingInvoice ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Issue Invoice &amp; Lock Stock Hold</span>
              </button>
            </form>
          </div>

          {/* Action 2: Bank Ledger Payment Verification */}
          <div className="bg-surface border border-border p-6 space-y-4">
            <div className="border-b border-border pb-3">
              <span className="text-[10px] uppercase tracking-caps text-gold font-semibold">
                Step 02
              </span>
              <h3 className="font-display text-lg text-ink font-normal">
                Verify Payment in Bank Ledger
              </h3>
            </div>

            <form onSubmit={handleVerifyPayment} className="space-y-3">
              <div>
                <label className="text-[11px] uppercase tracking-caps text-muted block mb-1">
                  Bank Settlement UTR *
                </label>
                <input
                  type="text"
                  value={utrReference}
                  onChange={(e) => setUtrReference(e.target.value)}
                  placeholder="e.g. HDFC000192841920"
                  className="w-full bg-canvas border border-border p-2 text-xs text-ink font-mono focus:border-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-caps text-muted block mb-1">
                  Verification Remarks
                </label>
                <input
                  type="text"
                  value={verifierNotes}
                  onChange={(e) => setVerifierNotes(e.target.value)}
                  placeholder="e.g. Confirmed in current account statement"
                  className="w-full bg-canvas border border-border p-2 text-xs text-ink focus:border-gold focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={
                  isVerifying ||
                  isPaid ||
                  !order.paymentProofs?.some((proof: any) => proof.status === "PENDING_REVIEW")
                }
                className="w-full bg-stock-ok hover:bg-stock-ok/90 text-white py-2.5 text-xs uppercase tracking-caps font-semibold flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
              >
                {isVerifying ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}
                <span>{isPaid ? "Payment Already Verified" : "Confirm Settlement & Mark Paid"}</span>
              </button>
            </form>
          </div>

          {/* Action 3: Courier Dispatch */}
          <div className="bg-surface border border-border p-6 space-y-4">
            <div className="border-b border-border pb-3">
              <span className="text-[10px] uppercase tracking-caps text-gold font-semibold">
                Step 03
              </span>
              <h3 className="font-display text-lg text-ink font-normal">
                Dispatch Shipment &amp; Notify Patron
              </h3>
            </div>

            <form onSubmit={handleShipOrder} className="space-y-3">
              <div>
                <label className="text-[11px] uppercase tracking-caps text-muted block mb-1">
                  Courier Carrier *
                </label>
                <input
                  type="text"
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  className="w-full bg-canvas border border-border p-2 text-xs text-ink focus:border-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-caps text-muted block mb-1">
                  Tracking / AWB Number *
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g. BD-99482910IN"
                  className="w-full bg-canvas border border-border p-2 text-xs text-ink font-mono focus:border-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-caps text-muted block mb-1">
                  Tracking Web Link
                </label>
                <input
                  type="url"
                  value={trackingUrl}
                  onChange={(e) => setTrackingUrl(e.target.value)}
                  placeholder="https://bluedart.com/track/..."
                  className="w-full bg-canvas border border-border p-2 text-xs text-ink font-mono focus:border-gold focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isShipping || !isPaid}
                className="w-full bg-navy hover:bg-gold hover:text-navy text-canvas py-2.5 text-xs uppercase tracking-caps font-semibold flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
              >
                {isShipping ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Truck className="w-3.5 h-3.5" />
                )}
                <span>Dispatch &amp; Send WhatsApp Alert</span>
              </button>
            </form>
          </div>

          {/* Action 4: Cancellation Request Review */}
          {(order.status === "CANCELLATION_REQUESTED" ||
            order.cancellationRequests?.some((c: any) => c.status === "PENDING")) && (
            <div className="bg-surface border-2 border-gold/60 p-6 space-y-4">
              <div className="border-b border-border pb-3">
                <span className="text-[10px] uppercase tracking-caps text-gold font-semibold">
                  Action Required
                </span>
                <h3 className="font-display text-lg text-ink font-normal">
                  Review Cancellation Request
                </h3>
              </div>

              <div className="bg-canvas border border-border p-3 space-y-1 text-xs">
                <span className="text-[11px] text-muted block">Patron Reason:</span>
                <p className="text-ink font-medium">
                  {order.cancellationRequests?.find((c: any) => c.status === "PENDING")?.reason || "Customer requested cancellation."}
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] uppercase tracking-caps text-muted block mb-1">
                    Decision Remarks
                  </label>
                  <input
                    type="text"
                    value={cancellationReason}
                    onChange={(e) => setCancellationReason(e.target.value)}
                    placeholder="e.g. Sizing cancelled before fabric cut"
                    className="w-full bg-canvas border border-border p-2 text-xs text-ink focus:border-gold focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={isDecidingCancellation}
                    onClick={() => handleCancellationDecision("APPROVED")}
                    className="w-full bg-stock-ok hover:bg-stock-ok/90 text-white py-2 text-xs uppercase tracking-caps font-semibold flex items-center justify-center space-x-1 transition-colors disabled:opacity-50"
                  >
                    {isDecidingCancellation ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>Approve &amp; Restock</span>
                  </button>
                  <button
                    type="button"
                    disabled={isDecidingCancellation}
                    onClick={() => handleCancellationDecision("REJECTED")}
                    className="w-full bg-crimson hover:bg-crimson/90 text-white py-2 text-xs uppercase tracking-caps font-semibold flex items-center justify-center space-x-1 transition-colors disabled:opacity-50"
                  >
                    <span>Reject Request</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Action 5: Manual Bank/UPI Refund Processing */}
          {(order.status === "REFUND_REQUESTED" ||
            order.status === "CANCELLED" ||
            order.paymentStatus === "VERIFIED" ||
            order.status === "PAID") &&
            order.status !== "REFUNDED" && (
            <div className="bg-surface border border-border p-6 space-y-4">
              <div className="border-b border-border pb-3">
                <span className="text-[10px] uppercase tracking-caps text-gold font-semibold">
                  Finance Ledger
                </span>
                <h3 className="font-display text-lg text-ink font-normal">
                  Record Manual Refund
                </h3>
              </div>

              <form onSubmit={handleProcessRefund} className="space-y-3">
                <div>
                  <label className="text-[11px] uppercase tracking-caps text-muted block mb-1">
                    Refund Amount (INR) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={refundRupees}
                    onChange={(e) => setRefundRupees(e.target.value)}
                    placeholder={`Max: ${Math.round(order.totalPaise / 100)}`}
                    className="w-full bg-canvas border border-border p-2 text-xs text-ink font-mono focus:border-gold focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] uppercase tracking-caps text-muted block mb-1">
                    Bank UTR / Transfer Reference *
                  </label>
                  <input
                    type="text"
                    value={refundUtr}
                    onChange={(e) => setRefundUtr(e.target.value)}
                    placeholder="e.g. HDFC-REFUND-991203"
                    className="w-full bg-canvas border border-border p-2 text-xs text-ink font-mono focus:border-gold focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] uppercase tracking-caps text-muted block mb-1">
                    Refund Reason *
                  </label>
                  <input
                    type="text"
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    className="w-full bg-canvas border border-border p-2 text-xs text-ink focus:border-gold focus:outline-none"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isProcessingRefund}
                  className="w-full bg-navy hover:bg-gold hover:text-navy text-canvas py-2.5 text-xs uppercase tracking-caps font-semibold flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
                >
                  {isProcessingRefund ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <DollarSign className="w-3.5 h-3.5" />
                  )}
                  <span>Record Transfer &amp; Notify Patron</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
