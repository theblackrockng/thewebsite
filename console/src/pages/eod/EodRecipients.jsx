import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { useStaff } from "../../context/StaffContext";
import { Mail, Send, Plus, Trash2, Loader, Check, X } from "lucide-react";

const MODES = [
  { value: "full",    label: "Full report" },
  { value: "kitchen", label: "Kitchen only" },
];

const KIND_LABELS = {
  email:    "Email",
  telegram: "Telegram",
};

function Section({ title, icon: Icon, children, right }) {
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

function AddForm({ onAdd, saving }) {
  const [kind, setKind] = useState("email");
  const [value, setValue] = useState("");
  const [label, setLabel] = useState("");
  const [phone, setPhone] = useState("");
  const [mode, setMode] = useState("full");

  function reset() {
    setValue(""); setLabel(""); setPhone(""); setMode("full"); setKind("email");
  }

  async function submit(e) {
    e.preventDefault();
    if (!value.trim()) return;
    if (kind === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
      alert("Enter a valid email address.");
      return;
    }
    if (kind === "telegram" && !/^-?\d+$/.test(value.trim())) {
      alert("Telegram chat_id must be numeric (ask the bot for it; see the help text below).");
      return;
    }
    const ok = await onAdd({
      kind,
      value: value.trim(),
      label: label.trim() || null,
      phone: kind === "telegram" ? (phone.trim() || null) : null,
      mode,
    });
    if (ok) reset();
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 10, alignItems: "center" }}>
        <label style={{ fontSize: 12.5, color: "var(--ds-muted)" }}>Channel</label>
        <select value={kind} onChange={(e) => setKind(e.target.value)} style={inputStyle}>
          <option value="email">Email</option>
          <option value="telegram">Telegram (chat ID)</option>
        </select>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 10, alignItems: "center" }}>
        <label style={{ fontSize: 12.5, color: "var(--ds-muted)" }}>
          {kind === "email" ? "Email address" : "Telegram chat ID"}
        </label>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={kind === "email" ? "name@example.com" : "e.g. 123456789"}
          style={inputStyle}
          required
        />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 10, alignItems: "center" }}>
        <label style={{ fontSize: 12.5, color: "var(--ds-muted)" }}>Label</label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Chef Pius"
          style={inputStyle}
        />
      </div>
      {kind === "telegram" && (
        <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 10, alignItems: "center" }}>
          <label style={{ fontSize: 12.5, color: "var(--ds-muted)" }}>Phone (reference)</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+2348069192237"
            style={inputStyle}
          />
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 10, alignItems: "center" }}>
        <label style={{ fontSize: 12.5, color: "var(--ds-muted)" }}>Mode</label>
        <select value={mode} onChange={(e) => setMode(e.target.value)} style={inputStyle}>
          {MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="submit"
          disabled={saving || !value.trim()}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "9px 18px", borderRadius: 7, border: "none",
            background: saving ? "var(--ds-border)" : "var(--ds-gold)",
            color: saving ? "var(--ds-muted)" : "#1a1008",
            fontSize: 13, fontWeight: 600, cursor: saving ? "default" : "pointer",
          }}
        >
          {saving ? <Loader size={13} className="spin" /> : <Plus size={13} />}
          Add recipient
        </button>
      </div>
    </form>
  );
}

function RecipientRow({ r, onToggle, onDelete, busy }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "90px 1fr 110px 90px 32px",
      alignItems: "center", gap: 10, padding: "10px 0",
      borderBottom: "1px solid var(--ds-border)",
    }}>
      <div style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700,
        background: r.kind === "email" ? "rgba(59,130,246,0.12)" : "rgba(201,168,76,0.14)",
        color:      r.kind === "email" ? "#2563eb" : "#C9A84C",
        letterSpacing: 0.5, textTransform: "uppercase",
      }}>
        {KIND_LABELS[r.kind] || r.kind}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ds-text)", wordBreak: "break-all" }}>{r.value}</div>
        <div style={{ fontSize: 12, color: "var(--ds-muted)" }}>
          {r.label || <span style={{ fontStyle: "italic" }}>No label</span>}
          {r.phone ? ` · ${r.phone}` : ""}
        </div>
      </div>
      <div style={{ fontSize: 12, color: "var(--ds-muted)" }}>
        {MODES.find((m) => m.value === r.mode)?.label || r.mode}
      </div>
      <div>
        <button
          type="button"
          onClick={() => onToggle(r)}
          disabled={busy}
          style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "4px 10px", borderRadius: 999, border: "1px solid var(--ds-border)",
            fontSize: 11, fontWeight: 700, cursor: busy ? "default" : "pointer",
            background: r.active ? "rgba(22,101,52,0.14)" : "transparent",
            color: r.active ? "#16a34a" : "var(--ds-muted)",
          }}
          title={r.active ? "Click to pause" : "Click to re-enable"}
        >
          {r.active ? <Check size={11} /> : <X size={11} />}
          {r.active ? "Active" : "Paused"}
        </button>
      </div>
      <button
        type="button"
        onClick={() => onDelete(r)}
        disabled={busy}
        title="Remove recipient"
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 28, height: 28, borderRadius: 7,
          border: "1px solid var(--ds-border)", background: "transparent",
          color: "#991b1b", cursor: busy ? "default" : "pointer",
        }}
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

