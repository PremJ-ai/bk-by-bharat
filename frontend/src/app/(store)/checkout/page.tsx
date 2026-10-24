"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { formatINR } from "@/components/product/ProductCard";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { submitGuestCheckout } from "@/lib/api/commerce";
import { getStorefrontProductBySlug } from "@/lib/api/catalog";
import {
  ShieldCheck,
  ShoppingBag,
  ArrowRight,
  MessageSquare,
  AlertCircle,
  Lock,
  Loader2,
  ChevronRight,
} from "lucide-react";

export default function GuestCheckoutPage() {
  const router = useRouter();
  const { items, subtotalPaise, clearCart } = useCart();

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("+91");
  const [email, setEmail] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [stateRegion, setStateRegion] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [whatsappConsent, setWhatsappConsent] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (items.length === 0) {
      setErrorMessage("Your shopping bag is empty. Please add items before checking out.");
      return;
    }

    if (!fullName.trim() || !whatsappNumber.trim() || !addressLine1.trim() || !city.trim() || !postalCode.trim()) {
      setErrorMessage("Please complete all required contact and shipping address fields.");
      return;
    }

    if (!whatsappConsent) {
      setErrorMessage("Explicit consent to receive transactional WhatsApp notifications is required.");
      return;
    }

    setLoading(true);

    try {
      // Clean and normalize WhatsApp phone
      const cleanPhone = whatsappNumber.replace(/[\s-]/g, "");

      // Resolve variant IDs for cart items
      const checkoutItems = await Promise.all(
        items.map(async (item) => {
          if (item.variantId) {
            return { variantId: item.variantId, quantity: item.quantity };
          }
          const prod = await getStorefrontProductBySlug(item.slug);
          const found = prod.sizes.find((s) => s.size === item.size);
          if (!found?.id) {
            throw new Error(`Variant for "${item.name}" (Size ${item.size}) is not available.`);
          }
          return { variantId: found.id, quantity: item.quantity };
        })
      );

      const res = await submitGuestCheckout({
        customerName: fullName.trim(),
        whatsappNumber: cleanPhone,
        email: email.trim() || undefined,
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim() || undefined,
        city: city.trim(),
        stateRegion: stateRegion.trim(),
        postalCode: postalCode.trim(),
        deliveryNotes: deliveryNotes.trim() || undefined,
        whatsappConsent: true,
        items: checkoutItems,
      });

      // Clear the shopping bag
      clearCart();

      // Redirect to private confirmation screen with real guest token
      router.push(`/orders/confirmation/${res.guestStatusToken}`);
    } catch {
      setErrorMessage("An unexpected error occurred while placing your order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-ink">
      <AnnouncementBar />
      <SiteHeader />

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-6 md:px-12 py-10">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumbs" className="mb-8">
          <ol className="flex items-center space-x-2 text-xs uppercase tracking-caps text-muted">
            <li>
              <Link href="/" className="hover:text-gold transition-colors">
                Atelier
              </Link>
            </li>
            <li>
              <ChevronRight className="w-3 h-3 text-border" />
            </li>
            <li className="text-ink font-medium">Guest Checkout</li>
          </ol>
        </nav>

        <div className="pb-8 border-b border-border mb-10">
          <span className="text-xs uppercase tracking-caps text-gold font-medium block mb-2">
            Direct Atelier Concierge &middot; Step 1 of 2
          </span>
          <h1 className="font-display text-4xl sm:text-5xl text-ink font-normal">
            Guest Checkout &amp; Delivery
          </h1>
          <p className="text-muted text-sm leading-relaxed font-sans max-w-xl pt-1">
            No password or account registration required. Your garments are reserved and billed via personalized WhatsApp QR verification.
          </p>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-20 space-y-4 max-w-md mx-auto">
            <ShoppingBag className="w-10 h-10 text-muted mx-auto" />
            <h2 className="font-display text-2xl text-ink">Your bag is empty</h2>
            <p className="text-muted text-xs font-sans">
              Please choose a garment from our collections before navigating to checkout.
            </p>
            <Link
              href="/collections/all"
              className="inline-block bg-navy text-canvas px-6 py-2.5 text-xs uppercase tracking-caps font-semibold hover:bg-gold hover:text-navy transition-colors"
            >
              Browse Catalog
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            {/* Left Column: Guest Delivery Form (7 cols) */}
            <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-8">
              {errorMessage && (
                <div
                  role="alert"
                  className="bg-rust/20 border border-rust text-canvas px-4 py-3 text-xs flex items-start space-x-2.5 rounded"
                >
                  <AlertCircle className="w-4 h-4 text-rust flex-shrink-0 mt-0.5" />
                  <span className="text-ink leading-relaxed">{errorMessage}</span>
                </div>
              )}

              {/* Section 1: Contact Details */}
              <div className="bg-surface border border-border p-6 sm:p-8 space-y-6">
                <div className="border-b border-border pb-4">
                  <h2 className="font-display text-xl text-ink font-medium">
                    1. Recipient &amp; WhatsApp Details
                  </h2>
                  <p className="text-xs text-muted font-sans mt-0.5">
                    Your final bill, payment QR, and dispatch updates will be sent directly to this number.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="fullName"
                      className="block text-xs uppercase tracking-caps text-ink font-medium mb-1.5"
                    >
                      Full Name *
                    </label>
                    <input
                      id="fullName"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Bharat Sharma"
                      className="w-full bg-canvas border border-border px-3.5 py-2.5 text-sm text-ink focus:border-gold focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="whatsappNumber"
                      className="block text-xs uppercase tracking-caps text-ink font-medium mb-1.5"
                    >
                      WhatsApp Phone Number *
                    </label>
                    <input
                      id="whatsappNumber"
                      type="tel"
                      required
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full bg-canvas border border-border px-3.5 py-2.5 text-sm text-ink focus:border-gold focus:outline-none font-mono"
                    />
                    <span className="text-[10px] text-muted block mt-1">
                      Include country code (e.g. +91 for India)
                    </span>
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="block text-xs uppercase tracking-caps text-ink font-medium mb-1.5"
                    >
                      Email Address (Optional)
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="bharat@example.com"
                      className="w-full bg-canvas border border-border px-3.5 py-2.5 text-sm text-ink focus:border-gold focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Delivery Address */}
              <div className="bg-surface border border-border p-6 sm:p-8 space-y-6">
                <div className="border-b border-border pb-4">
                  <h2 className="font-display text-xl text-ink font-medium">
                    2. Shipping Destination
                  </h2>
                  <p className="text-xs text-muted font-sans mt-0.5">
                    Insured nationwide courier delivery to your residential or office address.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="addressLine1"
                      className="block text-xs uppercase tracking-caps text-ink font-medium mb-1.5"
                    >
                      Street Address &middot; Flat / House No. *
                    </label>
                    <input
                      id="addressLine1"
                      type="text"
                      required
                      value={addressLine1}
                      onChange={(e) => setAddressLine1(e.target.value)}
                      placeholder="e.g. 144 Atelier Court, Shahpur Jat"
                      className="w-full bg-canvas border border-border px-3.5 py-2.5 text-sm text-ink focus:border-gold focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="addressLine2"
                      className="block text-xs uppercase tracking-caps text-ink font-medium mb-1.5"
                    >
                      Apartment, Suite, Landmark (Optional)
                    </label>
                    <input
                      id="addressLine2"
                      type="text"
                      value={addressLine2}
                      onChange={(e) => setAddressLine2(e.target.value)}
                      placeholder="Near Siri Fort Auditorium"
                      className="w-full bg-canvas border border-border px-3.5 py-2.5 text-sm text-ink focus:border-gold focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label
                        htmlFor="city"
                        className="block text-xs uppercase tracking-caps text-ink font-medium mb-1.5"
                      >
                        City *
                      </label>
                      <input
                        id="city"
                        type="text"
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="New Delhi"
                        className="w-full bg-canvas border border-border px-3.5 py-2.5 text-sm text-ink focus:border-gold focus:outline-none"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="stateRegion"
                        className="block text-xs uppercase tracking-caps text-ink font-medium mb-1.5"
                      >
                        State / UT *
                      </label>
                      <input
                        id="stateRegion"
                        type="text"
                        required
                        value={stateRegion}
                        onChange={(e) => setStateRegion(e.target.value)}
                        placeholder="Delhi"
                        className="w-full bg-canvas border border-border px-3.5 py-2.5 text-sm text-ink focus:border-gold focus:outline-none"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="postalCode"
                        className="block text-xs uppercase tracking-caps text-ink font-medium mb-1.5"
                      >
                        PIN Code *
                      </label>
                      <input
                        id="postalCode"
                        type="text"
                        required
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        placeholder="110049"
                        className="w-full bg-canvas border border-border px-3.5 py-2.5 text-sm text-ink focus:border-gold focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="deliveryNotes"
                      className="block text-xs uppercase tracking-caps text-ink font-medium mb-1.5"
                    >
                      Bespoke Tailoring or Delivery Instructions (Optional)
                    </label>
                    <textarea
                      id="deliveryNotes"
                      rows={2}
                      value={deliveryNotes}
                      onChange={(e) => setDeliveryNotes(e.target.value)}
                      placeholder="e.g. Please hem trousers to 30-inch inseam. Ring bell on arrival."
                      className="w-full bg-canvas border border-border px-3.5 py-2.5 text-sm text-ink focus:border-gold focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: WhatsApp Opt-In Consent */}
              <div className="bg-surface-muted border border-border p-6 space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="pt-0.5">
                    <input
                      id="whatsappConsent"
                      type="checkbox"
                      required
                      checked={whatsappConsent}
                      onChange={(e) => setWhatsappConsent(e.target.checked)}
                      className="w-4 h-4 rounded-none text-navy border-border focus:ring-gold"
                    />
                  </div>
                  <label htmlFor="whatsappConsent" className="text-xs text-ink leading-relaxed cursor-pointer select-none">
                    <span className="font-medium text-navy block mb-0.5">
                      Explicit Consent for Transactional WhatsApp Communication *
                    </span>
                    I hereby consent to receiving my order confirmation, itemized final invoice, configured studio payment QR, and courier dispatch updates directly on my provided WhatsApp number. I understand this store operates under a guest checkout workflow and does not create an online user account.
                  </label>
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-navy text-canvas hover:bg-gold hover:text-navy py-4 px-6 text-xs uppercase tracking-caps font-semibold flex items-center justify-center space-x-2 transition-all duration-200 disabled:opacity-50 shadow-md"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Transmitting Order to Atelier...</span>
                  </>
                ) : (
                  <>
                    <span>Place Guest Order &mdash; {formatINR(subtotalPaise)}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Right Column: Order Summary Sidebar (5 cols) */}
            <div className="lg:col-span-5 bg-surface border border-border p-6 sm:p-8 space-y-6 lg:sticky lg:top-28">
              <div className="border-b border-border pb-4 flex justify-between items-center">
                <h3 className="font-display text-xl text-ink font-medium">
                  Order Summary
                </h3>
                <span className="text-xs text-muted font-sans">
                  {items.length} {items.length === 1 ? "piece" : "pieces"}
                </span>
              </div>

              {/* Itemized Lines */}
              <div className="divide-y divide-border/60 max-h-72 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div key={item.id} className="py-3.5 first:pt-0 last:pb-0 flex justify-between text-xs">
                    <div>
                      <h4 className="font-medium text-ink leading-tight font-sans">
                        {item.name}
                      </h4>
                      <p className="text-muted text-[11px] mt-0.5">
                        Size: {item.size} {item.color ? `· ${item.color}` : ""} · Qty: {item.quantity}
                      </p>
                    </div>
                    <span className="font-semibold text-ink font-sans tabular-nums pl-4">
                      {formatINR(item.pricePaise * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Calculations */}
              <div className="pt-4 border-t border-border space-y-2 text-xs font-sans">
                <div className="flex justify-between text-muted">
                  <span>Garment Subtotal</span>
                  <span className="text-ink font-medium tabular-nums">{formatINR(subtotalPaise)}</span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>Shipping &amp; Transit</span>
                  <span className="text-stock-ok font-medium">Complimentary</span>
                </div>
                <div className="flex justify-between text-base font-semibold text-ink pt-2 border-t border-border">
                  <span>Payable Total</span>
                  <span className="tabular-nums text-lg">{formatINR(subtotalPaise)}</span>
                </div>
              </div>

              {/* Workflow Guidance Card */}
              <div className="bg-canvas p-4 border border-border space-y-2.5 text-xs text-muted leading-relaxed font-sans">
                <div className="flex items-center space-x-2 text-navy font-medium">
                  <MessageSquare className="w-4 h-4 text-gold flex-shrink-0" />
                  <span>How Payment &amp; Dispatch Works</span>
                </div>
                <p className="text-[11px]">
                  1. Our studio verifies current inventory and validates your address.
                </p>
                <p className="text-[11px]">
                  2. We message your WhatsApp with the final bill and studio payment QR.
                </p>
                <p className="text-[11px]">
                  3. After you send the payment receipt, staff verifies the transfer and prepares your garments.
                </p>
              </div>

              <div className="flex items-center space-x-2 text-[11px] text-muted justify-center pt-2">
                <Lock className="w-3.5 h-3.5 text-gold" />
                <span>Encrypted transmission &middot; Private token access only</span>
              </div>
            </div>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
