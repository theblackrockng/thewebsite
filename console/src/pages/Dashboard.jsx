import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import {
  Clock, AlertCircle, LayoutGrid, MessageSquare, CalendarDays, Users,
  TrendingUp, TrendingDown, Minus, ShoppingBag, ChevronDown, ChevronUp,
} from "lucide-react";
import { supabase } from "../lib/supabase";

/* ─── Helpers ─── */
function timeAgo(ts) {
  const diff = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function fmtDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

/* ─── Trend indicator ─── */
function Trend({ delta, positiveIsGood = true, suffix = "from yesterday" }) {
  if (delta === null || delta === undefined) return null;
  const isPositive = delta > 0;
  const isZero = delta === 0;
  const good = isZero ? null : (positiveIsGood ? isPositive : !isPositive);
  const color = isZero ? "var(--ds-muted)" : good ? "#16a34a" : "#dc2626";
  const Icon = isZero ? Minus : isPositive ? TrendingUp : TrendingDown;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color }}>
      <Icon size={13} strokeWidth={2} />
      <span style={{ fontWeight: 500 }}>
        {isZero ? "No change" : `${isPositive ? "+" : ""}${delta} ${suffix}`}
      </span>
    </div>
  );
}

/* ─── Status pill ─── */
const STATUS_PILL = {
  confirmed:   { background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0" },
  pending:     { background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a" },
  cancelled:   { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" },
  rescheduled: { background: "#f5f3ff", color: "#5b21b6", border: "1px solid #ddd6fe" },
};

function StatusPill({ status }) {
  const s = STATUS_PILL[status] ?? { background: "var(--ds-input-bg)", color: "var(--ds-muted)", border: "1px solid var(--ds-border)" };
  return (
    <span style={{ ...s, borderRadius: 99, fontSize: 10.5, fontWeight: 600, padding: "3px 9px", textTransform: "capitalize", whiteSpace: "nowrap" }}>
      {status}
    </span>
  );
}

/* ─── Order status pill ─── */
const ORDER_STATUS_STYLES = {
  new:        { background: "rgba(239,68,68,0.1)",   color: "#ef4444",   border: "1px solid rgba(239,68,68,0.25)" },
  confirmed:  { background: "#f0fdf4",               color: "#166534",   border: "1px solid #bbf7d0" },
  preparing:  { background: "rgba(245,158,11,0.1)",  color: "#d97706",   border: "1px solid rgba(245,158,11,0.3)" },
  ready:      { background: "rgba(200,169,110,0.12)",color: "var(--ds-gold)", border: "1px solid rgba(200,169,110,0.3)" },
  completed:  { background: "rgba(107,114,128,0.1)", color: "#6b7280",   border: "1px solid rgba(107,114,128,0.25)" },
  cancelled:  { background: "#fef2f2",               color: "#991b1b",   border: "1px solid #fecaca" },
};

const PAYMENT_STATUS_STYLES = {
  unpaid:          { background: "#fef2f2",               color: "#991b1b",   border: "1px solid #fecaca" },
  awaiting_proof:  { background: "rgba(245,158,11,0.1)",  color: "#d97706",   border: "1px solid rgba(245,158,11,0.3)" },
  proof_received:  { background: "rgba(200,169,110,0.12)",color: "var(--ds-gold)", border: "1px solid rgba(200,169,110,0.3)" },
  paid:            { background: "#f0fdf4",               color: "#166534",   border: "1px solid #bbf7d0" },
};

function OrderStatusPill({ status, styles }) {
  const s = styles[status] ?? { background: "var(--ds-input-bg)", color: "var(--ds-muted)", border: "1px solid var(--ds-border)" };
  const label = (status || "—").replace(/_/g, " ");
  return (
    <span style={{ ...s, borderRadius: 99, fontSize: 10.5, fontWeight: 600, padding: "3px 9px", textTransform: "capitalize", whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

/* ─── Stat Card ─── */
function StatCard({ label, value, trend, iconEl, loading, onClick, active }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--ds-surface)",
        border: "1px solid var(--ds-border)",
        borderRadius: 11,
        padding: "18px 20px 16px",
        boxShadow: "var(--ds-shadow)",
        cursor: onClick ? "pointer" : "default",
        borderBottom: active ? "3px solid var(--ds-gold)" : "1px solid var(--ds-border)",
        transition: "border-color 0.15s",
      }}
      onMouseEnter={(e) => { if (onClick) e.currentTarget.style.background = "var(--ds-input-bg)"; }}
      onMouseLeave={(e) => { if (onClick) e.currentTarget.style.background = "var(--ds-surface)"; }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ textTransform: "uppercase", fontSize: 10.5, fontWeight: 600, letterSpacing: "0.6px", color: "var(--ds-muted)", lineHeight: 1.4, maxWidth: 110 }}>
          {label}
        </span>
        {iconEl}
      </div>
      <div style={{ fontSize: 38, fontWeight: 600, color: "var(--ds-text)", lineHeight: 1, marginBottom: 10, letterSpacing: "-1px", fontVariantNumeric: "tabular-nums" }}>
        {loading ? <span style={{ fontSize: 26, color: "var(--ds-muted)" }}>—</span> : (value ?? <span style={{ fontSize: 26, color: "var(--ds-muted)" }}>—</span>)}
      </div>
      {!loading && trend}
    </div>
  );
}

/* ─── Reservation row ─── */
function ReservationRow({ r, onClick }) {
  const partyDisplay = r.party === "other" ? (r.party_other ?? "—") : (r.party ?? "—");
  return (
    <div
      onClick={onClick}
      style={{ display: "grid", gridTemplateColumns: "minmax(140px,1.9fr) 62px 72px 40px minmax(90px,1fr) 88px", padding: "12px 20px", borderBottom: "1px solid var(--ds-border)", alignItems: "center", cursor: onClick ? "pointer" : "default" }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--ds-input-bg)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, background: "rgba(200,169,110,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, color: "var(--ds-gold)" }}>
          {initials(r.name)}
        </div>
        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ds-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--ds-muted)" }}>{fmtDate(r.date)}</div>
      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ds-text)" }}>{r.time || "—"}</div>
      <div style={{ fontSize: 12.5, color: "var(--ds-muted)", textAlign: "center" }}>{partyDisplay}</div>
      <div style={{ fontSize: 12, color: "var(--ds-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.occasion || "—"}</div>
      <div style={{ textAlign: "right" }}><StatusPill status={r.status} /></div>
    </div>
  );
}

/* ─── Enquiry row ─── */
const ENQ_AVATAR = {
  new:       { background: "rgba(239,68,68,0.1)", color: "#ef4444" },
  read:      { background: "rgba(107,114,128,0.1)", color: "#6b7280" },
  responded: { background: "rgba(200,169,110,0.12)", color: "var(--ds-gold)" },
};

function EnquiryRow({ e }) {
  const av = ENQ_AVATAR[e.status] ?? ENQ_AVATAR.read;
  return (
    <div
      style={{ padding: "14px 20px", borderBottom: "1px solid var(--ds-border)", cursor: "pointer" }}
      onMouseEnter={(el) => { el.currentTarget.style.background = "var(--ds-input-bg)"; }}
      onMouseLeave={(el) => { el.currentTarget.style.background = "transparent"; }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <div style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, ...av, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10.5, fontWeight: 600 }}>
          {initials(e.name)}
        </div>
        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ds-text)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.name}</span>
        <span style={{ fontSize: 11, color: "var(--ds-muted)", whiteSpace: "nowrap" }}>{timeAgo(e.created_at)}</span>
      </div>
      <div style={{ marginLeft: 34, fontSize: 12, color: "var(--ds-muted)", lineHeight: 1.55, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
        {e.message}
      </div>
    </div>
  );
}

/* ─── Panel ─── */
function Panel({ children, style }) {
  return (
    <div style={{ background: "var(--ds-surface)", border: "1px solid var(--ds-border)", borderRadius: 11, boxShadow: "var(--ds-shadow)", overflow: "hidden", ...style }}>
      {children}
    </div>
  );
}

function PanelHeader({ title, to, toLabel = "View all →" }) {
  return (
    <div style={{ padding: "16px 20px 13px", borderBottom: "1px solid var(--ds-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 600, color: "var(--ds-text)", letterSpacing: "0.2px", margin: 0 }}>{title}</h2>
      {to && <Link to={to} style={{ fontSize: 12, color: "var(--ds-gold)", fontWeight: 500, textDecoration: "none" }}>{toLabel}</Link>}
    </div>
  );
}

/* ─── Upcoming This Week ─── */
const DAY_ABBR = ["SUN","MON","TUE","WED","THU","FRI","SAT"];

function UpcomingPanel({ upcoming, loading, onSelect }) {
  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px", color: "var(--ds-muted)", fontSize: 13 }}>Loading…</div>
  );

  /* Group by date */
  const grouped = {};
  for (const r of upcoming) {
    if (!grouped[r.date]) grouped[r.date] = [];
    grouped[r.date].push(r);
  }

  const dates = Object.keys(grouped).sort();

  if (dates.length === 0) return (
    <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--ds-muted)", fontSize: 13 }}>No upcoming reservations in the next 30 days.</div>
  );

  return (
    <div style={{ padding: "0 0 4px" }}>
      {dates.map((dateStr) => {
        const d = new Date(dateStr + "T00:00:00");
        const dayName = DAY_ABBR[d.getDay()];
        const dayNum = d.getDate();
        const rows = grouped[dateStr];
        return (
          <div key={dateStr} style={{ display: "flex", padding: "12px 20px", borderBottom: "1px solid var(--ds-border)", gap: 14, alignItems: "flex-start" }}>
            {/* Day label */}
            <div style={{ textAlign: "center", width: 32, flexShrink: 0, paddingTop: 2 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", color: "var(--ds-muted)", textTransform: "uppercase" }}>{dayName}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "var(--ds-gold)", lineHeight: 1.2, fontVariantNumeric: "tabular-nums" }}>{dayNum}</div>
            </div>
            {/* Rows */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
              {rows.map((r) => {
                const guests = r.party === "other" ? (r.party_other ?? "?") : (r.party ?? "?");
                return (
                  <div
                    key={r.id}
                    onClick={() => onSelect?.(r)}
                    style={{ cursor: onSelect ? "pointer" : "default", padding: "2px 6px", margin: "-2px -6px", borderRadius: 6 }}
                    onMouseEnter={(e) => { if (onSelect) e.currentTarget.style.background = "var(--ds-input-bg)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ds-text)" }}>{r.name}</div>
                    <div style={{ fontSize: 11.5, color: "var(--ds-muted)" }}>{r.time || "—"} · {guests} guest{guests !== "1" ? "s" : ""}</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Recent Activity ─── */
const ACTIVITY_DOT = {
  confirmed:   "#16a34a",
  pending:     "#d97706",
  cancelled:   "#dc2626",
  rescheduled: "#7c3aed",
  enquiry:     "#ef4444",
};

function ActivityPanel({ recentRes, recentEnq, loading, onSelectReservation }) {
  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px", color: "var(--ds-muted)", fontSize: 13 }}>Loading…</div>
  );

  /* Build combined activity feed */
  const items = [
    ...recentRes.map((r) => ({
      id: "r" + r.id,
      resId: r.id,
      text: r.status === "confirmed"
        ? `Reservation confirmed — ${r.name}`
        : r.status === "cancelled"
        ? `Reservation cancelled — ${r.name}`
        : `New reservation from ${r.name}`,
      ts: r.created_at,
      type: r.status,
    })),
    ...recentEnq.map((e) => ({
      id: "e" + e.id,
      text: `New enquiry from ${e.name}`,
      ts: e.created_at,
      type: "enquiry",
    })),
  ].sort((a, b) => new Date(b.ts) - new Date(a.ts)).slice(0, 6);

  if (items.length === 0) return (
    <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--ds-muted)", fontSize: 13 }}>No recent activity.</div>
  );

  return (
    <div style={{ padding: "8px 0 4px" }}>
      {items.map((item, i) => {
        const clickable = item.resId && onSelectReservation;
        return (
          <div
            key={item.id}
            onClick={() => clickable && onSelectReservation(item.resId)}
            style={{ display: "flex", gap: 12, padding: "10px 20px", alignItems: "flex-start", cursor: clickable ? "pointer" : "default", transition: "background 0.1s" }}
            onMouseEnter={(e) => { if (clickable) e.currentTarget.style.background = "var(--ds-input-bg)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 4, flexShrink: 0 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: ACTIVITY_DOT[item.type] ?? "var(--ds-muted)", flexShrink: 0 }} />
              {i < items.length - 1 && <div style={{ width: 1, flex: 1, background: "var(--ds-border)", marginTop: 4, minHeight: 20 }} />}
            </div>
            <div style={{ flex: 1, paddingBottom: i < items.length - 1 ? 8 : 0 }}>
              <div style={{ fontSize: 12.5, color: "var(--ds-text)", lineHeight: 1.4 }}>{item.text}</div>
              <div style={{ fontSize: 11, color: "var(--ds-muted)", marginTop: 2 }}>{timeAgo(item.ts)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Today's Orders Panel ─── */
const ORDERS_TABS = [
  { key: "all",              label: "All" },
  { key: "new",              label: "New" },
  { key: "confirmed",        label: "Confirmed" },
  { key: "preparing",        label: "Preparing" },
  { key: "ready",            label: "Ready" },
  { key: "completed",        label: "Completed" },
  { key: "cancelled",        label: "Cancelled" },
  { key: "awaiting_payment", label: "Awaiting Payment" },
  { key: "payment_confirmed",label: "Payment Confirmed" },
];

function filterOrders(orders, tab) {
  switch (tab) {
    case "all":               return orders;
    case "new":               return orders.filter(o => o.order_status === "new");
    case "confirmed":         return orders.filter(o => o.order_status === "confirmed");
    case "preparing":         return orders.filter(o => o.order_status === "preparing");
    case "ready":             return orders.filter(o => o.order_status === "ready");
    case "completed":         return orders.filter(o => o.order_status === "completed");
    case "cancelled":         return orders.filter(o => o.order_status === "cancelled");
    case "awaiting_payment":  return orders.filter(o => o.payment_status === "awaiting_proof" || o.payment_status === "proof_received");
    case "payment_confirmed": return orders.filter(o => o.payment_status === "paid");
    default:                  return orders;
  }
}

function tabCount(orders, tab) {
  return filterOrders(orders, tab).length;
}

function TodayOrdersPanel({ orders, loading, tab, setTab, navigate }) {
  const filtered = filterOrders(orders, tab);

  return (
    <div style={{ background: "var(--ds-surface)", border: "1px solid var(--ds-border)", borderRadius: 11, boxShadow: "var(--ds-shadow)", overflow: "hidden", marginBottom: 20 }}>
      {/* Header with tabs */}
      <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--ds-border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 600, color: "var(--ds-text)", margin: 0 }}>
          Today's Orders — {loading ? "…" : orders.length} total
        </h2>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {ORDERS_TABS.map((t) => {
            const count = loading ? 0 : tabCount(orders, t.key);
            const isActive = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "5px 10px",
                  borderRadius: 99,
                  border: isActive ? "none" : "1px solid var(--ds-border)",
                  background: isActive ? "var(--ds-gold)" : "transparent",
                  color: isActive ? "#fff" : "var(--ds-muted)",
                  fontSize: 12, fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {t.label}
                <span style={{
                  background: isActive ? "rgba(255,255,255,0.25)" : "var(--ds-input-bg)",
                  color: isActive ? "#fff" : "var(--ds-muted)",
                  borderRadius: 99, fontSize: 10.5, fontWeight: 700,
                  padding: "1px 6px", minWidth: 18, textAlign: "center",
                }}>
                  {loading ? "—" : count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders list */}
      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px", color: "var(--ds-muted)", fontSize: 13 }}>Loading orders…</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: "36px 20px", textAlign: "center", color: "var(--ds-muted)", fontSize: 13 }}>No orders in this category.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          {/* Table header */}
          <div style={{ display: "grid", gridTemplateColumns: "100px minmax(140px,1.5fr) 90px 80px 110px 130px", padding: "9px 20px", borderBottom: "1px solid var(--ds-border)" }}>
            {["ORDER", "GUEST", "TYPE", "TOTAL", "ORDER STATUS", "PAYMENT"].map((col) => (
              <div key={col} style={{ fontSize: 10.5, fontWeight: 600, color: "var(--ds-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{col}</div>
            ))}
          </div>
          {filtered.map((o) => (
            <div
              key={o.id}
              onClick={() => navigate("/orders")}
              style={{ display: "grid", gridTemplateColumns: "100px minmax(140px,1.5fr) 90px 80px 110px 130px", padding: "12px 20px", borderBottom: "1px solid var(--ds-border)", alignItems: "center", cursor: "pointer" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--ds-input-bg)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              {/* Order number */}
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ds-text)", fontVariantNumeric: "tabular-nums" }}>
                #{String(o.order_number || o.id).slice(-6)}
              </div>
              {/* Guest */}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ds-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {o.guest_name || o.name || "—"}
                </div>
                {(o.phone || o.guest_phone) && (
                  <div style={{ fontSize: 11, color: "var(--ds-muted)", marginTop: 1 }}>{o.phone || o.guest_phone}</div>
                )}
              </div>
              {/* Type */}
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--ds-muted)" }}>
                {o.order_type === "delivery" ? (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
                    </svg>
                    Delivery
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
                    </svg>
                    Pickup
                  </>
                )}
              </div>
              {/* Total */}
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ds-gold)", fontVariantNumeric: "tabular-nums" }}>
                {o.total != null ? `₦${Number(o.total).toLocaleString()}` : "—"}
              </div>
              {/* Order status */}
              <div>
                <OrderStatusPill status={o.order_status} styles={ORDER_STATUS_STYLES} />
              </div>
              {/* Payment status */}
              <div>
                <OrderStatusPill status={o.payment_status} styles={PAYMENT_STATUS_STYLES} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Reservation detail modal (shared across dashboard panels) ─── */
function ReservationDetailModal({ reservation, onClose }) {
  const r = reservation;
  const partyDisplay = r.party === "other" ? (r.party_other ?? "—") : (r.party ?? "—");
  const dateFmt = r.date ? new Date(r.date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "—";
  const row = (label, value) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "10px 0", borderBottom: "1px solid var(--ds-border)" }}>
      <span style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ds-muted)" }}>{label}</span>
      <span style={{ fontSize: 13, color: "var(--ds-text)", textAlign: "right", wordBreak: "break-word" }}>{value || "—"}</span>
    </div>
  );
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} />
      <div style={{ position: "relative", width: "100%", maxWidth: 460, background: "var(--ds-surface)", border: "1px solid var(--ds-border)", borderRadius: 14, boxShadow: "0 24px 64px rgba(0,0,0,0.22)", overflow: "hidden", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--ds-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ds-muted)" }}>Reservation</div>
            <h3 style={{ margin: "2px 0 0", fontSize: 20, fontWeight: 600, fontFamily: "'Cormorant Garamond', serif", color: "var(--ds-text)" }}>{r.name}</h3>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ds-muted)", fontSize: 20, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: "6px 22px 18px", overflowY: "auto", fontFamily: "'DM Sans', sans-serif" }}>
          {row("Status", <StatusPill status={r.status} />)}
          {row("Date", dateFmt)}
          {row("Time", r.time || "—")}
          {row("Party", `${partyDisplay} guest${partyDisplay !== "1" ? "s" : ""}`)}
          {row("Occasion", r.occasion || "—")}
          {row("Email", r.email || "—")}
          {row("Phone", r.phone || "—")}
          {row("Notes", r.notes || "—")}
          {r.created_at && row("Created", new Date(r.created_at).toLocaleString("en-GB"))}
        </div>
      </div>
    </div>
  );
}

/* ─── Dashboard ─── */
/* Module-level cache so re-entering the Dashboard route (tab switch, nav back)
   shows the previous snapshot instantly instead of a loading screen. The cache
   is refreshed in the background on every mount. */
const DASH_CACHE = {
  stats: null,
  recentRes: null,
  recentEnq: null,
  upcoming: null,
  todayOrders: null,
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats,     setStats]     = useState(DASH_CACHE.stats ?? { today: null, todayDelta: null, pending: null, total: null, totalDelta: null, enquiries: null, enquiriesDelta: null });
  const [recentRes, setRecentRes] = useState(DASH_CACHE.recentRes ?? []);
  const [recentEnq, setRecentEnq] = useState(DASH_CACHE.recentEnq ?? []);
  const [upcoming,  setUpcoming]  = useState(DASH_CACHE.upcoming ?? []);
  const [loading,   setLoading]   = useState(DASH_CACHE.stats === null);
  const [todayOrders,    setTodayOrders]    = useState(DASH_CACHE.todayOrders ?? []);
  const [showOrdersPanel, setShowOrdersPanel] = useState(false);
  const [ordersTab,      setOrdersTab]      = useState("all");
  const [ordersLoading,  setOrdersLoading]  = useState(DASH_CACHE.todayOrders === null);

  const load = async () => {
    const hasCache = DASH_CACHE.stats !== null;
    if (!hasCache) setLoading(true);
    const today     = new Date();
    const todayStr  = today.toISOString().split("T")[0];
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    const yStr      = yesterday.toISOString().split("T")[0];
    const yStartISO = yStr + "T00:00:00.000Z";
    const horizonEnd = new Date(today); horizonEnd.setDate(today.getDate() + 30);
    const horizonEndStr = horizonEnd.toISOString().split("T")[0];

    const [r1, r2, r3, r4, r5, r6, r7, r8, r9, r10] = await Promise.all([
      supabase.from("reservations").select("id", { count: "exact", head: true }).eq("date", todayStr),
      supabase.from("reservations").select("id", { count: "exact", head: true }).eq("date", yStr),
      supabase.from("reservations").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("reservations").select("id", { count: "exact", head: true }),
      supabase.from("enquiries").select("id", { count: "exact", head: true }).eq("status", "new"),
      supabase.from("reservations").select("id,name,email,phone,date,time,party,party_other,occasion,status,notes,created_at").order("created_at", { ascending: false }).limit(8),
      supabase.from("enquiries").select("id,name,message,status,created_at").order("created_at", { ascending: false }).limit(5),
      supabase.from("reservations").select("id,name,email,phone,date,time,party,party_other,occasion,status,notes").gte("date", todayStr).lte("date", horizonEndStr).neq("status", "cancelled").order("date").order("time").limit(50),
      supabase.from("reservations").select("id", { count: "exact", head: true }).gte("created_at", yStartISO),
      supabase.from("enquiries").select("id", { count: "exact", head: true }).gte("created_at", yStartISO),
    ]);

    const nextStats = {
      today:          r1.count,
      todayDelta:     (r1.count ?? 0) - (r2.count ?? 0),
      pending:        r3.count,
      total:          r4.count,
      totalDelta:     r9.count ?? 0,
      enquiries:      r5.count,
      enquiriesDelta: r10.count ?? 0,
    };
    const nextRecentRes = r6.data ?? [];
    const nextRecentEnq = r7.data ?? [];
    const nextUpcoming  = r8.data ?? [];

    setStats(nextStats);
    setRecentRes(nextRecentRes);
    setRecentEnq(nextRecentEnq);
    setUpcoming(nextUpcoming);
    setLoading(false);

    DASH_CACHE.stats = nextStats;
    DASH_CACHE.recentRes = nextRecentRes;
    DASH_CACHE.recentEnq = nextRecentEnq;
    DASH_CACHE.upcoming = nextUpcoming;

    if (DASH_CACHE.todayOrders === null) setOrdersLoading(true);
    try {
      const res = await fetch("/api/orders");
      const json = await res.json();
      const todayStr2 = new Date().toISOString().split("T")[0];
      const todays = (json.data || []).filter(o => (o.created_at || "").startsWith(todayStr2));
      setTodayOrders(todays);
      DASH_CACHE.todayOrders = todays;
    } catch {}
    setOrdersLoading(false);
  };

  useEffect(() => { load(); }, []);
  const [detailRes, setDetailRes] = useState(null);

  const now = new Date();
  const dayName = now.toLocaleDateString("en-GB", { weekday: "long" });
  const day = now.getDate();
  const month = now.toLocaleDateString("en-GB", { month: "long" });
  const year = now.getFullYear();
  const headerDate = `${dayName}, ${day} ${month} ${year}`;

  const awaitingPaymentCount = todayOrders.filter(o => o.payment_status === "awaiting_proof").length;

  return (
    <div style={{ padding: "26px 28px 44px", fontFamily: "'DM Sans', sans-serif" }}>

      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 600, letterSpacing: "0.2px", color: "var(--ds-text)", margin: "0 0 3px" }}>
          Dashboard
        </h1>
        <p style={{ fontSize: 13, color: "var(--ds-muted)" }}>{headerDate}</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 20 }} className="ds-stat-grid">

        <StatCard
          label="Today's Reservations"
          value={stats.today}
          loading={loading}
          trend={<Trend delta={stats.todayDelta} positiveIsGood={true} suffix="from yesterday" />}
          iconEl={<div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(200,169,110,0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ds-gold)", flexShrink: 0 }}><Clock size={15} strokeWidth={1.75} /></div>}
        />

        <StatCard
          label="Pending Confirmation"
          value={stats.pending}
          loading={loading}
          trend={<div style={{ fontSize: 12, color: "var(--ds-muted)" }}>awaiting confirmation</div>}
          iconEl={<div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(245,158,11,0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "#d97706", flexShrink: 0 }}><AlertCircle size={15} strokeWidth={1.75} /></div>}
        />

        <StatCard
          label="Total All Time"
          value={stats.total}
          loading={loading}
          trend={<Trend delta={stats.totalDelta} positiveIsGood={true} suffix="new since yesterday" />}
          iconEl={<div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(107,114,128,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ds-muted)", flexShrink: 0 }}><LayoutGrid size={15} strokeWidth={1.75} /></div>}
        />

        <StatCard
          label="Unread Enquiries"
          value={stats.enquiries}
          loading={loading}
          trend={<Trend delta={stats.enquiriesDelta} positiveIsGood={false} suffix="new since yesterday" />}
          iconEl={
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(239,68,68,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444", flexShrink: 0, position: "relative" }}>
              <MessageSquare size={15} strokeWidth={1.75} />
              {stats.enquiries > 0 && <span style={{ position: "absolute", top: -2, right: -2, width: 8, height: 8, borderRadius: "50%", background: "#ef4444", border: "1.5px solid var(--ds-surface)" }} />}
            </div>
          }
        />

        <StatCard
          label="Today's Orders"
          value={ordersLoading ? null : todayOrders.length}
          loading={ordersLoading}
          trend={
            <div style={{ fontSize: 12, color: awaitingPaymentCount > 0 ? "#d97706" : "var(--ds-muted)" }}>
              {ordersLoading ? "" : `${awaitingPaymentCount} awaiting payment`}
            </div>
          }
          iconEl={
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(200,169,110,0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ds-gold)", flexShrink: 0 }}>
              <ShoppingBag size={15} strokeWidth={1.75} />
            </div>
          }
          onClick={() => { setShowOrdersPanel(p => !p); setOrdersTab("all"); }}
          active={showOrdersPanel}
        />
      </div>

      {/* Today's Orders Panel */}
      {showOrdersPanel && (
        <TodayOrdersPanel
          orders={todayOrders}
          loading={ordersLoading}
          tab={ordersTab}
          setTab={setOrdersTab}
          navigate={navigate}
        />
      )}

      {/* Row 2: Recent Reservations + Recent Enquiries */}
      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 16, marginBottom: 20 }} className="ds-row2-grid">

        {/* Recent Reservations */}
        <Panel>
          <PanelHeader title="Recent Reservations" to="/reservations" />
          {/* Table head */}
          <div style={{ display: "grid", gridTemplateColumns: "minmax(140px,1.9fr) 62px 72px 40px minmax(90px,1fr) 88px", padding: "9px 20px", borderBottom: "1px solid var(--ds-border)" }}>
            {["GUEST", "DATE", "TIME", "PAX", "OCCASION", "STATUS"].map((col) => (
              <div key={col} style={{ fontSize: 10.5, fontWeight: 600, color: "var(--ds-muted)", textTransform: "uppercase", letterSpacing: "0.5px", textAlign: col === "STATUS" ? "right" : col === "PAX" ? "center" : "left" }}>{col}</div>
            ))}
          </div>
          <div style={{ overflowX: "auto" }}>
            {loading && recentRes.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px", color: "var(--ds-muted)", fontSize: 13, minHeight: 200 }}>Loading…</div>
            ) : recentRes.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--ds-muted)", fontSize: 13 }}>No reservations yet.</div>
            ) : (
              recentRes.map((r) => <ReservationRow key={r.id} r={r} onClick={() => setDetailRes(r)} />)
            )}
          </div>
        </Panel>

        {/* Recent Enquiries */}
        <Panel>
          <PanelHeader title="Recent Enquiries" to="/enquiries" />
          {loading && recentEnq.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px", color: "var(--ds-muted)", fontSize: 13, minHeight: 200 }}>Loading…</div>
          ) : recentEnq.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--ds-muted)", fontSize: 13 }}>No enquiries yet.</div>
          ) : (
            recentEnq.map((e) => <EnquiryRow key={e.id} e={e} />)
          )}
        </Panel>
      </div>

      {/* Row 3: Quick Actions + Upcoming This Week + Recent Activity */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }} className="ds-row3-grid">

        {/* Quick Actions */}
        <Panel style={{ overflow: "visible" }}>
          <div style={{ padding: "18px 20px" }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 600, color: "var(--ds-text)", letterSpacing: "0.2px", margin: "0 0 14px" }}>Quick Actions</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              <Link
                to="/menu"
                style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--ds-burgundy)", color: "#fff", borderRadius: 8, padding: "10px 14px", fontSize: 13, fontWeight: 500, textDecoration: "none", transition: "opacity 0.15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.88"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
              >
                + Add Menu Item
              </Link>
              <Link
                to="/reservations"
                style={{ display: "flex", alignItems: "center", gap: 8, background: "transparent", color: "var(--ds-text)", border: "1px solid var(--ds-border)", borderRadius: 8, padding: "10px 14px", fontSize: 13, fontWeight: 500, textDecoration: "none" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--ds-input-bg)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <CalendarDays size={14} strokeWidth={1.75} style={{ color: "var(--ds-muted)" }} />
                View All Reservations
              </Link>
              <Link
                to="/enquiries"
                style={{ display: "flex", alignItems: "center", gap: 8, background: "transparent", color: "var(--ds-text)", border: "1px solid var(--ds-border)", borderRadius: 8, padding: "10px 14px", fontSize: 13, fontWeight: 500, textDecoration: "none" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--ds-input-bg)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <MessageSquare size={14} strokeWidth={1.75} style={{ color: "var(--ds-muted)" }} />
                Manage Enquiries
              </Link>
            </div>
          </div>
        </Panel>

        {/* Upcoming (next 30 days) */}
        <Panel>
          <PanelHeader title="Upcoming Reservations" to="/reservations" toLabel="View all →" />
          <UpcomingPanel upcoming={upcoming} loading={loading && !upcoming.length} onSelect={setDetailRes} />
        </Panel>

        {/* Recent Activity */}
        <Panel>
          <PanelHeader title="Recent Activity" />
          <ActivityPanel recentRes={recentRes.slice(0, 4)} recentEnq={recentEnq.slice(0, 3)} loading={loading && !recentRes.length && !recentEnq.length} onSelectReservation={(id) => {
            const r = recentRes.find((x) => x.id === id);
            if (r) setDetailRes(r);
          }} />
        </Panel>
      </div>

      {detailRes && <ReservationDetailModal reservation={detailRes} onClose={() => setDetailRes(null)} />}

      {/* Responsive grid styles */}
      <style>{`
        @media (max-width: 1149px) {
          .ds-stat-grid  { grid-template-columns: repeat(3, 1fr) !important; }
          .ds-row2-grid  { grid-template-columns: 1fr !important; }
          .ds-row3-grid  { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 640px) {
          .ds-stat-grid  { grid-template-columns: 1fr !important; }
          .ds-row3-grid  { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
