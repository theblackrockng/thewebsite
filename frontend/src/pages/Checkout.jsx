import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, MapPin, Truck, Package, Clock, Calendar, ChevronRight, AlertCircle } from "lucide-react";
import { useCart } from "../context/CartContext";

const DELIVERY_FEE = 1500;
const PAYMENT_PROVIDER = process.env.REACT_APP_PAYMENT_PROVIDER || "none";

function fmtPrice(n) {
  return `₦${Number(n).toLocaleString("en-NG")}`;
}

const TIME_OPTIONS = (() => {
  const opts = [];
  for (let h = 10; h <= 22; h++) {
    for (let m = 0; m < 60; m += 30) {
      if (h === 22 && m > 0) break;
      const hh = h > 12 ? h - 12 : h;
      const ampm = h >= 12 ? "PM" : "AM";
      const mm = m === 0 ? "00" : "30";
      opts.push({ value: `${String(h).padStart(2, "0")}:${mm}`, label: `${hh}:${mm} ${ampm}` });
    }
  }
  return opts;
})();

const todayStr = new Date().toISOString().split("T")[0];

function StepIndicator({ current }) {
  const steps = ["Order Type", "Your Details", "Order Time", "Review & Pay"];
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, marginBottom: 40 }}>
      {steps.map((label, idx) => {
        const step = idx + 1;
        const done = current > step;
        const active = current === step;
        return (
          <div key={step} style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: done ? "var(--gold, #C9A84C)" : active ? "var(--gold, #C9A84C)" : "transparent",
                  border: `2px solid ${done || active ? "var(--gold, #C9A84C)" : "#2e2820"}`,
                  fontSize: 13,
                  fontWeight: 700,
                  color: done || active ? "#0f0d0a" : "#5a4e46",
                  transition: "all 0.2s",
                }}
              >
                {done ? <Check size={16} /> : step}
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.05em",
                  color: done || active ? "var(--warm-white, #F5F0E8)" : "#5a4e46",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div
                style={{
                  width: "clamp(24px, 5vw, 60px)",
                  height: 2,
                  background: current > step ? "var(--gold, #C9A84C)" : "#2e2820",
                  margin: "0 8px",
                  marginBottom: 22,
                  transition: "background 0.2s",
                  flexShrink: 0,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function FieldLabel({ children, required }) {
  return (
    <label
      style={{
        display: "block",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "var(--muted, #9C8E7A)",
        marginBottom: 8,
      }}
    >
      {children}
      {required && <span style={{ color: "var(--gold, #C9A84C)", marginLeft: 3 }}>*</span>}
    </label>
  );
}

const inputStyle = {
  width: "100%",
  background: "#1a1612",
  border: "1px solid #2e2820",
  borderRadius: 6,
  padding: "12px 14px",
  fontSize: 14,
  color: "var(--warm-white, #F5F0E8)",
  outline: "none",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

export default function Checkout() {
  const navigate = useNavigate();
  const { items, subtotal, clearCart } = useCart();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Step 1
  const [orderType, setOrderType] = useState(null);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryLandmark, setDeliveryLandmark] = useState("");

  // Step 2
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");

  // Step 3
  const [scheduleType, setScheduleType] = useState("asap");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("12:00");

  // Step 4
  const [paymentMethod, setPaymentMethod] = useState("pay_on_arrival");

  const deliveryFee = orderType === "delivery" ? DELIVERY_FEE : 0;
  const total = subtotal + deliveryFee;

  function validateStep1() {
    if (!orderType) return "Please select an order type.";
    if (orderType === "delivery" && !deliveryAddress.trim()) return "Please enter your delivery address.";
    return null;
  }

  function validateStep2() {
    if (!guestName.trim()) return "Please enter your full name.";
    if (!guestPhone.trim()) return "Please enter your phone number.";
    return null;
  }

  function validateStep3() {
    if (scheduleType === "later") {
      if (!scheduleDate) return "Please select a date.";
      if (!scheduleTime) return "Please select a time.";
    }
    return null;
  }

  function handleNext() {
    setError(null);
    let err = null;
    if (step === 1) err = validateStep1();
    else if (step === 2) err = validateStep2();
    else if (step === 3) err = validateStep3();
    if (err) { setError(err); return; }
    setStep((s) => s + 1);
  }

  async function handlePlaceOrder() {
    setError(null);
    if (items.length === 0) { setError("Your cart is empty."); return; }
    setLoading(true);
    try {
      let scheduledTime = null;
      if (scheduleType === "later" && scheduleDate && scheduleTime) {
        scheduledTime = new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString();
      }

      const fullAddress = deliveryLandmark
        ? `${deliveryAddress}, ${deliveryLandmark}`
        : deliveryAddress;

      const payload = {
        orderType,
        deliveryAddress: orderType === "delivery" ? fullAddress : null,
        guestName: guestName.trim(),
        guestPhone: guestPhone.trim(),
        guestEmail: guestEmail.trim() || null,
        specialInstructions: specialInstructions.trim() || null,
        scheduledTime,
        paymentMethod,
        items: items.map((i) => ({ id: i.id, name: i.name, price: i.price, qty: i.qty })),
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to place order.");

      clearCart();
      navigate(`/order-confirmation/${data.orderId}`);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0 && step !== 4) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--charcoal, #0f0d0a)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 20,
          padding: 24,
        }}
      >
        <p style={{ color: "var(--muted, #9C8E7A)", fontSize: 16 }}>Your cart is empty.</p>
        <button onClick={() => navigate("/order")} className="btn-outline-gold">
          Browse Menu
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--charcoal, #0f0d0a)",
        paddingTop: 120,
        paddingBottom: 80,
      }}
    >
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 24px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
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
            Checkout
          </p>
          <h1
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: "clamp(32px, 5vw, 48px)",
              fontWeight: 700,
              color: "var(--warm-white, #F5F0E8)",
              margin: 0,
            }}
          >
            Complete Your Order
          </h1>
        </div>

        <StepIndicator current={step} />

        {/* Error */}
        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              background: "rgba(139,26,43,0.15)",
              border: "1px solid rgba(139,26,43,0.4)",
              borderRadius: 8,
              padding: "14px 16px",
              marginBottom: 24,
            }}
          >
            <AlertCircle size={18} style={{ color: "#e05c6e", flexShrink: 0, marginTop: 1 }} />
            <p style={{ margin: 0, fontSize: 14, color: "#e05c6e" }}>{error}</p>
          </div>
        )}

        {/* Step 1: Order Type */}
        {step === 1 && (
          <div>
            <h2 style={sectionTitle}>How would you like to receive your order?</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
              <TypeCard
                active={orderType === "pickup"}
                onClick={() => setOrderType("pickup")}
                icon={<Package size={28} style={{ color: orderType === "pickup" ? "#0f0d0a" : "var(--gold, #C9A84C)" }} />}
                title="Pickup"
                subtitle="11 Ajao Road, off Adeniyi Jones Road, Ikeja"
              />
              <TypeCard
                active={orderType === "delivery"}
                onClick={() => setOrderType("delivery")}
                icon={<Truck size={28} style={{ color: orderType === "delivery" ? "#0f0d0a" : "var(--gold, #C9A84C)" }} />}
                title="Delivery"
                subtitle={`Flat rate: ${fmtPrice(DELIVERY_FEE)}`}
              />
            </div>

            {orderType === "delivery" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
                <div>
                  <FieldLabel required>Street Address</FieldLabel>
                  <input
                    type="text"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="House number and street name"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <FieldLabel>Area / Landmark</FieldLabel>
                  <input
                    type="text"
                    value={deliveryLandmark}
                    onChange={(e) => setDeliveryLandmark(e.target.value)}
                    placeholder="E.g. opposite Total filling station, Ikeja"
                    style={inputStyle}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    background: "rgba(201,168,76,0.08)",
                    border: "1px solid rgba(201,168,76,0.2)",
                    borderRadius: 6,
                    padding: "12px 14px",
                  }}
                >
                  <MapPin size={14} style={{ color: "var(--gold, #C9A84C)", flexShrink: 0, marginTop: 2 }} />
                  <p style={{ margin: 0, fontSize: 12.5, color: "var(--muted, #9C8E7A)", lineHeight: 1.6 }}>
                    Lagos only — we'll confirm your delivery zone before preparing your order.
                  </p>
                </div>
              </div>
            )}

            <button onClick={handleNext} className="btn-burgundy" style={{ width: "100%" }}>
              Continue <ChevronRight size={16} style={{ display: "inline" }} />
            </button>
          </div>
        )}

        {/* Step 2: Your Details */}
        {step === 2 && (
          <div>
            <h2 style={sectionTitle}>Tell us who you are</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
              <div>
                <FieldLabel required>Full Name</FieldLabel>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Your full name"
                  style={inputStyle}
                />
              </div>
              <div>
                <FieldLabel required>Phone Number</FieldLabel>
                <input
                  type="tel"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  placeholder="+234 or 0XXXXXXXXXX"
                  style={inputStyle}
                />
              </div>
              <div>
                <FieldLabel>Email Address</FieldLabel>
                <input
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="For order confirmation (optional)"
                  style={inputStyle}
                />
              </div>
              <div>
                <FieldLabel>Special Instructions</FieldLabel>
                <textarea
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="Allergies, preferences, or anything we should know."
                  rows={3}
                  style={{ ...inputStyle, resize: "vertical", minHeight: 80 }}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setStep(1)} style={{ ...ghostBtn, flex: 1 }}>Back</button>
              <button onClick={handleNext} className="btn-burgundy" style={{ flex: 2 }}>
                Continue <ChevronRight size={16} style={{ display: "inline" }} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Order Time */}
        {step === 3 && (
          <div>
            <h2 style={sectionTitle}>When do you want your order?</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
              <TimeOption
                active={scheduleType === "asap"}
                onClick={() => setScheduleType("asap")}
                icon={<Clock size={20} style={{ color: scheduleType === "asap" ? "#0f0d0a" : "var(--gold, #C9A84C)" }} />}
                title="As Soon As Possible"
                subtitle="We'll start preparing right away"
              />
              <TimeOption
                active={scheduleType === "later"}
                onClick={() => setScheduleType("later")}
                icon={<Calendar size={20} style={{ color: scheduleType === "later" ? "#0f0d0a" : "var(--gold, #C9A84C)" }} />}
                title="Schedule for Later"
                subtitle="Pick a date and time"
              />
            </div>

            {scheduleType === "later" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
                <div>
                  <FieldLabel required>Date</FieldLabel>
                  <input
                    type="date"
                    min={todayStr}
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    style={{ ...inputStyle, colorScheme: "dark" }}
                  />
                </div>
                <div>
                  <FieldLabel required>Time</FieldLabel>
                  <select
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    style={{ ...inputStyle, cursor: "pointer" }}
                  >
                    {TIME_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value} style={{ background: "#1a1612" }}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setStep(2)} style={{ ...ghostBtn, flex: 1 }}>Back</button>
              <button onClick={handleNext} className="btn-burgundy" style={{ flex: 2 }}>
                Continue <ChevronRight size={16} style={{ display: "inline" }} />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Review & Pay */}
        {step === 4 && (
          <div>
            <h2 style={sectionTitle}>Review your order</h2>

            {/* Items */}
            <div
              style={{
                background: "#1a1612",
                border: "1px solid #2e2820",
                borderRadius: 10,
                marginBottom: 16,
                overflow: "hidden",
              }}
            >
              <div style={{ padding: "14px 20px", borderBottom: "1px solid #2e2820" }}>
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted, #9C8E7A)" }}>
                  Items ({items.length})
                </span>
              </div>
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    padding: "12px 20px",
                    borderBottom: idx < items.length - 1 ? "1px solid #1e1a16" : "none",
                    gap: 16,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--warm-white, #F5F0E8)", lineHeight: 1.3 }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted, #9C8E7A)", marginTop: 2 }}>
                      {fmtPrice(item.price)} × {item.qty}
                    </div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--warm-white, #F5F0E8)", flexShrink: 0 }}>
                    {fmtPrice(item.price * item.qty)}
                  </div>
                </div>
              ))}
              {/* Totals */}
              <div style={{ borderTop: "1px solid #2e2820", padding: "12px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: "var(--muted, #9C8E7A)" }}>Subtotal</span>
                  <span style={{ fontSize: 13, color: "var(--warm-white, #F5F0E8)" }}>{fmtPrice(subtotal)}</span>
                </div>
                {orderType === "delivery" && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: "var(--muted, #9C8E7A)" }}>Delivery fee</span>
                    <span style={{ fontSize: 13, color: "var(--warm-white, #F5F0E8)" }}>{fmtPrice(DELIVERY_FEE)}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10, borderTop: "1px solid #2e2820", marginTop: 6 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "var(--warm-white, #F5F0E8)" }}>Total</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "var(--gold, #C9A84C)" }}>{fmtPrice(total)}</span>
                </div>
              </div>
            </div>

            {/* Order summary */}
            <div
              style={{
                background: "#1a1612",
                border: "1px solid #2e2820",
                borderRadius: 10,
                padding: "16px 20px",
                marginBottom: 16,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted, #9C8E7A)", minWidth: 80 }}>Type</span>
                <span style={{ fontSize: 13, color: "var(--warm-white, #F5F0E8)", textTransform: "capitalize" }}>{orderType}</span>
              </div>
              {orderType === "delivery" && (
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted, #9C8E7A)", minWidth: 80 }}>Address</span>
                  <span style={{ fontSize: 13, color: "var(--warm-white, #F5F0E8)" }}>
                    {deliveryLandmark ? `${deliveryAddress}, ${deliveryLandmark}` : deliveryAddress}
                  </span>
                </div>
              )}
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted, #9C8E7A)", minWidth: 80 }}>Name</span>
                <span style={{ fontSize: 13, color: "var(--warm-white, #F5F0E8)" }}>{guestName}</span>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted, #9C8E7A)", minWidth: 80 }}>Phone</span>
                <span style={{ fontSize: 13, color: "var(--warm-white, #F5F0E8)" }}>{guestPhone}</span>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted, #9C8E7A)", minWidth: 80 }}>Time</span>
                <span style={{ fontSize: 13, color: "var(--warm-white, #F5F0E8)" }}>
                  {scheduleType === "asap"
                    ? "As soon as possible"
                    : `${scheduleDate} at ${TIME_OPTIONS.find((o) => o.value === scheduleTime)?.label || scheduleTime}`}
                </span>
              </div>
            </div>

            {/* Payment */}
            <div
              style={{
                background: "#1a1612",
                border: "1px solid #2e2820",
                borderRadius: 10,
                padding: "16px 20px",
                marginBottom: 24,
              }}
            >
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted, #9C8E7A)", margin: "0 0 14px" }}>
                Payment Method
              </p>

              {(PAYMENT_PROVIDER === "none" || !PAYMENT_PROVIDER) && (
                <>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      padding: "12px 14px",
                      background: "rgba(201,168,76,0.08)",
                      border: "1px solid rgba(201,168,76,0.3)",
                      borderRadius: 8,
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        border: "2px solid var(--gold, #C9A84C)",
                        background: "var(--gold, #C9A84C)",
                        flexShrink: 0,
                        marginTop: 2,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#0f0d0a" }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--warm-white, #F5F0E8)", marginBottom: 2 }}>
                        Pay on {orderType === "delivery" ? "Delivery" : "Pickup"}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--muted, #9C8E7A)", lineHeight: 1.5 }}>
                        Pay with cash or transfer when your order arrives
                      </div>
                    </div>
                  </div>
                  <p style={{ fontSize: 12, color: "var(--muted, #9C8E7A)", margin: "12px 0 0", lineHeight: 1.6 }}>
                    Online payment is launching soon. For now, please select Pay on {orderType === "delivery" ? "Delivery" : "Pickup"} to complete your order, and we'll confirm everything with you directly.
                  </p>
                </>
              )}

              {(PAYMENT_PROVIDER === "paystack" || PAYMENT_PROVIDER === "flutterwave") && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <PaymentOption
                    active={paymentMethod === "pay_on_arrival"}
                    onClick={() => setPaymentMethod("pay_on_arrival")}
                    label={`Pay on ${orderType === "delivery" ? "Delivery" : "Pickup"}`}
                    sub="Cash or transfer on arrival"
                  />
                  <PaymentOption
                    active={paymentMethod === "pay_online"}
                    onClick={() => setPaymentMethod("pay_online")}
                    label="Pay Online"
                    sub="Secure payment via card"
                  />
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setStep(3)} style={{ ...ghostBtn, flex: 1 }}>Back</button>
              <button
                onClick={handlePlaceOrder}
                disabled={loading}
                className="btn-burgundy"
                style={{ flex: 2, opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}
              >
                {loading ? "Placing Order…" : "Place Order"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const sectionTitle = {
  fontFamily: "'Cormorant Garamond', Georgia, serif",
  fontSize: "clamp(22px, 3vw, 28px)",
  fontWeight: 700,
  color: "var(--warm-white, #F5F0E8)",
  margin: "0 0 24px",
};

const ghostBtn = {
  background: "transparent",
  border: "1px solid #2e2820",
  color: "var(--muted, #9C8E7A)",
  borderRadius: 6,
  padding: "12px 20px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
};

function TypeCard({ active, onClick, icon, title, subtitle }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? "var(--gold, #C9A84C)" : "#1a1612",
        border: `2px solid ${active ? "var(--gold, #C9A84C)" : "#2e2820"}`,
        borderRadius: 10,
        padding: "24px 20px",
        cursor: "pointer",
        textAlign: "left",
        transition: "all 0.15s",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {icon}
      <div>
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: active ? "#0f0d0a" : "var(--warm-white, #F5F0E8)",
            marginBottom: 4,
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 12, color: active ? "rgba(0,0,0,0.6)" : "var(--muted, #9C8E7A)", lineHeight: 1.4 }}>
          {subtitle}
        </div>
      </div>
    </button>
  );
}

function TimeOption({ active, onClick, icon, title, subtitle }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        background: active ? "var(--gold, #C9A84C)" : "#1a1612",
        border: `2px solid ${active ? "var(--gold, #C9A84C)" : "#2e2820"}`,
        borderRadius: 10,
        padding: "16px 20px",
        cursor: "pointer",
        textAlign: "left",
        transition: "all 0.15s",
        width: "100%",
      }}
    >
      {icon}
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: active ? "#0f0d0a" : "var(--warm-white, #F5F0E8)", marginBottom: 2 }}>
          {title}
        </div>
        <div style={{ fontSize: 12, color: active ? "rgba(0,0,0,0.6)" : "var(--muted, #9C8E7A)" }}>
          {subtitle}
        </div>
      </div>
    </button>
  );
}

function PaymentOption({ active, onClick, label, sub }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "12px 14px",
        background: active ? "rgba(201,168,76,0.08)" : "transparent",
        border: `1px solid ${active ? "rgba(201,168,76,0.3)" : "#2e2820"}`,
        borderRadius: 8,
        cursor: "pointer",
        textAlign: "left",
        width: "100%",
        transition: "all 0.15s",
      }}
    >
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          border: `2px solid ${active ? "var(--gold, #C9A84C)" : "#2e2820"}`,
          background: active ? "var(--gold, #C9A84C)" : "transparent",
          flexShrink: 0,
          marginTop: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {active && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#0f0d0a" }} />}
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--warm-white, #F5F0E8)", marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 12, color: "var(--muted, #9C8E7A)", lineHeight: 1.5 }}>{sub}</div>
      </div>
    </button>
  );
}
