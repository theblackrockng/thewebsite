import { useState, useEffect, useRef } from "react";

const IDLE_PIN = "2012";
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "wheel"];

// Screen lock shown after a period of inactivity. This is NOT the access
// control for the page — a valid Supabase Auth session already gates that.
// This only re-locks an unattended tablet; it never signs the user out.
export default function IdleLock({ children, idleMinutes = 5 }) {
  const [locked, setLocked] = useState(false);
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [error, setError] = useState(false);
  const timerRef = useRef(null);
  const inputRefs = useRef([]);

  useEffect(() => {
    function resetTimer() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setLocked(true), idleMinutes * 60 * 1000);
    }
    resetTimer();
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, resetTimer, { passive: true }));
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, resetTimer));
    };
  }, [idleMinutes]);

  useEffect(() => {
    if (locked) setTimeout(() => inputRefs.current[0]?.focus(), 100);
  }, [locked]);

  useEffect(() => {
    if (!locked || error || !digits.every((d) => d !== "")) return;
    const pin = digits.join("");
    if (pin === IDLE_PIN) {
      setLocked(false);
      setDigits(["", "", "", ""]);
      return;
    }
    setError(true);
    setTimeout(() => {
      setError(false);
      setDigits(["", "", "", ""]);
      setTimeout(() => inputRefs.current[0]?.focus(), 30);
    }, 480);
  }, [digits, error, locked]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!locked) return children;

  function handleChange(idx, raw) {
    const val = raw.slice(-1);
    if (!/^\d$/.test(val)) return;
    setDigits((prev) => { const next = [...prev]; next[idx] = val; return next; });
    if (idx < 3) setTimeout(() => inputRefs.current[idx + 1]?.focus(), 0);
  }

  function handleKeyDown(idx, e) {
    if (e.key === "Backspace") {
      if (!digits[idx] && idx > 0) {
        setDigits((prev) => { const n = [...prev]; n[idx - 1] = ""; return n; });
        inputRefs.current[idx - 1]?.focus();
      } else if (digits[idx]) {
        setDigits((prev) => { const n = [...prev]; n[idx] = ""; return n; });
      }
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "#0f0d0a",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
    }}>
      <div style={{
        background: "#1a1612", border: "1px solid #2e2820", borderRadius: 12,
        padding: 40, width: "100%", maxWidth: 360,
        display: "flex", flexDirection: "column", alignItems: "center",
      }}>
        <div style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 18, fontWeight: 700,
          letterSpacing: "4px", color: "#c8a96e", textTransform: "uppercase",
        }}>
          BLACKROCK
        </div>
        <h2 style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 22, fontWeight: 700,
          color: "#c8a96e", margin: "16px 0 6px", textAlign: "center",
        }}>
          Screen Locked
        </h2>
        <p style={{ fontSize: 12, color: "#666", margin: "0 0 28px", textAlign: "center", lineHeight: 1.5 }}>
          Enter the PIN to continue. Your sign-in is still active.
        </p>
        <div className={error ? "idle-lock-shake" : ""} style={{ display: "flex", gap: 12 }}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={d}
              autoComplete="off"
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              style={{
                width: 52, height: 60, background: "#2e2820",
                border: `1px solid ${error ? "#e74c3c" : "#3e3426"}`,
                borderRadius: 8, color: "#F5F0E8", fontSize: 24, fontWeight: 700,
                textAlign: "center", outline: "none", caretColor: "transparent",
                transition: "border-color 0.15s",
              }}
            />
          ))}
        </div>
      </div>
      <style>{`
        @keyframes idle-lock-shake {
          0%,100% { transform: translateX(0); }
          18%     { transform: translateX(-7px); }
          36%     { transform: translateX(7px); }
          54%     { transform: translateX(-5px); }
          72%     { transform: translateX(5px); }
          90%     { transform: translateX(-2px); }
        }
        .idle-lock-shake { animation: idle-lock-shake 0.45s ease; }
      `}</style>
    </div>
  );
}
