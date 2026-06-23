import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";

const BURGUNDY = "#7a1c1c";
const DM = "'DM Sans', system-ui, sans-serif";

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const EMOJIS = ["👍","❤️","🔥","👏","💡"];
const PLATFORMS = [
  { key: "instagram", label: "Instagram", limit: 2200 },
  { key: "tiktok",    label: "TikTok",    limit: 2200 },
  { key: "facebook",  label: "Facebook",  limit: 63206 },
  { key: "x",         label: "X / Twitter", limit: 280 },
  { key: "linkedin",  label: "LinkedIn",  limit: 3000 },
];
const STATUS_DISPLAY = {
  uploaded: { label: "Uploaded", bg: "rgba(0,0,0,0.06)",         color: "#6b7280" },
  reviewed: { label: "Reviewed", bg: "rgba(59,130,246,0.12)",    color: "#2563eb" },
  approved: { label: "Approved", bg: "rgba(34,197,94,0.12)",     color: "#16a34a" },
  posted:   { label: "Posted",   bg: "#1f2937",                   color: "#fff"    },
};

/* ── Utils ─────────────────────────────────────── */
function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function getInitials(name) {
  return (name || "?").split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

function detectType(f) {
  if (f.type.startsWith("image/")) return "image";
  if (f.type.startsWith("video/")) return "video";
  return "document";
}

function nameToTitle(name) {
  return name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function fmtDate(dateStr) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function fmtDayDate(weekStartDate, dayName) {
  const d = new Date(weekStartDate + "T12:00:00");
  const dayIdx = DAYS.indexOf(dayName);
  const weekStart = new Date(d);
  weekStart.setDate(d.getDate() - d.getDay() + 1);
  const target = new Date(weekStart);
  target.setDate(weekStart.getDate() + dayIdx);
  return target.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

/* ── FileTypeIcon ───────────────────────────────── */
function FileTypeIcon({ type, size = 28 }) {
  const s = { width: size, height: size, color: "rgba(255,255,255,0.7)", flexShrink: 0 };
  if (type === "video") return (
    <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
    </svg>
  );
  if (type === "document") return (
    <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  );
  return (
    <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>
  );
}

/* ── AssetCard ──────────────────────────────────── */
function AssetCard({ asset }) {
  const navigate = useNavigate();
  const [hover, setHover] = useState(false);
  const isImage = asset.file_type === "image" || asset.file_type === "graphic";
  const st = STATUS_DISPLAY[asset.status] ?? STATUS_DISPLAY.uploaded;

  return (
    <button
      onClick={() => navigate(`/content-hub/asset/${asset.id}`)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: "var(--ds-surface)", borderRadius: 14, overflow: "hidden",
        border: hover ? "1px solid rgba(122,28,28,0.3)" : "1px solid var(--ds-border)",
        boxShadow: hover ? "0 4px 12px rgba(0,0,0,0.08)" : "none",
        transition: "all 0.18s", cursor: "pointer", textAlign: "left", width: "100%", padding: 0,
      }}
    >
      <div style={{ position: "relative", height: 120, background: "linear-gradient(135deg,#2d1515,#1a0a0a)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        {isImage && (asset.thumbnail_url || asset.file_url) ? (
          <img src={asset.thumbnail_url ?? asset.file_url} alt={asset.title}
            style={{ width: "100%", height: "100%", objectFit: "cover", transform: hover ? "scale(1.05)" : "scale(1)", transition: "transform 0.3s" }} />
        ) : (
          <FileTypeIcon type={asset.file_type} />
        )}
        <div style={{ position: "absolute", top: 8, right: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: st.bg, color: st.color }}>
            {st.label}
          </span>
        </div>
      </div>
      <div style={{ padding: "10px 12px" }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--ds-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>
          {asset.title}
        </p>
        <p style={{ fontSize: 11, color: "var(--ds-muted)", marginTop: 2, textTransform: "capitalize" }}>{asset.file_type}</p>
      </div>
    </button>
  );
}

/* ── UploadModal ────────────────────────────────── */
function UploadModal({ weekId, dayDefault, onClose, onUploaded }) {
  const { session } = useAuth();
  const [items, setItems]           = useState([]);
  const [dayOfWeek, setDayOfWeek]   = useState(dayDefault || DAYS[0]);
  const [hashtags, setHashtags]     = useState("");
  const [captions, setCaptions]     = useState({ instagram:"", tiktok:"", facebook:"", x:"", linkedin:"" });
  const [showCaptions, setShowCaptions] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [globalErr, setGlobalErr]   = useState(null);
  const fileRef = useRef(null);

  function updateItem(id, patch) {
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it));
  }

  async function addFiles(files) {
    const arr = Array.from(files);
    const newItems = arr.map(f => ({
      id: Math.random().toString(36).slice(2),
      file: f,
      preview: f.type.startsWith("image/") ? URL.createObjectURL(f) : null,
      status: "pending",
      url: null,
      title: nameToTitle(f.name),
      errorMsg: null,
    }));
    setItems(prev => [...prev, ...newItems]);

    await Promise.all(newItems.map(async item => {
      const { file } = item;
      const isVideo = file.type.startsWith("video/");
      const MAX = isVideo ? 200 * 1024 * 1024 : 50 * 1024 * 1024;
      if (file.size > MAX) {
        updateItem(item.id, { status: "error", errorMsg: `Too large (max ${isVideo ? "200MB" : "50MB"})` });
        return;
      }
      updateItem(item.id, { status: "uploading" });
      const ext  = file.name.split(".").pop();
      const path = `${weekId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("content-assets").upload(path, file, { upsert: false });
      if (upErr) {
        updateItem(item.id, { status: "error", errorMsg: `Upload failed: ${upErr.message}` });
        return;
      }
      const { data: { publicUrl } } = supabase.storage.from("content-assets").getPublicUrl(path);
      updateItem(item.id, { status: "done", url: publicUrl });
    }));
  }

  async function saveAll() {
    const ready = items.filter(it => it.status === "done" && it.url && it.title.trim());
    if (!ready.length) return;
    setSaving(true); setGlobalErr(null);
    let saved = 0;
    for (const item of ready) {
      const { data: asset, error } = await supabase.from("content_assets").insert({
        week_id: weekId, day_of_week: dayOfWeek,
        title: item.title.trim(), file_url: item.url,
        file_type: detectType(item.file),
        thumbnail_url: item.file.type.startsWith("image/") ? item.url : null,
        hashtags: hashtags.trim() || null,
        caption_instagram: captions.instagram.trim() || null,
        caption_tiktok:    captions.tiktok.trim()    || null,
        caption_facebook:  captions.facebook.trim()  || null,
        caption_x:         captions.x.trim()         || null,
        caption_linkedin:  captions.linkedin.trim()  || null,
        sort_order: 0,
        uploaded_by: session?.user?.id ?? null,
      }).select().single();
      if (!error && asset) { onUploaded(asset); saved++; }
    }
    setSaving(false);
    if (saved === ready.length) onClose();
    else setGlobalErr(`${ready.length - saved} file(s) failed to save.`);
  }

  const doneCount      = items.filter(it => it.status === "done").length;
  const uploadingCount = items.filter(it => it.status === "uploading").length;
  const canSave        = doneCount > 0 && !saving && uploadingCount === 0;

  const inp = {
    width: "100%", fontFamily: DM, fontSize: 13,
    background: "var(--ds-input-bg)", color: "var(--ds-text)",
    border: "1px solid var(--ds-border)", borderRadius: 10,
    padding: "10px 14px", outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:60, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background:"var(--ds-surface)", borderRadius:20, width:"100%", maxWidth:640, maxHeight:"90vh", display:"flex", flexDirection:"column", boxShadow:"0 24px 60px rgba(0,0,0,0.35)" }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 24px 16px", borderBottom:"1px solid var(--ds-border)", flexShrink:0 }}>
          <div>
            <h2 style={{ margin:0, fontSize:16, fontWeight:700, color:"var(--ds-text)", fontFamily:DM }}>Upload Content</h2>
            {items.length > 0 && (
              <p style={{ margin:0, fontSize:11, color:"var(--ds-muted)", marginTop:2 }}>
                {doneCount}/{items.length} uploaded{uploadingCount > 0 ? ` · ${uploadingCount} uploading…` : ""}
              </p>
            )}
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--ds-muted)", fontSize:22, lineHeight:1, padding:4 }}>×</button>
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:"auto", padding:"20px 24px", display:"flex", flexDirection:"column", gap:16 }}>

          {/* Drop zone */}
          <div
            onDrop={e => { e.preventDefault(); if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files); }}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            style={{
              border:"2px dashed var(--ds-border)", borderRadius:14, padding:"28px 20px",
              textAlign:"center", cursor:"pointer", transition:"border-color 0.15s, background 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(122,28,28,0.4)"; e.currentTarget.style.background = "rgba(122,28,28,0.03)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--ds-border)"; e.currentTarget.style.background = "transparent"; }}
          >
            <input ref={fileRef} type="file" multiple accept="image/*,video/mp4,video/quicktime,.pdf" style={{ display:"none" }}
              onChange={e => { if (e.target.files?.length) addFiles(e.target.files); }} />
            <svg style={{ width:32, height:32, color:"var(--ds-muted)", margin:"0 auto 10px", display:"block" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <p style={{ fontSize:13, fontWeight:600, color:"var(--ds-text)", margin:0 }}>
              {items.length > 0 ? "Add more files" : "Click or drag & drop files"}
            </p>
            <p style={{ fontSize:11, color:"var(--ds-muted)", margin:"4px 0 0" }}>Images, videos, or PDFs</p>
          </div>

          {/* File list */}
          {items.length > 0 && (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {items.map(item => (
                <div key={item.id} style={{ display:"flex", alignItems:"center", gap:12, background:"var(--ds-bg)", borderRadius:10, padding:12 }}>
                  <div style={{ width:44, height:44, borderRadius:8, overflow:"hidden", flexShrink:0, background:"var(--ds-border)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    {item.preview
                      ? <img src={item.preview} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                      : <svg style={{ width:18, height:18, color:"var(--ds-muted)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    }
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <input value={item.title} onChange={e => updateItem(item.id, { title: e.target.value })}
                      style={{ width:"100%", background:"transparent", border:"none", borderBottom:"1px solid var(--ds-border)", outline:"none", fontSize:13, fontWeight:500, color:"var(--ds-text)", fontFamily:DM, paddingBottom:2 }} />
                    <p style={{ fontSize:10, margin:"4px 0 0", color: item.status==="done" ? "#16a34a" : item.status==="error" ? "#dc2626" : item.status==="uploading" ? "#d97706" : "var(--ds-muted)" }}>
                      {item.status==="done" ? "✓ Ready" : item.status==="uploading" ? "Uploading…" : item.status==="error" ? item.errorMsg : "Pending"}
                    </p>
                  </div>
                  <div style={{ flexShrink:0 }}>
                    {item.status === "uploading"
                      ? <div style={{ width:18, height:18, borderRadius:"50%", border:"2px solid var(--ds-border)", borderTopColor:BURGUNDY, animation:"spin 0.7s linear infinite" }} />
                      : <button onClick={() => setItems(p => p.filter(i => i.id !== item.id))} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--ds-muted)", display:"flex", padding:4 }}>
                          <svg style={{ width:14, height:14 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                    }
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Shared fields */}
          {items.length > 0 && (
            <div style={{ display:"flex", flexDirection:"column", gap:12, paddingTop:4, borderTop:"1px solid var(--ds-border)" }}>
              <p style={{ margin:0, fontSize:10, fontWeight:700, color:"var(--ds-muted)", textTransform:"uppercase", letterSpacing:"0.12em" }}>Applies to all files</p>

              <div>
                <label style={{ display:"block", fontSize:11, fontWeight:600, color:"var(--ds-muted)", marginBottom:4, textTransform:"uppercase", letterSpacing:"0.1em" }}>Day *</label>
                <select value={dayOfWeek} onChange={e => setDayOfWeek(e.target.value)} style={{ ...inp }}>
                  {DAYS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display:"block", fontSize:11, fontWeight:600, color:"var(--ds-muted)", marginBottom:4, textTransform:"uppercase", letterSpacing:"0.1em" }}>Hashtags</label>
                <input value={hashtags} onChange={e => setHashtags(e.target.value)} placeholder="#blackrockrestaurant #abuja" style={inp} />
              </div>

              <button onClick={() => setShowCaptions(v => !v)} style={{ display:"flex", alignItems:"center", gap:6, background:"none", border:"none", cursor:"pointer", fontSize:12, fontWeight:600, color:BURGUNDY, fontFamily:DM, padding:0 }}>
                <span>{showCaptions ? "▲" : "▼"}</span>
                {showCaptions ? "Hide captions" : "+ Add captions (optional)"}
              </button>

              {showCaptions && (
                <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  {PLATFORMS.map(p => {
                    const val = captions[p.key] || "";
                    const over = val.length > p.limit;
                    return (
                      <div key={p.key}>
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
                          <label style={{ fontSize:11, fontWeight:600, color:"var(--ds-muted)", textTransform:"uppercase", letterSpacing:"0.1em" }}>{p.label}</label>
                          <span style={{ fontSize:10, fontFamily:"monospace", color: over ? "#dc2626" : "var(--ds-muted)" }}>{val.length}/{p.limit}</span>
                        </div>
                        <textarea value={val} onChange={e => setCaptions(prev => ({ ...prev, [p.key]: e.target.value }))}
                          placeholder={`${p.label} caption…`} rows={3}
                          style={{ ...inp, resize:"none" }} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {globalErr && <p style={{ fontSize:13, color:"#dc2626", background:"rgba(220,38,38,0.07)", borderRadius:8, padding:"10px 14px", margin:0 }}>{globalErr}</p>}
        </div>

        {/* Footer */}
        <div style={{ display:"flex", gap:10, padding:"16px 24px", borderTop:"1px solid var(--ds-border)", flexShrink:0 }}>
          <button onClick={onClose} style={{ flex:1, padding:"11px", borderRadius:10, border:"1px solid var(--ds-border)", background:"none", cursor:"pointer", fontSize:13, fontWeight:600, color:"var(--ds-muted)", fontFamily:DM }}>Cancel</button>
          <button onClick={saveAll} disabled={!canSave}
            style={{ flex:1, padding:"11px", borderRadius:10, border:"none", cursor:canSave?"pointer":"not-allowed", fontSize:13, fontWeight:600, color:"#fff", background:canSave?BURGUNDY:"rgba(122,28,28,0.4)", fontFamily:DM, transition:"background 0.15s" }}>
            {saving ? "Saving…" : doneCount > 0 ? `Save ${doneCount} asset${doneCount > 1 ? "s" : ""}` : "Select files above"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── DaySection ─────────────────────────────────── */
function DaySection({ day, assets, weekId, weekStartDate, canUpload, onAssetAdded }) {
  const [open, setOpen]     = useState(true);
  const [upload, setUpload] = useState(false);
  const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const isToday = day === today;

  return (
    <div style={{ borderRadius:14, overflow:"hidden", border: isToday ? `2px solid ${BURGUNDY}` : "1px solid var(--ds-border)" }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"12px 18px", border:"none", cursor:"pointer", textAlign:"left", fontFamily:DM,
        background: isToday ? "rgba(122,28,28,0.08)" : "var(--ds-surface)", transition:"background 0.15s",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          {isToday && (
            <span style={{ fontSize:9, fontWeight:700, padding:"2px 7px", borderRadius:99, background:BURGUNDY, color:"#fff", textTransform:"uppercase", letterSpacing:"0.1em" }}>Today</span>
          )}
          <div>
            <p style={{ margin:0, fontSize:13, fontWeight:700, color: isToday ? BURGUNDY : "var(--ds-text)" }}>{day}</p>
            <p style={{ margin:0, fontSize:11, color:"var(--ds-muted)", marginTop:1 }}>{fmtDayDate(weekStartDate, day)}</p>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:11, color:"var(--ds-muted)" }}>{assets.length} {assets.length === 1 ? "asset" : "assets"}</span>
          <svg style={{ width:14, height:14, color:"var(--ds-muted)", transform: open ? "rotate(180deg)" : "none", transition:"transform 0.2s" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </button>

      {open && (
        <div style={{ background:"var(--ds-bg)", padding:"14px 18px" }}>
          {assets.length === 0 ? (
            <p style={{ textAlign:"center", fontSize:13, color:"var(--ds-muted)", padding:"12px 0", margin:0 }}>No content for {day} yet.</p>
          ) : (
            <div className="ch-asset-grid">
              {assets.map(a => <AssetCard key={a.id} asset={a} />)}
            </div>
          )}
          {canUpload && (
            <button onClick={() => setUpload(true)}
              style={{ display:"flex", alignItems:"center", gap:6, background:"none", border:"none", cursor:"pointer", fontSize:12, fontWeight:600, color:BURGUNDY, fontFamily:DM, marginTop: assets.length > 0 ? 12 : 0, padding:0 }}>
              <svg style={{ width:14, height:14 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add content
            </button>
          )}
        </div>
      )}

      {upload && (
        <UploadModal weekId={weekId} dayDefault={day} onClose={() => setUpload(false)}
          onUploaded={a => { onAssetAdded(a); setUpload(false); }} />
      )}
    </div>
  );
}

/* ── ThisWeekView ───────────────────────────────── */
function ThisWeekView({ week, assets, canUpload, onAssetAdded }) {
  const [showInstructions, setShowInstructions] = useState(false);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      {/* Week header card */}
      <div style={{ background:"var(--ds-surface)", borderRadius:14, border:"1px solid var(--ds-border)", overflow:"hidden" }}>
        <div style={{ padding:"16px 20px", display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
              <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:99, background:"rgba(122,28,28,0.1)", color:BURGUNDY }}>Week {week.week_number}</span>
              <span style={{ fontSize:10, fontWeight:600, padding:"2px 8px", borderRadius:99, textTransform:"capitalize",
                background: week.status==="active" ? "rgba(34,197,94,0.1)" : week.status==="completed" ? "rgba(0,0,0,0.06)" : "rgba(234,179,8,0.1)",
                color: week.status==="active" ? "#16a34a" : week.status==="completed" ? "#6b7280" : "#ca8a04",
              }}>{week.status}</span>
            </div>
            <h2 style={{ margin:0, fontSize:16, fontWeight:700, color:"var(--ds-text)", fontFamily:DM }}>{week.title}</h2>
            <p style={{ margin:"3px 0 0", fontSize:12, color:"var(--ds-muted)" }}>{fmtDate(week.start_date)} – {fmtDate(week.end_date)}</p>
          </div>
          {week.general_instructions && (
            <button onClick={() => setShowInstructions(s => !s)}
              style={{ display:"flex", alignItems:"center", gap:5, background:"none", border:"none", cursor:"pointer", fontSize:12, fontWeight:600, color:BURGUNDY, fontFamily:DM, flexShrink:0 }}>
              <svg style={{ width:14, height:14 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {showInstructions ? "Hide" : "Show"} notes
            </button>
          )}
        </div>
        {showInstructions && week.general_instructions && (
          <div style={{ padding:"0 20px 16px", borderTop:"1px solid var(--ds-border)" }}>
            <p style={{ margin:"12px 0 0", fontSize:13, color:"var(--ds-text)", lineHeight:1.6, whiteSpace:"pre-wrap" }}>{week.general_instructions}</p>
          </div>
        )}
      </div>

      {/* Day sections */}
      {DAYS.map(day => (
        <DaySection key={day} day={day}
          assets={assets.filter(a => a.day_of_week === day)}
          weekId={week.id} weekStartDate={week.start_date}
          canUpload={canUpload} onAssetAdded={onAssetAdded} />
      ))}
    </div>
  );
}

/* ── NewWeekModal ───────────────────────────────── */
function NewWeekModal({ onClose, onCreated }) {
  const { session } = useAuth();
  const [title,        setTitle]        = useState("");
  const [weekNumber,   setWeekNumber]   = useState(1);
  const [startDate,    setStartDate]    = useState("");
  const [instructions, setInstructions] = useState("");
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState(null);

  const endDate = startDate
    ? (() => { const d = new Date(startDate + "T12:00:00"); d.setDate(d.getDate() + 6); return d.toISOString().slice(0, 10); })()
    : "";

  async function save() {
    if (!title.trim() || !startDate) return;
    setSaving(true); setError(null);
    const { data: week, error: err } = await supabase.from("content_weeks").insert({
      title: title.trim(), week_number: weekNumber,
      start_date: startDate, end_date: endDate,
      general_instructions: instructions.trim() || null,
      status: "draft",
      created_by: session?.user?.id ?? null,
    }).select().single();
    setSaving(false);
    if (err) { setError(err.message); return; }
    onCreated({ ...week, asset_count: 0 });
    onClose();
  }

  const inp = {
    width:"100%", fontFamily:DM, fontSize:13, background:"var(--ds-input-bg)",
    color:"var(--ds-text)", border:"1px solid var(--ds-border)", borderRadius:10,
    padding:"10px 14px", outline:"none", boxSizing:"border-box",
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:60, background:"rgba(0,0,0,0.55)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background:"var(--ds-surface)", borderRadius:18, padding:24, width:"100%", maxWidth:440, boxShadow:"0 24px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
          <h2 style={{ margin:0, fontSize:15, fontWeight:700, color:"var(--ds-text)", fontFamily:DM }}>New Content Week</h2>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--ds-muted)", fontSize:22, lineHeight:1 }}>×</button>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <label style={{ display:"block", fontSize:11, fontWeight:600, color:"var(--ds-muted)", marginBottom:4, textTransform:"uppercase", letterSpacing:"0.1em" }}>Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Week 1 – Brand Awareness" style={inp} />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <label style={{ display:"block", fontSize:11, fontWeight:600, color:"var(--ds-muted)", marginBottom:4, textTransform:"uppercase", letterSpacing:"0.1em" }}>Week #</label>
              <input type="number" min={1} value={weekNumber} onChange={e => setWeekNumber(Number(e.target.value))} style={inp} />
            </div>
            <div>
              <label style={{ display:"block", fontSize:11, fontWeight:600, color:"var(--ds-muted)", marginBottom:4, textTransform:"uppercase", letterSpacing:"0.1em" }}>Start date (Mon) *</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inp} />
            </div>
          </div>
          {endDate && <p style={{ fontSize:11, color:"var(--ds-muted)", margin:0 }}>End date: <strong style={{ color:"var(--ds-text)" }}>{fmtDate(endDate)}</strong></p>}
          <div>
            <label style={{ display:"block", fontSize:11, fontWeight:600, color:"var(--ds-muted)", marginBottom:4, textTransform:"uppercase", letterSpacing:"0.1em" }}>Weekly strategy notes</label>
            <textarea value={instructions} onChange={e => setInstructions(e.target.value)} rows={4}
              placeholder="Strategy notes for this week…"
              style={{ ...inp, resize:"none" }} />
          </div>
        </div>

        {error && <p style={{ fontSize:12, color:"#dc2626", marginTop:10 }}>{error}</p>}

        <div style={{ display:"flex", gap:10, marginTop:20 }}>
          <button onClick={onClose} style={{ flex:1, padding:"11px", borderRadius:10, border:"1px solid var(--ds-border)", background:"none", cursor:"pointer", fontSize:13, fontWeight:600, color:"var(--ds-muted)", fontFamily:DM }}>Cancel</button>
          <button onClick={save} disabled={!title.trim() || !startDate || saving}
            style={{ flex:1, padding:"11px", borderRadius:10, border:"none", fontSize:13, fontWeight:600, color:"#fff", fontFamily:DM, cursor: (!title.trim()||!startDate||saving) ? "not-allowed" : "pointer", background: (!title.trim()||!startDate||saving) ? "rgba(122,28,28,0.4)" : BURGUNDY, transition:"background 0.15s" }}>
            {saving ? "Creating…" : "Create Week"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── CalendarView ───────────────────────────────── */
function CalendarView({ weeks: initialWeeks, isAdmin, onWeekCreated }) {
  const navigate = useNavigate();
  const [showNew,    setShowNew]    = useState(false);
  const [weeks,      setWeeks]      = useState(initialWeeks);
  const [activating, setActivating] = useState(null);

  useEffect(() => { setWeeks(initialWeeks); }, [initialWeeks]);

  async function activateWeek(e, weekId) {
    e.stopPropagation();
    if (activating) return;
    setActivating(weekId);
    await supabase.from("content_weeks").update({ status: "completed" }).eq("status", "active");
    const { error } = await supabase.from("content_weeks").update({ status: "active" }).eq("id", weekId);
    if (!error) {
      setWeeks(prev => prev.map(w => ({
        ...w,
        status: w.id === weekId ? "active" : w.status === "active" ? "completed" : w.status,
      })));
    }
    setActivating(null);
  }

  const STATUS_COL = {
    draft:     { bg:"rgba(234,179,8,0.1)",    color:"#ca8a04",  border:"rgba(234,179,8,0.3)"   },
    active:    { bg:"rgba(34,197,94,0.1)",     color:"#16a34a",  border:"rgba(34,197,94,0.3)"   },
    completed: { bg:"rgba(0,0,0,0.06)",        color:"#6b7280",  border:"rgba(0,0,0,0.12)"      },
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <h2 style={{ margin:0, fontSize:16, fontWeight:700, color:"var(--ds-text)", fontFamily:DM }}>Content Calendar</h2>
        {isAdmin && (
          <button onClick={() => setShowNew(true)}
            style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:10, border:"none", cursor:"pointer", fontSize:12, fontWeight:600, color:"#fff", background:BURGUNDY, fontFamily:DM }}>
            <svg style={{ width:14, height:14 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Week
          </button>
        )}
      </div>

      {weeks.length === 0 ? (
        <div style={{ background:"var(--ds-surface)", borderRadius:14, border:"1px solid var(--ds-border)", padding:"48px 20px", textAlign:"center" }}>
          <p style={{ fontSize:32, margin:"0 0 10px" }}>📅</p>
          <p style={{ fontSize:13, fontWeight:600, color:"var(--ds-text)", margin:"0 0 4px", fontFamily:DM }}>No weeks yet</p>
          {isAdmin && <p style={{ fontSize:12, color:"var(--ds-muted)", margin:0 }}>Click "New Week" to set up your first content week.</p>}
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {weeks.map(w => {
            const sc = STATUS_COL[w.status] ?? STATUS_COL.draft;
            return (
              <div key={w.id} onClick={() => {}}
                style={{ background:"var(--ds-surface)", borderRadius:14, border:"1px solid var(--ds-border)", padding:"14px 18px", cursor:"default" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(122,28,28,0.25)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--ds-border)"; }}
              >
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>
                  <div style={{ minWidth:0, flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:5, flexWrap:"wrap" }}>
                      <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:99, background:"rgba(122,28,28,0.1)", color:BURGUNDY }}>Week {w.week_number}</span>
                      <span style={{ fontSize:10, fontWeight:600, padding:"2px 8px", borderRadius:99, textTransform:"capitalize", background:sc.bg, color:sc.color, border:`1px solid ${sc.border}` }}>{w.status}</span>
                      {isAdmin && w.status === "draft" && (
                        <button onClick={e => activateWeek(e, w.id)} disabled={activating === w.id}
                          style={{ fontSize:10, fontWeight:600, padding:"2px 8px", borderRadius:99, border:"1px solid rgba(59,130,246,0.3)", background:"rgba(59,130,246,0.08)", color:"#2563eb", cursor:"pointer", opacity: activating===w.id ? 0.5 : 1 }}>
                          {activating === w.id ? "Activating…" : "Activate"}
                        </button>
                      )}
                    </div>
                    <p style={{ margin:0, fontSize:13, fontWeight:700, color:"var(--ds-text)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{w.title}</p>
                    <p style={{ margin:"2px 0 0", fontSize:11, color:"var(--ds-muted)" }}>{fmtDate(w.start_date)} – {fmtDate(w.end_date)}</p>
                  </div>
                  <div style={{ flexShrink:0, textAlign:"right" }}>
                    <p style={{ margin:0, fontSize:22, fontWeight:700, color:BURGUNDY, lineHeight:1 }}>{w.asset_count}</p>
                    <p style={{ margin:"2px 0 0", fontSize:10, color:"var(--ds-muted)" }}>assets</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showNew && (
        <NewWeekModal onClose={() => setShowNew(false)}
          onCreated={w => { setWeeks(prev => [w, ...prev]); onWeekCreated(w); setShowNew(false); }} />
      )}
    </div>
  );
}

/* ── PostCard ───────────────────────────────────── */
function PostCard({ post, reactions, currentUserId, isAdmin, onReact, onDelete }) {
  const postReactions = reactions.filter(r => r.post_id === post.id);
  const counts = EMOJIS.reduce((acc, e) => { acc[e] = postReactions.filter(r => r.emoji === e).length; return acc; }, {});
  const myReactions = new Set(postReactions.filter(r => r.user_id === currentUserId).map(r => r.emoji));

  return (
    <div style={{ background:"var(--ds-surface)", borderRadius:14, border: post.is_pinned ? `1px solid rgba(122,28,28,0.3)` : "1px solid var(--ds-border)", padding:18 }}>
      {post.is_pinned && (
        <div style={{ marginBottom:10 }}>
          <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:99, background:"rgba(122,28,28,0.1)", color:BURGUNDY }}>📌 Pinned</span>
        </div>
      )}
      <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
        <div style={{ width:32, height:32, borderRadius:"50%", background:BURGUNDY, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:11, fontWeight:700, color:"#fff" }}>
          {post.author ? getInitials(post.author.full_name) : "?"}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
            <p style={{ margin:0, fontSize:13, fontWeight:700, color:"var(--ds-text)" }}>{post.author?.full_name ?? "Unknown"}</p>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <p style={{ margin:0, fontSize:11, color:"var(--ds-muted)" }}>{timeAgo(post.created_at)}</p>
              {(post.author?.id === currentUserId || isAdmin) && (
                <button onClick={() => onDelete(post.id)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:11, color:"#dc2626", fontFamily:DM, padding:0 }}>Delete</button>
              )}
            </div>
          </div>
          <p style={{ margin:"8px 0 0", fontSize:13, color:"var(--ds-text)", lineHeight:1.6, whiteSpace:"pre-wrap" }}>{post.body}</p>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:10, flexWrap:"wrap" }}>
            {EMOJIS.map(e => {
              const active = myReactions.has(e);
              return (
                <button key={e} onClick={() => onReact(post.id, e)}
                  style={{ display:"flex", alignItems:"center", gap:4, padding:"3px 10px", borderRadius:99, fontSize:12, cursor:"pointer", fontFamily:DM,
                    background: active ? "rgba(122,28,28,0.1)" : "var(--ds-bg)",
                    color: active ? BURGUNDY : "var(--ds-muted)",
                    border: active ? `1px solid rgba(122,28,28,0.2)` : "1px solid var(--ds-border)",
                    fontWeight: active ? 600 : 400, transition:"all 0.15s",
                  }}>
                  <span>{e}</span>
                  {counts[e] > 0 && <span>{counts[e]}</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── BoardView ──────────────────────────────────── */
function BoardView({ posts: initialPosts, reactions: initialReactions, currentUserId, isAdmin }) {
  const { session } = useAuth();
  const [posts,     setPosts]     = useState(initialPosts);
  const [reactions, setReactions] = useState(initialReactions);
  const [body,      setBody]      = useState("");
  const [isPinned,  setIsPinned]  = useState(false);
  const [posting,   setPosting]   = useState(false);
  const [error,     setError]     = useState(null);

  useEffect(() => { setPosts(initialPosts); },    [initialPosts]);
  useEffect(() => { setReactions(initialReactions); }, [initialReactions]);

  async function post() {
    if (!body.trim() || posting) return;
    setPosting(true); setError(null);
    const { data: newPost, error: err } = await supabase.from("content_board_posts")
      .insert({ body: body.trim(), is_pinned: isPinned, author_id: session?.user?.id ?? null })
      .select("*, author:staff_profiles!author_id(id, full_name, role)")
      .single();
    setPosting(false);
    if (err) { setError(err.message); return; }
    setPosts(prev => {
      if (newPost.is_pinned) return [newPost, ...prev];
      const first = prev.findIndex(x => !x.is_pinned);
      if (first === -1) return [...prev, newPost];
      return [...prev.slice(0, first), newPost, ...prev.slice(first)];
    });
    setBody(""); setIsPinned(false);
  }

  async function handleReact(postId, emoji) {
    const existing = reactions.find(r => r.post_id === postId && r.user_id === session?.user?.id && r.emoji === emoji);
    if (existing) {
      await supabase.from("content_board_reactions").delete().eq("id", existing.id);
    } else {
      await supabase.from("content_board_reactions").insert({ post_id: postId, user_id: session?.user?.id, emoji });
    }
    const { data: postReactions } = await supabase.from("content_board_reactions").select("*").eq("post_id", postId);
    setReactions(prev => [...prev.filter(r => r.post_id !== postId), ...(postReactions ?? [])]);
  }

  async function handleDelete(postId) {
    if (!window.confirm("Delete this post?")) return;
    const { error: err } = await supabase.from("content_board_posts").delete().eq("id", postId);
    if (!err) setPosts(prev => prev.filter(p => p.id !== postId));
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      {/* Compose */}
      <div style={{ background:"var(--ds-surface)", borderRadius:14, border:"1px solid var(--ds-border)", padding:18 }}>
        <textarea value={body} onChange={e => setBody(e.target.value)} rows={3}
          placeholder="Share an update, tip, or strategy note with the team…"
          style={{ width:"100%", background:"var(--ds-bg)", color:"var(--ds-text)", border:"1px solid var(--ds-border)", borderRadius:10, padding:"12px 14px", fontSize:13, fontFamily:DM, resize:"none", outline:"none", boxSizing:"border-box" }} />
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:10 }}>
          {isAdmin ? (
            <label style={{ display:"flex", alignItems:"center", gap:7, cursor:"pointer", fontSize:13, color:"var(--ds-text)", fontFamily:DM }}>
              <input type="checkbox" checked={isPinned} onChange={e => setIsPinned(e.target.checked)} style={{ accentColor:BURGUNDY, width:14, height:14 }} />
              📌 Pin this post
            </label>
          ) : <div />}
          <button onClick={post} disabled={!body.trim() || posting}
            style={{ padding:"8px 18px", borderRadius:10, border:"none", fontSize:13, fontWeight:600, color:"#fff", fontFamily:DM, cursor: (!body.trim()||posting) ? "not-allowed" : "pointer", background: (!body.trim()||posting) ? "rgba(122,28,28,0.4)" : BURGUNDY, transition:"background 0.15s" }}>
            {posting ? "Posting…" : "Post"}
          </button>
        </div>
        {error && <p style={{ fontSize:12, color:"#dc2626", marginTop:8, margin:"8px 0 0" }}>{error}</p>}
      </div>

      {posts.length === 0 ? (
        <div style={{ background:"var(--ds-surface)", borderRadius:14, border:"1px solid var(--ds-border)", padding:"48px 20px", textAlign:"center" }}>
          <p style={{ fontSize:32, margin:"0 0 10px" }}>💬</p>
          <p style={{ fontSize:13, fontWeight:600, color:"var(--ds-text)", margin:"0 0 4px", fontFamily:DM }}>No posts yet</p>
          <p style={{ fontSize:12, color:"var(--ds-muted)", margin:0 }}>Be the first to post an update for the team.</p>
        </div>
      ) : posts.map(p => (
        <PostCard key={p.id} post={p} reactions={reactions} currentUserId={currentUserId}
          isAdmin={isAdmin} onReact={handleReact} onDelete={handleDelete} />
      ))}
    </div>
  );
}

/* ── ContentHub (main) ──────────────────────────── */
export default function ContentHub() {
  const { session } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading,      setLoading]      = useState(true);
  const [currentUser,  setCurrentUser]  = useState(null);
  const [weeks,        setWeeks]        = useState([]);
  const [activeWeek,   setActiveWeek]   = useState(null);
  const [assets,       setAssets]       = useState([]);
  const [posts,        setPosts]        = useState([]);
  const [reactions,    setReactions]    = useState([]);

  const tab = searchParams.get("tab") || "week";

  function setTab(t) {
    if (t === "week") setSearchParams({});
    else setSearchParams({ tab: t });
  }

  useEffect(() => {
    if (!session?.user?.id) return;
    async function init() {
      setLoading(true);
      const [profileRes, weeksRes, postsRes, reactionsRes] = await Promise.all([
        supabase.from("staff_profiles").select("*").eq("id", session.user.id).maybeSingle(),
        supabase.from("content_weeks").select("*, content_assets(id)").order("week_number", { ascending: false }),
        supabase.from("content_board_posts")
          .select("*, author:staff_profiles!author_id(id, full_name, role)")
          .order("is_pinned", { ascending: false })
          .order("created_at", { ascending: false }),
        supabase.from("content_board_reactions").select("*"),
      ]);

      const profile = profileRes.data;
      setCurrentUser(profile ?? { id: session.user.id, full_name: session.user.email?.split("@")[0] ?? "Admin", role: "staff" });

      const rawWeeks = weeksRes.data ?? [];
      const weeksWithCount = rawWeeks.map(w => ({
        ...w, asset_count: w.content_assets?.length ?? 0, content_assets: undefined,
      }));
      setWeeks(weeksWithCount);

      const active = weeksWithCount.find(w => w.status === "active") ?? null;
      setActiveWeek(active);

      setPosts(postsRes.data ?? []);
      setReactions(reactionsRes.data ?? []);
      setLoading(false);

      if (active) {
        const { data: assetData } = await supabase.from("content_assets")
          .select("*").eq("week_id", active.id)
          .order("sort_order").order("created_at");
        setAssets(assetData ?? []);
      }
    }
    init();
  }, [session?.user?.id]);

  const isAdmin   = currentUser?.role === "super_admin" || currentUser?.role === "manager";
  const canUpload = isAdmin || currentUser?.role === "content_manager";

  const TABS = [
    { key: "week",     label: "📅 This Week" },
    { key: "calendar", label: "🗓️ Calendar" },
    { key: "board",    label: "💬 Message Board" },
  ];

  if (loading) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"60vh", color:"var(--ds-muted)", fontSize:13, fontFamily:DM }}>
        Loading Content Hub…
      </div>
    );
  }

  return (
    <div style={{ fontFamily:DM }}>
      {/* Page header */}
      <div style={{ padding:"24px 28px 0", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <h1 style={{ margin:0, fontSize:20, fontWeight:700, color:"var(--ds-text)", letterSpacing:"-0.01em" }}>Content Hub</h1>
          <p style={{ margin:"3px 0 0", fontSize:12, color:"var(--ds-muted)" }}>
            {currentUser?.full_name} · {isAdmin ? "Admin" : "Content Manager"}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:4, padding:"16px 28px 0", overflowX:"auto" }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              padding:"8px 16px", borderRadius:10, border:"none", cursor:"pointer",
              fontSize:12, fontWeight:600, whiteSpace:"nowrap", fontFamily:DM, transition:"all 0.15s",
              background: tab === t.key ? "var(--ds-surface)" : "transparent",
              color: tab === t.key ? "var(--ds-text)" : "var(--ds-muted)",
              boxShadow: tab === t.key ? "0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px var(--ds-border)" : "none",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ padding:"20px 28px 32px", maxWidth:860 }}>
        {tab === "week" && (
          activeWeek ? (
            <ThisWeekView
              week={activeWeek}
              assets={assets}
              canUpload={canUpload}
              onAssetAdded={a => {
                setAssets(prev => [...prev, a]);
                setWeeks(prev => prev.map(w => w.id === activeWeek.id ? { ...w, asset_count: w.asset_count + 1 } : w));
              }}
            />
          ) : (
            <div style={{ background:"var(--ds-surface)", borderRadius:14, border:"1px solid var(--ds-border)", padding:"48px 20px", textAlign:"center" }}>
              <p style={{ fontSize:36, margin:"0 0 12px" }}>📅</p>
              <p style={{ fontSize:14, fontWeight:700, color:"var(--ds-text)", margin:"0 0 6px" }}>No active week</p>
              <p style={{ fontSize:13, color:"var(--ds-muted)", margin:0, lineHeight:1.5 }}>
                {isAdmin
                  ? "Go to the Calendar tab to create a week and set it to Active."
                  : "No content has been published for this week yet. Check back soon."}
              </p>
            </div>
          )
        )}

        {tab === "calendar" && (
          <CalendarView
            weeks={weeks}
            isAdmin={isAdmin}
            onWeekCreated={w => {
              setWeeks(prev => [w, ...prev]);
              setTab("week");
            }}
          />
        )}

        {tab === "board" && currentUser && (
          <BoardView
            posts={posts}
            reactions={reactions}
            currentUserId={currentUser.id}
            isAdmin={isAdmin}
          />
        )}
      </div>

      <style>{`
        .ch-asset-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 12px;
        }
        @media (max-width: 1100px) { .ch-asset-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 720px)  { .ch-asset-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 480px)  { .ch-asset-grid { grid-template-columns: 1fr; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
