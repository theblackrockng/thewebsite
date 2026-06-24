import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { supabase } from "../../lib/supabase";
import {
  Store, Lock, Sun, Moon, Check, Loader, ChevronRight,
  MapPin, Phone, Mail, Globe, Clock, Palette, RefreshCw, Monitor,
} from "lucide-react";

/* ─── Section wrapper ─── */
function Section({ title, icon: Icon, children }) {
  return (
    <div style={{
      background: "var(--ds-surface)",
      border: "1px solid var(--ds-border)",
      borderRadius: 10, overflow: "hidden",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "14px 20px", borderBottom: "1px solid var(--ds-border)",
        background: "var(--ds-sidebar)",
      }}>
        <Icon size={14} strokeWidth={1.75} style={{ color: "var(--ds-gold)", flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--ds-text)" }}>
          {title}
        </span>
      </div>
      <div style={{ padding: "20px" }}>{children}</div>
    </div>
  );
}

/* ─── Field row ─── */
function Field({ label, icon: Icon, children }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--ds-border)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--ds-muted)", fontSize: 12.5 }}>
        {Icon && <Icon size={13} strokeWidth={1.75} style={{ flexShrink: 0 }} />}
        {label}
      </div>
      <div>{children}</div>
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "8px 11px",
  background: "var(--ds-input-bg)", border: "1px solid var(--ds-border)",
  borderRadius: 7, fontSize: 13, color: "var(--ds-text)",
  fontFamily: "'DM Sans', sans-serif", outline: "none",
};

const saveBtn = (disabled) => ({
  display: "flex", alignItems: "center", gap: 6,
  padding: "9px 20px", borderRadius: 7, border: "none",
  cursor: disabled ? "not-allowed" : "pointer",
  background: disabled ? "var(--ds-border)" : "var(--ds-gold)",
  color: disabled ? "var(--ds-muted)" : "#1a1008",
  fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
  opacity: disabled ? 0.6 : 1, transition: "opacity 0.15s",
});

/* ─── Toast ─── */
function Toast({ msg, ok }) {
  if (!msg) return null;
  return (
    <div style={{
      position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
      background: ok ? "#166534" : "#991b1b", color: "#fff",
      padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600,
      boxShadow: "0 6px 24px rgba(0,0,0,0.18)", zIndex: 9998, whiteSpace: "nowrap",
    }}>
      {msg}
    </div>
  );
}

/* ─── Color Picker swatch ─── */
function ColorSwatch({ label, value, onChange }) {
  const ref = useRef(null);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
      <div
        onClick={() => ref.current?.click()}
        title={label}
        style={{
          width: 44, height: 44, borderRadius: 10,
          background: value || "#000",
          border: "2px solid var(--ds-border)",
          cursor: "pointer", position: "relative", overflow: "hidden",
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          transition: "transform 0.1s, box-shadow 0.1s",
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.06)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)"; }}
      >
        <input
          ref={ref}
          type="color"
          value={value || "#000000"}
          onChange={e => onChange(e.target.value)}
          style={{ position: "absolute", inset: "-6px", width: "calc(100%+12px)", height: "calc(100%+12px)", opacity: 0, cursor: "pointer" }}
        />
      </div>
      <span style={{ fontSize: 10, color: "var(--ds-muted)", textAlign: "center", lineHeight: 1.2, maxWidth: 56 }}>{label}</span>
      <input
        type="text"
        value={value || ""}
        onChange={e => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) onChange(e.target.value); }}
        style={{
          width: 64, fontSize: 10, textAlign: "center", fontFamily: "monospace",
          border: "1px solid var(--ds-border)", borderRadius: 5,
          padding: "2px 4px", background: "var(--ds-input-bg)",
          color: "var(--ds-text)", outline: "none",
        }}
      />
    </div>
  );
}

