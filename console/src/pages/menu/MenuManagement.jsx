import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import {
  Plus, Pencil, Trash2, ImageOff, UtensilsCrossed,
  X, AlertTriangle, Check,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* ─── Constants ─── */
const CATEGORIES = [
  "Starters", "Salads", "Rice", "Noodles",
  "Pepper Soup & Specials", "Continental", "Sauces",
  "Charcoal Grills", "National Dishes", "Traditional Specials",
];

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

/* ─── MediaPickerModal ─── */
function MediaPickerModal({ onSelect, onClose }) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

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

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.55)" }}>
      <div style={{ background: "var(--ds-surface)", border: "1px solid var(--ds-border)", borderRadius: 12, width: 560, maxHeight: "80vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid var(--ds-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 600, color: "var(--ds-text)" }}>Media Library</span>
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
                  onClick={() => setSelected(a)}
                  style={{
                    aspectRatio: "1", overflow: "hidden", borderRadius: 8, cursor: "pointer",
                    border: selected?.id === a.id ? "2.5px solid var(--ds-gold)" : "2px solid transparent",
                    position: "relative",
                  }}
                >
                  <img src={a.url} alt={a.filename} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--ds-border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button style={GHOST_BTN} onClick={onClose}>Cancel</button>
          <button
            style={{ ...GOLD_BTN, opacity: selected ? 1 : 0.5 }}
            onClick={() => { if (selected) { onSelect(selected.url); onClose(); } }}
          >
            <Check size={14} /> Use Image
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── DishCard ─── */
function DishCard({ dish, onEdit, onDelete, onToggleAvailable }) {
  return (
    <div style={{ background: "var(--ds-surface)", border: "1px solid var(--ds-border)", borderRadius: 11, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {/* Image */}
      <div style={{ height: 160, overflow: "hidden", position: "relative", background: "rgba(200,169,110,0.06)" }}>
        {dish.image_url ? (
          <img src={dish.image_url} alt={dish.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 6, color: "var(--ds-muted)" }}>
            <ImageOff size={28} strokeWidth={1.5} />
            <span style={{ fontSize: 11 }}>No photo yet</span>
          </div>
        )}
      </div>
      {/* Body */}
      <div style={{ padding: "12px 14px 10px", flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ds-text)", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.3 }}>{dish.name}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ds-gold)", whiteSpace: "nowrap" }}>₦{Number(dish.price).toLocaleString()}</span>
        </div>
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--ds-muted)", background: "var(--ds-input-bg)", borderRadius: 99, padding: "2px 8px", alignSelf: "flex-start" }}>{dish.category}</span>
        {dish.description && (
          <p style={{ fontSize: 12, color: "var(--ds-muted)", margin: 0, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{dish.description}</p>
        )}
      </div>
      {/* Footer */}
      <div style={{ padding: "8px 14px 12px", display: "flex", alignItems: "center", gap: 8, borderTop: "1px solid var(--ds-border)" }}>
        <button
          onClick={() => onToggleAvailable(dish)}
          style={{
            fontSize: 11, fontWeight: 600, borderRadius: 99, padding: "4px 10px", border: "none", cursor: "pointer",
            background: dish.available ? "var(--ds-gold)" : "var(--ds-input-bg)",
            color: dish.available ? "#1a1a1a" : "var(--ds-muted)",
          }}
        >
          {dish.available ? "Available" : "Unavailable"}
        </button>
        <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
          <button
            onClick={() => onEdit(dish)}
            style={{ background: "var(--ds-input-bg)", border: "1px solid var(--ds-border)", borderRadius: 7, padding: "6px 8px", cursor: "pointer", color: "var(--ds-muted)", display: "flex" }}
          ><Pencil size={13} /></button>
          <button
            onClick={() => onDelete(dish)}
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 7, padding: "6px 8px", cursor: "pointer", color: "#ef4444", display: "flex" }}
          ><Trash2 size={13} /></button>
        </div>
      </div>
    </div>
  );
}

/* ─── EditPanel ─── */
function EditPanel({ dish, onClose, onSaved }) {
  const isNew = !dish?.id;
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({
    name: dish?.name ?? "",
    category: dish?.category ?? CATEGORIES[0],
    price: dish?.price ?? "",
    description: dish?.description ?? "",
    available: dish?.available ?? true,
    image_url: dish?.image_url ?? "",
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) { setError("Dish name is required."); return; }
    if (!form.price) { setError("Price is required."); return; }
    setSaving(true);
    setError("");
    try {
      let imageUrl = form.image_url;
      if (selectedFile) {
        const path = `${Date.now()}-${selectedFile.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
        const { error: upErr } = await supabase.storage.from("menu-images").upload(path, selectedFile, { cacheControl: "3600", upsert: false });
        if (upErr) throw upErr;
        const { data: { publicUrl } } = supabase.storage.from("menu-images").getPublicUrl(path);
        imageUrl = publicUrl;
      }
      const payload = {
        name: form.name.trim(),
        category: form.category,
        price: parseFloat(String(form.price).replace(/,/g, "")),
        description: form.description.trim(),
        available: form.available,
        image_url: imageUrl || null,
      };
      if (isNew) {
        const { error: insErr } = await supabase.from("menu_items").insert(payload);
        if (insErr) throw insErr;
      } else {
        const { error: updErr } = await supabase.from("menu_items").update(payload).eq("id", dish.id);
        if (updErr) throw updErr;
      }
      onSaved();
    } catch (e) {
      setError(e.message ?? "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(0,0,0,0.3)" }} onClick={onClose} />
      <motion.div
        initial={{ x: 400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 400, opacity: 0 }}
        transition={{ type: "spring", damping: 26, stiffness: 260 }}
        style={{
          position: "fixed", right: 0, top: 0, bottom: 0, width: 380, zIndex: 100,
          background: "var(--ds-surface)", borderLeft: "1px solid var(--ds-border)",
          display: "flex", flexDirection: "column", fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {/* Header */}
        <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid var(--ds-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 600, color: "var(--ds-text)" }}>
            {isNew ? "Add Dish" : "Edit Dish"}
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ds-muted)", display: "flex" }}><X size={18} /></button>
        </div>

        {/* Form */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Name */}
            <div>
              <label style={LABEL_STYLE}>Dish Name</label>
              <input style={INPUT_STYLE} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Grilled Snapper" />
            </div>
            {/* Category */}
            <div>
              <label style={LABEL_STYLE}>Category</label>
              <select style={INPUT_STYLE} value={form.category} onChange={(e) => set("category", e.target.value)}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {/* Price */}
            <div>
              <label style={LABEL_STYLE}>Price ₦</label>
              <input style={INPUT_STYLE} value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="e.g. 5,500" />
            </div>
            {/* Description */}
            <div>
              <label style={LABEL_STYLE}>Description</label>
              <textarea style={{ ...INPUT_STYLE, resize: "vertical" }} rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Short description…" />
            </div>
            {/* Available */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <label style={{ ...LABEL_STYLE, marginBottom: 0 }}>Available</label>
              <button
                onClick={() => set("available", !form.available)}
                style={{
                  width: 44, height: 24, borderRadius: 99, border: "none", cursor: "pointer", position: "relative",
                  background: form.available ? "var(--ds-gold)" : "var(--ds-border)",
                  transition: "background 0.2s",
                }}
              >
                <span style={{
                  position: "absolute", top: 3, left: form.available ? 23 : 3, width: 18, height: 18,
                  borderRadius: "50%", background: form.available ? "#1a1a1a" : "var(--ds-muted)",
                  transition: "left 0.2s",
                }} />
              </button>
            </div>
            {/* Image */}
            <div>
              <label style={LABEL_STYLE}>Image</label>
              {form.image_url && (
                <div style={{ marginBottom: 10 }}>
                  <img src={form.image_url} alt="" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8, border: "1px solid var(--ds-border)" }} />
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { if (e.target.files?.[0]) setSelectedFile(e.target.files[0]); }} />
                <button style={GHOST_BTN} onClick={() => fileInputRef.current?.click()}>Upload New Image</button>
                <button style={GHOST_BTN} onClick={() => setShowMediaPicker(true)}>Choose from Media Library</button>
                {selectedFile && <span style={{ fontSize: 11, color: "var(--ds-muted)" }}>{selectedFile.name}</span>}
              </div>
            </div>
            {error && <p style={{ fontSize: 12, color: "#ef4444", margin: 0 }}>{error}</p>}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 20px", borderTop: "1px solid var(--ds-border)", display: "flex", gap: 8 }}>
          <button style={{ ...GOLD_BTN, flex: 1, justifyContent: "center", opacity: saving ? 0.7 : 1 }} onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Dish"}
          </button>
          <button style={GHOST_BTN} onClick={onClose}>Cancel</button>
        </div>
      </motion.div>

      {showMediaPicker && (
        <MediaPickerModal
          onSelect={(url) => { set("image_url", url); setSelectedFile(null); }}
          onClose={() => setShowMediaPicker(false)}
        />
      )}
    </>
  );
}

/* ─── DeleteConfirm ─── */
function DeleteConfirm({ dish, onConfirm, onClose, deleting }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 150, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.55)" }}>
      <div style={{ background: "var(--ds-surface)", border: "1px solid var(--ds-border)", borderRadius: 12, padding: "28px 28px 24px", maxWidth: 400, width: "90%", fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 18 }}>
          <AlertTriangle size={22} style={{ color: "#ef4444", flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ fontWeight: 600, color: "var(--ds-text)", margin: "0 0 6px", fontSize: 15 }}>Delete dish?</p>
            <p style={{ color: "var(--ds-muted)", margin: 0, fontSize: 13, lineHeight: 1.5 }}>
              "{dish?.name}" will be permanently removed from the menu. This cannot be undone.
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

/* ─── FilterTab ─── */
function FilterTab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flexShrink: 0, padding: "6px 16px", borderRadius: 99, border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 500,
        background: active ? "var(--ds-gold)" : "var(--ds-input-bg)",
        color: active ? "#1a1a1a" : "var(--ds-muted)",
        fontFamily: "'DM Sans', sans-serif",
        transition: "background 0.15s, color 0.15s",
      }}
    >
      {label}
    </button>
  );
}

/* ─── MenuManagement ─── */
export default function MenuManagement() {
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [editingDish, setEditingDish] = useState(null);
  const [showPanel, setShowPanel] = useState(false);
  const [deletingDish, setDeletingDish] = useState(null);
  const [confirmDeleting, setConfirmDeleting] = useState(false);

  const fetchDishes = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("menu_items").select("*").order("created_at", { ascending: true });
    if (!error && data) setDishes(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchDishes(); }, [fetchDishes]);

  const filtered = activeCategory === "All" ? dishes : dishes.filter((d) => d.category === activeCategory);

  const handleToggleAvailable = async (dish) => {
    await supabase.from("menu_items").update({ available: !dish.available }).eq("id", dish.id);
    setDishes((prev) => prev.map((d) => d.id === dish.id ? { ...d, available: !d.available } : d));
  };

  const handleDelete = async () => {
    if (!deletingDish) return;
    setConfirmDeleting(true);
    await supabase.from("menu_items").delete().eq("id", deletingDish.id);
    setDishes((prev) => prev.filter((d) => d.id !== deletingDish.id));
    setDeletingDish(null);
    setConfirmDeleting(false);
  };

  const openAdd = () => { setEditingDish(null); setShowPanel(true); };
  const openEdit = (dish) => { setEditingDish(dish); setShowPanel(true); };

  return (
    <div style={{ padding: "28px 32px 40px", fontFamily: "'DM Sans', sans-serif", maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 600, color: "var(--ds-text)", margin: "0 0 4px" }}>Menu Management</h1>
          <p style={{ fontSize: 13, color: "var(--ds-muted)", margin: 0 }}>Add, edit, and manage dishes on the public website</p>
        </div>
        <button style={GOLD_BTN} onClick={openAdd}><Plus size={15} /> Add New Dish</button>
      </div>

      {/* Category Filter */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 24 }}>
        <FilterTab label="All" active={activeCategory === "All"} onClick={() => setActiveCategory("All")} />
        {CATEGORIES.map((c) => (
          <FilterTab key={c} label={c} active={activeCategory === c} onClick={() => setActiveCategory(c)} />
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ textAlign: "center", color: "var(--ds-muted)", padding: "60px 0", fontSize: 13 }}>Loading dishes…</div>
      ) : filtered.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", gap: 14 }}>
          <UtensilsCrossed size={40} strokeWidth={1.2} style={{ color: "var(--ds-muted)", opacity: 0.4 }} />
          <p style={{ color: "var(--ds-muted)", fontSize: 14, margin: 0, textAlign: "center" }}>
            {activeCategory === "All" ? "No dishes yet. Add your first dish to get started." : `No dishes in "${activeCategory}" yet.`}
          </p>
          {activeCategory === "All" && (
            <button style={GOLD_BTN} onClick={openAdd}><Plus size={14} /> Add New Dish</button>
          )}
        </div>
      ) : (
        <div className="ds-menu-grid">
          <AnimatePresence>
            {filtered.map((dish) => (
              <motion.div
                key={dish.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.2 }}
              >
                <DishCard
                  dish={dish}
                  onEdit={openEdit}
                  onDelete={setDeletingDish}
                  onToggleAvailable={handleToggleAvailable}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Edit/Add Panel */}
      <AnimatePresence>
        {showPanel && (
          <EditPanel
            dish={editingDish}
            onClose={() => { setShowPanel(false); setEditingDish(null); }}
            onSaved={() => { setShowPanel(false); setEditingDish(null); fetchDishes(); }}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      {deletingDish && (
        <DeleteConfirm
          dish={deletingDish}
          onConfirm={handleDelete}
          onClose={() => setDeletingDish(null)}
          deleting={confirmDeleting}
        />
      )}

      <style>{`
        .ds-menu-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 16px;
        }
      `}</style>
    </div>
  );
}
