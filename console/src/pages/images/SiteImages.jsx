import { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { UploadCloud, Check, X, ImagePlus, ExternalLink } from "lucide-react";

/* ─── Design tokens ─── */
const GOLD_BTN = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "9px 18px", borderRadius: 8, border: "none",
  background: "var(--ds-gold)", color: "#1a1a1a",
  fontSize: 13, fontWeight: 600,
  cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
};

const GHOST_BTN = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "8px 13px", borderRadius: 8,
  border: "1px solid var(--ds-border)", background: "transparent",
  color: "var(--ds-text)", fontSize: 12.5, fontWeight: 500,
  cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
};

const SITE = "https://www.blackrockrestaurantng.com";

/* Sections we manage — each maps to a site_content section key.
   fallback = the image currently hardcoded/live on the website. */
const SECTIONS = [
  {
    key: "hero",
    label: "Homepage Hero",
    where: "Homepage — full-screen banner",
    aspect: "16/7",
    fallback: `${SITE}/heroimage.png`,
  },
  {
    key: "two-spaces-day",
    label: "Restaurant — Day",
    where: "Homepage & About — Two Spaces card 1",
    aspect: "4/3",
    fallback: `${SITE}/black-rock-5.jpg`,
  },
  {
    key: "two-spaces-evening",
    label: "Restaurant — Evening",
    where: "Homepage & About — Two Spaces card 2",
    aspect: "4/3",
    fallback: `${SITE}/black-rock-5.jpg`,
    note: "Pending night-edited version — currently showing same image as Day card",
  },
  {
    key: "about-hero",
    label: "About Page Header",
    where: "About — top hero banner",
    aspect: "16/7",
    fallback: `${SITE}/heroimage.png`,
  },
];

