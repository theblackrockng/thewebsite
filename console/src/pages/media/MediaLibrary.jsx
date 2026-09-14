import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import {
  UploadCloud, Copy, Trash2, AlertTriangle, Check,
  X, Link2, Download, ExternalLink,
} from "lucide-react";
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

const SECTION_OPTIONS = [
  { value: "", label: "— None —" },
  { value: "hero", label: "Homepage Hero" },
  { value: "two-spaces-day", label: "Two Spaces — Day" },
  { value: "two-spaces-evening", label: "Two Spaces — Evening" },
  { value: "about-hero", label: "About Page Header" },
  { value: "home-food-reel", label: "Homepage Food Reel" },
  { value: "home-instagram", label: "Homepage Instagram Strip" },
  { value: "gallery-food", label: "Gallery — Food" },
  { value: "gallery-drinks", label: "Gallery — Drinks" },
  { value: "gallery", label: "Gallery — Ambience" },
  { value: "gallery-behind", label: "Gallery — Behind the Scenes" },
  { value: "gallery-faces-day", label: "Gallery — Two Faces Day" },
  { value: "gallery-faces-evening", label: "Gallery — Two Faces Evening" },
  { value: "other", label: "Other" },
];

// Known website image filenames → section
const WEBSITE_IMAGES = [
  { path: "heroimage.png",                          label: "Hero Image",            section: "hero" },
  { path: "food/grilled-fish.png",                  label: "Grilled Fish",          section: "home-food-reel" },
  { path: "food/rice.png",                          label: "Rice",                  section: "home-food-reel" },
  { path: "food/salad.png",                         label: "Salad",                 section: "home-food-reel" },
  { path: "food/vegetable-fried-rice.png",          label: "Vegetable Fried Rice",  section: "home-food-reel" },
  { path: "food/mixed-veg-stirfry.png",             label: "Mixed Veg Stir Fry",    section: "home-food-reel" },
  { path: "food/mixed-veg-stirfry-2.png",           label: "Mixed Veg Stir Fry 2",  section: "home-food-reel" },
  { path: "food/creamy-penne-pasta.png",            label: "Creamy Penne Pasta",    section: "home-food-reel" },
  { path: "food/creamy-herb-soup.png",              label: "Creamy Herb Soup",      section: "home-food-reel" },
  { path: "food/carrot-soup.png",                   label: "Carrot Soup",           section: "home-food-reel" },
  { path: "food/fish-potato-salad.png",             label: "Fish Potato Salad",     section: "home-food-reel" },
  { path: "food/efo-riro.png",                      label: "Efo Riro",              section: "home-food-reel" },
  { path: "food/seafood-okro.png",                  label: "Seafood Okro",          section: "home-food-reel" },
  { path: "food/chicken-veg-stew.png",              label: "Chicken & Veg Stew",    section: "home-food-reel" },
  { path: "food/rice-buns.png",                     label: "Rice Buns",             section: "home-food-reel" },
];

const FILTER_TABS = [
  { key: "hero",           label: "Hero" },
  { key: "home-food-reel", label: "Food Reel" },
  { key: "gallery-food",   label: "Gallery Food" },
  { key: "gallery-drinks", label: "Gallery Drinks" },
  { key: "gallery",        label: "Gallery Ambience" },
  { key: "UNUSED",         label: "Unassigned" },
];

function fmt(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(0) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

function fmtDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/* ─── FilterTab ─── */
function FilterTab({ label, active, onClick, count }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 16px", borderRadius: 99, border: "none", cursor: "pointer",
        fontSize: 12.5, fontWeight: 500, fontFamily: "'DM Sans', sans-serif",
        background: active ? "var(--ds-gold)" : "var(--ds-input-bg)",
        color: active ? "#1a1a1a" : "var(--ds-muted)",
        transition: "background 0.15s, color 0.15s",
        display: "inline-flex", alignItems: "center", gap: 5,
      }}
    >
      {label}
      {count !== undefined && (
        <span style={{ fontSize: 10, background: active ? "rgba(0,0,0,0.15)" : "var(--ds-border)", borderRadius: 99, padding: "1px 6px", fontWeight: 600 }}>
          {count}
        </span>
      )}
    </button>
  );
}

