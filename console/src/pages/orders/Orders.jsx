import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import {
  Package, Truck, Search, RefreshCw, Loader2, X,
  Phone, Mail, MapPin, Clock, UtensilsCrossed, ChevronRight,
} from "lucide-react";

/* ─── Constants ─── */
const FILTER_TABS = [
  { key: "all",       label: "All" },
  { key: "new",       label: "New" },
  { key: "confirmed", label: "Confirmed" },
  { key: "preparing", label: "Preparing" },
  { key: "ready",     label: "Ready" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

const STATUS_FLOW = {
  new:       { next: "confirmed",  nextLabel: "Confirm Order" },
  confirmed: { next: "preparing",  nextLabel: "Start Preparing" },
  preparing: { next: "ready",      nextLabel: "Mark Ready" },
  ready:     { next: "completed",  nextLabel: "Complete Order" },
  completed: { next: null,         nextLabel: null },
  cancelled: { next: null,         nextLabel: null },
};

const STATUS_CFG = {
  new:       { label: "New",       bg: "rgba(245,158,11,0.12)", color: "#d97706",  border: "rgba(245,158,11,0.25)" },
  confirmed: { label: "Confirmed", bg: "rgba(59,130,246,0.12)", color: "#3b82f6",  border: "rgba(59,130,246,0.25)" },
  preparing: { label: "Preparing", bg: "rgba(139,92,246,0.12)", color: "#8b5cf6",  border: "rgba(139,92,246,0.25)" },
  ready:     { label: "Ready",     bg: "rgba(34,197,94,0.12)",  color: "#22c55e",  border: "rgba(34,197,94,0.25)" },
  completed: { label: "Completed", bg: "rgba(107,114,128,0.12)", color: "#6b7280", border: "rgba(107,114,128,0.25)" },
  cancelled: { label: "Cancelled", bg: "rgba(239,68,68,0.12)",  color: "#ef4444",  border: "rgba(239,68,68,0.25)" },
};

const PAYMENT_CFG = {
  pay_on_arrival: { label: "Pay on Arrival", bg: "rgba(245,158,11,0.10)", color: "#d97706", border: "rgba(245,158,11,0.2)" },
  paid:           { label: "Paid",            bg: "rgba(34,197,94,0.10)",  color: "#22c55e", border: "rgba(34,197,94,0.2)" },
  pending:        { label: "Pending",         bg: "rgba(107,114,128,0.10)", color: "#6b7280", border: "rgba(107,114,128,0.2)" },
  failed:         { label: "Failed",          bg: "rgba(239,68,68,0.10)",  color: "#ef4444", border: "rgba(239,68,68,0.2)" },
};

/* ─── Helpers ─── */
function fmtPrice(n) {
  return `₦${Number(n || 0).toLocaleString("en-NG")}`;
}

function fmtTime(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-NG", {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: true,
    });
  } catch { return iso; }
}

function timeAgo(iso) {
  if (!iso) return "";
  const m = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function initials(name) {
  if (!name) return "?";
  const p = name.trim().split(/\s+/);
  return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

async function notifyTelegram(text) {
  const token  = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
  const chatId = import.meta.env.VITE_TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
  } catch {}
}

/* ─── Badge components ─── */
function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] ?? { label: status, bg: "var(--ds-input-bg)", color: "var(--ds-muted)", border: "var(--ds-border)" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.border}`,
      borderRadius: 99, padding: "3px 10px",
      fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
    }}>
      {cfg.label}
    </span>
  );
}

function PaymentBadge({ status }) {
  const cfg = PAYMENT_CFG[status] ?? { label: status || "—", bg: "var(--ds-input-bg)", color: "var(--ds-muted)", border: "var(--ds-border)" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.border}`,
      borderRadius: 99, padding: "3px 10px",
      fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
    }}>
      {cfg.label}
    </span>
  );
}

