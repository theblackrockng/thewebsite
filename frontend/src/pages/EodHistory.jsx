import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Printer, ChefHat, RefreshCw, ArrowLeft } from "lucide-react";
import StaffLoginGate from "../components/StaffLoginGate";
import { supabase } from "../lib/supabase";
import { authHeader } from "../lib/staffAuth";
import { buildEndOfDayHtml } from "./FrontDeskDisplay";

const EOD_ROLES = ["front_desk", "manager", "super_admin"];

const GOLD = "#c8a96e";
const BURGUNDY = "#7a1c1c";
const T = {
  bg: "#faf8f5", card: "#ffffff", border: "#e4dccd",
  text: "#1a1a1a", muted: "#7a6f60", gold: GOLD, accent: BURGUNDY, onGold: "#1a1a1a",
};

function lagosToday() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });
}

function lagosYesterday() {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return yesterday.toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });
}

function formatDateHeader(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const d = new Date(`${dateStr}T12:00:00+01:00`);
  return d.toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Lagos",
  });
}

function EodHistoryInner() {
  const todayStr = lagosToday();
  const [date, setDate] = useState(() => lagosYesterday());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState(null);
  const [menuCategoryMap, setMenuCategoryMap] = useState(() => new Map());
  const [allPrintStatus, setAllPrintStatus] = useState(null);
  const [kitchenPrintStatus, setKitchenPrintStatus] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.from("menu_items").select("id, category").limit(1000);
        if (cancelled || !mountedRef.current) return;
        const map = new Map();
        for (const row of (data || [])) {
          if (row.id && row.category) map.set(row.id, row.category);
        }
        setMenuCategoryMap(map);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  const fetchReport = useCallback(async (requestedDate) => {
    setLoading(true);
    setError("");
    setReport(null);
    try {
      const res = await fetch(`/api/front-desk?resource=eod&date=${encodeURIComponent(requestedDate)}`, {
        method: "GET",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
      }
      const body = await res.json();
      if (!mountedRef.current) return;
      setReport(body);
    } catch (err) {
      if (mountedRef.current) setError(err.message || "Failed to load report.");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (date) fetchReport(date);
  }, [date, fetchReport]);

  const previewHtml = useMemo(() => {
    if (!report) return "";
    return buildEndOfDayHtml(
      report.completedOrders || [],
      menuCategoryMap,
      report.bookings || [],
      "all",
      report.date
    );
  }, [report, menuCategoryMap]);

  async function printMode(mode) {
    if (!report) return;
    const setStatus = mode === "kitchen" ? setKitchenPrintStatus : setAllPrintStatus;
    setStatus("printing");
    const html = buildEndOfDayHtml(
      report.completedOrders || [],
      menuCategoryMap,
      report.bookings || [],
      mode,
      report.date
    );
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.printReceipt(html);
        setStatus(result.success ? "ok" : "error");
      } else {
        const w = window.open("", "_blank");
        if (w) {
          w.document.write(html);
          w.document.close();
          w.focus();
          try { w.print(); } catch {}
          setStatus("ok");
        } else {
          setStatus("error");
        }
      }
    } catch {
      setStatus("error");
    }
    setTimeout(() => mountedRef.current && setStatus(null), 3000);
  }

  const sourceLabel = report
    ? report.source === "archive"
      ? `Archived snapshot${report.archived_at ? ` (saved ${new Date(report.archived_at).toLocaleString("en-GB", { timeZone: "Africa/Lagos" })})` : ""}`
      : "Live computation (no archive yet for this date)"
    : "";

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, padding: "28px 24px", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Link
              to="/front-desk-display"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 14px",
                borderRadius: 10, border: `1px solid ${T.border}`, background: T.card,
                color: T.muted, textDecoration: "none", fontSize: 14, fontWeight: 600,
              }}
            >
              <ArrowLeft size={16} /> Back to Front Desk
            </Link>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: 1 }}>End of Day — History</div>
              <div style={{ fontSize: 13, color: T.muted }}>Browse archived sales reports by date.</div>
            </div>
          </div>
        </div>

        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18, marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 12, color: T.muted, fontWeight: 600, letterSpacing: 0.4 }}>REPORT DATE</span>
              <input
                type="date"
                value={date}
                max={todayStr}
                onChange={(e) => setDate(e.target.value)}
                style={{
                  padding: "10px 12px", borderRadius: 10, border: `1px solid ${T.border}`,
                  background: "#fff", color: T.text, fontSize: 16, fontFamily: "inherit",
                }}
              />
            </label>
            <button
              onClick={() => date && fetchReport(date)}
              disabled={loading || !date}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 18px",
                borderRadius: 10, border: `1px solid ${T.border}`, background: T.card,
                color: T.muted, fontSize: 14, fontWeight: 700, cursor: loading ? "default" : "pointer",
                opacity: loading ? 0.6 : 1, alignSelf: "flex-end",
              }}
            >
              <RefreshCw size={16} /> {loading ? "Loading..." : "Reload"}
            </button>
            <div style={{ marginLeft: "auto", display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                onClick={() => printMode("all")}
                disabled={!report || allPrintStatus === "printing"}
                style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "12px 18px", borderRadius: 10,
                  border: `1.5px solid ${allPrintStatus === "error" ? T.accent : T.gold}`,
                  background: allPrintStatus === "ok" ? "rgba(200,169,110,0.10)" : "transparent",
                  color: allPrintStatus === "error" ? T.accent : T.gold,
                  fontSize: 14, fontWeight: 700, cursor: (!report || allPrintStatus === "printing") ? "default" : "pointer",
                  fontFamily: "inherit", opacity: (!report || allPrintStatus === "printing") ? 0.6 : 1,
                }}
              >
                <Printer size={16} />
                {allPrintStatus === "printing" ? "Printing..." : allPrintStatus === "ok" ? "Sent" : allPrintStatus === "error" ? "Failed" : "Print All"}
              </button>
              <button
                onClick={() => printMode("kitchen")}
                disabled={!report || kitchenPrintStatus === "printing"}
                title="Kitchen-only EOD: Main Kitchen + Grill Kitchen + Voided items"
                style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "12px 18px", borderRadius: 10,
                  border: `1.5px solid ${kitchenPrintStatus === "error" ? T.accent : T.gold}`,
                  background: kitchenPrintStatus === "ok" ? "rgba(200,169,110,0.10)" : "transparent",
                  color: kitchenPrintStatus === "error" ? T.accent : T.gold,
                  fontSize: 14, fontWeight: 700, cursor: (!report || kitchenPrintStatus === "printing") ? "default" : "pointer",
                  fontFamily: "inherit", opacity: (!report || kitchenPrintStatus === "printing") ? 0.6 : 1,
                }}
              >
                <ChefHat size={16} />
                {kitchenPrintStatus === "printing" ? "Printing..." : kitchenPrintStatus === "ok" ? "Sent" : kitchenPrintStatus === "error" ? "Failed" : "Kitchen Only"}
              </button>
            </div>
          </div>
          <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", fontSize: 13, color: T.muted }}>
            <span style={{ fontWeight: 700, color: T.text }}>{formatDateHeader(date)}</span>
            {report && (
              <span style={{
                padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700,
                background: report.source === "archive" ? "rgba(200,169,110,0.15)" : "rgba(122,28,28,0.10)",
                color: report.source === "archive" ? T.gold : T.accent,
              }}>
                {sourceLabel}
              </span>
            )}
          </div>
        </div>

        {error && (
          <div style={{
            background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.3)",
            borderRadius: 12, padding: 14, color: "#991b1b", marginBottom: 18, fontWeight: 600,
          }}>
            {error}
          </div>
        )}

        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
          {loading && !report ? (
            <div style={{ padding: 48, textAlign: "center", color: T.muted }}>Loading…</div>
          ) : previewHtml ? (
            <iframe
              title="EOD preview"
              srcDoc={previewHtml}
              style={{ width: "100%", minHeight: 720, border: "none", background: "#fff" }}
            />
          ) : (
            <div style={{ padding: 48, textAlign: "center", color: T.muted }}>
              {error ? "Could not load report." : "Pick a date to view the report."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EodHistory() {
  return (
    <StaffLoginGate allowedRoles={EOD_ROLES} title="EOD History">
      <EodHistoryInner />
    </StaffLoginGate>
  );
}
