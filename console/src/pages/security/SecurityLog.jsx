import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { useStaff } from "../../context/StaffContext";
import {
  Shield, ShieldAlert, RefreshCw, Download, X, Check, ChevronRight,
  AlertTriangle, AlertOctagon, Info, Loader, Search, Filter,
} from "lucide-react";

// ─── Constants ───────────────────────────────────────────────────────────────
const SEVERITY_CFG = {
  low:      { label: "Low",      bg: "rgba(107,114,128,0.14)", text: "#9ca3af",  border: "rgba(107,114,128,0.3)"  },
  medium:   { label: "Medium",   bg: "rgba(217,119,6,0.14)",   text: "#d97706",  border: "rgba(217,119,6,0.4)"    },
  high:     { label: "High",     bg: "rgba(239,68,68,0.14)",   text: "#ef4444",  border: "rgba(239,68,68,0.4)"    },
  critical: { label: "Critical", bg: "rgba(220,38,38,0.18)",   text: "#dc2626",  border: "rgba(220,38,38,0.5)"    },
};

const EVENT_TYPE_CFG = {
  rate_limit:          { label: "Rate Limited"       },
  login_failed:        { label: "Login Failed"       },
  injection_attempt:   { label: "Injection Attempt"  },
  bot_detected:        { label: "Bot Detected"       },
  brute_force:         { label: "Brute Force"        },
  suspicious_activity: { label: "Suspicious Activity"},
  ip_blocked:          { label: "IP Blocked"         },
};

const SEVERITY_FILTER_OPTIONS = ["all", "low", "medium", "high", "critical"];
const TYPE_FILTER_OPTIONS = ["all", ...Object.keys(EVENT_TYPE_CFG)];

function toWAT(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-NG", {
    timeZone: "Africa/Lagos",
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: true,
  }) + " WAT";
}

// ─── SeverityBadge ───────────────────────────────────────────────────────────
function SeverityBadge({ severity }) {
  const c = SEVERITY_CFG[severity] ?? SEVERITY_CFG.low;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: "0.07em",
      textTransform: "uppercase", padding: "2px 8px", borderRadius: 99,
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
      whiteSpace: "nowrap",
    }}>
      {c.label}
    </span>
  );
}

// ─── StatCard ────────────────────────────────────────────────────────────────
function StatCard({ label, value, accent }) {
  return (
    <div style={{
      background: "var(--ds-surface)", border: "1px solid var(--ds-border)",
      borderRadius: 10, padding: "18px 20px",
    }}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ds-muted)", marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: accent || "var(--ds-text)", fontFamily: "'Cormorant Garamond', serif" }}>
        {value ?? "—"}
      </div>
    </div>
  );
}

