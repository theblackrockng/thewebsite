import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { loginStaff, authHeader } from "../lib/staffAuth";
import IdleLock from "../components/IdleLock";
import WaiterShiftPicker from "./WaiterShiftPicker";
import WaiterOrder from "./WaiterOrder";

const WAITER_ROLES = ["waiter", "staff", "manager", "super_admin"];

export default function Waiter() {
  return <WaiterAuth />;
}

function WaiterAuth() {
  const [profile, setProfile] = useState(null);
  const [bootLoading, setBootLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  async function loadProfile(userId) {
    const { data } = await supabase
      .from("staff_profiles")
      .select("id, full_name, role")
      .eq("id", userId)
      .maybeSingle();
    if (data && WAITER_ROLES.includes(data.role)) {
      setProfile({ id: data.id, name: data.full_name || "Waiter", role: data.role });
      return true;
    }
    return false;
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) await loadProfile(session.user.id);
      setBootLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_e, session) => {
      if (session?.user) { await loadProfile(session.user.id); }
      else { setProfile(null); }
    });
    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!profile?.id) return;
    if (!window.Capacitor?.isNativePlatform()) return;
    (async () => {
      try {
        const PushNotifications = window.Capacitor.Plugins.PushNotifications;
        const perm = await PushNotifications.requestPermissions();
        if (perm.receive !== "granted") return;
        await PushNotifications.register();
        await PushNotifications.addListener("registration", async ({ value: token }) => {
          await fetch("/api/register-device", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(await authHeader()) },
            body: JSON.stringify({ role: "waiter", staff_id: profile.id, fcm_token: token }),
          });
        });
      } catch {}
    })();
  }, [profile?.id]);

  async function handleSignIn(e) {
    e.preventDefault();
    setError("");
    setSigningIn(true);
    try {
      const { error: loginErr } = await loginStaff(email.trim(), password);
      if (loginErr) { setError(loginErr); return; }
      const { data: { session } } = await supabase.auth.getSession();
      const valid = await loadProfile(session.user.id);
      if (!valid) {
        await supabase.auth.signOut();
        setError("Your account doesn't have waiter access. Contact your manager.");
      }
    } finally {
      setSigningIn(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setProfile(null);
    setEmail("");
    setPassword("");
  }

  if (bootLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0f0d0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 11, color: "#9C8E7A", letterSpacing: "0.2em", textTransform: "uppercase" }}>Loading…</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ minHeight: "100vh", background: "#0f0d0a", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <form onSubmit={handleSignIn} style={{ background: "#1a1612", border: "1px solid #2e2820", borderRadius: 14, padding: "40px 36px", width: "100%", maxWidth: 400, display: "flex", flexDirection: "column" }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17, fontWeight: 700, letterSpacing: "4px", color: "#c8a96e", textTransform: "uppercase", marginBottom: 6 }}>BLACKROCK</div>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 700, color: "#F5F0E8", margin: "0 0 6px" }}>Waiter Sign In</h2>
          <p style={{ fontSize: 13, color: "#9C8E7A", margin: "0 0 28px", lineHeight: 1.5 }}>Sign in with your staff account to start taking orders.</p>

          <label style={{ fontSize: 11, fontWeight: 600, color: "#9C8E7A", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>Email</label>
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@blackrock.com" required autoFocus
            style={{ background: "#251f19", border: "1px solid #3e3426", borderRadius: 7, padding: "12px 14px", fontSize: 14, color: "#F5F0E8", outline: "none", marginBottom: 16, fontFamily: "inherit" }}
          />

          <label style={{ fontSize: 11, fontWeight: 600, color: "#9C8E7A", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>Password</label>
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••" required
            style={{ background: "#251f19", border: "1px solid #3e3426", borderRadius: 7, padding: "12px 14px", fontSize: 14, color: "#F5F0E8", outline: "none", marginBottom: error ? 14 : 24, fontFamily: "inherit" }}
          />

          {error && (
            <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 7, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#ef4444", lineHeight: 1.5 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={signingIn || !email.trim() || !password}
            style={{
              padding: "14px 20px", borderRadius: 7, border: "none",
              background: (signingIn || !email.trim() || !password) ? "#2e2820" : "#c8a96e",
              color: (signingIn || !email.trim() || !password) ? "#5a4e46" : "#0f0d0a",
              fontSize: 13, fontWeight: 700, cursor: (signingIn || !email.trim() || !password) ? "not-allowed" : "pointer",
              fontFamily: "inherit", letterSpacing: "0.04em",
            }}
          >
            {signingIn ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <IdleLock idleMinutes={5}>
      <WaiterInner onSignOut={handleSignOut} />
    </IdleLock>
  );
}

function WaiterInner({ onSignOut }) {
  const [activeWaiter, setActiveWaiter] = useState(null);
  if (!activeWaiter) {
    return <WaiterShiftPicker onSelect={setActiveWaiter} onSignOut={onSignOut} />;
  }
  return <WaiterOrder waiterName={activeWaiter} onSwitchWaiter={() => setActiveWaiter(null)} />;
}
