import { useParams, useNavigate, useLocation } from "react-router-dom";
import { CheckCircle, Package, Truck, Clock, RotateCcw, Home, MessageCircle, UtensilsCrossed } from "lucide-react";

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

export default function OrderConfirmation() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();

  // Fall back to sessionStorage if we landed here without navigation state (e.g. page refresh)
  let orderData = state;
  if (!orderData?.orderNumber) {
    try {
      const saved = sessionStorage.getItem(`order_${orderId}`);
      if (saved) orderData = JSON.parse(saved);
    } catch {}
  }

  if (!orderData?.orderNumber) {
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
        <p style={{ color: "var(--muted, #9C8E7A)", fontSize: 16 }}>Order not found.</p>
        <button onClick={() => navigate("/")} className="btn-outline-gold">Return Home</button>
      </div>
    );
  }

  const { orderNumber, orderType, tableNumber, deliveryAddress, guestName, scheduledTime, items = [], subtotal, deliveryFee = 0, total } = orderData;
  const isDineIn = orderType === "dine-in";

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
            <CheckCircle size={64} style={{ color: "var(--gold, #C9A84C)" }} />
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
            Order Received
          </p>
          <h1
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: "clamp(28px, 5vw, 40px)",
              fontWeight: 700,
              color: "var(--warm-white, #F5F0E8)",
              margin: "0 0 16px",
              lineHeight: 1.15,
            }}
          >
            Thank you{guestName ? `, ${guestName.split(" ")[0]}` : ""}!
          </h1>
          <p style={{ fontSize: 15, color: "var(--muted, #9C8E7A)", margin: "0 0 8px", lineHeight: 1.6 }}>
            We've received your order <strong style={{ color: "var(--warm-white, #F5F0E8)" }}>{orderNumber}</strong>.
          </p>
          <p style={{ fontSize: 14, color: "var(--muted, #9C8E7A)", margin: 0, lineHeight: 1.6 }}>
            {isDineIn
              ? "Your order has been sent to the kitchen. Sit tight — we'll bring it to your table!"
              : "Once we confirm your bank transfer via WhatsApp, we'll process your order immediately."}
          </p>
        </div>

        {/* Banner */}
        {isDineIn ? (
          <div style={{ background: "rgba(200,169,110,0.08)", border: "1px solid rgba(200,169,110,0.25)", borderRadius: 10, padding: "14px 18px", marginBottom: 20, display: "flex", alignItems: "flex-start", gap: 12 }}>
            <UtensilsCrossed size={18} style={{ color: "var(--gold, #C9A84C)", flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: 13, color: "var(--gold, #C9A84C)", margin: 0, lineHeight: 1.6 }}>
              <strong>Pay at Table.</strong> Your bill will be brought to you — no payment needed right now.
            </p>
          </div>
        ) : (
          <div style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.25)", borderRadius: 10, padding: "14px 18px", marginBottom: 20, display: "flex", alignItems: "flex-start", gap: 12 }}>
            <MessageCircle size={18} style={{ color: "var(--gold, #C9A84C)", flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: 13, color: "var(--gold, #C9A84C)", margin: 0, lineHeight: 1.6 }}>
              Please send your payment proof on WhatsApp if you haven't already. Payment confirms and activates your order.
            </p>
          </div>
        )}

        {/* Order summary card */}
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
              {isDineIn ? (
                <DetailRow
                  icon={<UtensilsCrossed size={14} />}
                  label="Table"
                  value={`Table ${tableNumber} — Dine-In`}
                />
              ) : (
                <DetailRow
                  icon={orderType === "delivery" ? <Truck size={14} /> : <Package size={14} />}
                  label={orderType === "delivery" ? "Delivery" : "Pickup"}
                  value={orderType === "delivery" ? deliveryAddress : "11 Ajao Road, off Adeniyi Jones Road, Ikeja"}
                />
              )}
              {!isDineIn && (
                <DetailRow
                  icon={<Clock size={14} />}
                  label="Time"
                  value={fmtScheduledTime(scheduledTime)}
                />
              )}
              <DetailRow
                icon={null}
                label="Payment"
                value={isDineIn ? "Pay at Table" : "Bank Transfer (awaiting confirmation)"}
              />
            </div>
          </div>

          {/* Items */}
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #2e2820" }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted, #9C8E7A)", margin: "0 0 12px" }}>
              Items Ordered
            </p>
            {items.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 16,
                  paddingBottom: idx < items.length - 1 ? 10 : 0,
                  marginBottom: idx < items.length - 1 ? 10 : 0,
                  borderBottom: idx < items.length - 1 ? "1px solid #1e1a16" : "none",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, color: "var(--warm-white, #F5F0E8)", lineHeight: 1.3 }}>
                    {item.name || item.item_name}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted, #9C8E7A)", marginTop: 2 }}>
                    {fmtPrice(item.unit_price || item.price)} × {item.qty}
                  </div>
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--warm-white, #F5F0E8)", flexShrink: 0 }}>
                  {fmtPrice(item.line_total ?? (item.unit_price || item.price) * item.qty)}
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div style={{ padding: "14px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: "var(--muted, #9C8E7A)" }}>Subtotal</span>
              <span style={{ fontSize: 13, color: "var(--warm-white, #F5F0E8)" }}>{fmtPrice(subtotal || 0)}</span>
            </div>
            {deliveryFee > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: "var(--muted, #9C8E7A)" }}>Delivery fee</span>
                <span style={{ fontSize: 13, color: "var(--warm-white, #F5F0E8)" }}>{fmtPrice(deliveryFee)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10, borderTop: "1px solid #2e2820", marginTop: 6 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: "var(--warm-white, #F5F0E8)" }}>Total</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: "var(--gold, #C9A84C)" }}>{fmtPrice(total || subtotal || 0)}</span>
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
