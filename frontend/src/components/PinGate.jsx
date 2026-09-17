import { useState, useEffect, useRef } from "react";

const CORRECT = "2012";
const MAX_ATTEMPTS = 3;

export default function PinGate({ storageKey = "default", children }) {
  const [unlocked, setUnlocked] = useState(() => {
    try { return sessionStorage.getItem(`br_pin_${storageKey}`) === "1"; } catch { return false; }
  });
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [error, setError] = useState(false);
  const attemptsRef = useRef(0);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (!unlocked) setTimeout(() => inputRefs.current[0]?.focus(), 100);
  }, [unlocked]);

  useEffect(() => {
    if (error || !digits.every((d) => d !== "")) return;
    const pin = digits.join("");
    if (pin === CORRECT) {
      try { sessionStorage.setItem(`br_pin_${storageKey}`, "1"); } catch {}
      setUnlocked(true);
      return;
    }
    attemptsRef.current += 1;
    setError(true);
    setTimeout(() => {
      setError(false);
      setDigits(["", "", "", ""]);
      setTimeout(() => inputRefs.current[0]?.focus(), 30);
    }, 480);
  }, [digits, error, storageKey]); // eslint-disable-line react-hooks/exhaustive-deps

  if (unlocked) return children;

  function handleChange(idx, raw) {
    const val = raw.slice(-1);
    if (!/^\d$/.test(val)) return;
    setDigits((prev) => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
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
      minHeight: "100vh",
      background: "#0f0d0a",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    }}>
      <div style={{
        background: "#1a1612",
        border: "1px solid #2e2820",
        borderRadius: 12,
        padding: 40,
        width: "100%",
        maxWidth: 360,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}>
        <div style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: "4px",
          color: "#c8a96e",
          textTransform: "uppercase",
        }}>
          BLACKROCK
        </div>
        <h2 style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: 22,
          fontWeight: 700,
          color: "#c8a96e",
          margin: "16px 0 6px",
          textAlign: "center",
        }}>
          Access Required
        </h2>
        <p style={{ fontSize: 12, color: "#666", margin: "0 0 28px", textAlign: "center", lineHeight: 1.5 }}>
          Enter your access code to continue.
        </p>
        <div className={error ? "pin-row-shake" : ""} style={{ display: "flex", gap: 12 }}>
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
                width: 52,
                height: 60,
                background: "#2e2820",
                border: `1px solid ${error ? "#e74c3c" : "#3e3426"}`,
                borderRadius: 8,
                color: "#F5F0E8",
                fontSize: 24,
                fontWeight: 700,
                textAlign: "center",
                outline: "none",
                caretColor: "transparent",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => {
                if (!error) {
                  e.target.style.borderColor = "#c8a96e";
                  e.target.style.boxShadow = "0 0 0 2px rgba(200,169,110,0.18)";
                }
              }}
              onBlur={(e) => {
                e.target.style.borderColor = error ? "#e74c3c" : "#3e3426";
                e.target.style.boxShadow = "none";
              }}
            />
          ))}
        </div>
      </div>
      <style>{`
        @keyframes pin-shake {
          0%,100% { transform: translateX(0); }
          18%     { transform: translateX(-7px); }
          36%     { transform: translateX(7px); }
          54%     { transform: translateX(-5px); }
          72%     { transform: translateX(5px); }
          90%     { transform: translateX(-2px); }
        }
        .pin-row-shake { animation: pin-shake 0.45s ease; }
      `}</style>
    </div>
  );
}
