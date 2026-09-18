import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { MENU } from "../lib/data";
import { Plus, Minus, X, Check, ChevronLeft, UtensilsCrossed, AlertCircle, LogOut } from "lucide-react";

/* ── Constants (same as Order.jsx) ────────────────────────────────── */
const FOOD_CATEGORY_ORDER = [
  "Starters", "Salads", "Rice", "Pasta",
  "Bush Bar Kitchen", "Continental", "Sauces",
  "Charcoal Grills", "National Dishes", "Traditional Specials",
];
const DRINK_CATEGORY_ORDER = [
  "Beer & Cider", "Cocktails", "Mocktails",
  "Soft Drinks & Water", "Hot Drinks", "Fresh Juice", "Spirits", "Wines",
];
const SOUPS = ["Efo Riro", "Edika-Ikong", "Egusi", "Mixed Okro", "Fisherman Soup", "Seafood", "Banga", "Ofe Nsala", "Miyan Kuka", "Ewedu"];
const SWALLOWS = ["Pounded Yam", "Eba", "Amala", "Fufu", "Wheat", "Semo"];

function fmtPrice(n) { return `₦${Number(n).toLocaleString("en-NG")}`; }
function slugify(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "-"); }

function useMenu() {
  const [foodData, setFoodData] = useState(null);
  const [drinkData, setDrinkData] = useState(null);

  useEffect(() => {
    supabase.from("menu_items").select("*").eq("available", true).order("sort_order", { ascending: true, nullsFirst: false })
      .then(({ data, error }) => {
        const food = {};
        const drinks = {};
        if (!error && data?.length > 0) {
          for (const item of data) {
            const type = item.menu_type ?? "food";
            const cat = item.category || "Other";
            if (type === "drink") { if (!drinks[cat]) drinks[cat] = []; drinks[cat].push(item); }
            else { if (!food[cat]) food[cat] = []; food[cat].push(item); }
          }
        }
        if (Object.keys(food).length === 0) {
          for (const [cat, dishes] of Object.entries(MENU)) {
            food[cat] = dishes.map((d, idx) => ({
              id: `static-${slugify(cat)}-${idx}`,
              name: d.name, description: d.desc,
              price: parseInt((d.price || "0").replace(/[₦,]/g, ""), 10) || 0,
              category: cat, available: true,
            }));
          }
        }
        setFoodData(food);
        setDrinkData(drinks);
      });
  }, []);

  return { foodData, drinkData };
}

/* ── Allowed roles for the waiter app ───────────────────────────────── */
const WAITER_ROLES = ["waiter", "staff", "manager", "super_admin"];

/* ── Main export ────────────────────────────────────────────────────── */
export default function Waiter() {
  return <WaiterAuth />;
}

