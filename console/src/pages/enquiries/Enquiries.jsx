import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../../lib/supabase";

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
import {
  RefreshCw, Loader2, Search, Eye, MessageSquare, Trash2,
  Send, X, AlertTriangle, Mail,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

/* ─── Constants ─── */
const FILTER_TABS = [
  { key: "all",       label: "All" },
  { key: "new",       label: "New" },
  { key: "read",      label: "Read" },
  { key: "responded", label: "Responded" },
];

const ENQ_STATUS_CFG = {
  new:       { label: "New",       bg: "var(--badge-enq-new-bg)",       color: "var(--badge-enq-new-color)",       border: "var(--badge-enq-new-border)" },
  read:      { label: "Read",      bg: "var(--badge-enq-read-bg)",      color: "var(--badge-enq-read-color)",      border: "var(--badge-enq-read-border)" },
  responded: { label: "Responded", bg: "var(--badge-enq-responded-bg)", color: "var(--badge-enq-responded-color)", border: "var(--badge-enq-responded-border)" },
};

/* ─── Helpers ─── */
function initials(name) {
  if (!name) return "?";
  const p = name.trim().split(/\s+/);
  return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

function fmtDateTime(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  const date = d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `${date}, ${time}`;
}

function defaultReply(name) {
  return `Dear ${name},\n\nThank you for reaching out to us at BLACKROCK Restaurant & Lounge. We appreciate your message and will be happy to assist you.\n\n\n\nWarm regards,\nBLACKROCK Restaurant & Lounge\nIkeja, Lagos`;
}

/* ─── Status badge ─── */
function StatusBadge({ status }) {
  const cfg = ENQ_STATUS_CFG[status] ?? { label: status, bg: "var(--ds-input-bg)", color: "var(--ds-muted)", border: "var(--ds-border)" };
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

/* ─── Avatar circle ─── */
const AV_COLORS = [
  ["rgba(200,169,110,0.18)", "#a07840"],
  ["rgba(139,92,246,0.14)",  "#7c3aed"],
  ["rgba(34,197,94,0.14)",   "#15803d"],
  ["rgba(239,68,68,0.12)",   "#b91c1c"],
  ["rgba(59,130,246,0.14)",  "#1d4ed8"],
  ["rgba(236,72,153,0.12)",  "#be185d"],
];

function AvatarCircle({ name, size = 36 }) {
  const idx = name ? name.charCodeAt(0) % AV_COLORS.length : 0;
  const [bg, color] = AV_COLORS[idx];
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.32, fontWeight: 700, color,
    }}>
      {initials(name)}
    </div>
  );
}

/* ─── Summary pill ─── */
function SummaryPill({ label, count, dotColor }) {
  return (
    <div style={{
      background: "var(--ds-surface)", border: "1px solid var(--ds-border)",
      borderRadius: 10, padding: "13px 16px",
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

/* ─── Small action button ─── */
function ActionBtn({ children, onClick, title, hoverColor, hoverBg, disabled, active, activeColor, activeBg }) {
  const isActive = active && activeColor;
  return (
    <button
      onClick={(ev) => { ev.stopPropagation(); onClick?.(); }}
      disabled={disabled}
      title={title}
      style={{
        width: 30, height: 30, borderRadius: 7, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: isActive ? activeBg : "transparent",
        border: `1px solid ${isActive ? activeColor : "var(--ds-border)"}`,
        color: isActive ? activeColor : "var(--ds-muted)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        transition: "all 0.12s",
      }}
      onMouseEnter={(e) => { if (!disabled && !isActive) { e.currentTarget.style.background = hoverBg; e.currentTarget.style.color = hoverColor; e.currentTarget.style.borderColor = hoverColor; } }}
      onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--ds-muted)"; e.currentTarget.style.borderColor = "var(--ds-border)"; } }}
    >
      {children}
    </button>
  );
}

/* ─── Empty state ─── */
function EmptyState({ message, onRefresh }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "72px 24px", gap: 14 }}>
      <div style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(200,169,110,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ds-gold)" }}>
        <MessageSquare size={28} strokeWidth={1.4} />
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ds-text)", marginBottom: 6 }}>No enquiries yet</div>
        <div style={{ fontSize: 13, color: "var(--ds-muted)", maxWidth: 340, lineHeight: 1.6 }}>
          {message ?? "When guests send messages through the website contact form, they will appear here."}
        </div>
      </div>
      <button
        onClick={onRefresh}
        style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 7, border: "1px solid var(--ds-gold)", background: "transparent", color: "var(--ds-gold)", fontSize: 12.5, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "background 0.15s" }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(200,169,110,0.08)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
      >
        <RefreshCw size={13} /> Refresh
      </button>
    </div>
  );
}

