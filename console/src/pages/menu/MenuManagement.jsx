import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import {
  Plus, Pencil, Trash2, ImageOff, UtensilsCrossed,
  X, AlertTriangle, Check, Download, GripVertical, Camera,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* ─── Seed Data ─── */
const SEED_MENU = [
  // Starters
  { name: "Vegetable Spring Roll", price: 3000, category: "Starters", available: true },
  { name: "Chicken Spring Roll", price: 3500, category: "Starters", available: true },
  { name: "Naan Bread (Cheese)", price: 4500, category: "Starters", available: true },
  { name: "Naan Bread (Garlic & Plain)", price: 3500, category: "Starters", available: true },
  { name: "Massa and Chilli Sauce (2 Pc)", price: 2000, category: "Starters", available: true },
  { name: "Cream of Sweet Corn", price: 3500, category: "Starters", available: true },
  { name: "Tomato Cream Soup", price: 3500, category: "Starters", available: true },
  { name: "Cream of Mushroom Soup", price: 3500, category: "Starters", available: true },
  { name: "Chicken Corn Soup", price: 3500, category: "Starters", available: true },
  { name: "Gizzard in Plantain Sauce", price: 3500, category: "Starters", available: true },
  { name: "Steam Veg/Potato + Protein Chops", price: 7500, category: "Starters", available: true },
  // Salads
  { name: "Chicken Caesar Salad", price: 6000, category: "Salads", available: true },
  { name: "Greek Salad", price: 7000, category: "Salads", available: true },
  { name: "Shrimps Cocktail Salad", price: 6000, category: "Salads", available: true },
  { name: "Tuna Salad", price: 7000, category: "Salads", available: true },
  { name: "Potato Salad", price: 6000, category: "Salads", available: true },
  { name: "Pasta Salad", price: 7000, category: "Salads", available: true },
  { name: "Mixed Vegetable Salad", price: 6000, category: "Salads", available: true },
  { name: "Calamari Salad", price: 8000, category: "Salads", available: true },
  { name: "Mixed Avocado Salad", price: 7000, category: "Salads", available: true },
  // Rice
  { name: "Chicken Stir Fried Rice", price: 15000, category: "Rice", available: true },
  { name: "Beef Stir Fried Rice", price: 15000, category: "Rice", available: true },
  { name: "Seafood Stir Fried Rice", price: 18000, category: "Rice", available: true },
  { name: "Vegetarian Rice", price: 7000, category: "Rice", available: true },
  { name: "Ofada Rice/Sauce", price: 16500, category: "Rice", available: true },
  { name: "Fried Rice", price: 7000, category: "Rice", available: true },
  { name: "Jollof Rice", price: 7000, category: "Rice", available: true },
  // Pasta
  { name: "Alfredo Noodles", price: 15000, category: "Pasta", available: true },
  { name: "Chicken Stir Fry Noodles", price: 15000, category: "Pasta", available: true },
  { name: "Beef Stir Fry Noodles", price: 15000, category: "Pasta", available: true },
  { name: "Seafood Stir Fry Noodles", price: 18000, category: "Pasta", available: true },
  { name: "Bolognese Noodles", price: 15000, category: "Pasta", available: true },
  { name: "Nigerian Vegetable Noodles", price: 10000, category: "Pasta", available: true },
  // Bush Bar Kitchen
  { name: "Goat Meat Pepper Soup", price: 10000, category: "Bush Bar Kitchen", available: true },
  { name: "Assorted Meat Pepper Soup", price: 10000, category: "Bush Bar Kitchen", available: true },
  { name: "Chicken Pepper Soup", price: 10000, category: "Bush Bar Kitchen", available: true },
  { name: "Nkwobi", price: 12000, category: "Bush Bar Kitchen", available: true },
  { name: "Isiewu", price: 12500, category: "Bush Bar Kitchen", available: true },
  { name: "Catfish Pepper Soup (Full)", price: 16500, category: "Bush Bar Kitchen", available: true },
  { name: "Croaker Pepper Soup (Full)", price: 16500, category: "Bush Bar Kitchen", available: true },
  { name: "Whole Chicken Native (Smoked)", price: 22000, category: "Bush Bar Kitchen", available: true },
  { name: "Chicken in Vegetable Sauce (Full)", price: 22500, category: "Bush Bar Kitchen", available: true },
  // Continental
  { name: "Prawn Butterfly in Tartar Sauce", price: 18000, category: "Continental", available: true },
  { name: "Prawn Butterfly with Potato Wedge or Parsley Potato", price: 20000, category: "Continental", available: true },
  { name: "Battered Fish with Potato Wedge or Parsley Potato", price: 20000, category: "Continental", available: true },
  { name: "Grilled Beef Steak Fillet in Black Pepper Sauce with Rice or Chips", price: 20000, category: "Continental", available: true },
  { name: "Grilled T-Bone Steak Fillet in Black Pepper Sauce with Rice or Chips", price: 25000, category: "Continental", available: true },
  { name: "Fillet Fish and Chips with Tartar Sauce", price: 25000, category: "Continental", available: true },
  // Sauces
  { name: "Chicken in Mushroom Sauce in Hot Pot", price: 20000, category: "Sauces", available: true },
  { name: "Beef Stroganoff in Hot Pot with Rice", price: 20000, category: "Sauces", available: true },
  { name: "Beef Vegetable Sauce", price: 18000, category: "Sauces", available: true },
  { name: "Chicken in Black Beans Sauce", price: 20000, category: "Sauces", available: true },
  { name: "Beef in Black Beans Sauce", price: 20000, category: "Sauces", available: true },
  { name: "Chicken Curry Sauce", price: 20000, category: "Sauces", available: true },
  { name: "Chicken in Vegetable Sauce", price: 20000, category: "Sauces", available: true },
  { name: "Heart in Black Beans Sauce", price: 22000, category: "Sauces", available: true },
  { name: "Seafood Vegetable Sauce", price: 22000, category: "Sauces", available: true },
  // Charcoal Grills
  { name: "Chicken Wings", price: 9500, category: "Charcoal Grills", available: true },
  { name: "Quarter Chicken with Chips", price: 11000, category: "Charcoal Grills", available: true },
  { name: "Quarter Chicken", price: 9000, category: "Charcoal Grills", available: true },
  { name: "Buffalo Wings", price: 9500, category: "Charcoal Grills", available: true },
  { name: "Grilled Turkey with Chips", price: 12000, category: "Charcoal Grills", available: true },
  { name: "Fish: Catfish/Croaker/Tilapia", price: 16500, category: "Charcoal Grills", available: true },
  { name: "Grilled Prawn", price: 18000, category: "Charcoal Grills", available: true },
  { name: "Peppered Gizzard with Chips", price: 11000, category: "Charcoal Grills", available: true },
  { name: "Peppered Gizzard Alone", price: 8000, category: "Charcoal Grills", available: true },
  { name: "Asun Only", price: 7000, category: "Charcoal Grills", available: true },
  { name: "Yam Fries", price: 3000, category: "Charcoal Grills", available: true },
  { name: "Asun & Fries", price: 9500, category: "Charcoal Grills", available: true },
  { name: "Potato Fries", price: 3000, category: "Charcoal Grills", available: true },
  { name: "Chicken (Native) Whole", price: 22000, category: "Charcoal Grills", available: true },
  { name: "Guinea Fowl (Whole)", price: 24500, category: "Charcoal Grills", available: true },
  // National Dishes
  { name: "Assorted Beef", price: 15000, category: "National Dishes", available: true },
  { name: "Goat", price: 16500, category: "National Dishes", available: true },
  { name: "Cow Tail", price: 10000, category: "National Dishes", available: true },
  { name: "Native Chicken", price: 18000, category: "National Dishes", available: true },
  { name: "Fish (Croaker/Tilapia)", price: 15500, category: "National Dishes", available: true },
  { name: "Turkey", price: 16500, category: "National Dishes", available: true },
  { name: "Dry Fish", price: 16500, category: "National Dishes", available: true },
  { name: "Stock Fish", price: 18000, category: "National Dishes", available: true },
  { name: "Snail", price: 22000, category: "National Dishes", available: true },
  { name: "Guinea Fowl", price: 18000, category: "National Dishes", available: true },
  // Traditional Specials
  { name: "Seafood Okro", price: 20000, category: "Traditional Specials", available: true },
  { name: "Banga", price: 16500, category: "Traditional Specials", available: true },
  { name: "Pocho", price: 15500, category: "Traditional Specials", available: true },
  { name: "Ikokore/Eberipo", price: 16500, category: "Traditional Specials", available: true },
  { name: "Miyan Kuka", price: 16500, category: "Traditional Specials", available: true },
  { name: "Fisherman Soup", price: 20000, category: "Traditional Specials", available: true },
  { name: "Ofensala/White Soup", price: 20000, category: "Traditional Specials", available: true },
];

/* ─── Constants ─── */
const CATEGORIES = [
  "Starters", "Salads", "Rice", "Pasta",
  "Bush Bar Kitchen", "Continental", "Sauces",
  "Charcoal Grills", "National Dishes", "Traditional Specials",
  "BLACKROCK EXPERIENCE", "Buffet", "Packaging", "Protein Section",
];

const DRINK_CATEGORIES = [
  "Wines", "Spirits", "Beer & Cider", "Cocktails",
  "Mocktails", "Soft Drinks & Water", "Hot Drinks", "Fresh Juice",
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

/* ─── CategoryImageEditor ─── */
function CategoryImageEditor({ category, currentUrl, onClose, onSaved }) {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(currentUrl || "");
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      let imageUrl = previewUrl;

      if (selectedFile) {
        const path = `category-${Date.now()}-${selectedFile.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
        const { error: upErr } = await supabase.storage.from("menu-images").upload(path, selectedFile, { cacheControl: "3600", upsert: false });
        if (upErr) throw upErr;
        const { data: { publicUrl } } = supabase.storage.from("menu-images").getPublicUrl(path);
        imageUrl = publicUrl;
      }

      // Load current category images from site_content
      const { data: existing } = await supabase
        .from("site_content")
        .select("data")
        .eq("section", "menu-category-images")
        .maybeSingle();

      const updated = { ...(existing?.data || {}), [category]: imageUrl };

      await supabase.from("site_content").upsert(
        { section: "menu-category-images", data: updated },
        { onConflict: "section" }
      );

      onSaved(category, imageUrl);
      onClose();
    } catch (e) {
      setError(e.message ?? "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.55)" }}>
      <div style={{ background: "var(--ds-surface)", border: "1px solid var(--ds-border)", borderRadius: 12, width: 420, fontFamily: "'DM Sans', sans-serif", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid var(--ds-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 600, color: "var(--ds-text)" }}>
            Category Image — {category}
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ds-muted)", display: "flex" }}><X size={18} /></button>
        </div>

        {/* Body */}
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Preview */}
          <div style={{
            width: "100%", height: 200, borderRadius: 10, overflow: "hidden",
            background: "var(--ds-input-bg)", border: "1px solid var(--ds-border)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {previewUrl ? (
              <img src={previewUrl} alt={category} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, color: "var(--ds-muted)" }}>
                <Camera size={32} strokeWidth={1.4} />
                <span style={{ fontSize: 12 }}>No image set</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ ...GHOST_BTN, flex: 1, justifyContent: "center" }} onClick={() => fileInputRef.current?.click()}>
              Upload New Image
            </button>
            <button style={{ ...GHOST_BTN, flex: 1, justifyContent: "center" }} onClick={() => setShowMediaPicker(true)}>
              Media Library
            </button>
          </div>
          {selectedFile && <span style={{ fontSize: 11, color: "var(--ds-muted)" }}>{selectedFile.name}</span>}
          {error && <p style={{ fontSize: 12, color: "#ef4444", margin: 0 }}>{error}</p>}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--ds-border)", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button style={GHOST_BTN} onClick={onClose}>Cancel</button>
          <button style={{ ...GOLD_BTN, opacity: saving ? 0.7 : 1 }} onClick={handleSave} disabled={saving}>
            <Check size={14} /> {saving ? "Saving…" : "Save Image"}
          </button>
        </div>
      </div>

      {showMediaPicker && (
        <MediaPickerModal
          onSelect={(url) => { setPreviewUrl(url); setSelectedFile(null); setShowMediaPicker(false); }}
          onClose={() => setShowMediaPicker(false)}
        />
      )}
    </div>
  );
}

/* ─── DishCard ─── */
function DishCard({ dish, onEdit, onDelete, onToggleAvailable, dragProps }) {
  return (
    <div style={{
      background: "var(--ds-surface)",
      border: `1px solid ${dragProps?.isOver ? "var(--ds-gold)" : "var(--ds-border)"}`,
      borderRadius: 11,
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      width: "100%",
      height: 340,
      opacity: dragProps?.isDragging ? 0.35 : 1,
      transition: "opacity 0.15s, border-color 0.15s, transform 0.15s",
      transform: dragProps?.isOver ? "scale(1.02)" : "scale(1)",
    }}>
      {/* Image — fixed 180px, never shrinks */}
      <div style={{ height: 180, flexShrink: 0, overflow: "hidden", position: "relative", background: "rgba(200,169,110,0.06)" }}>
        {/* Drag handle */}
        <div
          {...(dragProps?.handleProps || {})}
          title="Drag to reorder"
          style={{
            position: "absolute", top: 8, left: 8, zIndex: 2,
            width: 26, height: 26, borderRadius: 6,
            background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "grab", color: "rgba(255,255,255,0.7)",
          }}
        >
          <GripVertical size={14} />
        </div>
        {dish.image_url ? (
          <img src={dish.image_url} alt={dish.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 6, color: "var(--ds-muted)" }}>
            <ImageOff size={28} strokeWidth={1.5} />
            <span style={{ fontSize: 11 }}>No photo yet</span>
          </div>
        )}
      </div>

      {/* Body — grows to fill space, pushes footer down */}
      <div style={{ padding: "12px 14px 10px", flex: 1, display: "flex", flexDirection: "column", gap: 6, minHeight: 0 }}>
        {/* Name (max 2 lines) + price */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <span style={{
            fontSize: 13.5, fontWeight: 600, color: "var(--ds-text)",
            lineHeight: 1.35,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            flex: 1,
          }}>
            {dish.name}
          </span>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ds-gold)", whiteSpace: "nowrap", flexShrink: 0, paddingTop: 2 }}>
            ₦{Number(dish.price).toLocaleString()}
          </span>
        </div>

        {/* Category badge */}
        <span style={{
          fontSize: 10, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase",
          color: "var(--ds-muted)", background: "var(--ds-input-bg)",
          borderRadius: 99, padding: "2px 8px", alignSelf: "flex-start", flexShrink: 0,
        }}>
          {dish.category}
        </span>

        {/* Description (max 2 lines) */}
        <p style={{
          fontSize: 12, color: "var(--ds-muted)", margin: 0, lineHeight: 1.5,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          flexShrink: 0,
        }}>
          {dish.description || ""}
        </p>
      </div>

      {/* Footer — always pinned at bottom */}
      <div style={{
        padding: "8px 14px 12px",
        display: "flex", alignItems: "center", gap: 8,
        borderTop: "1px solid var(--ds-border)",
        flexShrink: 0,
      }}>
        <button
          onClick={() => onToggleAvailable(dish)}
          style={{
            fontSize: 11, fontWeight: 600, borderRadius: 99,
            padding: "4px 10px", border: "none", cursor: "pointer",
            background: dish.available ? "var(--ds-gold)" : "var(--ds-input-bg)",
            color: dish.available ? "#1a1a1a" : "var(--ds-muted)",
            flexShrink: 0,
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
function EditPanel({ dish, onClose, onSaved, defaultMenuType = "food", foodCategories = CATEGORIES, drinkCategories = DRINK_CATEGORIES }) {
  const isNew = !dish?.id;
  const fileInputRef = useRef(null);
  const resolvedMenuType = dish?.menu_type ?? defaultMenuType;
  const [form, setForm] = useState({
    name: dish?.name ?? "",
    menu_type: resolvedMenuType,
    category: dish?.category ?? (resolvedMenuType === "drink" ? drinkCategories[0] : foodCategories[0]),
    price: dish?.price ?? "",
    description: dish?.description ?? "",
    available: dish?.available ?? true,
    has_sides: dish?.has_sides ?? false,
    image_url: dish?.image_url ?? "",
  });
  const [customCategory, setCustomCategory] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) { setError("Dish name is required."); return; }
    if (!form.price) { setError("Price is required."); return; }
    const resolvedCategory = form.category === "__new__" ? customCategory.trim() : form.category;
    if (!resolvedCategory) { setError("Please enter a category name."); return; }
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
        // Register in media_assets so it appears in the Media Library
        await supabase.from("media_assets").insert({
          url: publicUrl,
          filename: selectedFile.name,
          file_size: selectedFile.size,
          used_in: "home-food-reel",
        }).select().maybeSingle();
      }
      const payload = {
        name: form.name.trim(),
        menu_type: form.menu_type,
        category: resolvedCategory,
        price: parseFloat(String(form.price).replace(/,/g, "")),
        description: form.description.trim(),
        available: form.available,
        has_sides: form.menu_type === "food" ? !!form.has_sides : false,
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
            {isNew ? (form.menu_type === "drink" ? "Add Drink" : "Add Dish") : (form.menu_type === "drink" ? "Edit Drink" : "Edit Dish")}
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ds-muted)", display: "flex" }}><X size={18} /></button>
        </div>

        {/* Form */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Menu Type toggle */}
            <div>
              <label style={LABEL_STYLE}>Menu Type</label>
              <div style={{ display: "flex", gap: 8 }}>
                {["food", "drink"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      const cats = t === "drink" ? drinkCategories : foodCategories;
                      set("menu_type", t);
                      set("category", cats[0]);
                      setCustomCategory("");
                    }}
                    style={{
                      flex: 1, padding: "8px 0", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
                      background: form.menu_type === t ? "var(--ds-gold)" : "var(--ds-input-bg)",
                      color: form.menu_type === t ? "#1a1a1a" : "var(--ds-muted)",
                      fontFamily: "'DM Sans', sans-serif", transition: "background 0.15s, color 0.15s",
                    }}
                  >
                    {t === "food" ? "Food" : "Drinks"}
                  </button>
                ))}
              </div>
            </div>
            {/* Name */}
            <div>
              <label style={LABEL_STYLE}>{form.menu_type === "drink" ? "Drink Name" : "Dish Name"}</label>
              <input style={INPUT_STYLE} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder={form.menu_type === "drink" ? "e.g. Hennessy VSOP" : "e.g. Grilled Snapper"} />
            </div>
            {/* Category */}
            <div>
              <label style={LABEL_STYLE}>Category</label>
              <select
                style={INPUT_STYLE}
                value={form.category}
                onChange={(e) => {
                  set("category", e.target.value);
                  if (e.target.value !== "__new__") setCustomCategory("");
                }}
              >
                {(form.menu_type === "drink" ? drinkCategories : foodCategories).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
                <option disabled style={{ color: "var(--ds-border)" }}>──────────</option>
                <option value="__new__">+ Add new category…</option>
              </select>
              {form.category === "__new__" && (
                <input
                  style={{ ...INPUT_STYLE, marginTop: 8 }}
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="New category name…"
                  autoFocus
                />
              )}
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
            {/* Has sides (food only) */}
            {form.menu_type === "food" && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <label style={{ ...LABEL_STYLE, marginBottom: 0 }}>Has sides</label>
                  <button
                    onClick={() => set("has_sides", !form.has_sides)}
                    style={{
                      width: 44, height: 24, borderRadius: 99, border: "none", cursor: "pointer", position: "relative",
                      background: form.has_sides ? "var(--ds-gold)" : "var(--ds-border)",
                      transition: "background 0.2s",
                    }}
                  >
                    <span style={{
                      position: "absolute", top: 3, left: form.has_sides ? 23 : 3, width: 18, height: 18,
                      borderRadius: "50%", background: form.has_sides ? "#1a1a1a" : "var(--ds-muted)",
                      transition: "left 0.2s",
                    }} />
                  </button>
                </div>
                <p style={{ fontSize: 11, color: "var(--ds-muted)", margin: "4px 0 0", lineHeight: 1.4 }}>
                  When on, the waiter sees the side picker (White Rice, Yam Fries, etc.) after this dish is added. Manage the side list from <strong>Content → Sides</strong>.
                </p>
              </div>
            )}
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

/* ─── CategoryManager ─── */
function CategoryManager({ menuType, allCats, dishes, categoryImages, onClose, onCategoryImagesChange, onDishesChange, onCatsChange, onCatDeleted }) {
  const [renamingCat, setRenamingCat] = useState(null);
  const [renameVal, setRenameVal] = useState("");
  const [renameLoading, setRenameLoading] = useState(false);
  const [deletingCat, setDeletingCat] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [addingCat, setAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [editImageCat, setEditImageCat] = useState(null);
  const [error, setError] = useState("");

  const countItems = (cat) => dishes.filter((d) => (d.menu_type ?? "food") === menuType && d.category === cat).length;

  const handleRename = async (oldName) => {
    const newName = renameVal.trim();
    if (!newName || newName === oldName) { setRenamingCat(null); return; }
    setRenameLoading(true);
    setError("");
    try {
      const items = dishes.filter((d) => d.category === oldName);
      await Promise.all(items.map((d) => supabase.from("menu_items").update({ category: newName }).eq("id", d.id)));

      // Update category images key
      if (categoryImages[oldName]) {
        const updated = { ...categoryImages };
        updated[newName] = updated[oldName];
        delete updated[oldName];
        const { data: existing } = await supabase.from("site_content").select("data").eq("section", "menu-category-images").maybeSingle();
        const merged = { ...(existing?.data || {}), [newName]: updated[newName] };
        delete merged[oldName];
        await supabase.from("site_content").upsert({ section: "menu-category-images", data: merged }, { onConflict: "section" });
        onCategoryImagesChange(updated);
      }

      onDishesChange((prev) => prev.map((d) => d.category === oldName ? { ...d, category: newName } : d));
      // Update customCats if the old name was a custom cat
      onCatsChange((prev) => ({
        ...prev,
        [menuType]: prev[menuType].includes(oldName)
          ? prev[menuType].map((c) => c === oldName ? newName : c)
          : prev[menuType],
      }));
      setRenamingCat(null);
    } catch (e) { setError(e.message ?? "Rename failed."); }
    finally { setRenameLoading(false); }
  };

  const handleDelete = async (cat) => {
    setDeleteLoading(true);
    setError("");
    try {
      const { error: delErr } = await supabase.from("menu_items").delete().eq("category", cat).eq("menu_type", menuType);
      if (delErr) throw delErr;

      // Remove from category images
      if (categoryImages[cat]) {
        const updated = { ...categoryImages };
        delete updated[cat];
        const { data: existing } = await supabase.from("site_content").select("data").eq("section", "menu-category-images").maybeSingle();
        const merged = { ...(existing?.data || {}) };
        delete merged[cat];
        await supabase.from("site_content").upsert({ section: "menu-category-images", data: merged }, { onConflict: "section" });
        onCategoryImagesChange(updated);
      }

      onDishesChange((prev) => prev.filter((d) => !(d.category === cat && (d.menu_type ?? "food") === menuType)));
      onCatDeleted(cat);
      setDeletingCat(null);
    } catch (e) { setError(e.message ?? "Delete failed."); }
    finally { setDeleteLoading(false); }
  };

  const handleAdd = async () => {
    const name = newCatName.trim();
    if (!name) return;
    setAddLoading(true);
    setError("");
    try {
      onCatsChange((prev) => ({
        ...prev,
        [menuType]: prev[menuType].includes(name) ? prev[menuType] : [...prev[menuType], name],
      }));
      setNewCatName("");
      setAddingCat(false);
    } catch (e) { setError(e.message ?? "Failed to add."); }
    finally { setAddLoading(false); }
  };

  const deletingCount = deletingCat ? countItems(deletingCat) : 0;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.55)" }}>
      <div style={{ background: "var(--ds-surface)", border: "1px solid var(--ds-border)", borderRadius: 14, width: 560, maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "'DM Sans', sans-serif" }}>
        {/* Header */}
        <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid var(--ds-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 600, color: "var(--ds-text)" }}>
              Manage {menuType === "drink" ? "Drink" : "Food"} Categories
            </span>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--ds-muted)" }}>{allCats.length} categories</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ds-muted)", display: "flex" }}><X size={18} /></button>
        </div>

        {/* Category List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
          {error && <p style={{ fontSize: 12, color: "#ef4444", margin: "0 0 10px" }}>{error}</p>}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {allCats.map((cat) => {
              const count = countItems(cat);
              const imgUrl = categoryImages[cat];
              const isRenaming = renamingCat === cat;

              return (
                <div key={cat} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  background: "var(--ds-input-bg)", border: "1px solid var(--ds-border)",
                  borderRadius: 10, padding: "10px 12px",
                }}>
                  {/* Thumbnail — click to change image */}
                  <div
                    onClick={() => setEditImageCat(cat)}
                    title="Click to change image"
                    style={{
                      width: 64, height: 46, borderRadius: 7, overflow: "hidden", flexShrink: 0,
                      background: "var(--ds-surface)", border: "1px solid var(--ds-border)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer", position: "relative",
                    }}
                  >
                    {imgUrl ? (
                      <img src={imgUrl} alt={cat} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <Camera size={18} style={{ color: "var(--ds-muted)" }} strokeWidth={1.4} />
                    )}
                    {/* Hover overlay */}
                    <div style={{
                      position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      opacity: 0, transition: "opacity 0.15s",
                    }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = 0}
                    >
                      <Camera size={14} style={{ color: "#fff" }} />
                    </div>
                  </div>

                  {/* Name / rename input */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {isRenaming ? (
                      <div style={{ display: "flex", gap: 6 }}>
                        <input
                          autoFocus
                          value={renameVal}
                          onChange={(e) => setRenameVal(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleRename(cat); if (e.key === "Escape") setRenamingCat(null); }}
                          style={{ ...INPUT_STYLE, padding: "5px 8px", fontSize: 13, flex: 1 }}
                        />
                        <button
                          style={{ ...GOLD_BTN, padding: "5px 10px", fontSize: 12, opacity: renameLoading ? 0.7 : 1 }}
                          onClick={() => handleRename(cat)}
                          disabled={renameLoading}
                        >
                          <Check size={13} />
                        </button>
                        <button style={{ ...GHOST_BTN, padding: "5px 8px" }} onClick={() => setRenamingCat(null)}><X size={13} /></button>
                      </div>
                    ) : (
                      <>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--ds-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cat}</p>
                        <p style={{ margin: "1px 0 0", fontSize: 11, color: "var(--ds-muted)" }}>
                          {count} {count === 1 ? (menuType === "drink" ? "drink" : "dish") : (menuType === "drink" ? "drinks" : "dishes")}
                          {imgUrl ? " · Image set" : " · No image"}
                        </p>
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  {!isRenaming && (
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <button
                        title="Rename"
                        onClick={() => { setRenamingCat(cat); setRenameVal(cat); }}
                        style={{ background: "var(--ds-surface)", border: "1px solid var(--ds-border)", borderRadius: 7, padding: "6px 8px", cursor: "pointer", color: "var(--ds-muted)", display: "flex" }}
                      ><Pencil size={13} /></button>
                      <button
                        title="Delete category"
                        onClick={() => setDeletingCat(cat)}
                        style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 7, padding: "6px 8px", cursor: "pointer", color: "#ef4444", display: "flex" }}
                      ><Trash2 size={13} /></button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add new category */}
          <div style={{ marginTop: 12 }}>
            {addingCat ? (
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  autoFocus
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") { setAddingCat(false); setNewCatName(""); } }}
                  placeholder="New category name…"
                  style={{ ...INPUT_STYLE, flex: 1, padding: "8px 12px" }}
                />
                <button style={{ ...GOLD_BTN, opacity: addLoading ? 0.7 : 1 }} onClick={handleAdd} disabled={addLoading}>
                  <Check size={14} /> Add
                </button>
                <button style={GHOST_BTN} onClick={() => { setAddingCat(false); setNewCatName(""); }}><X size={14} /></button>
              </div>
            ) : (
              <button
                style={{ ...GHOST_BTN, width: "100%", justifyContent: "center", borderStyle: "dashed" }}
                onClick={() => setAddingCat(true)}
              >
                <Plus size={14} /> Add New Category
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--ds-border)", display: "flex", justifyContent: "flex-end" }}>
          <button style={GHOST_BTN} onClick={onClose}>Done</button>
        </div>
      </div>

      {/* Delete confirm */}
      {deletingCat && (
        <div style={{ position: "fixed", inset: 0, zIndex: 250, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.55)" }}>
          <div style={{ background: "var(--ds-surface)", border: "1px solid var(--ds-border)", borderRadius: 12, padding: "28px", maxWidth: 380, width: "90%", fontFamily: "'DM Sans', sans-serif" }}>
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 18 }}>
              <AlertTriangle size={22} style={{ color: "#ef4444", flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ fontWeight: 600, color: "var(--ds-text)", margin: "0 0 6px", fontSize: 15 }}>Delete "{deletingCat}"?</p>
                <p style={{ color: "var(--ds-muted)", margin: 0, fontSize: 13, lineHeight: 1.5 }}>
                  {deletingCount > 0
                    ? `This will permanently delete all ${deletingCount} ${menuType === "drink" ? "drink" : "dish"}${deletingCount !== 1 ? "s" : ""} in this category. This cannot be undone.`
                    : "This category is empty and will be removed."}
                </p>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button style={GHOST_BTN} onClick={() => setDeletingCat(null)} disabled={deleteLoading}>Cancel</button>
              <button
                style={{ ...GOLD_BTN, background: "#ef4444", opacity: deleteLoading ? 0.7 : 1 }}
                onClick={() => handleDelete(deletingCat)}
                disabled={deleteLoading}
              >
                {deleteLoading ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category image editor */}
      {editImageCat && (
        <CategoryImageEditor
          category={editImageCat}
          currentUrl={categoryImages[editImageCat] || ""}
          onClose={() => setEditImageCat(null)}
          onSaved={(cat, url) => { onCategoryImagesChange((prev) => ({ ...prev, [cat]: url })); setEditImageCat(null); }}
        />
      )}
    </div>
  );
}

/* ─── MenuManagement ─── */
export default function MenuManagement() {
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuType, setMenuType] = useState("food");
  const [activeCategory, setActiveCategory] = useState("All");
  const [editingDish, setEditingDish] = useState(null);
  const [showPanel, setShowPanel] = useState(false);
  const [deletingDish, setDeletingDish] = useState(null);
  const [confirmDeleting, setConfirmDeleting] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedDone, setSeedDone] = useState(false);

  const handleSeedMenu = async () => {
    setSeeding(true);
    try {
      const { error } = await supabase.from("menu_items").insert(SEED_MENU);
      if (error) throw error;
      setSeedDone(true);
      await fetchDishes();
    } catch (e) {
      alert("Import failed: " + (e.message ?? "Unknown error"));
    } finally {
      setSeeding(false);
    }
  };

  const [categoryImages, setCategoryImages] = useState({});
  const [editingCategoryImage, setEditingCategoryImage] = useState(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [customCats, setCustomCats] = useState({ food: [], drink: [] });
  // tracks hardcoded categories the user has explicitly deleted (hidden from UI)
  const [excludedCats, setExcludedCats] = useState({ food: [], drink: [] });

  const [dragId, setDragId]     = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [saving, setSaving]     = useState(false);

  const fetchDishes = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("menu_items").select("*").order("sort_order", { ascending: true, nullsFirst: false });
    if (!error && data) setDishes(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchDishes(); }, [fetchDishes]);

  useEffect(() => {
    supabase.from("site_content").select("data").eq("section", "menu-category-images").maybeSingle()
      .then(({ data }) => { if (data?.data) setCategoryImages(data.data); });
  }, []);

  const byType = dishes.filter((d) => (d.menu_type ?? "food") === menuType);
  const filtered = activeCategory === "All" ? byType : byType.filter((d) => d.category === activeCategory);

  // Build category lists: hardcoded defaults (minus deleted) + DB items + custom
  const dbFoodCats = [...new Set(dishes.filter((d) => (d.menu_type ?? "food") === "food").map((d) => d.category).filter(Boolean))];
  const dbDrinkCats = [...new Set(dishes.filter((d) => d.menu_type === "drink").map((d) => d.category).filter(Boolean))];
  const allFoodCats = [
    ...CATEGORIES.filter((c) => !excludedCats.food.includes(c)),
    ...dbFoodCats.filter((c) => !CATEGORIES.includes(c) && !excludedCats.food.includes(c)),
    ...customCats.food.filter((c) => !CATEGORIES.includes(c) && !dbFoodCats.includes(c) && !excludedCats.food.includes(c)),
  ];
  const allDrinkCats = [
    ...DRINK_CATEGORIES.filter((c) => !excludedCats.drink.includes(c)),
    ...dbDrinkCats.filter((c) => !DRINK_CATEGORIES.includes(c) && !excludedCats.drink.includes(c)),
    ...customCats.drink.filter((c) => !DRINK_CATEGORIES.includes(c) && !dbDrinkCats.includes(c) && !excludedCats.drink.includes(c)),
  ];
  const allCats = menuType === "drink" ? allDrinkCats : allFoodCats;

  /* ─── Drag handlers ─── */
  const handleDragStart = (id) => setDragId(id);
  const handleDragEnd   = () => { setDragId(null); setDragOverId(null); };

  const handleDrop = async (targetId) => {
    if (!dragId || dragId === targetId) { handleDragEnd(); return; }

    // Reorder within the filtered view
    const filteredIds = filtered.map((d) => d.id);
    const from = filteredIds.indexOf(dragId);
    const to   = filteredIds.indexOf(targetId);
    if (from === -1 || to === -1) { handleDragEnd(); return; }

    const reordered = [...filtered];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);

    // Rebuild full dishes array: replace filtered slots with reordered items
    let reorderedIdx = 0;
    const newDishes = dishes.map((d) => {
      if (filteredIds.includes(d.id)) return reordered[reorderedIdx++];
      return d;
    });

    // Assign new sort_order values
    const withOrder = newDishes.map((d, i) => ({ ...d, sort_order: i }));
    setDishes(withOrder);
    handleDragEnd();

    // Persist to Supabase
    setSaving(true);
    await Promise.all(
      withOrder.map((d) =>
        supabase.from("menu_items").update({ sort_order: d.sort_order }).eq("id", d.id)
      )
    );
    setSaving(false);
  };

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
          <p style={{ fontSize: 13, color: "var(--ds-muted)", margin: 0 }}>Add, edit, and manage food and drinks on the public website</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {!seedDone && dishes.length === 0 && (
            <button
              style={{ ...GOLD_BTN, background: "var(--ds-input-bg)", color: "var(--ds-text)", border: "1px solid var(--ds-border)", opacity: seeding ? 0.7 : 1 }}
              onClick={handleSeedMenu}
              disabled={seeding}
            >
              <Download size={15} /> {seeding ? "Importing…" : "Import from Website"}
            </button>
          )}
          <button style={GOLD_BTN} onClick={openAdd}>
            <Plus size={15} /> {menuType === "drink" ? "Add New Drink" : "Add New Dish"}
          </button>
        </div>
      </div>

      {/* Food / Drinks Switcher */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "var(--ds-input-bg)", borderRadius: 10, padding: 4, width: "fit-content", border: "1px solid var(--ds-border)" }}>
        {[{ key: "food", label: "Food" }, { key: "drink", label: "Drinks" }].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setMenuType(key); setActiveCategory("All"); }}
            style={{
              padding: "7px 22px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
              background: menuType === key ? "var(--ds-gold)" : "transparent",
              color: menuType === key ? "#1a1a1a" : "var(--ds-muted)",
              fontFamily: "'DM Sans', sans-serif", transition: "background 0.15s, color 0.15s",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Category Filter */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, flex: 1 }}>
          <FilterTab label="All" active={activeCategory === "All"} onClick={() => setActiveCategory("All")} />
          {allCats.map((c) => (
            <FilterTab key={c} label={c} active={activeCategory === c} onClick={() => setActiveCategory(c)} />
          ))}
        </div>
        <button
          style={{ ...GHOST_BTN, fontSize: 12, padding: "6px 12px", flexShrink: 0 }}
          onClick={() => setShowCategoryManager(true)}
        >
          <Camera size={13} /> Categories
        </button>
      </div>

      {/* Category Image Banner */}
      {activeCategory !== "All" && (
        <div style={{
          display: "flex", alignItems: "center", gap: 16, marginBottom: 20,
          background: "var(--ds-surface)", border: "1px solid var(--ds-border)",
          borderRadius: 10, padding: "12px 16px",
        }}>
          <div style={{
            width: 72, height: 52, borderRadius: 8, overflow: "hidden", flexShrink: 0,
            background: "var(--ds-input-bg)", border: "1px solid var(--ds-border)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {categoryImages[activeCategory] ? (
              <img src={categoryImages[activeCategory]} alt={activeCategory} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <Camera size={20} style={{ color: "var(--ds-muted)" }} strokeWidth={1.4} />
            )}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--ds-text)" }}>{activeCategory}</p>
            <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "var(--ds-muted)" }}>
              {categoryImages[activeCategory] ? "Category image set" : "No category image set"}
            </p>
          </div>
          <button
            style={{ ...GHOST_BTN, fontSize: 12, padding: "7px 14px", flexShrink: 0 }}
            onClick={() => setEditingCategoryImage(activeCategory)}
          >
            <Camera size={13} /> {categoryImages[activeCategory] ? "Change Image" : "Set Image"}
          </button>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div style={{ textAlign: "center", color: "var(--ds-muted)", padding: "60px 0", fontSize: 13 }}>Loading dishes…</div>
      ) : filtered.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", gap: 14 }}>
          <UtensilsCrossed size={40} strokeWidth={1.2} style={{ color: "var(--ds-muted)", opacity: 0.4 }} />
          <p style={{ color: "var(--ds-muted)", fontSize: 14, margin: 0, textAlign: "center" }}>
            {activeCategory === "All"
              ? (menuType === "drink" ? "No drinks yet." : "No dishes yet.")
              : `No ${menuType === "drink" ? "drinks" : "dishes"} in "${activeCategory}" yet.`}
          </p>
          {activeCategory === "All" && menuType === "food" && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
              <button
                style={{ ...GOLD_BTN, opacity: seeding ? 0.7 : 1 }}
                onClick={handleSeedMenu}
                disabled={seeding}
              >
                <Download size={14} /> {seeding ? "Importing…" : "Import All 88 Dishes"}
              </button>
              <button style={{ ...GHOST_BTN }} onClick={openAdd}><Plus size={14} /> Add Single Dish</button>
            </div>
          )}
          {activeCategory === "All" && menuType === "drink" && (
            <button style={GHOST_BTN} onClick={openAdd}><Plus size={14} /> Add Drink</button>
          )}
        </div>
      ) : (
        <>
          {saving && (
            <div style={{ fontSize: 11.5, color: "var(--ds-gold)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--ds-gold)", display: "inline-block", animation: "pulse 1s infinite" }} />
              Saving order…
            </div>
          )}
          <div className="ds-menu-grid">
            <AnimatePresence>
              {filtered.map((dish) => (
                <motion.div
                  key={dish.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                  draggable
                  onDragStart={() => handleDragStart(dish.id)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => { e.preventDefault(); setDragOverId(dish.id); }}
                  onDrop={() => handleDrop(dish.id)}
                >
                  <DishCard
                    dish={dish}
                    onEdit={openEdit}
                    onDelete={setDeletingDish}
                    onToggleAvailable={handleToggleAvailable}
                    dragProps={{
                      isDragging: dragId === dish.id,
                      isOver: dragOverId === dish.id && dragId !== dish.id,
                      handleProps: {},
                    }}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </>
      )}

      {/* Edit/Add Panel */}
      <AnimatePresence>
        {showPanel && (
          <EditPanel
            dish={editingDish}
            defaultMenuType={menuType}
            foodCategories={allFoodCats}
            drinkCategories={allDrinkCats}
            onClose={() => { setShowPanel(false); setEditingDish(null); }}
            onSaved={() => { setShowPanel(false); setEditingDish(null); fetchDishes(); }}
          />
        )}
      </AnimatePresence>

      {/* Category Image Editor */}
      {editingCategoryImage && (
        <CategoryImageEditor
          category={editingCategoryImage}
          currentUrl={categoryImages[editingCategoryImage] || ""}
          onClose={() => setEditingCategoryImage(null)}
          onSaved={(cat, url) => setCategoryImages((prev) => ({ ...prev, [cat]: url }))}
        />
      )}

      {/* Category Manager */}
      {showCategoryManager && (
        <CategoryManager
          menuType={menuType}
          allCats={allCats}
          dishes={dishes}
          categoryImages={categoryImages}
          onClose={() => setShowCategoryManager(false)}
          onCategoryImagesChange={(val) => setCategoryImages(typeof val === "function" ? val(categoryImages) : val)}
          onDishesChange={setDishes}
          onCatsChange={(updater) => setCustomCats((prev) => typeof updater === "function" ? updater(prev) : updater)}
          onCatDeleted={(cat) => {
            setExcludedCats((prev) => ({ ...prev, [menuType]: [...prev[menuType], cat] }));
            setCustomCats((prev) => ({ ...prev, [menuType]: prev[menuType].filter((c) => c !== cat) }));
            if (activeCategory === cat) setActiveCategory("All");
          }}
        />
      )}

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
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
        .ds-menu-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }
        @media (max-width: 1100px) {
          .ds-menu-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 780px) {
          .ds-menu-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 480px) {
          .ds-menu-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
