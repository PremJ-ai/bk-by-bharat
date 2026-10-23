"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { apiClient, ApiError } from "@/lib/api/client";
import type { AdminUserDTO } from "@/lib/api/types";
import {
  Shield,
  Package,
  ShoppingBag,
  Settings,
  LogOut,
  Loader2,
  ExternalLink,
  UserCheck,
} from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [admin, setAdmin] = useState<AdminUserDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Skip session check for login page
  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (isLoginPage) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function checkSession() {
      try {
        const res = await apiClient<AdminUserDTO>("/admin-auth/session");
        if (isMounted) {
          setAdmin(res.data);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          // If unauthorized, redirect to login
          router.replace("/admin/login");
        }
      }
    }

    checkSession();

    return () => {
      isMounted = false;
    };
  }, [pathname, isLoginPage, router]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await apiClient("/admin-auth/logout", {
        method: "POST",
      });
    } catch {
      // Ignore errors on logout
    } finally {
      setAdmin(null);
      setIsLoggingOut(false);
      router.push("/admin/login");
      router.refresh();
    }
  };

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-muted flex flex-col items-center justify-center p-6 text-ink">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-gold mx-auto" />
          <p className="text-xs uppercase tracking-caps text-muted font-medium font-sans">
            Verifying Atelier Security Session...
          </p>
        </div>
      </div>
    );
  }

  if (!admin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-surface-muted text-ink flex flex-col md:flex-row antialiased">
      {/* Admin Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-navy text-canvas p-6 flex flex-col justify-between border-r border-navy-strong flex-shrink-0">
        <div>
          {/* Logo / Badge */}
          <div className="flex items-center space-x-3 mb-8 pb-6 border-b border-white/10">
            <div className="w-8 h-8 rounded bg-gold/20 border border-gold/40 flex items-center justify-center text-gold">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <span className="font-display text-lg text-canvas block leading-tight">
                BHARAT
              </span>
              <span className="text-[9px] uppercase tracking-caps text-gold font-sans font-medium">
                Atelier Operations
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5 text-xs uppercase tracking-caps font-medium">
            <Link
              href="/admin"
              className={`flex items-center space-x-3 px-3.5 py-2.5 rounded transition-colors ${
                pathname === "/admin"
                  ? "bg-white/10 text-gold"
                  : "text-canvas/70 hover:text-canvas hover:bg-white/5"
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Overview</span>
            </Link>

            <div className="pt-4 pb-2 px-3.5 text-[9px] uppercase tracking-[0.2em] text-canvas/40">
              Future Milestones
            </div>

            <div
              className="flex items-center justify-between px-3.5 py-2 text-canvas/40 cursor-not-allowed"
              title="Available in Milestone 1/4"
            >
              <div className="flex items-center space-x-3">
                <Package className="w-4 h-4" />
                <span>Catalog &amp; Media</span>
              </div>
              <span className="text-[9px] border border-white/20 px-1 py-0.5">M1</span>
            </div>

            <div
              className="flex items-center justify-between px-3.5 py-2 text-canvas/40 cursor-not-allowed"
              title="Available in Milestone 1/6"
            >
              <div className="flex items-center space-x-3">
                <ShoppingBag className="w-4 h-4" />
                <span>Orders &amp; QR Bills</span>
              </div>
              <span className="text-[9px] border border-white/20 px-1 py-0.5">M6</span>
            </div>

            <div
              className="flex items-center justify-between px-3.5 py-2 text-canvas/40 cursor-not-allowed"
              title="Available in Milestone 6"
            >
              <div className="flex items-center space-x-3">
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </div>
              <span className="text-[9px] border border-white/20 px-1 py-0.5">M6</span>
            </div>
          </nav>
        </div>

        {/* User Identity and Actions */}
        <div className="pt-6 border-t border-white/10 space-y-4">
          <div className="flex items-center space-x-3 px-1">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-canvas/80">
              <UserCheck className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <span className="block text-xs font-medium text-canvas truncate">
                {admin.username}
              </span>
              <span className="block text-[10px] text-gold uppercase tracking-wider">
                {admin.role} &middot; {admin.status}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Link
              href="/"
              target="_blank"
              className="flex-1 inline-flex items-center justify-center space-x-1.5 bg-white/5 hover:bg-white/10 text-canvas/80 text-[11px] uppercase tracking-wider py-2 px-2 transition-colors rounded"
            >
              <span>Storefront</span>
              <ExternalLink className="w-3 h-3" />
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="inline-flex items-center justify-center space-x-1.5 bg-rust/20 hover:bg-rust/30 text-canvas text-[11px] uppercase tracking-wider py-2 px-3 transition-colors rounded border border-rust/40"
              title="Sign Out"
            >
              {isLoggingOut ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LogOut className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Admin Surface */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="bg-surface border-b border-border h-16 px-6 md:px-10 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-xs uppercase tracking-caps text-muted font-medium font-sans">
              Operational Workspace &middot; Milestone 0 Foundation
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <span className="inline-flex items-center space-x-1.5 text-xs text-stock-ok bg-stock-ok/10 px-2.5 py-1 rounded">
              <span className="w-2 h-2 rounded-full bg-stock-ok animate-pulse" />
              <span className="font-medium">Express API &amp; DB Connected</span>
            </span>
          </div>
        </header>

        {/* Content View */}
        <main className="flex-1 p-6 md:p-10 max-w-[1440px] w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