export default function EodRecipients() {
  const { profile } = useStaff();
  const role = profile?.role;
  const authorized = role === "super_admin" || role === "manager";

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState({ msg: "", ok: true });

  const notify = useCallback((msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast({ msg: "", ok: true }), 2500);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("eod_recipients")
      .select("*")
      .order("kind", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) {
      console.error(error);
      notify(error.message || "Could not load recipients", false);
      setRows([]);
    } else {
      setRows(data || []);
    }
    setLoading(false);
  }, [notify]);

  useEffect(() => {
    if (authorized) load();
  }, [authorized, load]);

  async function handleAdd(payload) {
    setBusy(true);
    const { error } = await supabase.from("eod_recipients").insert({
      ...payload,
      created_by: profile?.email || profile?.full_name || null,
    });
    setBusy(false);
    if (error) {
      notify(error.code === "23505" ? "That recipient is already in the list." : error.message, false);
      return false;
    }
    notify("Recipient added");
    load();
    return true;
  }

  async function handleToggle(r) {
    setBusy(true);
    const { error } = await supabase
      .from("eod_recipients")
      .update({ active: !r.active })
      .eq("id", r.id);
    setBusy(false);
    if (error) { notify(error.message, false); return; }
    notify(r.active ? "Recipient paused" : "Recipient re-enabled");
    load();
  }

  async function handleDelete(r) {
    if (!window.confirm(`Remove ${r.kind} recipient "${r.value}"?`)) return;
    setBusy(true);
    const { error } = await supabase.from("eod_recipients").delete().eq("id", r.id);
    setBusy(false);
    if (error) { notify(error.message, false); return; }
    notify("Recipient removed");
    load();
  }

  if (!authorized) {
    return (
      <div style={{ padding: 24, color: "var(--ds-muted)" }}>
        EOD Recipients can only be edited by a super_admin or manager.
      </div>
    );
  }

  const emailRows = rows.filter((r) => r.kind === "email");
  const telegramRows = rows.filter((r) => r.kind === "telegram");

  return (
    <div style={{ padding: 24, display: "grid", gap: 16, maxWidth: 920 }}>
      <div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 700, margin: "0 0 4px", color: "var(--ds-text)" }}>
          EOD Recipients
        </h1>
        <p style={{ fontSize: 13, color: "var(--ds-muted)", margin: 0 }}>
          Who gets the 6am End of Day email and Telegram message. Changes take effect from the next cron run.
        </p>
      </div>

      <Section title="Add recipient" icon={Plus}>
        <AddForm onAdd={handleAdd} saving={busy} />
        <div style={{ marginTop: 14, padding: "10px 12px", background: "var(--ds-input-bg)", borderRadius: 7, fontSize: 12, color: "var(--ds-muted)", lineHeight: 1.5 }}>
          <strong style={{ color: "var(--ds-text)" }}>Finding a Telegram chat ID:</strong>{" "}
          Ask the person to open our bot in Telegram and send <code>/start</code>. Then message{" "}
          <code>@userinfobot</code> from the same account — it replies with the chat ID (a number
          like <code>123456789</code>). Paste that number here.
        </div>
      </Section>

      <Section title={`Email recipients (${emailRows.length})`} icon={Mail}>
        {loading ? (
          <div style={{ padding: 20, textAlign: "center", color: "var(--ds-muted)" }}>Loading…</div>
        ) : emailRows.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", color: "var(--ds-muted)", fontStyle: "italic" }}>
            No email recipients configured.
          </div>
        ) : (
          emailRows.map((r) => (
            <RecipientRow key={r.id} r={r} onToggle={handleToggle} onDelete={handleDelete} busy={busy} />
          ))
        )}
      </Section>

      <Section title={`Telegram recipients (${telegramRows.length})`} icon={Send}>
        {loading ? (
          <div style={{ padding: 20, textAlign: "center", color: "var(--ds-muted)" }}>Loading…</div>
        ) : telegramRows.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", color: "var(--ds-muted)", fontStyle: "italic" }}>
            No Telegram recipients configured.
          </div>
        ) : (
          telegramRows.map((r) => (
            <RecipientRow key={r.id} r={r} onToggle={handleToggle} onDelete={handleDelete} busy={busy} />
          ))
        )}
      </Section>

      <Toast msg={toast.msg} ok={toast.ok} />
    </div>
  );
}
