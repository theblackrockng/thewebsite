import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Loader2, X, Check } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const CATEGORIES = ["Starters","Salads","Rice","Noodles","Pepper Soup & Specials","Continental","Sauces","Charcoal Grills","National Dishes","Traditional Specials"];

const EMPTY = { name: "", description: "", price: "", category: CATEGORIES[0], available: true };

function ItemForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial || EMPTY);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="space-y-4">
      <div>
        <label className="console-label">Category</label>
        <select className="console-input" value={form.category} onChange={(e) => set("category", e.target.value)}>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className="console-label">Dish Name</label>
        <input required className="console-input" placeholder="e.g. Jollof Rice" value={form.name} onChange={(e) => set("name", e.target.value)} />
      </div>
      <div>
        <label className="console-label">Description</label>
        <textarea required rows={3} className="console-input resize-none" placeholder="Short, appetising description..." value={form.description} onChange={(e) => set("description", e.target.value)} />
      </div>
      <div>
        <label className="console-label">Price (₦)</label>
        <input required className="console-input" placeholder="e.g. ₦5,500" value={form.price} onChange={(e) => set("price", e.target.value)} />
      </div>
      <div className="flex items-center gap-3">
        <label className="console-label mb-0">Available</label>
        <button type="button" onClick={() => set("available", !form.available)} className="text-[var(--gold)]">
          {form.available ? <ToggleRight size={24} /> : <ToggleLeft size={24} className="text-[var(--muted)]" />}
        </button>
      </div>
      <div className="flex gap-2 pt-2">
        <button type="submit" disabled={saving} className="btn-gold">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          {initial?.id ? "Save Changes" : "Add Item"}
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost">Cancel</button>
      </div>
    </form>
  );
}

function SlidePanel({ title, children, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l border-[var(--border-soft)] overflow-y-auto"
      style={{ background: "var(--surface)" }}
    >
      <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-soft)]">
        <div className="text-xs uppercase tracking-[0.15em] text-[var(--muted)]">{title}</div>
        <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--warm-white)]"><X size={18} /></button>
      </div>
      <div className="p-6">{children}</div>
    </motion.div>
  );
}

export default function MenuEditor() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
  const [panel, setPanel] = useState(null); // null | "add" | { item }
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("menu_items").select("*").order("sort_order").order("name");
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async (form) => {
    setSaving(true);
    if (form.id) {
      await supabase.from("menu_items").update({ name: form.name, description: form.description, price: form.price, category: form.category, available: form.available }).eq("id", form.id);
    } else {
      await supabase.from("menu_items").insert({ ...form, sort_order: items.filter(i => i.category === form.category).length });
    }
    await load();
    setPanel(null);
    setSaving(false);
  };

  const toggleAvailable = async (item) => {
    await supabase.from("menu_items").update({ available: !item.available }).eq("id", item.id);
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, available: !i.available } : i));
  };

  const remove = async (id) => {
    if (!confirm("Delete this item?")) return;
    await supabase.from("menu_items").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const catItems = items.filter((i) => i.category === activeCategory);

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted)] mb-1">Website Management</div>
          <h1 className="text-2xl font-light text-[var(--warm-white)]">Menu Editor</h1>
        </div>
        <button onClick={() => setPanel("add")} className="btn-gold"><Plus size={14} /> Add Item</button>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-6">
        {CATEGORIES.map((c) => (
          <button key={c} onClick={() => setActiveCategory(c)}
            className={`flex-shrink-0 px-4 py-2 text-xs font-medium uppercase tracking-wider border transition-all ${activeCategory === c ? "bg-[var(--gold)] text-[var(--charcoal)] border-[var(--gold)]" : "text-[var(--muted)] border-[var(--border-soft)] hover:border-[var(--gold)]"}`}>
            {c}
          </button>
        ))}
      </div>

      {/* Items */}
      <div className="console-card p-0">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-[var(--muted)]"><Loader2 size={20} className="animate-spin mr-2" /> Loading...</div>
        ) : catItems.length === 0 ? (
          <div className="text-center py-16 text-[var(--muted)] text-sm">
            No items in this category.
            <button onClick={() => setPanel("add")} className="block mx-auto mt-4 btn-ghost text-xs">Add first item</button>
          </div>
        ) : (
          <table className="console-table">
            <thead>
              <tr><th>Name</th><th>Description</th><th>Price</th><th>Available</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {catItems.map((item) => (
                <tr key={item.id}>
                  <td className="font-medium text-[var(--warm-white)]">{item.name}</td>
                  <td className="text-[var(--muted)] max-w-xs">
                    <span className="line-clamp-2 text-xs">{item.description}</span>
                  </td>
                  <td>
                    <span className="bg-[var(--gold)] text-[var(--charcoal)] text-xs font-bold px-2 py-0.5">{item.price}</span>
                  </td>
                  <td>
                    <button onClick={() => toggleAvailable(item)} className={item.available ? "text-[var(--gold)]" : "text-[var(--muted)]"}>
                      {item.available ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                    </button>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button onClick={() => setPanel(item)} className="btn-ghost py-1 px-2"><Pencil size={12} /></button>
                      <button onClick={() => remove(item.id)} className="btn-danger py-1 px-2"><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <AnimatePresence>
        {panel && (
          <>
            <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setPanel(null)} />
            <SlidePanel title={panel === "add" ? "Add Menu Item" : "Edit Item"} onClose={() => setPanel(null)}>
              <ItemForm
                initial={panel === "add" ? { ...EMPTY, category: activeCategory } : panel}
                onSave={save}
                onCancel={() => setPanel(null)}
                saving={saving}
              />
            </SlidePanel>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
