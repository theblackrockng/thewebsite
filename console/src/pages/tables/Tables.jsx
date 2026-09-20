import { useState, useEffect, useRef, useCallback } from "react";
import { QrCode, Plus, Pencil, Trash2, Download, Check, X, RefreshCw, ToggleLeft, ToggleRight } from "lucide-react";
import QRCodeStyling from "qr-code-styling";
import { authHeader } from "../../lib/authHeader";

const API_BASE = "/api/tables";

const BR_LOGO_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" rx="12" fill="#0f0d0a"/><text x="50%" y="56%" text-anchor="middle" dominant-baseline="middle" font-family="Georgia,serif" font-weight="700" font-size="28" fill="#c8a96e" letter-spacing="1">BR</text></svg>`)}`;

function makeQR(url, size = 240) {
  return new QRCodeStyling({
    width: size,
    height: size,
    type: "canvas",
    data: url,
    dotsOptions: {
      color: "#c8a96e",
      type: "rounded",
    },
    cornersSquareOptions: {
      type: "extra-rounded",
      color: "#c8a96e",
    },
    cornersDotOptions: {
      color: "#c8a96e",
    },
    backgroundOptions: {
      color: "#0f0d0a",
    },
    image: BR_LOGO_SVG,
    imageOptions: {
      crossOrigin: "anonymous",
      margin: 4,
      imageSize: 0.28,
    },
  });
}

function getTableUrl(table) {
  const host = typeof window !== "undefined" ? window.location.host.replace("console.", "").replace(":5173", ":3000") : "";
  const base = typeof window !== "undefined" ? `${window.location.protocol}//${host}` : "";
  return `${base}/order?table=${table.table_number}`;
}

/* ── tiny helpers ── */
const input = {
  width: "100%",
  background: "var(--ds-input-bg)",
  border: "1px solid var(--ds-border)",
  borderRadius: 7,
  padding: "8px 12px",
  fontSize: 13,
  color: "var(--ds-text)",
  fontFamily: "'DM Sans', sans-serif",
  outline: "none",
};

const btn = (variant = "primary") => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 14px",
  borderRadius: 7,
  border: "none",
  cursor: "pointer",
  fontSize: 12.5,
  fontWeight: 600,
  fontFamily: "'DM Sans', sans-serif",
  ...(variant === "primary"
    ? { background: "#c8a96e", color: "#0f0d0a" }
    : variant === "danger"
    ? { background: "rgba(239,68,68,0.12)", color: "#ef4444" }
    : variant === "ghost"
    ? { background: "var(--ds-input-bg)", color: "var(--ds-muted)", border: "1px solid var(--ds-border)" }
    : { background: "var(--ds-input-bg)", color: "var(--ds-text)", border: "1px solid var(--ds-border)" }),
});

