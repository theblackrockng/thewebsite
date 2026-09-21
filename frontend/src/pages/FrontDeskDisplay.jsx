import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { supabase } from "../lib/supabase";
import { authHeader } from "../lib/staffAuth";
import StaffLoginGate, { useStaffSession } from "../components/StaffLoginGate";
import { UtensilsCrossed, Package, Truck, RefreshCw, LogOut, Sun, Moon, Volume2, VolumeX, Wifi, WifiOff, X } from "lucide-react";

const FRONT_DESK_ROLES = ["front_desk", "manager"];

const ORDERS_API = "/api/front-desk-orders";

const POLL_MS = 15000;
const FLASH_MS = 45000;
const SESSION_CHECK_MS = 120000;
const SESSION_MARGIN_MS = 300000;
const WAKE_GAP_MS = 30000;
const ALERT_REPEAT_MS = 15000;
const REPROBE_MS = 600000;
const ACTIVE_STATUSES = ["new", "confirmed", "preparing", "ready"];

const GOLD = "#c8a96e";
const BURGUNDY = "#7a1c1c";

const THEMES = {
  light: { bg: "#faf8f5", card: "#ffffff", cardHead: "#f3eee6", border: "#e4dccd", text: "#1a1a1a", muted: "#7a6f60", gold: GOLD, accent: BURGUNDY, onGold: "#1a1a1a", input: "#ffffff" },
  dark:  { bg: "#1a1a1a", card: "#242220", cardHead: "#2c2926", border: "#3a352e", text: "#f5f0e8", muted: "#a89a84", gold: GOLD, accent: "#d05a5a", onGold: "#1a1a1a", input: "#2c2926" },
};

const STATUS_CFG = {
  new:       { label: "New",       color: "#d97706" },
  confirmed: { label: "Confirmed", color: "#3b82f6" },
  preparing: { label: "Preparing", color: "#8b5cf6" },
  ready:     { label: "Ready",     color: "#16a34a" },
  completed: { label: "Completed", color: "#6b7280" },
  cancelled: { label: "Cancelled", color: "#dc2626" },
};

const PAYMENT_CFG = {
  awaiting_proof: { label: "Awaiting Proof",  color: "#d97706" },
  proof_received: { label: "Proof Received",  color: "#3b82f6" },
  paid:           { label: "Paid",            color: "#16a34a" },
  pay_on_arrival: { label: "Pay on Arrival",  color: "#d97706" },
  bank_transfer:  { label: "Bank Transfer",   color: "#d97706" },
  pending:        { label: "Pending",         color: "#6b7280" },
  failed:         { label: "Payment Failed",  color: "#dc2626" },
};

const TABS = [
  { key: "all",    label: "All Orders" },
  { key: "table",  label: "Table Orders" },
  { key: "online", label: "Online Orders" },
  { key: "completed", label: "Completed Today" },
];

const STAT_KEYS = ["new", "confirmed", "preparing", "ready", "completed"];

function fmtPrice(n) {
  return `₦${Number(n || 0).toLocaleString("en-NG")}`;
}

