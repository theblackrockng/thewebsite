import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { useStaff } from "../../context/StaffContext";
import { Salad, Plus, Trash2, Pencil, Check, X, ChevronUp, ChevronDown } from "lucide-react";

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

function AddForm({ onAdd, busy }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const nameRef = useRef(null);

  async function submit(e) {
    e.preventDefault();
    const n = name.trim();
    const p = parseInt(String(price).replace(/[^\d]/g, ""), 10);
    if (!n) return;
    if (!Number.isFinite(p) || p < 0) { alert("Enter a valid price."); return; }
    const ok = await onAdd({ name: n, price: p });
    if (ok) {
      setName(""); setPrice("");
      nameRef.current?.focus();
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gridTemplateColumns: "1fr 140px auto", gap: 8, alignItems: "center" }}>
      <input
        ref={nameRef}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Side name (e.g. White Rice)"
        style={inputStyle}
        required
      />
      <input
        type="text"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        placeholder="Price (₦)"
        style={inputStyle}
        inputMode="numeric"
        required
      />
      <button
        type="submit"
        disabled={busy}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "9px 14px", borderRadius: 7, border: "none", cursor: busy ? "default" : "pointer",
          background: "var(--ds-gold)", color: "#1a1a1a", fontWeight: 600, fontSize: 13,
        }}
      >
        <Plus size={14} />Add
      </button>
    </form>
  );
}

function Row({ r, onSave, onToggle, onDelete, onMove, canUp, canDown, busy }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(r.name);
  const [price, setPrice] = useState(String(r.price));

  function cancel() { setEditing(false); setName(r.name); setPrice(String(r.price)); }

  async function save() {
    const n = name.trim();
    const p = parseInt(String(price).replace(/[^\d]/g, ""), 10);
    if (!n) { alert("Name is required."); return; }
    if (!Number.isFinite(p) || p < 0) { alert("Enter a valid price."); return; }
    const ok = await onSave(r, { name: n, price: p });
    if (ok) setEditing(false);
  }

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "28px 1fr 120px auto auto",
      gap: 8, alignItems: "center",
      padding: "10px 12px", borderBottom: "1px solid var(--ds-border)",
      opacity: r.active ? 1 : 0.55,
    }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <button type="button" disabled={!canUp || busy} onClick={() => onMove(r, -1)} title="Move up"
          style={{ background: "transparent", border: "none", padding: 0, cursor: canUp ? "pointer" : "default", color: canUp ? "var(--ds-text)" : "var(--ds-muted)", display: "flex" }}>
          <ChevronUp size={14} />
        </button>
        <button type="button" disabled={!canDown || busy} onClick={() => onMove(r, 1)} title="Move down"
          style={{ background: "transparent", border: "none", padding: 0, cursor: canDown ? "pointer" : "default", color: canDown ? "var(--ds-text)" : "var(--ds-muted)", display: "flex" }}>
          <ChevronDown size={14} />
        </button>
      </div>

      {editing ? (
        <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
      ) : (
        <div style={{ fontSize: 13.5, color: "var(--ds-text)", fontWeight: 500 }}>
          {r.name}
          {!r.active && <span style={{ marginLeft: 8, fontSize: 10.5, color: "var(--ds-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Paused</span>}
        </div>
      )}

      {editing ? (
        <input value={price} onChange={(e) => setPrice(e.target.value)} style={inputStyle} inputMode="numeric" />
      ) : (
        <div style={{ fontSize: 13, color: "var(--ds-muted)", textAlign: "right" }}>
          ₦{r.price.toLocaleString()}
        </div>
      )}

      {editing ? (
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" disabled={busy} onClick={save} title="Save"
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 7, border: "1px solid var(--ds-gold)", background: "var(--ds-gold)", color: "#1a1a1a", cursor: "pointer" }}>
            <Check size={13} />
          </button>
          <button type="button" disabled={busy} onClick={cancel} title="Cancel"
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 7, border: "1px solid var(--ds-border)", background: "transparent", color: "var(--ds-muted)", cursor: "pointer" }}>
            <X size={13} />
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" disabled={busy} onClick={() => setEditing(true)} title="Edit"
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 7, border: "1px solid var(--ds-border)", background: "transparent", color: "var(--ds-text)", cursor: "pointer" }}>
            <Pencil size={13} />
          </button>
          <button type="button" disabled={busy} onClick={() => onToggle(r)} title={r.active ? "Pause (hide from waiters)" : "Reactivate"}
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 10px", height: 28, borderRadius: 7, border: "1px solid var(--ds-border)", background: "transparent", color: "var(--ds-text)", cursor: "pointer", fontSize: 11.5, fontWeight: 600 }}>
            {r.active ? "Pause" : "Resume"}
          </button>
        </div>
      )}

      <button type="button" disabled={busy || editing} onClick={() => onDelete(r)} title="Delete"
        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 7, border: "1px solid var(--ds-border)", background: "transparent", color: "#991b1b", cursor: busy ? "default" : "pointer" }}>
        <Trash2 size={13} />
      </button>
    </div>
  );
}