/* ── QR preview modal ── */
function QRModal({ table, onClose }) {
  const containerRef = useRef(null);
  const qrRef = useRef(null);
  const url = getTableUrl(table);

  useEffect(() => {
    qrRef.current = makeQR(url, 260);
    if (containerRef.current) {
      containerRef.current.innerHTML = "";
      qrRef.current.append(containerRef.current);
    }
  }, [url]);

  async function download() {
    if (!qrRef.current) return;
    const hires = makeQR(url, 1200);
    await hires.getRawData("png").then((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `blackrock-table-${table.table_number}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.7)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--ds-surface)",
          border: "1px solid var(--ds-border)",
          borderRadius: 14,
          padding: "28px 32px",
          width: 340,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 18,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 700, color: "#c8a96e", letterSpacing: "2px", textTransform: "uppercase" }}>
              Table {table.table_number}
            </div>
            <div style={{ fontSize: 11, color: "var(--ds-muted)", marginTop: 2 }}>QR Code Preview</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ds-muted)", display: "flex" }}>
            <X size={18} />
          </button>
        </div>

        {/* QR */}
        <div style={{ borderRadius: 12, overflow: "hidden", border: "2px solid #2e2820" }}>
          <div ref={containerRef} />
        </div>

        <div style={{ fontSize: 11, color: "var(--ds-muted)", textAlign: "center", wordBreak: "break-all", maxWidth: 270 }}>
          {url}
        </div>

        <button onClick={download} style={{ ...btn("primary"), width: "100%", justifyContent: "center" }}>
          <Download size={14} /> Download PNG (High-Res)
        </button>
      </div>
    </div>
  );
}

/* ── Add / Edit modal ── */
function TableFormModal({ table, onClose, onSaved }) {
  const isEdit = !!table;
  const [tableNumber, setTableNumber] = useState(isEdit ? String(table.table_number) : "");
  const [qrSlug, setQrSlug] = useState(isEdit ? table.qr_slug : "");
  const [active, setActive] = useState(isEdit ? table.active : true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const autoSlug = `table-${tableNumber}`;

  async function save() {
    setError("");
    if (!tableNumber || isNaN(Number(tableNumber)) || Number(tableNumber) < 1) {
      setError("Enter a valid table number.");
      return;
    }
    setSaving(true);
    const slug = qrSlug.trim() || autoSlug;
    try {
      const res = await fetch(API_BASE, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify(
          isEdit
            ? { id: table.id, table_number: Number(tableNumber), qr_slug: slug, active }
            : { table_number: Number(tableNumber), qr_slug: slug, active }
        ),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || "Save failed."); return; }
      onSaved(json.data);
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.7)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--ds-surface)",
          border: "1px solid var(--ds-border)",
          borderRadius: 14,
          padding: "26px 28px",
          width: 360,
          display: "flex", flexDirection: "column", gap: 16,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ds-text)" }}>{isEdit ? "Edit Table" : "Add New Table"}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ds-muted)", display: "flex" }}><X size={17} /></button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 11.5, color: "var(--ds-muted)", fontWeight: 500, display: "block", marginBottom: 5 }}>Table Number *</label>
            <input
              type="number"
              min="1"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              placeholder="e.g. 5"
              style={input}
            />
          </div>
          <div>
            <label style={{ fontSize: 11.5, color: "var(--ds-muted)", fontWeight: 500, display: "block", marginBottom: 5 }}>
              QR Slug <span style={{ color: "var(--ds-muted)", fontWeight: 400 }}>(optional — auto: {autoSlug})</span>
            </label>
            <input
              type="text"
              value={qrSlug}
              onChange={(e) => setQrSlug(e.target.value)}
              placeholder={autoSlug}
              style={input}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, color: "var(--ds-text)" }}>Active</span>
            <button
              onClick={() => setActive((v) => !v)}
              style={{ background: "none", border: "none", cursor: "pointer", color: active ? "#c8a96e" : "var(--ds-muted)", display: "flex" }}
            >
              {active ? <ToggleRight size={26} /> : <ToggleLeft size={26} />}
            </button>
          </div>
        </div>

        {error && (
          <div style={{ fontSize: 12, color: "#ef4444", background: "rgba(239,68,68,0.08)", padding: "8px 12px", borderRadius: 6 }}>{error}</div>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={btn("ghost")}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ ...btn("primary"), opacity: saving ? 0.6 : 1 }}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Table"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Delete confirm ── */
function DeleteConfirm({ table, onClose, onDeleted }) {
  const [deleting, setDeleting] = useState(false);

  async function confirm() {
    setDeleting(true);
    try {
      await fetch(API_BASE, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ id: table.id }),
      });
      onDeleted(table.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "var(--ds-surface)", border: "1px solid var(--ds-border)", borderRadius: 14, padding: "24px 28px", width: 320, display: "flex", flexDirection: "column", gap: 14 }}
      >
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ds-text)" }}>Delete Table {table.table_number}?</div>
        <div style={{ fontSize: 13, color: "var(--ds-muted)", lineHeight: 1.5 }}>
          This removes the table and its QR slug. Any active dine-in orders won't be affected.
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={btn("ghost")}>Cancel</button>
          <button onClick={confirm} disabled={deleting} style={{ ...btn("danger"), opacity: deleting ? 0.6 : 1 }}>
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── TableRow ── */
function TableRow({ table, onEdit, onDelete, onQR }) {
  const miniRef = useRef(null);
  const qrInstance = useRef(null);

  useEffect(() => {
    const url = getTableUrl(table);
    qrInstance.current = makeQR(url, 56);
    if (miniRef.current) {
      miniRef.current.innerHTML = "";
      qrInstance.current.append(miniRef.current);
    }
  }, [table.qr_slug]);

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "64px 1fr 1fr 80px 120px",
      alignItems: "center",
      gap: 12,
      padding: "12px 20px",
      borderBottom: "1px solid var(--ds-border)",
      background: "transparent",
    }}
    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--ds-input-bg)"; }}
    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      {/* Mini QR */}
      <div
        onClick={() => onQR(table)}
        style={{ cursor: "pointer", borderRadius: 6, overflow: "hidden", width: 56, height: 56, flexShrink: 0, border: "1px solid #2e2820" }}
        title="View & download QR"
      >
        <div ref={miniRef} style={{ transform: "scale(1)", transformOrigin: "top left" }} />
      </div>

      {/* Table number */}
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ds-text)" }}>Table {table.table_number}</div>
        <div style={{ fontSize: 11, color: "var(--ds-muted)", marginTop: 2 }}>/{table.qr_slug}</div>
      </div>

      {/* URL */}
      <div style={{ fontSize: 11.5, color: "var(--ds-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {getTableUrl(table)}
      </div>

      {/* Active */}
      <div>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 99,
          background: table.active ? "rgba(34,197,94,0.12)" : "rgba(156,142,122,0.12)",
          color: table.active ? "#22c55e" : "var(--ds-muted)",
        }}>
          {table.active ? <Check size={10} /> : <X size={10} />}
          {table.active ? "Active" : "Inactive"}
        </span>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
        <button
          onClick={() => onQR(table)}
          title="QR Code"
          style={{ ...btn("ghost"), padding: "6px 8px" }}
        >
          <QrCode size={14} />
        </button>
        <button
          onClick={() => onEdit(table)}
          title="Edit"
          style={{ ...btn("ghost"), padding: "6px 8px" }}
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={() => onDelete(table)}
          title="Delete"
          style={{ ...btn("danger"), padding: "6px 8px" }}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

/* ── Main page ── */
export default function Tables() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editTable, setEditTable] = useState(null);
  const [deleteTable, setDeleteTable] = useState(null);
  const [qrTable, setQrTable] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(API_BASE);
      const json = await res.json();
      if (json.ok) setTables(json.data || []);
      else setError(json.error || "Failed to load.");
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleSaved(row) {
    setTables((prev) => {
      const idx = prev.findIndex((t) => t.id === row.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = row;
        return next;
      }
      return [...prev, row].sort((a, b) => a.table_number - b.table_number);
    });
    setShowAdd(false);
    setEditTable(null);
  }

  function handleDeleted(id) {
    setTables((prev) => prev.filter((t) => t.id !== id));
    setDeleteTable(null);
  }

  return (
    <div style={{ padding: "28px 32px", maxWidth: 960, margin: "0 auto" }}>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <QrCode size={20} style={{ color: "#c8a96e" }} />
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--ds-text)" }}>Tables & QR Codes</h1>
          </div>
          <p style={{ margin: "4px 0 0 30px", fontSize: 13, color: "var(--ds-muted)" }}>
            Manage dine-in tables and download branded QR codes for each table.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={load} style={btn("ghost")}><RefreshCw size={13} /></button>
          <button onClick={() => setShowAdd(true)} style={btn("primary")}><Plus size={14} /> Add Table</button>
        </div>
      </div>

      {/* Table */}
      <div style={{
        background: "var(--ds-surface)",
        border: "1px solid var(--ds-border)",
        borderRadius: 12,
        overflow: "hidden",
      }}>
        {/* Column headers */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "64px 1fr 1fr 80px 120px",
          gap: 12,
          padding: "10px 20px",
          borderBottom: "1px solid var(--ds-border)",
          background: "var(--ds-input-bg)",
        }}>
          {["QR", "Table", "Order URL", "Status", ""].map((h) => (
            <div key={h} style={{ fontSize: 10.5, fontWeight: 600, color: "var(--ds-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</div>
          ))}
        </div>

        {/* Rows */}
        {loading ? (
          <div style={{ padding: "48px 0", textAlign: "center", fontSize: 13, color: "var(--ds-muted)" }}>Loading tables…</div>
        ) : error ? (
          <div style={{ padding: "32px 20px", fontSize: 13, color: "#ef4444" }}>{error}</div>
        ) : tables.length === 0 ? (
          <div style={{ padding: "56px 0", textAlign: "center" }}>
            <QrCode size={36} style={{ color: "var(--ds-border)", marginBottom: 12 }} />
            <p style={{ margin: 0, fontSize: 13, color: "var(--ds-muted)" }}>No tables yet. Add your first table.</p>
          </div>
        ) : (
          tables.map((t) => (
            <TableRow
              key={t.id}
              table={t}
              onEdit={setEditTable}
              onDelete={setDeleteTable}
              onQR={setQrTable}
            />
          ))
        )}

        {/* Footer count */}
        {!loading && tables.length > 0 && (
          <div style={{ padding: "10px 20px", borderTop: "1px solid var(--ds-border)", fontSize: 12, color: "var(--ds-muted)", background: "var(--ds-input-bg)" }}>
            {tables.length} table{tables.length !== 1 ? "s" : ""} · {tables.filter((t) => t.active).length} active
          </div>
        )}
      </div>

      {/* Modals */}
      {showAdd && <TableFormModal onClose={() => setShowAdd(false)} onSaved={handleSaved} />}
      {editTable && <TableFormModal table={editTable} onClose={() => setEditTable(null)} onSaved={handleSaved} />}
      {deleteTable && <DeleteConfirm table={deleteTable} onClose={() => setDeleteTable(null)} onDeleted={handleDeleted} />}
      {qrTable && <QRModal table={qrTable} onClose={() => setQrTable(null)} />}
    </div>
  );
}