function fmtClock(d) {
  return d.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function fmtSeconds(d) {
  return d.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
}

function timeSince(iso, now) {
  if (!iso) return "";
  const m = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h}h ${rem}m ago` : `${h}h ago`;
}

// Lagos is UTC+1 all year with no daylight saving, so midnight there is a fixed offset.
function startOfToday() {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return new Date(`${ymd}T00:00:00+01:00`).getTime();
}

function fmtLagosTime(iso) {
  return new Date(iso).toLocaleTimeString("en-NG", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit", hour12: true });
}

// Orders completed from the console do not set completed_at, so fall back to the
// placed date for those. Without the column at all, use the placed date alone.
function completedTodayFilter(hasColumn) {
  const start = new Date(startOfToday()).toISOString();
  return hasColumn
    ? `completed_at.gte.${start},and(completed_at.is.null,created_at.gte.${start})`
    : `created_at.gte.${start}`;
}

function completionInfo(order) {
  return order.completed_at ? { iso: order.completed_at, known: true } : { iso: order.created_at, known: false };
}

const audio = { ctx: null, muted: false };

function unlockAudio() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return false;
  if (!audio.ctx) audio.ctx = new Ctx();
  audio.ctx.resume();
  return true;
}

function playTones(list) {
  const ctx = audio.ctx;
  if (!ctx || ctx.state !== "running" || audio.muted) return;
  try {
    list.forEach(({ freq, at, len, vol, type }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + at;
      osc.type = type || "sine";
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(vol, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + len);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + len + 0.05);
    });
  } catch {}
}

function playChime() {
  playTones([{ freq: 660, at: 0, len: 0.6, vol: 0.18 }, { freq: 880, at: 0.22, len: 0.6, vol: 0.18 }]);
}

function playAlert() {
  playTones([
    { freq: 880, at: 0, len: 0.3, vol: 0.35, type: "square" },
    { freq: 660, at: 0.4, len: 0.3, vol: 0.35, type: "square" },
    { freq: 880, at: 0.8, len: 0.3, vol: 0.35, type: "square" },
    { freq: 660, at: 1.2, len: 0.3, vol: 0.35, type: "square" },
  ]);
}

// "ok": signed in with a token good for a while. "offline": could not reach the
// auth server, so keep going. "lost": there is no session that can be recovered.
async function ensureSession(force = false) {
  try {
    const { data } = await supabase.auth.getSession();
    const session = data?.session;
    if (session && !force && session.expires_at * 1000 - Date.now() > SESSION_MARGIN_MS) return "ok";
    const { data: refreshed, error } = await supabase.auth.refreshSession();
    if (!error && refreshed?.session) return "ok";
    if (error?.name === "AuthRetryableFetchError") return "offline";
    return "lost";
  } catch {
    return "offline";
  }
}

function isTableOrder(o) {
  return o.order_type === "dine-in";
}

function orderLabel(o) {
  if (isTableOrder(o)) return `Table ${o.table_number}`;
  if (o.order_type === "delivery") return "Delivery";
  return "Pickup";
}

function OrderIcon({ order, color }) {
  const props = { size: 24, style: { color } };
  if (isTableOrder(order)) return <UtensilsCrossed {...props} />;
  if (order.order_type === "delivery") return <Truck {...props} />;
  return <Package {...props} />;
}

export default function FrontDeskDisplay() {
  return (
    <StaffLoginGate
      allowedRoles={FRONT_DESK_ROLES}
      title="Front Desk"
      renderSignedOut={({ onSignIn }) => <SignedOutScreen onSignIn={onSignIn} />}
    >
      <FrontDeskContent />
    </StaffLoginGate>
  );
}

function FrontDeskContent() {
  const { signOut } = useStaffSession();
  const [lost, setLost] = useState(false);
  const handleLost = useCallback(() => setLost(true), []);
  if (lost) return <SignedOutScreen onSignIn={signOut} />;
  return <FrontDeskMain onSessionLost={handleLost} />;
}

function SignedOutScreen({ onSignIn }) {
  useEffect(() => {
    playAlert();
    const id = setInterval(playAlert, ALERT_REPEAT_MS);
    return () => clearInterval(id);
  }, []);

  function handleTap() {
    if (audio.ctx) audio.ctx.resume();
    onSignIn();
  }

  return (
    <button
      onClick={handleTap}
      style={{
        position: "fixed", inset: 0, width: "100%", height: "100%", background: "#b91c1c", color: "#ffffff",
        border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", gap: 24, padding: 32, textAlign: "center", fontFamily: "'DM Sans', 'Montserrat', sans-serif",
      }}
    >
      <span style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.1 }}>Signed out. Tap to sign in</span>
      <span style={{ fontSize: 28, fontWeight: 600 }}>New orders are not updating on this screen.</span>
    </button>
  );
}

function FrontDeskMain({ onSessionLost }) {
  const [isDark, setIsDark] = useState(() => {
    try { return localStorage.getItem("blackrock-frontdesk-theme") === "dark"; } catch { return false; }
  });
  const t = THEMES[isDark ? "dark" : "light"];

  const [orders, setOrders] = useState([]);
  const [completedOrders, setCompletedOrders] = useState([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [completedLoaded, setCompletedLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [connected, setConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const [flashIds, setFlashIds] = useState(() => new Set());
  const [actionIds, setActionIds] = useState(() => new Set());
  const [actionError, setActionError] = useState("");
  const [audioReady, setAudioReady] = useState(() => !!audio.ctx);
  const [muted, setMuted] = useState(() => audio.muted);

  const knownIdsRef = useRef(null);
  const mountedRef = useRef(true);
  const inFlightRef = useRef(false);
  const pendingRef = useRef(false);
  const tabRef = useRef(tab);
  const ordersRef = useRef(orders);
  const completedIdsRef = useRef(new Set());
  const hasColRef = useRef(null);
  const probedAtRef = useRef(0);
  const channelRef = useRef(null);
  const lostRef = useRef(onSessionLost);
  tabRef.current = tab;
  ordersRef.current = orders;
  lostRef.current = onSessionLost;

  const checkSession = useCallback(async () => {
    if ((await ensureSession()) === "lost" && mountedRef.current) lostRef.current();
  }, []);

  function toggleTheme() {
    setIsDark((prev) => {
      const next = !prev;
      try { localStorage.setItem("blackrock-frontdesk-theme", next ? "dark" : "light"); } catch {}
      return next;
    });
  }

  function toggleMuted() {
    audio.muted = !audio.muted;
    setMuted(audio.muted);
  }

  function enableSound() {
    if (unlockAudio()) {
      setAudioReady(true);
      playChime();
    }
  }

  const fetchOrders = useCallback(async () => {
    if (inFlightRef.current) { pendingRef.current = true; return; }
    inFlightRef.current = true;
    try {
      if (hasColRef.current === null || (hasColRef.current === false && Date.now() - probedAtRef.current > REPROBE_MS)) {
        const { error: probeErr } = await supabase.from("orders").select("completed_at").limit(1);
        probedAtRef.current = Date.now();
        if (!probeErr) hasColRef.current = true;
        else if (probeErr.code === "42703" || /completed_at/i.test(probeErr.message || "")) hasColRef.current = false;
      }
      const hasCol = hasColRef.current === true;

      const startISO = new Date(startOfToday()).toISOString();
      const doneFilter = completedTodayFilter(hasCol);
      const wantList = tabRef.current === "completed";

      const activeReq = supabase
        .from("orders")
        .select("*, order_items(*)")
        .neq("order_status", "completed")
        .or(`created_at.gte.${startISO},order_status.in.(${ACTIVE_STATUSES.join(",")})`)
        .order("created_at", { ascending: false })
        .limit(300);

      const countReq = supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("order_status", "completed")
        .or(doneFilter);

      const listReq = wantList
        ? supabase
            .from("orders")
            .select("*, order_items(*)")
            .eq("order_status", "completed")
            .or(doneFilter)
            .order("created_at", { ascending: false })
            .limit(200)
        : Promise.resolve(null);

      const [{ data, error }, countRes, listRes] = await Promise.all([activeReq, countReq, listReq]);

      if (!mountedRef.current) return;
      if (error) {
        if (error.code === "PGRST301" || /jwt|token/i.test(error.message || "")) checkSession();
        setLoading(false);
        return;
      }

      const list = (data || []).filter((o) => !completedIdsRef.current.has(o.id));
      setOrders(list);
      setLoading(false);
      setLastUpdated(new Date());

      if (countRes && !countRes.error && countRes.count !== null) setCompletedCount(countRes.count);
      if (listRes && !listRes.error) {
        setCompletedOrders(listRes.data || []);
        setCompletedLoaded(true);
      }

      const ids = new Set(list.map((o) => o.id));
      if (knownIdsRef.current) {
        const arrivals = [...ids].filter((id) => !knownIdsRef.current.has(id));
        if (arrivals.length > 0) {
          setFlashIds((prev) => new Set([...prev, ...arrivals]));
          playChime();
          setTimeout(() => {
            if (!mountedRef.current) return;
            setFlashIds((prev) => {
              const n = new Set(prev);
              arrivals.forEach((id) => n.delete(id));
              return n;
            });
          }, FLASH_MS);
        }
      }
      knownIdsRef.current = ids;
    } finally {
      inFlightRef.current = false;
      if (pendingRef.current && mountedRef.current) {
        pendingRef.current = false;
        fetchOrders();
      }
    }
  }, [checkSession]);

  const subscribe = useCallback(() => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    const channel = supabase
      .channel(`frontdesk-orders-${Date.now()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        fetchOrders();
      })
      .subscribe((status) => {
        if (!mountedRef.current || channelRef.current !== channel) return;
        setConnected(status === "SUBSCRIBED");
      });
    channelRef.current = channel;
  }, [fetchOrders]);

  useEffect(() => {
    mountedRef.current = true;
    fetchOrders();
    subscribe();

    return () => {
      mountedRef.current = false;
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    };
  }, [fetchOrders, subscribe]);

  // The client pushes a refreshed token to joined Realtime channels by itself.
  // This only steps in if the channel did not come back, then reconciles.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "TOKEN_REFRESHED") return;
      setTimeout(() => {
        if (!mountedRef.current) return;
        if (channelRef.current && channelRef.current.state !== "joined") subscribe();
        fetchOrders();
      }, 2000);
    });
    return () => subscription.unsubscribe();
  }, [subscribe, fetchOrders]);

  useEffect(() => {
    checkSession();
    const checkId = setInterval(checkSession, SESSION_CHECK_MS);
    let last = Date.now();
    const driftId = setInterval(() => {
      const n = Date.now();
      if (n - last > WAKE_GAP_MS) { checkSession(); fetchOrders(); }
      last = n;
    }, 5000);
    const onVisible = () => { if (document.visibilityState === "visible") checkSession(); };
    const onOnline = () => { checkSession(); fetchOrders(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    return () => {
      clearInterval(checkId);
      clearInterval(driftId);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    };
  }, [checkSession, fetchOrders]);

  useEffect(() => {
    if (tab === "completed") fetchOrders();
  }, [tab, fetchOrders]);

  useEffect(() => {
    if (connected) return undefined;
    let misses = 0;
    const id = setInterval(() => {
      fetchOrders();
      misses += 1;
      if (misses % 4 === 0) subscribe();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [connected, fetchOrders, subscribe]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let sentinel = null;
    let cancelled = false;

    async function acquire() {
      try {
        if (!("wakeLock" in navigator) || document.visibilityState !== "visible") return;
        const lock = await navigator.wakeLock.request("screen");
        if (cancelled) { lock.release().catch(() => {}); return; }
        sentinel = lock;
      } catch {}
    }

    function onVisible() {
      if (document.visibilityState === "visible") {
        fetchOrders();
        acquire();
      }
    }

    acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      if (sentinel) sentinel.release().catch(() => {});
    };
  }, [fetchOrders]);

  async function sendPatch(orderId, fields) {
    return fetch(ORDERS_API, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify({ id: orderId, ...fields }),
    });
  }

  async function patchOrder(orderId, fields, actionLabel) {
    setActionError("");
    setActionIds((prev) => new Set([...prev, orderId]));
    try {
      if ((await ensureSession()) === "lost") { onSessionLost(); return; }

      let res = await sendPatch(orderId, fields);
      if (res.status === 401) {
        const recovered = await ensureSession(true);
        if (recovered === "lost") { onSessionLost(); return; }
        if (recovered === "offline") {
          setActionError(`${actionLabel} failed. HTTP 401 and the sign-in could not be refreshed because the network is down. Try again.`);
          return;
        }
        res = await sendPatch(orderId, fields);
        if (res.status === 401) { onSessionLost(); return; }
      }

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setActionError(`${actionLabel} failed. HTTP ${res.status}: ${json.error || res.statusText || "No message from the server."}`);
        return;
      }

      if (fields.order_status === "completed") {
        const moved = ordersRef.current.find((o) => o.id === orderId);
        completedIdsRef.current.add(orderId);
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
        if (moved) {
          const done = { ...moved, order_status: "completed", ...(hasColRef.current ? { completed_at: new Date().toISOString() } : {}) };
          setCompletedOrders((prev) => (prev.some((o) => o.id === orderId) ? prev : [done, ...prev]));
        }
        setCompletedCount((c) => c + 1);
      } else {
        const apply = (prev) => prev.map((o) => (o.id === orderId ? { ...o, ...fields } : o));
        setOrders(apply);
        setCompletedOrders(apply);
      }
    } catch (err) {
      setActionError(`${actionLabel} failed. Network error: ${err?.message || "could not reach the server."}`);
    } finally {
      setActionIds((prev) => { const n = new Set(prev); n.delete(orderId); return n; });
    }
  }

  const confirmOrder = (id) => patchOrder(id, { order_status: "confirmed" }, "Confirm");
  const completeOrder = (id) => patchOrder(id, { order_status: "completed" }, "Mark Completed");
  const setPayment = (id, payment_status) => patchOrder(id, { payment_status }, payment_status === "paid" ? "Mark Paid" : "Proof Received");

  const counts = useMemo(() => {
    const c = { new: 0, confirmed: 0, preparing: 0, ready: 0, completed: completedCount };
    orders.forEach((o) => {
      if (c[o.order_status] !== undefined && o.order_status !== "completed") c[o.order_status] += 1;
    });
    return c;
  }, [orders, completedCount]);

  const tabCounts = useMemo(() => ({
    all: orders.length,
    table: orders.filter(isTableOrder).length,
    online: orders.filter((o) => !isTableOrder(o)).length,
    completed: completedCount,
  }), [orders, completedCount]);

  const isCompletedTab = tab === "completed";

  const visible = useMemo(() => {
    if (isCompletedTab) {
      return completedOrders
        .map((o) => ({ order: o, info: completionInfo(o) }))
        .sort((a, b) => new Date(b.info.iso) - new Date(a.info.iso));
    }
    return orders
      .filter((o) => (tab === "table" ? isTableOrder(o) : tab === "online" ? !isTableOrder(o) : true))
      .map((o) => ({ order: o, info: null }));
  }, [isCompletedTab, completedOrders, orders, tab]);

  const pill = {
    background: t.card, border: `1px solid ${t.border}`, borderRadius: 10, padding: "10px 16px",
    color: t.muted, cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
    fontSize: 15, fontWeight: 600, fontFamily: "inherit",
  };

  return (
    <div style={{ minHeight: "100vh", background: t.bg, color: t.text, padding: "24px 32px", fontFamily: "'DM Sans', 'Montserrat', sans-serif" }}>
      <style>{`
        @keyframes fd-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(200,169,110,0.65); }
          50%      { box-shadow: 0 0 0 12px rgba(200,169,110,0); }
        }
        .fd-flash { animation: fd-pulse 1.4s ease-in-out infinite; }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, paddingBottom: 20, borderBottom: `1px solid ${t.border}` }}>
        <div>
          <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 30, fontWeight: 700, color: t.gold, letterSpacing: "4px", textTransform: "uppercase", lineHeight: 1 }}>BLACKROCK</div>
          <div style={{ fontSize: 15, color: t.muted, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700, marginTop: 6 }}>Front Desk Orders</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div
            title={connected ? "Live updates connected" : "Live updates lost, checking every 15 seconds"}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 10, border: `1px solid ${connected ? "#16a34a" : t.accent}`, color: connected ? "#16a34a" : t.accent, fontSize: 15, fontWeight: 700 }}
          >
            {connected ? <Wifi size={18} /> : <WifiOff size={18} />}
            {connected ? "Connected" : "Reconnecting"}
          </div>

          <div style={{ fontSize: 15, color: t.muted, fontVariantNumeric: "tabular-nums" }}>
            Last updated {lastUpdated ? fmtSeconds(lastUpdated) : "..."}
          </div>

          <button onClick={fetchOrders} style={pill}><RefreshCw size={18} /> Refresh</button>

          {!audioReady ? (
            <button onClick={enableSound} style={{ ...pill, background: t.gold, color: t.onGold, border: `1px solid ${t.gold}` }}>
              <Volume2 size={18} /> Enable sound
            </button>
          ) : (
            <button onClick={toggleMuted} style={{ ...pill, color: muted ? t.accent : t.text }}>
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />} {muted ? "Sound muted" : "Sound on"}
            </button>
          )}

          <button onClick={toggleTheme} style={pill} aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}>
            {isDark ? <Sun size={18} /> : <Moon size={18} />} {isDark ? "Light" : "Dark"}
          </button>

          <div style={{ fontSize: 20, fontWeight: 700, color: t.text, fontVariantNumeric: "tabular-nums" }}>{fmtClock(new Date(now))}</div>
          <SignOutButton pill={pill} />
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 16, margin: "24px 0" }}>
        {STAT_KEYS.map((key) => {
          const opensTab = key === "completed";
          return (
            <div
              key={key}
              role={opensTab ? "button" : undefined}
              tabIndex={opensTab ? 0 : undefined}
              onClick={opensTab ? () => setTab("completed") : undefined}
              onKeyDown={opensTab ? (e) => { if (e.key === "Enter" || e.key === " ") setTab("completed"); } : undefined}
              style={{
                background: t.card, borderTop: `5px solid ${STATUS_CFG[key].color}`, borderRadius: 12, padding: "16px 20px",
                border: `1px solid ${opensTab && isCompletedTab ? t.gold : t.border}`, borderTopWidth: 5, borderTopColor: STATUS_CFG[key].color,
                cursor: opensTab ? "pointer" : "default",
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: t.muted }}>
                {STATUS_CFG[key].label}{opensTab ? " Today" : ""}
              </div>
              <div style={{ fontSize: 48, fontWeight: 800, color: STATUS_CFG[key].color, lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>{counts[key]}</div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        {TABS.map((tb) => {
          const active = tab === tb.key;
          return (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              style={{
                padding: "14px 26px", borderRadius: 10, fontSize: 18, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                background: active ? t.gold : t.card, color: active ? t.onGold : t.muted,
                border: `1px solid ${active ? t.gold : t.border}`,
              }}
            >
              {tb.label} <span style={{ opacity: 0.75, marginLeft: 6 }}>{tabCounts[tb.key]}</span>
            </button>
          );
        })}
      </div>

      {actionError && (
        <div
          role="alert"
          style={{
            position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000,
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
            padding: "18px 32px", background: BURGUNDY, color: "#ffffff",
            fontSize: 20, fontWeight: 700, boxShadow: "0 4px 18px rgba(0,0,0,0.35)",
          }}
        >
          <span>{actionError}</span>
          <button
            onClick={() => setActionError("")}
            aria-label="Dismiss error"
            style={{ background: "transparent", border: "2px solid #ffffff", borderRadius: 8, color: "#ffffff", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: 16, fontWeight: 700, fontFamily: "inherit", flexShrink: 0 }}
          >
            <X size={18} /> Dismiss
          </button>
        </div>
      )}

      {/* Order list */}
      {loading || (isCompletedTab && !completedLoaded) ? (
        <div style={{ textAlign: "center", color: t.muted, padding: "80px 0", fontSize: 20 }}>Loading orders...</div>
      ) : visible.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <UtensilsCrossed size={56} style={{ color: t.border, marginBottom: 16 }} />
          <p style={{ color: t.muted, fontSize: 20, margin: 0 }}>{isCompletedTab ? "No completed orders today" : "No orders to show"}</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(440px, 1fr))", gap: 20 }}>
          {visible.map(({ order, info }) => (
            <OrderCard
              key={order.id}
              order={order}
              t={t}
              now={now}
              completion={info}
              flashing={!isCompletedTab && flashIds.has(order.id)}
              busy={actionIds.has(order.id)}
              onConfirm={confirmOrder}
              onComplete={completeOrder}
              onPayment={setPayment}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Badge({ cfg }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", borderRadius: 99, padding: "5px 14px",
      fontSize: 15, fontWeight: 700, color: cfg.color, border: `1.5px solid ${cfg.color}`, background: "transparent",
      whiteSpace: "nowrap",
    }}>
      {cfg.label}
    </span>
  );
}

function OrderCard({ order, t, now, completion, flashing, busy, onConfirm, onComplete, onPayment }) {
  const statusCfg = STATUS_CFG[order.order_status] ?? { label: order.order_status, color: "#6b7280" };
  const payCfg = PAYMENT_CFG[order.payment_status] ?? { label: order.payment_status || "Unknown", color: "#6b7280" };
  const items = order.order_items || [];
  const inCompletedTab = !!completion;
  const cancelled = order.order_status === "cancelled";
  const canConfirm = !inCompletedTab && order.order_status === "new";
  const canComplete = !inCompletedTab && order.order_status === "ready";
  const isPaid = order.payment_status === "paid";
  const canMarkPaid = !isPaid && !cancelled && (inCompletedTab || order.payment_status !== "failed");
  const canProof = !inCompletedTab && order.payment_status === "awaiting_proof" && !cancelled;
  const timeLine = inCompletedTab
    ? (completion.known ? `Completed ${fmtLagosTime(completion.iso)}` : `Placed ${fmtLagosTime(order.created_at)}`)
    : timeSince(order.created_at, now);

  const actionBtn = (bg, color) => ({
    flex: 1, minWidth: 140, padding: "16px 20px", borderRadius: 10, border: "none",
    background: bg, color, fontSize: 18, fontWeight: 800, cursor: busy ? "not-allowed" : "pointer",
    opacity: busy ? 0.6 : 1, fontFamily: "inherit", letterSpacing: "0.02em",
  });

  return (
    <div
      className={flashing ? "fd-flash" : undefined}
      style={{
        background: t.card, borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column",
        border: `2px solid ${flashing ? t.gold : t.border}`, opacity: cancelled ? 0.72 : 1,
      }}
    >
      <div style={{ background: t.cardHead, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, borderBottom: `1px solid ${t.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
          <OrderIcon order={order} color={t.gold} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: t.text, lineHeight: 1.1 }}>{orderLabel(order)}</div>
            <div style={{ fontSize: 16, color: t.muted, marginTop: 2 }}>
              {order.order_number || order.id.slice(0, 8)}
              {order.guest_name ? ` · ${order.guest_name}` : ""}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {flashing && (
              <span style={{ background: t.gold, color: t.onGold, borderRadius: 99, padding: "5px 12px", fontSize: 14, fontWeight: 800, letterSpacing: "0.08em" }}>NEW ORDER</span>
            )}
            <Badge cfg={statusCfg} />
          </div>
          <span style={{ fontSize: 16, color: t.muted, fontWeight: 600 }}>{timeLine}</span>
        </div>
      </div>

      <div style={{ padding: "16px 20px", flex: 1 }}>
        {items.length === 0 ? (
          <div style={{ fontSize: 17, color: t.muted }}>No items recorded</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {items.map((item, idx) => (
              <div key={item.id || idx} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 19, color: t.text }}>
                <div style={{ fontWeight: 600 }}>
                  <span style={{ display: "inline-block", minWidth: 40, color: t.gold, fontWeight: 800 }}>{item.qty}×</span>
                  {item.item_name}
                </div>
                <div style={{ color: t.muted, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{fmtPrice(item.line_total)}</div>
              </div>
            ))}
          </div>
        )}
        {order.special_instructions && (
          <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 8, border: `1px solid ${t.accent}`, color: t.accent, fontSize: 16, fontStyle: "italic" }}>
            Note: {order.special_instructions}
          </div>
        )}
      </div>

      <div style={{ padding: "14px 20px", borderTop: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontSize: 30, fontWeight: 800, color: t.text, fontVariantNumeric: "tabular-nums" }}>{fmtPrice(order.total)}</div>
        <Badge cfg={payCfg} />
      </div>

      {(canConfirm || canComplete || canMarkPaid || canProof) && (
        <div style={{ padding: "0 20px 18px", display: "flex", gap: 10, flexWrap: "wrap" }}>
          {canConfirm && (
            <button disabled={busy} onClick={() => onConfirm(order.id)} style={actionBtn(t.gold, t.onGold)}>
              {busy ? "Updating..." : "Confirm"}
            </button>
          )}
          {canComplete && (
            <button disabled={busy} onClick={() => onComplete(order.id)} style={actionBtn("#16a34a", "#ffffff")}>
              {busy ? "Updating..." : "Mark Completed"}
            </button>
          )}
          {canProof && (
            <button disabled={busy} onClick={() => onPayment(order.id, "proof_received")} style={{ ...actionBtn("transparent", t.text), border: `2px solid ${t.border}` }}>
              Proof Received
            </button>
          )}
          {canMarkPaid && (
            <button disabled={busy} onClick={() => onPayment(order.id, "paid")} style={{ ...actionBtn("transparent", t.accent), border: `2px solid ${t.accent}` }}>
              Mark Paid
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function SignOutButton({ pill }) {
  const { signOut } = useStaffSession();
  return (
    <button onClick={signOut} style={pill}>
      <LogOut size={18} /> Sign Out
    </button>
  );
}
