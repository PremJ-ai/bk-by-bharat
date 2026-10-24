"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatINR } from "@/components/product/ProductCard";
import { getAdminOrders, type AdminOrderSummary } from "@/lib/api/commerce";
import {
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Truck,
  DollarSign,
  ArrowRight,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [refreshing, setRefreshing] = useState(false);

  const loadOrders = async () => {
    try {
      setRefreshing(true);
      const res = await getAdminOrders({
        status: statusFilter,
        search: searchTerm || undefined,
      });
      setOrders(res.items);
    } catch (err) {
      console.error("Failed to load admin orders:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadOrders();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "AWAITING_ADMIN_REVIEW":
        return (
          <span className="inline-flex items-center space-x-1 bg-gold/10 text-gold border border-gold/30 px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold">
            <Clock className="w-3 h-3" />
            <span>Awaiting Review</span>
          </span>
        );
      case "AWAITING_CUSTOMER_PAYMENT":
        return (
          <span className="inline-flex items-center space-x-1 bg-navy/10 text-navy border border-navy/30 px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold">
            <DollarSign className="w-3 h-3" />
            <span>QR Invoice Sent</span>
          </span>
        );
      case "PAYMENT_PROOF_RECEIVED":
        return (
          <span className="inline-flex items-center space-x-1 bg-rust/10 text-rust border border-rust/30 px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold animate-pulse">
            <AlertCircle className="w-3 h-3" />
            <span>Proof Uploaded</span>
          </span>
        );
      case "PAID":
        return (
          <span className="inline-flex items-center space-x-1 bg-stock-ok/10 text-stock-ok border border-stock-ok/30 px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold">
            <CheckCircle2 className="w-3 h-3" />
            <span>Verified Paid</span>
          </span>
        );
      case "SHIPPED":
        return (
          <span className="inline-flex items-center space-x-1 bg-muted/10 text-muted border border-muted/30 px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold">
            <Truck className="w-3 h-3" />
            <span>Dispatched</span>
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center space-x-1 bg-crimson/10 text-crimson border border-crimson/30 px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold">
            <XCircle className="w-3 h-3" />
            <span>Cancelled</span>
          </span>
        );
      default:
        return (
          <span className="text-[10px] uppercase tracking-wider text-muted font-medium">
            {status}
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
            Fulfillment Queue &middot; Manual Verification
          </span>
          <h1 className="font-display text-3xl text-ink font-normal">
            Guest Orders &amp; UPI Verification
          </h1>
        </div>
        <button
          type="button"
          onClick={loadOrders}
          disabled={refreshing}
          className="inline-flex items-center space-x-2 bg-surface border border-border px-3.5 py-2 text-xs uppercase tracking-caps font-semibold text-ink hover:border-gold transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface border border-border p-4 flex flex-col md:flex-row justify-between gap-4">
        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {[
            { id: "ALL", label: "All Orders" },
            { id: "AWAITING_ADMIN_REVIEW", label: "Awaiting Review" },
            { id: "PAYMENT_PROOF_RECEIVED", label: "Proof Uploaded" },
            { id: "AWAITING_CUSTOMER_PAYMENT", label: "Invoice Sent" },
            { id: "PAID", label: "Verified Paid" },
            { id: "SHIPPED", label: "Dispatched" },
            { id: "CANCELLED", label: "Cancelled" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === tab.id
                  ? "bg-navy text-canvas font-semibold"
                  : "text-muted hover:text-ink hover:bg-surface-muted"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative min-w-[260px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by order #, patron, phone..."
            className="w-full bg-canvas border border-border pl-9 pr-4 py-1.5 text-xs text-ink focus:border-gold focus:outline-none"
          />
        </form>
      </div>

      {/* Orders Table */}
      <div className="bg-surface border border-border overflow-x-auto shadow-xs">
        {loading ? (
          <div className="py-20 text-center space-y-2">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-navy" />
            <p className="text-xs text-muted">Loading orders from PostgreSQL...</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-surface-muted border-b border-border uppercase tracking-caps text-[10px] text-muted">
              <tr>
                <th className="py-3 px-4">Order Reference</th>
                <th className="py-3 px-4">Patron &amp; Contact</th>
                <th className="py-3 px-4">Items</th>
                <th className="py-3 px-4">Payable Total</th>
                <th className="py-3 px-4">Fulfillment Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted">
                    No orders match the selected queue filter.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-surface-muted/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-ink">
                      {order.orderNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-medium text-ink block leading-snug">
                        {order.customerName}
                      </span>
                      <span className="text-[11px] text-muted font-mono">
                        {order.whatsappNumber}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-muted">
                      {order.itemsCount} {order.itemsCount === 1 ? "garment" : "garments"}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-ink tabular-nums">
                      {formatINR(order.totalPaise)}
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="inline-flex items-center space-x-1.5 bg-surface-muted hover:bg-navy hover:text-canvas text-ink px-3 py-1.5 text-[11px] uppercase tracking-wider font-semibold border border-border transition-colors"
                      >
                        <span>Review</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
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
