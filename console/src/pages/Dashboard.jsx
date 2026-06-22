import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Clock, AlertCircle, LayoutGrid, MessageSquare, CalendarDays, Users,
  TrendingUp, TrendingDown, Minus,
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

/* ─── Stat Card ─── */
function StatCard({ label, value, trend, iconEl, loading }) {
  return (
    <div style={{
      background: "var(--ds-surface)",
      border: "1px solid var(--ds-border)",
      borderRadius: 11,
      padding: "18px 20px 16px",
      boxShadow: "var(--ds-shadow)",
    }}>
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
function ReservationRow({ r }) {
  const partyDisplay = r.party === "other" ? (r.party_other ?? "—") : (r.party ?? "—");
  return (
    <div
      style={{ display: "grid", gridTemplateColumns: "minmax(140px,1.9fr) 62px 72px 40px minmax(90px,1fr) 88px", padding: "12px 20px", borderBottom: "1px solid var(--ds-border)", alignItems: "center" }}
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

function UpcomingPanel({ upcoming, loading }) {
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
    <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--ds-muted)", fontSize: 13 }}>No upcoming reservations.</div>
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
                  <div key={r.id}>
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

function ActivityPanel({ recentRes, recentEnq, loading }) {
  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px", color: "var(--ds-muted)", fontSize: 13 }}>Loading…</div>
  );

  /* Build combined activity feed */
  const items = [
    ...recentRes.map((r) => ({
      id: "r" + r.id,
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
      {items.map((item, i) => (
        <div key={item.id} style={{ display: "flex", gap: 12, padding: "10px 20px", alignItems: "flex-start" }}>
          {/* Dot + line */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 4, flexShrink: 0 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: ACTIVITY_DOT[item.type] ?? "var(--ds-muted)", flexShrink: 0 }} />
            {i < items.length - 1 && <div style={{ width: 1, flex: 1, background: "var(--ds-border)", marginTop: 4, minHeight: 20 }} />}
          </div>
          <div style={{ flex: 1, paddingBottom: i < items.length - 1 ? 8 : 0 }}>
            <div style={{ fontSize: 12.5, color: "var(--ds-text)", lineHeight: 1.4 }}>{item.text}</div>
            <div style={{ fontSize: 11, color: "var(--ds-muted)", marginTop: 2 }}>{timeAgo(item.ts)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Dashboard ─── */
export default function Dashboard() {
  const [stats,     setStats]     = useState({ today: null, todayDelta: null, pending: null, total: null, totalDelta: null, enquiries: null, enquiriesDelta: null });
  const [recentRes, setRecentRes] = useState([]);
  const [recentEnq, setRecentEnq] = useState([]);
  const [upcoming,  setUpcoming]  = useState([]);
  const [loading,   setLoading]   = useState(true);

  const load = async () => {
    setLoading(true);
    const today     = new Date();
    const todayStr  = today.toISOString().split("T")[0];
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    const yStr      = yesterday.toISOString().split("T")[0];
    const yStartISO = yStr + "T00:00:00.000Z";
    const weekEnd   = new Date(today); weekEnd.setDate(today.getDate() + 6);
    const weekEndStr = weekEnd.toISOString().split("T")[0];

    const [r1, r2, r3, r4, r5, r6, r7, r8, r9, r10] = await Promise.all([
      // Today's reservations by date
      supabase.from("reservations").select("id", { count: "exact", head: true }).eq("date", todayStr),
      // Yesterday's reservations by date (delta)
      supabase.from("reservations").select("id", { count: "exact", head: true }).eq("date", yStr),
      // Pending
      supabase.from("reservations").select("id", { count: "exact", head: true }).eq("status", "pending"),
      // Total all time
      supabase.from("reservations").select("id", { count: "exact", head: true }),
      // New enquiries
      supabase.from("enquiries").select("id", { count: "exact", head: true }).eq("status", "new"),
      // Recent reservations (8)
      supabase.from("reservations").select("id,name,date,time,party,party_other,occasion,status,created_at").order("created_at", { ascending: false }).limit(8),
      // Recent enquiries (5)
      supabase.from("enquiries").select("id,name,message,status,created_at").order("created_at", { ascending: false }).limit(5),
      // Upcoming this week
      supabase.from("reservations").select("id,name,date,time,party,party_other").gte("date", todayStr).lte("date", weekEndStr).order("date").order("time").limit(25),
      // New reservations since yesterday (total delta)
      supabase.from("reservations").select("id", { count: "exact", head: true }).gte("created_at", yStartISO),
      // New enquiries since yesterday (enquiry delta)
      supabase.from("enquiries").select("id", { count: "exact", head: true }).gte("created_at", yStartISO),
    ]);

    setStats({
      today:          r1.count,
      todayDelta:     (r1.count ?? 0) - (r2.count ?? 0),
      pending:        r3.count,
      total:          r4.count,
      totalDelta:     r9.count ?? 0,
      enquiries:      r5.count,
      enquiriesDelta: r10.count ?? 0,
    });
    setRecentRes(r6.data ?? []);
    setRecentEnq(r7.data ?? []);
    setUpcoming(r8.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const now = new Date();
  const dayName = now.toLocaleDateString("en-GB", { weekday: "long" });
  const day = now.getDate();
  const month = now.toLocaleDateString("en-GB", { month: "long" });
  const year = now.getFullYear();
  const headerDate = `${dayName}, ${day} ${month} ${year}`;

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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }} className="ds-stat-grid">

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
      </div>

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
            {loading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px", color: "var(--ds-muted)", fontSize: 13, minHeight: 200 }}>Loading…</div>
            ) : recentRes.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--ds-muted)", fontSize: 13 }}>No reservations yet.</div>
            ) : (
              recentRes.map((r) => <ReservationRow key={r.id} r={r} />)
            )}
          </div>
        </Panel>

        {/* Recent Enquiries */}
        <Panel>
          <PanelHeader title="Recent Enquiries" to="/enquiries" />
          {loading ? (
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

        {/* Upcoming This Week */}
        <Panel>
          <PanelHeader title="Upcoming This Week" to="/reservations" toLabel="View all →" />
          <UpcomingPanel upcoming={upcoming} loading={loading} />
        </Panel>

        {/* Recent Activity */}
        <Panel>
          <PanelHeader title="Recent Activity" />
          <ActivityPanel recentRes={recentRes.slice(0, 4)} recentEnq={recentEnq.slice(0, 3)} loading={loading} />
        </Panel>
      </div>

      {/* Responsive grid styles */}
      <style>{`
        @media (max-width: 1149px) {
          .ds-stat-grid  { grid-template-columns: repeat(2, 1fr) !important; }
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
