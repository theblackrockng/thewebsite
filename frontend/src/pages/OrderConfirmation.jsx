import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CheckCircle, Package, Truck, Clock, RotateCcw, Home } from "lucide-react";
import { supabase } from "../lib/supabase";

function fmtPrice(n) {
  return `₦${Number(n).toLocaleString("en-NG")}`;
}

function fmtScheduledTime(iso) {
  if (!iso) return "As soon as possible";
  try {
    return new Date(iso).toLocaleString("en-NG", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return iso;
  }
}

function PaymentBadge({ status }) {
  if (status === "paid") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          background: "rgba(34,197,94,0.12)",
          color: "#22c55e",
          border: "1px solid rgba(34,197,94,0.25)",
          borderRadius: 99,
          padding: "4px 12px",
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        Paid
      </span>
    );
  }
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        background: "rgba(245,158,11,0.12)",
        color: "#f59e0b",
        border: "1px solid rgba(245,158,11,0.25)",
        borderRadius: 99,
        padding: "4px 12px",
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      Pay on Arrival
    </span>
  );
}

export default function OrderConfirmation() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchOrder() {
      try {
        const [{ data: orderData, error: orderErr }, { data: itemsData, error: itemsErr }] =
          await Promise.all([
            supabase.from("orders").select("*").eq("id", orderId).single(),
            supabase.from("order_items").select("*").eq("order_id", orderId).order("created_at"),
          ]);

        if (orderErr || !orderData) throw new Error("Order not found.");
        if (itemsErr) throw new Error("Could not load order items.");

        setOrder(orderData);
        setOrderItems(itemsData || []);
      } catch (err) {
        setError(err.message || "Could not load order.");
      } finally {
        setLoading(false);
      }
    }
    fetchOrder();
  }, [orderId]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--charcoal, #0f0d0a)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p style={{ color: "var(--muted, #9C8E7A)" }}>Loading…</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--charcoal, #0f0d0a)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
          padding: 24,
        }}
      >
        <p style={{ color: "var(--muted, #9C8E7A)", fontSize: 16 }}>{error || "Order not found."}</p>
        <button onClick={() => navigate("/")} className="btn-outline-gold">Return Home</button>
      </div>
    );
  }

  const total = (order.subtotal || 0) + (order.delivery_fee || 0);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--charcoal, #0f0d0a)",
        paddingTop: 120,
        paddingBottom: 80,
      }}
    >
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 24px" }}>
        {/* Success header */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ marginBottom: 20 }}>
            <CheckCircle
              size={64}
              style={{ color: "var(--gold, #C9A84C)" }}
            />
          </div>
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: "var(--gold, #C9A84C)",
              marginBottom: 12,
            }}
          >
            Order Placed
          </p>
          <h1
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: "clamp(30px, 5vw, 44px)",
              fontWeight: 700,
              color: "var(--warm-white, #F5F0E8)",
              margin: "0 0 12px",
              lineHeight: 1.1,
            }}
          >
            {order.order_number}
          </h1>
          <p style={{ fontSize: 15, color: "var(--muted, #9C8E7A)", margin: 0 }}>
            We'll notify you when your order is confirmed.
          </p>
        </div>

        {/* Order summary */}
        <div
          style={{
            background: "#1a1612",
            border: "1px solid #2e2820",
            borderRadius: 10,
            marginBottom: 16,
            overflow: "hidden",
          }}
        >
          {/* Order details */}
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #2e2820" }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted, #9C8E7A)", margin: "0 0 14px" }}>
              Order Details
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <DetailRow
                icon={order.order_type === "delivery" ? <Truck size={14} /> : <Package size={14} />}
                label={order.order_type === "delivery" ? "Delivery" : "Pickup"}
                value={
                  order.order_type === "delivery"
                    ? order.delivery_address
                    : "11 Ajao Road, off Adeniyi Jones Road, Ikeja"
                }
              />
              <DetailRow
                icon={<Clock size={14} />}
                label="Time"
                value={fmtScheduledTime(order.scheduled_time)}
              />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: "var(--muted, #9C8E7A)" }}>Payment</span>
                <PaymentBadge status={order.payment_status} />
              </div>
            </div>
          </div>

          {/* Items */}
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #2e2820" }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted, #9C8E7A)", margin: "0 0 12px" }}>
              Items
            </p>
            {orderItems.map((item, idx) => (
              <div
                key={item.id || idx}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 16,
                  paddingBottom: idx < orderItems.length - 1 ? 10 : 0,
                  marginBottom: idx < orderItems.length - 1 ? 10 : 0,
                  borderBottom: idx < orderItems.length - 1 ? "1px solid #1e1a16" : "none",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, color: "var(--warm-white, #F5F0E8)", lineHeight: 1.3 }}>
                    {item.item_name || item.name}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted, #9C8E7A)", marginTop: 2 }}>
                    {fmtPrice(item.unit_price || item.price)} × {item.qty}
                  </div>
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--warm-white, #F5F0E8)", flexShrink: 0 }}>
                  {fmtPrice((item.unit_price || item.price) * item.qty)}
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div style={{ padding: "14px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: "var(--muted, #9C8E7A)" }}>Subtotal</span>
              <span style={{ fontSize: 13, color: "var(--warm-white, #F5F0E8)" }}>{fmtPrice(order.subtotal || 0)}</span>
            </div>
            {(order.delivery_fee > 0) && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: "var(--muted, #9C8E7A)" }}>Delivery fee</span>
                <span style={{ fontSize: 13, color: "var(--warm-white, #F5F0E8)" }}>{fmtPrice(order.delivery_fee)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10, borderTop: "1px solid #2e2820", marginTop: 6 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: "var(--warm-white, #F5F0E8)" }}>Total</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: "var(--gold, #C9A84C)" }}>{fmtPrice(total)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={() => navigate("/order")}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              background: "transparent",
              border: "1px solid #2e2820",
              color: "var(--muted, #9C8E7A)",
              borderRadius: 6,
              padding: "14px 20px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            <RotateCcw size={14} />
            Order Again
          </button>
          <button
            onClick={() => navigate("/")}
            className="btn-burgundy"
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          >
            <Home size={14} />
            Return Home
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--muted, #9C8E7A)", fontSize: 12, flexShrink: 0 }}>
        {icon}
        {label}
      </div>
      <span style={{ fontSize: 13, color: "var(--warm-white, #F5F0E8)", textAlign: "right", flex: 1, marginLeft: 16 }}>
        {value}
      </span>
    </div>
  );
}
