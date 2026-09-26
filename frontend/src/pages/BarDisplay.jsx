import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { authHeader } from "../lib/staffAuth";
import StaffLoginGate, { useStaffSession } from "../components/StaffLoginGate";
import { Wine, UtensilsCrossed, Package, Truck, RefreshCw, LogOut, Wifi, WifiOff } from "lucide-react";

const BAR_ROLES = ["bar"];

const ACTIVE_STATUSES = ["new", "confirmed", "preparing"];

const POLL_MS             = 15_000;
const WAKE_GAP_MS         = 30_000;
const CALL_ALERT_REPEAT_MS = 15000;

const STATUS_CFG = {
  new:       { label: "New",       bg: "rgba(245,158,11,0.15)", color: "#d97706", border: "rgba(245,158,11,0.3)" },
  confirmed: { label: "Confirmed", bg: "rgba(59,130,246,0.15)",  color: "#60a5fa", border: "rgba(59,130,246,0.3)" },
  preparing: { label: "Preparing", bg: "rgba(139,92,246,0.15)",  color: "#a78bfa", border: "rgba(139,92,246,0.3)" },
};

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
  if (order.order_type === "dine-in") return <UtensilsCrossed size={15} style={{ color: "#c8a96e" }} />;
  if (order.order_type === "delivery") return <Truck size={15} style={{ color: "#60a5fa" }} />;
  return <Package size={15} style={{ color: "#c8a96e" }} />;
}

function playAlert() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch {}
}

export default function BarDisplay() {
  return (
    <StaffLoginGate allowedRoles={BAR_ROLES} title="Bar">
      <BarContent />
    </StaffLoginGate>
  );
}

const CALL_WAITER_API = "/api/front-desk?resource=waiter-calls";

