import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { UploadCloud, Copy, Trash2, AlertTriangle, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* ─── Constants ─── */
const GOLD_BTN = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "9px 18px", borderRadius: 8, border: "none",
  background: "var(--ds-gold)", color: "#1a1a1a",
  fontSize: 13, fontWeight: 600,
  cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
};

const GHOST_BTN = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "9px 14px", borderRadius: 8,
  border: "1px solid var(--ds-border)", background: "transparent",
  color: "var(--ds-text)", fontSize: 13, fontWeight: 500,
  cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
};

const FILTER_TABS = [
  { key: "ALL",    label: "All" },
  { key: "MENU",   label: "Menu" },
  { key: "UNUSED", label: "Unused" },
];

/* ─── FilterTab ─── */
function FilterTab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 16px", borderRadius: 99, border: "none", cursor: "pointer",
        fontSize: 12.5, fontWeight: 500, fontFamily: "'DM Sans', sans-serif",
        background: active ? "var(--ds-gold)" : "var(--ds-input-bg)",
        color: active ? "#1a1a1a" : "var(--ds-muted)",
        transition: "background 0.15s, color 0.15s",
      }}
    >
      {label}
    </button>
  );
}

/* ─── ImageCard ─── */
function ImageCard({ asset, onDelete, onCopyUrl }) {
  const [hovered, setHovered] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(asset.url); } catch {}
    setCopied(true);
    onCopyUrl?.();
    setTimeout(() => setCopied(false), 1800);
  };

  const fmtDate = (d) => {
    if (!d) return "";
    return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div
        style={{ position: "relative", aspectRatio: "1", overflow: "hidden", borderRadius: 8, background: "var(--ds-input-bg)", cursor: "pointer", border: "1px solid var(--ds-border)" }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <img src={asset.url} alt={asset.filename} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        {/* used_in badge */}
        {asset.used_in && (
          <span style={{ position: "absolute", top: 6, right: 6, fontSize: 9, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", background: "var(--ds-gold)", color: "#1a1a1a", borderRadius: 99, padding: "2px 6px" }}>{asset.used_in}</span>
        )}
        {/* hover overlay */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.62)", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}
            >
              <button
                onClick={handleCopy}
                title="Copy URL"
                style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
              <button
                onClick={() => onDelete(asset)}
                title="Delete"
                style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(239,68,68,0.18)", border: "1px solid rgba(239,68,68,0.3)", cursor: "pointer", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <Trash2 size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div style={{ marginTop: 6 }}>
        <p style={{ fontSize: 12, color: "var(--ds-text)", margin: "0 0 2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{asset.filename}</p>
        <p style={{ fontSize: 11, color: "var(--ds-muted)", margin: 0 }}>{fmtDate(asset.uploaded_at)}</p>
      </div>
    </div>
  );
}

/* ─── DeleteConfirm ─── */
function DeleteConfirm({ asset, onConfirm, onClose, deleting }) {
  const hasUsage = asset?.used_in && asset.used_in.trim() !== "";
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 150, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.55)" }}>
      <div style={{ background: "var(--ds-surface)", border: "1px solid var(--ds-border)", borderRadius: 12, padding: "28px 28px 24px", maxWidth: 420, width: "90%", fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 18 }}>
          <AlertTriangle size={22} style={{ color: "#ef4444", flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ fontWeight: 600, color: "var(--ds-text)", margin: "0 0 6px", fontSize: 15 }}>Delete image?</p>
            <p style={{ color: "var(--ds-muted)", margin: 0, fontSize: 13, lineHeight: 1.5 }}>
              {hasUsage
                ? `This image is used in "${asset.used_in}". Deleting removes it from the website.`
                : `"${asset?.filename}" will be permanently deleted. This cannot be undone.`}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button style={GHOST_BTN} onClick={onClose} disabled={deleting}>Cancel</button>
          <button
            style={{ ...GOLD_BTN, background: "#ef4444", opacity: deleting ? 0.7 : 1 }}
            onClick={onConfirm}
            disabled={deleting}
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── MediaLibrary ─── */
export default function MediaLibrary() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("ALL");
  const [dragOver, setDragOver] = useState(false);
  const [uploads, setUploads] = useState([]);
  const [deletingAsset, setDeletingAsset] = useState(null);
  const [confirmDeleting, setConfirmDeleting] = useState(false);
  const fileInputRef = useRef(null);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("media_assets").select("*").order("uploaded_at", { ascending: false });
      if (!error && data) setAssets(data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  const filtered = assets.filter((a) => {
    if (activeTab === "MENU") return a.used_in && a.used_in.includes("menu");
    if (activeTab === "UNUSED") return !a.used_in || a.used_in.trim() === "";
    return true;
  });

  const uploadFiles = async (files) => {
    const fileArr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!fileArr.length) return;
    const initial = fileArr.map((f) => ({ filename: f.name, progress: 0, done: false }));
    setUploads((prev) => [...prev, ...initial]);

    for (let i = 0; i < fileArr.length; i++) {
      const file = fileArr[i];
      const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
      setUploads((prev) => prev.map((u, idx) => idx === prev.length - fileArr.length + i ? { ...u, progress: 40 } : u));
      try {
        const { error: upErr } = await supabase.storage.from("media-library").upload(path, file, { upsert: false });
        if (upErr) throw upErr;
        setUploads((prev) => prev.map((u, idx) => idx === prev.length - fileArr.length + i ? { ...u, progress: 80 } : u));
        const { data: { publicUrl } } = supabase.storage.from("media-library").getPublicUrl(path);
        await supabase.from("media_assets").insert({ url: publicUrl, filename: file.name, file_size: file.size, used_in: null });
        setUploads((prev) => prev.map((u, idx) => idx === prev.length - fileArr.length + i ? { ...u, progress: 100, done: true } : u));
      } catch (e) {
        setUploads((prev) => prev.map((u, idx) => idx === prev.length - fileArr.length + i ? { ...u, done: true, error: true } : u));
      }
    }
    await fetchAssets();
    setTimeout(() => setUploads([]), 2500);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    uploadFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);

  const handleDelete = async () => {
    if (!deletingAsset) return;
    setConfirmDeleting(true);
    try {
      const url = deletingAsset.url;
      const parts = url.split("/storage/v1/object/public/media-library/");
      if (parts[1]) {
        await supabase.storage.from("media-library").remove([parts[1]]);
      }
      await supabase.from("media_assets").delete().eq("id", deletingAsset.id);
      setAssets((prev) => prev.filter((a) => a.id !== deletingAsset.id));
    } catch {}
    setDeletingAsset(null);
    setConfirmDeleting(false);
  };

  return (
    <div style={{ padding: "28px 32px 40px", fontFamily: "'DM Sans', sans-serif", maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 600, color: "var(--ds-text)", margin: "0 0 4px" }}>Media Library</h1>
          <p style={{ fontSize: 13, color: "var(--ds-muted)", margin: 0 }}>All uploaded images across the website</p>
        </div>
        <button style={GHOST_BTN} onClick={() => fileInputRef.current?.click()}>
          <UploadCloud size={15} /> Upload Images
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => { if (e.target.files?.length) uploadFiles(e.target.files); }} />
      </div>

      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        style={{
          marginBottom: 24,
          border: dragOver ? "2px solid var(--ds-gold)" : "2px dashed var(--ds-gold)",
          borderRadius: 8,
          background: dragOver ? "rgba(200,169,110,0.12)" : "rgba(200,169,110,0.06)",
          padding: "28px 20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          cursor: "pointer",
          transition: "background 0.15s, border 0.15s",
        }}
      >
        <UploadCloud size={28} strokeWidth={1.5} style={{ color: "var(--ds-gold)", opacity: 0.7 }} />
        <p style={{ fontSize: 13, color: "var(--ds-muted)", margin: 0 }}>Drag images here or click to upload</p>
        {/* Upload progress pills */}
        {uploads.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8, justifyContent: "center" }}>
            {uploads.map((u, i) => (
              <span key={i} style={{
                fontSize: 11, fontWeight: 500, borderRadius: 99, padding: "3px 10px",
                background: u.error ? "rgba(239,68,68,0.12)" : u.done ? "rgba(34,197,94,0.12)" : "rgba(200,169,110,0.14)",
                color: u.error ? "#ef4444" : u.done ? "#16a34a" : "var(--ds-muted)",
                border: u.error ? "1px solid rgba(239,68,68,0.25)" : u.done ? "1px solid rgba(34,197,94,0.25)" : "1px solid var(--ds-border)",
              }}>
                {u.filename.length > 22 ? u.filename.slice(0, 20) + "…" : u.filename} — {u.error ? "Error" : u.done ? "Done" : `${u.progress}%`}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {FILTER_TABS.map((t) => (
          <FilterTab key={t.key} label={t.label} active={activeTab === t.key} onClick={() => setActiveTab(t.key)} />
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ textAlign: "center", color: "var(--ds-muted)", padding: "60px 0", fontSize: 13 }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", gap: 14 }}>
          <UploadCloud size={40} strokeWidth={1.2} style={{ color: "var(--ds-muted)", opacity: 0.35 }} />
          <p style={{ color: "var(--ds-muted)", fontSize: 14, margin: 0 }}>
            {activeTab === "ALL" ? "No images yet. Upload your first image to get started." : "No images in this category."}
          </p>
        </div>
      ) : (
        <div className="ds-media-grid">
          <AnimatePresence>
            {filtered.map((asset) => (
              <motion.div
                key={asset.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.18 }}
              >
                <ImageCard asset={asset} onDelete={setDeletingAsset} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Delete Confirm */}
      {deletingAsset && (
        <DeleteConfirm
          asset={deletingAsset}
          onConfirm={handleDelete}
          onClose={() => setDeletingAsset(null)}
          deleting={confirmDeleting}
        />
      )}

      <style>{`
        .ds-media-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 12px;
        }
        @media (max-width: 600px) {
          .ds-media-grid {
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          }
        }
      `}</style>
    </div>
  );
}
