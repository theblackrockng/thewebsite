import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { authHeader } from "../lib/staffAuth";
import StaffLoginGate, { useStaffSession } from "../components/StaffLoginGate";
import { UtensilsCrossed, Package, Truck, RefreshCw, LogOut, Wifi, WifiOff, X } from "lucide-react";

const KITCHEN_ROLES = ["kitchen"];

const ACTIVE_STATUSES = ["new", "confirmed", "preparing"];

const POLL_MS     = 15_000;
const WAKE_GAP_MS = 30_000;

const STATUS_CFG = {
  new:       { label: "New",       bg: "rgba(245,158,11,0.15)", color: "#d97706", border: "rgba(245,158,11,0.3)" },
  confirmed: { label: "Confirmed", bg: "rgba(59,130,246,0.15)",  color: "#60a5fa", border: "rgba(59,130,246,0.3)" },
  preparing: { label: "Preparing", bg: "rgba(139,92,246,0.15)",  color: "#a78bfa", border: "rgba(139,92,246,0.3)" },
};

function fmtPrice(n) {
  return `₦${Number(n || 0).toLocaleString("en-NG")}`;
}

function timeAgo(iso) {
  if (!iso) return "";
  const m = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

function orderLabel(order) {
  if (order.order_type === "dine-in") return `Table ${order.table_number}`;
  if (order.order_type === "delivery") return "Delivery";
  return "Pickup";
}

function orderIcon(order) {
  if (order.order_type === "dine-in") return <UtensilsCrossed size={16} style={{ color: "#c8a96e" }} />;
  if (order.order_type === "delivery") return <Truck size={16} style={{ color: "#60a5fa" }} />;
  return <Package size={16} style={{ color: "#c8a96e" }} />;
}

const alertAudio = { ctx: null };

function unlockAlertAudio() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  if (!alertAudio.ctx) alertAudio.ctx = new Ctx();
  if (alertAudio.ctx.state === "suspended") alertAudio.ctx.resume().catch(() => {});
}

function playAlertTone() {
  const ctx = alertAudio.ctx;
  if (!ctx || ctx.state !== "running") return;
  try {
    [[880, 0, 0.42], [660, 0.2, 0.42]].forEach(([freq, at, len]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const s = ctx.currentTime + at;
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, s);
      gain.gain.setValueAtTime(0.0001, s);
      gain.gain.exponentialRampToValueAtTime(0.32, s + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, s + len);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(s); osc.stop(s + len + 0.05);
    });
  } catch {}
}

export default function KitchenDisplay() {
  return (
    <StaffLoginGate allowedRoles={KITCHEN_ROLES} title="Kitchen" disableIdleLock>
      <KitchenContent />
    </StaffLoginGate>
  );
}

