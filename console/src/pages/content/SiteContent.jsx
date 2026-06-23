import { useEffect, useState, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { Check, X } from "lucide-react";

/* ─── Design constants ─── */
const INPUT_STYLE = {
  width: "100%",
  background: "var(--ds-input-bg)",
  border: "1px solid var(--ds-border)",
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 13.5,
  color: "var(--ds-text)",
  fontFamily: "'DM Sans', sans-serif",
  outline: "none",
  boxSizing: "border-box",
};

const LABEL_STYLE = {
  display: "block",
  fontSize: 10.5,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--ds-muted)",
  marginBottom: 7,
};

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

const CARD_STYLE = {
  background: "var(--ds-surface)",
  border: "1px solid var(--ds-border)",
  borderRadius: 11,
  padding: "22px 24px 20px",
};

const SECTION_LABEL = {
  fontSize: 10, fontWeight: 700, letterSpacing: "0.13em",
  textTransform: "uppercase", color: "var(--ds-muted)",
  marginBottom: 16, display: "block",
};

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/* ─── MediaPickerModal ─── */
function MediaPickerModal({ onSelect, onClose, multiSelect }) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase.from("media_assets").select("id, url, filename").order("uploaded_at", { ascending: false });
        if (!error && data) setAssets(data);
      } catch {}
      setLoading(false);
    }
    load();
  }, []);

  const toggle = (asset) => {
    if (!multiSelect) { setSelected([asset]); return; }
    setSelected((prev) => prev.find((a) => a.id === asset.id) ? prev.filter((a) => a.id !== asset.id) : [...prev, asset]);
  };

  const isSelected = (asset) => selected.some((a) => a.id === asset.id);

  const handleConfirm = () => {
    if (selected.length === 0) return;
    if (multiSelect) onSelect(selected.map((a) => a.url));
    else onSelect(selected[0].url);
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.55)" }}>
      <div style={{ background: "var(--ds-surface)", border: "1px solid var(--ds-border)", borderRadius: 12, width: 560, maxHeight: "80vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid var(--ds-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 600, color: "var(--ds-text)" }}>
            {multiSelect ? "Select Images" : "Media Library"}
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ds-muted)", display: "flex" }}><X size={18} /></button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          {loading ? (
            <div style={{ textAlign: "center", color: "var(--ds-muted)", fontSize: 13, padding: "40px 0" }}>Loading…</div>
          ) : assets.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--ds-muted)", fontSize: 13, padding: "40px 0" }}>No media uploaded yet</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {assets.map((a) => (
                <div
                  key={a.id}
                  onClick={() => toggle(a)}
                  style={{
                    aspectRatio: "1", overflow: "hidden", borderRadius: 8, cursor: "pointer",
                    border: isSelected(a) ? "2.5px solid var(--ds-gold)" : "2px solid transparent",
                    position: "relative",
                  }}
                >
                  <img src={a.url} alt={a.filename} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  {isSelected(a) && (
                    <div style={{ position: "absolute", top: 5, right: 5, width: 20, height: 20, borderRadius: "50%", background: "var(--ds-gold)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Check size={11} style={{ color: "#1a1a1a" }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--ds-border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button style={GHOST_BTN} onClick={onClose}>Cancel</button>
          <button
            style={{ ...GOLD_BTN, opacity: selected.length ? 1 : 0.5 }}
            onClick={handleConfirm}
          >
            <Check size={14} /> {multiSelect ? `Use ${selected.length} Image${selected.length !== 1 ? "s" : ""}` : "Use Image"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── SaveStatus ─── */
function SaveStatus({ status }) {
  if (!status) return null;
  const ok = status === "saved";
  return (
    <span style={{ fontSize: 12, color: ok ? "#16a34a" : "#ef4444", fontFamily: "'DM Sans', sans-serif" }}>
      {ok ? "Saved" : status}
    </span>
  );
}

/* ─── SiteContent ─── */
export default function SiteContent() {
  const [contentMap, setContentMap] = useState({});
  const [loading, setLoading] = useState(true);

  // Hero state
  const [heroTagline, setHeroTagline] = useState("");
  const [heroImage, setHeroImage] = useState("");
  const [heroSaving, setHeroSaving] = useState(false);
  const [heroStatus, setHeroStatus] = useState(null);
  const [showHeroMedia, setShowHeroMedia] = useState(false);

  // About state
  const [aboutText, setAboutText] = useState("");
  const [aboutSaving, setAboutSaving] = useState(false);
  const [aboutStatus, setAboutStatus] = useState(null);

  // Hours state
  const [hours, setHours] = useState(() =>
    DAYS.reduce((acc, d) => ({ ...acc, [d]: { open: "10:00", close: "23:00", closed: false } }), {})
  );
  const [hoursSaving, setHoursSaving] = useState(false);
  const [hoursStatus, setHoursStatus] = useState(null);

  // Contact state
  const [contact, setContact] = useState({ phone1: "", phone2: "", email: "", address: "" });
  const [contactSaving, setContactSaving] = useState(false);
  const [contactStatus, setContactStatus] = useState(null);

  // Gallery state
  const [gallery, setGallery] = useState([]);
  const [gallerySaving, setGallerySaving] = useState(false);
  const [galleryStatus, setGalleryStatus] = useState(null);
  const [showGalleryMedia, setShowGalleryMedia] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase.from("site_content").select("*");
        if (!error && data) {
          const map = {};
          data.forEach((row) => { map[row.section] = row.data; });
          setContentMap(map);

          if (map.hero) {
            setHeroTagline(map.hero.tagline ?? "");
            setHeroImage(map.hero.image ?? "");
          }
          if (map.about) setAboutText(map.about.text ?? "");
          if (map.hours) setHours((prev) => ({ ...prev, ...map.hours }));
          if (map.contact) setContact((prev) => ({ ...prev, ...map.contact }));
          if (map.gallery) setGallery(Array.isArray(map.gallery.images) ? map.gallery.images : []);
        }
      } catch {}
      setLoading(false);
    }
    load();
  }, []);

  const upsert = async (section, data) => {
    const { error } = await supabase.from("site_content").upsert({ section, data }, { onConflict: "section" });
    if (error) throw error;
  };

  const saveHero = async () => {
    setHeroSaving(true); setHeroStatus(null);
    try {
      await upsert("hero", { tagline: heroTagline, image: heroImage });
      setHeroStatus("saved");
    } catch (e) { setHeroStatus(e.message || "Error"); }
    setHeroSaving(false);
    setTimeout(() => setHeroStatus(null), 3000);
  };

  const saveAbout = async () => {
    setAboutSaving(true); setAboutStatus(null);
    try {
      await upsert("about", { text: aboutText });
      setAboutStatus("saved");
    } catch (e) { setAboutStatus(e.message || "Error"); }
    setAboutSaving(false);
    setTimeout(() => setAboutStatus(null), 3000);
  };

  const saveHours = async () => {
    setHoursSaving(true); setHoursStatus(null);
    try {
      await upsert("hours", hours);
      setHoursStatus("saved");
    } catch (e) { setHoursStatus(e.message || "Error"); }
    setHoursSaving(false);
    setTimeout(() => setHoursStatus(null), 3000);
  };

  const saveContact = async () => {
    setContactSaving(true); setContactStatus(null);
    try {
      await upsert("contact", contact);
      setContactStatus("saved");
    } catch (e) { setContactStatus(e.message || "Error"); }
    setContactSaving(false);
    setTimeout(() => setContactStatus(null), 3000);
  };

  const saveGallery = async () => {
    setGallerySaving(true); setGalleryStatus(null);
    try {
      await upsert("gallery", { images: gallery });
      setGalleryStatus("saved");
    } catch (e) { setGalleryStatus(e.message || "Error"); }
    setGallerySaving(false);
    setTimeout(() => setGalleryStatus(null), 3000);
  };

  const removeGalleryImage = (url) => setGallery((prev) => prev.filter((u) => u !== url));

  const setHour = (day, key, value) => {
    setHours((prev) => ({ ...prev, [day]: { ...prev[day], [key]: value } }));
  };

  if (loading) {
    return (
      <div style={{ padding: "28px 32px", fontFamily: "'DM Sans', sans-serif", color: "var(--ds-muted)", fontSize: 13 }}>
        Loading…
      </div>
    );
  }

  return (
    <div style={{ padding: "28px 32px 40px", fontFamily: "'DM Sans', sans-serif", maxWidth: 860, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 600, color: "var(--ds-text)", margin: "0 0 4px" }}>Site Content</h1>
        <p style={{ fontSize: 13, color: "var(--ds-muted)", margin: 0 }}>Edit text and images on the public website without touching code</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Card 1: Hero */}
        <div style={CARD_STYLE}>
          <span style={SECTION_LABEL}>Homepage Hero</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={LABEL_STYLE}>Hero Tagline</label>
              <textarea style={{ ...INPUT_STYLE, resize: "vertical" }} rows={2} value={heroTagline} onChange={(e) => setHeroTagline(e.target.value)} placeholder="e.g. Fine Dining in the Heart of Lagos" />
            </div>
            <div>
              <label style={LABEL_STYLE}>Hero Image</label>
              {heroImage && (
                <div style={{ marginBottom: 10 }}>
                  <img src={heroImage} alt="" style={{ width: 200, height: 100, objectFit: "cover", borderRadius: 8, border: "1px solid var(--ds-border)" }} />
                </div>
              )}
              <button style={GHOST_BTN} onClick={() => setShowHeroMedia(true)}>Change Image</button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button style={{ ...GOLD_BTN, opacity: heroSaving ? 0.7 : 1 }} onClick={saveHero} disabled={heroSaving}>
                {heroSaving ? "Saving…" : "Save"}
              </button>
              <SaveStatus status={heroStatus} />
            </div>
          </div>
        </div>

        {/* Card 2: About */}
        <div style={CARD_STYLE}>
          <span style={SECTION_LABEL}>About Us</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={LABEL_STYLE}>Brand Story</label>
              <textarea style={{ ...INPUT_STYLE, resize: "vertical" }} rows={8} value={aboutText} onChange={(e) => setAboutText(e.target.value)} placeholder="Tell your restaurant's story…" />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button style={{ ...GOLD_BTN, opacity: aboutSaving ? 0.7 : 1 }} onClick={saveAbout} disabled={aboutSaving}>
                {aboutSaving ? "Saving…" : "Save"}
              </button>
              <SaveStatus status={aboutStatus} />
            </div>
          </div>
        </div>

        {/* Card 3: Hours */}
        <div style={CARD_STYLE}>
          <span style={SECTION_LABEL}>Opening Hours</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
            {DAYS.map((day) => {
              const h = hours[day] ?? { open: "10:00", close: "23:00", closed: false };
              return (
                <div key={day} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 90, fontSize: 13, fontWeight: 500, color: "var(--ds-text)", flexShrink: 0 }}>{day}</span>
                  <input
                    type="time"
                    value={h.open}
                    disabled={h.closed}
                    onChange={(e) => setHour(day, "open", e.target.value)}
                    style={{ ...INPUT_STYLE, width: 120, opacity: h.closed ? 0.4 : 1 }}
                  />
                  <span style={{ color: "var(--ds-muted)", fontSize: 13 }}>–</span>
                  <input
                    type="time"
                    value={h.close}
                    disabled={h.closed}
                    onChange={(e) => setHour(day, "close", e.target.value)}
                    style={{ ...INPUT_STYLE, width: 120, opacity: h.closed ? 0.4 : 1 }}
                  />
                  <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--ds-muted)", cursor: "pointer", whiteSpace: "nowrap" }}>
                    <input
                      type="checkbox"
                      checked={h.closed}
                      onChange={(e) => setHour(day, "closed", e.target.checked)}
                      style={{ accentColor: "var(--ds-gold)" }}
                    />
                    Closed
                  </label>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button style={{ ...GOLD_BTN, opacity: hoursSaving ? 0.7 : 1 }} onClick={saveHours} disabled={hoursSaving}>
              {hoursSaving ? "Saving…" : "Save"}
            </button>
            <SaveStatus status={hoursStatus} />
          </div>
        </div>

        {/* Card 4: Contact */}
        <div style={CARD_STYLE}>
          <span style={SECTION_LABEL}>Contact Information</span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
            <div>
              <label style={LABEL_STYLE}>Phone 1</label>
              <input style={INPUT_STYLE} value={contact.phone1} onChange={(e) => setContact((p) => ({ ...p, phone1: e.target.value }))} placeholder="+234 800 000 0000" />
            </div>
            <div>
              <label style={LABEL_STYLE}>Phone 2</label>
              <input style={INPUT_STYLE} value={contact.phone2} onChange={(e) => setContact((p) => ({ ...p, phone2: e.target.value }))} placeholder="+234 800 000 0001" />
            </div>
            <div>
              <label style={LABEL_STYLE}>Email</label>
              <input style={INPUT_STYLE} type="email" value={contact.email} onChange={(e) => setContact((p) => ({ ...p, email: e.target.value }))} placeholder="info@blackrock.ng" />
            </div>
            <div>
              <label style={LABEL_STYLE}>Address</label>
              <input style={INPUT_STYLE} value={contact.address} onChange={(e) => setContact((p) => ({ ...p, address: e.target.value }))} placeholder="123 Victoria Island, Lagos" />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button style={{ ...GOLD_BTN, opacity: contactSaving ? 0.7 : 1 }} onClick={saveContact} disabled={contactSaving}>
              {contactSaving ? "Saving…" : "Save"}
            </button>
            <SaveStatus status={contactStatus} />
          </div>
        </div>

        {/* Card 5: Gallery */}
        <div style={CARD_STYLE}>
          <span style={SECTION_LABEL}>Gallery Images</span>
          {gallery.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(60px, 1fr))", gap: 8, marginBottom: 16 }}>
              {gallery.map((url, i) => (
                <div key={`${url}-${i}`} style={{ position: "relative", aspectRatio: "1", borderRadius: 6, overflow: "hidden", border: "1px solid var(--ds-border)" }}>
                  <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button
                    onClick={() => removeGalleryImage(url)}
                    style={{
                      position: "absolute", top: 3, right: 3,
                      width: 18, height: 18, borderRadius: "50%",
                      background: "rgba(0,0,0,0.65)", border: "none",
                      cursor: "pointer", color: "#fff", fontSize: 10,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      opacity: 0,
                    }}
                    className="ds-gallery-remove"
                  >
                    <X size={9} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginBottom: 16 }}>
            <button style={GHOST_BTN} onClick={() => setShowGalleryMedia(true)}>Add Images</button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button style={{ ...GOLD_BTN, opacity: gallerySaving ? 0.7 : 1 }} onClick={saveGallery} disabled={gallerySaving}>
              {gallerySaving ? "Saving…" : "Save"}
            </button>
            <SaveStatus status={galleryStatus} />
          </div>
        </div>
      </div>

      {/* Media Pickers */}
      {showHeroMedia && (
        <MediaPickerModal
          onSelect={(url) => setHeroImage(url)}
          onClose={() => setShowHeroMedia(false)}
          multiSelect={false}
        />
      )}
      {showGalleryMedia && (
        <MediaPickerModal
          onSelect={(urls) => setGallery((prev) => [...prev, ...urls.filter((u) => !prev.includes(u))])}
          onClose={() => setShowGalleryMedia(false)}
          multiSelect={true}
        />
      )}

      <style>{`
        .ds-gallery-remove { opacity: 0; transition: opacity 0.15s; }
        .ds-gallery-remove:hover, *:hover > .ds-gallery-remove { opacity: 1 !important; }
        div:hover > div > .ds-gallery-remove { opacity: 1 !important; }
        @media (max-width: 600px) {
          .ds-content-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
