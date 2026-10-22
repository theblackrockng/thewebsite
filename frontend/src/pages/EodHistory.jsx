import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Printer, ChefHat, RefreshCw, ArrowLeft, Sun, Moon, Delete, X, RotateCcw } from "lucide-react";
import StaffLoginGate from "../components/StaffLoginGate";
import { supabase } from "../lib/supabase";
import { authHeader } from "../lib/staffAuth";
import { buildEndOfDayHtml, applyPrintStyle, loadPrintStyle, DEFAULT_PRINT_STYLE, PRINT_STYLE_KEY, FONT_OPTIONS } from "./FrontDeskDisplay";

const EOD_ROLES = ["front_desk", "manager", "super_admin"];

const GOLD = "#c8a96e";
const BURGUNDY = "#7a1c1c";
const THEMES = {
  light: { bg: "#faf8f5", card: "#ffffff", cardHead: "#f3eee6", border: "#e4dccd", text: "#1a1a1a", muted: "#7a6f60", gold: GOLD, accent: BURGUNDY, onGold: "#1a1a1a", input: "#ffffff" },
  dark:  { bg: "#1a1a1a", card: "#242220", cardHead: "#2c2926", border: "#3a352e", text: "#f5f0e8", muted: "#a89a84", gold: GOLD, accent: "#d05a5a", onGold: "#1a1a1a", input: "#2c2926" },
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

function escHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Injects "Printed by: <name>" into the receipt HTML so the ticket shows who
// ran the print. The marker is the "Printed:" line that buildEndOfDayHtml
// always emits — we prepend our line to it.
function stampPrintedBy(html, waiterName) {
  if (!waiterName) return html;
  const line = `<div class="dt">Printed by: ${escHtml(waiterName)}</div>`;
  return html.replace('<div class="dt">Printed:', `${line}<div class="dt">Printed:`);
}


function WaiterPinModal({ open, onClose, onVerified, t }) {
  const [waiters, setWaiters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelected(null); setPin(""); setError(""); setVerifying(false);
    setLoading(true);
    (async () => {
      try {
        const res = await fetch("/api/waiter-profiles", { headers: await authHeader() });
        const data = await res.json();
        setWaiters(data.waiters || []);
      } catch {
        setWaiters([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  const verifyPin = useCallback(async (waiter, pinVal) => {
    setVerifying(true);
    setError("");
    try {
      const res = await fetch("/api/verify-waiter-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ id: waiter.id, pin: pinVal }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        onVerified(waiter.name);
      } else {
        setPin("");
        setError(res.status === 429 ? (data.error || "Too many attempts.") : "Incorrect PIN. Try again.");
      }
    } catch {
      setPin("");
      setError("Connection error. Try again.");
    } finally {
      setVerifying(false);
    }
  }, [onVerified]);

  function pressDigit(d) {
    if (verifying || pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    setError("");
    if (next.length === 4) verifyPin(selected, next);
  }

  function backspace() {
    if (verifying) return;
    setPin((p) => p.slice(0, -1));
    setError("");
  }

  if (!open) return null;

  const overlayStyle = {
    position: "fixed", inset: 0, zIndex: 2000,
    background: "rgba(0,0,0,0.55)",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: 20, fontFamily: "'DM Sans', 'Montserrat', sans-serif",
  };
  const cardStyle = {
    width: "100%", maxWidth: selected ? 360 : 480,
    background: t.card, border: `1px solid ${t.border}`,
    borderRadius: 16, padding: "28px 24px",
    display: "flex", flexDirection: "column", gap: 20,
  };
  const headerStyle = {
    display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12,
  };

  if (!selected) {
    return (
      <div style={overlayStyle}>
        <div style={cardStyle}>
          <div style={headerStyle}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "2px", color: t.gold, textTransform: "uppercase" }}>Authorise print</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: t.text, marginTop: 2 }}>Who's printing?</div>
              <div style={{ fontSize: 13, color: t.muted, marginTop: 4 }}>Tap your name, then enter your PIN.</div>
            </div>
            <button onClick={onClose} aria-label="Cancel" style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 7, padding: 6, color: t.muted, cursor: "pointer", display: "flex" }}>
              <X size={14} />
            </button>
          </div>
          {loading ? (
            <div style={{ textAlign: "center", color: t.muted, fontSize: 13, padding: "20px 0" }}>Loading…</div>
          ) : waiters.length === 0 ? (
            <div style={{ textAlign: "center", color: t.muted, fontSize: 13, padding: "20px 0", background: t.cardHead, borderRadius: 10, border: `1px solid ${t.border}` }}>
              No waiter profiles set up yet.<br />
              <span style={{ fontSize: 12, opacity: 0.75 }}>Ask a super admin to add waiter profiles in the console.</span>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10 }}>
              {waiters.map((w) => (
                <button
                  key={w.id}
                  onClick={() => { setSelected(w); setPin(""); setError(""); }}
                  style={{
                    padding: "18px 10px", background: t.cardHead, border: `1px solid ${t.border}`,
                    borderRadius: 10, color: t.text, fontSize: 14, fontWeight: 700, cursor: "pointer",
                    fontFamily: "inherit", textAlign: "center",
                  }}
                >
                  {w.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const PAD = ["1","2","3","4","5","6","7","8","9","","0","⌫"];
  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        <div style={headerStyle}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "2px", color: t.gold, textTransform: "uppercase" }}>Enter PIN</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: t.text, marginTop: 2 }}>{selected.name}</div>
          </div>
          <button onClick={onClose} aria-label="Cancel" style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 7, padding: 6, color: t.muted, cursor: "pointer", display: "flex" }}>
            <X size={14} />
          </button>
        </div>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", padding: "4px 0" }}>
          {[0,1,2,3].map((i) => (
            <div
              key={i}
              style={{
                width: 16, height: 16, borderRadius: "50%",
                background: i < pin.length ? t.gold : "transparent",
                border: `2px solid ${i < pin.length ? t.gold : t.border}`,
                transition: "background 0.1s, border-color 0.1s",
              }}
            />
          ))}
        </div>
        {error && (
          <div style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.25)", borderRadius: 7, padding: "9px 12px", fontSize: 13, color: "#991b1b", textAlign: "center" }}>
            {error}
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {PAD.map((key, idx) => {
            if (key === "") return <div key={idx} />;
            const isBack = key === "⌫";
            return (
              <button
                key={idx}
                onClick={() => isBack ? backspace() : pressDigit(key)}
                disabled={verifying || (!isBack && pin.length >= 4)}
                style={{
                  height: 58, borderRadius: 10, border: `1px solid ${t.border}`,
                  background: isBack ? "transparent" : t.cardHead,
                  color: isBack ? t.muted : t.text,
                  fontSize: isBack ? 16 : 20, fontWeight: 600,
                  cursor: (verifying || (!isBack && pin.length >= 4)) ? "default" : "pointer",
                  opacity: verifying ? 0.5 : 1,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "inherit",
                }}
              >
                {isBack ? <Delete size={18} /> : key}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => { setSelected(null); setPin(""); setError(""); }}
          style={{ background: "none", border: "none", color: t.muted, fontSize: 13, cursor: "pointer", fontFamily: "inherit", textAlign: "center", padding: "4px 0" }}
        >
          ← Back to waiter list
        </button>
      </div>
    </div>
  );
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
  const [pinOpen, setPinOpen] = useState(false);
  const pendingModeRef = useRef(null);
  const mountedRef = useRef(true);

  const [isDark, setIsDark] = useState(() => {
    try { return localStorage.getItem("blackrock-frontdesk-theme") === "dark"; } catch { return false; }
  });
  const t = THEMES[isDark ? "dark" : "light"];

  const [printStyle, setPrintStyle] = useState(() => loadPrintStyle());

  const updatePrintStyle = useCallback((patch) => {
    setPrintStyle((prev) => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(PRINT_STYLE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const resetPrintStyle = useCallback(() => {
    try { localStorage.removeItem(PRINT_STYLE_KEY); } catch {}
    setPrintStyle({ ...DEFAULT_PRINT_STYLE });
  }, []);

  function toggleTheme() {
    setIsDark((prev) => {
      const next = !prev;
      try { localStorage.setItem("blackrock-frontdesk-theme", next ? "dark" : "light"); } catch {}
      return next;
    });
  }

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
    const base = buildEndOfDayHtml(
      report.completedOrders || [],
      menuCategoryMap,
      report.bookings || [],
      "all",
      report.date
    );
    return applyPrintStyle(base, printStyle);
  }, [report, menuCategoryMap, printStyle]);

  const doPrint = useCallback(async (mode, waiterName) => {
    if (!report) return;
    const setStatus = mode === "kitchen" ? setKitchenPrintStatus : setAllPrintStatus;
    setStatus("printing");
    const baseHtml = buildEndOfDayHtml(
      report.completedOrders || [],
      menuCategoryMap,
      report.bookings || [],
      mode,
      report.date
    );
    const html = applyPrintStyle(stampPrintedBy(baseHtml, waiterName), printStyle);
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
  }, [report, menuCategoryMap, printStyle]);

  function requestPrint(mode) {
    if (!report) return;
    pendingModeRef.current = mode;
    setPinOpen(true);
  }

  function onPinVerified(waiterName) {
    const mode = pendingModeRef.current;
    pendingModeRef.current = null;
    setPinOpen(false);
    if (mode) doPrint(mode, waiterName);
  }

  const sourceLabel = report
    ? report.source === "archive"
      ? `Archived snapshot${report.archived_at ? ` (saved ${new Date(report.archived_at).toLocaleString("en-GB", { timeZone: "Africa/Lagos" })})` : ""}`
      : "Live computation (no archive yet for this date)"
    : "";

  const pill = {
    display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 14px",
    borderRadius: 10, border: `1px solid ${t.border}`, background: t.card,
    color: t.muted, textDecoration: "none", fontSize: 14, fontWeight: 600, cursor: "pointer",
    fontFamily: "inherit",
  };

  return (
    <div style={{ minHeight: "100vh", background: t.bg, color: t.text, padding: "28px 24px", fontFamily: "'DM Sans', 'Montserrat', sans-serif" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Link to="/front-desk-display" style={{ ...pill, textDecoration: "none" }}>
              <ArrowLeft size={16} /> Back to Front Desk
            </Link>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: 1, color: t.text }}>End of Day — History</div>
              <div style={{ fontSize: 13, color: t.muted }}>Browse archived sales reports by date.</div>
            </div>
          </div>
          <button onClick={toggleTheme} style={pill} aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}>
            {isDark ? <Sun size={16} /> : <Moon size={16} />} {isDark ? "Light" : "Dark"}
          </button>
        </div>

        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, padding: 18, marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 12, color: t.muted, fontWeight: 600, letterSpacing: 0.4 }}>REPORT DATE</span>
              <input
                type="date"
                value={date}
                max={todayStr}
                onChange={(e) => setDate(e.target.value)}
                style={{
                  padding: "10px 12px", borderRadius: 10, border: `1px solid ${t.border}`,
                  background: t.input, color: t.text, fontSize: 16, fontFamily: "inherit",
                  colorScheme: isDark ? "dark" : "light",
                }}
              />
            </label>
            <button
              onClick={() => date && fetchReport(date)}
              disabled={loading || !date}
              style={{
                ...pill, alignSelf: "flex-end", padding: "12px 18px", fontWeight: 700,
                opacity: loading ? 0.6 : 1, cursor: loading ? "default" : "pointer",
              }}
            >
              <RefreshCw size={16} /> {loading ? "Loading..." : "Reload"}
            </button>
            <div style={{ marginLeft: "auto", display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                onClick={() => requestPrint("all")}
                disabled={!report || allPrintStatus === "printing"}
                style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "12px 18px", borderRadius: 10,
                  border: `1.5px solid ${allPrintStatus === "error" ? t.accent : t.gold}`,
                  background: allPrintStatus === "ok" ? "rgba(200,169,110,0.10)" : "transparent",
                  color: allPrintStatus === "error" ? t.accent : t.gold,
                  fontSize: 14, fontWeight: 700, cursor: (!report || allPrintStatus === "printing") ? "default" : "pointer",
                  fontFamily: "inherit", opacity: (!report || allPrintStatus === "printing") ? 0.6 : 1,
                }}
              >
                <Printer size={16} />
                {allPrintStatus === "printing" ? "Printing..." : allPrintStatus === "ok" ? "Sent" : allPrintStatus === "error" ? "Failed" : "Print All"}
              </button>
              <button
                onClick={() => requestPrint("kitchen")}
                disabled={!report || kitchenPrintStatus === "printing"}
                title="Kitchen-only EOD: Main Kitchen + Grill Kitchen + Voided items"
                style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "12px 18px", borderRadius: 10,
                  border: `1.5px solid ${kitchenPrintStatus === "error" ? t.accent : t.gold}`,
                  background: kitchenPrintStatus === "ok" ? "rgba(200,169,110,0.10)" : "transparent",
                  color: kitchenPrintStatus === "error" ? t.accent : t.gold,
                  fontSize: 14, fontWeight: 700, cursor: (!report || kitchenPrintStatus === "printing") ? "default" : "pointer",
                  fontFamily: "inherit", opacity: (!report || kitchenPrintStatus === "printing") ? 0.6 : 1,
                }}
              >
                <ChefHat size={16} />
                {kitchenPrintStatus === "printing" ? "Printing..." : kitchenPrintStatus === "ok" ? "Sent" : kitchenPrintStatus === "error" ? "Failed" : "Kitchen Only"}
              </button>
            </div>
          </div>
          <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", fontSize: 13, color: t.muted }}>
            <span style={{ fontWeight: 700, color: t.text }}>{formatDateHeader(date)}</span>
            {report && (
              <span style={{
                padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700,
                background: report.source === "archive" ? "rgba(200,169,110,0.15)" : "rgba(122,28,28,0.10)",
                color: report.source === "archive" ? t.gold : t.accent,
              }}>
                {sourceLabel}
              </span>
            )}
          </div>

          <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${t.border}`, display: "flex", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: t.muted, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", alignSelf: "center" }}>
              Print style
            </span>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 11, color: t.muted, fontWeight: 600, letterSpacing: 0.4, textTransform: "uppercase" }}>Font size (pt)</span>
              <input
                type="number"
                min={7}
                max={14}
                step={0.5}
                value={printStyle.fontSize}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) updatePrintStyle({ fontSize: Math.max(7, Math.min(14, v)) });
                }}
                style={{
                  width: 90, padding: "8px 10px", borderRadius: 10, border: `1px solid ${t.border}`,
                  background: t.input, color: t.text, fontSize: 14, fontFamily: "inherit",
                  colorScheme: isDark ? "dark" : "light",
                }}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 11, color: t.muted, fontWeight: 600, letterSpacing: 0.4, textTransform: "uppercase" }}>Font style</span>
              <select
                value={printStyle.fontFamily}
                onChange={(e) => updatePrintStyle({ fontFamily: e.target.value })}
                style={{
                  padding: "8px 10px", borderRadius: 10, border: `1px solid ${t.border}`,
                  background: t.input, color: t.text, fontSize: 14, fontFamily: "inherit",
                  minWidth: 200, colorScheme: isDark ? "dark" : "light",
                }}
              >
                {FONT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 11, color: t.muted, fontWeight: 600, letterSpacing: 0.4, textTransform: "uppercase" }}>Page width (mm)</span>
              <input
                type="number"
                min={58}
                max={112}
                step={1}
                value={printStyle.pageWidth}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) updatePrintStyle({ pageWidth: Math.max(58, Math.min(112, v)) });
                }}
                style={{
                  width: 90, padding: "8px 10px", borderRadius: 10, border: `1px solid ${t.border}`,
                  background: t.input, color: t.text, fontSize: 14, fontFamily: "inherit",
                  colorScheme: isDark ? "dark" : "light",
                }}
              />
            </label>
            <button
              onClick={resetPrintStyle}
              style={{ ...pill, padding: "9px 14px", alignSelf: "flex-end" }}
              title="Reset to default print style"
            >
              <RotateCcw size={14} /> Reset
            </button>
          </div>
        </div>

        {error && (
          <div style={{
            background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.3)",
            borderRadius: 12, padding: 14, color: "#dc2626", marginBottom: 18, fontWeight: 600,
          }}>
            {error}
          </div>
        )}

        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, overflow: "hidden" }}>
          {loading && !report ? (
            <div style={{ padding: 48, textAlign: "center", color: t.muted }}>Loading…</div>
          ) : previewHtml ? (
            <iframe
              title="EOD preview"
              srcDoc={previewHtml}
              style={{ width: "100%", minHeight: 720, border: "none", background: "#fff" }}
            />
          ) : (
            <div style={{ padding: 48, textAlign: "center", color: t.muted }}>
              {error ? "Could not load report." : "Pick a date to view the report."}
            </div>
          )}
        </div>
      </div>

      <WaiterPinModal
        open={pinOpen}
        onClose={() => { pendingModeRef.current = null; setPinOpen(false); }}
        onVerified={onPinVerified}
        t={t}
      />
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