function BarContent() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionIds, setActionIds] = useState(new Set());
  const [connected, setConnected] = useState(false);
  const [waiterCalls, setWaiterCalls] = useState([]);
  const [callActionIds, setCallActionIds] = useState(new Set());
  const knownIdsRef      = useRef(new Set());
  const knownCallIdsRef  = useRef(new Set());
  const lastCallAlertRef = useRef(0);
  const mountedRef       = useRef(true);
  const channelRef       = useRef(null);

  const fetchOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .in("order_status", ACTIVE_STATUSES)
      .order("created_at", { ascending: true });

    if (!mountedRef.current) return;
    if (error) { setLoading(false); return; }

    const drinkOrders = (data || [])
      .map((o) => ({
        ...o,
        displayItems: (o.order_items || []).filter((i) => i.category === "drink"),
      }))
      .filter((o) => o.displayItems.length > 0);

    setOrders(drinkOrders);
    setLoading(false);

    const newIds = new Set(drinkOrders.map((o) => o.id));
    const arrivals = [...newIds].filter((id) => !knownIdsRef.current.has(id));
    if (arrivals.length > 0 && knownIdsRef.current.size > 0) {
      playAlert();
    }
    knownIdsRef.current = newIds;
  }, []);

  const fetchWaiterCalls = useCallback(async () => {
    try {
      const res = await fetch(CALL_WAITER_API, {
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
      });
      if (!mountedRef.current) return;
      if (!res.ok) return;
      const json = await res.json();
      const calls = json.calls || [];
      setWaiterCalls(calls);
      if (calls.length > 0) {
        if (Date.now() - lastCallAlertRef.current >= CALL_ALERT_REPEAT_MS) {
          playAlert();
          lastCallAlertRef.current = Date.now();
        }
      } else {
        lastCallAlertRef.current = 0;
      }
      knownCallIdsRef.current = new Set(calls.map((c) => c.id));
    } catch {}
  }, []);

  async function ackCall(id) {
    setCallActionIds((prev) => new Set([...prev, id]));
    try {
      const res = await fetch(CALL_WAITER_API, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setWaiterCalls((prev) => prev.filter((c) => c.id !== id));
        knownCallIdsRef.current.delete(id);
        if (waiterCalls.length <= 1) lastCallAlertRef.current = 0;
      }
    } catch {}
    setCallActionIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
  }

  const subscribe = useCallback(() => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    const ch = supabase
      .channel(`bar-orders-watch-${Date.now()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        fetchOrders();
      })
      .subscribe((status) => {
        if (!mountedRef.current) return;
        setConnected(status === "SUBSCRIBED");
      });
    channelRef.current = ch;
  }, [fetchOrders]);

  // Waiter calls — REST polling (no Realtime needed for this)
  useEffect(() => {
    fetchWaiterCalls();
    const id = setInterval(fetchWaiterCalls, CALL_ALERT_REPEAT_MS);
    return () => clearInterval(id);
  }, [fetchWaiterCalls]);

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

  // Capacitor push notification token registration
  useEffect(() => {
    if (!window.Capacitor?.isNativePlatform()) return;
    (async () => {
      try {
        const PushNotifications = window.Capacitor.Plugins.PushNotifications;
        const perm = await PushNotifications.requestPermissions();
        if (perm.receive !== 'granted') return;
        await PushNotifications.register();
        await PushNotifications.addListener('registration', async ({ value: token }) => {
          await fetch('/api/register-device', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
            body: JSON.stringify({ role: 'bar', staff_id: null, fcm_token: token }),
          });
        });
      } catch {}
    })();
  }, []);

  async function updateStatus(orderId, newStatus) {
    setActionIds((prev) => new Set([...prev, orderId]));
    try {
      const res = await fetch("/api/kitchen-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ orderId, status: newStatus }),
      });
      if (res.ok) {
        if (newStatus === "ready") {
          setOrders((prev) => prev.filter((o) => o.id !== orderId));
          knownIdsRef.current.delete(orderId);
        } else {
          setOrders((prev) =>
            prev.map((o) => o.id === orderId ? { ...o, order_status: newStatus } : o)
          );
        }
      }
    } finally {
      setActionIds((prev) => { const n = new Set(prev); n.delete(orderId); return n; });
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0f0d0a",
      padding: "20px 16px",
      maxWidth: 480,
      margin: "0 auto",
      fontFamily: "'DM Sans', 'Montserrat', sans-serif",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, borderBottom: "1px solid #2e2820", paddingBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Wine size={20} style={{ color: "#c8a96e" }} />
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 17, fontWeight: 700, color: "#c8a96e", letterSpacing: "3px", textTransform: "uppercase" }}>BLACKROCK</div>
            <div style={{ fontSize: 11, color: "#9C8E7A", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600 }}>Bar Display</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            title={connected ? "Live updates connected" : "Live updates lost — polling every 15 s"}
            style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: connected ? "#22c55e" : "#d97706" }}
          >
            {connected ? <Wifi size={13} /> : <WifiOff size={13} />}
            <span>{connected ? "Live" : "Reconnecting"}</span>
          </div>
          <button
            onClick={fetchOrders}
            style={{ background: "#1a1612", border: "1px solid #2e2820", borderRadius: 7, padding: "6px 10px", color: "#9C8E7A", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}
          >
            <RefreshCw size={12} />
          </button>
          <SignOutButton />
        </div>
      </div>

      <div style={{ fontSize: 12, color: "#9C8E7A", marginBottom: waiterCalls.length > 0 ? 0 : 16, textAlign: "center" }}>
        {orders.length > 0 ? `${orders.length} order${orders.length !== 1 ? "s" : ""} with drinks` : "No drink orders"}
      </div>

      {/* Waiter calls */}
      {waiterCalls.length > 0 && (
        <div style={{ background: "rgba(200,169,110,0.08)", border: "1px solid rgba(200,169,110,0.3)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, marginTop: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#c8a96e", marginBottom: 8 }}>
            Waiter Calls
          </div>
          {waiterCalls.map((call) => (
            <div key={call.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0", borderTop: "1px solid rgba(200,169,110,0.15)" }}>
              <div>
                <span style={{ fontSize: 15, fontWeight: 700, color: "#F5F0E8" }}>Table {call.table_number}</span>
                <span style={{ fontSize: 11, color: "#9C8E7A", marginLeft: 8 }}>{timeAgo(call.created_at)}</span>
              </div>
              <button
                onClick={() => ackCall(call.id)}
                disabled={callActionIds.has(call.id)}
                style={{ background: "#c8a96e", color: "#0f0d0a", border: "none", borderRadius: 6, padding: "5px 14px", fontSize: 11, fontWeight: 700, cursor: callActionIds.has(call.id) ? "default" : "pointer", opacity: callActionIds.has(call.id) ? 0.6 : 1, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "inherit" }}
              >
                Acknowledge
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: "center", color: "#9C8E7A", padding: "60px 0", fontSize: 14 }}>Loading…</div>
      ) : orders.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <Wine size={40} style={{ color: "#2e2820", marginBottom: 12 }} />
          <p style={{ color: "#9C8E7A", fontSize: 14, margin: 0 }}>No drink orders in queue</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {orders.map((order) => (
            <BarOrderCard
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

function SignOutButton() {
  const { signOut } = useStaffSession();
  return (
    <button
      onClick={signOut}
      style={{ background: "#1a1612", border: "1px solid #2e2820", borderRadius: 7, padding: "6px 10px", color: "#9C8E7A", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}
    >
      <LogOut size={12} />
    </button>
  );
}

function BarOrderCard({ order, loading, onStatusUpdate }) {
  const cfg = STATUS_CFG[order.order_status] ?? STATUS_CFG.new;
  const isNew = order.order_status === "new" || order.order_status === "confirmed";
  const nextStatus = isNew ? "preparing" : "ready";
  const nextLabel = isNew ? "Start Preparing" : "Mark Ready";

  return (
    <div style={{
      background: "#1a1612",
      border: `2px solid ${order.order_status === "preparing" ? "#8b5cf6" : "#2e2820"}`,
      borderRadius: 10,
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ background: "#221e1b", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #2e2820" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {orderIcon(order)}
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#F5F0E8" }}>{orderLabel(order)}</div>
            <div style={{ fontSize: 11, color: "#9C8E7A" }}>{order.order_number} · {timeAgo(order.created_at)}</div>
          </div>
        </div>
        <span style={{ display: "inline-flex", background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, borderRadius: 99, padding: "3px 9px", fontSize: 10, fontWeight: 600 }}>
          {cfg.label}
        </span>
      </div>

      {/* Drink items */}
      <div style={{ padding: "12px 16px" }}>
        {order.displayItems.map((item, idx) => (
          <div key={item.id || idx} style={{ display: "flex", gap: 8, marginBottom: idx < order.displayItems.length - 1 ? 8 : 0 }}>
            <span style={{ color: "#c8a96e", fontWeight: 700, fontSize: 15, minWidth: 26 }}>{item.qty}×</span>
            <span style={{ fontSize: 14, fontWeight: 500, color: "#F5F0E8" }}>{item.item_name}</span>
          </div>
        ))}
      </div>

      {/* Action */}
      <div style={{ padding: "10px 16px", borderTop: "1px solid #2e2820" }}>
        <button
          onClick={() => onStatusUpdate(order.id, nextStatus)}
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px 16px",
            borderRadius: 7,
            border: "none",
            background: nextStatus === "ready" ? "#22c55e" : "#c8a96e",
            color: nextStatus === "ready" ? "#fff" : "#0f0d0a",
            fontSize: 13,
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
            fontFamily: "inherit",
          }}
        >
          {loading ? "…" : nextLabel}
        </button>
      </div>
    </div>
  );
}
