import { useState, useEffect, useCallback } from "react";
import { authHeader } from "../lib/staffAuth";
import { LogOut, Delete } from "lucide-react";

export default function WaiterShiftPicker({ onSelect, onSignOut }) {
  const [waiters, setWaiters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // { id, name }
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/waiter-profiles", { headers: await authHeader() });
        const data = await res.json();
        setWaiters(data.waiters || []);
      } catch {
        setWaiters([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const verifyPin = useCallback(async (waiter, pinVal) => {
    setVerifying(true);
    setError("");
    try {
      const res = await fetch("/api/verify-waiter-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ id: waiter.id, pin: pinVal }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        onSelect(waiter.name);
      } else {
        setPin("");
        setError(res.status === 429 ? (data.error || "Too many attempts.") : "Incorrect PIN. Try again.");
      }
    } catch {
      setPin("");
      setError("Connection error. Try again.");
    } finally {
      setVerifying(false);
    }
  }, [onSelect]);

  function pressDigit(d) {
    if (verifying || pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    setError("");
    if (next.length === 4) verifyPin(selected, next);
  }

  function backspace() {
    if (verifying) return;
    setPin(p => p.slice(0, -1));
    setError("");
  }

  const s = {
    page: { minHeight: "100vh", background: "#0f0d0a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 20px", fontFamily: "'DM Sans', 'Montserrat', sans-serif" },
    card: { width: "100%", maxWidth: 480, background: "#1a1612", border: "1px solid #2e2820", borderRadius: 16, padding: "36px 32px", display: "flex", flexDirection: "column", gap: 24 },
    eyebrow: { fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 16, fontWeight: 700, letterSpacing: "3px", color: "#c8a96e", textTransform: "uppercase", marginBottom: 2 },
    heading: { fontSize: 22, fontWeight: 700, color: "#F5F0E8", lineHeight: 1.2 },
    sub: { fontSize: 13, color: "#9C8E7A", marginTop: 4 },
  };

  /* Name picker */
  if (!selected) {
    return (
      <div style={s.page}>
        <div style={s.card}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <div style={s.eyebrow}>BLACKROCK</div>
              <div style={s.heading}>Who's taking orders?</div>
              <div style={s.sub}>Select your name to begin your shift.</div>
            </div>
            <button
              onClick={onSignOut}
              style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", border: "1px solid #2e2820", borderRadius: 6, padding: "6px 12px", color: "#9C8E7A", fontSize: 12, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}
            >
              <LogOut size={12} /> Sign Out
            </button>
          </div>

          {/* Waiter buttons */}
          {loading ? (
            <div style={{ textAlign: "center", color: "#9C8E7A", fontSize: 13, padding: "20px 0" }}>Loading…</div>
          ) : waiters.length === 0 ? (
            <div style={{ textAlign: "center", color: "#9C8E7A", fontSize: 13, padding: "20px 0", background: "#251f19", borderRadius: 10, border: "1px solid #2e2820" }}>
              No waiter profiles set up yet.<br />
              <span style={{ fontSize: 12, opacity: 0.7 }}>Ask a super admin to add profiles in the console.</span>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 12 }}>
              {waiters.map(w => (
                <button
                  key={w.id}
                  onClick={() => { setSelected(w); setPin(""); setError(""); }}
                  style={{
                    padding: "22px 14px",
                    background: "#251f19",
                    border: "1px solid #2e2820",
                    borderRadius: 10,
                    color: "#F5F0E8",
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "background 0.15s, border-color 0.15s",
                    textAlign: "center",
                    letterSpacing: "0.02em",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#2e2620"; e.currentTarget.style.borderColor = "#c8a96e"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#251f19"; e.currentTarget.style.borderColor = "#2e2820"; }}
                >
                  {w.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* PIN entry */
  const PAD = ["1","2","3","4","5","6","7","8","9","","0","⌫"];

  return (
    <div style={s.page}>
      <div style={{ ...s.card, maxWidth: 360 }}>
        {/* Header */}
        <div>
          <div style={s.eyebrow}>BLACKROCK</div>
          <div style={s.heading}>Enter your PIN</div>
          <div style={s.sub}>{selected.name}</div>
        </div>

        {/* Dot indicators */}
        <div style={{ display: "flex", gap: 14, justifyContent: "center", padding: "8px 0" }}>
          {[0,1,2,3].map(i => (
            <div
              key={i}
              style={{
                width: 16, height: 16, borderRadius: "50%",
                background: i < pin.length ? "#c8a96e" : "transparent",
                border: `2px solid ${i < pin.length ? "#c8a96e" : "#3e3426"}`,
                transition: "background 0.1s, border-color 0.1s",
              }}
            />
          ))}
        </div>

        {/* Error message */}
        {error && (
          <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 7, padding: "10px 14px", fontSize: 13, color: "#ef4444", textAlign: "center" }}>
            {error}
          </div>
        )}

        {/* Number pad */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {PAD.map((key, idx) => {
            if (key === "") return <div key={idx} />;
            const isBack = key === "⌫";
            return (
              <button
                key={idx}
                onClick={() => isBack ? backspace() : pressDigit(key)}
                disabled={verifying || (!isBack && pin.length >= 4)}
                style={{
                  height: 64,
                  borderRadius: 10,
                  border: "1px solid #2e2820",
                  background: isBack ? "transparent" : "#251f19",
                  color: isBack ? "#9C8E7A" : "#F5F0E8",
                  fontSize: isBack ? 16 : 22,
                  fontWeight: 600,
                  cursor: (verifying || (!isBack && pin.length >= 4)) ? "default" : "pointer",
                  opacity: verifying ? 0.5 : 1,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "inherit",
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => { if (!verifying) e.currentTarget.style.background = isBack ? "rgba(200,169,110,0.06)" : "#2e2620"; }}
                onMouseLeave={e => { e.currentTarget.style.background = isBack ? "transparent" : "#251f19"; }}
              >
                {isBack ? <Delete size={18} /> : key}
              </button>
            );
          })}
        </div>

        {/* Back link */}
        <button
          onClick={() => { setSelected(null); setPin(""); setError(""); }}
          style={{ background: "none", border: "none", color: "#9C8E7A", fontSize: 13, cursor: "pointer", fontFamily: "inherit", textAlign: "center", padding: "4px 0" }}
        >
          ← Back to waiter list
        </button>
      </div>
    </div>
  );
}
