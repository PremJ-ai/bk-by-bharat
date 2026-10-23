"use client";

import { useState } from "react";
import {
  QrCode,
  Save,
  Upload,
  ShieldCheck,
  AlertCircle,
  Clock,
  CheckCircle2,
} from "lucide-react";

export default function AdminPaymentSettingsPage() {
  const [upiId, setUpiId] = useState("bharat.atelier@icici");
  const [accountName, setAccountName] = useState("BHARAT COMMERCE ATELIER LLP");
  const [bankName, setBankName] = useState("ICICI Bank Limited, Hauz Khas Branch");
  const [accountNumber, setAccountNumber] = useState("002105018849");
  const [ifscCode, setIfscCode] = useState("ICIC0000021");
  const [paymentHoldHours, setPaymentHoldHours] = useState("24");
  const [paymentInstructions, setPaymentInstructions] = useState(
    "Please scan the QR code using any UPI application (GPay, PhonePe, Paytm, or BHIM). Once paid, send a screenshot of the completed transfer along with the transaction reference (UTR) back to this WhatsApp thread."
  );
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedFeedback("Payment QR and banking configuration successfully updated.");
    setTimeout(() => setSavedFeedback(null), 3500);
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Page Header */}
      <div className="pb-6 border-b border-border">
        <span className="text-xs uppercase tracking-caps text-gold font-medium block mb-1">
          Studio Financial Settings &middot; Milestone 1 Shell
        </span>
        <h1 className="font-display text-3xl text-ink font-normal">
          Payment QR &amp; Bank Instructions
        </h1>
        <p className="text-muted text-xs leading-relaxed font-sans max-w-xl pt-1">
          Configure the official studio UPI VPA and banking details embedded in customer invoices and sent over WhatsApp.
        </p>
      </div>

      {savedFeedback && (
        <div className="bg-stock-ok/10 text-stock-ok border border-stock-ok p-4 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{savedFeedback}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* Section 1: Active QR Asset */}
        <div className="bg-surface border border-border p-6 sm:p-8 space-y-6">
          <div className="border-b border-border pb-3 flex justify-between items-center">
            <h3 className="font-display text-xl text-ink font-medium">
              1. Configured Studio Payment QR
            </h3>
            <span className="text-[10px] uppercase tracking-wider text-muted bg-surface-muted px-2 py-0.5 border border-border">
              Private Object Storage Key
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-44 h-44 bg-surface-muted border-2 border-dashed border-border flex flex-col items-center justify-center p-4 text-center">
              <QrCode className="w-16 h-16 text-navy/70 mb-2" />
              <span className="text-[10px] text-muted font-mono">
                STUDIO_PAYMENT_QR_2026.PNG
              </span>
            </div>

            <div className="space-y-3 flex-1 text-xs text-muted font-sans">
              <p className="leading-relaxed">
                This QR image is dynamically attached to outbound WhatsApp payment requests once an administrator confirms the final bill.
              </p>
              <button
                type="button"
                className="inline-flex items-center space-x-2 border border-border hover:border-gold px-4 py-2 text-xs uppercase tracking-caps font-medium text-ink transition-colors bg-surface"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Replacement QR Asset</span>
              </button>
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
                Primary UPI VPA ID *
              </label>
              <input
                type="text"
                required
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="w-full bg-canvas border border-border px-3.5 py-2 text-sm font-mono text-ink focus:border-gold focus:outline-none"
              />
            </div>

            <div>
              <label className="block uppercase tracking-caps text-muted font-medium mb-1.5">
                Account Beneficiary Name *
              </label>
              <input
                type="text"
                required
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="w-full bg-canvas border border-border px-3.5 py-2 text-sm text-ink focus:border-gold focus:outline-none"
              />
            </div>

            <div>
              <label className="block uppercase tracking-caps text-muted font-medium mb-1.5">
                Bank &amp; Branch *
              </label>
              <input
                type="text"
                required
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full bg-canvas border border-border px-3.5 py-2 text-xs text-ink focus:border-gold focus:outline-none"
              />
            </div>

            <div>
              <label className="block uppercase tracking-caps text-muted font-medium mb-1.5">
                Bank IFSC Code *
              </label>
              <input
                type="text"
                required
                value={ifscCode}
                onChange={(e) => setIfscCode(e.target.value)}
                className="w-full bg-canvas border border-border px-3.5 py-2 text-xs font-mono text-ink focus:border-gold focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block uppercase tracking-caps text-muted font-medium mb-1.5">
                Payment Hold Window (Hours) *
              </label>
              <input
                type="number"
                required
                value={paymentHoldHours}
                onChange={(e) => setPaymentHoldHours(e.target.value)}
                className="w-32 bg-canvas border border-border px-3.5 py-2 text-xs font-semibold tabular-nums text-ink focus:border-gold focus:outline-none"
              />
              <span className="text-[10px] text-muted block mt-1">
                Stock reservation is released if payment is not received within this window.
              </span>
            </div>

            <div className="sm:col-span-2">
              <label className="block uppercase tracking-caps text-muted font-medium mb-1.5">
                Payment Guidance Text (Sent to Customer)
              </label>
              <textarea
                rows={3}
                value={paymentInstructions}
                onChange={(e) => setPaymentInstructions(e.target.value)}
                className="w-full bg-canvas border border-border px-3.5 py-2 text-xs text-ink focus:border-gold focus:outline-none leading-relaxed"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="bg-navy hover:bg-gold hover:text-navy text-canvas py-3 px-6 text-xs uppercase tracking-caps font-semibold flex items-center space-x-2 transition-colors rounded shadow-xs"
        >
          <Save className="w-4 h-4" />
          <span>Save Financial Configuration</span>
        </button>
      </form>
    </div>
  );
}
