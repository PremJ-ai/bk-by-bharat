"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Activity, ArrowUpRight, BarChart3, Eye, RefreshCw, ShoppingCart, Users } from "lucide-react";
import { apiClient } from "@/lib/api/client";

interface GA4Overview {
  configured: boolean;
  propertyId?: string;
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

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

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

  return (
    <section className="admin-panel" aria-labelledby="ga4-panel-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="admin-panel-title flex items-center gap-2" id="ga4-panel-title">
            <BarChart3 className="h-4 w-4 text-[#d52f7a]" />
            Google Analytics 4
          </div>
          <p className="admin-panel-caption mt-1">
            Website activity · Last 7 days
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          aria-label="Refresh analytics"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-pink-200 hover:text-pink-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading && (
        <div className="mt-5 grid grid-cols-2 gap-2" aria-live="polite">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-[76px] animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="admin-empty-analytics mt-4" role="alert">
          <strong className="block text-rose-700">GA4 report unavailable</strong>
          <span className="mt-1 block">{error}</span>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-3 text-[10px] font-bold uppercase tracking-[0.1em] text-[#b52d70]"
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && overview && !overview.configured && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.1em]">
            <span className={`h-2 w-2 rounded-full ${tagConfigured ? "bg-emerald-500" : "bg-amber-500"}`} />
            <span className={tagConfigured ? "text-emerald-700" : "text-amber-700"}>
              {tagConfigured ? "Website tag configured" : "Website tag not configured"}
            </span>
          </div>
          <div className="admin-empty-analytics">
            {tagConfigured
              ? "The storefront can send GA4 events. To display live reports here, connect a Google Analytics Data API service account to this GA4 property."
              : "Add the GA4 Measurement ID to the frontend Production environment to start collecting storefront events. Admin reporting also needs server-side Data API access."}
          </div>
          <div className="space-y-1 rounded-xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-500">Backend report credentials required</p>
            {(overview.setupRequired || [
              "GOOGLE_ANALYTICS_PROPERTY_ID",
              "GOOGLE_SERVICE_ACCOUNT_EMAIL",
              "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY",
            ]).map((name) => (
              <p key={name} className="font-mono text-[10px] text-slate-600">{name}</p>
            ))}
          </div>
          <Link
            href="https://analytics.google.com/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[#d52f7a] hover:text-[#a91f5e]"
          >
            Open Google Analytics <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {!loading && !error && overview?.configured && overview.metrics && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-[#edf4ff] p-3">
              <div className="flex items-center gap-2 text-[#2866c7]">
                <Users className="h-4 w-4" />
                <span className="text-[9px] font-bold uppercase tracking-[0.08em]">Active users</span>
              </div>
              <p className="mt-2 text-xl font-extrabold tracking-tight text-[#17243d]">{formatCount(overview.metrics.activeUsers)}</p>
            </div>
            <div className="rounded-xl bg-[#eaf8f1] p-3">
              <div className="flex items-center gap-2 text-[#11865e]">
                <Activity className="h-4 w-4" />
                <span className="text-[9px] font-bold uppercase tracking-[0.08em]">Sessions</span>
              </div>
              <p className="mt-2 text-xl font-extrabold tracking-tight text-[#17243d]">{formatCount(overview.metrics.sessions)}</p>
            </div>
            <div className="rounded-xl bg-[#fff0f7] p-3">
              <div className="flex items-center gap-2 text-[#d52f7a]">
                <Eye className="h-4 w-4" />
                <span className="text-[9px] font-bold uppercase tracking-[0.08em]">Page views</span>
              </div>
              <p className="mt-2 text-xl font-extrabold tracking-tight text-[#17243d]">{formatCount(overview.metrics.pageViews)}</p>
            </div>
            <div className="rounded-xl bg-[#fff3e8] p-3">
              <div className="flex items-center gap-2 text-[#c86a24]">
                <ShoppingCart className="h-4 w-4" />
                <span className="text-[9px] font-bold uppercase tracking-[0.08em]">Add to cart</span>
              </div>
              <p className="mt-2 text-xl font-extrabold tracking-tight text-[#17243d]">{formatCount(overview.metrics.addToCarts)}</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl border border-slate-100 p-3 text-center">
            <div>
              <p className="text-lg font-extrabold text-[#17243d]">{formatCount(overview.metrics.checkouts)}</p>
              <p className="text-[9px] uppercase tracking-wide text-slate-500">Checkouts</p>
            </div>
            <div>
              <p className="text-lg font-extrabold text-[#17243d]">{formatCount(overview.metrics.purchases)}</p>
              <p className="text-[9px] uppercase tracking-wide text-slate-500">Purchases</p>
            </div>
            <div>
              <p className="text-sm font-extrabold text-[#17243d]">{formatCurrency(overview.metrics.revenue)}</p>
              <p className="text-[9px] uppercase tracking-wide text-slate-500">Revenue</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2 text-[9px] text-slate-500">
            <span>GA4 property {overview.propertyId}</span>
            <span>{overview.updatedAt ? `Updated ${new Date(overview.updatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` : ""}</span>
          </div>
          <Link
            href="https://analytics.google.com/"
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[#d52f7a] hover:text-[#a91f5e]"
          >
            Open full GA4 reports <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </>
      )}
    </section>
  );
}
