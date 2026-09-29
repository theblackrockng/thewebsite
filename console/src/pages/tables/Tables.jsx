import { useState, useEffect, useRef, useCallback } from "react";
import { QrCode, Plus, Pencil, Trash2, Download, Check, X, RefreshCw, ToggleLeft, ToggleRight, UploadCloud, ImagePlus } from "lucide-react";
import QRCodeStyling from "qr-code-styling";
import { authHeader } from "../../lib/authHeader";
import { supabase } from "../../lib/supabase";

const API_BASE = "/api/tables";

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
  });
}

function getTableUrl(table) {
  return `https://www.blackrockrestaurantng.com/order?table=${table.table_number}`;
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
function QRModal({ table, onClose, onUpdated }) {
  const containerRef = useRef(null);
  const fileRef = useRef(null);
  const url = getTableUrl(table);
  const [customUrl, setCustomUrl] = useState(table.custom_qr_url || "");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [qrSrc, setQrSrc] = useState("");

  useEffect(() => {
    let cancelled = false;
    setQrSrc("");
    makeQR(url, 240).getRawData("png").then((blob) => {
      if (cancelled || !blob) return;
      const objUrl = URL.createObjectURL(blob);
      setQrSrc(objUrl);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [url]);

  async function download() {
    const hires = makeQR(url, 1200);
    await hires.getRawData("png").then((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `blackrock-table-${table.table_number}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }

  async function handleUpload(file) {
    if (!file || !file.type.startsWith("image/")) { setUploadError("Please select an image file."); return; }
    setUploadError("");
    setUploading(true);
    try {
      const ext = file.name.split(".").pop().toLowerCase() || "png";
      const path = `qr-codes/table-${table.table_number}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("media-library")
        .upload(path, file, { contentType: file.type, upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("media-library").getPublicUrl(path);
      const res = await fetch(API_BASE, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ id: table.id, custom_qr_url: publicUrl }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save.");
      setCustomUrl(publicUrl);
      onUpdated(json.data);
    } catch (e) {
      setUploadError(e.message || "Upload failed.");
    }
    setUploading(false);
  }

  async function removeCustomQr() {
    setUploadError("");
    try {
      const res = await fetch(API_BASE, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ id: table.id, custom_qr_url: null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to remove.");
      setCustomUrl("");
      onUpdated(json.data);
    } catch (e) {
      setUploadError(e.message || "Remove failed.");
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.7)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--ds-surface)",
          border: "1px solid var(--ds-border)",
          borderRadius: 14,
          width: 360,
          maxHeight: "90vh",
          overflowY: "auto",
          display: "flex", flexDirection: "column",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "22px 24px 16px" }}>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 700, color: "#c8a96e", letterSpacing: "2px", textTransform: "uppercase" }}>
              Table {table.table_number}
            </div>
            <div style={{ fontSize: 11, color: "var(--ds-muted)", marginTop: 2 }}>QR Code</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ds-muted)", display: "flex" }}>
            <X size={18} />
          </button>
        </div>

        {/* ── Generated QR ── */}
        <div style={{ padding: "0 24px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ds-muted)", alignSelf: "flex-start" }}>
            BLACKROCK Generated QR
          </div>
          <div style={{ borderRadius: 12, overflow: "hidden", border: "2px solid #2e2820", width: 240, height: 240, background: "#0f0d0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {qrSrc ? (
              <img src={qrSrc} alt={`Table ${table.table_number} QR`} style={{ width: 240, height: 240, display: "block" }} />
            ) : (
              <div style={{ color: "#3e3426", fontSize: 11 }}>Generating…</div>
            )}
          </div>
          <div style={{ fontSize: 10.5, color: "var(--ds-muted)", textAlign: "center", wordBreak: "break-all", maxWidth: 300 }}>
            {url}
          </div>
          <button onClick={download} style={{ ...btn("ghost"), width: "100%", justifyContent: "center" }}>
            <Download size={13} /> Download PNG (High-Res)
          </button>
        </div>

        {/* Divider */}
        <div style={{ borderTop: "1px solid var(--ds-border)", margin: "0 24px" }} />

        {/* ── Custom QR upload ── */}
        <div style={{ padding: "18px 24px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ds-muted)" }}>
            Your Custom QR Code
          </div>

          {customUrl ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
              <img
                src={customUrl}
                alt={`Custom QR Table ${table.table_number}`}
                style={{ width: 160, height: 160, objectFit: "contain", borderRadius: 10, border: "2px solid #c8a96e", background: "#fff" }}
              />
              <div style={{ display: "flex", gap: 8, width: "100%" }}>
                <button
                  onClick={() => fileRef.current?.click()}
                  style={{ ...btn("ghost"), flex: 1, justifyContent: "center" }}
                >
                  <ImagePlus size={13} /> Replace
                </button>
                <button
                  onClick={removeCustomQr}
                  style={{ ...btn("danger"), flex: 1, justifyContent: "center" }}
                >
                  <X size={13} /> Remove
                </button>
              </div>
            </div>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files[0]); }}
              onClick={() => !uploading && fileRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? "#c8a96e" : "var(--ds-border)"}`,
                borderRadius: 10,
                padding: "28px 16px",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                cursor: uploading ? "wait" : "pointer",
                background: dragOver ? "rgba(200,169,110,0.06)" : "transparent",
                transition: "border-color 0.15s, background 0.15s",
              }}
            >
              {uploading ? (
                <div style={{ fontSize: 13, color: "var(--ds-muted)" }}>Uploading…</div>
              ) : (
                <>
                  <UploadCloud size={24} style={{ color: "var(--ds-muted)" }} />
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ds-text)" }}>Click or drop an image</div>
                  <div style={{ fontSize: 11, color: "var(--ds-muted)" }}>PNG, JPG, or WebP</div>
                </>
              )}
            </div>
          )}

          {uploadError && (
            <div style={{ fontSize: 12, color: "#ef4444", background: "rgba(239,68,68,0.08)", padding: "8px 12px", borderRadius: 6 }}>
              {uploadError}
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => { if (e.target.files[0]) handleUpload(e.target.files[0]); e.target.value = ""; }}
          />
        </div>
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
  const [thumbSrc, setThumbSrc] = useState("");

  useEffect(() => {
    if (table.custom_qr_url) { setThumbSrc(""); return; }
    let cancelled = false;
    makeQR(getTableUrl(table), 80)
      .getRawData("png")
      .then((blob) => {
        if (cancelled || !blob) return;
        const reader = new FileReader();
        reader.onloadend = () => { if (!cancelled) setThumbSrc(reader.result); };
        reader.readAsDataURL(blob);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [table.qr_slug, table.custom_qr_url]);

  const thumbUrl = table.custom_qr_url || thumbSrc;

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
      {/* Mini QR thumbnail */}
      <div
        onClick={() => onQR(table)}
        style={{ cursor: "pointer", borderRadius: 6, overflow: "hidden", width: 56, height: 56, flexShrink: 0, border: `1px solid ${table.custom_qr_url ? "#c8a96e" : "#2e2820"}`, background: "#0f0d0a", display: "flex", alignItems: "center", justifyContent: "center" }}
        title="View QR / upload custom"
      >
        {thumbUrl ? (
          <img src={thumbUrl} alt={`Table ${table.table_number} QR`} style={{ width: 56, height: 56, objectFit: "cover", display: "block" }} />
        ) : (
          <QrCode size={22} style={{ color: "#3e3426" }} />
        )}
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

  function handleQRUpdated(row) {
    setTables((prev) => prev.map((t) => (t.id === row.id ? row : t)));
    setQrTable(row);
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
      {qrTable && <QRModal table={qrTable} onClose={() => setQrTable(null)} onUpdated={handleQRUpdated} />}
    </div>
  );
}