/* ─── Delete confirmation dialog ─── */
function DeleteDialog({ enquiry, onConfirm, onClose, saving }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
    >
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.52)" }} onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }} transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        style={{ position: "relative", zIndex: 1, background: "var(--ds-surface)", borderRadius: 14, border: "1px solid var(--ds-border)", boxShadow: "0 24px 64px rgba(0,0,0,0.22)", width: "100%", maxWidth: 400, overflow: "hidden" }}
      >
        <div style={{ padding: "28px 26px 20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ width: 46, height: 46, borderRadius: "50%", background: "rgba(239,68,68,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#dc2626" }}>
            <AlertTriangle size={22} strokeWidth={1.75} />
          </div>
          <div>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 21, fontWeight: 600, color: "var(--ds-text)", margin: "0 0 6px" }}>Delete enquiry?</h2>
            <p style={{ fontSize: 13, color: "var(--ds-muted)", margin: 0, lineHeight: 1.55 }}>
              This will permanently remove <strong style={{ color: "var(--ds-text)" }}>{enquiry.name}</strong>'s message. This cannot be undone.
            </p>
          </div>
        </div>
        <div style={{ padding: "0 24px 22px", display: "flex", gap: 10 }}>
          <button onClick={onClose} disabled={saving} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid var(--ds-border)", background: "transparent", color: "var(--ds-text)", fontSize: 13.5, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Go Back</button>
          <button onClick={onConfirm} disabled={saving} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: saving ? "var(--ds-muted)" : "#dc2626", color: "#fff", fontSize: 13.5, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
            {saving ? <><Loader2 size={14} className="animate-spin" /> Deleting…</> : "Delete Enquiry"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Enquiry card ─── */
const INPUT_STYLE = { width: "100%", background: "var(--ds-input-bg)", border: "1px solid var(--ds-border)", borderRadius: 8, padding: "10px 12px", fontSize: 13.5, color: "var(--ds-text)", fontFamily: "'DM Sans', sans-serif", outline: "none", boxSizing: "border-box" };
const LABEL_STYLE = { display: "block", fontSize: 10.5, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ds-muted)", marginBottom: 7 };

function EnquiryCard({ e, expanded, replyDraft, onToggle, onReplyChange, onMarkRead, onClickReply, onSendReply, sendingReply, onDeleteClick, working }) {
  const textareaRef = useRef(null);
  const isWorking = working === e.id;

  /* Focus textarea when reply opens */
  useEffect(() => {
    if (expanded && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [expanded]);

  return (
    <div
      style={{
        background: "var(--ds-surface)",
        border: `1px solid ${e.status === "new" ? "rgba(200,169,110,0.35)" : "var(--ds-border)"}`,
        borderRadius: 11,
        boxShadow: e.status === "new" ? "0 0 0 1px rgba(200,169,110,0.12)" : "var(--ds-shadow)",
        overflow: "hidden",
        transition: "border-color 0.2s, box-shadow 0.2s",
      }}
    >
      {/* ── Card header (always visible) ── */}
      <div
        onClick={() => onToggle(e)}
        style={{
          padding: "16px 18px",
          display: "flex", alignItems: "flex-start", gap: 12,
          cursor: "pointer",
          transition: "background 0.1s",
        }}
        onMouseEnter={(el) => { el.currentTarget.style.background = "rgba(200,169,110,0.04)"; }}
        onMouseLeave={(el) => { el.currentTarget.style.background = "transparent"; }}
      >
        {/* Avatar */}
        <AvatarCircle name={e.name} />

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 4 }}>
            {/* Name + contact */}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: e.status === "new" ? 600 : 500, color: "var(--ds-text)", lineHeight: 1.3 }}>{e.name}</div>
              <div style={{ fontSize: 12, color: "var(--ds-muted)", marginTop: 2 }}>
                {e.email}{e.phone ? ` · ${e.phone}` : ""}
              </div>
            </div>

            {/* Right: badge + time + actions */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <StatusBadge status={e.status} />
                <span style={{ fontSize: 11.5, color: "var(--ds-muted)", whiteSpace: "nowrap" }}>{fmtDateTime(e.created_at)}</span>
              </div>
              {/* Action buttons */}
              <div style={{ display: "flex", gap: 5 }}>
                {isWorking ? (
                  <Loader2 size={14} className="animate-spin" style={{ color: "var(--ds-muted)", margin: "8px 4px" }} />
                ) : (
                  <>
                    {/* Mark as Read */}
                    {e.status === "new" && (
                      <ActionBtn
                        onClick={() => onMarkRead(e.id)}
                        title="Mark as read"
                        hoverColor="var(--badge-enq-read-color)"
                        hoverBg="var(--badge-enq-read-bg)"
                      >
                        <Eye size={13} />
                      </ActionBtn>
                    )}
                    {/* Reply */}
                    <ActionBtn
                      onClick={() => onClickReply(e)}
                      title="Reply by email"
                      hoverColor="var(--badge-enq-responded-color)"
                      hoverBg="var(--badge-enq-responded-bg)"
                      active={expanded}
                      activeColor="var(--badge-enq-responded-color)"
                      activeBg="var(--badge-enq-responded-bg)"
                    >
                      <MessageSquare size={13} />
                    </ActionBtn>
                    {/* Delete */}
                    <ActionBtn
                      onClick={() => onDeleteClick(e)}
                      title="Delete enquiry"
                      hoverColor="var(--badge-cancelled-color)"
                      hoverBg="var(--badge-cancelled-bg)"
                    >
                      <Trash2 size={13} />
                    </ActionBtn>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Message preview */}
          <div style={{
            fontSize: 13, color: "var(--ds-muted)", lineHeight: 1.5,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            marginTop: 2,
          }}>
            {e.message?.slice(0, 120)}{(e.message?.length ?? 0) > 120 ? "…" : ""}
          </div>
        </div>
      </div>

      {/* ── Expanded section ── */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ padding: "0 18px 18px", borderTop: "1px solid var(--ds-border)" }}>
              <div style={{ height: 16 }} />

              {/* Full message */}
              <div style={{ marginBottom: 16 }}>
                <label style={LABEL_STYLE}>Full Message</label>
                <div style={{
                  padding: "13px 14px",
                  background: "var(--ds-bg)",
                  border: "1px solid var(--ds-border)",
                  borderRadius: 8,
                  fontSize: 13.5, color: "var(--ds-text)", lineHeight: 1.65,
                  whiteSpace: "pre-wrap",
                }}>
                  {e.message}
                </div>
              </div>

              {/* Reply area (only if email available) */}
              {e.email ? (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <label style={LABEL_STYLE}>
                      Reply to&nbsp;
                      <a href={`mailto:${e.email}`} style={{ color: "var(--ds-gold)", textDecoration: "none", fontWeight: 500 }} onClick={(ev) => ev.stopPropagation()}>
                        {e.email}
                      </a>
                    </label>
                    <textarea
                      ref={textareaRef}
                      value={replyDraft}
                      onChange={(ev) => { ev.stopPropagation(); onReplyChange(e.id, ev.target.value); }}
                      onClick={(ev) => ev.stopPropagation()}
                      rows={6}
                      style={{ ...INPUT_STYLE, resize: "vertical", lineHeight: 1.6 }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      onClick={(ev) => { ev.stopPropagation(); onSendReply(e, replyDraft); }}
                      disabled={sendingReply || !replyDraft?.trim()}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        padding: "9px 18px", borderRadius: 8, border: "none",
                        background: sendingReply || !replyDraft?.trim() ? "var(--ds-muted)" : "var(--ds-gold)",
                        color: "#1a1a1a", fontSize: 13, fontWeight: 600,
                        cursor: sendingReply || !replyDraft?.trim() ? "not-allowed" : "pointer",
                        fontFamily: "'DM Sans', sans-serif",
                        transition: "opacity 0.12s",
                      }}
                      onMouseEnter={(e) => { if (!sendingReply) e.currentTarget.style.opacity = "0.88"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                    >
                      {sendingReply ? <><Loader2 size={13} className="animate-spin" /> Sending…</> : <><Send size={13} /> Send Reply</>}
                    </button>
                    <button
                      onClick={(ev) => { ev.stopPropagation(); onToggle(e); }}
                      style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 8, border: "1px solid var(--ds-border)", background: "transparent", color: "var(--ds-muted)", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Collapse
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "var(--ds-muted)", padding: "8px 0" }}>
                  <Mail size={14} />
                  No email address on file for this guest.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Main component ─── */
export default function Enquiries() {
  const [rows, setRows]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState("all");
  const [search, setSearch]       = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [sendingReply, setSendingReply] = useState(false);
  const [working, setWorking]     = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]   = useState(false);

  /* ── Fetch all rows ── */
  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("enquiries").select("*").order("created_at", { ascending: false });
    setRows(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── Realtime: notify + prepend new enquiries ── */
  useEffect(() => {
    const channel = supabase
      .channel("enquiries-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "enquiries" }, (payload) => {
        const e = payload.new;
        setRows((prev) => [e, ...prev]);
        const preview = e.message ? (e.message.length > 200 ? e.message.slice(0, 200) + "…" : e.message) : "—";
        notifyTelegram([
          "💬 <b>New Enquiry — BLACKROCK</b>",
          "",
          `👤 <b>${e.name}</b>`,
          e.email ? `✉️ ${e.email}` : null,
          e.phone ? `📞 ${e.phone}` : null,
          "",
          `📩 ${preview}`,
        ].filter(Boolean).join("\n"));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  /* ── Summary counts ── */
  const totalCount     = rows.length;
  const newCount       = rows.filter((r) => r.status === "new").length;
  const readCount      = rows.filter((r) => r.status === "read").length;
  const respondedCount = rows.filter((r) => r.status === "responded").length;

  const tabCounts = { all: totalCount, new: newCount, read: readCount, responded: respondedCount };

  /* ── Filtered display rows ── */
  const filtered = rows.filter((r) => {
    const matchTab = filter === "all" || r.status === filter;
    const q = search.toLowerCase().trim();
    const matchSearch = !q
      || r.name?.toLowerCase().includes(q)
      || r.email?.toLowerCase().includes(q)
      || r.message?.toLowerCase().includes(q);
    return matchTab && matchSearch;
  });

  /* ── Toggle expand (auto-marks new as read) ── */
  const handleToggle = async (e) => {
    const isOpen = expandedId === e.id;
    setExpandedId(isOpen ? null : e.id);
    if (!isOpen && e.status === "new") {
      handleMarkRead(e.id);
    }
    if (!isOpen && !replyDrafts[e.id]) {
      setReplyDrafts((p) => ({ ...p, [e.id]: defaultReply(e.name) }));
    }
  };

  /* ── Open directly to reply ── */
  const handleClickReply = (e) => {
    if (expandedId !== e.id) {
      setExpandedId(e.id);
      if (e.status === "new") handleMarkRead(e.id);
    }
    if (!replyDrafts[e.id]) {
      setReplyDrafts((p) => ({ ...p, [e.id]: defaultReply(e.name) }));
    }
  };

  /* ── Mark as read ── */
  const handleMarkRead = async (id) => {
    setWorking(id);
    await supabase.from("enquiries").update({ status: "read" }).eq("id", id);
    setRows((p) => p.map((x) => x.id === id ? { ...x, status: "read" } : x));
    setWorking(null);
  };

  /* ── Send reply ── */
  const handleSendReply = async (e, text) => {
    if (!text?.trim()) return;
    setSendingReply(true);
    /* Opens the user's mail client with the composed reply */
    const subject = encodeURIComponent("Re: Your enquiry to BLACKROCK Restaurant & Lounge");
    const body    = encodeURIComponent(text);
    window.open(`mailto:${e.email}?subject=${subject}&body=${body}`);
    /* Update status */
    await supabase.from("enquiries").update({ status: "responded" }).eq("id", e.id);
    setRows((p) => p.map((x) => x.id === e.id ? { ...x, status: "responded" } : x));
    setSendingReply(false);
    setExpandedId(null);
  };

  /* ── Delete ── */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await supabase.from("enquiries").delete().eq("id", deleteTarget.id);
    setRows((p) => p.filter((x) => x.id !== deleteTarget.id));
    if (expandedId === deleteTarget.id) setExpandedId(null);
    setDeleting(false);
    setDeleteTarget(null);
  };

  const ghostBtn = {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "8px 14px", borderRadius: 8,
    border: "1px solid var(--ds-border)", background: "var(--ds-surface)",
    color: "var(--ds-text)", fontSize: 13, fontWeight: 500,
    cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "border-color 0.12s",
  };

  return (
    <div style={{ padding: "26px 28px 44px", fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── Page header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22, gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 600, letterSpacing: "0.2px", color: "var(--ds-text)", margin: "0 0 3px" }}>
            Enquiries
          </h1>
          <p style={{ fontSize: 13, color: "var(--ds-muted)", margin: 0 }}>Guest messages and contact form submissions</p>
        </div>
        <button
          onClick={load}
          style={ghostBtn}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--ds-gold)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--ds-border)"; }}
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* ── Summary pills ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }} className="ds-enq-summary">
        <SummaryPill label="Total"     count={totalCount}     dotColor="var(--ds-muted)" />
        <SummaryPill label="New"       count={newCount}       dotColor="var(--ds-gold)" />
        <SummaryPill label="Read"      count={readCount}      dotColor="var(--badge-enq-read-color)" />
        <SummaryPill label="Responded" count={respondedCount} dotColor="var(--badge-confirmed-color)" />
      </div>

      {/* ── Search + filter card ── */}
      <div style={{
        background: "var(--ds-surface)", border: "1px solid var(--ds-border)",
        borderRadius: 11, padding: "14px 16px", marginBottom: 16,
        display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap",
        boxShadow: "var(--ds-shadow)",
      }}>
        {/* Search */}
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--ds-muted)", pointerEvents: "none" }} />
          <input
            type="text"
            placeholder="Search by name, email or message..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", background: "var(--ds-input-bg)", border: "1px solid var(--ds-border)", borderRadius: 8, padding: "8px 12px 8px 34px", fontSize: 13, color: "var(--ds-text)", fontFamily: "'DM Sans', sans-serif", outline: "none" }}
          />
        </div>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {FILTER_TABS.map(({ key, label }) => (
            <FilterTab key={key} label={label} count={tabCounts[key]} active={filter === key} onClick={() => setFilter(key)} />
          ))}
        </div>
      </div>

      {/* ── Enquiry cards list ── */}
      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 24px", gap: 10, color: "var(--ds-muted)", fontSize: 13 }}>
          <Loader2 size={18} className="animate-spin" /> Loading enquiries…
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: "var(--ds-surface)", border: "1px solid var(--ds-border)", borderRadius: 11, boxShadow: "var(--ds-shadow)" }}>
          <EmptyState
            message={search || filter !== "all" ? "No enquiries match your search or filter." : undefined}
            onRefresh={load}
          />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((e) => (
            <EnquiryCard
              key={e.id}
              e={e}
              expanded={expandedId === e.id}
              replyDraft={replyDrafts[e.id] ?? ""}
              onToggle={handleToggle}
              onReplyChange={(id, val) => setReplyDrafts((p) => ({ ...p, [id]: val }))}
              onMarkRead={handleMarkRead}
              onClickReply={handleClickReply}
              onSendReply={handleSendReply}
              sendingReply={sendingReply && expandedId === e.id}
              onDeleteClick={setDeleteTarget}
              working={working}
            />
          ))}
        </div>
      )}

      {/* ── Delete dialog ── */}
      <AnimatePresence>
        {deleteTarget && (
          <DeleteDialog
            key="delete"
            enquiry={deleteTarget}
            onConfirm={handleDelete}
            onClose={() => setDeleteTarget(null)}
            saving={deleting}
          />
        )}
      </AnimatePresence>

      <style>{`
        @media (max-width: 640px) {
          .ds-enq-summary { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </div>
  );
}
