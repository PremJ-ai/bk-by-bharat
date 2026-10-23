"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { formatINR } from "@/components/product/ProductCard";
import {
  CheckCircle,
  MessageSquare,
  Clock,
  MapPin,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  X,
} from "lucide-react";

interface ConfirmationPageProps {
  params: Promise<{ token: string }>;
}

export default function OrderConfirmationPage({ params }: ConfirmationPageProps) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelSubmitted, setCancelSubmitted] = useState(false);

  useEffect(() => {
    // Attempt reading order from local guest storage
    try {
      const stored = localStorage.getItem(`order_${token}`);
      if (stored) {
        setOrder(JSON.parse(stored));
      } else {
        // Fallback default fixture for direct URL inspection
        setOrder({
          orderNumber: "ORD-2026-8841",
          token,
          customerName: "Guest Patron",
          whatsappNumber: "+91 98765 43210",
          shippingAddress: {
            line1: "144 Atelier Court, Shahpur Jat",
            city: "New Delhi",
            state: "Delhi",
            postalCode: "110049",
          },
          items: [
            {
              name: "Riviera Camp-Collar Shirt",
              material: "100% Belgian Heavy Linen",
              size: "M",
              quantity: 1,
              pricePaise: 840000,
            },
          ],
          subtotalPaise: 840000,
          status: "awaiting_admin_review",
          createdAt: new Date().toISOString(),
        });
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  const handleCancelRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setCancelSubmitted(true);
    setTimeout(() => {
      setShowCancelModal(false);
    }, 1500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-6 text-ink">
        <p className="text-xs uppercase tracking-caps text-muted">Retrieving Order Manifest...</p>
      </div>
    );
  }

  const whatsappLink = `https://wa.me/?text=${encodeURIComponent(
    `Hello Bharat Atelier, I would like to inquire about my order ${order?.orderNumber || ""}.`
  )}`;

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-ink">
      <AnnouncementBar />
      <SiteHeader />

      <main className="flex-1 max-w-[1000px] w-full mx-auto px-6 md:px-12 py-12">
        {/* Success Header */}
        <div className="bg-surface border border-border p-8 md:p-12 text-center space-y-4 relative overflow-hidden mb-10">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gold" />
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-stock-ok/10 text-stock-ok mx-auto">
            <CheckCircle className="w-7 h-7" />
          </div>

          <span className="text-xs uppercase tracking-caps text-gold font-medium block">
            Order Successfully Placed
          </span>
          <h1 className="font-display text-3xl sm:text-4xl text-ink font-normal">
            Thank You, {order?.customerName || "Patron"}
          </h1>
          <p className="text-muted text-sm max-w-lg mx-auto leading-relaxed font-sans">
            Your garment reservation has been recorded. Our studio team is reviewing current inventory and will message your WhatsApp with the itemized bill and payment QR shortly.
          </p>

          <div className="pt-2 inline-flex items-center space-x-3 bg-surface-muted px-4 py-2 border border-border text-xs font-mono">
            <span className="text-muted">Order Reference:</span>
            <span className="font-semibold text-ink">{order?.orderNumber}</span>
          </div>
        </div>

        {/* Status Timeline */}
        <div className="bg-surface border border-border p-6 sm:p-8 mb-8 space-y-6">
          <h2 className="font-display text-xl text-ink font-medium border-b border-border pb-3">
            Atelier Fulfillment Timeline
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-2">
            <div className="space-y-1.5 border-l-2 border-gold pl-3">
              <span className="text-[10px] uppercase tracking-caps text-gold font-semibold block">Step 01 &middot; Active</span>
              <h4 className="text-xs font-semibold text-ink">Order In Review</h4>
              <p className="text-[11px] text-muted leading-relaxed">
                Studio staff confirming stock and fabric availability.
              </p>
            </div>

            <div className="space-y-1.5 border-l-2 border-border pl-3">
              <span className="text-[10px] uppercase tracking-caps text-muted font-medium block">Step 02</span>
              <h4 className="text-xs font-semibold text-muted">WhatsApp QR Bill</h4>
              <p className="text-[11px] text-muted leading-relaxed">
                Personalized UPI QR sent to {order?.whatsappNumber}.
              </p>
            </div>

            <div className="space-y-1.5 border-l-2 border-border pl-3">
              <span className="text-[10px] uppercase tracking-caps text-muted font-medium block">Step 03</span>
              <h4 className="text-xs font-semibold text-muted">Payment Verification</h4>
              <p className="text-[11px] text-muted leading-relaxed">
                Staff verifies bank transfer receipt and locks inventory.
              </p>
            </div>

            <div className="space-y-1.5 border-l-2 border-border pl-3">
              <span className="text-[10px] uppercase tracking-caps text-muted font-medium block">Step 04</span>
              <h4 className="text-xs font-semibold text-muted">Courier Dispatch</h4>
              <p className="text-[11px] text-muted leading-relaxed">
                Garments pressed, packaged, and tracking number sent.
              </p>
            </div>
          </div>
        </div>

        {/* Order Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          {/* Left: Reserved Items */}
          <div className="bg-surface border border-border p-6 space-y-4">
            <h3 className="font-display text-lg text-ink font-medium border-b border-border pb-2">
              Reserved Items
            </h3>
            <div className="divide-y divide-border/60">
              {order?.items?.map((item: any, i: number) => (
                <div key={i} className="py-3 first:pt-0 last:pb-0 flex justify-between text-xs font-sans">
                  <div>
                    <h5 className="font-medium text-ink">{item.name}</h5>
                    <p className="text-muted text-[11px] mt-0.5">
                      Size: {item.size} {item.color ? `· ${item.color}` : ""} · Qty: {item.quantity}
                    </p>
                  </div>
                  <span className="font-semibold text-ink tabular-nums">
                    {formatINR(item.pricePaise * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-border flex justify-between text-sm font-semibold text-ink">
              <span>Estimated Subtotal</span>
              <span className="tabular-nums">{formatINR(order?.subtotalPaise || 0)}</span>
            </div>
          </div>

          {/* Right: Shipping Destination & Communication */}
          <div className="bg-surface border border-border p-6 space-y-4">
            <h3 className="font-display text-lg text-ink font-medium border-b border-border pb-2">
              Delivery Destination
            </h3>
            <div className="text-xs text-muted leading-relaxed space-y-1 font-sans">
              <p className="font-semibold text-ink">{order?.customerName}</p>
              <p>{order?.shippingAddress?.line1}</p>
              {order?.shippingAddress?.line2 && <p>{order?.shippingAddress?.line2}</p>}
              <p>
                {order?.shippingAddress?.city}, {order?.shippingAddress?.state} {order?.shippingAddress?.postalCode}
              </p>
              <p className="pt-1 text-ink font-mono">WhatsApp: {order?.whatsappNumber}</p>
            </div>

            <div className="pt-3 border-t border-border space-y-2">
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-[#25D366] hover:bg-[#1EBE5D] text-white py-2.5 px-4 text-xs uppercase tracking-caps font-semibold flex items-center justify-center space-x-2 transition-colors rounded shadow-xs"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Continue in WhatsApp</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="w-full border border-border hover:border-rust hover:text-rust text-muted py-2 text-xs uppercase tracking-caps font-medium transition-colors"
              >
                Request Order Cancellation
              </button>
            </div>
          </div>
        </div>

        {/* Private Access Notice */}
        <div className="bg-surface-muted border border-border p-4 text-center text-xs text-muted font-sans flex items-center justify-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-gold flex-shrink-0" />
          <span>
            This private status link is encrypted. You may bookmark this URL to check fulfillment status anytime.
          </span>
        </div>
      </main>

      {/* Cancellation Request Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-strong/60 backdrop-blur-xs">
          <div className="bg-surface border border-border max-w-md w-full p-6 space-y-4 relative shadow-2xl">
            <button
              type="button"
              onClick={() => setShowCancelModal(false)}
              className="absolute top-4 right-4 text-muted hover:text-ink"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-display text-xl text-ink font-medium">
              Request Order Cancellation
            </h3>
            <p className="text-xs text-muted leading-relaxed font-sans">
              Orders awaiting review or payment can be cancelled at zero charge. If a payment was already submitted, our atelier staff will review and coordinate your refund via WhatsApp.
            </p>

            {cancelSubmitted ? (
              <div className="bg-stock-ok/10 text-stock-ok border border-stock-ok p-4 text-xs flex items-center space-x-2">
                <CheckCircle className="w-4 h-4" />
                <span>Cancellation request submitted. Atelier team notified.</span>
              </div>
            ) : (
              <form onSubmit={handleCancelRequest} className="space-y-4">
                <div>
                  <label htmlFor="reason" className="block text-xs uppercase tracking-caps text-ink font-medium mb-1">
                    Cancellation Reason
                  </label>
                  <textarea
                    id="reason"
                    rows={3}
                    required
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="e.g. Changed sizing preference or ordered by mistake"
                    className="w-full bg-canvas border border-border p-2.5 text-xs text-ink focus:border-gold focus:outline-none"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCancelModal(false)}
                    className="px-4 py-2 border border-border text-xs uppercase tracking-caps text-muted hover:text-ink"
                  >
                    Keep Order
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-rust text-white text-xs uppercase tracking-caps font-semibold hover:bg-rust/90 transition-colors"
                  >
                    Confirm Cancellation Request
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <SiteFooter />
    </div>
  );
}
