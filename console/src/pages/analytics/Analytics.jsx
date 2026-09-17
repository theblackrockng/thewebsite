import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Loader2, TrendingUp, ShoppingBag, UtensilsCrossed, Truck, Package } from "lucide-react";

/* ── helpers ── */
function fmtPrice(n) {
  return `₦${Number(n || 0).toLocaleString("en-NG")}`;
}

function isoDate(d) {
  return d.toISOString().split("T")[0];
}

function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function startOfDay(d) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function endOfDay(d) {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

function monthLabel(d) {
  return d.toLocaleDateString("en-NG", { month: "short", year: "numeric" });
}

function dayLabel(d) {
  return d.toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" });
}

const PERIODS = [
  { key: "today",   label: "Today" },
  { key: "week",    label: "This Week" },
  { key: "month",   label: "This Month" },
  { key: "3months", label: "3 Months" },
  { key: "year",    label: "12 Months" },
];

function getDateRange(period) {
  const now = new Date();
  switch (period) {
    case "today":
      return { from: startOfDay(now).toISOString(), to: endOfDay(now).toISOString() };
    case "week": {
      const mon = new Date(now);
      mon.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Monday
      return { from: startOfDay(mon).toISOString(), to: endOfDay(now).toISOString() };
    }
    case "month":
      return { from: startOfMonth(now).toISOString(), to: endOfMonth(now).toISOString() };
    case "3months": {
      const s = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      return { from: s.toISOString(), to: endOfMonth(now).toISOString() };
    }
    case "year": {
      const s = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      return { from: s.toISOString(), to: endOfMonth(now).toISOString() };
    }
    default:
      return { from: startOfMonth(now).toISOString(), to: endOfMonth(now).toISOString() };
  }
}

/* ── compute chart buckets ── */
function buildBuckets(orders, period) {
  const now = new Date();
  const buckets = [];

  if (period === "today") {
    for (let h = 0; h < 24; h++) {
      const label = `${String(h).padStart(2, "0")}:00`;
      buckets.push({ label, revenue: 0, count: 0 });
    }
    orders.forEach((o) => {
      const h = new Date(o.created_at).getHours();
      if (o.order_status !== "cancelled") {
        buckets[h].revenue += Number(o.total || 0);
        buckets[h].count++;
      }
    });
    return buckets.slice(0, now.getHours() + 1);
  }

  if (period === "week") {
    const mon = new Date(now);
    mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    for (let i = 0; i <= (now.getDay() + 6) % 7; i++) {
      const d = addDays(mon, i);
      buckets.push({ label: dayLabel(d), date: isoDate(d), revenue: 0, count: 0 });
    }
    orders.forEach((o) => {
      if (o.order_status === "cancelled") return;
      const d = isoDate(new Date(o.created_at));
      const b = buckets.find((bk) => bk.date === d);
      if (b) { b.revenue += Number(o.total || 0); b.count++; }
    });
    return buckets;
  }

  if (period === "month") {
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    for (let d = 1; d <= Math.min(daysInMonth, now.getDate()); d++) {
      const date = new Date(now.getFullYear(), now.getMonth(), d);
      buckets.push({ label: `${d}`, date: isoDate(date), revenue: 0, count: 0 });
    }
    orders.forEach((o) => {
      if (o.order_status === "cancelled") return;
      const d = isoDate(new Date(o.created_at));
      const b = buckets.find((bk) => bk.date === d);
      if (b) { b.revenue += Number(o.total || 0); b.count++; }
    });
    return buckets;
  }

  // 3months or year → monthly buckets
  const monthCount = period === "3months" ? 3 : 12;
  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ label: monthLabel(d), year: d.getFullYear(), month: d.getMonth(), revenue: 0, count: 0 });
  }
  orders.forEach((o) => {
    if (o.order_status === "cancelled") return;
    const d = new Date(o.created_at);
    const b = buckets.find((bk) => bk.year === d.getFullYear() && bk.month === d.getMonth());
    if (b) { b.revenue += Number(o.total || 0); b.count++; }
  });
  return buckets;
}

