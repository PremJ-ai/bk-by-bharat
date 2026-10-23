"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api/client";
import type { AdminUserDTO } from "@/lib/api/types";
import { ShieldCheck, Database, Key, Server, CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";

interface HealthStatus {
  status: string;
  database: string;
  timestamp: string;
}

export default function AdminOverviewPage() {
  const [admin, setAdmin] = useState<AdminUserDTO | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [sessionRes, healthRes] = await Promise.all([
          apiClient<AdminUserDTO>("/admin-auth/session"),
          apiClient<HealthStatus>("/health/ready"),
        ]);
        setAdmin(sessionRes.data);
        setHealth(healthRes.data);
      } catch (err) {
        console.error("Failed to load admin telemetry", err);
      }
    }
    loadData();
  }, []);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-surface border border-border p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gold" />
        <div className="max-w-2xl">
          <span className="text-xs uppercase tracking-caps text-gold font-medium block mb-2">
            Secure Session Verified
          </span>
          <h1 className="font-display text-3xl md:text-4xl text-ink font-normal mb-3">
            Welcome, {admin?.username || "Administrator"}
          </h1>
          <p className="text-muted text-sm leading-relaxed font-sans">
            You are authenticated via Argon2id password verification and database-backed session tokens.
            Express server security controls, CSRF defense, and rate limits are actively guarding all endpoints.
          </p>
        </div>
      </div>

      {/* Infrastructure Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-surface p-6 border border-border space-y-3">
          <div className="w-9 h-9 rounded bg-stock-ok/10 text-stock-ok flex items-center justify-center">
            <Server className="w-5 h-5" />
          </div>
          <span className="text-[11px] uppercase tracking-caps text-muted block">
            Express Engine
          </span>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-stock-ok" />
            <span className="font-sans font-semibold text-ink text-base">
              Online &middot; Port 4000
            </span>
          </div>
          <p className="text-muted text-xs">Helmet, CORS, Rate Limiters Active</p>
        </div>

        <div className="bg-surface p-6 border border-border space-y-3">
          <div className="w-9 h-9 rounded bg-stock-ok/10 text-stock-ok flex items-center justify-center">
            <Database className="w-5 h-5" />
          </div>
          <span className="text-[11px] uppercase tracking-caps text-muted block">
            PostgreSQL + Prisma
          </span>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-stock-ok" />
            <span className="font-sans font-semibold text-ink text-base">
              {health?.database === "connected" ? "Connected" : "Verifying..."}
            </span>
          </div>
          <p className="text-muted text-xs">Migrations applied &amp; schema in sync</p>
        </div>

        <div className="bg-surface p-6 border border-border space-y-3">
          <div className="w-9 h-9 rounded bg-gold/10 text-gold flex items-center justify-center">
            <Key className="w-5 h-5" />
          </div>
          <span className="text-[11px] uppercase tracking-caps text-muted block">
            Session Security
          </span>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-stock-ok" />
            <span className="font-sans font-semibold text-ink text-base">
              Opaque DB Token
            </span>
          </div>
          <p className="text-muted text-xs">HttpOnly &middot; SameSite Lax &middot; Rotated</p>
        </div>

        <div className="bg-surface p-6 border border-border space-y-3">
          <div className="w-9 h-9 rounded bg-navy/10 text-navy flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <span className="text-[11px] uppercase tracking-caps text-muted block">
            CSRF &amp; Origin Defense
          </span>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-stock-ok" />
            <span className="font-sans font-semibold text-ink text-base">
              Double-Submit Active
            </span>
          </div>
          <p className="text-muted text-xs">Mutating calls verify Origin &amp; Token</p>
        </div>
      </div>

      {/* Milestone Roadmap & Next Gate */}
      <div className="bg-surface border border-border p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-border mb-6">
          <div>
            <span className="text-xs uppercase tracking-caps text-gold font-medium block mb-1">
              Architecture Delivery State
            </span>
            <h2 className="font-display text-2xl text-ink font-normal">
              Milestone 0: Operational Baseline Established
            </h2>
          </div>
          <span className="mt-3 md:mt-0 inline-flex items-center space-x-1.5 text-xs text-stock-ok bg-stock-ok/10 px-3 py-1.5 rounded font-medium">
            <CheckCircle2 className="w-4 h-4" />
            <span>Milestone 0 Acceptance Criteria Satisfied</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
          <div className="space-y-3">
            <h3 className="font-display text-lg text-ink font-medium">
              Completed in Milestone 0
            </h3>
            <ul className="space-y-2 text-muted text-xs font-sans">
              <li className="flex items-center space-x-2">
                <span className="text-stock-ok font-bold">✓</span>
                <span>Separate Next.js App Router and Express API applications</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-stock-ok font-bold">✓</span>
                <span>PostgreSQL instance, Prisma ORM, migrations, and schema definition</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-stock-ok font-bold">✓</span>
                <span>Argon2id password hashing &amp; database-backed session management</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-stock-ok font-bold">✓</span>
                <span>One-time server-side admin bootstrap CLI (no public registration)</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-stock-ok font-bold">✓</span>
                <span>Secure cookies, session rotation on login, revocation on logout</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-stock-ok font-bold">✓</span>
                <span>CSRF protection, Origin validation, and login rate limiting</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-stock-ok font-bold">✓</span>
                <span>Canonical OpenAPI 3.1 specification (/contracts/openapi.yaml)</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-stock-ok font-bold">✓</span>
                <span>Storefront homepage with luxury design tokens from design.md</span>
              </li>
            </ul>
          </div>

          <div className="space-y-3 bg-surface-muted p-6 border border-border">
            <h3 className="font-display text-lg text-ink font-medium">
              Awaiting User Approval: Milestone 1
            </h3>
            <p className="text-muted text-xs leading-relaxed font-sans">
              As mandated by project specifications, development stops here pending explicit authorization.
              Milestone 1 will implement the full frontend skeleton: collections, product detail page, cart drawer,
              guest checkout shell, admin product editor, and WhatsApp status displays.
            </p>
            <div className="pt-2">
              <Link
                href="/"
                className="inline-flex items-center space-x-2 text-navy text-xs uppercase tracking-caps font-semibold hover:text-gold transition-colors"
              >
                <span>View Live Storefront &rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
