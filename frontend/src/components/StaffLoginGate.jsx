import { createContext, useContext, useState, useEffect, useRef } from "react";
import { LogOut } from "lucide-react";
import { supabase } from "../lib/supabase";
import { loginStaff, loadStaffProfile, signOutStaff } from "../lib/staffAuth";
import IdleLock from "./IdleLock";

const StaffSessionContext = createContext(null);

// Lets a screen wrapped in StaffLoginGate read the signed-in profile and
// sign out, without prop-drilling through the gate.
export function useStaffSession() {
  return useContext(StaffSessionContext);
}

// Real Supabase Auth login gate for staff-facing displays (Kitchen, Bar,
// Front Desk). Replaces the old client-side PinGate. A PIN still exists,
// but only as the IdleLock re-lock screen rendered once a session is
// established — it is never the access control.
export default function StaffLoginGate({ children, allowedRoles, title, idleMinutes = 5, renderSignedOut }) {
  const [booting, setBooting] = useState(true);
  const [profile, setProfile] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [lost, setLost] = useState(false);
  const signedInRef = useRef(false);
  const manualOutRef = useRef(false);
  const wantsLostRef = useRef(Boolean(renderSignedOut));

  useEffect(() => {
    let mounted = true;

    async function bootstrap(session) {
      if (session?.user) {
        const p = await loadStaffProfile(session.user.id);
        if (!mounted) return;
        // A failed profile lookup on a token refresh must not sign an already signed-in screen out.
        if (p || !signedInRef.current) setProfile(p);
        if (p) signedInRef.current = true;
      } else if (mounted) {
        // Only a session that disappeared without the user pressing Sign Out counts as lost.
        if (signedInRef.current && !manualOutRef.current && wantsLostRef.current) setLost(true);
        signedInRef.current = false;
        manualOutRef.current = false;
        setProfile(null);
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => bootstrap(session).finally(() => {
      if (mounted) setBooting(false);
    }));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      bootstrap(session);
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  async function handleSignIn(e) {
    e.preventDefault();
    setError("");
    setLost(false);
    setSigningIn(true);
    try {
      const { error: err, profile: p } = await loginStaff(email.trim(), password);
      if (err) { setError(err); return; }
      signedInRef.current = true;
      setProfile(p);
    } finally {
      setSigningIn(false);
    }
  }

  async function handleSignOut() {
    manualOutRef.current = true;
    await signOutStaff();
    manualOutRef.current = false;
    signedInRef.current = false;
    setLost(false);
    setProfile(null);
    setEmail("");
    setPassword("");
  }

  if (booting) {
    return (
      <div style={{ minHeight: "100vh", background: "#0f0d0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 11, color: "#9C8E7A", letterSpacing: "0.2em", textTransform: "uppercase" }}>Loading…</div>
      </div>
    );
  }

  if (!profile && lost && renderSignedOut) {
    return renderSignedOut({ onSignIn: () => setLost(false) });
  }

  if (!profile) {
    return (
      <LoginForm
        title={title}
        email={email} setEmail={setEmail}
        password={password} setPassword={setPassword}
        error={error} signingIn={signingIn}
        onSubmit={handleSignIn}
      />
    );
  }

  const authorized = profile.active !== false && (profile.role === "super_admin" || allowedRoles.includes(profile.role));
  if (!authorized) {
    return <AccessDenied onSignOut={handleSignOut} />;
  }

  return (
    <StaffSessionContext.Provider value={{ profile, signOut: handleSignOut }}>
      <IdleLock idleMinutes={idleMinutes}>{children}</IdleLock>
    </StaffSessionContext.Provider>
  );
}

function LoginForm({ title, email, setEmail, password, setPassword, error, signingIn, onSubmit }) {
  return (
    <div style={{ minHeight: "100vh", background: "#0f0d0a", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <form onSubmit={onSubmit} style={{ background: "#1a1612", border: "1px solid #2e2820", borderRadius: 14, padding: "40px 36px", width: "100%", maxWidth: 400, display: "flex", flexDirection: "column" }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17, fontWeight: 700, letterSpacing: "4px", color: "#c8a96e", textTransform: "uppercase", marginBottom: 6 }}>BLACKROCK</div>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 700, color: "#F5F0E8", margin: "0 0 6px" }}>{title} Sign In</h2>
        <p style={{ fontSize: 13, color: "#9C8E7A", margin: "0 0 28px", lineHeight: 1.5 }}>Sign in with your staff account to continue.</p>

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

function AccessDenied({ onSignOut }) {
  return (
    <div style={{ minHeight: "100vh", background: "#0f0d0a", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#1a1612", border: "1px solid #2e2820", borderRadius: 14, padding: "40px 36px", width: "100%", maxWidth: 400, textAlign: "center" }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: "#F5F0E8", margin: "0 0 10px" }}>Access Denied</h2>
        <p style={{ fontSize: 13, color: "#9C8E7A", margin: "0 0 24px", lineHeight: 1.5 }}>Your account does not have access to this display. Contact your Super Admin if you believe this is a mistake.</p>
        <button
          onClick={onSignOut}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "transparent", border: "1px solid #2e2820", borderRadius: 7, padding: "10px 20px", color: "#9C8E7A", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
        >
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </div>
  );
}