/* ── components ── */
function StatCard({ label, value, sub, color }) {
  return (
    <div style={{
      background: "var(--ds-surface)",
      border: "1px solid var(--ds-border)",
      borderRadius: 10,
      padding: "18px 20px",
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ds-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: color || "var(--ds-text)", lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--ds-muted)", marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function BarChart({ buckets, valueKey = "revenue", formatValue }) {
  const max = Math.max(...buckets.map((b) => b[valueKey]), 1);
  const fmt = formatValue || ((v) => fmtPrice(v));

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 140, paddingBottom: 28, position: "relative" }}>
      {buckets.map((b, i) => {
        const pct = (b[valueKey] / max) * 100;
        return (
          <div
            key={i}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%", justifyContent: "flex-end", position: "relative" }}
            title={`${b.label}: ${fmt(b[valueKey])}`}
          >
            <div style={{
              width: "100%",
              height: `${Math.max(pct, b[valueKey] > 0 ? 2 : 0)}%`,
              background: pct > 0 ? "linear-gradient(180deg, #c8a96e 0%, #a07840 100%)" : "var(--ds-border)",
              borderRadius: "3px 3px 0 0",
              transition: "height 0.3s ease",
              minHeight: b[valueKey] > 0 ? 3 : 0,
            }} />
            <span style={{
              position: "absolute",
              bottom: 0,
              fontSize: 9,
              color: "var(--ds-muted)",
              transform: "rotate(-35deg)",
              transformOrigin: "top left",
              whiteSpace: "nowrap",
              left: "50%",
            }}>
              {b.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function DayTable({ orders }) {
  if (!orders.length) return null;

  const byDay = {};
  orders.forEach((o) => {
    if (o.order_status === "cancelled") return;
    const d = isoDate(new Date(o.created_at));
    if (!byDay[d]) byDay[d] = { date: d, count: 0, revenue: 0, dineIn: 0, online: 0 };
    byDay[d].count++;
    byDay[d].revenue += Number(o.total || 0);
    if (o.order_type === "dine-in") byDay[d].dineIn++;
    else byDay[d].online++;
  });

  const rows = Object.values(byDay).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 31);

  return (
    <div style={{ background: "var(--ds-surface)", border: "1px solid var(--ds-border)", borderRadius: 10, overflow: "hidden" }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--ds-border)", fontSize: 12, fontWeight: 600, color: "var(--ds-text)" }}>
        Daily Breakdown
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--ds-border)" }}>
              {["Date", "Orders", "Revenue", "Dine-In", "Online", "Avg Order"].map((h) => (
                <th key={h} style={{ padding: "8px 16px", textAlign: "left", fontSize: 10, fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase", color: "var(--ds-muted)", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.date} style={{ borderBottom: "1px solid var(--ds-border)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--ds-input-bg)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <td style={{ padding: "10px 16px", fontSize: 13, color: "var(--ds-text)", whiteSpace: "nowrap" }}>
                  {new Date(row.date + "T12:00:00").toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" })}
                </td>
                <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600, color: "var(--ds-text)" }}>{row.count}</td>
                <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 700, color: "var(--ds-gold)" }}>{fmtPrice(row.revenue)}</td>
                <td style={{ padding: "10px 16px", fontSize: 12, color: "#fb923c" }}>{row.dineIn}</td>
                <td style={{ padding: "10px 16px", fontSize: 12, color: "#60a5fa" }}>{row.online}</td>
                <td style={{ padding: "10px 16px", fontSize: 12, color: "var(--ds-muted)" }}>{fmtPrice(row.count > 0 ? row.revenue / row.count : 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Main page ── */
export default function Analytics() {
  const [period, setPeriod] = useState("month");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { from, to } = getDateRange(period);
      const res = await fetch(`/api/orders?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");
      setOrders(json.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const active = orders.filter((o) => o.order_status !== "cancelled");
  const completed = orders.filter((o) => o.order_status === "completed");
  const totalRevenue = completed.reduce((s, o) => s + Number(o.total || 0), 0);
  const pipelineRevenue = active.filter(o => o.order_status !== "completed").reduce((s, o) => s + Number(o.total || 0), 0);
  const avgOrder = completed.length > 0 ? totalRevenue / completed.length : 0;
  const dineInRevenue = completed.filter((o) => o.order_type === "dine-in").reduce((s, o) => s + Number(o.total || 0), 0);
  const onlineRevenue = completed.filter((o) => o.order_type !== "dine-in").reduce((s, o) => s + Number(o.total || 0), 0);
  const paidOrders = orders.filter((o) => o.payment_status === "paid");

  const buckets = buildBuckets(active, period);
  const maxRevenue = Math.max(...buckets.map((b) => b.revenue), 1);

  return (
    <div style={{ padding: "28px 24px", maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <TrendingUp size={20} style={{ color: "var(--ds-gold)" }} />
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--ds-text)", fontFamily: "'Cormorant Garamond', serif", letterSpacing: "0.5px" }}>
              Analytics
            </h1>
          </div>
          <p style={{ margin: "4px 0 0 30px", fontSize: 13, color: "var(--ds-muted)" }}>Revenue and order trends</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 7, background: "var(--ds-surface)", border: "1px solid var(--ds-border)", color: "var(--ds-muted)", fontSize: 12.5, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
        >
          {loading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <RefreshCw size={14} />}
          Refresh
        </button>
      </div>

      {/* Period tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "var(--ds-surface)", border: "1px solid var(--ds-border)", borderRadius: 8, padding: 4, width: "fit-content" }}>
        {PERIODS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setPeriod(key)}
            style={{
              padding: "7px 16px", borderRadius: 6,
              fontSize: 12.5, fontWeight: period === key ? 600 : 500,
              background: period === key ? "var(--ds-gold)" : "transparent",
              color: period === key ? "#1a1a1a" : "var(--ds-muted)",
              border: "none", cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#ef4444" }}>
          {error}
        </div>
      )}

      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 24 }}>
        <StatCard label="Confirmed Revenue" value={fmtPrice(totalRevenue)} sub={`${completed.length} completed order${completed.length !== 1 ? "s" : ""}`} color="var(--ds-gold)" />
        <StatCard label="Pipeline" value={fmtPrice(pipelineRevenue)} sub={`${active.filter(o => o.order_status !== "completed").length} active order${active.filter(o => o.order_status !== "completed").length !== 1 ? "s" : ""}`} />
        <StatCard label="Avg Order Value" value={fmtPrice(avgOrder)} sub="Completed orders only" />
        <StatCard label="Paid" value={fmtPrice(paidOrders.reduce((s, o) => s + Number(o.total || 0), 0))} sub={`${paidOrders.length} order${paidOrders.length !== 1 ? "s" : ""} paid`} color="#22c55e" />
        <StatCard
          label="Dine-In"
          value={fmtPrice(dineInRevenue)}
          sub={`${completed.filter(o => o.order_type === "dine-in").length} orders`}
          color="#fb923c"
        />
        <StatCard
          label="Online (Pickup / Delivery)"
          value={fmtPrice(onlineRevenue)}
          sub={`${completed.filter(o => o.order_type !== "dine-in").length} orders`}
          color="#60a5fa"
        />
      </div>

      {/* Bar chart */}
      <div style={{ background: "var(--ds-surface)", border: "1px solid var(--ds-border)", borderRadius: 10, padding: "20px 20px 12px", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ds-text)" }}>Revenue by {period === "today" ? "Hour" : period === "week" || period === "month" ? "Day" : "Month"}</div>
          <div style={{ fontSize: 12, color: "var(--ds-muted)" }}>Peak: {fmtPrice(maxRevenue)}</div>
        </div>
        {loading ? (
          <div style={{ height: 140, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ds-muted)", fontSize: 13 }}>Loading…</div>
        ) : buckets.length === 0 ? (
          <div style={{ height: 140, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ds-muted)", fontSize: 13 }}>No orders in this period</div>
        ) : (
          <BarChart buckets={buckets} valueKey="revenue" />
        )}
      </div>

      {/* Order type split */}
      {active.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Dine-In", icon: <UtensilsCrossed size={14} style={{ color: "#fb923c" }} />, color: "#fb923c", count: active.filter(o => o.order_type === "dine-in").length, revenue: active.filter(o => o.order_type === "dine-in").reduce((s, o) => s + Number(o.total || 0), 0) },
            { label: "Pickup",  icon: <Package size={14}  style={{ color: "var(--ds-gold)" }} />, color: "var(--ds-gold)", count: active.filter(o => o.order_type === "pickup").length, revenue: active.filter(o => o.order_type === "pickup").reduce((s, o) => s + Number(o.total || 0), 0) },
            { label: "Delivery",icon: <Truck size={14}    style={{ color: "#60a5fa" }} />, color: "#60a5fa", count: active.filter(o => o.order_type === "delivery").length, revenue: active.filter(o => o.order_type === "delivery").reduce((s, o) => s + Number(o.total || 0), 0) },
          ].map(({ label, icon, color, count, revenue }) => (
            <div key={label} style={{ background: "var(--ds-surface)", border: "1px solid var(--ds-border)", borderRadius: 10, padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                {icon}
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ds-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color, marginBottom: 4 }}>{count}</div>
              <div style={{ fontSize: 12, color: "var(--ds-muted)" }}>{fmtPrice(revenue)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Daily breakdown table */}
      {!loading && <DayTable orders={orders} />}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