function WaiterAuth() {
  const [profile, setProfile] = useState(null); // { id, name, role }
  const [bootLoading, setBootLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  async function loadProfile(userId) {
    const { data } = await supabase
      .from("staff_profiles")
      .select("id, full_name, role")
      .eq("id", userId)
      .maybeSingle();
    if (data && WAITER_ROLES.includes(data.role)) {
      setProfile({ id: data.id, name: data.full_name || "Waiter", role: data.role });
      return true;
    }
    return false;
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) await loadProfile(session.user.id);
      setBootLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_e, session) => {
      if (session?.user) { await loadProfile(session.user.id); }
      else { setProfile(null); }
    });
    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!profile?.id) return;
    if (!window.Capacitor?.isNativePlatform()) return;
    (async () => {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        const perm = await PushNotifications.requestPermissions();
        if (perm.receive !== 'granted') return;
        await PushNotifications.register();
        await PushNotifications.addListener('registration', async ({ value: token }) => {
          await fetch('/api/register-device', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: 'waiter', staff_id: profile.id, fcm_token: token }),
          });
        });
      } catch {}
    })();
  }, [profile?.id]);

  async function handleSignIn(e) {
    e.preventDefault();
    setError("");
    setSigningIn(true);
    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (authErr) { setError("Incorrect email or password."); return; }
      const valid = await loadProfile(data.user.id);
      if (!valid) {
        await supabase.auth.signOut();
        setError("Your account doesn't have waiter access. Contact your manager.");
      }
    } finally {
      setSigningIn(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setProfile(null);
    setEmail("");
    setPassword("");
  }

  if (bootLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0f0d0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 11, color: "#9C8E7A", letterSpacing: "0.2em", textTransform: "uppercase" }}>Loading…</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ minHeight: "100vh", background: "#0f0d0a", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <form onSubmit={handleSignIn} style={{ background: "#1a1612", border: "1px solid #2e2820", borderRadius: 14, padding: "40px 36px", width: "100%", maxWidth: 400, display: "flex", flexDirection: "column" }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17, fontWeight: 700, letterSpacing: "4px", color: "#c8a96e", textTransform: "uppercase", marginBottom: 6 }}>BLACKROCK</div>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 700, color: "#F5F0E8", margin: "0 0 6px" }}>Waiter Sign In</h2>
          <p style={{ fontSize: 13, color: "#9C8E7A", margin: "0 0 28px", lineHeight: 1.5 }}>Sign in with your staff account to start taking orders.</p>

          <label style={{ fontSize: 11, fontWeight: 600, color: "#9C8E7A", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>Email</label>
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@blackrock.com" required autoFocus
            style={{ background: "#251f19", border: "1px solid #3e3426", borderRadius: 7, padding: "12px 14px", fontSize: 14, color: "#F5F0E8", outline: "none", marginBottom: 16, fontFamily: "inherit" }}
          />

          <label style={{ fontSize: 11, fontWeight: 600, color: "#9C8E7A", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>Password</label>
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••" required
            style={{ background: "#251f19", border: "1px solid #3e3426", borderRadius: 7, padding: "12px 14px", fontSize: 14, color: "#F5F0E8", outline: "none", marginBottom: error ? 14 : 24, fontFamily: "inherit" }}
          />

          {error && (
            <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 7, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#ef4444", lineHeight: 1.5 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={signingIn || !email.trim() || !password}
            style={{
              padding: "14px 20px", borderRadius: 7, border: "none",
              background: (signingIn || !email.trim() || !password) ? "#2e2820" : "#c8a96e",
              color: (signingIn || !email.trim() || !password) ? "#5a4e46" : "#0f0d0a",
              fontSize: 13, fontWeight: 700, cursor: (signingIn || !email.trim() || !password) ? "not-allowed" : "pointer",
              fontFamily: "inherit", letterSpacing: "0.04em",
            }}
          >
            {signingIn ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    );
  }

  return <WaiterApp waiterName={profile.name} waiterRole={profile.role} onSignOut={handleSignOut} />;
}

function WaiterApp({ waiterName, waiterRole, onSignOut }) {
  const [stage, setStage] = useState("table"); // table | menu | confirm | done
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [cart, setCart] = useState([]);
  const [lastOrder, setLastOrder] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    supabase.from("tables").select("*").eq("active", true).order("table_number", { ascending: true })
      .then(({ data }) => setTables(data || []));
  }, []);

  function addToCart(item) {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) return prev.map((i) => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...item, qty: 1 }];
    });
  }

  function setCartQty(id, qty) {
    if (qty <= 0) setCart((prev) => prev.filter((i) => i.id !== id));
    else setCart((prev) => prev.map((i) => i.id === id ? { ...i, qty } : i));
  }

  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  async function placeOrder() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderType: "dine-in",
          tableNumber: selectedTable.table_number,
          orderSource: "waiter",
          placedBy: waiterName,
          guestName: `Table ${selectedTable.table_number}`,
          guestPhone: "—",
          guestEmail: null,
          specialInstructions: null,
          scheduledTime: null,
          paymentMethod: "pay_on_arrival",
          items: cart.map((i) => ({ id: i.id, name: i.name, price: i.price, qty: i.qty, menuType: i.menuType || "food" })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to place order.");
      setLastOrder({ orderNumber: data.orderNumber, tableNumber: selectedTable.table_number });
      setCart([]);
      setStage("done");
    } catch (err) {
      setSubmitError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Stage: Table selection ── */
  if (stage === "table") {
    return (
      <div style={{ minHeight: "100vh", background: "#0f0d0a", padding: "24px 20px", fontFamily: "'DM Sans', 'Montserrat', sans-serif" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 700, letterSpacing: "3px", color: "#c8a96e", textTransform: "uppercase" }}>BLACKROCK</div>
              <div style={{ fontSize: 12, color: "#9C8E7A", marginTop: 2 }}>Waiter: <strong style={{ color: "#F5F0E8" }}>{waiterName}</strong></div>
            </div>
            <button onClick={onSignOut} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "1px solid #2e2820", borderRadius: 6, padding: "6px 12px", color: "#9C8E7A", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
              <LogOut size={12} /> Sign Out
            </button>
          </div>

          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 700, color: "#F5F0E8", margin: "0 0 6px" }}>Select a Table</h2>
          <p style={{ fontSize: 13, color: "#9C8E7A", margin: "0 0 24px" }}>Choose the table you're taking an order for.</p>

          {tables.length === 0 ? (
            <p style={{ color: "#9C8E7A", fontSize: 14 }}>Loading tables…</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", gap: 12 }}>
              {tables.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setSelectedTable(t); setCart([]); setStage("menu"); }}
                  style={{
                    aspectRatio: "1",
                    background: "#1a1612",
                    border: "1px solid #2e2820",
                    borderRadius: 10,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                    cursor: "pointer",
                    transition: "border-color 0.15s, background 0.15s",
                    fontFamily: "inherit",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#c8a96e"; e.currentTarget.style.background = "#221e1b"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2e2820"; e.currentTarget.style.background = "#1a1612"; }}
                >
                  <UtensilsCrossed size={18} style={{ color: "#c8a96e" }} />
                  <span style={{ fontSize: 20, fontWeight: 700, color: "#F5F0E8" }}>{t.table_number}</span>
                  <span style={{ fontSize: 10, color: "#9C8E7A", letterSpacing: "0.1em", textTransform: "uppercase" }}>Table</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── Stage: Menu ── */
  if (stage === "menu") {
    return (
      <WaiterMenu
        waiterName={waiterName}
        table={selectedTable}
        cart={cart}
        cartTotal={cartTotal}
        cartCount={cartCount}
        onAddItem={addToCart}
        onSetQty={setCartQty}
        onBack={() => setStage("table")}
        onCheckout={() => setStage("confirm")}
      />
    );
  }

  /* ── Stage: Confirm ── */
  if (stage === "confirm") {
    return (
      <div style={{ minHeight: "100vh", background: "#0f0d0a", padding: "24px 20px", fontFamily: "'DM Sans', 'Montserrat', sans-serif" }}>
        <div style={{ maxWidth: 540, margin: "0 auto" }}>
          <button onClick={() => setStage("menu")} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", color: "#9C8E7A", cursor: "pointer", fontSize: 13, marginBottom: 24, padding: 0, fontFamily: "inherit" }}>
            <ChevronLeft size={16} /> Back to menu
          </button>

          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(200,169,110,0.1)", border: "1px solid rgba(200,169,110,0.25)", borderRadius: 99, padding: "6px 16px", marginBottom: 16 }}>
            <UtensilsCrossed size={14} style={{ color: "#c8a96e" }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#c8a96e", letterSpacing: "0.06em" }}>Table {selectedTable.table_number} — Waiter: {waiterName}</span>
          </div>

          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 700, color: "#F5F0E8", margin: "0 0 6px" }}>Confirm with Guest</h2>
          <p style={{ fontSize: 13, color: "#9C8E7A", margin: "0 0 24px", lineHeight: 1.5 }}>Read the order aloud to the guest before placing it.</p>

          {/* Items */}
          <div style={{ background: "#1a1612", border: "1px solid #2e2820", borderRadius: 10, marginBottom: 16, overflow: "hidden" }}>
            {cart.map((item, idx) => (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 20px", borderBottom: idx < cart.length - 1 ? "1px solid #1e1a16" : "none", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "#F5F0E8" }}>{item.name}</div>
                  <div style={{ fontSize: 12, color: "#9C8E7A", marginTop: 2 }}>{fmtPrice(item.price)} × {item.qty}</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#F5F0E8" }}>{fmtPrice(item.price * item.qty)}</div>
              </div>
            ))}
            <div style={{ padding: "13px 20px", borderTop: "1px solid #2e2820", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#F5F0E8" }}>Total</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#c8a96e" }}>{fmtPrice(cartTotal)}</span>
            </div>
          </div>

          <div style={{ background: "rgba(200,169,110,0.08)", border: "1px solid rgba(200,169,110,0.2)", borderRadius: 8, padding: "12px 16px", marginBottom: 20 }}>
            <p style={{ margin: 0, fontSize: 13, color: "#c8a96e" }}><strong>Pay at Table.</strong> Guest pays when they're ready to leave.</p>
          </div>

          {submitError && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, background: "rgba(139,26,43,0.15)", border: "1px solid rgba(139,26,43,0.4)", borderRadius: 8, padding: "12px 16px", marginBottom: 16 }}>
              <AlertCircle size={16} style={{ color: "#e05c6e", flexShrink: 0, marginTop: 1 }} />
              <p style={{ margin: 0, fontSize: 13, color: "#e05c6e" }}>{submitError}</p>
            </div>
          )}

          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={() => setStage("menu")} style={{ flex: 1, padding: "13px 20px", borderRadius: 7, border: "1px solid #2e2820", background: "transparent", color: "#9C8E7A", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              Edit Order
            </button>
            <button
              onClick={placeOrder}
              disabled={submitting}
              style={{ flex: 2, padding: "13px 20px", borderRadius: 7, border: "none", background: "#7a1c1c", color: "#F5F0E8", fontSize: 13, fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1, fontFamily: "inherit" }}
            >
              {submitting ? "Placing Order…" : "Place Order →"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Stage: Done ── */
  return (
    <div style={{ minHeight: "100vh", background: "#0f0d0a", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'DM Sans', 'Montserrat', sans-serif" }}>
      <div style={{ maxWidth: 400, width: "100%", textAlign: "center" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(34,197,94,0.12)", border: "2px solid #22c55e", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <Check size={28} style={{ color: "#22c55e" }} />
        </div>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 700, color: "#F5F0E8", margin: "0 0 8px" }}>Order Placed!</h2>
        <p style={{ fontSize: 14, color: "#9C8E7A", margin: "0 0 4px" }}>
          <strong style={{ color: "#F5F0E8" }}>{lastOrder?.orderNumber}</strong>
        </p>
        <p style={{ fontSize: 13, color: "#9C8E7A", margin: "0 0 32px" }}>Table {lastOrder?.tableNumber} · Sent to kitchen</p>
        <button
          onClick={() => { setStage("table"); setSelectedTable(null); }}
          style={{ width: "100%", padding: "14px 20px", borderRadius: 8, border: "none", background: "#c8a96e", color: "#0f0d0a", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
        >
          Take Another Order
        </button>
      </div>
    </div>
  );
}

/* ── Waiter Menu Browser ────────────────────────────────────────────── */
function WaiterMenu({ waiterName, table, cart, cartTotal, cartCount, onAddItem, onSetQty, onBack, onCheckout }) {
  const { foodData, drinkData } = useMenu();
  const [menuType, setMenuType] = useState("food");
  const [activeFoodCat, setActiveFoodCat] = useState(FOOD_CATEGORY_ORDER[0]);
  const [activeDrinkCat, setActiveDrinkCat] = useState(DRINK_CATEGORY_ORDER[0]);
  const [soupModal, setSoupModal] = useState(null);
  const [traditionalModal, setTraditionalModal] = useState(null);
  const foodRefs = useRef({});
  const drinkRefs = useRef({});
  const scrolling = useRef(false);

  const currentData = menuType === "food" ? foodData : drinkData;
  const categoryOrder = menuType === "food" ? FOOD_CATEGORY_ORDER : DRINK_CATEGORY_ORDER;
  const categories = currentData ? categoryOrder.filter((c) => currentData[c]?.length > 0) : [];
  const activeCategory = menuType === "food" ? activeFoodCat : activeDrinkCat;

  useEffect(() => {
    if (!currentData || categories.length === 0) return;
    if (menuType === "food") setActiveFoodCat(categories[0]);
    else setActiveDrinkCat(categories[0]);
  }, [foodData, drinkData, menuType]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const refs = menuType === "food" ? foodRefs.current : drinkRefs.current;
    const setActive = menuType === "food" ? setActiveFoodCat : setActiveDrinkCat;
    const observer = new IntersectionObserver(
      (entries) => {
        if (scrolling.current) return;
        let top = null;
        for (const e of entries) if (e.isIntersecting && (!top || e.boundingClientRect.top < top.boundingClientRect.top)) top = e;
        if (top) setActive(top.target.dataset.category);
      },
      { rootMargin: "-110px 0px -60% 0px", threshold: 0 }
    );
    Object.values(refs).forEach((el) => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [foodData, drinkData, menuType]);

  const scrollToCategory = useCallback((cat) => {
    const refs = menuType === "food" ? foodRefs.current : drinkRefs.current;
    const el = refs[cat];
    if (!el) return;
    scrolling.current = true;
    if (menuType === "food") setActiveFoodCat(cat); else setActiveDrinkCat(cat);
    const top = el.getBoundingClientRect().top + window.scrollY - 130;
    window.scrollTo({ top, behavior: "smooth" });
    setTimeout(() => { scrolling.current = false; }, 800);
  }, [menuType]);

  const getCartItem = useCallback((id) => cart.find((i) => i.id === id), [cart]);
  const getNationalCartItems = useCallback((id) => cart.filter((i) => i.baseId === id), [cart]);

  return (
    <div style={{ minHeight: "100vh", background: "#0f0d0a", fontFamily: "'DM Sans', 'Montserrat', sans-serif" }}>
      {/* Top bar */}
      <div style={{ position: "sticky", top: 0, zIndex: 60, background: "rgba(15,13,10,0.97)", borderBottom: "1px solid #2e2820", padding: "12px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "#9C8E7A", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 13, padding: 0, fontFamily: "inherit", flexShrink: 0 }}>
          <ChevronLeft size={16} /> Tables
        </button>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
          <UtensilsCrossed size={14} style={{ color: "#c8a96e" }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#F5F0E8" }}>Table {table.table_number}</span>
          <span style={{ fontSize: 12, color: "#9C8E7A" }}>· {waiterName}</span>
        </div>
        {cartCount > 0 && (
          <button
            onClick={onCheckout}
            style={{ display: "flex", alignItems: "center", gap: 8, background: "#c8a96e", borderRadius: 99, padding: "8px 16px", border: "none", cursor: "pointer", fontFamily: "inherit" }}
          >
            <span style={{ background: "#0f0d0a", color: "#c8a96e", borderRadius: 99, fontSize: 11, fontWeight: 700, padding: "1px 6px" }}>{cartCount}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#0f0d0a" }}>Review — {fmtPrice(cartTotal)}</span>
          </button>
        )}
      </div>

      {/* Food / Drinks switcher */}
      <div style={{ padding: "16px 20px 0", display: "flex", justifyContent: "center", gap: 12, background: "#0f0d0a" }}>
        {[{ key: "food", label: "FOOD" }, { key: "drink", label: "DRINKS" }].map(({ key, label }) => (
          <button key={key} onClick={() => setMenuType(key)} style={{ minWidth: 110, padding: "9px 28px", borderRadius: 50, border: menuType === key ? "1px solid #c8a96e" : "1px solid rgba(245,240,232,0.3)", background: menuType === key ? "#c8a96e" : "transparent", color: menuType === key ? "#1a1a1a" : "rgba(245,240,232,0.7)", fontWeight: menuType === key ? 700 : 500, fontSize: "12px", letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit" }}>
            {label}
          </button>
        ))}
      </div>

      {/* Category tabs */}
      <div style={{ position: "sticky", top: 49, zIndex: 50, background: "rgba(15,13,10,0.96)", backdropFilter: "blur(12px)", borderBottom: "1px solid #2e2820", overflowX: "auto", scrollbarWidth: "none", marginTop: 12 }}>
        <div style={{ display: "flex", gap: 4, padding: "10px 20px" }}>
          {categories.map((cat) => (
            <button key={`${menuType}-${cat}`} onClick={() => scrollToCategory(cat)} style={{ flexShrink: 0, padding: "6px 14px", borderRadius: 99, fontSize: 12, fontWeight: 600, border: `1px solid ${activeCategory === cat ? "#c8a96e" : "#2e2820"}`, background: activeCategory === cat ? "#c8a96e" : "transparent", color: activeCategory === cat ? "#0f0d0a" : "#9C8E7A", cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s", fontFamily: "inherit" }}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Menu items */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 20px 100px" }}>
        {currentData === null && <div style={{ textAlign: "center", color: "#9C8E7A", padding: "60px 0" }}>Loading menu…</div>}

        {menuType === "food" && foodData && categories.map((cat) => {
          const isNational = cat === "National Dishes";
          const isTraditional = cat === "Traditional Specials";
          const needsPicker = isNational || isTraditional;
          return (
            <section key={`food-${cat}`} ref={(el) => { foodRefs.current[cat] = el; }} data-category={cat} style={{ marginBottom: 48 }}>
              <WaiterCategoryHeader cat={cat} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
                {foodData[cat].map((dish) => (
                  <WaiterItemCard
                    key={dish.id}
                    dish={dish}
                    cartItem={needsPicker ? null : getCartItem(dish.id)}
                    nationalCartItems={needsPicker ? getNationalCartItems(dish.id) : null}
                    onAdd={() => {
                      if (isNational) setSoupModal(dish);
                      else if (isTraditional) setTraditionalModal(dish);
                      else onAddItem({ id: dish.id, name: dish.name, price: dish.price, category: dish.category, menuType: "food" });
                    }}
                    onSetQty={(q) => onSetQty(dish.id, q)}
                  />
                ))}
              </div>
            </section>
          );
        })}

        {menuType === "drink" && drinkData && categories.map((cat) => (
          <section key={`drink-${cat}`} ref={(el) => { drinkRefs.current[cat] = el; }} data-category={cat} style={{ marginBottom: 48 }}>
            <WaiterCategoryHeader cat={cat} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
              {drinkData[cat].map((drink) => (
                <WaiterItemCard
                  key={drink.id}
                  dish={drink}
                  cartItem={getCartItem(drink.id)}
                  onAdd={() => onAddItem({ id: drink.id, name: drink.name, price: drink.price, category: drink.category, menuType: "drink" })}
                  onSetQty={(q) => onSetQty(drink.id, q)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Soup/Swallow modals */}
      {soupModal && (
        <WaiterSoupModal dish={soupModal} onClose={() => setSoupModal(null)} onConfirm={(soup, swallow) => {
          const cartId = `${soupModal.id}|${soup}|${swallow}`;
          onAddItem({ id: cartId, baseId: soupModal.id, name: soupModal.name, price: soupModal.price, category: soupModal.category, menuType: "food", soup, swallow });
          setSoupModal(null);
        }} />
      )}
      {traditionalModal && (
        <WaiterSoupModal dish={traditionalModal} showSoup={false} onClose={() => setTraditionalModal(null)} onConfirm={(_s, swallow) => {
          const cartId = `${traditionalModal.id}|${swallow}`;
          onAddItem({ id: cartId, baseId: traditionalModal.id, name: traditionalModal.name, price: traditionalModal.price, category: traditionalModal.category, menuType: "food", swallow });
          setTraditionalModal(null);
        }} />
      )}
    </div>
  );
}

function WaiterCategoryHeader({ cat }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(22px, 3vw, 28px)", fontWeight: 700, color: "#F5F0E8", margin: "0 0 8px" }}>{cat}</h2>
      <div style={{ height: 2, width: 40, background: "#c8a96e", borderRadius: 2 }} />
    </div>
  );
}

function WaiterItemCard({ dish, cartItem, nationalCartItems, onAdd, onSetQty }) {
  const totalNationalQty = nationalCartItems ? nationalCartItems.reduce((s, i) => s + i.qty, 0) : 0;
  return (
    <div style={{ background: "#1a1612", border: "1px solid #2e2820", borderRadius: 9, padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ flex: 1 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: "#F5F0E8", margin: "0 0 5px", lineHeight: 1.3 }}>{dish.name}</h3>
        {dish.description && <p style={{ fontSize: 12, color: "#9C8E7A", margin: "0 0 10px", lineHeight: 1.5 }}>{dish.description}</p>}
        <div style={{ fontSize: 14, fontWeight: 700, color: "#c8a96e" }}>{fmtPrice(dish.price)}</div>
      </div>

      {nationalCartItems !== null ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {totalNationalQty > 0 && <p style={{ fontSize: 11, color: "#c8a96e", margin: 0 }}>{totalNationalQty} variation{totalNationalQty > 1 ? "s" : ""} in order</p>}
          <button onClick={onAdd} style={{ width: "100%", background: "transparent", border: "1px solid #c8a96e", color: "#c8a96e", borderRadius: 6, padding: "9px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontFamily: "inherit" }}>
            <Plus size={13} /> Add
          </button>
        </div>
      ) : cartItem ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, color: "#9C8E7A" }}>In order</span>
          <div style={{ display: "flex", alignItems: "center" }}>
            <button onClick={() => onSetQty(cartItem.qty - 1)} style={{ width: 30, height: 30, background: "#2e2820", border: "none", borderRadius: "5px 0 0 5px", color: "#F5F0E8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Minus size={13} /></button>
            <span style={{ width: 34, height: 30, display: "flex", alignItems: "center", justifyContent: "center", background: "#251f19", color: "#F5F0E8", fontSize: 13, fontWeight: 600 }}>{cartItem.qty}</span>
            <button onClick={() => onSetQty(cartItem.qty + 1)} style={{ width: 30, height: 30, background: "#2e2820", border: "none", borderRadius: "0 5px 5px 0", color: "#F5F0E8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Plus size={13} /></button>
          </div>
        </div>
      ) : (
        <button onClick={onAdd} style={{ width: "100%", background: "transparent", border: "1px solid #c8a96e", color: "#c8a96e", borderRadius: 6, padding: "9px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontFamily: "inherit" }}>
          <Plus size={13} /> Add
        </button>
      )}
    </div>
  );
}

function WaiterSoupModal({ dish, onClose, onConfirm, showSoup = true }) {
  const [soup, setSoup] = useState("");
  const [swallow, setSwallow] = useState("");
  const canConfirm = (!showSoup || soup) && swallow;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.75)", padding: 16 }}>
      <div style={{ background: "#1a1612", border: "1px solid #3e3426", borderRadius: 12, width: "100%", maxWidth: 460, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px 14px", borderBottom: "1px solid #2e2820" }}>
          <div>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "#c8a96e" }}>Choose sides</p>
            <h3 style={{ margin: "3px 0 0", fontSize: 17, fontWeight: 700, color: "#F5F0E8", fontFamily: "'Cormorant Garamond', serif" }}>{dish.name}</h3>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9C8E7A", display: "flex" }}><X size={18} /></button>
        </div>
        <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 20 }}>
          {showSoup && (
            <div>
              <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#F5F0E8" }}>Soup <span style={{ color: "#ef4444" }}>*</span></p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {SOUPS.map((s) => (
                  <button key={s} onClick={() => setSoup(s)} style={{ padding: "7px 14px", borderRadius: 99, fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "all 0.15s", background: soup === s ? "#c8a96e" : "transparent", color: soup === s ? "#0f0d0a" : "#9C8E7A", border: `1px solid ${soup === s ? "#c8a96e" : "#3e3426"}`, fontFamily: "inherit" }}>{s}</button>
                ))}
              </div>
            </div>
          )}
          <div>
            <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#F5F0E8" }}>Swallow <span style={{ color: "#ef4444" }}>*</span></p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {SWALLOWS.map((sw) => (
                <button key={sw} onClick={() => setSwallow(sw)} style={{ padding: "7px 14px", borderRadius: 99, fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "all 0.15s", background: swallow === sw ? "#c8a96e" : "transparent", color: swallow === sw ? "#0f0d0a" : "#9C8E7A", border: `1px solid ${swallow === sw ? "#c8a96e" : "#3e3426"}`, fontFamily: "inherit" }}>{sw}</button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ padding: "14px 22px", borderTop: "1px solid #2e2820", display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "11px", borderRadius: 6, border: "1px solid #3e3426", background: "transparent", color: "#9C8E7A", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          <button onClick={() => canConfirm && onConfirm(soup, swallow)} disabled={!canConfirm} style={{ flex: 2, padding: "11px", borderRadius: 6, border: "none", background: canConfirm ? "#c8a96e" : "#2e2820", color: canConfirm ? "#0f0d0a" : "#5a4e46", fontSize: 13, fontWeight: 700, cursor: canConfirm ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "inherit" }}>
            <Check size={13} /> Add to Order
          </button>
        </div>
      </div>
    </div>
  );
}
