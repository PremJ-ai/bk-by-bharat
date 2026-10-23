"use client";

import { useState, use } from "react";
import Link from "next/link";
import { formatINR } from "@/components/product/ProductCard";
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
} from "lucide-react";

interface AdminOrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function AdminOrderDetailPage({ params }: AdminOrderDetailPageProps) {
  const resolvedParams = use(params);
  const orderId = resolvedParams.id;

  // Order Details State
  const [status, setStatus] = useState<
    "awaiting_admin_review" | "awaiting_customer_payment" | "payment_proof_received" | "paid" | "shipped"
  >("payment_proof_received");

  // Invoice Builder State
  const [shippingFee, setShippingFee] = useState<number>(0);
  const [taxFee, setTaxFee] = useState<number>(0);
  const [invoiceVersion, setInvoiceVersion] = useState<number>(1);
  const [invoiceSentMessage, setInvoiceSentMessage] = useState<string | null>(null);

  // Payment Verification State
  const [utrReference, setUtrReference] = useState("UPI-774920194821");
  const [verifierName, setVerifierName] = useState("Bharat (Atelier Master)");
  const [verifiedAmount, setVerifiedAmount] = useState("12400");
  const [paymentFeedback, setPaymentFeedback] = useState<string | null>(null);

  // Shipment State
  const [courierName, setCourierName] = useState("Bluedart Apex Express");
  const [trackingNumber, setTrackingNumber] = useState("BD-88492011IN");
  const [trackingUrl, setTrackingUrl] = useState("https://bluedart.com/track/BD-88492011IN");
  const [shipmentFeedback, setShipmentFeedback] = useState<string | null>(null);

  const orderItems = [
    {
      id: "item-1",
      name: "The High-Rise Gurkha Trouser",
      material: "Irish Slub Linen (340gsm)",
      size: "32",
      quantity: 1,
      pricePaise: 1240000,
    },
  ];

  const subtotalPaise = orderItems.reduce((acc, item) => acc + item.pricePaise * item.quantity, 0);
  const grandTotalPaise = subtotalPaise + shippingFee * 100 + taxFee * 100;

  const handleSendPaymentRequest = () => {
    setInvoiceVersion((prev) => prev + 1);
    setStatus("awaiting_customer_payment");
    setInvoiceSentMessage(
      `Final Invoice v${invoiceVersion + 1} and Studio Payment QR sent to +91 98200 45678 over WhatsApp.`
    );
    setTimeout(() => setInvoiceSentMessage(null), 4000);
  };