export default function Sides() {
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
      .from("sides")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) {
      console.error(error);
      notify(error.message || "Could not load sides", false);
      setRows([]);
    } else {
      setRows(data || []);
    }
    setLoading(false);
  }, [notify]);

  useEffect(() => {
    if (authorized) load();
  }, [authorized, load]);

  async function handleAdd({ name, price }) {
    setBusy(true);
    const nextOrder = rows.length ? Math.max(...rows.map((r) => r.sort_order || 0)) + 1 : 1;
    const { error } = await supabase.from("sides").insert({ name, price, sort_order: nextOrder });
    setBusy(false);
    if (error) {
      notify(error.code === "23505" ? "A side with that name already exists." : error.message, false);
      return false;
    }
    notify("Side added");
    load();
    return true;
  }

  async function handleSave(r, patch) {
    setBusy(true);
    const { error } = await supabase.from("sides").update(patch).eq("id", r.id);
    setBusy(false);
    if (error) {
      notify(error.code === "23505" ? "Another side already uses that name." : error.message, false);
      return false;
    }
    notify("Side updated");
    load();
    return true;
  }

  async function handleToggle(r) {
    setBusy(true);
    const { error } = await supabase.from("sides").update({ active: !r.active }).eq("id", r.id);
    setBusy(false);
    if (error) { notify(error.message, false); return; }
    notify(r.active ? "Side paused" : "Side resumed");
    load();
  }

  async function handleDelete(r) {
    if (!window.confirm(`Delete "${r.name}"? Historic order items that referenced this side will keep their stored name and price — nothing in past orders changes.`)) return;
    setBusy(true);
    const { error } = await supabase.from("sides").delete().eq("id", r.id);
    setBusy(false);
    if (error) { notify(error.message, false); return; }
    notify("Side removed");
    load();
  }

  async function handleMove(r, delta) {
    const idx = rows.findIndex((x) => x.id === r.id);
    const swapIdx = idx + delta;
    if (idx < 0 || swapIdx < 0 || swapIdx >= rows.length) return;
    const other = rows[swapIdx];
    setBusy(true);
    const next = [...rows];
    next[idx] = { ...r, sort_order: other.sort_order };
    next[swapIdx] = { ...other, sort_order: r.sort_order };
    setRows(next);
    const err1 = (await supabase.from("sides").update({ sort_order: other.sort_order }).eq("id", r.id)).error;
    const err2 = (await supabase.from("sides").update({ sort_order: r.sort_order }).eq("id", other.id)).error;
    setBusy(false);
    if (err1 || err2) {
      notify((err1 || err2).message, false);
      load();
    }
  }

  if (!authorized) {
    return (
      <div style={{ padding: 24, color: "var(--ds-muted)" }}>
        Sides can only be edited by a super_admin or manager.
      </div>
    );
  }

  return (
    <div style={{ padding: 24, display: "grid", gap: 16, maxWidth: 760 }}>
      <div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 700, margin: "0 0 4px", color: "var(--ds-text)" }}>
          Sides
        </h1>
        <p style={{ fontSize: 13, color: "var(--ds-muted)", margin: 0 }}>
          The optional add-on sides waiters can attach to any dish flagged "has sides" in Menu Management.
          Changes here go live for every ordering surface the next time a waiter opens the picker — no deploy
          required. Pause a side to hide it without losing historic order lines.
        </p>
      </div>

      <Section title="Add a side" icon={Plus}>
        <AddForm onAdd={handleAdd} busy={busy} />
      </Section>

      <Section title={`Active & paused sides${rows.length ? ` (${rows.length})` : ""}`} icon={Salad}>
        {loading ? (
          <div style={{ fontSize: 13, color: "var(--ds-muted)" }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--ds-muted)" }}>
            No sides yet. Add one above to make it available to waiters.
          </div>
        ) : (
          <div>
            {rows.map((r, i) => (
              <Row
                key={r.id}
                r={r}
                onSave={handleSave}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onMove={handleMove}
                canUp={i > 0}
                canDown={i < rows.length - 1}
                busy={busy}
              />
            ))}
          </div>
        )}
      </Section>

      <div style={{ fontSize: 12, color: "var(--ds-muted)", lineHeight: 1.6 }}>
        <strong style={{ color: "var(--ds-text)" }}>How this works.</strong> The side picker opens for any dish whose
        "has sides" toggle is on (set that per-dish from Menu Management). Waiters see every <em>active</em> side here;
        paused sides stay in the database but are hidden from the picker. Historic orders keep whatever name + price
        were stamped at the time of sale, so renaming or deleting a side here never changes a past receipt.
      </div>

      <Toast msg={toast.msg} ok={toast.ok} />
    </div>
  );
}
