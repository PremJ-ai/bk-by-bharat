"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api/client";
import type { AdminUserDTO } from "@/lib/api/types";
import { AnalyticsOverviewPanel } from "@/components/admin/AnalyticsOverviewPanel";
import {
  Activity,
  ArrowUpRight,
  CheckCircle2,
  Database,
  KeyRound,
  MessageCircle,
  Package,
  QrCode,
  Server,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
} from "lucide-react";

interface HealthStatus {
  status: string;
  database: string;
  timestamp: string;
}

function StatusText({ value, pending = false }: { value: boolean | null; pending?: boolean }) {
  if (pending) return <span className="text-slate-500">Checking…</span>;
  if (value === null) return <span className="text-rose-600">Unavailable</span>;
  return value ? (
    <span className="text-emerald-700">Connected</span>
  ) : (
    <span className="text-rose-600">Needs attention</span>
  );
}

export default function AdminOverviewPage() {
  const [admin, setAdmin] = useState<AdminUserDTO | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [sessionResult, healthResult] = await Promise.allSettled([
          apiClient<AdminUserDTO>("/admin-auth/session"),
          apiClient<HealthStatus>("/health/ready"),
        ]);
        if (!isMounted) return;
        if (sessionResult.status === "fulfilled") {
          setAdmin(sessionResult.value.data);
        } else {
          console.error("Admin session could not be refreshed", sessionResult.reason);
        }
        if (healthResult.status === "fulfilled") {
          setHealth(healthResult.value.data);
        } else {
          setHealth(null);
          console.error("Backend readiness could not be checked", healthResult.reason);
        }
      } catch (err) {
        console.error("Failed to load admin telemetry", err);
      } finally {
        if (isMounted) setHasLoaded(true);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const apiConnected = health ? health.status === "ready" : null;
  const databaseConnected = health ? health.database === "connected" : null;
  const accountActive = admin ? admin.status === "ACTIVE" : null;

  const statCards = [
    {
      label: "Express API",
      value: health ? (apiConnected ? "Operational" : "Unavailable") : "Checking",
      note: "Live readiness endpoint",
      icon: Server,
      tone: "blue",
      healthy: apiConnected,
    },
    {
      label: "PostgreSQL database",
      value: health ? (databaseConnected ? "Connected" : "Unavailable") : "Checking",
      note: "Database readiness check",
      icon: Database,
      tone: "green",
      healthy: databaseConnected,
    },
    {
      label: "Administrator",
      value: admin?.role || "Verifying",
      note: admin?.username || "Authenticated account",
      icon: KeyRound,
      tone: "purple",
      healthy: accountActive,
    },
    {
      label: "Account status",
      value: admin?.status || (hasLoaded ? "Not verified" : "Checking"),
      note: "Current admin account",
      icon: ShieldCheck,
      tone: "pink",
      healthy: accountActive,
    },
  ];

  const actions = [
    {
      href: "/admin/products",
      title: "Manage products",
      description: "Catalogue, images and availability",
      icon: Package,
      tone: "pink",
    },
    {
      href: "/admin/orders",
      title: "Review orders",
      description: "Payment and fulfilment queue",
      icon: ShoppingBag,
      tone: "blue",
    },
    {
      href: "/admin/settings/payment",
      title: "Payment settings",
      description: "UPI details and customer instructions",
      icon: QrCode,
      tone: "green",
    },
    {
      href: "/admin/whatsapp",
      title: "WhatsApp activity",
      description: "Message log and delivery states",
      icon: MessageCircle,
      tone: "purple",
    },
  ];

  return (
    <div className="admin-dashboard space-y-6">
      <section data-admin-reveal className="admin-welcome">
        <div className="flex min-w-0 flex-col justify-center">
          <span className="admin-welcome-kicker">
            <Sparkles className="h-3.5 w-3.5" />
            Bharat Atelier · Operations
          </span>
          <h1 className="admin-dashboard-title mt-3">
            Welcome back{admin?.username ? `, ${admin.username.split("@")[0]}` : ""}.
          </h1>
          <p className="admin-dashboard-subtitle max-w-2xl">
            Manage products, orders, payments and customer updates.
          </p>
        </div>
      </section>

      <section data-admin-reveal className="admin-stat-grid" aria-label="Live system status">
        {statCards.map(({ label, value, note, icon: Icon, tone, healthy }) => (
          <article key={label} className="admin-stat-card">
            <div className={`admin-icon-tile admin-icon-tile--${tone}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="admin-stat-label mt-4">{label}</div>
            <div className="admin-stat-value">{value}</div>
            <div className="admin-stat-note flex items-center gap-1.5">
              {healthy === null ? (
                <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
              ) : (
                <span className={`h-1.5 w-1.5 rounded-full ${healthy ? "bg-emerald-500" : "bg-rose-500"}`} />
              )}
              <span>{note}</span>
            </div>
          </article>
        ))}
      </section>

      <section data-admin-reveal aria-label="Storefront analytics">
      </section>

      <section data-admin-reveal className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <div className="admin-panel">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="admin-panel-title">System health</h2>
              <p className="admin-panel-caption">Live information returned by the backend</p>
            </div>
            <span className="admin-icon-tile admin-icon-tile--green">
              <Activity className="h-5 w-5" />
            </span>
          </div>

          <div className="mt-3">
            <div className="admin-status-row">
              <div className="admin-status-meta">
                <span className="admin-icon-tile admin-icon-tile--blue h-8 w-8">
                  <Server className="h-4 w-4" />
                </span>
                <span>
                  <span className="admin-status-title block">Express API</span>
                  <span className="admin-status-description block">Health readiness endpoint</span>
                </span>
              </div>
              <span className="admin-status-value">
                <StatusText value={apiConnected} pending={!hasLoaded} />
              </span>
            </div>

            <div className="admin-status-row">
              <div className="admin-status-meta">
                <span className="admin-icon-tile admin-icon-tile--green h-8 w-8">
                  <Database className="h-4 w-4" />
                </span>
                <span>
                  <span className="admin-status-title block">PostgreSQL + Prisma</span>
                  <span className="admin-status-description block">Database connection check</span>
                </span>
              </div>
              <span className="admin-status-value">
                <StatusText value={databaseConnected} pending={!hasLoaded} />
              </span>
            </div>

            <div className="admin-status-row">
              <div className="admin-status-meta">
                <span className="admin-icon-tile admin-icon-tile--purple h-8 w-8">
                  <ShieldCheck className="h-4 w-4" />
                </span>
                <span>
                  <span className="admin-status-title block">Admin session</span>
                  <span className="admin-status-description block">Current authenticated identity</span>
                </span>
              </div>
              <span className="admin-status-value">
                <StatusText value={accountActive} pending={!hasLoaded} />
              </span>
            </div>
          </div>
        </div>

        <div className="admin-panel">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="admin-panel-title">Quick actions</h2>
              <p className="admin-panel-caption">Jump directly to a store operation</p>
            </div>
            <span className="admin-icon-tile admin-icon-tile--orange">
              <ArrowUpRight className="h-5 w-5" />
            </span>
          </div>

          <div className="admin-quick-grid">
            {actions.map(({ href, title, description, icon: Icon, tone }) => (
              <Link key={href} href={href} className={`admin-quick-link admin-quick-link--${tone}`}>
                <span className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <strong>{title}</strong>
                </span>
                <span>
                  <span>{description}</span>
                  <ArrowUpRight className="ml-2 h-3.5 w-3.5 shrink-0" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section data-admin-reveal>
        <div className="admin-panel">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="admin-panel-title">Workspace details</h2>
              <p className="admin-panel-caption">Authenticated administrator context</p>
            </div>
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">Signed-in user</span>
              <p className="mt-2 break-all text-sm font-bold text-slate-800">{admin?.username || "Verifying session…"}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">Access role</span>
              <p className="mt-2 text-sm font-bold text-slate-800">{admin?.role || "—"}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">Account status</span>
              <p className="mt-2 text-sm font-bold text-slate-800">{admin?.status || "—"}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">Last health check</span>
              <p className="mt-2 text-sm font-bold text-slate-800">
                {health?.timestamp
                  ? new Date(health.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                  : "Not available"}
              </p>
            </div>
          </div>
        </div>

        <AnalyticsOverviewPanel />
      </section>
    </div>
  );
}
