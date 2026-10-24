"use client";

import { useState, useEffect } from "react";
import {
  getStorePaymentSettings,
  updateStorePaymentSettings,
} from "@/lib/api/commerce";
import {
  QrCode,
  Save,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

export default function AdminPaymentSettingsPage() {
  const [upiId, setUpiId] = useState("");
  const [payeeName, setPayeeName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [shippingDefaultRupees, setShippingDefaultRupees] = useState("0");
  const [paymentInstructions, setPaymentInstructions] = useState("");
  const [qrImageUrl, setQrImageUrl] = useState("");

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    getStorePaymentSettings()
      .then((settings) => {
        setUpiId(settings.upiId || "");
        setPayeeName(settings.payeeName || "");
        setWhatsappNumber(settings.whatsappNumber || "");
        setShippingDefaultRupees(String(Math.round((settings.shippingDefaultPaise || 0) / 100)));
        setPaymentInstructions(settings.paymentInstructions || "");
        setQrImageUrl(settings.qrImageUrl || "");
      })
      .catch((err) => {
        setFeedback({ type: "error", message: err?.message || "Failed to load payment settings." });
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      setFeedback(null);

      const shippingDefaultPaise = (parseInt(shippingDefaultRupees, 10) || 0) * 100;

      await updateStorePaymentSettings({
        upiId: upiId.trim(),
        payeeName: payeeName.trim(),
        whatsappNumber: whatsappNumber.trim(),
        paymentInstructions: paymentInstructions.trim(),
        shippingDefaultPaise,
        qrImageUrl: qrImageUrl.trim() || undefined,
      });

      setFeedback({
        type: "success",
        message: "Studio payment settings & UPI VPA configuration saved successfully.",
      });
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Failed to update payment settings." });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-2">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-navy" />
        <p className="text-xs text-muted uppercase tracking-caps">Loading store financial settings...</p>
      </div>
    );
  }

  const previewQrUrl =
    qrImageUrl ||
    `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
      `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&cu=INR`
    )}`;

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Page Header */}
      <div className="pb-6 border-b border-border">
        <span className="text-xs uppercase tracking-caps text-gold font-medium block mb-1">
          Studio Financial Settings
        </span>
        <h1 className="font-display text-3xl text-ink font-normal">
          Payment QR &amp; Bank Instructions
        </h1>
        <p className="text-muted text-xs leading-relaxed font-sans max-w-xl pt-1">
          Configure the official studio UPI VPA and payment instructions embedded in customer invoices and sent over WhatsApp.
        </p>
      </div>

      {feedback && (
        <div
          className={`p-4 text-xs flex items-center space-x-2 border ${
            feedback.type === "success"
              ? "bg-stock-ok/10 text-stock-ok border-stock-ok"
              : "bg-crimson/10 text-crimson border-crimson"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* Section 1: Active QR Asset */}
        <div className="bg-surface border border-border p-6 sm:p-8 space-y-6">
          <div className="border-b border-border pb-3 flex justify-between items-center">
            <h3 className="font-display text-xl text-ink font-medium">
              1. Active Studio Payment QR
            </h3>
            <span className="text-[10px] uppercase tracking-wider text-muted bg-surface-muted px-2 py-0.5 border border-border">
              Dynamic UPI Vector
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-44 h-44 bg-white border border-border flex items-center justify-center p-2 rounded">
              <img src={previewQrUrl} alt="Active UPI QR" className="w-full h-full object-contain" />
            </div>

            <div className="space-y-3 flex-1 text-xs text-muted font-sans">
              <p className="leading-relaxed">
                This QR code is dynamically rendered on guest confirmation screens and invoice bills. It encodes your official UPI ID (<span className="text-ink font-mono font-semibold">{upiId || "not configured"}</span>) and Payee Name (<span className="text-ink font-semibold">{payeeName || "not configured"}</span>).
              </p>
              <div>
                <label className="text-[11px] uppercase tracking-caps text-muted block mb-1">
                  Custom Static QR Image URL (Optional)
                </label>
                <input
                  type="url"
                  value={qrImageUrl}
                  onChange={(e) => setQrImageUrl(e.target.value)}
                  placeholder="https://... (leave blank to use auto-generated QR)"
                  className="w-full bg-canvas border border-border p-2 text-xs text-ink font-mono focus:border-gold focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Account Identifiers */}
        <div className="bg-surface border border-border p-6 sm:p-8 space-y-6">
          <div className="border-b border-border pb-3">
            <h3 className="font-display text-xl text-ink font-medium">
              2. Official Banking &amp; UPI Identifiers
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
            <div>
              <label className="block uppercase tracking-caps text-muted font-medium mb-1.5">
                Primary UPI ID (VPA) *
              </label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                required
                className="w-full bg-canvas border border-border p-2.5 text-xs text-ink font-mono focus:border-gold focus:outline-none"
              />
            </div>

            <div>
              <label className="block uppercase tracking-caps text-muted font-medium mb-1.5">
                Official Payee / Beneficiary Name *
              </label>
              <input
                type="text"
                value={payeeName}
                onChange={(e) => setPayeeName(e.target.value)}
                required
                className="w-full bg-canvas border border-border p-2.5 text-xs text-ink focus:border-gold focus:outline-none"
              />
            </div>

            <div>
              <label className="block uppercase tracking-caps text-muted font-medium mb-1.5">
                Official Studio WhatsApp Number *
              </label>
              <input
                type="text"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                required
                className="w-full bg-canvas border border-border p-2.5 text-xs text-ink font-mono focus:border-gold focus:outline-none"
              />
            </div>

            <div>
              <label className="block uppercase tracking-caps text-muted font-medium mb-1.5">
                Default Domestic Shipping Fee (INR)
              </label>
              <input
                type="number"
                min="0"
                value={shippingDefaultRupees}
                onChange={(e) => setShippingDefaultRupees(e.target.value)}
                className="w-full bg-canvas border border-border p-2.5 text-xs text-ink font-mono focus:border-gold focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block uppercase tracking-caps text-muted font-medium mb-1.5">
                Payment Instructions Note
              </label>
              <textarea
                rows={3}
                value={paymentInstructions}
                onChange={(e) => setPaymentInstructions(e.target.value)}
                className="w-full bg-canvas border border-border p-2.5 text-xs text-ink focus:border-gold focus:outline-none leading-relaxed"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-border flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="bg-navy hover:bg-gold hover:text-navy text-canvas px-6 py-2.5 text-xs uppercase tracking-caps font-semibold flex items-center space-x-2 transition-colors disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Save Financial Configuration</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
