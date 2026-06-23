import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";

const BURGUNDY = "#7a1c1c";
const DM = "'DM Sans', system-ui, sans-serif";

const STATUSES = ["uploaded","reviewed","approved","posted"];
const STATUS_DISPLAY = {
  uploaded: { label:"Uploaded", bg:"rgba(0,0,0,0.06)",      color:"#6b7280" },
  reviewed: { label:"Reviewed", bg:"rgba(59,130,246,0.12)", color:"#2563eb" },
  approved: { label:"Approved", bg:"rgba(34,197,94,0.12)",  color:"#16a34a" },
  posted:   { label:"Posted",   bg:"#1f2937",               color:"#fff"    },
};
const PLATFORMS = [
  { key:"caption_instagram", label:"📸 Instagram", max:2200,  color:"#E1306C" },
  { key:"caption_tiktok",    label:"🎵 TikTok",    max:2200,  color:"#69C9D0" },
  { key:"caption_facebook",  label:"👥 Facebook",  max:63206, color:"#1877F2" },
  { key:"caption_x",         label:"🐦 X / Twitter", max:280, color:"#1DA1F2" },
  { key:"caption_linkedin",  label:"💼 LinkedIn",  max:3000,  color:"#0A66C2" },
];

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(text); }
    catch {
      const el = document.createElement("textarea");
      el.value = text; el.style.position = "fixed"; el.style.opacity = "0";
      document.body.appendChild(el); el.select(); document.execCommand("copy"); document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={copy} style={{
      display:"flex", alignItems:"center", gap:5, padding:"5px 12px", borderRadius:8,
      fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:DM, border:"none", transition:"all 0.15s",
      background: copied ? "rgba(34,197,94,0.1)" : "var(--ds-bg)",
      color: copied ? "#16a34a" : "var(--ds-muted)",
    }}>
      {copied ? (
        <><svg style={{ width:12, height:12 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>Copied!</>
      ) : (
        <><svg style={{ width:12, height:12 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Copy</>
      )}
    </button>
  );
}

export default function AssetDetail() {
  const { id } = useParams();
  const { session } = useAuth();
  const navigate = useNavigate();

  const [asset,     setAsset]     = useState(null);
  const [profile,   setProfile]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [updating,  setUpdating]  = useState(false);
  const [statusErr, setStatusErr] = useState(null);
  const [deleting,  setDeleting]  = useState(false);

  useEffect(() => {
    if (!id || !session?.user?.id) return;
    async function load() {
      setLoading(true);
      const [assetRes, profileRes] = await Promise.all([
        supabase.from("content_assets").select(`
          *,
          week:content_weeks!week_id(id, title, start_date, end_date, week_number),
          uploader:staff_profiles!uploaded_by(id, full_name),
          reviewer:staff_profiles!reviewed_by(id, full_name),
          approver:staff_profiles!approved_by(id, full_name),
          poster:staff_profiles!posted_by(id, full_name)
        `).eq("id", id).single(),
        supabase.from("staff_profiles").select("*").eq("id", session.user.id).maybeSingle(),
      ]);
      setAsset(assetRes.data ?? null);
      setProfile(profileRes.data ?? null);
      setLoading(false);
    }
    load();
  }, [id, session?.user?.id]);

  async function updateStatus(status) {
    if (!asset) return;
    setUpdating(true); setStatusErr(null);
    const updates = { status };
    if (status === "reviewed")  { updates.reviewed_by  = session.user.id; updates.reviewed_at  = new Date().toISOString(); }
    if (status === "approved")  { updates.approved_by  = session.user.id; updates.approved_at  = new Date().toISOString(); }
    if (status === "posted")    { updates.posted_by    = session.user.id; updates.posted_at    = new Date().toISOString(); }
    const { data: updated, error } = await supabase.from("content_assets")
      .update(updates).eq("id", asset.id)
      .select(`
        *,
        week:content_weeks!week_id(id, title, start_date, end_date, week_number),
        uploader:staff_profiles!uploaded_by(id, full_name),
        reviewer:staff_profiles!reviewed_by(id, full_name),
        approver:staff_profiles!approved_by(id, full_name),
        poster:staff_profiles!posted_by(id, full_name)
      `).single();
    setUpdating(false);
    if (error) { setStatusErr(error.message); return; }
    setAsset(updated);
  }

  async function deleteAsset() {
    if (!asset || !window.confirm(`Delete "${asset.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    const { error } = await supabase.from("content_assets").delete().eq("id", asset.id);
    setDeleting(false);
    if (!error) navigate("/content-hub");
    else alert("Failed to delete asset.");
  }

  const isAdmin   = profile?.role === "super_admin" || profile?.role === "manager";
  const isImage   = asset?.file_type === "image" || asset?.file_type === "graphic";
  const isVideo   = asset?.file_type === "video";

  const card = {
    background: "var(--ds-surface)", borderRadius: 14,
    border: "1px solid var(--ds-border)", overflow: "hidden",
  };

  if (loading) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"60vh", color:"var(--ds-muted)", fontSize:13, fontFamily:DM }}>
        Loading…
      </div>
    );
  }

  if (!asset) {
    return (
      <div style={{ padding:28, fontFamily:DM }}>
        <p style={{ color:"var(--ds-muted)", fontSize:13 }}>Asset not found.</p>
        <button onClick={() => navigate("/content-hub")} style={{ background:"none", border:"none", cursor:"pointer", color:BURGUNDY, fontSize:13, fontWeight:600, fontFamily:DM, padding:0 }}>← Back to Content Hub</button>
      </div>
    );
  }

  const currentSt = STATUS_DISPLAY[asset.status] ?? STATUS_DISPLAY.uploaded;

  return (
    <div style={{ fontFamily:DM, paddingBottom:40 }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:12, padding:"16px 28px", borderBottom:"1px solid var(--ds-border)", background:"var(--ds-surface)" }}>
        <button onClick={() => navigate("/content-hub")}
          style={{ width:32, height:32, borderRadius:"50%", border:"1px solid var(--ds-border)", background:"none", cursor:"pointer", color:"var(--ds-muted)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all 0.15s" }}
          onMouseEnter={e => { e.currentTarget.style.color = "var(--ds-text)"; e.currentTarget.style.borderColor = "rgba(122,28,28,0.3)"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "var(--ds-muted)"; e.currentTarget.style.borderColor = "var(--ds-border)"; }}>
          <svg style={{ width:14, height:14 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <div style={{ minWidth:0, flex:1 }}>
          <p style={{ margin:0, fontSize:14, fontWeight:700, color:"var(--ds-text)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{asset.title}</p>
          {asset.week && (
            <p style={{ margin:"2px 0 0", fontSize:11, color:"var(--ds-muted)" }}>Week {asset.week.week_number} · {asset.week.title} · {asset.day_of_week}</p>
          )}
        </div>
        <span style={{ padding:"4px 12px", borderRadius:99, fontSize:11, fontWeight:700, textTransform:"capitalize", flexShrink:0, background:currentSt.bg, color:currentSt.color }}>
          {asset.status}
        </span>
      </div>

      <div style={{ padding:"24px 28px", maxWidth:740, display:"flex", flexDirection:"column", gap:16 }}>

        {/* Preview */}
        <div style={card}>
          {isImage ? (
            <img src={asset.file_url} alt={asset.title} style={{ width:"100%", maxHeight:"50vh", objectFit:"contain", background:"var(--ds-bg)", display:"block" }} />
          ) : isVideo ? (
            <video src={asset.file_url} controls style={{ width:"100%", maxHeight:"50vh", background:"#000", display:"block" }} />
          ) : (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:140, background:"var(--ds-bg)" }}>
              <div style={{ textAlign:"center" }}>
                <svg style={{ width:44, height:44, color:"var(--ds-muted)", margin:"0 auto 8px", display:"block" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
                <p style={{ fontSize:12, color:"var(--ds-muted)", margin:0 }}>{asset.file_type?.toUpperCase()} file</p>
              </div>
            </div>
          )}
          <div style={{ padding:"14px 18px", borderTop:"1px solid var(--ds-border)", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
            <div>
              {asset.description && <p style={{ fontSize:13, color:"var(--ds-text)", margin:0 }}>{asset.description}</p>}
              {asset.uploader && <p style={{ fontSize:11, color:"var(--ds-muted)", margin: asset.description ? "4px 0 0" : 0 }}>Uploaded by {asset.uploader.full_name}</p>}
            </div>
            <a href={asset.file_url} download target="_blank" rel="noopener noreferrer"
              style={{ display:"flex", alignItems:"center", gap:7, padding:"9px 16px", borderRadius:10, fontSize:12, fontWeight:700, color:"#fff", background:BURGUNDY, textDecoration:"none", flexShrink:0 }}>
              <svg style={{ width:14, height:14 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download
            </a>
          </div>
        </div>

        {/* Status workflow */}
        <div style={{ ...card, padding:"16px 18px" }}>
          <p style={{ margin:"0 0 12px", fontSize:10, fontWeight:700, color:"var(--ds-muted)", textTransform:"uppercase", letterSpacing:"0.12em" }}>Status</p>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8 }}>
            {([
              { s:"uploaded", actor: asset.uploader },
              { s:"reviewed", actor: asset.reviewer },
              { s:"approved", actor: asset.approver },
              { s:"posted",   actor: asset.poster   },
            ]).map(({ s, actor }) => {
              const currentIdx = STATUSES.indexOf(asset.status);
              const sIdx       = STATUSES.indexOf(s);
              const isDone     = sIdx <= currentIdx;
              const isActive   = sIdx === currentIdx;
              const sd         = STATUS_DISPLAY[s];
              const canClick   = isAdmin && !isActive;
              return (
                <div key={s} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:5 }}>
                  <button
                    onClick={() => canClick && !updating && updateStatus(s)}
                    disabled={updating || isActive || !canClick}
                    style={{
                      width:"100%", padding:"8px 4px", borderRadius:10, border: isActive ? `2px solid ${BURGUNDY}` : "1.5px solid transparent",
                      fontSize:11, fontWeight:600, textTransform:"capitalize", cursor: canClick ? "pointer" : "default", fontFamily:DM,
                      background: isDone ? sd.bg : "var(--ds-bg)",
                      color: isDone ? sd.color : "var(--ds-muted)",
                      opacity: !canClick && !isDone ? 0.5 : 1,
                      transition:"all 0.15s",
                    }}>
                    {updating && !isActive ? "…" : s}
                  </button>
                  <p style={{ fontSize:10, color:"var(--ds-muted)", margin:0, textAlign:"center", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", width:"100%", visibility: actor ? "visible" : "hidden" }}>
                    {actor?.full_name?.split(" ")[0] ?? "·"}
                  </p>
                </div>
              );
            })}
          </div>
          {statusErr && <p style={{ fontSize:11, color:"#dc2626", marginTop:8, margin:"8px 0 0" }}>{statusErr}</p>}
          {!isAdmin && <p style={{ fontSize:11, color:"var(--ds-muted)", marginTop:8, margin:"8px 0 0" }}>Contact an admin to update the status.</p>}
        </div>

        {/* Captions */}
        {PLATFORMS.map(({ key, label, max, color }) => {
          const text = asset[key];
          if (!text) return null;
          return (
            <div key={key} style={card}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 18px", borderBottom:"1px solid var(--ds-border)" }}>
                <p style={{ margin:0, fontSize:13, fontWeight:700, color }}>{label}</p>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:11, fontFamily:"monospace", color: text.length > max * 0.9 ? "#dc2626" : "var(--ds-muted)" }}>{text.length}/{max}</span>
                  <CopyButton text={text} />
                </div>
              </div>
              <p style={{ margin:0, padding:"14px 18px", fontSize:13, color:"var(--ds-text)", lineHeight:1.65, whiteSpace:"pre-wrap" }}>{text}</p>
            </div>
          );
        })}

        {/* Hashtags */}
        {asset.hashtags && (
          <div style={{ ...card, padding:"14px 18px" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
              <p style={{ margin:0, fontSize:13, fontWeight:700, color:"var(--ds-text)" }}># Hashtags</p>
              <CopyButton text={asset.hashtags} />
            </div>
            <p style={{ margin:0, fontSize:13, color:BURGUNDY, fontWeight:500 }}>{asset.hashtags}</p>
          </div>
        )}

        {/* Delete */}
        {isAdmin && (
          <div style={{ ...card, padding:"14px 18px", borderColor:"rgba(220,38,38,0.2)" }}>
            <p style={{ margin:"0 0 10px", fontSize:10, fontWeight:700, color:"var(--ds-muted)", textTransform:"uppercase", letterSpacing:"0.12em" }}>Danger zone</p>
            <button onClick={deleteAsset} disabled={deleting}
              style={{ display:"flex", alignItems:"center", gap:7, padding:"8px 14px", borderRadius:10, border:"1px solid rgba(220,38,38,0.25)", background:"none", cursor: deleting ? "not-allowed" : "pointer", fontSize:12, fontWeight:600, color:"#dc2626", fontFamily:DM, opacity: deleting ? 0.5 : 1 }}>
              <svg style={{ width:13, height:13 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
              {deleting ? "Deleting…" : "Delete asset"}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
