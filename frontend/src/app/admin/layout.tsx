"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api/client";
import type { AdminUserDTO } from "@/lib/api/types";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  LogOut,
  Loader2,
  ExternalLink,
  UserRound,
  MessageCircle,
  QrCode,
  Menu,
  X,
  ShieldCheck,
} from "lucide-react";
import "./admin-ui.css";

const navLinks = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products & Media", icon: Package },
  { href: "/admin/orders", label: "Orders & Verification", icon: ShoppingBag },
  { href: "/admin/settings/payment", label: "Payment QR & Bank", icon: QrCode },
  { href: "/admin/settings/security", label: "Account Security", icon: ShieldCheck },
  { href: "/admin/whatsapp", label: "WhatsApp Logs", icon: MessageCircle },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const pageRef = useRef<HTMLDivElement>(null);
  const [admin, setAdmin] = useState<AdminUserDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const isLoginPage = pathname === "/admin/login";
  const currentNav = navLinks.find((item) =>
    item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href)
  );
  const currentLabel = currentNav?.label || "Admin workspace";
  const initials = admin?.username?.trim()?.charAt(0)?.toUpperCase() || "A";

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
      } catch {
        if (isMounted) {
          router.replace("/admin/login");
        }
      }
    }

    checkSession();

    return () => {
      isMounted = false;
    };
  }, [pathname, isLoginPage, router]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isLoginPage) return;

    const pageRoot = pageRef.current?.firstElementChild as HTMLElement | null;
    if (!pageRoot) return;

    let targets = Array.from(pageRoot.children).filter(
      (element): element is HTMLElement => element instanceof HTMLElement
    );

    if (targets.length <= 1 && pageRoot.firstElementChild instanceof HTMLElement) {
      targets = Array.from(pageRoot.firstElementChild.children).filter(
        (element): element is HTMLElement => element instanceof HTMLElement
      );
    }

    if (targets.length === 0) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || !("IntersectionObserver" in window)) return;

    targets.forEach((element, index) => {
      element.dataset.adminReveal = "hidden";
      element.style.setProperty("--admin-reveal-delay", `${Math.min(index * 55, 220)}ms`);
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.target instanceof HTMLElement) {
            entry.target.dataset.adminReveal = "visible";
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -28px 0px" }
    );

    targets.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [pathname, isLoginPage]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await apiClient("/admin-auth/logout", {
        method: "POST",
      });
    } catch {
      // Session is cleared locally and the protected route redirects on next navigation.
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
      <div className="admin-ui admin-loading flex min-h-screen flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
        <p className="text-xs font-semibold uppercase tracking-caps text-muted">
          Verifying secure admin session…
        </p>
      </div>
    );
  }

  if (!admin) return null;

  return (
    <div className="admin-ui">
      <div className="admin-shell">
        <button
          type="button"
          aria-label="Close navigation menu"
          className={`admin-mobile-backdrop ${mobileNavOpen ? "is-open" : ""}`}
          onClick={() => setMobileNavOpen(false)}
          tabIndex={mobileNavOpen ? 0 : -1}
        />

        <aside className={`admin-sidebar ${mobileNavOpen ? "is-open" : ""}`} aria-label="Admin navigation">
          <div>
            <Link href="/admin" className="admin-brand no-underline">
              <span className="admin-brand-mark">B</span>
              <span>
                <span className="admin-brand-title block">BHARAT</span>
                <span className="admin-brand-subtitle block">Atelier operations</span>
              </span>
            </Link>

            <div className="admin-nav-label">Workspace</div>
            <nav className="admin-nav">
              {navLinks.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === "/admin"
                    ? pathname === item.href
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className="admin-nav-link"
                  >
                    <span className="admin-nav-icon">
                      <Icon className="h-[17px] w-[17px]" />
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="admin-sidebar-bottom">
            <div className="admin-user-row">
              <span className="admin-avatar">{initials}</span>
              <span className="admin-user-meta">
                <span className="admin-user-name block">{admin.username}</span>
                <span className="admin-user-role block">
                  {admin.role} · {admin.status}
                </span>
              </span>
            </div>

            <div className="admin-sidebar-actions">
              <Link
                href="/"
                target="_blank"
                rel="noreferrer"
                className="admin-sidebar-action"
              >
                <span>View storefront</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="admin-sidebar-action admin-sidebar-action--logout"
                aria-label="Sign out"
                title="Sign out"
              >
                {isLoggingOut ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </aside>

        <div className="admin-main">
          <header className="admin-topbar">
            <div className="admin-topbar-left">
              <button
                type="button"
                className="admin-mobile-toggle"
                aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
                aria-expanded={mobileNavOpen}
                onClick={() => setMobileNavOpen((open) => !open)}
              >
                {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
              <div className="admin-breadcrumb">
                Atelier <span className="px-1.5 text-slate-300">/</span>
                <strong>{currentLabel}</strong>
              </div>
            </div>

            <div className="admin-topbar-right">
              <span className="admin-session-pill">
                <span className="admin-session-dot" />
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Secure admin session</span>
              </span>
              <span className="hidden items-center gap-2 sm:flex">
                <span className="admin-avatar">{initials}</span>
                <span className="hidden max-w-[150px] truncate text-[10px] font-semibold text-slate-600 md:inline">
                  {admin.username}
                </span>
              </span>
            </div>
          </header>

          <main className="admin-content">
            <div key={pathname} ref={pageRef} className="admin-page-transition">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