/* ─── Summary pill ─── */
function SummaryPill({ label, count, dotColor }) {
  return (
    <div style={{
      background: "var(--ds-surface)",
      border: "1px solid var(--ds-border)",
      borderRadius: 10,
      padding: "13px 16px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      boxShadow: "var(--ds-shadow)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
        <span style={{ fontSize: 11.5, fontWeight: 500, color: "var(--ds-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</span>
      </div>
      <span style={{ fontSize: 22, fontWeight: 700, color: "var(--ds-text)", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{count}</span>
    </div>
  );
}

/* ─── Filter tab ─── */
function FilterTab({ label, count, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: "6px 14px", borderRadius: 99,
        fontSize: 12.5, fontWeight: active ? 600 : 500,
        border: `1px solid ${active ? "var(--ds-gold)" : "var(--ds-border)"}`,
        background: active ? "var(--ds-gold)" : "transparent",
        color: active ? "#1a1a1a" : "var(--ds-muted)",
        cursor: "pointer", whiteSpace: "nowrap",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {label}
      {count != null && (
        <span style={{
          fontSize: 10.5, fontWeight: 700,
          background: active ? "rgba(0,0,0,0.2)" : "var(--ds-input-bg)",
          color: active ? "#1a1a1a" : "var(--ds-text)",
          padding: "1px 5px", borderRadius: 99,
        }}>
          {count}
        </span>
      )}
    </button>
  );
}

/* ─── Avatar circle ─── */
const AV_COLORS = [
  ["rgba(200,169,110,0.18)", "#a07840"],
  ["rgba(139,92,246,0.14)",  "#7c3aed"],
  ["rgba(34,197,94,0.14)",   "#15803d"],
  ["rgba(239,68,68,0.12)",   "#b91c1c"],
  ["rgba(59,130,246,0.14)",  "#1d4ed8"],
];

function AvatarCircle({ name }) {
  const idx = name ? name.charCodeAt(0) % AV_COLORS.length : 0;
  const [bg, color] = AV_COLORS[idx];
  return (
    <div style={{
      width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
      background: bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 11, fontWeight: 700, color,
    }}>
      {initials(name)}
    </div>
  );
}

/* ─── Main Orders page ─── */
export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [counts, setCounts] = useState({ new: 0, confirmed: 0, preparing: 0, ready: 0, completed_today: 0 });

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;

      setOrders(data || []);

      // Compute summary counts
      const today = new Date().toISOString().split("T")[0];
      const newCount = (data || []).filter((o) => o.order_status === "new").length;
      const confirmedCount = (data || []).filter((o) => o.order_status === "confirmed").length;
      const preparingCount = (data || []).filter((o) => o.order_status === "preparing").length;
      const readyCount = (data || []).filter((o) => o.order_status === "ready").length;
      const completedToday = (data || []).filter(
        (o) => o.order_status === "completed" && o.updated_at?.startsWith(today)
      ).length;

      setCounts({ new: newCount, confirmed: confirmedCount, preparing: preparingCount, ready: readyCount, completed_today: completedToday });
    } catch (err) {
      console.error("[Orders] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();

    // Real-time subscription
    const channel = supabase
      .channel("orders-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload) => {
        setOrders((prev) => [payload.new, ...prev]);
        setCounts((c) => ({ ...c, new: c.new + 1 }));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, (payload) => {
        setOrders((prev) => prev.map((o) => (o.id === payload.new.id ? payload.new : o)));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchOrders]);

  async function openOrder(order) {
    setSelectedOrder(order);
    const { data } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", order.id)
      .order("created_at");
    setOrderItems(data || []);
  }

  async function updateStatus(orderId, newStatus) {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ order_status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", orderId);

      if (error) throw error;

      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, order_status: newStatus } : o));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) => ({ ...prev, order_status: newStatus }));
      }

      const statusLabels = { confirmed: "confirmed", preparing: "being prepared", ready: "ready for pickup/delivery", completed: "completed", cancelled: "cancelled" };
      notifyTelegram(
        `📋 Order ${selectedOrder?.order_number || orderId.slice(0, 8)} is now <b>${statusLabels[newStatus] || newStatus}</b>`
      ).catch(() => {});
    } catch (err) {
      console.error("[Orders] status update error:", err);
    } finally {
      setActionLoading(false);
    }
  }

  async function cancelOrder(orderId) {
    if (!window.confirm("Cancel this order?")) return;
    await updateStatus(orderId, "cancelled");
  }

  // Filter + search
  const filtered = orders.filter((o) => {
    if (activeFilter !== "all" && o.order_status !== activeFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        (o.guest_name || "").toLowerCase().includes(q) ||
        (o.guest_phone || "").includes(q) ||
        (o.order_number || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const tabCounts = FILTER_TABS.reduce((acc, tab) => {
    acc[tab.key] = tab.key === "all" ? orders.length : orders.filter((o) => o.order_status === tab.key).length;
    return acc;
  }, {});

  return (
    <div style={{ padding: "28px 24px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--ds-text)", margin: "0 0 4px", fontFamily: "'Cormorant Garamond', serif", letterSpacing: "0.5px" }}>
            Orders
          </h1>
          <p style={{ fontSize: 13, color: "var(--ds-muted)", margin: 0 }}>Manage incoming food orders</p>
        </div>
        <button
          onClick={fetchOrders}
          disabled={loading}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 14px", borderRadius: 7,
            background: "var(--ds-surface)", border: "1px solid var(--ds-border)",
            color: "var(--ds-muted)", fontSize: 12.5, cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {loading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <RefreshCw size={14} />}
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
        <SummaryPill label="New Orders"      count={counts.new}           dotColor="#d97706" />
        <SummaryPill label="Confirmed"       count={counts.confirmed}     dotColor="#3b82f6" />
        <SummaryPill label="Preparing"       count={counts.preparing}     dotColor="#8b5cf6" />
        <SummaryPill label="Ready"           count={counts.ready}         dotColor="#22c55e" />
        <SummaryPill label="Completed Today" count={counts.completed_today} dotColor="#C9A84C" />
      </div>

      {/* Filter tabs + search */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flex: 1 }}>
          {FILTER_TABS.map((tab) => (
            <FilterTab
              key={tab.key}
              label={tab.label}
              count={tabCounts[tab.key]}
              active={activeFilter === tab.key}
              onClick={() => setActiveFilter(tab.key)}
            />
          ))}
        </div>

        {/* Search */}
        <div style={{ position: "relative", minWidth: 220 }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--ds-muted)", pointerEvents: "none" }} />
          <input
            type="text"
            placeholder="Search name, phone, order #…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%", background: "var(--ds-input-bg)", border: "1px solid var(--ds-border)",
              borderRadius: 7, padding: "7px 12px 7px 30px", fontSize: 12.5,
              color: "var(--ds-text)", fontFamily: "'DM Sans', sans-serif", outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "var(--ds-surface)", border: "1px solid var(--ds-border)", borderRadius: 10, overflow: "hidden", boxShadow: "var(--ds-shadow)" }}>
        {loading && orders.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 0", gap: 10, color: "var(--ds-muted)" }}>
            <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: 13 }}>Loading orders…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--ds-muted)", fontSize: 13 }}>
            {search ? "No orders match your search." : "No orders found."}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--ds-border)" }}>
                  {["Order #", "Guest", "Type", "Items", "Total", "Payment", "Status", "Time"].map((h) => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 10, fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--ds-muted)", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                  <th style={{ width: 40 }} />
                </tr>
              </thead>
              <tbody>
                {filtered.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => openOrder(order)}
                    style={{
                      borderBottom: "1px solid var(--ds-border)",
                      cursor: "pointer",
                      background: selectedOrder?.id === order.id ? "var(--ds-input-bg)" : "transparent",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) => { if (selectedOrder?.id !== order.id) e.currentTarget.style.background = "var(--ds-input-bg)"; }}
                    onMouseLeave={(e) => { if (selectedOrder?.id !== order.id) e.currentTarget.style.background = "transparent"; }}
                  >
                    <td style={{ padding: "12px 16px", fontSize: 12.5, fontWeight: 600, color: "var(--ds-text)", whiteSpace: "nowrap" }}>
                      {order.order_number || order.id.slice(0, 8)}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <AvatarCircle name={order.guest_name} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ds-text)" }}>{order.guest_name || "—"}</div>
                          <div style={{ fontSize: 11.5, color: "var(--ds-muted)" }}>{order.guest_phone || ""}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {order.order_type === "delivery"
                        ? <Truck size={16} style={{ color: "#3b82f6" }} />
                        : <Package size={16} style={{ color: "var(--ds-gold)" }} />}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 12.5, color: "var(--ds-muted)" }}>
                      {order.item_count ?? "—"}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, color: "var(--ds-text)", whiteSpace: "nowrap" }}>
                      {fmtPrice(order.total)}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <PaymentBadge status={order.payment_status} />
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <StatusBadge status={order.order_status} />
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--ds-muted)", whiteSpace: "nowrap" }}>
                      {timeAgo(order.created_at)}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <ChevronRight size={14} style={{ color: "var(--ds-muted)" }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selectedOrder && (
        <OrderDetailPanel
          order={selectedOrder}
          items={orderItems}
          onClose={() => { setSelectedOrder(null); setOrderItems([]); }}
          onStatusUpdate={updateStatus}
          onCancel={cancelOrder}
          actionLoading={actionLoading}
        />
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

/* ─── Order detail panel ─── */
function OrderDetailPanel({ order, items, onClose, onStatusUpdate, onCancel, actionLoading }) {
  const flow = STATUS_FLOW[order.order_status] || {};
  const canCancel = order.order_status !== "completed" && order.order_status !== "cancelled";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "stretch",
        justifyContent: "flex-end",
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }}
      />

      {/* Panel */}
      <div
        style={{
          position: "relative",
          width: "min(520px, 100vw)",
          background: "var(--ds-surface)",
          borderLeft: "1px solid var(--ds-border)",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          boxShadow: "-8px 0 32px rgba(0,0,0,0.2)",
        }}
      >
        {/* Panel header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", borderBottom: "1px solid var(--ds-border)", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ds-text)" }}>
              {order.order_number || order.id.slice(0, 8)}
            </div>
            <div style={{ fontSize: 12, color: "var(--ds-muted)", marginTop: 2 }}>
              {fmtTime(order.created_at)}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <StatusBadge status={order.order_status} />
            <button
              onClick={onClose}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ds-muted)", display: "flex" }}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Guest info */}
          <Section title="Guest">
            <InfoRow icon={<UtensilsCrossed size={13} />} label={order.guest_name || "—"} />
            {order.guest_phone && <InfoRow icon={<Phone size={13} />} label={order.guest_phone} />}
            {order.guest_email && <InfoRow icon={<Mail size={13} />} label={order.guest_email} />}
          </Section>

          {/* Order info */}
          <Section title="Order Info">
            <InfoRow
              icon={order.order_type === "delivery" ? <Truck size={13} /> : <Package size={13} />}
              label={order.order_type === "delivery" ? `Delivery` : "Pickup — 11 Ajao Road, Ikeja"}
            />
            {order.order_type === "delivery" && order.delivery_address && (
              <InfoRow icon={<MapPin size={13} />} label={order.delivery_address} />
            )}
            <InfoRow
              icon={<Clock size={13} />}
              label={order.scheduled_time ? fmtTime(order.scheduled_time) : "As soon as possible"}
            />
          </Section>

          {/* Payment */}
          <Section title="Payment">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <PaymentBadge status={order.payment_status} />
              <span style={{ fontSize: 13, color: "var(--ds-text)", fontWeight: 600 }}>{fmtPrice(order.total)}</span>
            </div>
          </Section>

          {/* Items */}
          <Section title={`Items (${items.length})`}>
            {items.length === 0 ? (
              <p style={{ fontSize: 12.5, color: "var(--ds-muted)", margin: 0 }}>Loading…</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {items.map((item, idx) => (
                  <div key={item.id || idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: "var(--ds-text)", lineHeight: 1.3 }}>
                        {item.item_name || item.name}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--ds-muted)", marginTop: 2 }}>
                        {fmtPrice(item.unit_price || item.price)} × {item.qty}
                      </div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ds-text)", flexShrink: 0 }}>
                      {fmtPrice((item.unit_price || item.price) * item.qty)}
                    </div>
                  </div>
                ))}
                {/* Totals */}
                <div style={{ borderTop: "1px solid var(--ds-border)", paddingTop: 10, marginTop: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: "var(--ds-muted)" }}>Subtotal</span>
                    <span style={{ fontSize: 12, color: "var(--ds-text)" }}>{fmtPrice(order.subtotal)}</span>
                  </div>
                  {order.delivery_fee > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: "var(--ds-muted)" }}>Delivery fee</span>
                      <span style={{ fontSize: 12, color: "var(--ds-text)" }}>{fmtPrice(order.delivery_fee)}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 6, borderTop: "1px solid var(--ds-border)", marginTop: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ds-text)" }}>Total</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ds-gold)" }}>{fmtPrice(order.total)}</span>
                  </div>
                </div>
              </div>
            )}
          </Section>

          {/* Special instructions */}
          {order.special_instructions && (
            <Section title="Special Instructions">
              <p style={{ fontSize: 13, color: "var(--ds-text)", margin: 0, lineHeight: 1.6, fontStyle: "italic" }}>
                "{order.special_instructions}"
              </p>
            </Section>
          )}
        </div>

        {/* Action footer */}
        <div style={{ padding: "16px 20px", borderTop: "1px solid var(--ds-border)", flexShrink: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          {flow.next && (
            <button
              onClick={() => onStatusUpdate(order.id, flow.next)}
              disabled={actionLoading}
              style={{
                width: "100%", padding: "12px 20px", borderRadius: 7,
                background: "var(--ds-gold)", border: "none",
                color: "#1a1a1a", fontSize: 13, fontWeight: 700,
                cursor: actionLoading ? "not-allowed" : "pointer",
                opacity: actionLoading ? 0.7 : 1,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {actionLoading ? "Updating…" : flow.nextLabel}
            </button>
          )}
          {canCancel && (
            <button
              onClick={() => onCancel(order.id)}
              disabled={actionLoading}
              style={{
                width: "100%", padding: "10px 20px", borderRadius: 7,
                background: "transparent", border: "1px solid rgba(239,68,68,0.35)",
                color: "#ef4444", fontSize: 12.5, fontWeight: 600,
                cursor: actionLoading ? "not-allowed" : "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Cancel Order
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--ds-muted)", margin: "0 0 10px" }}>
        {title}
      </p>
      {children}
    </div>
  );
}

function InfoRow({ icon, label }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
      <span style={{ color: "var(--ds-muted)", marginTop: 1, flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: 13, color: "var(--ds-text)", lineHeight: 1.4 }}>{label}</span>
    </div>
  );
}