/* ─── SectionBadge ─── */
function SectionBadge({ value }) {
  const opt = SECTION_OPTIONS.find(o => o.value === value);
  if (!value || !opt) return null;
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase",
      background: "var(--ds-gold)", color: "#1a1a1a", borderRadius: 99, padding: "2px 7px",
    }}>{opt.label}</span>
  );
}

/* ─── ImageCard ─── */
function ImageCard({ asset, onDelete, onSelect, selected, onNameUpdated }) {
  const [hovered, setHovered] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(asset.filename ?? "");
  const nameInputRef = useRef(null);

  useEffect(() => setNameVal(asset.filename ?? ""), [asset.filename]);

  const handleCopy = async (e) => {
    e.stopPropagation();
    try { await navigator.clipboard.writeText(asset.url); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const startEditing = (e) => {
    e.stopPropagation();
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.select(), 0);
  };

  const saveName = async () => {
    const trimmed = nameVal.trim();
    setEditingName(false);
    if (!trimmed || trimmed === asset.filename) { setNameVal(asset.filename ?? ""); return; }
    try {
      await supabase.from("media_assets").update({ filename: trimmed }).eq("id", asset.id);
      onNameUpdated({ ...asset, filename: trimmed });
    } catch { setNameVal(asset.filename ?? ""); }
  };

  return (
    <div
      style={{ fontFamily: "'DM Sans', sans-serif", cursor: "pointer" }}
      onClick={() => !editingName && onSelect(asset)}
    >
      <div
        style={{
          position: "relative", aspectRatio: "1", overflow: "hidden", borderRadius: 8,
          background: "var(--ds-input-bg)", border: selected ? "2.5px solid var(--ds-gold)" : "1px solid var(--ds-border)",
          transition: "border-color 0.15s",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <img src={asset.url} alt={asset.filename} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        {/* Section badge */}
        {asset.used_in && (
          <div style={{ position: "absolute", top: 6, left: 6 }}>
            <SectionBadge value={asset.used_in} />
          </div>
        )}
        {/* Hover overlay */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              <button
                onClick={handleCopy}
                title="Copy URL"
                style={{ width: 32, height: 32, borderRadius: 7, background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(asset); }}
                title="Delete"
                style={{ width: 32, height: 32, borderRadius: 7, background: "rgba(239,68,68,0.18)", border: "1px solid rgba(239,68,68,0.3)", cursor: "pointer", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <Trash2 size={13} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Name — click to edit inline */}
      <div style={{ marginTop: 6 }}>
        {editingName ? (
          <input
            ref={nameInputRef}
            value={nameVal}
            onChange={(e) => setNameVal(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveName();
              if (e.key === "Escape") { setEditingName(false); setNameVal(asset.filename ?? ""); }
            }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%", fontSize: 11.5, color: "var(--ds-text)", margin: "0 0 2px",
              background: "var(--ds-input-bg)", border: "1px solid var(--ds-gold)",
              borderRadius: 4, padding: "2px 6px", outline: "none",
              fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box",
            }}
          />
        ) : (
          <p
            title="Click to rename"
            onClick={startEditing}
            style={{
              fontSize: 11.5, color: "var(--ds-text)", margin: "0 0 2px",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              cursor: "text", borderBottom: "1px dashed transparent",
              transition: "border-color 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderBottomColor = "var(--ds-muted)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderBottomColor = "transparent"; }}
          >
            {asset.filename || "Untitled"}
          </p>
        )}
        <p style={{ fontSize: 10.5, color: "var(--ds-muted)", margin: 0 }}>{fmtDate(asset.uploaded_at)}</p>
      </div>
    </div>
  );
}

const ALL_FOOD_CATEGORIES = [
  "Starters", "Salads", "Rice", "Noodles",
  "Pepper Soup & Specials", "Continental", "Sauces",
  "Charcoal Grills", "National Dishes", "Traditional Specials",
];
const ALL_DRINK_CATEGORIES = [
  "Wines", "Spirits", "Beer & Cider", "Cocktails",
  "Mocktails", "Soft Drinks & Water", "Hot Drinks", "Fresh Juice",
];

/* ─── DetailPanel ─── */
function DetailPanel({ asset, onClose, onDeleted, onUpdated }) {
  const [name, setName] = useState(asset.filename ?? "");
  const [section, setSection] = useState(asset.used_in ?? "");
  const [dishes, setDishes] = useState([]);
  const [dishSearch, setDishSearch] = useState("");
  const [selectedDishId, setSelectedDishId] = useState("");
  const [dbCategories, setDbCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(ALL_FOOD_CATEGORIES[0]);
  const [saving, setSaving] = useState(false);
  const [assigningDish, setAssigningDish] = useState(false);
  const [assigningCat, setAssigningCat] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [dishStatus, setDishStatus] = useState(null);
  const [catStatus, setCatStatus] = useState(null);

  useEffect(() => {
    supabase.from("menu_items").select("id, name, category, menu_type, image_url").order("category").then(({ data }) => {
      if (data) {
        setDishes(data);
        const extraCats = [...new Set(data.map(d => d.category).filter(Boolean))]
          .filter(c => !ALL_FOOD_CATEGORIES.includes(c) && !ALL_DRINK_CATEGORIES.includes(c));
        setDbCategories(extraCats);
      }
    });
  }, []);

  const allCategories = [...ALL_FOOD_CATEGORIES, ...ALL_DRINK_CATEGORIES, ...dbCategories];

  const filteredDishes = dishSearch.trim()
    ? dishes.filter(d =>
        d.name.toLowerCase().includes(dishSearch.toLowerCase()) ||
        d.category.toLowerCase().includes(dishSearch.toLowerCase())
      )
    : dishes;

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus(null);
    try {
      const updates = { used_in: section || null, filename: name.trim() || asset.filename };
      const { error } = await supabase.from("media_assets").update(updates).eq("id", asset.id);
      if (error) throw error;

      if (section === "hero") {
        const { data: existing } = await supabase.from("site_content").select("data").eq("section", "hero").maybeSingle();
        const current = existing?.data ?? {};
        await supabase.from("site_content").upsert({ section: "hero", data: { ...current, image: asset.url } }, { onConflict: "section" });
      }
      if (section === "gallery") {
        const { data: existing } = await supabase.from("site_content").select("data").eq("section", "gallery").maybeSingle();
        const imgs = Array.isArray(existing?.data?.images) ? existing.data.images : [];
        if (!imgs.includes(asset.url)) {
          await supabase.from("site_content").upsert({ section: "gallery", data: { images: [...imgs, asset.url] } }, { onConflict: "section" });
        }
      }

      setSaveStatus("saved");
      onUpdated({ ...asset, ...updates });
      setTimeout(() => setSaveStatus(null), 2500);
    } catch (e) {
      setSaveStatus(e.message ?? "Error saving");
    } finally {
      setSaving(false);
    }
  };

  const handleAssignToDish = async () => {
    if (!selectedDishId) return;
    setAssigningDish(true);
    setDishStatus(null);
    try {
      const { error } = await supabase.from("menu_items").update({ image_url: asset.url }).eq("id", selectedDishId);
      if (error) throw error;
      setDishStatus("saved");
      setTimeout(() => setDishStatus(null), 2500);
    } catch (e) {
      setDishStatus(e.message ?? "Error");
    } finally {
      setAssigningDish(false);
    }
  };

  const handleAssignToCategory = async () => {
    if (!selectedCategory) return;
    setAssigningCat(true);
    setCatStatus(null);
    try {
      const { data: existing } = await supabase.from("site_content").select("data").eq("section", "menu-category-images").maybeSingle();
      const current = existing?.data ?? {};
      const { error } = await supabase.from("site_content").upsert(
        { section: "menu-category-images", data: { ...current, [selectedCategory]: asset.url } },
        { onConflict: "section" }
      );
      if (error) throw error;
      setCatStatus("saved");
      setTimeout(() => setCatStatus(null), 2500);
    } catch (e) {
      setCatStatus(e.message ?? "Error");
    } finally {
      setAssigningCat(false);
    }
  };

  const selectedDish = dishes.find(d => String(d.id) === String(selectedDishId));

  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(0,0,0,0.35)" }} onClick={onClose} />
      <motion.div
        initial={{ x: 420, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 420, opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 260 }}
        style={{
          position: "fixed", right: 0, top: 0, bottom: 0, width: 420, zIndex: 100,
          background: "var(--ds-surface)", borderLeft: "1px solid var(--ds-border)",
          display: "flex", flexDirection: "column", fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {/* Header */}
        <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid var(--ds-border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 600, color: "var(--ds-text)" }}>Image Details</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ds-muted)", display: "flex" }}><X size={18} /></button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Preview */}
          <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid var(--ds-border)", background: "var(--ds-input-bg)", aspectRatio: "16/10", flexShrink: 0 }}>
            <img src={asset.url} alt={asset.filename} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>

          {/* Meta row */}
          <div style={{ display: "flex", gap: 8 }}>
            {asset.file_size && (
              <div style={{ flex: 1, background: "var(--ds-input-bg)", borderRadius: 8, padding: "8px 12px" }}>
                <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--ds-muted)", margin: "0 0 2px" }}>Size</p>
                <p style={{ fontSize: 12, color: "var(--ds-text)", margin: 0 }}>{fmt(asset.file_size)}</p>
              </div>
            )}
            {asset.uploaded_at && (
              <div style={{ flex: 1, background: "var(--ds-input-bg)", borderRadius: 8, padding: "8px 12px" }}>
                <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--ds-muted)", margin: "0 0 2px" }}>Uploaded</p>
                <p style={{ fontSize: 12, color: "var(--ds-text)", margin: 0 }}>{fmtDate(asset.uploaded_at)}</p>
              </div>
            )}
          </div>

          {/* ── Editable Name ── */}
          <div>
            <label style={LABEL_STYLE}>Image Name</label>
            <input
              style={INPUT_STYLE}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Grilled Fish"
            />
          </div>

          {/* ── Website Section ── */}
          <div>
            <label style={LABEL_STYLE}>Display on Website</label>
            <select style={{ ...INPUT_STYLE, cursor: "pointer" }} value={section} onChange={(e) => setSection(e.target.value)}>
              {SECTION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <p style={{ fontSize: 11, color: "var(--ds-muted)", marginTop: 5, lineHeight: 1.5 }}>
              {section === "hero" && "Main hero background on the homepage."}
              {section === "home-food-reel" && "Scrolling food strip on the homepage."}
              {section === "home-instagram" && "Instagram strip section."}
              {section === "gallery-food" && "Gallery page — Food category."}
              {section === "gallery-drinks" && "Gallery page — Drinks category."}
              {section === "gallery" && "Gallery page — Ambience category."}
              {section === "about" && "About page."}
              {!section && "Not displayed anywhere on the website."}
            </p>
          </div>

          {/* ── Assign to Dish ── */}
          <div style={{ borderTop: "1px solid var(--ds-border)", paddingTop: 16 }}>
            <label style={LABEL_STYLE}>Assign to Dish</label>
            <input
              style={{ ...INPUT_STYLE, marginBottom: 8 }}
              value={dishSearch}
              onChange={(e) => setDishSearch(e.target.value)}
              placeholder="Search dishes…"
            />
            <select
              style={{ ...INPUT_STYLE, cursor: "pointer", maxHeight: 160 }}
              size={5}
              value={selectedDishId}
              onChange={(e) => setSelectedDishId(e.target.value)}
            >
              {filteredDishes.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} — {d.category}
                </option>
              ))}
            </select>
            {selectedDish && (
              <p style={{ fontSize: 11, color: "var(--ds-muted)", marginTop: 5 }}>
                Selected: <strong style={{ color: "var(--ds-text)" }}>{selectedDish.name}</strong>
              </p>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
              <button
                style={{ ...GOLD_BTN, opacity: (!selectedDishId || assigningDish) ? 0.5 : 1 }}
                onClick={handleAssignToDish}
                disabled={!selectedDishId || assigningDish}
              >
                <Check size={13} /> {assigningDish ? "Assigning…" : "Assign to Dish"}
              </button>
              {dishStatus && (
                <span style={{ fontSize: 11.5, color: dishStatus === "saved" ? "#16a34a" : "#ef4444" }}>
                  {dishStatus === "saved" ? "Assigned ✓" : dishStatus}
                </span>
              )}
            </div>
          </div>

          {/* ── Assign to Category ── */}
          <div style={{ borderTop: "1px solid var(--ds-border)", paddingTop: 16 }}>
            <label style={LABEL_STYLE}>Assign as Category Image</label>
            <select
              style={{ ...INPUT_STYLE, cursor: "pointer", marginBottom: 8 }}
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {allCategories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <p style={{ fontSize: 11, color: "var(--ds-muted)", marginBottom: 8, lineHeight: 1.5 }}>
              This image will appear as the cover photo for the <strong style={{ color: "var(--ds-text)" }}>{selectedCategory}</strong> category on the menu page.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                style={{ ...GOLD_BTN, opacity: assigningCat ? 0.5 : 1 }}
                onClick={handleAssignToCategory}
                disabled={assigningCat}
              >
                <Check size={13} /> {assigningCat ? "Assigning…" : "Assign to Category"}
              </button>
              {catStatus && (
                <span style={{ fontSize: 11.5, color: catStatus === "saved" ? "#16a34a" : "#ef4444" }}>
                  {catStatus === "saved" ? "Assigned ✓" : catStatus}
                </span>
              )}
            </div>
          </div>

          {/* ── Image URL ── */}
          <div style={{ borderTop: "1px solid var(--ds-border)", paddingTop: 16 }}>
            <label style={LABEL_STYLE}>Image URL</label>
            <div style={{ display: "flex", gap: 6 }}>
              <input style={{ ...INPUT_STYLE, fontSize: 11, color: "var(--ds-muted)" }} readOnly value={asset.url} />
              <button
                style={{ ...GHOST_BTN, flexShrink: 0, padding: "10px 12px" }}
                onClick={async () => { try { await navigator.clipboard.writeText(asset.url); } catch {} }}
                title="Copy URL"
              >
                <Copy size={13} />
              </button>
              <a
                href={asset.url} target="_blank" rel="noopener noreferrer"
                style={{ ...GHOST_BTN, flexShrink: 0, padding: "10px 12px", textDecoration: "none" }}
                title="Open in new tab"
              >
                <ExternalLink size={13} />
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 20px", borderTop: "1px solid var(--ds-border)", display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
          <button
            style={{ ...GOLD_BTN, flex: 1, justifyContent: "center", opacity: saving ? 0.7 : 1 }}
            onClick={handleSave}
            disabled={saving}
          >
            <Check size={14} /> {saving ? "Saving…" : "Save"}
          </button>
          <button
            style={{ ...GHOST_BTN, color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}
            onClick={() => onDeleted(asset)}
          >
            <Trash2 size={13} />
          </button>
          {saveStatus && (
            <span style={{ fontSize: 11.5, color: saveStatus === "saved" ? "#16a34a" : "#ef4444" }}>
              {saveStatus === "saved" ? "Saved ✓" : saveStatus}
            </span>
          )}
        </div>
      </motion.div>
    </>
  );
}

/* ─── ImportModal ─── */
function ImportModal({ onClose, onImported }) {
  const [siteUrl, setSiteUrl] = useState(localStorage.getItem("bk_site_url") ?? "");
  const [status, setStatus] = useState([]); // [{filename, state: "pending"|"ok"|"skip"|"error", msg}]
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const handleImport = async () => {
    const base = siteUrl.replace(/\/$/, "");
    if (!base) return;
    localStorage.setItem("bk_site_url", base);

    setRunning(true);
    setDone(false);
    const initial = WEBSITE_IMAGES.map((img) => ({ ...img, state: "pending", msg: "" }));
    setStatus(initial);

    let count = 0;
    for (let i = 0; i < WEBSITE_IMAGES.length; i++) {
      const img = WEBSITE_IMAGES[i];

      // Check if already exists
      const { data: existing } = await supabase
        .from("media_assets")
        .select("id")
        .eq("filename", img.path)
        .maybeSingle();

      if (existing) {
        setStatus((prev) => prev.map((s, idx) => idx === i ? { ...s, state: "skip", msg: "Already exists" } : s));
        continue;
      }

      try {
        // Fetch image from deployed website
        const res = await fetch(`${base}/${img.path}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const ext = img.path.split(".").pop().toLowerCase();
        const mimeType = ext === "png" ? "image/png" : ext === "gif" ? "image/gif" : "image/jpeg";
        const storageBlob = new Blob([blob], { type: mimeType });

        const storagePath = `website/${img.path.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: upErr } = await supabase.storage
          .from("media-library")
          .upload(storagePath, storageBlob, { contentType: mimeType, upsert: true });

        if (upErr) throw upErr;

        const { data: { publicUrl } } = supabase.storage.from("media-library").getPublicUrl(storagePath);

        const { error: insErr } = await supabase.from("media_assets").insert({
          url: publicUrl,
          filename: img.path,
          file_size: blob.size,
          used_in: img.section,
        });

        if (insErr) throw insErr;
        setStatus((prev) => prev.map((s, idx) => idx === i ? { ...s, state: "ok", msg: img.section } : s));
        count++;
      } catch (e) {
        setStatus((prev) => prev.map((s, idx) => idx === i ? { ...s, state: "error", msg: e.message } : s));
      }
    }

    setRunning(false);
    setDone(true);
    if (count > 0) onImported();
  };

  const stateColor = (s) => s === "ok" ? "#16a34a" : s === "skip" ? "var(--ds-muted)" : s === "error" ? "#ef4444" : "var(--ds-muted)";
  const stateLabel = (s) => s === "ok" ? "✓" : s === "skip" ? "—" : s === "error" ? "✗" : "…";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.55)" }}>
      <div style={{ background: "var(--ds-surface)", border: "1px solid var(--ds-border)", borderRadius: 12, width: 540, maxHeight: "86vh", display: "flex", flexDirection: "column", fontFamily: "'DM Sans', sans-serif", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid var(--ds-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 21, fontWeight: 600, color: "var(--ds-text)" }}>Import from Website</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ds-muted)", display: "flex" }}><X size={18} /></button>
        </div>

        <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--ds-border)" }}>
          <label style={LABEL_STYLE}>Your Website URL</label>
          <input
            style={INPUT_STYLE}
            value={siteUrl}
            onChange={(e) => setSiteUrl(e.target.value)}
            placeholder="https://theblackrock.netlify.app"
            disabled={running}
          />
          <p style={{ fontSize: 11, color: "var(--ds-muted)", marginTop: 6, lineHeight: 1.5 }}>
            Enter the URL where your website is deployed. Each image will be fetched and uploaded to Supabase.
            Requires the <strong>media-library</strong> storage bucket to exist in Supabase.
          </p>
          <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 8, background: "rgba(200,169,110,0.08)", border: "1px solid rgba(200,169,110,0.2)" }}>
            <p style={{ fontSize: 11, color: "var(--ds-muted)", margin: 0, lineHeight: 1.6 }}>
              <strong style={{ color: "var(--ds-text)" }}>First time setup:</strong> Create the{" "}
              <strong>media-library</strong> bucket in{" "}
              <a href="https://supabase.com/dashboard/project/jwklezuaqesptccsnesr/storage/buckets" target="_blank" rel="noopener noreferrer" style={{ color: "var(--ds-gold)" }}>
                Supabase Storage <ExternalLink size={10} style={{ display: "inline" }} />
              </a>{" "}
              as a <strong>public</strong> bucket, then come back here.
            </p>
          </div>
        </div>

        {/* Progress list */}
        {status.length > 0 && (
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px" }}>
            {status.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0", borderBottom: "1px solid var(--ds-border)" }}>
                <span style={{ width: 18, textAlign: "center", fontSize: 12, fontWeight: 700, color: stateColor(s.state) }}>{stateLabel(s.state)}</span>
                <span style={{ flex: 1, fontSize: 12, color: "var(--ds-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.path}</span>
                <span style={{ fontSize: 11, color: stateColor(s.state), whiteSpace: "nowrap" }}>{s.msg}</span>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ padding: "14px 20px", borderTop: "1px solid var(--ds-border)", display: "flex", gap: 8, alignItems: "center" }}>
          {done ? (
            <>
              <button style={{ ...GOLD_BTN, flex: 1, justifyContent: "center" }} onClick={onClose}><Check size={14} /> Done</button>
            </>
          ) : (
            <>
              <button style={{ ...GOLD_BTN, flex: 1, justifyContent: "center", opacity: running || !siteUrl ? 0.6 : 1 }} onClick={handleImport} disabled={running || !siteUrl}>
                <Download size={14} /> {running ? "Importing…" : `Import ${WEBSITE_IMAGES.length} Images`}
              </button>
              <button style={GHOST_BTN} onClick={onClose} disabled={running}>Cancel</button>
            </>
          )}
        </div>
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
                ? `This image is displayed in "${SECTION_OPTIONS.find(o => o.value === asset.used_in)?.label ?? asset.used_in}". Deleting removes it from the website.`
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
  const [activeTab, setActiveTab] = useState("home-food-reel");
  const [dragOver, setDragOver] = useState(false);
  const [uploads, setUploads] = useState([]);
  const [deletingAsset, setDeletingAsset] = useState(null);
  const [confirmDeleting, setConfirmDeleting] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const fileInputRef = useRef(null);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("media_assets")
        .select("*")
        .order("uploaded_at", { ascending: false });
      if (!error && data) setAssets(data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  const tabCount = (key) => {
    if (key === "UNUSED") return assets.filter(a => !a.used_in || !a.used_in.trim()).length;
    return assets.filter(a => a.used_in === key).length;
  };

  const filtered = assets.filter((a) => {
    if (activeTab === "UNUSED") return !a.used_in || !a.used_in.trim();
    return a.used_in === activeTab;
  });

  const uploadFiles = async (files) => {
    const fileArr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!fileArr.length) return;
    const initial = fileArr.map((f) => ({ filename: f.name, progress: 0, done: false, error: false }));
    setUploads((prev) => [...prev, ...initial]);

    const startIdx = uploads.length;
    for (let i = 0; i < fileArr.length; i++) {
      const file = fileArr[i];
      const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
      setUploads((prev) => prev.map((u, idx) => idx === startIdx + i ? { ...u, progress: 40 } : u));
      try {
        const { error: upErr } = await supabase.storage.from("media-library").upload(path, file, { upsert: false });
        if (upErr) throw upErr;
        setUploads((prev) => prev.map((u, idx) => idx === startIdx + i ? { ...u, progress: 80 } : u));
        const { data: { publicUrl } } = supabase.storage.from("media-library").getPublicUrl(path);
        await supabase.from("media_assets").insert({ url: publicUrl, filename: file.name, file_size: file.size, used_in: null });
        setUploads((prev) => prev.map((u, idx) => idx === startIdx + i ? { ...u, progress: 100, done: true } : u));
      } catch {
        setUploads((prev) => prev.map((u, idx) => idx === startIdx + i ? { ...u, done: true, error: true } : u));
      }
    }
    await fetchAssets();
    setTimeout(() => setUploads([]), 2500);
  };

  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); uploadFiles(e.dataTransfer.files); };
  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);

  const handleDelete = async () => {
    if (!deletingAsset) return;
    setConfirmDeleting(true);
    try {
      const url = deletingAsset.url;
      const parts = url.split("/storage/v1/object/public/media-library/");
      if (parts[1]) await supabase.storage.from("media-library").remove([parts[1]]);
      await supabase.from("media_assets").delete().eq("id", deletingAsset.id);
      setAssets((prev) => prev.filter((a) => a.id !== deletingAsset.id));
      if (selectedAsset?.id === deletingAsset.id) setSelectedAsset(null);
    } catch {}
    setDeletingAsset(null);
    setConfirmDeleting(false);
  };

  const handleUpdated = (updated) => {
    setAssets((prev) => prev.map((a) => a.id === updated.id ? updated : a));
    setSelectedAsset(updated);
  };

  return (
    <div style={{ padding: "28px 32px 40px", fontFamily: "'DM Sans', sans-serif", maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 600, color: "var(--ds-text)", margin: "0 0 4px" }}>Media Library</h1>
          <p style={{ fontSize: 13, color: "var(--ds-muted)", margin: 0 }}>
            {assets.length} image{assets.length !== 1 ? "s" : ""} — click any image to assign it to a website section
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={GHOST_BTN} onClick={() => setShowImport(true)}>
            <Download size={14} /> Import from Website
          </button>
          <button style={GHOST_BTN} onClick={() => fileInputRef.current?.click()}>
            <UploadCloud size={14} /> Upload Images
          </button>
        </div>
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
          border: dragOver ? "2px solid var(--ds-gold)" : "2px dashed rgba(200,169,110,0.35)",
          borderRadius: 8,
          background: dragOver ? "rgba(200,169,110,0.12)" : "rgba(200,169,110,0.04)",
          padding: "22px 20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          cursor: "pointer",
          transition: "background 0.15s, border 0.15s",
        }}
      >
        <UploadCloud size={24} strokeWidth={1.5} style={{ color: "var(--ds-gold)", opacity: 0.6 }} />
        <p style={{ fontSize: 12.5, color: "var(--ds-muted)", margin: 0 }}>Drag & drop images here or click to upload</p>
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
      <div style={{ display: "flex", gap: 8, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
        {FILTER_TABS.map((t) => (
          <FilterTab
            key={t.key}
            label={t.label}
            active={activeTab === t.key}
            count={tabCount(t.key)}
            onClick={() => setActiveTab(t.key)}
          />
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ textAlign: "center", color: "var(--ds-muted)", padding: "60px 0", fontSize: 13 }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 0", gap: 14 }}>
          <UploadCloud size={40} strokeWidth={1.2} style={{ color: "var(--ds-muted)", opacity: 0.35 }} />
          <p style={{ color: "var(--ds-muted)", fontSize: 14, margin: 0 }}>
            No images in this section.
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
                <ImageCard
                  asset={asset}
                  onDelete={setDeletingAsset}
                  onSelect={setSelectedAsset}
                  selected={selectedAsset?.id === asset.id}
                  onNameUpdated={handleUpdated}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Detail Panel */}
      <AnimatePresence>
        {selectedAsset && (
          <DetailPanel
            asset={selectedAsset}
            onClose={() => setSelectedAsset(null)}
            onDeleted={(a) => { setSelectedAsset(null); setDeletingAsset(a); }}
            onUpdated={handleUpdated}
          />
        )}
      </AnimatePresence>

      {/* Import Modal */}
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImported={() => { fetchAssets(); setShowImport(false); }}
        />
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
          grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
          gap: 14px;
        }
        @media (max-width: 600px) {
          .ds-media-grid { grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); }
        }
      `}</style>
    </div>
  );
}