/* ─── Website Theme preview ─── */
function ThemePreview({ theme }) {
  const { burgundy, gold, charcoal, warm_white, muted, heading_font, body_font } = theme;
  return (
    <div style={{
      borderRadius: 10, overflow: "hidden",
      border: "1px solid var(--ds-border)",
      fontFamily: `'${body_font}', sans-serif`,
      userSelect: "none",
    }}>
      {/* Nav */}
      <div style={{ background: charcoal, padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${burgundy}44` }}>
        <span style={{ fontFamily: `'${heading_font}', serif`, fontSize: 14, fontWeight: 700, color: gold, letterSpacing: "2px" }}>BLACKROCK</span>
        <div style={{ display: "flex", gap: 12 }}>
          {["Menu", "Reservations", "About"].map(n => (
            <span key={n} style={{ fontSize: 10, color: warm_white, opacity: 0.65 }}>{n}</span>
          ))}
        </div>
      </div>
      {/* Hero */}
      <div style={{ background: `linear-gradient(160deg, ${charcoal} 0%, ${burgundy}88 100%)`, padding: "24px 16px", textAlign: "center" }}>
        <div style={{ fontSize: 9, letterSpacing: "3px", color: gold, marginBottom: 6, fontWeight: 600, textTransform: "uppercase" }}>Est. 2020 · Lagos</div>
        <div style={{ fontFamily: `'${heading_font}', serif`, fontSize: 22, color: warm_white, lineHeight: 1.2, marginBottom: 8 }}>Where Flavour<br /><em>Meets Fire</em></div>
        <button style={{ background: burgundy, color: warm_white, border: "none", padding: "7px 18px", borderRadius: 3, fontSize: 10, fontWeight: 600, cursor: "default", letterSpacing: "1px" }}>
          RESERVE A TABLE
        </button>
      </div>
      {/* Footer strip */}
      <div style={{ background: charcoal, padding: "8px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 9, color: muted }}>© 2025 BLACKROCK</span>
        <div style={{ width: 28, height: 1, background: gold, opacity: 0.5 }} />
        <span style={{ fontSize: 9, color: muted }}>Lagos, Nigeria</span>
      </div>
    </div>
  );
}

/* ─── Website Theme section ─── */
const HEADING_FONTS = ["Cormorant Garamond", "Playfair Display", "EB Garamond", "Lora", "Libre Baskerville", "Spectral"];
const BODY_FONTS    = ["Montserrat", "DM Sans", "Inter", "Raleway", "Nunito Sans", "Poppins"];

const DEFAULT_THEME = {
  burgundy:      "#8B1A2B",
  burgundy_deep: "#6B1220",
  gold:          "#C9A84C",
  gold_light:    "#e0c890",
  charcoal:      "#0f0d0a",
  charcoal_soft: "#1a1612",
  warm_white:    "#F5F0E8",
  muted:         "#9C8E7A",
  border_soft:   "#2e2820",
  heading_font:  "Cormorant Garamond",
  body_font:     "Montserrat",
};

function WebsiteThemeSection({ toast }) {
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("site_theme").select("*").eq("id", 1).maybeSingle()
      .then(({ data }) => {
        if (data) setTheme({ ...DEFAULT_THEME, ...data });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const set = (k, v) => setTheme(t => ({ ...t, [k]: v }));

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("site_theme").upsert({ id: 1, ...theme, updated_at: new Date().toISOString() });
    setSaving(false);
    toast(error ? "Failed: " + error.message : "Theme saved — website updates live", !error);
  }

  function reset() {
    setTheme(DEFAULT_THEME);
  }

  const selectStyle = {
    ...inputStyle, cursor: "pointer", paddingRight: 8,
  };

  if (loading) return <div style={{ color: "var(--ds-muted)", fontSize: 13 }}>Loading…</div>;

  const colorGroups = [
    {
      label: "Brand",
      colors: [
        { key: "burgundy",      label: "Primary" },
        { key: "burgundy_deep", label: "Primary Dark" },
        { key: "gold",          label: "Accent" },
        { key: "gold_light",    label: "Accent Light" },
      ],
    },
    {
      label: "Surface & Text",
      colors: [
        { key: "charcoal",     label: "Background" },
        { key: "charcoal_soft", label: "Surface" },
        { key: "warm_white",   label: "Text" },
        { key: "muted",        label: "Muted" },
      ],
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Color groups */}
      {colorGroups.map(group => (
        <div key={group.label}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ds-muted)", marginBottom: 12 }}>
            {group.label}
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {group.colors.map(({ key, label }) => (
              <ColorSwatch key={key} label={label} value={theme[key]} onChange={v => set(key, v)} />
            ))}
          </div>
        </div>
      ))}

      {/* Typography */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ds-muted)", marginBottom: 12 }}>
          Typography
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, color: "var(--ds-muted)", marginBottom: 6 }}>Heading font</div>
            <select style={selectStyle} value={theme.heading_font} onChange={e => set("heading_font", e.target.value)}>
              {HEADING_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--ds-muted)", marginBottom: 6 }}>Body font</div>
            <select style={selectStyle} value={theme.body_font} onChange={e => set("body_font", e.target.value)}>
              {BODY_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ds-muted)", marginBottom: 12 }}>
          Live Preview
        </div>
        <ThemePreview theme={theme} />
      </div>

      {/* Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 4 }}>
        <button
          onClick={reset}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 14px", borderRadius: 7,
            border: "1px solid var(--ds-border)", background: "none",
            color: "var(--ds-muted)", fontSize: 13, cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <RefreshCw size={13} />
          Reset to defaults
        </button>

        <button onClick={save} disabled={saving} style={saveBtn(saving)}>
          {saving ? <Loader size={13} style={{ animation: "spin 0.8s linear infinite" }} /> : <Check size={13} />}
          {saving ? "Saving…" : "Save & apply live"}
        </button>
      </div>

      <p style={{ fontSize: 11.5, color: "var(--ds-muted)", margin: 0 }}>
        Changes apply to the live website instantly — no rebuild needed.
      </p>
    </div>
  );
}

/* ─── Restaurant Info ─── */
function RestaurantSection({ toast }) {
  const [form, setForm] = useState({ name: "BLACKROCK", tagline: "", address: "", phone: "", email: "", website: "", hours: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("restaurant_settings").select("*").eq("id", 1).maybeSingle()
      .then(({ data }) => { if (data) setForm(f => ({ ...f, ...data })); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("restaurant_settings").upsert({ id: 1, ...form });
    setSaving(false);
    toast(error ? "Failed to save: " + error.message : "Restaurant info saved", !error);
  }

  if (loading) return <div style={{ color: "var(--ds-muted)", fontSize: 13 }}>Loading…</div>;

  const fields = [
    { key: "name",    label: "Restaurant name", Icon: Store,         placeholder: "Restaurant name" },
    { key: "tagline", label: "Tagline",          Icon: ChevronRight,  placeholder: "e.g. Where flavour meets fire" },
    { key: "address", label: "Address",          Icon: MapPin,        placeholder: "Full street address" },
    { key: "phone",   label: "Phone",            Icon: Phone,         placeholder: "+234 800 000 0000" },
    { key: "email",   label: "Email",            Icon: Mail,          placeholder: "hello@yourrestaurant.com", type: "email" },
    { key: "website", label: "Website",          Icon: Globe,         placeholder: "www.yourrestaurant.com" },
    { key: "hours",   label: "Opening hours",    Icon: Clock,         placeholder: "e.g. Mon–Sun 10AM – 12AM" },
  ];

  return (
    <>
      <div style={{ marginBottom: -1 }}>
        {fields.map(({ key, label, Icon, placeholder, type }) => (
          <div key={key} style={{ display: "grid", gridTemplateColumns: "160px 1fr", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--ds-border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--ds-muted)", fontSize: 12.5 }}>
              <Icon size={13} strokeWidth={1.75} style={{ flexShrink: 0 }} />
              {label}
            </div>
            <input style={inputStyle} value={form[key]} type={type || "text"}
              onChange={e => set(key, e.target.value)} placeholder={placeholder} />
          </div>
        ))}
      </div>
      <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end" }}>
        <button onClick={save} disabled={saving} style={saveBtn(saving)}>
          {saving ? <Loader size={13} style={{ animation: "spin 0.8s linear infinite" }} /> : <Check size={13} />}
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </>
  );
}

/* ─── Security ─── */
function SecuritySection({ toast }) {
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  async function changePassword() {
    if (!next || next !== confirm) { toast("Passwords do not match", false); return; }
    if (next.length < 8) { toast("Password must be at least 8 characters", false); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: next });
    setSaving(false);
    if (error) { toast("Failed: " + error.message, false); return; }
    toast("Password updated successfully", true);
    setNext(""); setConfirm("");
  }

  const disabled = saving || !next || !confirm;

  return (
    <>
      <div style={{ marginBottom: -1 }}>
        {[
          { label: "New password",     val: next,    set: setNext,    ph: "At least 8 characters" },
          { label: "Confirm password", val: confirm, set: setConfirm, ph: "Repeat new password" },
        ].map(({ label, val, set, ph }) => (
          <div key={label} style={{ display: "grid", gridTemplateColumns: "160px 1fr", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--ds-border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--ds-muted)", fontSize: 12.5 }}>
              <Lock size={13} strokeWidth={1.75} style={{ flexShrink: 0 }} />{label}
            </div>
            <input style={inputStyle} type="password" value={val} onChange={e => set(e.target.value)} placeholder={ph} />
          </div>
        ))}
      </div>
      <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end" }}>
        <button onClick={changePassword} disabled={disabled} style={saveBtn(disabled)}>
          {saving ? <Loader size={13} style={{ animation: "spin 0.8s linear infinite" }} /> : <Lock size={13} />}
          {saving ? "Updating…" : "Update password"}
        </button>
      </div>
    </>
  );
}

/* ─── Appearance ─── */
function AppearanceSection() {
  const [isDark, setIsDark] = useState(() => {
    try { return localStorage.getItem("blackrock-theme") === "dark"; } catch { return false; }
  });

  useLayoutEffect(() => {
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  }, [isDark]);

  function toggle(dark) {
    setIsDark(dark);
    try { localStorage.setItem("blackrock-theme", dark ? "dark" : "light"); } catch {}
  }

  const btn = (active, label, Icon) => (
    <button
      onClick={() => toggle(label === "Dark")}
      style={{
        display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 8,
        border: active ? "1.5px solid var(--ds-gold)" : "1.5px solid var(--ds-border)",
        background: active ? "rgba(200,169,110,0.1)" : "var(--ds-input-bg)",
        color: active ? "var(--ds-gold)" : "var(--ds-muted)",
        cursor: "pointer", fontSize: 13, fontWeight: active ? 600 : 400,
        fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s",
      }}
    >
      <Icon size={15} strokeWidth={1.75} />
      {label}
      {active && <Check size={12} style={{ marginLeft: 2 }} />}
    </button>
  );

  return (
    <>
      <p style={{ fontSize: 13, color: "var(--ds-muted)", marginBottom: 16 }}>
        Choose how the console looks. Saved to this browser.
      </p>
      <div style={{ display: "flex", gap: 10 }}>
        {btn(!isDark, "Light", Sun)}
        {btn(isDark,  "Dark",  Moon)}
      </div>
    </>
  );
}

/* ─── Main ─── */
export default function Settings() {
  const [toastMsg, setToastMsg] = useState(null);
  const [toastOk, setToastOk] = useState(true);

  function showToast(msg, ok) {
    setToastMsg(msg); setToastOk(ok);
    setTimeout(() => setToastMsg(null), 3500);
  }

  return (
    <div style={{ padding: "28px 32px", maxWidth: 760 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 700, color: "var(--ds-text)", marginBottom: 4 }}>
          Settings
        </h1>
        <p style={{ fontSize: 13, color: "var(--ds-muted)" }}>
          Manage your restaurant profile, website theme, security, and console preferences.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <Section title="Website Theme" icon={Palette}>
          <WebsiteThemeSection toast={showToast} />
        </Section>

        <Section title="Restaurant Info" icon={Store}>
          <RestaurantSection toast={showToast} />
        </Section>

        <Section title="Security" icon={Lock}>
          <SecuritySection toast={showToast} />
        </Section>

        <Section title="Console Appearance" icon={Monitor}>
          <AppearanceSection />
        </Section>
      </div>

      <Toast msg={toastMsg} ok={toastOk} />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