/* ─── MediaPickerModal ─── */
function MediaPickerModal({ onSelect, onClose }) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    supabase
      .from("media_assets")
      .select("id, url, filename")
      .order("uploaded_at", { ascending: false })
      .then(({ data }) => { if (data) setAssets(data); setLoading(false); });
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)" }}>
      <div style={{ background: "var(--ds-surface)", border: "1px solid var(--ds-border)", borderRadius: 12, width: 580, maxHeight: "82vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "16px 20px 14px", borderBottom: "1px solid var(--ds-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 600, color: "var(--ds-text)" }}>Pick from Media Library</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ds-muted)", display: "flex" }}><X size={18} /></button>
        </div>

        {/* Grid */}
        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--ds-muted)", fontSize: 13 }}>Loading…</div>
          ) : assets.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--ds-muted)", fontSize: 13 }}>No images in library yet</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {assets.map((a) => (
                <div
                  key={a.id}
                  onClick={() => setSelected(a)}
                  style={{
                    aspectRatio: "1", overflow: "hidden", borderRadius: 8, cursor: "pointer",
                    border: selected?.id === a.id ? "2.5px solid var(--ds-gold)" : "2px solid transparent",
                    position: "relative",
                  }}
                >
                  <img src={a.url} alt={a.filename} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  {selected?.id === a.id && (
                    <div style={{ position: "absolute", top: 5, right: 5, width: 20, height: 20, borderRadius: "50%", background: "var(--ds-gold)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Check size={11} style={{ color: "#1a1a1a" }} />
                    </div>
                  )}
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "18px 6px 5px", background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)" }}>
                    <p style={{ fontSize: 9.5, color: "#fff", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.filename}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--ds-border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button style={GHOST_BTN} onClick={onClose}>Cancel</button>
          <button
            style={{ ...GOLD_BTN, opacity: selected ? 1 : 0.45, pointerEvents: selected ? "auto" : "none" }}
            onClick={() => { if (selected) { onSelect(selected.url); onClose(); } }}
          >
            <Check size={13} /> Use Image
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── SectionCard ─── */
function SectionCard({ section, initialUrl, onSaved }) {
  const [url, setUrl] = useState(initialUrl || "");
  const [dirty, setDirty] = useState(false);
  const isDefault = !url && !!section.fallback;
  const previewSrc = url || section.fallback || "";
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null); // "saved" | error string
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const fileRef = useRef(null);

  // Sync if parent re-loads data
  useEffect(() => {
    setUrl(initialUrl || "");
    setDirty(false);
  }, [initialUrl]);

  const applyUrl = (newUrl) => {
    setUrl(newUrl);
    setDirty(true);
    setStatus(null);
  };

  const uploadFile = async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `website/${section.key}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("media-library")
        .upload(path, file, { contentType: file.type, upsert: true });
      if (upErr) throw upErr;

      const { data: { publicUrl } } = supabase.storage.from("media-library").getPublicUrl(path);

      // Register in media_assets
      await supabase.from("media_assets").insert({
        url: publicUrl,
        filename: file.name,
        file_size: file.size,
        used_in: section.key,
      });

      applyUrl(publicUrl);
    } catch (e) {
      setStatus(e.message || "Upload failed");
    }
    setUploading(false);
  };

  const save = async () => {
    if (!previewSrc) return;
    setSaving(true); setStatus(null);
    try {
      const { error } = await supabase
        .from("site_content")
        .upsert({ section: section.key, data: { image: previewSrc } }, { onConflict: "section" });
      if (error) throw error;
      setStatus("saved");
      setDirty(false);
      onSaved?.(section.key, url);
    } catch (e) {
      setStatus(e.message || "Save failed");
    }
    setSaving(false);
    setTimeout(() => setStatus(null), 3500);
  };

  const isOk = status === "saved";

  return (
    <div style={{
      background: "var(--ds-surface)",
      border: dirty ? "1px solid rgba(200,169,110,0.5)" : "1px solid var(--ds-border)",
      borderRadius: 11,
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      transition: "border-color 0.2s",
    }}>
      {/* Image preview / drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) uploadFile(f); }}
        onClick={() => !uploading && fileRef.current?.click()}
        style={{
          aspectRatio: section.aspect || "16/7",
          position: "relative",
          background: "var(--ds-input-bg)",
          cursor: uploading ? "wait" : "pointer",
          border: dragOver ? "2px dashed var(--ds-gold)" : "2px dashed transparent",
          transition: "border-color 0.15s",
        }}
      >
        {previewSrc ? (
          <>
            <img src={previewSrc} alt={section.label} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", display: "block" }} />
            {isDefault && (
              <div style={{ position: "absolute", top: 8, left: 8 }}>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", background: "rgba(0,0,0,0.65)", color: "#9ca3af", borderRadius: 99, padding: "3px 8px", border: "1px solid rgba(255,255,255,0.15)" }}>
                  Live default
                </span>
              </div>
            )}
          </>
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: "var(--ds-muted)" }}>
            <ImagePlus size={28} strokeWidth={1.3} style={{ opacity: 0.4 }} />
            <span style={{ fontSize: 12, opacity: 0.5 }}>No image set</span>
          </div>
        )}

        {/* Drag overlay */}
        {dragOver && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(200,169,110,0.15)", backdropFilter: "blur(2px)" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ds-gold)", fontFamily: "'DM Sans', sans-serif" }}>Drop to upload</div>
          </div>
        )}

        {/* Uploading spinner */}
        {uploading && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.55)" }}>
            <div style={{ fontSize: 12, color: "#fff", fontFamily: "'DM Sans', sans-serif" }}>Uploading…</div>
          </div>
        )}

        {/* Hover hint when image exists */}
        {previewSrc && !uploading && !dragOver && (
          <div style={{
            position: "absolute", inset: 0,
            background: "rgba(0,0,0,0)",
            display: "flex", alignItems: "center", justifyContent: "center",
            opacity: 0, transition: "opacity 0.2s, background 0.2s",
          }}
            className="si-hover-hint"
          >
            <div style={{ fontSize: 12, color: "#fff", fontFamily: "'DM Sans', sans-serif", background: "rgba(0,0,0,0.6)", padding: "6px 14px", borderRadius: 99 }}>
              Click or drop to replace
            </div>
          </div>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { if (e.target.files?.[0]) uploadFile(e.target.files[0]); e.target.value = ""; }} />

      {/* Card body */}
      <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Title + location */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ds-text)", fontFamily: "'DM Sans', sans-serif" }}>{section.label}</span>
            {dirty && <span style={{ fontSize: 10, fontWeight: 600, color: "var(--ds-gold)", letterSpacing: "0.05em", fontFamily: "'DM Sans', sans-serif" }}>UNSAVED</span>}
          </div>
          <span style={{ fontSize: 11, color: "var(--ds-muted)", fontFamily: "'DM Sans', sans-serif" }}>{section.where}</span>
          {section.note && (
            <div style={{ marginTop: 5, fontSize: 10.5, color: "#d97706", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.4, background: "rgba(217,119,6,0.08)", borderRadius: 6, padding: "5px 8px", border: "1px solid rgba(217,119,6,0.2)" }}>
              {section.note}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
          <button style={GHOST_BTN} onClick={() => setShowPicker(true)}>
            <ImagePlus size={13} /> Pick from Library
          </button>
          <button style={GHOST_BTN} onClick={() => fileRef.current?.click()} disabled={uploading}>
            <UploadCloud size={13} /> Upload New
          </button>
          <button
            onClick={save}
            disabled={saving || !dirty || !previewSrc}
            style={{
              ...GOLD_BTN,
              marginLeft: "auto",
              opacity: (saving || !dirty || !previewSrc) ? 0.45 : 1,
              pointerEvents: (saving || !dirty || !previewSrc) ? "none" : "auto",
            }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>

        {/* Status */}
        {status && (
          <span style={{ fontSize: 12, color: isOk ? "#16a34a" : "#ef4444", fontFamily: "'DM Sans', sans-serif" }}>
            {isOk ? "✓ Saved — live on website" : status}
          </span>
        )}
      </div>

      {showPicker && (
        <MediaPickerModal
          onSelect={applyUrl}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}

/* ─── SiteImages ─── */
export default function SiteImages() {
  const [contentMap, setContentMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("site_content")
      .select("section, data")
      .then(({ data }) => {
        if (data) {
          const map = {};
          data.forEach((row) => { map[row.section] = row.data; });
          setContentMap(map);
        }
        setLoading(false);
      });
  }, []);

  const handleSaved = (key, url) => {
    setContentMap((prev) => ({ ...prev, [key]: { ...prev[key], image: url } }));
  };

  if (loading) {
    return (
      <div style={{ padding: "28px 32px", fontFamily: "'DM Sans', sans-serif", color: "var(--ds-muted)", fontSize: 13 }}>
        Loading…
      </div>
    );
  }

  return (
    <div style={{ padding: "28px 32px 52px", fontFamily: "'DM Sans', sans-serif", maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 600, color: "var(--ds-text)", margin: "0 0 4px" }}>
          Website Images
        </h1>
        <p style={{ fontSize: 13, color: "var(--ds-muted)", margin: 0 }}>
          Upload or replace images for each section of the public website. Changes go live immediately after saving.
        </p>
      </div>

      {/* Info banner */}
      <div style={{ marginBottom: 24, padding: "10px 14px", borderRadius: 8, background: "rgba(200,169,110,0.07)", border: "1px solid rgba(200,169,110,0.2)", display: "flex", alignItems: "center", gap: 10 }}>
        <ExternalLink size={13} style={{ color: "var(--ds-gold)", flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: "var(--ds-muted)", lineHeight: 1.5 }}>
          Drag an image onto a card, click <strong style={{ color: "var(--ds-text)" }}>Upload New</strong> to add from your device, or <strong style={{ color: "var(--ds-text)" }}>Pick from Library</strong> to reuse an existing image. Always click <strong style={{ color: "var(--ds-text)" }}>Save</strong> to publish.
        </span>
      </div>

      {/* Section grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(460px, 1fr))", gap: 18 }}>
        {SECTIONS.map((section) => (
          <SectionCard
            key={section.key}
            section={section}
            initialUrl={contentMap[section.key]?.image ?? ""}
            onSaved={handleSaved}
          />
        ))}
      </div>

      {/* Note about gallery */}
      <div style={{ marginTop: 28, padding: "12px 16px", borderRadius: 8, background: "var(--ds-input-bg)", border: "1px solid var(--ds-border)" }}>
        <p style={{ fontSize: 12, color: "var(--ds-muted)", margin: 0, lineHeight: 1.6 }}>
          <strong style={{ color: "var(--ds-text)" }}>Gallery images</strong> (Food, Drinks, Ambience, Behind the Scenes) are managed in the{" "}
          <strong style={{ color: "var(--ds-text)" }}>Gallery</strong> section.{" "}
          <strong style={{ color: "var(--ds-text)" }}>Food reel</strong> images are managed in{" "}
          <strong style={{ color: "var(--ds-text)" }}>Media Library</strong>.
        </p>
      </div>

      <style>{`
        .si-card:hover .si-hover-hint { opacity: 1 !important; background: rgba(0,0,0,0.35) !important; }
        div:hover > div > .si-hover-hint { opacity: 1 !important; background: rgba(0,0,0,0.35) !important; }
      `}</style>
    </div>
  );
}
