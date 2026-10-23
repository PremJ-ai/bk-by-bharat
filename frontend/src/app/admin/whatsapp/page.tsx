"use client";

import { useState } from "react";
import {
  MessageSquare,
  Search,
  CheckCheck,
  Check,
  Clock,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";

interface WhatsAppMessageLog {
  id: string;
  providerMessageId: string;
  direction: "outbound" | "inbound";
  phone: string;
  type: "template" | "media_image" | "text" | "interactive";
  summary: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
}

const MOCK_MESSAGES: WhatsAppMessageLog[] = [
  {
    id: "msg-101",
    providerMessageId: "wamid.HBgMOTE5ODIwMDQ1Njc4FQIAERgSQTcyMDQ1",
    direction: "inbound",
    phone: "+91 98200 45678",
    type: "media_image",
    summary: "Payment receipt image attached (2.4 MB)",
    status: "read",
    timestamp: "2026-10-23T16:15:22Z",
  },
  {
    id: "msg-102",
    providerMessageId: "wamid.HBgMOTE5ODIwMDQ1Njc4FQIAERgSQTcyMDQ0",
    direction: "outbound",
    phone: "+91 98200 45678",
    type: "template",
    summary: "Final Bill v1 & Studio Payment QR (Utility Template: order_payment_request_v1)",
    status: "read",
    timestamp: "2026-10-23T15:02:11Z",
  },
  {
    id: "msg-103",
    providerMessageId: "wamid.HBgMOTE5OTMwMDc4OTAxFQIAERgSQTcyMDQz",
    direction: "outbound",
    phone: "+91 99300 78901",
    type: "template",
    summary: "Order ORD-2026-8839 Confirmation & Atelier Review Notice",
    status: "delivered",
    timestamp: "2026-10-23T14:45:05Z",
  },
  {
    id: "msg-104",
    providerMessageId: "wamid.HBgMOTE5NzExMDExMjIzFQIAERgSQTcyMDQy",
    direction: "outbound",
    phone: "+91 97110 11223",
    type: "template",
    summary: "Payment Verified Notice for ORD-2026-8838 & Tailoring Commenced",
    status: "read",
    timestamp: "2026-10-23T11:32:00Z",
  },
  {
    id: "msg-105",
    providerMessageId: "wamid.HBgMOTE5ODQwMDMzNDQ1FQIAERgSQTcyMDQx",
    direction: "outbound",
    phone: "+91 98400 33445",
    type: "template",
    summary: "Courier Dispatch Waybill BD-88492011IN (Bluedart Express)",
    status: "read",
    timestamp: "2026-10-22T09:12:30Z",
  },
];

export default function AdminWhatsAppPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [directionFilter, setDirectionFilter] = useState<string>("all");

  const filtered = MOCK_MESSAGES.filter((msg) => {
    const matchesSearch =
      msg.phone.includes(searchTerm) ||
      msg.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.providerMessageId.includes(searchTerm);
    const matchesDirection = directionFilter === "all" || msg.direction === directionFilter;
    return matchesSearch && matchesDirection;
  });

  const getStatusIcon = (status: WhatsAppMessageLog["status"]) => {
    switch (status) {
      case "read":
        return <span title="Read"><CheckCheck className="w-3.5 h-3.5 text-navy" /></span>;
      case "delivered":
        return <span title="Delivered"><CheckCheck className="w-3.5 h-3.5 text-muted" /></span>;
      case "sent":
        return <span title="Sent"><Check className="w-3.5 h-3.5 text-muted" /></span>;
      case "failed":
        return <span title="Failed"><AlertCircle className="w-3.5 h-3.5 text-rust" /></span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <span className="text-xs uppercase tracking-caps text-gold font-medium block mb-1">
            Communication Gateway &middot; Milestone 1 Shell
          </span>
          <h1 className="font-display text-3xl text-ink font-normal">
            WhatsApp Messages &amp; Webhook Logs
          </h1>
        </div>

        <div className="flex items-center space-x-2 text-xs text-stock-ok bg-stock-ok/10 px-3 py-1.5 rounded font-medium">
          <span className="w-2 h-2 rounded-full bg-stock-ok animate-pulse" />
          <span>Meta Cloud API Webhook Verified</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface border border-border p-4 flex flex-col md:flex-row justify-between gap-4">
        {/* Direction Filters */}
        <div className="flex items-center space-x-1 text-xs">
          {[
            { id: "all", label: "All Messages" },
            { id: "outbound", label: "Outbound Bills & Notices" },
            { id: "inbound", label: "Inbound Proofs & Inquiries" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setDirectionFilter(tab.id)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                directionFilter === tab.id
                  ? "bg-navy text-canvas"
                  : "text-muted hover:text-ink hover:bg-surface-muted"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by patron phone or message..."
            className="w-full bg-canvas border border-border pl-9 pr-4 py-1.5 text-xs text-ink focus:border-gold focus:outline-none"
          />
        </div>
      </div>

      {/* Messages Table */}
      <div className="bg-surface border border-border overflow-x-auto shadow-xs">
        <table className="w-full text-left text-xs font-sans">
          <thead className="bg-surface-muted border-b border-border uppercase tracking-caps text-[10px] text-muted">
            <tr>
              <th className="py-3 px-4">Direction</th>
              <th className="py-3 px-4">Patron WhatsApp</th>
              <th className="py-3 px-4">Message / Template Payload</th>
              <th className="py-3 px-4">Provider Message ID</th>
              <th className="py-3 px-4">Delivery State</th>
              <th className="py-3 px-4 text-right">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-muted">
                  No WhatsApp events match the current filter.
                </td>
              </tr>
            ) : (
              filtered.map((msg) => (
                <tr key={msg.id} className="hover:bg-surface-muted/50 transition-colors">
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block text-[10px] uppercase tracking-caps px-2 py-0.5 rounded font-medium ${
                        msg.direction === "outbound"
                          ? "bg-navy/10 text-navy border border-navy/20"
                          : "bg-gold/10 text-gold border border-gold/30"
                      }`}
                    >
                      {msg.direction}
                    </span>
                  </td>

                  <td className="py-3 px-4 font-mono font-medium text-ink">
                    {msg.phone}
                  </td>

                  <td className="py-3 px-4 text-muted max-w-sm truncate" title={msg.summary}>
                    {msg.summary}
                  </td>

                  <td className="py-3 px-4 font-mono text-[10px] text-muted/70 truncate max-w-[150px]">
                    {msg.providerMessageId}
                  </td>

                  <td className="py-3 px-4 flex items-center space-x-1.5 text-muted">
                    {getStatusIcon(msg.status)}
                    <span className="capitalize text-[11px]">{msg.status}</span>
                  </td>

                  <td className="py-3 px-4 text-right text-muted font-mono text-[11px]">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
