import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { useStaff } from "../../context/StaffContext";
import {
  Check, X, RefreshCw, Loader2, Search, Plus,
  CalendarDays, AlertTriangle, Mail, Send, UtensilsCrossed,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* ─── Constants ─── */
const FILTER_TABS = [
  { key: "all",         label: "All" },
  { key: "pending",     label: "Pending" },
  { key: "confirmed",   label: "Confirmed" },
  { key: "rescheduled", label: "Rescheduled" },
  { key: "cancelled",   label: "Cancelled" },
];

const PARTY_OPTIONS = ["1","2","3","4","5","6","7","8","9","10","11","12+","other"];

const OCCASION_OPTIONS = [
  { value: "birthday",    label: "Birthday" },
  { value: "date-night",  label: "Date Night" },
  { value: "anniversary", label: "Anniversary" },
  { value: "corporate",   label: "Corporate Event" },
  { value: "other",       label: "Other" },
];

/* ─── Helpers ─── */
function initials(name) {
  if (!name) return "?";
  const p = name.trim().split(/\s+/);
  return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function fmtTime(t) {
  if (!t) return "";
  // Already in 12-hour format (e.g. "7:30 PM") — return as-is
  if (/[AaPp][Mm]/.test(t)) return t.trim();
  // 24-hour format (e.g. "19:30") — convert
  const [h, m] = t.split(":");
  const hr = parseInt(h);
  return `${hr > 12 ? hr - 12 : hr || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
}

function fmtOccasion(o) {
  if (!o) return "—";
  return o.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

async function notifyTelegram(text) {
  const token  = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
  const chatId = import.meta.env.VITE_TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
    });
  } catch {}
}

/* ─── Status Badge ─── */
const STATUS_CFG = {
  confirmed:   { label: "Confirmed",   bg: "var(--badge-confirmed-bg)",   color: "var(--badge-confirmed-color)",   border: "var(--badge-confirmed-border)" },
  pending:     { label: "Pending",     bg: "var(--badge-pending-bg)",     color: "var(--badge-pending-color)",     border: "var(--badge-pending-border)" },
  rescheduled: { label: "Rescheduled", bg: "var(--badge-rescheduled-bg)", color: "var(--badge-rescheduled-color)", border: "var(--badge-rescheduled-border)" },
  cancelled:   { label: "Cancelled",   bg: "var(--badge-cancelled-bg)",   color: "var(--badge-cancelled-color)",   border: "var(--badge-cancelled-border)" },
};

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

/* ─── Avatar circle (color-keyed by first char) ─── */
const AV_COLORS = [
  ["rgba(200,169,110,0.18)", "#a07840"],
  ["rgba(139,92,246,0.14)",  "#7c3aed"],
  ["rgba(34,197,94,0.14)",   "#15803d"],
  ["rgba(239,68,68,0.12)",   "#b91c1c"],
  ["rgba(59,130,246,0.14)",  "#1d4ed8"],
  ["rgba(236,72,153,0.12)",  "#be185d"],
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
        transition: "all 0.12s",
      }}
      onMouseEnter={(e) => { if (!active) { e.currentTarget.style.borderColor = "var(--ds-gold)"; e.currentTarget.style.color = "var(--ds-text)"; } }}
      onMouseLeave={(e) => { if (!active) { e.currentTarget.style.borderColor = "var(--ds-border)"; e.currentTarget.style.color = "var(--ds-muted)"; } }}
    >
      {label}
      <span style={{
        fontSize: 10.5, fontWeight: 600, lineHeight: 1.5,
        background: active ? "rgba(0,0,0,0.18)" : "var(--ds-input-bg)",
        color: active ? "#1a1a1a" : "var(--ds-muted)",
        padding: "1px 7px", borderRadius: 99,
      }}>
        {count}
      </span>
    </button>
  );
}

/* ─── Action icon button ─── */
function ActionBtn({ children, onClick, title, hoverColor, hoverBg, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        width: 29, height: 29, borderRadius: 7, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "transparent", border: "1px solid var(--ds-border)",
        color: "var(--ds-muted)", cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1, transition: "all 0.12s",
      }}
      onMouseEnter={(e) => { if (!disabled) { e.currentTarget.style.background = hoverBg; e.currentTarget.style.color = hoverColor; e.currentTarget.style.borderColor = hoverColor; } }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--ds-muted)"; e.currentTarget.style.borderColor = "var(--ds-border)"; }}
    >
      {children}
    </button>
  );
}

/* ─── Empty state ─── */
function EmptyState({ message, onRefresh }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "72px 24px", gap: 14 }}>
      <div style={{
        width: 60, height: 60, borderRadius: "50%",
        background: "rgba(200,169,110,0.1)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "var(--ds-gold)",
      }}>
        <CalendarDays size={28} strokeWidth={1.4} />
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ds-text)", marginBottom: 6 }}>No reservations yet</div>
        <div style={{ fontSize: 13, color: "var(--ds-muted)", maxWidth: 320, lineHeight: 1.6 }}>
          {message ?? "When guests book through the website, their reservations will appear here."}
        </div>
      </div>
      <button
        onClick={onRefresh}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "8px 18px", borderRadius: 7,
          border: "1px solid var(--ds-gold)", background: "transparent",
          color: "var(--ds-gold)", fontSize: 12.5, fontWeight: 500,
          cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(200,169,110,0.08)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
      >
        <RefreshCw size={13} />
        Refresh
      </button>
    </div>
  );
}

/* ─── Email compose modal ─── */
function reservationEmailBody(r) {
  return `Dear ${r.name},\n\nThank you for your reservation at BLACKROCK Restaurant & Lounge.\n\n` +
    `Your table is confirmed for ${fmtDate(r.date)}${r.time ? ` at ${fmtTime(r.time)}` : ""}, party of ${r.party === "other" ? (r.party_other ?? "—") : (r.party ?? "—")}.\n\n` +
    `\n\nWarm regards,\nBLACKROCK Restaurant & Lounge\nIkeja, Lagos`;
}

function EmailModal({ reservation, onClose }) {
  const [subject, setSubject] = useState(`Your reservation at BLACKROCK Restaurant & Lounge`);
  const [body, setBody]       = useState(() => reservationEmailBody(reservation));
  const [sending, setSending] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState(null);

  const handleSend = async () => {
    if (!body.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: reservation.email, subject, body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to send");
      setSent(true);
      setTimeout(onClose, 1800);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <ModalBackdrop onClose={onClose}>
      <div style={{ background: "var(--ds-surface)", borderRadius: 14, border: "1px solid var(--ds-border)", boxShadow: "0 24px 64px rgba(0,0,0,0.22)", width: "100%", maxWidth: 540, overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--ds-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 600, color: "var(--ds-text)", margin: 0 }}>Send Email</h2>
            <p style={{ fontSize: 12.5, color: "var(--ds-muted)", margin: "3px 0 0" }}>To: {reservation.email}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ds-muted)", display: "flex" }}><X size={18} /></button>
        </div>

        {sent ? (
          <div style={{ padding: "36px 24px", textAlign: "center" }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(34,197,94,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", color: "#16a34a" }}>
              <Check size={22} />
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--ds-text)", margin: "0 0 4px" }}>Email sent</p>
            <p style={{ fontSize: 12.5, color: "var(--ds-muted)", margin: 0 }}>Message delivered to {reservation.email}</p>
          </div>
        ) : (
          <div style={{ padding: "20px 24px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={LABEL_STYLE}>Subject</label>
              <input value={subject} onChange={e => setSubject(e.target.value)} style={INPUT_STYLE} />
            </div>
            <div>
              <label style={LABEL_STYLE}>Message</label>
              <textarea value={body} onChange={e => setBody(e.target.value)} rows={9} style={{ ...INPUT_STYLE, resize: "vertical", lineHeight: 1.65 }} />
            </div>
            {error && (
              <div style={{ padding: "8px 12px", borderRadius: 7, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", fontSize: 12.5, color: "#dc2626", display: "flex", alignItems: "center", gap: 7 }}>
                <AlertTriangle size={13} /> {error}
              </div>
            )}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={onClose} style={{ padding: "9px 16px", borderRadius: 8, border: "1px solid var(--ds-border)", background: "transparent", color: "var(--ds-text)", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
              <button
                onClick={handleSend} disabled={sending || !body.trim()}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 8, border: "none", background: sending || !body.trim() ? "var(--ds-muted)" : "var(--ds-gold)", color: "#1a1a1a", fontSize: 13, fontWeight: 600, cursor: sending || !body.trim() ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif" }}
              >
                {sending ? <><Loader2 size={13} className="animate-spin" /> Sending…</> : <><Send size={13} /> Send Email</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </ModalBackdrop>
  );
}

/* ─── Meal Selections Panel ─── */
function MealSelectionsPanel({ reservation, onClose }) {
  const meals = reservation.pre_selected_meals || [];
  const total = meals.reduce((sum, m) => sum + (Number(m.price) * m.qty), 0);

  function fmtMealPrice(p) {
    return `₦${Number(p).toLocaleString("en-NG")}`;
  }

  const byCategory = meals.reduce((acc, m) => {
    const cat = m.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(m);
    return acc;
  }, {});

  return (
    <ModalBackdrop onClose={onClose}>
      <div style={{ ...MODAL_CARD, maxWidth: 480, margin: "0 auto", maxHeight: "85vh", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--ds-border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 600, color: "var(--ds-text)", margin: 0 }}>Meal Pre-Selections</h2>
            <p style={{ fontSize: 12.5, color: "var(--ds-muted)", margin: "3px 0 0" }}>{reservation.name}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ds-muted)", display: "flex" }}><X size={18} /></button>
        </div>

        {/* Body */}
        <div style={{ padding: "16px 24px", overflowY: "auto", flex: 1 }}>
          {meals.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--ds-muted)", textAlign: "center", padding: "24px 0" }}>No meals selected.</p>
          ) : (
            Object.entries(byCategory).map(([cat, items]) => (
              <div key={cat} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ds-gold)", marginBottom: 8 }}>{cat}</div>
                {items.map((m, i) => (
                  <div key={m.id || i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--ds-border)" }}>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ds-text)" }}>{m.name}</div>
                      <div style={{ fontSize: 11.5, color: "var(--ds-muted)", marginTop: 1 }}>×{m.qty}</div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ds-text)", whiteSpace: "nowrap" }}>
                      {fmtMealPrice(Number(m.price) * m.qty)}
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {meals.length > 0 && (
          <div style={{ padding: "14px 24px", borderTop: "1px solid var(--ds-border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ds-muted)" }}>Estimated Total</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: "var(--ds-gold)" }}>{fmtMealPrice(total)}</span>
          </div>
        )}
      </div>
    </ModalBackdrop>
  );
}

/* ─── Table row ─── */
function TableRow({ r, idx, working, onConfirm, onReschedule, onCancel, onEmail, onViewMeals }) {
  const partyDisplay = r.party === "other" ? (r.party_other ?? "—") : (r.party ?? "—");
  const isWorking = working === r.id;
  const evenBg = "transparent";
  const oddBg  = "rgba(250,248,245,0.55)";
  const rowBg  = idx % 2 === 0 ? evenBg : oddBg;

  return (
    <tr
      style={{ background: rowBg, transition: "background 0.1s" }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(200,169,110,0.055)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = rowBg; }}
    >
      {/* Guest */}
      <td style={{ padding: "13px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
          <AvatarCircle name={r.name} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ds-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
            {r.email && <div style={{ fontSize: 11.5, color: "var(--ds-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.email}</div>}
          </div>
        </div>
      </td>

      {/* Contact */}
      <td style={{ padding: "13px 16px", fontSize: 13, color: "var(--ds-muted)", whiteSpace: "nowrap" }}>
        {r.phone || "—"}
      </td>

      {/* Date & Time */}
      <td style={{ padding: "13px 16px", whiteSpace: "nowrap" }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ds-text)" }}>{fmtDate(r.date)}</div>
        {r.time && <div style={{ fontSize: 11.5, color: "var(--ds-muted)", marginTop: 1 }}>{fmtTime(r.time)}</div>}
      </td>

      {/* Party */}
      <td style={{ padding: "13px 16px", fontSize: 13, color: "var(--ds-muted)", textAlign: "center" }}>
        {partyDisplay}
      </td>

      {/* Occasion */}
      <td style={{ padding: "13px 16px" }}>
        <div style={{ fontSize: 13, color: "var(--ds-muted)" }}>{fmtOccasion(r.occasion)}</div>
        {r.is_concierge && (
          <span style={{ fontSize: 9.5, fontWeight: 700, color: "var(--ds-gold)", textTransform: "uppercase", letterSpacing: "0.6px" }}>Concierge</span>
        )}
      </td>

      {/* Status */}
      <td style={{ padding: "13px 16px" }}>
        {isWorking
          ? <Loader2 size={14} className="animate-spin" style={{ color: "var(--ds-muted)" }} />
          : <StatusBadge status={r.status} />
        }
      </td>

      {/* Actions */}
      <td style={{ padding: "13px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          {r.status !== "confirmed" && r.status !== "cancelled" && (
            <ActionBtn
              onClick={() => onConfirm(r)}
              title="Confirm reservation"
              hoverColor="var(--badge-confirmed-color)"
              hoverBg="var(--badge-confirmed-bg)"
              disabled={isWorking}
            >
              <Check size={13} />
            </ActionBtn>
          )}
          {r.status !== "cancelled" && (
            <ActionBtn
              onClick={() => onReschedule(r)}
              title="Reschedule"
              hoverColor="var(--badge-rescheduled-color)"
              hoverBg="var(--badge-rescheduled-bg)"
              disabled={isWorking}
            >
              <CalendarDays size={13} />
            </ActionBtn>
          )}
          {r.status !== "cancelled" && (
            <ActionBtn
              onClick={() => onCancel(r)}
              title="Cancel reservation"
              hoverColor="var(--badge-cancelled-color)"
              hoverBg="var(--badge-cancelled-bg)"
              disabled={isWorking}
            >
              <X size={13} />
            </ActionBtn>
          )}
          {r.email && (
            <ActionBtn
              onClick={() => onEmail(r)}
              title="Send email to guest"
              hoverColor="var(--ds-gold)"
              hoverBg="rgba(200,169,110,0.12)"
              disabled={isWorking}
            >
              <Mail size={13} />
            </ActionBtn>
          )}
          {r.pre_selected_meals?.length > 0 && (
            <ActionBtn
              onClick={() => onViewMeals(r)}
              title="View meal pre-selections"
              hoverColor="var(--ds-gold)"
              hoverBg="rgba(200,169,110,0.12)"
              disabled={isWorking}
            >
              <UtensilsCrossed size={13} />
            </ActionBtn>
          )}
        </div>
      </td>
    </tr>
  );
}

/* ─── Shared modal wrapper ─── */
function ModalBackdrop({ children, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
    >
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.52)" }} onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        style={{ position: "relative", zIndex: 1, width: "100%" }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

/* shared styles */
const MODAL_CARD = {
  background: "var(--ds-surface)",
  borderRadius: 14,
  border: "1px solid var(--ds-border)",
  boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
  overflow: "hidden",
};

const INPUT_STYLE = {
  width: "100%",
  background: "var(--ds-input-bg)",
  border: "1px solid var(--ds-border)",
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 13.5,
  color: "var(--ds-text)",
  fontFamily: "'DM Sans', sans-serif",
  outline: "none",
  boxSizing: "border-box",
};

const LABEL_STYLE = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--ds-muted)",
  marginBottom: 6,
};

/* ─── Reschedule modal ─── */
function RescheduleModal({ reservation, onConfirm, onClose, saving }) {
  const [date, setDate] = useState(reservation.date ?? "");
  const [time, setTime] = useState(reservation.time ?? "");
  const canSave = date && time && !saving;

  return (
    <ModalBackdrop onClose={onClose}>
      <div style={{ ...MODAL_CARD, maxWidth: 440, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ padding: "22px 24px 16px", borderBottom: "1px solid var(--ds-border)" }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 600, color: "var(--ds-text)", margin: "0 0 3px" }}>Reschedule Reservation</h2>
          <p style={{ fontSize: 13, color: "var(--ds-muted)", margin: 0 }}>Booking for <strong style={{ color: "var(--ds-text)" }}>{reservation.name}</strong></p>
        </div>
        {/* Body */}
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={LABEL_STYLE}>New Date</label>
            <input type="date" value={date} min={new Date().toISOString().split("T")[0]} onChange={(e) => setDate(e.target.value)} style={INPUT_STYLE} />
          </div>
          <div>
            <label style={LABEL_STYLE}>New Time</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={INPUT_STYLE} />
          </div>
        </div>
        {/* Footer */}
        <div style={{ padding: "0 24px 22px", display: "flex", gap: 10 }}>
          <button
            onClick={onClose} disabled={saving}
            style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid var(--ds-border)", background: "transparent", color: "var(--ds-text)", fontSize: 13.5, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
          >
            Go Back
          </button>
          <button
            onClick={() => onConfirm(date, time)} disabled={!canSave}
            style={{
              flex: 1, padding: "10px", borderRadius: 8, border: "none",
              background: canSave ? "#1d4ed8" : "var(--ds-muted)",
              color: "#fff", fontSize: 13.5, fontWeight: 600,
              cursor: canSave ? "pointer" : "not-allowed",
              fontFamily: "'DM Sans', sans-serif",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            }}
          >
            {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : "Confirm Reschedule"}
          </button>
        </div>
      </div>
    </ModalBackdrop>
  );
}

/* ─── Cancel dialog ─── */
function CancelDialog({ reservation, onConfirm, onClose, saving }) {
  return (
    <ModalBackdrop onClose={onClose}>
      <div style={{ ...MODAL_CARD, maxWidth: 400, margin: "0 auto" }}>
        {/* Body */}
        <div style={{ padding: "28px 26px 20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 46, height: 46, borderRadius: "50%",
            background: "rgba(239,68,68,0.1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#dc2626",
          }}>
            <AlertTriangle size={22} strokeWidth={1.75} />
          </div>
          <div>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 21, fontWeight: 600, color: "var(--ds-text)", margin: "0 0 6px" }}>Cancel reservation?</h2>
            <p style={{ fontSize: 13, color: "var(--ds-muted)", margin: 0, lineHeight: 1.55 }}>
              Are you sure you want to cancel <strong style={{ color: "var(--ds-text)" }}>{reservation.name}</strong>'s booking
              {reservation.date ? ` for ${fmtDate(reservation.date)}` : ""}? This cannot be undone.
            </p>
          </div>
        </div>
        {/* Footer */}
        <div style={{ padding: "0 24px 22px", display: "flex", gap: 10 }}>
          <button
            onClick={onClose} disabled={saving}
            style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid var(--ds-border)", background: "transparent", color: "var(--ds-text)", fontSize: 13.5, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
          >
            Go Back
          </button>
          <button
            onClick={onConfirm} disabled={saving}
            style={{
              flex: 1, padding: "10px", borderRadius: 8, border: "none",
              background: saving ? "var(--ds-muted)" : "#dc2626",
              color: "#fff", fontSize: 13.5, fontWeight: 600,
              cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "'DM Sans', sans-serif",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            }}
          >
            {saving ? <><Loader2 size={14} className="animate-spin" /> Cancelling…</> : "Cancel Reservation"}
          </button>
        </div>
      </div>
    </ModalBackdrop>
  );
}

/* ─── New Reservation modal ─── */
const EMPTY_FORM = { name: "", email: "", phone: "", date: "", time: "", party: "2", partyOther: "", occasion: "other", specialRequests: "", isConcierge: false };

function NewReservationModal({ onSave, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (key) => (e) =>
    setForm((p) => ({ ...p, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError("Guest name is required."); return; }
    if (!form.date)         { setError("Reservation date is required."); return; }
    setError("");
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      email: form.email || null,
      phone: form.phone || null,
      date: form.date,
      time: form.time || null,
      party: form.party,
      party_other: form.party === "other" ? form.partyOther : null,
      occasion: form.occasion || null,
      special_requests: form.specialRequests || null,
      is_concierge: form.isConcierge,
      status: "pending",
    };
    const { data, error: err } = await supabase.from("reservations").insert(payload).select().single();
    setSaving(false);
    if (err) { setError(err.message); return; }
    await notifyTelegram(
      `🆕 *New Reservation Added (Manual)*\n👤 ${form.name}\n📅 ${fmtDate(form.date)}${form.time ? ` at ${fmtTime(form.time)}` : ""}\n👥 ${form.party === "other" ? form.partyOther : form.party} guests`
    );
    onSave(data);
  };

  return (
    <ModalBackdrop onClose={onClose}>
      <div style={{ ...MODAL_CARD, maxWidth: 500, margin: "0 auto", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--ds-border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 600, color: "var(--ds-text)", margin: 0 }}>New Reservation</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ds-muted)", display: "flex" }}><X size={18} /></button>
        </div>

        {/* Body — scrollable */}
        <div style={{ padding: "20px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Row: Name */}
          <div>
            <label style={LABEL_STYLE}>Guest Name <span style={{ color: "#dc2626" }}>*</span></label>
            <input type="text" placeholder="Full name" value={form.name} onChange={set("name")} style={INPUT_STYLE} />
          </div>

          {/* Row: Email + Phone */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={LABEL_STYLE}>Email</label>
              <input type="email" placeholder="guest@email.com" value={form.email} onChange={set("email")} style={INPUT_STYLE} />
            </div>
            <div>
              <label style={LABEL_STYLE}>Phone</label>
              <input type="tel" placeholder="+234..." value={form.phone} onChange={set("phone")} style={INPUT_STYLE} />
            </div>
          </div>

          {/* Row: Date + Time */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={LABEL_STYLE}>Date <span style={{ color: "#dc2626" }}>*</span></label>
              <input type="date" value={form.date} min={new Date().toISOString().split("T")[0]} onChange={set("date")} style={INPUT_STYLE} />
            </div>
            <div>
              <label style={LABEL_STYLE}>Time</label>
              <input type="time" value={form.time} onChange={set("time")} style={INPUT_STYLE} />
            </div>
          </div>

          {/* Row: Party + Occasion */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={LABEL_STYLE}>Party Size</label>
              <select value={form.party} onChange={set("party")} style={INPUT_STYLE}>
                {PARTY_OPTIONS.map((p) => <option key={p} value={p}>{p === "other" ? "Other / Custom" : p}</option>)}
              </select>
            </div>
            <div>
              <label style={LABEL_STYLE}>Occasion</label>
              <select value={form.occasion} onChange={set("occasion")} style={INPUT_STYLE}>
                {OCCASION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* Party other */}
          {form.party === "other" && (
            <div>
              <label style={LABEL_STYLE}>Custom Party Size</label>
              <input type="text" placeholder="e.g. 15" value={form.partyOther} onChange={set("partyOther")} style={INPUT_STYLE} />
            </div>
          )}

          {/* Special requests */}
          <div>
            <label style={LABEL_STYLE}>Special Requests</label>
            <textarea
              placeholder="Dietary requirements, seating preferences…"
              value={form.specialRequests}
              onChange={set("specialRequests")}
              rows={3}
              style={{ ...INPUT_STYLE, resize: "vertical", lineHeight: 1.5 }}
            />
          </div>

          {/* Concierge */}
          <label style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={form.isConcierge}
              onChange={set("isConcierge")}
              style={{ width: 15, height: 15, accentColor: "var(--ds-gold)", cursor: "pointer" }}
            />
            <span style={{ fontSize: 13, color: "var(--ds-text)" }}>Mark as Concierge booking</span>
          </label>

          {/* Error */}
          {error && (
            <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 12px", borderRadius: 8, background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.2)", fontSize: 13, color: "#dc2626" }}>
              <AlertTriangle size={13} style={{ flexShrink: 0 }} />{error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 24px 20px", borderTop: "1px solid var(--ds-border)", display: "flex", gap: 10, flexShrink: 0 }}>
          <button
            onClick={onClose} disabled={saving}
            style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid var(--ds-border)", background: "transparent", color: "var(--ds-text)", fontSize: 13.5, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit} disabled={saving}
            style={{
              flex: 2, padding: "10px", borderRadius: 8, border: "none",
              background: saving ? "var(--ds-muted)" : "var(--ds-gold)",
              color: "#1a1a1a", fontSize: 13.5, fontWeight: 600,
              cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "'DM Sans', sans-serif",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            }}
          >
            {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Plus size={14} /> Save Reservation</>}
          </button>
        </div>
      </div>
    </ModalBackdrop>
  );
}

/* ─── Main component ─── */
export default function Reservations() {
  const { profile: staffProfile } = useStaff();
  const [rows, setRows]               = useState([]);
  const [loading, setLoading]         = useState(true);
  const [filter, setFilter]           = useState("all");
  const [search, setSearch]           = useState("");
  const [working, setWorking]         = useState(null);
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [cancelTarget,     setCancelTarget]     = useState(null);
  const [emailTarget,      setEmailTarget]      = useState(null);
  const [mealTarget,       setMealTarget]       = useState(null);
  const [showNewModal,     setShowNewModal]     = useState(false);
  const [modalSaving,      setModalSaving]      = useState(false);

  /* ── Fetch all rows (always, client-side filter) ── */
  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("reservations").select("*").order("created_at", { ascending: false });
    setRows(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── Realtime: notify + prepend new reservations from the website ── */
  useEffect(() => {
    const channel = supabase
      .channel("reservations-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "reservations" }, (payload) => {
        const r = payload.new;
        setRows((prev) => [r, ...prev]);
        const dateStr = r.date
          ? new Date(r.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
          : "—";
        notifyTelegram([
          "🍽 <b>New Reservation — BLACKROCK</b>",
          "",
          `👤 <b>${r.name}</b>`,
          `📅 ${dateStr} at ${r.time || "—"}`,
          `👥 Party of ${r.party || "—"}`,
          r.occasion ? `🎉 ${r.occasion}` : null,
          "",
          r.phone ? `📞 ${r.phone}` : null,
          r.email ? `✉️ ${r.email}` : null,
          r.notes ? `\n📝 ${r.notes}` : null,
        ].filter(Boolean).join("\n"));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  /* ── Summary counts (all rows, no filter) ── */
  const todayStr = new Date().toISOString().split("T")[0];
  const todayCount     = rows.filter((r) => r.date === todayStr).length;
  const pendingCount   = rows.filter((r) => r.status === "pending").length;
  const confirmedCount = rows.filter((r) => r.status === "confirmed").length;
  const cancelledCount = rows.filter((r) => r.status === "cancelled").length;

  const tabCounts = {
    all:         rows.length,
    pending:     pendingCount,
    confirmed:   confirmedCount,
    rescheduled: rows.filter((r) => r.status === "rescheduled").length,
    cancelled:   cancelledCount,
  };

  /* ── Filtered display rows ── */
  const filtered = rows.filter((r) => {
    const matchTab = filter === "all" || r.status === filter;
    const q = search.toLowerCase().trim();
    const matchSearch = !q
      || r.name?.toLowerCase().includes(q)
      || r.email?.toLowerCase().includes(q)
      || r.phone?.includes(q);
    return matchTab && matchSearch;
  });

  /* ── Confirm ── */
  const handleConfirm = async (r) => {
    setWorking(r.id);
    const staffName = staffProfile?.full_name || staffProfile?.email || "A staff member";
    await supabase.from("reservations").update({ status: "confirmed" }).eq("id", r.id);
    setRows((p) => p.map((x) => x.id === r.id ? { ...x, status: "confirmed" } : x));
    await notifyTelegram(
      `✅ *Reservation Confirmed*\n👤 ${r.name}\n📅 ${fmtDate(r.date)}${r.time ? ` at ${fmtTime(r.time)}` : ""}\n👥 ${r.party === "other" ? r.party_other : r.party} guests${r.occasion ? `\n🎉 ${fmtOccasion(r.occasion)}` : ""}\n\n🧑‍💼 Confirmed by: *${staffName}*`
    );
    setWorking(null);
  };

  /* ── Reschedule ── */
  const handleReschedule = async (newDate, newTime) => {
    const r = rescheduleTarget;
    const staffName = staffProfile?.full_name || staffProfile?.email || "A staff member";
    setModalSaving(true);
    await supabase.from("reservations").update({ status: "rescheduled", date: newDate, time: newTime }).eq("id", r.id);
    setRows((p) => p.map((x) => x.id === r.id ? { ...x, status: "rescheduled", date: newDate, time: newTime } : x));
    await notifyTelegram(
      `📅 *Reservation Rescheduled*\n👤 ${r.name}\n🆕 New date: ${fmtDate(newDate)}${newTime ? ` at ${fmtTime(newTime)}` : ""}\n\n🧑‍💼 Rescheduled by: *${staffName}*`
    );
    setModalSaving(false);
    setRescheduleTarget(null);
  };

  /* ── Cancel ── */
  const handleCancel = async () => {
    const r = cancelTarget;
    const staffName = staffProfile?.full_name || staffProfile?.email || "A staff member";
    setModalSaving(true);
    await supabase.from("reservations").update({ status: "cancelled" }).eq("id", r.id);
    setRows((p) => p.map((x) => x.id === r.id ? { ...x, status: "cancelled" } : x));
    await notifyTelegram(
      `❌ *Reservation Cancelled*\n👤 ${r.name}\n📅 ${fmtDate(r.date)}${r.time ? ` at ${fmtTime(r.time)}` : ""}\n\n🧑‍💼 Cancelled by: *${staffName}*`
    );
    setModalSaving(false);
    setCancelTarget(null);
  };

  /* ── New reservation saved ── */
  const handleNewSave = (newRow) => {
    setRows((p) => [newRow, ...p]);
    setShowNewModal(false);
  };

  /* ── Shared button styles ── */
  const ghostBtn = {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "8px 14px", borderRadius: 8,
    border: "1px solid var(--ds-border)",
    background: "var(--ds-surface)",
    color: "var(--ds-text)", fontSize: 13, fontWeight: 500,
    cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
    transition: "border-color 0.12s",
  };
  const goldBtn = {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "8px 16px", borderRadius: 8, border: "none",
    background: "var(--ds-gold)", color: "#1a1a1a",
    fontSize: 13, fontWeight: 600,
    cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
    transition: "opacity 0.12s",
  };

  return (
    <div style={{ padding: "26px 28px 44px", fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── Page header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22, gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 600, letterSpacing: "0.2px", color: "var(--ds-text)", margin: "0 0 3px" }}>
            Reservations
          </h1>
          <p style={{ fontSize: 13, color: "var(--ds-muted)", margin: 0 }}>Manage and track all guest bookings</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <button
            onClick={load}
            style={ghostBtn}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--ds-gold)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--ds-border)"; }}
          >
            <RefreshCw size={13} />
            Refresh
          </button>
          <button
            onClick={() => setShowNewModal(true)}
            style={goldBtn}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.88"; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
          >
            <Plus size={14} />
            New Reservation
          </button>
        </div>
      </div>

      {/* ── Summary pills ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }} className="ds-res-summary">
        <SummaryPill label="Today"     count={todayCount}     dotColor="var(--ds-gold)" />
        <SummaryPill label="Pending"   count={pendingCount}   dotColor="#d97706" />
        <SummaryPill label="Confirmed" count={confirmedCount} dotColor="#16a34a" />
        <SummaryPill label="Cancelled" count={cancelledCount} dotColor="#dc2626" />
      </div>

      {/* ── Search + filter card ── */}
      <div style={{
        background: "var(--ds-surface)",
        border: "1px solid var(--ds-border)",
        borderRadius: 11, padding: "14px 16px",
        marginBottom: 16,
        display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap",
        boxShadow: "var(--ds-shadow)",
      }}>
        {/* Search */}
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--ds-muted)", pointerEvents: "none" }} />
          <input
            type="text"
            placeholder="Search by name, email or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              background: "var(--ds-input-bg)",
              border: "1px solid var(--ds-border)",
              borderRadius: 8,
              padding: "8px 12px 8px 34px",
              fontSize: 13,
              color: "var(--ds-text)",
              fontFamily: "'DM Sans', sans-serif",
              outline: "none",
            }}
          />
        </div>
        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {FILTER_TABS.map(({ key, label }) => (
            <FilterTab
              key={key}
              label={label}
              count={tabCounts[key]}
              active={filter === key}
              onClick={() => setFilter(key)}
            />
          ))}
        </div>
      </div>

      {/* ── Table card ── */}
      <div style={{
        background: "var(--ds-surface)",
        border: "1px solid var(--ds-border)",
        borderRadius: 11,
        boxShadow: "var(--ds-shadow)",
        overflow: "hidden",
      }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "72px 24px", gap: 10, color: "var(--ds-muted)", fontSize: 13 }}>
            <Loader2 size={18} className="animate-spin" />
            Loading reservations…
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            message={search || filter !== "all" ? "No reservations match your search or filter." : undefined}
            onRefresh={load}
          />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--ds-border)", background: "var(--ds-bg)" }}>
                  {[
                    { label: "Guest",      align: "left" },
                    { label: "Contact",    align: "left" },
                    { label: "Date & Time",align: "left" },
                    { label: "Party",      align: "center" },
                    { label: "Occasion",   align: "left" },
                    { label: "Status",     align: "left" },
                    { label: "Actions",    align: "left" },
                  ].map(({ label, align }) => (
                    <th key={label} style={{
                      textAlign: align,
                      padding: "10px 16px",
                      fontSize: 10.5, fontWeight: 600,
                      letterSpacing: "0.6px",
                      textTransform: "uppercase",
                      color: "var(--ds-muted)",
                      whiteSpace: "nowrap",
                    }}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, idx) => (
                  <TableRow
                    key={r.id}
                    r={r}
                    idx={idx}
                    working={working}
                    onConfirm={handleConfirm}
                    onReschedule={setRescheduleTarget}
                    onCancel={setCancelTarget}
                    onEmail={setEmailTarget}
                    onViewMeals={setMealTarget}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {rescheduleTarget && (
          <RescheduleModal
            key="reschedule"
            reservation={rescheduleTarget}
            onConfirm={handleReschedule}
            onClose={() => setRescheduleTarget(null)}
            saving={modalSaving}
          />
        )}
        {cancelTarget && (
          <CancelDialog
            key="cancel"
            reservation={cancelTarget}
            onConfirm={handleCancel}
            onClose={() => setCancelTarget(null)}
            saving={modalSaving}
          />
        )}
        {showNewModal && (
          <NewReservationModal
            key="new"
            onSave={handleNewSave}
            onClose={() => setShowNewModal(false)}
          />
        )}
        {emailTarget && (
          <EmailModal
            key="email"
            reservation={emailTarget}
            onClose={() => setEmailTarget(null)}
          />
        )}
        {mealTarget && (
          <MealSelectionsPanel
            key="meals"
            reservation={mealTarget}
            onClose={() => setMealTarget(null)}
          />
        )}
      </AnimatePresence>

      <style>{`
        @media (max-width: 640px) {
          .ds-res-summary { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </div>
  );
}
