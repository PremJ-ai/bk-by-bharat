"use client";

import { useState } from "react";
import Link from "next/link";
import { formatINR } from "@/components/product/ProductCard";
import {
  Search,
  Filter,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  Truck,
  MessageSquare,
  DollarSign,
  ArrowRight,
} from "lucide-react";

interface AdminOrderSummary {
  id: string;
  orderNumber: string;
  customerName: string;
  whatsappNumber: string;
  itemsSummary: string;
  totalPaise: number;
  status:
    | "awaiting_admin_review"
    | "awaiting_customer_payment"
    | "payment_proof_received"
    | "paid"
    | "shipped"
    | "delivered"
    | "cancelled";
  createdAt: string;
}

const MOCK_ORDERS: AdminOrderSummary[] = [
  {
    id: "ord-8841",
    orderNumber: "ORD-2026-8841",
    customerName: "Vikram Singhania",
    whatsappNumber: "+91 98100 23456",
    itemsSummary: "Riviera Camp-Collar Shirt (M) x 1",
    totalPaise: 840000,
    status: "awaiting_admin_review",
    createdAt: "2026-10-23T18:20:00Z",
  },
  {
    id: "ord-8840",
    orderNumber: "ORD-2026-8840",
    customerName: "Ananya Roy",
    whatsappNumber: "+91 98200 45678",
    itemsSummary: "The High-Rise Gurkha Trouser (32) x 1",
    totalPaise: 1240000,
    status: "payment_proof_received",
    createdAt: "2026-10-23T16:15:00Z",
  },
  {
    id: "ord-8839",
    orderNumber: "ORD-2026-8839",
    customerName: "Rohan Mehra",
    whatsappNumber: "+91 99300 78901",
    itemsSummary: "Architectural Band-Collar Tunic (L) x 1",
    totalPaise: 920000,
    status: "awaiting_customer_payment",
    createdAt: "2026-10-23T14:45:00Z",
  },
  {
    id: "ord-8838",
    orderNumber: "ORD-2026-8838",
    customerName: "Kabir Malhotra",
    whatsappNumber: "+91 97110 11223",
    itemsSummary: "Unstructured Linen Atelier Jacket (40R) x 1",
    totalPaise: 2450000,
    status: "paid",
    createdAt: "2026-10-23T11:30:00Z",
  },
  {
    id: "ord-8837",
    orderNumber: "ORD-2026-8837",
    customerName: "Devansh Parekh",
    whatsappNumber: "+91 98400 33445",
    itemsSummary: "Pleated Single-Pleat Chino (32) x 2",
    totalPaise: 1960000,
    status: "shipped",
    createdAt: "2026-10-22T09:10:00Z",
  },
];

export default function AdminOrdersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredOrders = MOCK_ORDERS.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.whatsappNumber.includes(searchTerm);
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: AdminOrderSummary["status"]) => {
    switch (status) {
      case "awaiting_admin_review":
        return (
          <span className="inline-flex items-center space-x-1 bg-gold/10 text-gold border border-gold/30 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-semibold">
            <Clock className="w-3 h-3" />
            <span>Awaiting Review</span>
          </span>
        );
      case "awaiting_customer_payment":
        return (
          <span className="inline-flex items-center space-x-1 bg-navy/10 text-navy border border-navy/30 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-semibold">
            <DollarSign className="w-3 h-3" />
            <span>QR Bill Sent</span>
          </span>
        );
      case "payment_proof_received":
        return (
          <span className="inline-flex items-center space-x-1 bg-rust/10 text-rust border border-rust/30 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-semibold animate-pulse">
            <AlertCircle className="w-3 h-3" />
            <span>Proof Under Review</span>
          </span>
        );
      case "paid":
        return (
          <span className="inline-flex items-center space-x-1 bg-stock-ok/10 text-stock-ok border border-stock-ok/30 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-semibold">
            <CheckCircle2 className="w-3 h-3" />
            <span>Paid &middot; Tailoring</span>
          </span>
        );
      case "shipped":
        return (
          <span className="inline-flex items-center space-x-1 bg-muted/10 text-muted border border-muted/30 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-semibold">
            <Truck className="w-3 h-3" />
            <span>Dispatched</span>
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
            Fulfillment Queue &middot; Milestone 1 Shell
          </span>
          <h1 className="font-display text-3xl text-ink font-normal">
            Guest Orders &amp; Manual QR Verification
          </h1>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface border border-border p-4 flex flex-col md:flex-row justify-between gap-4">
        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {[
            { id: "all", label: "All Orders" },
            { id: "awaiting_admin_review", label: "Awaiting Review" },
            { id: "payment_proof_received", label: "Proof Received" },
            { id: "awaiting_customer_payment", label: "Awaiting Payment" },
            { id: "paid", label: "Verified Paid" },
            { id: "shipped", label: "Dispatched" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                statusFilter === tab.id
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
            placeholder="Search by order # or patron name..."
            className="w-full bg-canvas border border-border pl-9 pr-4 py-1.5 text-xs text-ink focus:border-gold focus:outline-none"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-surface border border-border overflow-x-auto shadow-xs">
        <table className="w-full text-left text-xs font-sans">
          <thead className="bg-surface-muted border-b border-border uppercase tracking-caps text-[10px] text-muted">
            <tr>
              <th className="py-3 px-4">Order Reference</th>
              <th className="py-3 px-4">Patron &amp; WhatsApp</th>
              <th className="py-3 px-4">Garments Ordered</th>
              <th className="py-3 px-4">Payable Total</th>
              <th className="py-3 px-4">Fulfillment Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-muted">
                  No orders match the selected filters.
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => (
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
                    {order.itemsSummary}
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
                      className="inline-flex items-center space-x-1.5 bg-surface-muted hover:bg-navy hover:text-canvas text-ink px-3 py-1.5 text-[11px] uppercase tracking-wider font-semibold border border-border transition-colors rounded"
                    >
                      <span>Manage</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
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
