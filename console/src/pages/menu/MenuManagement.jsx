import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import {
  Plus, Pencil, Trash2, ImageOff, UtensilsCrossed,
  X, AlertTriangle, Check, Download,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* ─── Seed Data ─── */
const SEED_MENU = [
  // Starters
  { name: "Vegetable Spring Roll (2pcs)", description: "Two pieces. Crisp, golden, served with sweet chilli dip.", price: 4500, category: "Starters", available: true },
  { name: "Chicken Spring Roll (2pcs)", description: "Two pieces. Hand-rolled, lightly spiced, properly crisp.", price: 5500, category: "Starters", available: true },
  { name: "Naan Bread (Cheese)", description: "Soft, pulled, oozing. Straight from the tandoor.", price: 3500, category: "Starters", available: true },
  { name: "Naan Bread (Garlic & Plain)", description: "Brushed with garlic butter and fresh herbs.", price: 3000, category: "Starters", available: true },
  { name: "Cream of Sweet Corn", description: "Velvety, warming, finished with chive oil.", price: 4000, category: "Starters", available: true },
  { name: "Tomato Cream Soup", description: "Slow-roasted plum tomato, basil, a swirl of cream.", price: 4000, category: "Starters", available: true },
  { name: "Cream of Mushroom Soup", description: "Wild mushroom, thyme, truffle scent.", price: 4500, category: "Starters", available: true },
  { name: "Chicken Corn Soup", description: "Light, comforting. The kind your mother would approve of.", price: 4500, category: "Starters", available: true },
  { name: "Gizzard in Plantain Sauce", description: "Tender gizzard, ripe plantain, a Lagos signature.", price: 6500, category: "Starters", available: true },
  { name: "Steam Veg/Potato + Protein Chops", description: "Choice of chicken, fish or beef. Clean. Honest.", price: 7500, category: "Starters", available: true },
  // Salads
  { name: "Chicken Caesar Salad", description: "Grilled chicken, romaine, parmesan, anchovy dressing.", price: 6500, category: "Salads", available: true },
  { name: "Greek Salad", description: "Tomato, cucumber, olive, feta, oregano, good oil.", price: 5500, category: "Salads", available: true },
  { name: "Shrimps Cocktail Salad", description: "Chilled shrimp, gem leaves, Marie Rose sauce.", price: 8500, category: "Salads", available: true },
  { name: "Tuna Salad", description: "Line-caught tuna, capers, red onion, lemon.", price: 6500, category: "Salads", available: true },
  { name: "Potato Salad", description: "Soft potatoes, boiled egg, mayo, mustard, dill.", price: 4500, category: "Salads", available: true },
  { name: "Pasta Salad", description: "Penne, peppers, sweetcorn, herb vinaigrette.", price: 5000, category: "Salads", available: true },
  { name: "Mixed Vegetable Salad", description: "Garden vegetables, house dressing.", price: 4500, category: "Salads", available: true },
  { name: "Calamari Salad", description: "Lightly fried calamari over crisp greens.", price: 7500, category: "Salads", available: true },
  { name: "Mixed Avocado Salad", description: "Avocado, mixed leaves, citrus, toasted seed.", price: 6000, category: "Salads", available: true },
  // Rice
  { name: "Jollof Rice", description: "Smoky, party-style, the way Lagos taught us.", price: 5500, category: "Rice", available: true },
  { name: "Fried Rice", description: "Green pepper, carrot, liver, prawn, the proper way.", price: 5500, category: "Rice", available: true },
  { name: "Ofada Rice/Sauce", description: "Steamed ofada, ayamase sauce, assorted meat, boiled egg.", price: 7500, category: "Rice", available: true },
  { name: "Chicken Stir Fried Rice", description: "Wok-tossed with chicken, soy, garlic, scallion.", price: 6500, category: "Rice", available: true },
  { name: "Beef Stir Fried Rice", description: "Tender beef strips, wok-charred vegetables.", price: 7500, category: "Rice", available: true },
  { name: "Seafood Stir Fried Rice", description: "Prawn, calamari, fish. The catch in your rice.", price: 9500, category: "Rice", available: true },
  { name: "Vegetarian Rice", description: "Seasonal vegetables, herbed butter, simple, perfect.", price: 5500, category: "Rice", available: true },
  // Noodles
  { name: "Alfredo Noodles", description: "Cream, parmesan, cracked pepper, parsley.", price: 6500, category: "Noodles", available: true },
  { name: "Chicken Stir Fry Noodles", description: "Wok-tossed egg noodles, chicken, julienned veg.", price: 6500, category: "Noodles", available: true },
  { name: "Beef Stir Fry Noodles", description: "Strips of beef, ginger, garlic, dark soy.", price: 7500, category: "Noodles", available: true },
  { name: "Seafood Stir Fry Noodles", description: "Prawn and calamari, scallion, sesame.", price: 9000, category: "Noodles", available: true },
  { name: "Bolognese Noodles", description: "Slow-cooked beef ragu, herbed tomato, parmesan.", price: 7000, category: "Noodles", available: true },
  { name: "Nigerian Vegetable Noodles", description: "Indomie-meets-elevated. Pepper, scotch bonnet, crayfish.", price: 5500, category: "Noodles", available: true },
  // Pepper Soup & Specials
  { name: "Goat Meat Pepper Soup", description: "Bone-in goat, uziza leaf, scotch bonnet. Pure fire and soul.", price: 7500, category: "Pepper Soup & Specials", available: true },
  { name: "Assorted Meat Pepper Soup", description: "Cow foot, tripe, shaki. For the brave.", price: 8500, category: "Pepper Soup & Specials", available: true },
  { name: "Chicken Pepper Soup", description: "Native chicken, full-flavoured broth, scent leaves.", price: 6500, category: "Pepper Soup & Specials", available: true },
  { name: "Nkwobi", description: "Cow foot in spicy palm-oil sauce, garden egg, utazi.", price: 8500, category: "Pepper Soup & Specials", available: true },
  { name: "Isi Ewu", description: "Goat head, slow-simmered, palm-oil sauce, the works.", price: 9500, category: "Pepper Soup & Specials", available: true },
  { name: "Catfish Pepper Soup (Full)", description: "Whole point-and-kill catfish, fiery broth.", price: 12500, category: "Pepper Soup & Specials", available: true },
  { name: "Croaker Pepper Soup (Full)", description: "Whole croaker, scent leaves, scotch bonnet.", price: 14500, category: "Pepper Soup & Specials", available: true },
  { name: "Whole Chicken Native (Smoked)", description: "Hours over wood, served whole, eat with your hands.", price: 16500, category: "Pepper Soup & Specials", available: true },
  { name: "Chicken in Vegetable Sauce (Full)", description: "Full chicken, smothered in spiced vegetable stew.", price: 15000, category: "Pepper Soup & Specials", available: true },
  // Continental
  { name: "Prawn Butterfly in Tartar Sauce", description: "Butterflied prawn, panko crust, lemon tartar.", price: 11500, category: "Continental", available: true },
  { name: "Prawn Butterfly with Potato Wedge or Parsley Potato", description: "Your choice of side. Both excellent.", price: 12500, category: "Continental", available: true },
  { name: "Battered Fish with Potato Wedge or Parsley Potato", description: "Crisp batter, flaky fish, golden wedges or parsley potato.", price: 9500, category: "Continental", available: true },
  { name: "Grilled Beef Steak Fillet in Black Pepper Sauce", description: "Black pepper sauce, choice of rice or chips.", price: 14500, category: "Continental", available: true },
  { name: "Grilled T-Bone Steak Fillet in Black Pepper Sauce", description: "Black pepper sauce, choice of rice or chips. For meat people.", price: 18500, category: "Continental", available: true },
  { name: "Fillet Fish and Chips with Tartar Sauce", description: "Battered fillet, hand-cut chips, tartar.", price: 9000, category: "Continental", available: true },
  // Sauces
  { name: "Chicken in Mushroom Sauce (Hot Pot)", description: "Marinated chicken, mushroom cream, served sizzling.", price: 9500, category: "Sauces", available: true },
  { name: "Beef Stroganoff in Hot Pot with Rice", description: "Tender beef, sour cream, mushroom, paprika.", price: 11500, category: "Sauces", available: true },
  { name: "Beef Vegetable Sauce", description: "Slow-cooked beef in spiced vegetable stew.", price: 8500, category: "Sauces", available: true },
  { name: "Chicken in Black Beans Sauce", description: "Wok-finished, fermented black bean, ginger.", price: 8500, category: "Sauces", available: true },
  { name: "Beef in Black Beans Sauce", description: "Tender strips, salty-sweet black bean glaze.", price: 9500, category: "Sauces", available: true },
  { name: "Chicken Curry Sauce", description: "Coconut curry, fresh ginger, lime leaf.", price: 8500, category: "Sauces", available: true },
  { name: "Chicken in Vegetable Sauce", description: "Garden vegetables, house pepper, soft chicken.", price: 8000, category: "Sauces", available: true },
  { name: "Heart in Black Beans Sauce", description: "Beef heart, properly handled, properly seasoned.", price: 7500, category: "Sauces", available: true },
  { name: "Seafood Vegetable Sauce", description: "Prawn, fish, calamari in a fragrant vegetable stew.", price: 11000, category: "Sauces", available: true },
  // Charcoal Grills
  { name: "Chicken Wings", description: "Charred, glazed, finger-licking.", price: 6500, category: "Charcoal Grills", available: true },
  { name: "Buffalo Wings", description: "Tossed in our house buffalo, blue cheese on the side.", price: 7500, category: "Charcoal Grills", available: true },
  { name: "Quarter Chicken", description: "Spice-rubbed, over open charcoal.", price: 5500, category: "Charcoal Grills", available: true },
  { name: "Quarter Chicken with Chips", description: "Same chicken, hand-cut chips.", price: 7000, category: "Charcoal Grills", available: true },
  { name: "Grilled Turkey with Chips", description: "Smoked turkey, slow-grilled, chips on the side.", price: 9500, category: "Charcoal Grills", available: true },
  { name: "Fish: Catfish/Croaker/Tilapia", description: "Whole fish, charred, scotch bonnet, lime.", price: 14500, category: "Charcoal Grills", available: true },
  { name: "Grilled Prawn", description: "Head-on prawns, garlic butter, charred lemon.", price: 12500, category: "Charcoal Grills", available: true },
  { name: "Peppered Gizzard with Chips", description: "Soft gizzard, pepper sauce, hand-cut chips.", price: 8500, category: "Charcoal Grills", available: true },
  { name: "Peppered Gizzard Alone", description: "Just the gizzard. The way it should be.", price: 6500, category: "Charcoal Grills", available: true },
  { name: "Asun Only", description: "Smoked goat, scotch bonnet, onion, lime.", price: 9500, category: "Charcoal Grills", available: true },
  { name: "Asun & Fries", description: "Smoked goat, peppered, fries to soak it up.", price: 11500, category: "Charcoal Grills", available: true },
  { name: "Yam Fries", description: "Hand-cut yam, golden, sea-salted.", price: 4500, category: "Charcoal Grills", available: true },
  { name: "Potato Fries", description: "Hand-cut, double-cooked, properly salted.", price: 4000, category: "Charcoal Grills", available: true },
  { name: "Chicken (Native) Whole", description: "Charcoal-grilled, served whole. Built to share.", price: 16500, category: "Charcoal Grills", available: true },
  { name: "Guinea Fowl (Whole)", description: "Spice-rubbed, charcoal-grilled, lean and rich.", price: 18500, category: "Charcoal Grills", available: true },
  // National Dishes
  { name: "Assorted Beef", description: "House stew, oxtail, tripe, shaki. A proper plate.", price: 8500, category: "National Dishes", available: true },
  { name: "Goat", description: "Slow-braised in our signature stew.", price: 9500, category: "National Dishes", available: true },
  { name: "Cow Tail", description: "Soft, falling-off-the-bone oxtail.", price: 9500, category: "National Dishes", available: true },
  { name: "Native Chicken", description: "Free-range, deeper flavour, served in stew.", price: 8500, category: "National Dishes", available: true },
  { name: "Fish (Croaker/Tilapia)", description: "Whole fish, stewed or grilled. Your choice.", price: 12500, category: "National Dishes", available: true },
  { name: "Turkey", description: "Smoked or stewed. Both quietly excellent.", price: 8500, category: "National Dishes", available: true },
  { name: "Dry Fish", description: "Sun-dried fish, soft in the stew, deep umami.", price: 7500, category: "National Dishes", available: true },
  { name: "Stock Fish", description: "Properly soaked, properly cooked. Deep umami, richly satisfying.", price: 8500, category: "National Dishes", available: true },
  { name: "Snail", description: "Cleaned, peppered, slow-cooked. A delicacy.", price: 10500, category: "National Dishes", available: true },
  { name: "Guinea Fowl", description: "Lean, gamey, served in our house stew.", price: 11500, category: "National Dishes", available: true },
  // Traditional Specials
  { name: "Seafood Okro", description: "Fresh okro, prawn, fish, periwinkle. Coastal in a bowl.", price: 9500, category: "Traditional Specials", available: true },
  { name: "Banga", description: "Palm-fruit extract, beletientien, fish. Warmly aromatic.", price: 8500, category: "Traditional Specials", available: true },
  { name: "Pocho", description: "Bitter leaf, scent leaf, assorted meat. Rich and deeply flavoured.", price: 8500, category: "Traditional Specials", available: true },
  { name: "Ikokore/Eberipo", description: "Pounded water yam, slowly stewed in pepper.", price: 8000, category: "Traditional Specials", available: true },
  { name: "Miyan & Kuka", description: "Baobab leaf soup, deep and earthy.", price: 7500, category: "Traditional Specials", available: true },
  { name: "Fisherman Soup", description: "Catfish, prawn, periwinkle, crab. The catch of the day.", price: 11500, category: "Traditional Specials", available: true },
  { name: "Ofensala/White Soup", description: "Pepper soup spiced, no palm-oil, deeply satisfying.", price: 8500, category: "Traditional Specials", available: true },
];

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
          <button style={GOLD_BTN} onClick={openAdd}><Plus size={15} /> Add New Dish</button>
        </div>
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
            {activeCategory === "All" ? "No dishes yet." : `No dishes in "${activeCategory}" yet.`}
          </p>
          {activeCategory === "All" && (
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
