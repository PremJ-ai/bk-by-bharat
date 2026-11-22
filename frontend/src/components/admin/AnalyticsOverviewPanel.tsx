"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Eye,
  RefreshCw,
  ShoppingCart,
  Users,
  CreditCard,
  TrendingUp,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";

interface GA4Overview {
  configured: boolean;
  propertyId?: string;
  currencyCode?: string;
  period: "last_7_days";
  updatedAt?: string;
  metrics: {
    activeUsers: number;
    sessions: number;
    pageViews: number;
    addToCarts: number;
    checkouts: number;
    purchases: number;
    revenue: number;
  } | null;
  setupRequired?: string[];
}

const formatCount = (value: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);

const formatCurrency = (value: number, currencyCode = "INR") => {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currencyCode} ${formatCount(value)}`;
  }
};

export function AnalyticsOverviewPanel() {
  const [overview, setOverview] = useState<GA4Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient<GA4Overview>("/admin/analytics/overview");
      setOverview(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analytics report could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const tagConfigured = Boolean(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID);
  const metrics = overview?.metrics;
  const cards = metrics
    ? [
        { label: "Active users", value: formatCount(metrics.activeUsers), icon: Users, tone: "blue" },
        { label: "Sessions", value: formatCount(metrics.sessions), icon: Activity, tone: "green" },
        { label: "Page views", value: formatCount(metrics.pageViews), icon: Eye, tone: "purple" },
        { label: "Add to carts", value: formatCount(metrics.addToCarts), icon: ShoppingCart, tone: "orange" },
        { label: "Checkouts", value: formatCount(metrics.checkouts), icon: CreditCard, tone: "pink" },
        { label: "Purchases", value: formatCount(metrics.purchases), icon: TrendingUp, tone: "teal" },
        { label: "Revenue", value: formatCurrency(metrics.revenue, overview?.currencyCode), icon: BarChart3, tone: "gold" },
      ]
    : [];

  const funnelMaximum = Math.max(metrics?.sessions || 0, metrics?.addToCarts || 0, metrics?.checkouts || 0, metrics?.purchases || 0, 1);
  const funnel = metrics
    ? [
        { label: "Sessions", value: metrics.sessions },
        { label: "Added to cart", value: metrics.addToCarts },
        { label: "Checkout started", value: metrics.checkouts },
        { label: "Purchases", value: metrics.purchases },
      ]
    : [];

  return (
    <section className="admin-panel min-w-0" aria-labelledby="ga4-panel-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="admin-panel-title flex items-center gap-2" id="ga4-panel-title">
            <BarChart3 className="h-4 w-4 text-[#d52f7a]" aria-hidden="true" />
            Google Analytics 4
            <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-emerald-700">
              Storefront
            </span>
          </div>
          <p className="admin-panel-caption mt-1">
            Website performance · Last 7 days
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          aria-label="Refresh Google Analytics report"
          className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-pink-200 hover:text-pink-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
        </button>
      </div>

      {loading && (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7" aria-label="Loading analytics" aria-live="polite">
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="admin-empty-analytics mt-4" role="alert">
          <strong className="block text-rose-700">GA4 report unavailable</strong>
          <span className="mt-1 block break-words">{error}</span>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-3 inline-flex min-h-10 items-center rounded-lg px-3 text-xs font-bold uppercase tracking-wide text-[#a52560] hover:bg-pink-50"
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && overview && !overview.configured && (
        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)]">
          <div className="admin-empty-analytics">
            <div className="mb-2 flex items-center gap-2 font-bold text-amber-800">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Reporting connection needs attention
            </div>
            <p>
              {tagConfigured
                ? "The storefront Measurement ID is available in this frontend build, but the backend report service is missing one or more server-side settings."
                : "The GA4 browser tag is not present in this frontend build. Confirm NEXT_PUBLIC_GA_MEASUREMENT_ID is set on the frontend Vercel project and redeploy the frontend."}
            </p>
            <p className="mt-2 text-xs">
              Browser event collection and server-side reporting are separate connections. Both must be configured for this dashboard.
            </p>
          </div>
          <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-600">Backend settings reported missing</p>
            {(overview.setupRequired || []).map((name) => (
              <p key={name} className="break-all font-mono text-xs text-slate-700">{name}</p>
            ))}
            <Link
              href="https://analytics.google.com/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-10 items-center gap-2 text-xs font-bold text-[#a52560] hover:text-[#7d1947]"
            >
              Open Google Analytics <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {!loading && !error && overview?.configured && metrics && (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
            {cards.map(({ label, value, icon: Icon, tone }) => (
              <article key={label} className="min-w-0 rounded-xl border border-slate-100 bg-white p-3 shadow-sm sm:p-4">
                <div className="flex min-w-0 items-center gap-2">
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg admin-ga4-icon--${tone}`}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 break-words text-[10px] font-bold uppercase leading-tight tracking-wide text-slate-500">{label}</span>
                </div>
                <p className="mt-3 break-words text-xl font-extrabold tracking-tight text-[#17243d] sm:text-2xl">{value}</p>
              </article>
            ))}
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(260px,0.75fr)]">
            <div className="rounded-xl border border-slate-100 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Shopping funnel</h3>
                  <p className="mt-1 text-xs text-slate-500">From store visits to completed purchases</p>
                </div>
                <span className="text-[10px] font-semibold text-slate-500">Last 7 days</span>
              </div>
              <div className="mt-5 space-y-4">
                {funnel.map((item) => (
                  <div key={item.label}>
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                      <span className="font-medium text-slate-600">{item.label}</span>
                      <strong className="tabular-nums text-slate-800">{formatCount(item.value)}</strong>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${item.label}: ${formatCount(item.value)}`}>
                      <div className="h-full rounded-full bg-gradient-to-r from-[#d52f7a] to-[#f18bb8]" style={{ width: `${Math.max((item.value / funnelMaximum) * 100, item.value > 0 ? 2 : 0)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex min-w-0 flex-col justify-between rounded-xl bg-[#f7f9fd] p-4 sm:p-5">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Report connection</h3>
                <p className="mt-2 break-all text-xs leading-6 text-slate-600">
                  Property ID: <strong className="text-slate-800">{overview.propertyId}</strong>
                </p>
                <p className="text-xs leading-6 text-slate-600">
                  Currency: <strong className="text-slate-800">{overview.currencyCode || "Property default"}</strong>
                </p>
                <p className="text-xs leading-6 text-slate-600">
                  Report source: <strong className="text-emerald-700">Google Analytics Data API</strong>
                </p>
              </div>
              <div className="mt-5">
                <p className="text-[10px] text-slate-500">
                  {overview.updatedAt
                    ? `Updated ${new Date(overview.updatedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}`
                    : "Update time unavailable"}
                </p>
                <Link
                  href="https://analytics.google.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex min-h-10 items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#a52560] hover:text-[#7d1947]"
                >
                  Open full GA4 reports <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
