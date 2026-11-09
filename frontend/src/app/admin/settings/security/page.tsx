"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, KeyRound, Loader2, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { apiClient, ApiError, setClientCsrfToken } from "@/lib/api/client";
import type { AdminUserDTO } from "@/lib/api/types";

export default function AdminAccountSecurityPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let active = true;
    apiClient<AdminUserDTO>("/admin-auth/session")
      .then((result) => {
        if (active) setEmail(result.data.username);
      })
      .catch(() => {
        if (active) setError("Your admin session could not be verified. Sign in again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (!email.trim()) {
      setError("Enter the email address you want to use for admin sign-in.");
      return;
    }
    if (!currentPassword) {
      setError("Enter your current password to authorize this change.");
      return;
    }
    if (newPassword && newPassword.length < 14) {
      setError("A new admin password must be at least 14 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("The new password and confirmation do not match.");
      return;
    }

    setSaving(true);
    try {
      await apiClient<{ success: boolean; email: string; reauthenticationRequired: boolean }>(
        "/admin-auth/security",
        {
          method: "PUT",
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            currentPassword,
            newPassword: newPassword || undefined,
          }),
        }
      );

      setSuccess(true);
      setClientCsrfToken(null);
      // The API revokes all sessions and clears the current browser's cookies.
      router.replace("/admin/login?credentials-updated=1");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The security update could not be completed.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-muted">
        <Loader2 className="h-5 w-5 animate-spin" /> Verifying administrator session…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="border-b border-border pb-5">
        <span className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold">
          <ShieldCheck className="h-4 w-4" /> Administrator access
        </span>
        <h1 className="font-display text-3xl font-medium text-ink">Account security</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
          Use your real administrator email and a strong password. Customer accounts and public admin registration remain disabled.
        </p>
      </header>

      {error && (
        <div role="alert" className="flex items-start gap-2 border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div role="status" className="flex items-start gap-2 border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> Credentials updated. Sign in again with your new email and password.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 border border-border bg-surface p-6 sm:p-8">
        <div className="space-y-2">
          <label htmlFor="admin-email" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-caps text-muted">
            <Mail className="h-4 w-4" /> Administrator email
          </label>
          <input
            id="admin-email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full border border-border bg-canvas px-4 py-3 text-sm text-ink outline-none focus:border-gold"
            placeholder="owner@yourdomain.com"
          />
          <p className="text-[11px] text-muted">This becomes the email used on the admin login screen. It must be an inbox you control.</p>
        </div>

        <div className="space-y-2">
          <label htmlFor="current-password" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-caps text-muted">
            <LockKeyhole className="h-4 w-4" /> Current password
          </label>
          <input
            id="current-password"
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            className="w-full border border-border bg-canvas px-4 py-3 text-sm text-ink outline-none focus:border-gold"
          />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="new-password" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-caps text-muted">
              <KeyRound className="h-4 w-4" /> New password (optional)
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              minLength={14}
              maxLength={128}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="w-full border border-border bg-canvas px-4 py-3 text-sm text-ink outline-none focus:border-gold"
              placeholder="At least 14 characters"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="confirm-password" className="block text-xs font-semibold uppercase tracking-caps text-muted">
              Confirm new password
            </label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              maxLength={128}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full border border-border bg-canvas px-4 py-3 text-sm text-ink outline-none focus:border-gold"
              placeholder="Repeat the new password"
            />
          </div>
        </div>

        <div className="border border-border bg-canvas-muted p-4 text-xs leading-relaxed text-muted">
          <strong className="text-ink">What happens when you save:</strong> Your current password is checked, the new password is hashed with Argon2id, and every active admin session is revoked. You will be signed out and must log in again on all devices. Password changes require at least 14 characters.
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex min-h-11 items-center justify-center gap-2 bg-navy px-6 py-3 text-xs font-semibold uppercase tracking-caps text-white transition hover:bg-gold hover:text-navy disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          {saving ? "Updating credentials…" : "Save account security"}
        </button>
      </form>
    </div>
  );
}
