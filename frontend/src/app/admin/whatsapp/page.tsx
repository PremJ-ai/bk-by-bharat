"use client";

import { useState, useEffect } from "react";
import { getWhatsAppMessages } from "@/lib/api/commerce";
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
  Loader2,
} from "lucide-react";

export default function AdminWhatsAppPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [directionFilter, setDirectionFilter] = useState<string>("all");
  const [refreshing, setRefreshing] = useState(false);

  const loadMessages = async () => {
    try {
      setRefreshing(true);
      const data = await getWhatsAppMessages({
        phone: searchTerm || undefined,
      });
      setMessages(data);
    } catch (err) {
      console.error("Failed to load WhatsApp messages:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, []);

  const filtered = messages.filter((msg) => {
    const matchesSearch =
      msg.recipientPhone.includes(searchTerm) ||
      (msg.bodyText && msg.bodyText.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (msg.templateName && msg.templateName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesDirection =
      directionFilter === "all" || msg.direction.toLowerCase() === directionFilter.toLowerCase();
    return matchesSearch && matchesDirection;
  });

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case "READ":
        return (
          <span title="Read">
            <CheckCheck className="w-3.5 h-3.5 text-gold" />
          </span>
        );
      case "DELIVERED":
        return (
          <span title="Delivered">
            <CheckCheck className="w-3.5 h-3.5 text-muted" />
          </span>
        );
      case "SENT":
        return (
          <span title="Sent">
            <Check className="w-3.5 h-3.5 text-muted" />
          </span>
        );
      case "FAILED":
        return (
          <span title="Failed">
            <AlertCircle className="w-3.5 h-3.5 text-crimson" />
          </span>
        );
      default:
        return (
          <span title="Queued">
            <Clock className="w-3.5 h-3.5 text-muted" />
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <span className="text-xs uppercase tracking-caps text-gold font-medium block mb-1">
            Communication Audit Log
          </span>
          <h1 className="font-display text-3xl text-ink font-normal">
            WhatsApp Business Dispatch &amp; Logs
          </h1>
          <p className="text-muted text-xs font-sans pt-1">
            Real-time feed of transactional templates, order confirmations, verified bills, and customer payment proofs.
          </p>
        </div>

        <button
          type="button"
          onClick={loadMessages}
          disabled={refreshing}
          className="inline-flex items-center space-x-2 bg-surface border border-border px-3.5 py-1.5 text-xs uppercase tracking-caps font-semibold text-ink hover:border-gold transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          <span>Refresh Feed</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface border border-border p-4 flex flex-col md:flex-row justify-between gap-4">
        {/* Direction Filter */}
        <div className="flex items-center space-x-2 text-xs">
          {[
            { id: "all", label: "All Messages" },
            { id: "outbound", label: "Outbound Only" },
            { id: "inbound", label: "Inbound Only" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setDirectionFilter(tab.id)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                directionFilter === tab.id
                  ? "bg-navy text-canvas font-semibold"
                  : "text-muted hover:text-ink hover:bg-surface-muted"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[280px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by phone, template, message..."
            className="w-full bg-canvas border border-border pl-9 pr-4 py-1.5 text-xs text-ink focus:border-gold focus:outline-none"
          />
        </div>
      </div>

      {/* Messages Table */}
      <div className="bg-surface border border-border overflow-x-auto shadow-xs">
        {loading ? (
          <div className="py-20 text-center space-y-2">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-navy" />
            <p className="text-xs text-muted">Retrieving WhatsApp dispatch audit log...</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-surface-muted border-b border-border uppercase tracking-caps text-[10px] text-muted">
              <tr>
                <th className="py-3 px-4">Direction &middot; Status</th>
                <th className="py-3 px-4">Recipient Phone</th>
                <th className="py-3 px-4">Template / Payload</th>
                <th className="py-3 px-4">Message Content Preview</th>
                <th className="py-3 px-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted">
                    No WhatsApp dispatches recorded yet.
                  </td>
                </tr>
              ) : (
                filtered.map((msg) => (
                  <tr key={msg.id} className="hover:bg-surface-muted/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(msg.status)}
                        <span
                          className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded ${
                            msg.direction === "OUTBOUND"
                              ? "bg-navy/10 text-navy"
                              : "bg-[#25D366]/10 text-[#1EBE5D]"
                          }`}
                        >
                          {msg.direction}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-ink">
                      {msg.recipientPhone}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-gold">
                      {msg.templateName || "custom_inbound"}
                    </td>
                    <td className="py-3 px-4 max-w-md truncate text-muted" title={msg.bodyText}>
                      {msg.bodyText}
                    </td>
                    <td className="py-3 px-4 text-right text-muted font-mono text-[11px]">
                      {new Date(msg.createdAt).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
