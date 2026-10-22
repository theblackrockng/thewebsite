import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "../../lib/supabase";
import { authHeader } from "../../lib/authHeader";
import { useStaff } from "../../context/StaffContext";
import { KeyRound, ShieldCheck, Users, Check, X } from "lucide-react";

const IMPLICIT_ROLES = new Set(["super_admin", "manager", "front_desk"]);

function Section({ title, icon: Icon, children, right, note }) {
  return (
    <div style={{
      background: "var(--ds-surface)",
      border: "1px solid var(--ds-border)",
      borderRadius: 10, overflow: "hidden",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "14px 20px", borderBottom: "1px solid var(--ds-border)",
        background: "var(--ds-sidebar)",
      }}>
        <Icon size={14} strokeWidth={1.75} style={{ color: "var(--ds-gold)", flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--ds-text)" }}>
          {title}
        </span>
        {right && <div style={{ marginLeft: "auto" }}>{right}</div>}
      </div>
      {note ? (
        <div style={{ padding: "10px 20px", fontSize: 12, color: "var(--ds-muted)", background: "var(--ds-input-bg)", borderBottom: "1px solid var(--ds-border)" }}>
          {note}
        </div>
      ) : null}
      <div style={{ padding: "20px" }}>{children}</div>
    </div>
  );
}

function Toast({ msg, ok }) {
  if (!msg) return null;
  return (
    <div style={{
      position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
      background: ok ? "#166534" : "#991b1b", color: "#fff",
      padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600,
      boxShadow: "0 6px 24px rgba(0,0,0,0.18)", zIndex: 9998, whiteSpace: "nowrap",
    }}>{msg}</div>
  );
}

const inputStyle = {
  width: "100%", padding: "8px 11px",
  background: "var(--ds-input-bg)", border: "1px solid var(--ds-border)",
  borderRadius: 7, fontSize: 13, color: "var(--ds-text)",
  fontFamily: "'DM Sans', sans-serif", outline: "none",
};

function StaffRow({ s, onToggleAccess, onSetPin, onClearPin, busy }) {
  const [pin, setPin] = useState("");
  const [pinOpen, setPinOpen] = useState(false);

  const implicit = IMPLICIT_ROLES.has(s.role);
  const hasAccess = implicit || !!s.can_manage_guesthouse || s.role === "guesthouse";
  const hasPin = !!s.guesthouse_pin_hash;

  async function savePin() {
    if (!/^\d{4,8}$/.test(pin)) {
      alert("PIN must be 4-8 digits.");
      return;
    }
    const ok = await onSetPin(s.id, pin);
    if (ok) { setPin(""); setPinOpen(false); }
  }

  return (
    <div style={{
      padding: "14px 0",
      borderBottom: "1px solid var(--ds-border)",
      display: "grid", gap: 10,
    }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", alignItems: "center", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ds-text)" }}>
            {s.full_name || s.email}
          </div>
          <div style={{ fontSize: 12, color: "var(--ds-muted)" }}>
            {s.email}{s.role ? ` · ${s.role.replace("_", " ")}` : ""}
          </div>
        </div>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700,
          background: hasAccess ? "rgba(22,101,52,0.14)" : "transparent",
          border: hasAccess ? "none" : "1px solid var(--ds-border)",
          color: hasAccess ? "#16a34a" : "var(--ds-muted)",
          letterSpacing: 0.5, textTransform: "uppercase",
        }}
          title={implicit ? `Role '${s.role}' always has guest house access` : (hasAccess ? "Can authorize guest house actions" : "No guest house access")}
        >
          {hasAccess ? <Check size={11} /> : <X size={11} />}
          {implicit ? "Implicit" : (hasAccess ? "Access" : "No access")}
        </div>
        {implicit ? (
          <span style={{ fontSize: 11, color: "var(--ds-muted)", fontStyle: "italic" }}>granted by role</span>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => onToggleAccess(s)}
            style={{
              padding: "6px 12px", borderRadius: 7, border: "1px solid var(--ds-border)",
              background: s.can_manage_guesthouse ? "transparent" : "var(--ds-gold)",
              color: s.can_manage_guesthouse ? "var(--ds-muted)" : "#1a1008",
              fontSize: 12, fontWeight: 700, cursor: busy ? "default" : "pointer",
            }}
            title={s.can_manage_guesthouse ? "Revoke guest house access" : "Grant guest house access"}
          >
            {s.can_manage_guesthouse ? "Revoke access" : "Grant access"}
          </button>
        )}
      </div>

      {hasAccess ? (
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", alignItems: "center", gap: 10, paddingLeft: 2 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ds-muted)" }}>
            <KeyRound size={12} />
            {hasPin ? <span style={{ color: "#16a34a", fontWeight: 700 }}>PIN set</span> : <span style={{ color: "var(--ds-accent, #d97706)", fontWeight: 700 }}>No PIN</span>}
          </div>
          {pinOpen ? (
            <input
              type="password"
              inputMode="numeric"
              autoFocus
              placeholder={hasPin ? "Enter new PIN (4–8 digits)" : "Set a 4–8 digit PIN"}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
              style={{ ...inputStyle, letterSpacing: "0.3em" }}
            />
          ) : <div />}
          <div style={{ display: "inline-flex", gap: 6 }}>
            {pinOpen ? (
              <>
                <button
                  type="button"
                  disabled={busy || pin.length < 4}
                  onClick={savePin}
                  style={{ padding: "6px 12px", borderRadius: 7, border: "none", background: "var(--ds-gold)", color: "#1a1008", fontSize: 12, fontWeight: 700, cursor: busy ? "default" : "pointer", opacity: pin.length < 4 ? 0.5 : 1 }}
                >
                  Save
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => { setPinOpen(false); setPin(""); }}
                  style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid var(--ds-border)", background: "transparent", color: "var(--ds-muted)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setPinOpen(true)}
                  style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid var(--ds-border)", background: "transparent", color: "var(--ds-text)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                >
                  {hasPin ? "Rotate PIN" : "Set PIN"}
                </button>
                {hasPin ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onClearPin(s.id)}
                    style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid var(--ds-border)", background: "transparent", color: "#991b1b", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                  >
                    Clear
                  </button>
                ) : null}
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StaffPanel({ notify }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [onlyAccess, setOnlyAccess] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("staff_profiles")
      .select("id, full_name, email, role, active, can_manage_guesthouse, guesthouse_pin_hash")
      .eq("active", true)
      .order("full_name", { ascending: true });
    if (error) {
      notify(error.message || "Could not load staff", false);
      setRows([]);
    } else {
      setRows(data || []);
    }
    setLoading(false);
  }, [notify]);

  useEffect(() => { load(); }, [load]);

  async function callUpdate(payload) {
    const res = await fetch("/api/update-staff", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      notify(json.error || "Update failed", false);
      return false;
    }
    return true;
  }

  async function toggleAccess(s) {
    setBusy(true);
    const next = !s.can_manage_guesthouse;
    const ok = await callUpdate({ userId: s.id, can_manage_guesthouse: next });
    setBusy(false);
    if (ok) { notify(next ? "Access granted" : "Access revoked"); load(); }
  }

  async function setPin(id, pin) {
    setBusy(true);
    const ok = await callUpdate({ userId: id, guesthouse_pin: pin });
    setBusy(false);
    if (ok) { notify("PIN saved"); load(); }
    return ok;
  }

  async function clearPin(id) {
    if (!window.confirm("Clear this staff member's guest house PIN?")) return;
    setBusy(true);
    const ok = await callUpdate({ userId: id, guesthouse_pin: null });
    setBusy(false);
    if (ok) { notify("PIN cleared"); load(); }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((s) => {
      if (q) {
        const hay = `${s.full_name || ""} ${s.email || ""} ${s.role || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (onlyAccess) {
        const hasAccess = IMPLICIT_ROLES.has(s.role) || !!s.can_manage_guesthouse || s.role === "guesthouse";
        if (!hasAccess) return false;
      }
      return true;
    });
  }, [rows, query, onlyAccess]);

  const accessCount = rows.filter((s) => IMPLICIT_ROLES.has(s.role) || s.can_manage_guesthouse || s.role === "guesthouse").length;

  return (
    <Section
      title={`Staff with guest house access (${accessCount})`}
      icon={Users}
      note="Roles super_admin, manager, and front_desk always have guest house access (implicit). For any other staff, grant access here and set a 4–8 digit PIN they will type at the Front Desk screen for check-in, check-out, encode-key, and mark-paid actions."
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center", marginBottom: 10 }}>
        <input
          placeholder="Search by name, email, or role"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={inputStyle}
        />
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ds-muted)", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={onlyAccess}
            onChange={(e) => setOnlyAccess(e.target.checked)}
          />
          Only with access
        </label>
      </div>
      {loading ? (
        <div style={{ padding: 24, textAlign: "center", color: "var(--ds-muted)" }}>Loading staff…</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 24, textAlign: "center", color: "var(--ds-muted)", fontStyle: "italic" }}>
          No staff match this filter.
        </div>
      ) : (
        filtered.map((s) => (
          <StaffRow
            key={s.id}
            s={s}
            busy={busy}
            onToggleAccess={toggleAccess}
            onSetPin={setPin}
            onClearPin={clearPin}
          />
        ))
      )}
    </Section>
  );
}

export default function Guesthouse() {
  const { profile } = useStaff();
  const role = profile?.role;
  const authorized = role === "super_admin" || role === "manager";

  const [toast, setToast] = useState({ msg: "", ok: true });

  const notify = useCallback((msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast({ msg: "", ok: true }), 2500);
  }, []);

  if (!authorized) {
    return (
      <div style={{ padding: 24, color: "var(--ds-muted)" }}>
        Guest house settings can only be edited by a super_admin or manager.
      </div>
    );
  }

  return (
    <div style={{ padding: 24, display: "grid", gap: 16, maxWidth: 920 }}>
      <div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 700, margin: "0 0 4px", color: "var(--ds-text)" }}>
          Guest House
        </h1>
        <p style={{ fontSize: 13, color: "var(--ds-muted)", margin: 0 }}>
          Assign which staff can authorize guest house actions on the Front Desk screen and
          manage their PINs. Day-to-day check-in / check-out, guest history, and room setup live
          on the Front Desk screen.
        </p>
      </div>

      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 8, background: "var(--ds-input-bg)", border: "1px solid var(--ds-border)", width: "fit-content" }}>
        <ShieldCheck size={14} style={{ color: "var(--ds-gold)" }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ds-text)" }}>Staff &amp; PINs</span>
      </div>

      <StaffPanel notify={notify} />

      <Toast msg={toast.msg} ok={toast.ok} />
    </div>
  );
}