// ─── DetailPanel ─────────────────────────────────────────────────────────────
function DetailPanel({ event, onClose, onResolve, resolving }) {
  if (!event) return null;
  const sc = SEVERITY_CFG[event.severity] ?? SEVERITY_CFG.low;
  const typeLabel = EVENT_TYPE_CFG[event.event_type]?.label ?? event.event_type;

  return (
    <div style={{
      position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 50,
      width: "min(480px, 100vw)",
      background: "var(--ds-surface)", borderLeft: "1px solid var(--ds-border)",
      display: "flex", flexDirection: "column",
      boxShadow: "-8px 0 32px rgba(0,0,0,0.25)",
    }}>
      {/* Header */}
      <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--ds-border)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <SeverityBadge severity={event.severity} />
            <span style={{ fontSize: 12, color: "var(--ds-muted)" }}>{typeLabel}</span>
          </div>
          <div style={{ fontSize: 13, color: "var(--ds-muted)" }}>{toWAT(event.created_at)}</div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ds-muted)", flexShrink: 0, display: "flex", padding: 4 }}>
          <X size={17} />
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* IP */}
          <div style={{ background: "var(--ds-input-bg)", border: "1px solid var(--ds-border)", borderRadius: 8, padding: "12px 14px" }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ds-muted)", marginBottom: 6 }}>IP Address</div>
            <div style={{ fontSize: 14, color: "var(--ds-text)", fontFamily: "monospace" }}>{event.ip_address || "—"}</div>
          </div>

          {/* Endpoint */}
          <div style={{ background: "var(--ds-input-bg)", border: "1px solid var(--ds-border)", borderRadius: 8, padding: "12px 14px" }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ds-muted)", marginBottom: 6 }}>Endpoint Targeted</div>
            <div style={{ fontSize: 14, color: "var(--ds-text)", fontFamily: "monospace" }}>{event.endpoint || "—"}</div>
          </div>

          {/* Payload */}
          {event.payload && (
            <div style={{ background: "var(--ds-input-bg)", border: `1px solid ${sc.border}`, borderRadius: 8, padding: "12px 14px" }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: sc.text, marginBottom: 6 }}>Payload / Details</div>
              <div style={{ fontSize: 13, color: "var(--ds-text)", fontFamily: "monospace", wordBreak: "break-all", lineHeight: 1.6 }}>{event.payload}</div>
            </div>
          )}

          {/* User agent */}
          {event.user_agent && (
            <div style={{ background: "var(--ds-input-bg)", border: "1px solid var(--ds-border)", borderRadius: 8, padding: "12px 14px" }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ds-muted)", marginBottom: 6 }}>User Agent</div>
              <div style={{ fontSize: 12, color: "var(--ds-muted)", wordBreak: "break-all", lineHeight: 1.6 }}>{event.user_agent}</div>
            </div>
          )}

          {/* Recommendation */}
          <div style={{ background: "rgba(200,169,110,0.06)", border: "1px solid rgba(200,169,110,0.25)", borderRadius: 8, padding: "12px 14px" }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ds-gold)", marginBottom: 6 }}>Recommended Action</div>
            <div style={{ fontSize: 13, color: "var(--ds-text)", lineHeight: 1.6 }}>
              {event.severity === "critical" ? "Investigate immediately."
               : event.severity === "high"   ? "Consider blocking this IP."
               : event.severity === "medium" ? "Monitor this IP for further activity."
               : "No action needed."}
            </div>
          </div>

          {/* Resolution info */}
          {event.resolved && (
            <div style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 8, padding: "12px 14px" }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#4ade80", marginBottom: 6 }}>Resolved</div>
              <div style={{ fontSize: 13, color: "var(--ds-muted)", lineHeight: 1.6 }}>
                {event.resolved_by ? `By ${event.resolved_by}` : "Marked resolved"}
                {event.resolved_at ? ` · ${toWAT(event.resolved_at)}` : ""}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      {!event.resolved && (
        <div style={{ padding: "16px 24px", borderTop: "1px solid var(--ds-border)" }}>
          <button
            onClick={() => onResolve(event.id)}
            disabled={resolving}
            style={{
              width: "100%", padding: "10px", borderRadius: 7, border: "none",
              background: resolving ? "rgba(74,222,128,0.3)" : "rgba(74,222,128,0.15)",
              color: "#4ade80", border: "1px solid rgba(74,222,128,0.3)",
              fontSize: 13, fontWeight: 600, cursor: resolving ? "default" : "pointer",
              fontFamily: "'DM Sans', sans-serif",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            }}
          >
            {resolving ? <><Loader size={13} className="spin" /> Resolving…</> : <><Check size={13} /> Mark Resolved</>}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── SecurityLog ─────────────────────────────────────────────────────────────
export default function SecurityLog() {
  const { isSuperAdmin, profile } = useStaff();

  const [events, setEvents]               = useState([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [resolving, setResolving]         = useState(false);

  const [severityFilter, setSeverityFilter] = useState("all");
  const [typeFilter, setTypeFilter]         = useState("all");
  const [searchIp, setSearchIp]             = useState("");
  const [dateFrom, setDateFrom]             = useState("");
  const [dateTo, setDateTo]                 = useState("");

  const fetchEvents = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    let query = supabase
      .from("security_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (severityFilter !== "all") query = query.eq("severity", severityFilter);
    if (typeFilter !== "all")     query = query.eq("event_type", typeFilter);
    if (searchIp)                 query = query.ilike("ip_address", `%${searchIp}%`);
    if (dateFrom)                 query = query.gte("created_at", dateFrom);
    if (dateTo)                   query = query.lte("created_at", dateTo + "T23:59:59");

    const { data, error } = await query;
    if (!error) setEvents(data ?? []);
    setLoading(false);
    setRefreshing(false);
  }, [severityFilter, typeFilter, searchIp, dateFrom, dateTo]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("security_logs_realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "security_logs" }, payload => {
        setEvents(prev => [payload.new, ...prev]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "security_logs" }, payload => {
        setEvents(prev => prev.map(e => e.id === payload.new.id ? payload.new : e));
        setSelectedEvent(prev => prev?.id === payload.new.id ? payload.new : prev);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleResolve = async (id) => {
    setResolving(true);
    const resolvedBy = profile?.full_name || profile?.email?.split("@")[0] || "Admin";
    await supabase.from("security_logs").update({
      resolved: true,
      resolved_by: resolvedBy,
      resolved_at: new Date().toISOString(),
    }).eq("id", id);
    setResolving(false);
  };

  const exportCsv = () => {
    const header = ["ID", "Event Type", "Severity", "IP Address", "Endpoint", "Payload", "User Agent", "Resolved", "Created At (WAT)"];
    const rows = events.map(e => [
      e.id, e.event_type, e.severity, e.ip_address || "", e.endpoint || "",
      (e.payload || "").replace(/,/g, ";"),
      (e.user_agent || "").replace(/,/g, ";"),
      e.resolved ? "Yes" : "No",
      toWAT(e.created_at),
    ]);
    const csv = [header, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `security-log-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  // Summary stats
  const now = Date.now();
  const msDay = 24 * 60 * 60 * 1000;
  const totalEvents   = events.length;
  const unresolved    = events.filter(e => !e.resolved).length;
  const highLast24h   = events.filter(e => !e.resolved && (e.severity === "high" || e.severity === "critical") && now - new Date(e.created_at) < msDay).length;
  const blockedToday  = events.filter(e => e.event_type === "ip_blocked" && now - new Date(e.created_at) < msDay).length;

  if (!isSuperAdmin) {
    return (
      <div style={{ padding: 60, textAlign: "center" }}>
        <ShieldAlert size={32} style={{ color: "var(--ds-muted)", marginBottom: 12 }} />
        <div style={{ fontSize: 15, fontWeight: 500, color: "var(--ds-text)", marginBottom: 6 }}>Access Restricted</div>
        <div style={{ fontSize: 13, color: "var(--ds-muted)" }}>Security Log is only accessible to Super Admins.</div>
      </div>
    );
  }

  return (
    <div style={{ padding: "32px 32px", maxWidth: 1200, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 14 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ShieldAlert size={17} style={{ color: "#ef4444" }} />
            </div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 700, color: "var(--ds-text)", margin: 0 }}>
              Security
            </h1>
          </div>
          <p style={{ fontSize: 13, color: "var(--ds-muted)", margin: 0 }}>
            Monitor threats and suspicious activity
          </p>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => fetchEvents(true)}
            disabled={refreshing}
            title="Refresh"
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "9px 14px", borderRadius: 7, border: "1px solid var(--ds-border)",
              background: "var(--ds-surface)", color: "var(--ds-muted)", fontSize: 12.5, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <RefreshCw size={13} style={{ animation: refreshing ? "spin 0.8s linear infinite" : "none" }} />
            Refresh
          </button>
          <button
            onClick={exportCsv}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "9px 14px", borderRadius: 7, border: "none",
              background: "var(--ds-gold)", color: "#000", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <Download size={13} /> Export Log
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        <StatCard label="Total Events" value={totalEvents} />
        <StatCard label="Unresolved" value={unresolved} accent={unresolved > 0 ? "#d97706" : undefined} />
        <StatCard label="High / Critical (24h)" value={highLast24h} accent={highLast24h > 0 ? "#ef4444" : undefined} />
        <StatCard label="IPs Blocked Today" value={blockedToday} />
      </div>

      {/* Filter bar */}
      <div style={{ background: "var(--ds-surface)", border: "1px solid var(--ds-border)", borderRadius: 10, padding: "14px 16px", marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        {/* Severity filter */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {SEVERITY_FILTER_OPTIONS.map(s => {
            const cfg = SEVERITY_CFG[s];
            const active = severityFilter === s;
            return (
              <button key={s} onClick={() => setSeverityFilter(s)} style={{
                padding: "5px 12px", borderRadius: 99, fontSize: 11, fontWeight: 600,
                cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                background: active ? (cfg ? cfg.bg : "rgba(200,169,110,0.15)") : "var(--ds-input-bg)",
                color: active ? (cfg ? cfg.text : "var(--ds-gold)") : "var(--ds-muted)",
                border: `1px solid ${active ? (cfg ? cfg.border : "var(--ds-gold)") : "var(--ds-border)"}`,
                textTransform: "capitalize",
              }}>
                {s === "all" ? "All Severity" : s}
              </button>
            );
          })}
        </div>

        <div style={{ width: 1, height: 20, background: "var(--ds-border)", flexShrink: 0 }} />

        {/* Event type filter */}
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          style={{ background: "var(--ds-input-bg)", border: "1px solid var(--ds-border)", borderRadius: 7, padding: "6px 10px", fontSize: 12, color: "var(--ds-text)", outline: "none", cursor: "pointer" }}
        >
          <option value="all">All Event Types</option>
          {Object.entries(EVENT_TYPE_CFG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        {/* IP search */}
        <div style={{ position: "relative", flex: 1, minWidth: 140 }}>
          <Search size={12} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--ds-muted)", pointerEvents: "none" }} />
          <input
            type="text"
            placeholder="Search IP…"
            value={searchIp}
            onChange={e => setSearchIp(e.target.value)}
            style={{ width: "100%", background: "var(--ds-input-bg)", border: "1px solid var(--ds-border)", borderRadius: 7, padding: "6px 10px 6px 28px", fontSize: 12, color: "var(--ds-text)", outline: "none", boxSizing: "border-box" }}
          />
        </div>

        {/* Date range */}
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          style={{ background: "var(--ds-input-bg)", border: "1px solid var(--ds-border)", borderRadius: 7, padding: "6px 10px", fontSize: 12, color: "var(--ds-text)", outline: "none" }} />
        <span style={{ fontSize: 11, color: "var(--ds-muted)" }}>to</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          style={{ background: "var(--ds-input-bg)", border: "1px solid var(--ds-border)", borderRadius: 7, padding: "6px 10px", fontSize: 12, color: "var(--ds-text)", outline: "none" }} />

        {(severityFilter !== "all" || typeFilter !== "all" || searchIp || dateFrom || dateTo) && (
          <button onClick={() => { setSeverityFilter("all"); setTypeFilter("all"); setSearchIp(""); setDateFrom(""); setDateTo(""); }}
            style={{ background: "none", border: "none", color: "var(--ds-muted)", cursor: "pointer", fontSize: 12, textDecoration: "underline", padding: 4, fontFamily: "'DM Sans', sans-serif" }}>
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--ds-muted)" }}>
          <Loader size={20} className="spin" style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 13 }}>Loading security events…</div>
        </div>
      ) : events.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", border: "1px dashed var(--ds-border)", borderRadius: 10 }}>
          <Shield size={36} style={{ color: "rgba(200,169,110,0.4)", marginBottom: 14 }} />
          <div style={{ fontSize: 15, fontWeight: 500, color: "var(--ds-text)", marginBottom: 6 }}>No security events recorded.</div>
          <div style={{ fontSize: 13, color: "var(--ds-muted)" }}>Your site is clean.</div>
        </div>
      ) : (
        <div style={{ background: "var(--ds-surface)", border: "1px solid var(--ds-border)", borderRadius: 10, overflow: "hidden" }}>
          {/* Table header */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "90px 150px 130px 160px 1fr 110px 80px",
            gap: 12, padding: "10px 16px",
            borderBottom: "1px solid var(--ds-border)",
            fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase",
            color: "var(--ds-muted)",
          }}>
            <div>Severity</div>
            <div>Event Type</div>
            <div>IP Address</div>
            <div>Endpoint</div>
            <div>Date / Time (WAT)</div>
            <div>Status</div>
            <div>Actions</div>
          </div>

          {/* Rows */}
          {events.map(event => {
            const typeLabel = EVENT_TYPE_CFG[event.event_type]?.label ?? event.event_type;
            const isSelected = selectedEvent?.id === event.id;
            return (
              <div
                key={event.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "90px 150px 130px 160px 1fr 110px 80px",
                  gap: 12, padding: "13px 16px",
                  borderBottom: "1px solid var(--ds-border)",
                  background: isSelected ? "var(--ds-input-bg)" : "transparent",
                  transition: "background 0.15s",
                  alignItems: "center",
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "var(--ds-input-bg)"; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
              >
                <div><SeverityBadge severity={event.severity} /></div>
                <div style={{ fontSize: 12.5, color: "var(--ds-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{typeLabel}</div>
                <div style={{ fontSize: 12, color: "var(--ds-muted)", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{event.ip_address || "—"}</div>
                <div style={{ fontSize: 12, color: "var(--ds-muted)", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{event.endpoint || "—"}</div>
                <div style={{ fontSize: 12, color: "var(--ds-muted)" }}>{toWAT(event.created_at)}</div>
                <div>
                  {event.resolved
                    ? <span style={{ fontSize: 10.5, fontWeight: 600, color: "#4ade80", background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)", padding: "2px 8px", borderRadius: 99 }}>Resolved</span>
                    : <span style={{ fontSize: 10.5, fontWeight: 600, color: "#d97706", background: "rgba(217,119,6,0.1)", border: "1px solid rgba(217,119,6,0.3)", padding: "2px 8px", borderRadius: 99 }}>Unresolved</span>
                  }
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {!event.resolved && (
                    <button
                      onClick={() => handleResolve(event.id)}
                      title="Mark Resolved"
                      style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid rgba(74,222,128,0.3)", background: "rgba(74,222,128,0.08)", cursor: "pointer", color: "#4ade80", display: "flex", alignItems: "center", justifyContent: "center" }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(74,222,128,0.18)"}
                      onMouseLeave={e => e.currentTarget.style.background = "rgba(74,222,128,0.08)"}
                    >
                      <Check size={11} />
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedEvent(event)}
                    title="View Details"
                    style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid var(--ds-border)", background: "var(--ds-input-bg)", cursor: "pointer", color: "var(--ds-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}
                    onMouseEnter={e => { e.currentTarget.style.color = "var(--ds-text)"; e.currentTarget.style.borderColor = "var(--ds-gold)"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = "var(--ds-muted)"; e.currentTarget.style.borderColor = "var(--ds-border)"; }}
                  >
                    <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail panel */}
      {selectedEvent && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 49, background: "rgba(0,0,0,0.3)" }} onClick={() => setSelectedEvent(null)} />
          <DetailPanel
            event={selectedEvent}
            onClose={() => setSelectedEvent(null)}
            onResolve={handleResolve}
            resolving={resolving}
          />
        </>
      )}

      <style>{`
        .spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
