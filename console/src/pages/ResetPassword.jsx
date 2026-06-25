import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Loader2, AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { supabase } from "../lib/supabase";

const DM = "'DM Sans', system-ui, sans-serif";
const LORA = "'Lora', Georgia, serif";
const BURGUNDY = "#7a1c1c";

function inputStyle(focused) {
  return {
    fontFamily: DM, fontSize: "16px", color: "#1a1a1a",
    width: "100%", padding: "15px 16px", borderRadius: "10px",
    border: focused ? `1.5px solid ${BURGUNDY}` : "1.5px solid #e3ddd2",
    background: "#ffffff",
    boxShadow: focused ? "0 0 0 4px rgba(122,28,28,0.08)" : "none",
    transition: "border-color .15s, box-shadow .15s", outline: "none",
  };
}

export default function ResetPassword() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  const [ready, setReady]       = useState(false);
  const [isInvite, setIsInvite] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [showPwd, setShowPwd]   = useState(false);
  const [focused, setFocused]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(false);
  const [error, setError]       = useState("");

  useEffect(() => {
    // Detect invite vs password-reset from URL hash
    const hash = window.location.hash;
    const isInviteFlow = hash.includes("type=invite");
    if (isInviteFlow) setIsInvite(true);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    // Already have a session (e.g. Supabase processed the hash before this mounted)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setLoading(true);
    const { error: err } = await updatePassword(password);
    setLoading(false);
    if (err) { setError(err.message); return; }
    setDone(true);
    setTimeout(() => navigate("/"), 2500);
  };

  return (
    <main style={{
      minHeight: "100vh", width: "100%",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "32px",
      background: "#1a1a1a",
      backgroundImage: `linear-gradient(rgba(122,28,28,0.20), rgba(122,28,28,0.20)), url('/heroimage.png')`,
      backgroundSize: "cover", backgroundPosition: "center",
      fontFamily: DM,
    }}>
      <motion.div
        style={{ width: "100%", maxWidth: "452px" }}
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: shouldReduceMotion ? 0.15 : 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div style={{
          background: "#faf8f5", borderRadius: "27.5px",
          boxShadow: "0 30px 70px -20px rgba(0,0,0,0.7), 0 0 0 1px rgba(200,169,110,0.12)",
          padding: "48px 44px 36px", position: "relative", width: "100%", opacity: 0.93,
        }}>
          <p style={{ position: "absolute", top: "14px", left: 0, right: 0, textAlign: "center", margin: 0, fontFamily: DM, fontSize: "10px", fontWeight: 800, letterSpacing: "0.28em", textTransform: "uppercase", color: "#581919" }}>
            Admin Console
          </p>

          <div style={{ marginBottom: "34px" }}>
            <span style={{ fontFamily: LORA, fontWeight: 700, fontSize: "22px", letterSpacing: "0.14em", color: "#1a1a1a", display: "block" }}>BLACKROCK</span>
            <span style={{ fontFamily: DM, fontSize: "12px", color: "#9a9388", letterSpacing: "0.05em", marginTop: "3px", display: "block" }}>Restaurant &amp; Lounge</span>
          </div>

          {done ? (
            <div style={{ textAlign: "center", padding: "12px 0 28px" }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(122,28,28,0.08)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                <CheckCircle2 size={26} color={BURGUNDY} />
              </div>
              <h2 style={{ fontFamily: DM, fontSize: "22px", fontWeight: 700, color: "#1a1a1a", margin: "0 0 10px" }}>
                {isInvite ? "Account activated" : "Password updated"}
              </h2>
              <p style={{ fontFamily: DM, fontSize: "14px", color: "#9a9388", margin: 0, lineHeight: 1.6 }}>
                {isInvite ? "Your account is ready. Redirecting you to the dashboard…" : "You're all set. Redirecting you to the dashboard…"}
              </p>
            </div>
          ) : !ready ? (
            <div style={{ textAlign: "center", padding: "20px 0 28px" }}>
              <Loader2 size={22} color="#9a9388" style={{ animation: "spin 0.8s linear infinite", marginBottom: 14 }} />
              <p style={{ fontFamily: DM, fontSize: "14px", color: "#9a9388" }}>Verifying your reset link…</p>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: "28px" }}>
                <h1 style={{ fontFamily: DM, fontSize: "24px", fontWeight: 700, color: "#1a1a1a", margin: 0, letterSpacing: "-0.01em" }}>
                  {isInvite ? "Create your password" : "Set new password"}
                </h1>
                <p style={{ fontFamily: DM, fontSize: "14px", color: "#9a9388", margin: "6px 0 0" }}>
                  {isInvite ? "Welcome to BLACKROCK Admin. Set a password to activate your account." : "Choose a strong password for your account."}
                </p>
              </div>

              <form onSubmit={submit}>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "18px" }}>
                  <label style={{ fontFamily: DM, fontSize: "11px", fontWeight: 600, letterSpacing: "0.13em", textTransform: "uppercase", color: "#6f685d" }}>
                    New Password
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPwd ? "text" : "password"} required autoFocus
                      placeholder="At least 8 characters"
                      value={password} onChange={e => setPassword(e.target.value)}
                      onFocus={() => setFocused("pwd")} onBlur={() => setFocused("")}
                      style={{ ...inputStyle(focused === "pwd"), paddingRight: 50 }}
                      disabled={loading}
                    />
                    <button type="button" onClick={() => setShowPwd(v => !v)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9a9388", display: "flex" }}>
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px" }}>
                  <label style={{ fontFamily: DM, fontSize: "11px", fontWeight: 600, letterSpacing: "0.13em", textTransform: "uppercase", color: "#6f685d" }}>
                    Confirm Password
                  </label>
                  <input
                    type="password" required
                    placeholder="Repeat password"
                    value={confirm} onChange={e => setConfirm(e.target.value)}
                    onFocus={() => setFocused("confirm")} onBlur={() => setFocused("")}
                    style={inputStyle(focused === "confirm")}
                    disabled={loading}
                  />
                </div>

                {error && (
                  <div role="alert" style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "18px", padding: "12px 14px", borderRadius: "10px", background: "rgba(122,28,28,0.07)", border: "1px solid rgba(122,28,28,0.18)", fontFamily: DM, fontSize: "13px", color: BURGUNDY }}>
                    <AlertCircle size={14} style={{ flexShrink: 0 }} />{error}
                  </div>
                )}

                <button
                  type="submit" disabled={loading}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                    width: "100%", padding: "17px", borderRadius: "10px", border: "none",
                    cursor: loading ? "not-allowed" : "pointer",
                    fontFamily: DM, fontSize: "16px", fontWeight: 600,
                    color: "#faf8f5",
                    background: loading ? "rgba(122,28,28,0.6)" : BURGUNDY,
                    boxShadow: "0 8px 20px -10px rgba(122,28,28,0.45)",
                    transition: "background .15s",
                  }}
                >
                  {loading ? <><Loader2 size={16} className="animate-spin" /> Updating…</> : "Update Password"}
                </button>
              </form>
            </>
          )}
        </div>
      </motion.div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}
