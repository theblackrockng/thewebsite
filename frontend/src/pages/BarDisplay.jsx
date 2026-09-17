import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/supabase";
import PinGate from "../components/PinGate";
import { Wine, UtensilsCrossed, Package, Truck, RefreshCw } from "lucide-react";

const ACTIVE_STATUSES = ["new", "confirmed", "preparing"];

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
    <PinGate storageKey="bar">
      <BarContent />
    </PinGate>
  );
}

function BarContent() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionIds, setActionIds] = useState(new Set());
  const knownIdsRef = useRef(new Set());
  const mountedRef = useRef(true);

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

  useEffect(() => {
    mountedRef.current = true;
    fetchOrders();

    const channel = supabase
      .channel("bar-orders-watch")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => {
      mountedRef.current = false;
      supabase.removeChannel(channel);
    };
  }, [fetchOrders]);

  async function updateStatus(orderId, newStatus) {
    setActionIds((prev) => new Set([...prev, orderId]));
    try {
      const res = await fetch("/api/kitchen-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
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
        <button
          onClick={fetchOrders}
          style={{ background: "#1a1612", border: "1px solid #2e2820", borderRadius: 7, padding: "6px 10px", color: "#9C8E7A", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}
        >
          <RefreshCw size={12} />
        </button>
      </div>

      <div style={{ fontSize: 12, color: "#9C8E7A", marginBottom: 16, textAlign: "center" }}>
        {orders.length > 0 ? `${orders.length} order${orders.length !== 1 ? "s" : ""} with drinks` : "No drink orders"}
      </div>

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
