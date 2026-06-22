import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Loader2, AlertCircle } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

const DM = "'DM Sans', system-ui, sans-serif";
const LORA = "'Lora', Georgia, serif";
const BURGUNDY = "#7a1c1c";

function inputStyle(focused) {
  return {
    fontFamily: DM,
    fontSize: "16px",
    color: "#1a1a1a",
    width: "100%",
    padding: "15px 16px",
    borderRadius: "10px",
    border: focused ? `1.5px solid ${BURGUNDY}` : "1.5px solid #e3ddd2",
    background: "#ffffff",
    boxShadow: focused ? "0 0 0 4px rgba(122,28,28,0.08)" : "none",
    transition: "border-color .15s, box-shadow .15s",
    outline: "none",
  };
}

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState("");
  const [hoverBtn, setHoverBtn] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: err } = await signIn(email, password);
    setLoading(false);
    if (err) { setError(err.message); return; }
    navigate("/");
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px",
        background: "#1a1a1a",
        backgroundImage: `linear-gradient(rgba(122,28,28,0.20), rgba(122,28,28,0.20)), url('/heroimage.png')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        fontFamily: DM,
      }}
    >
      <motion.div
        style={{ width: "100%", maxWidth: "452px", display: "flex", flexDirection: "column", gap: "18px" }}
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: shouldReduceMotion ? 0.15 : 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Card */}
        <div
          style={{
            background: "#faf8f5",
            borderRadius: "27.5px",
            boxShadow: "0 30px 70px -20px rgba(0,0,0,0.7), 0 0 0 1px rgba(200,169,110,0.12)",
            padding: "48px 44px 32px",
            position: "relative",
            width: "100%",
            opacity: 0.93,
          }}
        >
          {/* ADMIN CONSOLE badge */}
          <p
            style={{
              position: "absolute",
              top: "14px",
              left: 0,
              right: 0,
              textAlign: "center",
              margin: 0,
              fontFamily: DM,
              fontSize: "10px",
              fontWeight: 800,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "#581919",
            }}
          >
            Admin Console
          </p>

          {/* Brand */}
          <div style={{ marginBottom: "34px" }}>
            <span
              style={{
                fontFamily: LORA,
                fontWeight: 700,
                fontSize: "22px",
                letterSpacing: "0.14em",
                color: "#1a1a1a",
                display: "block",
              }}
            >
              BLACKROCK
            </span>
            <span
              style={{
                fontFamily: DM,
                fontSize: "12px",
                color: "#9a9388",
                letterSpacing: "0.05em",
                marginTop: "3px",
                display: "block",
              }}
            >
              Restaurant &amp; Lounge
            </span>
          </div>

          {/* Heading */}
          <div style={{ marginBottom: "28px" }}>
            <h1 style={{ fontFamily: DM, fontSize: "24px", fontWeight: 700, color: "#1a1a1a", margin: 0, letterSpacing: "-0.01em" }}>
              Welcome back
            </h1>
            <p style={{ fontFamily: DM, fontSize: "14px", color: "#9a9388", margin: "6px 0 0" }}>
              Sign in to manage your restaurant.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={submit} aria-label="Sign in to admin console">

            {/* Email */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
              <label
                htmlFor="login-email"
                style={{ fontFamily: DM, fontSize: "11px", fontWeight: 600, letterSpacing: "0.13em", textTransform: "uppercase", color: "#6f685d" }}
              >
                Email Address
              </label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                autoFocus
                placeholder="you@blackrockrestaurantng.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField("")}
                style={inputStyle(focusedField === "email")}
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "28px" }}>
              <label
                htmlFor="login-password"
                style={{ fontFamily: DM, fontSize: "11px", fontWeight: 600, letterSpacing: "0.13em", textTransform: "uppercase", color: "#6f685d" }}
              >
                Password
              </label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField("")}
                  style={{ ...inputStyle(focusedField === "password"), paddingRight: "70px" }}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  style={{
                    position: "absolute",
                    right: "14px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: DM,
                    fontSize: "12px",
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: BURGUNDY,
                    padding: "6px",
                  }}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                role="alert"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "20px",
                  padding: "12px 14px",
                  borderRadius: "10px",
                  background: "rgba(122,28,28,0.07)",
                  border: "1px solid rgba(122,28,28,0.18)",
                  fontFamily: DM,
                  fontSize: "13px",
                  color: BURGUNDY,
                }}
              >
                <AlertCircle size={14} style={{ flexShrink: 0 }} />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              onMouseEnter={() => setHoverBtn(true)}
              onMouseLeave={() => setHoverBtn(false)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                width: "100%",
                padding: "17px",
                borderRadius: "10px",
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: DM,
                fontSize: "16px",
                fontWeight: 600,
                letterSpacing: "0.01em",
                color: "#faf8f5",
                background: loading ? "rgba(122,28,28,0.6)" : hoverBtn ? "#681717" : BURGUNDY,
                boxShadow: hoverBtn && !loading
                  ? "0 12px 28px -8px rgba(122,28,28,0.55)"
                  : "0 8px 20px -10px rgba(122,28,28,0.45)",
                transition: "background .15s, box-shadow .15s",
              }}
            >
              {loading
                ? <><Loader2 size={16} className="animate-spin" /> Signing in…</>
                : <><span>Sign in to Console</span><span style={{ fontSize: "18px", lineHeight: 1 }}>→</span></>
              }
            </button>
          </form>

          {/* Footer */}
          <p
            style={{
              fontFamily: DM,
              fontSize: "13px",
              lineHeight: 1.55,
              color: "#9a9388",
              textAlign: "center",
              margin: "26px 0 0",
            }}
          >
            Access is by invitation only. Contact Super Admin if you need help.
          </p>
        </div>
      </motion.div>
    </main>
  );
}