  const handleVerifyPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!utrReference.trim()) return;

    setStatus("paid");
    setPaymentFeedback(
      `Payment verified! Transaction UTR ${utrReference} recorded by ${verifierName}. Order moved to tailoring / ready-to-ship.`
    );
    setTimeout(() => setPaymentFeedback(null), 4000);
  };

  const handleShipOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingNumber.trim()) return;

    setStatus("shipped");
    setShipmentFeedback(
      `Order dispatched via ${courierName}! Tracking update sent to customer's WhatsApp.`
    );
    setTimeout(() => setShipmentFeedback(null), 4000);
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div className="flex items-center space-x-4">
          <Link
            href="/admin/orders"
            className="p-2 border border-border hover:border-gold rounded text-muted hover:text-ink transition-colors"
            title="Return to Orders Queue"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center space-x-3">
              <span className="text-xs uppercase tracking-caps text-gold font-medium">
                Order Reference: ORD-2026-8840
              </span>
              <span className="text-[10px] uppercase tracking-wider bg-navy text-canvas px-2 py-0.5 rounded font-mono">
                ID: {orderId}
              </span>
            </div>
            <h1 className="font-display text-3xl text-ink font-normal">
              Ananya Roy &middot; Manual QR Verification
            </h1>
          </div>
        </div>

        {/* Current Status Badge */}
        <div className="flex items-center space-x-2">
          <span className="text-xs uppercase tracking-caps text-muted">Status:</span>
          <span className="bg-navy text-gold px-3 py-1 text-xs uppercase tracking-caps font-semibold border border-gold/30">
            {status.replace(/_/g, " ")}
          </span>
        </div>
      </div>

      {invoiceSentMessage && (
        <div className="bg-navy text-canvas p-4 text-xs flex items-center space-x-2 border-l-4 border-gold shadow-md">
          <Send className="w-4 h-4 text-gold flex-shrink-0" />
          <span>{invoiceSentMessage}</span>
        </div>
      )}

      {paymentFeedback && (
        <div className="bg-stock-ok/10 text-stock-ok border border-stock-ok p-4 text-xs flex items-center space-x-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span className="font-medium">{paymentFeedback}</span>
        </div>
      )}

      {shipmentFeedback && (
        <div className="bg-navy text-canvas border border-white/10 p-4 text-xs flex items-center space-x-2 shadow-xs">
          <Truck className="w-4 h-4 text-gold flex-shrink-0" />
          <span>{shipmentFeedback}</span>
        </div>
      )}

      {/* Main Grid: Customer Snapshot & Items (7 cols) + Operations (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Customer Snapshot & Reserved Items (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Customer & Delivery Snapshot */}
          <div className="bg-surface border border-border p-6 space-y-4">
            <h3 className="font-display text-lg text-ink font-medium border-b border-border pb-3">
              1. Patron &amp; Delivery Snapshot
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
              <div>
                <span className="text-muted uppercase tracking-caps block mb-1">Patron Full Name</span>
                <span className="font-medium text-ink text-sm">Ananya Roy</span>
              </div>

              <div>
                <span className="text-muted uppercase tracking-caps block mb-1">WhatsApp Mobile</span>
                <span className="font-mono text-ink text-sm">+91 98200 45678</span>
              </div>

              <div className="sm:col-span-2 pt-2 border-t border-border/60">
                <span className="text-muted uppercase tracking-caps block mb-1">Delivery Destination</span>
                <p className="text-ink text-sm leading-relaxed">
                  Apartment 4B, Silver Oak Manor, Malabar Hill, Mumbai, Maharashtra 400006
                </p>
                <p className="text-muted text-[11px] mt-1 italic">
                  Note: "Please hem inseam to 29.5 inches if possible."
                </p>
              </div>

              <div className="sm:col-span-2 pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-muted">
                <span className="flex items-center space-x-1.5 text-stock-ok font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Transactional WhatsApp Consent Verified</span>
                </span>
                <span className="font-mono">Timestamp: 2026-10-23 16:15 UTC</span>
              </div>
            </div>
          </div>

          {/* Reserved Items */}
          <div className="bg-surface border border-border p-6 space-y-4">
            <h3 className="font-display text-lg text-ink font-medium border-b border-border pb-3">
              2. Reserved Atelier Garments
            </h3>

            <div className="divide-y divide-border/60 text-xs font-sans">
              {orderItems.map((item) => (
                <div key={item.id} className="py-3 first:pt-0 last:pb-0 flex justify-between items-center">
                  <div>
                    <h5 className="font-medium text-ink text-sm">{item.name}</h5>
                    <p className="text-muted text-[11px]">{item.material}</p>
                    <span className="text-[11px] text-muted">Size: {item.size} &middot; Qty: {item.quantity}</span>
                  </div>
                  <span className="font-semibold text-ink text-sm tabular-nums">
                    {formatINR(item.pricePaise * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Versioned Final Invoice Builder */}
          <div className="bg-surface border border-border p-6 space-y-4">
            <div className="border-b border-border pb-3 flex justify-between items-center">
              <div>
                <h3 className="font-display text-lg text-ink font-medium">
                  3. Versioned Itemized Invoice (v{invoiceVersion})
                </h3>
                <p className="text-[11px] text-muted font-sans">
                  Billing rule: Known charges must be itemized before payment QR is requested.
                </p>
              </div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted border border-border px-2 py-0.5">
                Currency: INR
              </span>
            </div>

            <div className="space-y-3 text-xs font-sans">
              <div className="flex justify-between py-1">
                <span className="text-muted">Garments Subtotal:</span>
                <span className="font-medium text-ink tabular-nums">{formatINR(subtotalPaise)}</span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-muted">Courier &amp; Insured Transit:</span>
                <div className="flex items-center space-x-1">
                  <span className="text-muted">₹</span>
                  <input
                    type="number"
                    value={shippingFee}
                    onChange={(e) => setShippingFee(parseInt(e.target.value, 10) || 0)}
                    className="w-20 bg-canvas border border-border px-2 py-1 text-right text-xs font-semibold tabular-nums"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-muted">Disclosed Taxes &amp; Packaging:</span>
                <div className="flex items-center space-x-1">
                  <span className="text-muted">₹</span>
                  <input
                    type="number"
                    value={taxFee}
                    onChange={(e) => setTaxFee(parseInt(e.target.value, 10) || 0)}
                    className="w-20 bg-canvas border border-border px-2 py-1 text-right text-xs font-semibold tabular-nums"
                  />
                </div>
              </div>

              <div className="flex justify-between py-2 border-t border-border text-sm font-semibold text-ink">
                <span>Final Payable Bill:</span>
                <span className="text-base tabular-nums">{formatINR(grandTotalPaise)}</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleSendPaymentRequest}
                className="w-full bg-navy hover:bg-gold hover:text-navy text-canvas py-3 px-4 text-xs uppercase tracking-caps font-semibold flex items-center justify-center space-x-2 transition-colors rounded shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Final Bill &amp; Payment QR via WhatsApp</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Payment Verification & Dispatch Workflow (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Section 4: Customer Screenshot & Verification */}
          <div className="bg-surface border border-border p-6 space-y-4">
            <div className="border-b border-border pb-3 flex justify-between items-center">
              <h3 className="font-display text-lg text-ink font-medium">
                4. Payment Proof Review
              </h3>
              <span className="text-[10px] uppercase tracking-caps bg-rust/10 text-rust border border-rust/30 px-2 py-0.5 rounded font-medium">
                Receipt Received
              </span>
            </div>

            {/* Inbound Screenshot Affordance */}
            <div className="border border-border bg-surface-muted p-4 space-y-3">
              <div className="aspect-[4/3] bg-canvas border border-border/80 flex flex-col items-center justify-center text-center p-6 space-y-2 select-none">
                <FileText className="w-8 h-8 text-gold" />
                <span className="text-xs font-mono font-medium text-ink">
                  INBOUND_PAYMENT_PROOF_8840.PNG
                </span>
                <span className="text-[10px] text-muted font-sans">
                  Received via WhatsApp webhook &middot; 2.4 MB
                </span>
              </div>

              {/* Strict Non-negotiable Security Caution */}
              <div className="bg-rust/10 border-l-2 border-rust p-3 text-[11px] text-rust leading-relaxed font-sans flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Strict Policy:</strong> A screenshot alone is never authoritative proof of payment. Independently verify the actual bank or UPI statement before marking as paid.
                </span>
              </div>
            </div>

            {/* Bank Reconciliation Form */}
            <form onSubmit={handleVerifyPayment} className="space-y-3 pt-2 text-xs font-sans">
              <div>
                <label className="block uppercase tracking-caps text-muted font-medium mb-1">
                  Bank / UPI Transaction Reference (UTR) *
                </label>
                <input
                  type="text"
                  required
                  value={utrReference}
                  onChange={(e) => setUtrReference(e.target.value)}
                  placeholder="e.g. UPI-20261023884192"
                  className="w-full bg-canvas border border-border px-3 py-2 text-xs font-mono text-ink focus:border-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="block uppercase tracking-caps text-muted font-medium mb-1">
                  Verifying Admin Staff *
                </label>
                <input
                  type="text"
                  required
                  value={verifierName}
                  onChange={(e) => setVerifierName(e.target.value)}
                  className="w-full bg-canvas border border-border px-3 py-2 text-xs text-ink focus:border-gold focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={status === "paid" || status === "shipped"}
                className="w-full bg-stock-ok hover:bg-stock-ok/90 text-white py-2.5 px-4 text-xs uppercase tracking-caps font-semibold flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{status === "paid" || status === "shipped" ? "Payment Already Verified" : "Verify Payment & Mark Paid"}</span>
              </button>
            </form>
          </div>

          {/* Section 5: Shipment & Tracking */}
          <div className="bg-surface border border-border p-6 space-y-4">
            <h3 className="font-display text-lg text-ink font-medium border-b border-border pb-3">
              5. Dispatch &amp; Tracking
            </h3>

            <form onSubmit={handleShipOrder} className="space-y-3 text-xs font-sans">
              <div>
                <label className="block uppercase tracking-caps text-muted font-medium mb-1">
                  Courier Carrier
                </label>
                <input
                  type="text"
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  className="w-full bg-canvas border border-border px-3 py-2 text-xs text-ink focus:border-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="block uppercase tracking-caps text-muted font-medium mb-1">
                  Tracking Waybill Number
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="w-full bg-canvas border border-border px-3 py-2 text-xs font-mono text-ink focus:border-gold focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={status !== "paid"}
                className="w-full bg-navy hover:bg-gold hover:text-navy text-canvas py-2.5 px-4 text-xs uppercase tracking-caps font-semibold flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Dispatch &amp; Send WhatsApp Tracking</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
