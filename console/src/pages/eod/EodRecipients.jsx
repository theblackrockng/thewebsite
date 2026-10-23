import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { authHeader } from "../../lib/authHeader";
import { useStaff } from "../../context/StaffContext";
import { Mail, Send, Plus, Trash2, Loader, Check, X, Pencil, History } from "lucide-react";

const FRONTEND_API = "https://www.blackrockrestaurantng.com";

const MODES = [
  { value: "full",    label: "Full report" },
  { value: "kitchen", label: "Kitchen only" },
];

const KIND_LABELS = {
  email:    "Email",
  telegram: "Telegram",
};

function lagosYesterday() {
  const now = new Date();
  const y = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return y.toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });
}

function lagosToday() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });
}

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
          placeholder="e.g. Head Chef"
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

function RecipientRow({ r, onToggle, onDelete, onSave, busy }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(r.value || "");
  const [label, setLabel] = useState(r.label || "");
  const [phone, setPhone] = useState(r.phone || "");
  const [mode, setMode] = useState(r.mode || "full");
  const [saving, setSaving] = useState(false);

  function openEdit() {
    setValue(r.value || "");
    setLabel(r.label || "");
    setPhone(r.phone || "");
    setMode(r.mode || "full");
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
  }

  async function saveEdit() {
    const v = value.trim();
    if (!v) { alert("Value is required."); return; }
    if (r.kind === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      alert("Enter a valid email address.");
      return;
    }
    if (r.kind === "telegram" && !/^-?\d+$/.test(v)) {
      alert("Telegram chat_id must be numeric.");
      return;
    }
    setSaving(true);
    const ok = await onSave(r, {
      value: v,
      label: label.trim() || null,
      phone: r.kind === "telegram" ? (phone.trim() || null) : null,
      mode,
    });
    setSaving(false);
    if (ok) setEditing(false);
  }

  if (editing) {
    return (
      <div style={{
        display: "grid", gap: 8, padding: "14px 12px",
        borderBottom: "1px solid var(--ds-border)",
        background: "var(--ds-input-bg)", borderRadius: 7, marginBottom: 2,
      }}>
        <div style={{ display: "grid", gridTemplateColumns: "90px 1fr", gap: 10, alignItems: "center" }}>
          <label style={{ fontSize: 12, color: "var(--ds-muted)" }}>
            {r.kind === "email" ? "Email" : "Chat ID"}
          </label>
          <input value={value} onChange={(e) => setValue(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "90px 1fr", gap: 10, alignItems: "center" }}>
          <label style={{ fontSize: 12, color: "var(--ds-muted)" }}>Label</label>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Head Chef" style={inputStyle} />
        </div>
        {r.kind === "telegram" && (
          <div style={{ display: "grid", gridTemplateColumns: "90px 1fr", gap: 10, alignItems: "center" }}>
            <label style={{ fontSize: 12, color: "var(--ds-muted)" }}>Phone</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234…" style={inputStyle} />
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "90px 1fr", gap: 10, alignItems: "center" }}>
          <label style={{ fontSize: 12, color: "var(--ds-muted)" }}>Mode</label>
          <select value={mode} onChange={(e) => setMode(e.target.value)} style={inputStyle}>
            {MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 4 }}>
          <button
            type="button"
            onClick={cancelEdit}
            disabled={saving}
            style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid var(--ds-border)", background: "transparent", color: "var(--ds-muted)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={saveEdit}
            disabled={saving || !value.trim()}
            style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 14px", borderRadius: 7, border: "none", background: "var(--ds-gold)", color: "#1a1008", fontSize: 12, fontWeight: 700, cursor: saving ? "default" : "pointer", opacity: !value.trim() ? 0.5 : 1 }}
          >
            {saving ? <Loader size={12} className="spin" /> : <Check size={12} />}
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "90px 1fr 110px 90px 32px 32px",
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
        onClick={openEdit}
        disabled={busy}
        title="Edit recipient"
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 28, height: 28, borderRadius: 7,
          border: "1px solid var(--ds-border)", background: "transparent",
          color: "var(--ds-text)", cursor: busy ? "default" : "pointer",
        }}
      >
        <Pencil size={13} />
      </button>
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

  async function handleSave(r, patch) {
    setBusy(true);
    const { error } = await supabase
      .from("eod_recipients")
      .update(patch)
      .eq("id", r.id);
    setBusy(false);
    if (error) {
      notify(error.code === "23505" ? "Another recipient already uses that value." : error.message, false);
      return false;
    }
    notify("Recipient updated");
    load();
    return true;
  }

  const [resendDate, setResendDate] = useState(() => lagosYesterday());
  const [resendBusy, setResendBusy] = useState(false);
  const [resendResult, setResendResult] = useState(null);

  const triggerResend = useCallback(async (channels) => {
    setResendBusy(true);
    setResendResult(null);
    try {
      const headers = { "Content-Type": "application/json", ...(await authHeader()) };
      const res = await fetch(`${FRONTEND_API}/api/front-desk?resource=eod-resend`, {
        method: "POST",
        headers,
        body: JSON.stringify({ date: resendDate, channels }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        notify(data.error || `Resend failed (${res.status})`, false);
        setResendResult({ ok: false, error: data.error || `HTTP ${res.status}` });
      } else {
        const emails = data.emails || [];
        const telegrams = data.telegrams || [];
        const sent = emails.filter((e) => e.status === "sent").length
                   + telegrams.filter((t) => t.status === "sent").length;
        const failed = emails.filter((e) => e.status === "failed").length
                     + telegrams.filter((t) => t.status === "failed").length;
        if (sent === 0 && failed === 0) {
          notify("Nothing to send for the selected channel.", false);
        } else if (failed === 0) {
          notify(`Resent to ${sent} recipient${sent === 1 ? "" : "s"}.`, true);
        } else {
          notify(`Resent to ${sent}, ${failed} failed. See details below.`, false);
        }
        setResendResult({ ok: true, source: data.source, emails, telegrams });
      }
    } catch (err) {
      notify(err?.message || "Could not reach the server.", false);
      setResendResult({ ok: false, error: err?.message || "Network error" });
    } finally {
      setResendBusy(false);
    }
  }, [resendDate, notify]);

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
          Who gets the 6am End of Day email and Telegram message. Email recipients also receive the
          consolidated 30-day sales summary when the archive rolls over (Telegram is daily only).
          Changes take effect from the next cron run.
        </p>
      </div>

      <Section title="Resend a past EOD report" icon={History}>
        <div style={{ fontSize: 12.5, color: "var(--ds-muted)", lineHeight: 1.5, marginBottom: 12 }}>
          Pick a date and resend to every active recipient. If the 6am cron
          already archived that day, the archived snapshot is used; otherwise
          the report is computed live from orders and bookings for the date.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 10, alignItems: "center" }}>
          <label style={{ fontSize: 12.5, color: "var(--ds-muted)" }}>Report date</label>
          <input
            type="date"
            value={resendDate}
            max={lagosToday()}
            onChange={(e) => setResendDate(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => triggerResend(["email"])}
            disabled={resendBusy || !resendDate}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "9px 16px", borderRadius: 7, border: "1px solid var(--ds-border)",
              background: "transparent", color: "var(--ds-text)",
              fontSize: 13, fontWeight: 600, cursor: resendBusy ? "default" : "pointer",
              opacity: resendBusy ? 0.6 : 1,
            }}
          >
            {resendBusy ? <Loader size={13} className="spin" /> : <Mail size={13} />}
            Resend email
          </button>
          <button
            type="button"
            onClick={() => triggerResend(["telegram"])}
            disabled={resendBusy || !resendDate}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "9px 16px", borderRadius: 7, border: "1px solid var(--ds-border)",
              background: "transparent", color: "var(--ds-text)",
              fontSize: 13, fontWeight: 600, cursor: resendBusy ? "default" : "pointer",
              opacity: resendBusy ? 0.6 : 1,
            }}
          >
            {resendBusy ? <Loader size={13} className="spin" /> : <Send size={13} />}
            Resend Telegram
          </button>
          <button
            type="button"
            onClick={() => triggerResend(["email", "telegram"])}
            disabled={resendBusy || !resendDate}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "9px 16px", borderRadius: 7, border: "none",
              background: resendBusy ? "var(--ds-border)" : "var(--ds-gold)",
              color: resendBusy ? "var(--ds-muted)" : "#1a1008",
              fontSize: 13, fontWeight: 700, cursor: resendBusy ? "default" : "pointer",
            }}
          >
            {resendBusy ? <Loader size={13} className="spin" /> : <History size={13} />}
            Resend all
          </button>
        </div>
        {resendResult?.ok && (
          <div style={{ marginTop: 12, padding: "10px 12px", background: "var(--ds-input-bg)", borderRadius: 7, fontSize: 12, color: "var(--ds-muted)", lineHeight: 1.6 }}>
            {resendResult.source && (
              <div style={{ marginBottom: 6, fontWeight: 700, color: resendResult.source === "archive" ? "#16a34a" : "#a16207" }}>
                Source: {resendResult.source === "archive" ? "archived snapshot" : "live computation (no archive yet for this date)"}
              </div>
            )}
            {(resendResult.emails || []).map((r, i) => (
              <div key={`e${i}`}>
                <span style={{ color: r.status === "sent" ? "#16a34a" : "#dc2626", fontWeight: 700 }}>
                  {r.status === "sent" ? "✓" : "✗"}
                </span>{" "}
                Email → {r.to}{r.error ? ` · ${r.error}` : ""}
              </div>
            ))}
            {(resendResult.telegrams || []).map((r, i) => (
              <div key={`t${i}`}>
                <span style={{ color: r.status === "sent" ? "#16a34a" : r.status === "skipped" ? "#a16207" : "#dc2626", fontWeight: 700 }}>
                  {r.status === "sent" ? "✓" : r.status === "skipped" ? "–" : "✗"}
                </span>{" "}
                Telegram → {r.to}{r.error ? ` · ${r.error}` : r.reason ? ` · ${r.reason}` : ""}
              </div>
            ))}
            {(resendResult.emails?.length || 0) + (resendResult.telegrams?.length || 0) === 0 && (
              <div style={{ fontStyle: "italic" }}>No recipients matched that channel.</div>
            )}
          </div>
        )}
        {resendResult?.ok === false && resendResult.error && (
          <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(220,38,38,0.08)", borderRadius: 7, fontSize: 12, color: "#991b1b", fontWeight: 600 }}>
            {resendResult.error}
          </div>
        )}
      </Section>

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
            <RecipientRow key={r.id} r={r} onToggle={handleToggle} onDelete={handleDelete} onSave={handleSave} busy={busy} />
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
            <RecipientRow key={r.id} r={r} onToggle={handleToggle} onDelete={handleDelete} onSave={handleSave} busy={busy} />
          ))
        )}
      </Section>

      <Toast msg={toast.msg} ok={toast.ok} />
    </div>
  );
}