function KitchenContent() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionIds, setActionIds] = useState(new Set());
  const [connected, setConnected] = useState(false);
  const [actionError, setActionError] = useState("");
  const [audioReady, setAudioReady] = useState(false);
  const [alertBanner, setAlertBanner] = useState(null);
  const knownIdsRef    = useRef(new Set());
  const mountedRef     = useRef(true);
  const channelRef     = useRef(null);
  const alertLoopRef   = useRef(null);
  const inFlightIdsRef = useRef(new Set());

  function stopAlertLoop() {
    if (alertLoopRef.current) { clearInterval(alertLoopRef.current); alertLoopRef.current = null; }
    setAlertBanner(null);
  }

  const fetchOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .in("order_status", ACTIVE_STATUSES)
      .order("created_at", { ascending: true });

    if (!mountedRef.current) return;
    if (error) { setLoading(false); return; }

    const foodOrders = (data || [])
      .map((o) => ({
        ...o,
        displayItems: (o.order_items || []).filter((i) => i.category !== "drink"),
      }))
      .filter((o) => o.displayItems.length > 0);

    // Preserve optimistic state for in-flight updates (prevent Realtime echo revert)
    setOrders((prev) => {
      const merged = foodOrders
        .filter((o) => !inFlightIdsRef.current.has(o.id) || prev.some((p) => p.id === o.id))
        .map((o) => (inFlightIdsRef.current.has(o.id) ? prev.find((p) => p.id === o.id) || o : o));
      return merged;
    });
    setLoading(false);

    const newIds = new Set(foodOrders.map((o) => o.id));
    const arrivals = [...newIds].filter((id) => !knownIdsRef.current.has(id));
    if (arrivals.length > 0 && knownIdsRef.current.size > 0) {
      const first = foodOrders.find((o) => arrivals.includes(o.id));
      const label = first
        ? `New order${arrivals.length > 1 ? "s" : ""}, ${orderLabel(first)}${arrivals.length > 1 ? ` +${arrivals.length - 1} more` : ""}`
        : `${arrivals.length} new order${arrivals.length !== 1 ? "s" : ""}`;
      setAlertBanner((prev) => (prev ? { label, count: arrivals.length + (prev.count || 0) } : { label, count: arrivals.length }));
      if (!alertLoopRef.current) {
        unlockAlertAudio();
        playAlertTone();
        setAudioReady(alertAudio.ctx?.state === "running");
        let elapsed = 0;
        alertLoopRef.current = setInterval(() => {
          elapsed += 2000;
          if (elapsed >= 30000) {
            clearInterval(alertLoopRef.current); alertLoopRef.current = null;
            setAlertBanner(null);
            return;
          }
          unlockAlertAudio();
          playAlertTone();
        }, 2000);
      }
    }
    knownIdsRef.current = newIds;
  }, []);

  const subscribe = useCallback(() => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    const ch = supabase
      .channel(`kitchen-orders-watch-${Date.now()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        fetchOrders();
      })
      .subscribe((status) => {
        if (!mountedRef.current) return;
        setConnected(status === "SUBSCRIBED");
      });
    channelRef.current = ch;
  }, [fetchOrders]);

  // Mount: initial fetch + subscribe
  useEffect(() => {
    mountedRef.current = true;
    fetchOrders();
    subscribe();
    return () => {
      mountedRef.current = false;
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [fetchOrders, subscribe]);

  // Polling fallback when Realtime is disconnected
  useEffect(() => {
    if (connected) return;
    let misses = 0;
    const id = setInterval(() => {
      fetchOrders();
      misses++;
      if (misses % 4 === 0) subscribe();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [connected, fetchOrders, subscribe]);

  // Visibility, online, and wake-from-sleep recovery
  useEffect(() => {
    let last = Date.now();
    const driftId = setInterval(() => {
      const now = Date.now();
      if (now - last > WAKE_GAP_MS) {
        fetchOrders();
        if (channelRef.current?.state !== "joined") subscribe();
      }
      last = now;
    }, 5_000);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        fetchOrders();
        if (channelRef.current?.state !== "joined") subscribe();
      }
    };
    const onOnline = () => { fetchOrders(); subscribe(); };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    return () => {
      clearInterval(driftId);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    };
  }, [fetchOrders, subscribe]);

  // Resubscribe after JWT token refresh
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "TOKEN_REFRESHED") return;
      setTimeout(() => {
        if (!mountedRef.current) return;
        if (channelRef.current?.state !== "joined") subscribe();
        fetchOrders();
      }, 2_000);
    });
    return () => subscription.unsubscribe();
  }, [subscribe, fetchOrders]);

  // Screen wake lock
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
    function onVisible() { if (document.visibilityState === "visible") acquire(); }
    acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => { cancelled = true; document.removeEventListener("visibilitychange", onVisible); if (sentinel) sentinel.release().catch(() => {}); };
  }, []);

  // Resume AudioContext on visibility/focus so alerts work after tab switch
  useEffect(() => {
    function resume() { if (alertAudio.ctx?.state === "suspended") alertAudio.ctx.resume().catch(() => {}); }
    const onVis = () => { if (document.visibilityState === "visible") resume(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", resume);
    return () => { document.removeEventListener("visibilitychange", onVis); window.removeEventListener("focus", resume); };
  }, []);

  async function updateStatus(orderId, newStatus) {
    const snapshot = orders.find((o) => o.id === orderId);
    // Optimistic update
    if (newStatus === "ready") {
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      knownIdsRef.current.delete(orderId);
    } else {
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, order_status: newStatus } : o));
    }
    setActionIds((prev) => new Set([...prev, orderId]));
    inFlightIdsRef.current.add(orderId);
    const t0 = Date.now();
    try {
      const res = await fetch("/api/kitchen-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ orderId, status: newStatus }),
      });
      console.log(`[kitchen-status] ${newStatus} ${orderId}: ${Date.now() - t0}ms HTTP ${res.status}`);
      if (!res.ok) {
        // Roll back
        if (newStatus === "ready" && snapshot) {
          setOrders((prev) => [...prev, snapshot].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)));
          knownIdsRef.current.add(orderId);
        } else if (snapshot) {
          setOrders((prev) => prev.map((o) => o.id === orderId ? snapshot : o));
        }
        setActionError(`Update failed (HTTP ${res.status}). Order restored.`);
        setTimeout(() => setActionError(""), 5000);
      }
    } catch (err) {
      console.log(`[kitchen-status] ${newStatus} ${orderId}: ${Date.now() - t0}ms network error`);
      if (newStatus === "ready" && snapshot) {
        setOrders((prev) => [...prev, snapshot].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)));
        knownIdsRef.current.add(orderId);
      } else if (snapshot) {
        setOrders((prev) => prev.map((o) => o.id === orderId ? snapshot : o));
      }
      setActionError(`Update failed: network error. Order restored.`);
      setTimeout(() => setActionError(""), 5000);
    } finally {
      setActionIds((prev) => { const n = new Set(prev); n.delete(orderId); return n; });
      inFlightIdsRef.current.delete(orderId);
    }
  }

  return (
    <div onClick={() => { unlockAlertAudio(); setAudioReady(alertAudio.ctx?.state === "running"); }} style={{ minHeight: "100vh", background: "#0f0d0a", padding: "20px 24px", fontFamily: "'DM Sans', 'Montserrat', sans-serif" }}>
      {/* Alert banner */}
      {alertBanner && (
        <div
          onClick={stopAlertLoop}
          style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 999, background: "#d97706", color: "#fff", padding: "13px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", fontWeight: 700, fontSize: 15, fontFamily: "inherit" }}
        >
          <span>{alertBanner.count > 1 ? `${alertBanner.count} new orders` : alertBanner.label}. Tap to silence</span>
          <X size={18} />
        </div>
      )}
      {/* Sound-off warning */}
      {!audioReady && (
        <div
          onClick={() => { unlockAlertAudio(); setAudioReady(alertAudio.ctx?.state === "running"); }}
          style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 998, background: "rgba(15,13,10,0.94)", color: "#d97706", padding: "10px 20px", textAlign: "center", cursor: "pointer", fontSize: 12, fontWeight: 600, borderTop: "1px solid #2e2820", fontFamily: "inherit" }}
        >
          Sound is off. Tap anywhere to enable alert sounds.
        </div>
      )}
      {/* Action error */}
      {actionError && (
        <div style={{ position: "fixed", bottom: audioReady ? 0 : 44, left: 0, right: 0, zIndex: 997, background: "rgba(239,68,68,0.92)", color: "#fff", padding: "10px 20px", textAlign: "center", fontSize: 13, fontWeight: 600, fontFamily: "inherit" }}>
          {actionError}
        </div>
      )}
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, borderBottom: "1px solid #2e2820", paddingBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <UtensilsCrossed size={22} style={{ color: "#c8a96e" }} />
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 20, fontWeight: 700, color: "#c8a96e", letterSpacing: "3px", textTransform: "uppercase" }}>BLACKROCK</div>
            <div style={{ fontSize: 12, color: "#9C8E7A", letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 600 }}>Kitchen Display</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            title={connected ? "Live updates connected" : "Live updates lost — polling every 15 s"}
            style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: connected ? "#22c55e" : "#d97706" }}
          >
            {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span>{connected ? "Live" : "Reconnecting"}</span>
          </div>
          <span style={{ fontSize: 13, color: "#9C8E7A" }}>
            {orders.length > 0 ? `${orders.length} active order${orders.length !== 1 ? "s" : ""}` : "No active orders"}
          </span>
          <button
            onClick={fetchOrders}
            style={{ background: "#1a1612", border: "1px solid #2e2820", borderRadius: 7, padding: "7px 12px", color: "#9C8E7A", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}
          >
            <RefreshCw size={13} /> Refresh
          </button>
          <div style={{ fontSize: 13, color: "#9C8E7A", fontVariantNumeric: "tabular-nums" }}>
            <LiveClock />
          </div>
          <SignOutButton />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: "center", color: "#9C8E7A", padding: "80px 0", fontSize: 15 }}>Loading orders…</div>
      ) : orders.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <UtensilsCrossed size={48} style={{ color: "#2e2820", marginBottom: 16 }} />
          <p style={{ color: "#9C8E7A", fontSize: 16, margin: 0 }}>No food orders in queue</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              loading={actionIds.has(order.id)}
              onStatusUpdate={updateStatus}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderCard({ order, loading, onStatusUpdate }) {
  const cfg = STATUS_CFG[order.order_status] ?? STATUS_CFG.new;
  const isNew = order.order_status === "new" || order.order_status === "confirmed";
  const nextStatus = isNew ? "preparing" : "ready";
  const nextLabel = isNew ? "Start Preparing" : "Mark Ready";

  return (
    <div style={{
      background: "#1a1612",
      border: `2px solid ${order.order_status === "preparing" ? "#8b5cf6" : "#2e2820"}`,
      borderRadius: 12,
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Card header */}
      <div style={{ background: "#221e1b", padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #2e2820" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {orderIcon(order)}
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#F5F0E8" }}>{orderLabel(order)}</div>
            <div style={{ fontSize: 11, color: "#9C8E7A" }}>{order.order_number}</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          <span style={{ display: "inline-flex", background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, borderRadius: 99, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>
            {cfg.label}
          </span>
          <span style={{ fontSize: 11, color: "#9C8E7A" }}>{timeAgo(order.created_at)}</span>
        </div>
      </div>

      {/* Items */}
      <div style={{ padding: "14px 18px", flex: 1 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {order.displayItems.map((item, idx) => (
            <div key={item.id || idx} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#F5F0E8", flex: 1 }}>
                <span style={{ display: "inline-block", minWidth: 28, color: "#c8a96e", fontWeight: 700 }}>{item.qty}×</span>
                {item.item_name}
                {item.modifiers && (
                  <div style={{ fontSize: 12, color: "#c8a96e", fontWeight: 500, marginTop: 2, marginLeft: 28 }}>{item.modifiers}</div>
                )}
              </div>
            </div>
          ))}
        </div>
        {order.special_instructions && (
          <div style={{ marginTop: 12, padding: "8px 12px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 6 }}>
            <p style={{ margin: 0, fontSize: 12, color: "#d97706", lineHeight: 1.5, fontStyle: "italic" }}>
              Note: {order.special_instructions}
            </p>
          </div>
        )}
      </div>

      {/* Action */}
      <div style={{ padding: "12px 18px", borderTop: "1px solid #2e2820" }}>
        <button
          onClick={() => onStatusUpdate(order.id, nextStatus)}
          disabled={loading}
          style={{
            width: "100%",
            padding: "14px 20px",
            borderRadius: 8,
            border: "none",
            background: nextStatus === "ready" ? "#22c55e" : "#c8a96e",
            color: nextStatus === "ready" ? "#fff" : "#0f0d0a",
            fontSize: 14,
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
            letterSpacing: "0.04em",
            fontFamily: "inherit",
          }}
        >
          {loading ? "Updating…" : nextLabel}
        </button>
      </div>
    </div>
  );
}

function SignOutButton() {
  const { signOut } = useStaffSession();
  return (
    <button
      onClick={signOut}
      style={{ background: "#1a1612", border: "1px solid #2e2820", borderRadius: 7, padding: "7px 12px", color: "#9C8E7A", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}
    >
      <LogOut size={13} /> Sign Out
    </button>
  );
}

function LiveClock() {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit", hour12: true }));
  useEffect(() => {
    const t = setInterval(() => setTime(new Date().toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit", hour12: true })), 10000);
    return () => clearInterval(t);
  }, []);
  return time;
}
