"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient, ApiError } from "@/lib/api/client";
import type { AdminUserDTO } from "@/lib/api/types";
import { Shield, Lock, User, ArrowRight, AlertCircle, Loader2 } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!username.trim() || !password) {
      setErrorMessage("Please provide both username and password.");
      return;
    }

    setLoading(true);

    try {
      await apiClient<AdminUserDTO>("/admin-auth/login", {
        method: "POST",
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      // Successful login - redirect to admin overview
      router.push("/admin");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("An unexpected network error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-strong flex items-center justify-center p-6 text-canvas select-none">
      <div className="w-full max-w-md bg-navy border border-white/10 p-8 md:p-10 shadow-2xl relative">
        {/* Subtle decorative gold hairline */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gold" />

        {/* Portal Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/5 border border-white/10 text-gold mb-3">
            <Shield className="w-5 h-5" />
          </div>
          <h1 className="font-display text-2xl md:text-3xl font-medium tracking-tight text-canvas">
            Atelier Portal
          </h1>
          <p className="text-canvas/60 text-xs uppercase tracking-caps font-sans mt-1">
            Restricted Staff &amp; Catalog Management
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div
            role="alert"
            className="mb-6 bg-rust/20 border border-rust text-canvas px-4 py-3 text-xs flex items-start space-x-2.5 rounded"
          >
            <AlertCircle className="w-4 h-4 text-rust flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {/* Sign In Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="username"
              className="block text-xs uppercase tracking-caps text-canvas/80 mb-2 font-medium"
            >
              Staff Identifier / Email
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-canvas/40">
                <User className="w-4 h-4" />
              </span>
              <input
                id="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin@store.local"
                className="w-full bg-navy-strong border border-white/20 pl-10 pr-4 py-2.5 text-sm text-canvas placeholder:text-canvas/30 focus:border-gold focus:ring-1 focus:ring-gold focus:outline-none rounded-none transition-colors"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs uppercase tracking-caps text-canvas/80 mb-2 font-medium"
            >
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-canvas/40">
                <Lock className="w-4 h-4" />
              </span>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-navy-strong border border-white/20 pl-10 pr-4 py-2.5 text-sm text-canvas placeholder:text-canvas/30 focus:border-gold focus:ring-1 focus:ring-gold focus:outline-none rounded-none transition-colors"
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-canvas text-navy hover:bg-gold hover:text-navy py-3 px-4 text-xs uppercase tracking-caps font-semibold flex items-center justify-center space-x-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Sign In to Studio</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/10 text-center">
          <p className="text-[11px] text-canvas/40 leading-relaxed font-sans">
            One-time administrative bootstrap required. Customer self-registration is disabled by policy.
          </p>
        </div>
      </div>
    </div>
  );
}
