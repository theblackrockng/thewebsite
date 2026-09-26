import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Plus, Minus, ChevronLeft, ChevronRight, X, Check, AlertCircle,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { MENU } from "../lib/data";

const PER_PAGE = 5;
const LIST_H = 360;
const HEADER_H = 58;

const FOOD_CATEGORY_ORDER = [
  "Starters", "Salads", "Rice", "Pasta",
  "Bush Bar Kitchen", "Continental", "Sauces",
  "Charcoal Grills", "National Dishes", "Traditional Specials",
  "BLACKROCK EXPERIENCE",
];

const DRINK_CATEGORY_ORDER = [
  "Wines", "Spirits", "Beer & Cider", "Cocktails",
  "Mocktails", "Soft Drinks & Water", "Hot Drinks", "Fresh Juice",
];

const ALL_CATEGORY_ORDER = [...FOOD_CATEGORY_ORDER, ...DRINK_CATEGORY_ORDER];

const SOUPS = [
  "Efo Riro", "Edika-Ikong", "Egusi", "Mixed Okro",
  "Fisherman Soup", "Seafood", "Banga", "Ofe Nsala", "Miyan Kuka", "Ewedu",
];
const SWALLOWS = ["Pounded Yam", "Eba", "Amala", "Fufu", "Wheat", "Semo"];

const CATEGORY_IMAGES = {
  "Starters":             "/images/menu/starters.jpg",
  "Salads":               "/images/menu/salads.jpg",
  "Rice":                 "/images/menu/rice.jpg",
  "Pasta":                "/images/menu/noodles.jpg",
  "Bush Bar Kitchen":     "/images/menu/pepper-soup.jpg",
  "Continental":          "/images/menu/continental.jpg",
  "Sauces":               "/images/menu/sauces.jpg",
  "Charcoal Grills":      "/images/menu/grills.jpg",
  "National Dishes":      "/images/menu/national.jpg",
  "Traditional Specials": "/images/menu/traditional.jpg",
  "BLACKROCK EXPERIENCE": "/images/menu/continental.jpg",
  "Wines":                "/images/menu/wines.jpg",
  "Spirits":              "/images/menu/spirits.jpg",
  "Beer & Cider":         "/images/menu/beer.jpg",
  "Cocktails":            "/images/menu/cocktails.jpg",
  "Mocktails":            "/images/menu/mocktails.jpg",
  "Soft Drinks & Water":  "/images/menu/soft-drinks.jpg",
  "Hot Drinks":           "/images/menu/hot-drinks.jpg",
  "Fresh Juice":          "/images/menu/juice.jpg",
};

const CATEGORY_TAGLINES = {
  "Starters":             "Simple starts.\nGreat conversations.",
  "Salads":               "Crisp. Fresh.\nFull of flavour.",
  "Rice":                 "Every grain\ncounts.",
  "Pasta":                "Comfort\nin every bowl.",
  "Bush Bar Kitchen":     "Fiery. Smoky.\nUnforgettable.",
  "Continental":          "Refined plates.\nGlobal flavours.",
  "Sauces":               "Rich sauces.\nEndless satisfaction.",
  "Charcoal Grills":      "Low and slow.\nBold and smoky.",
  "National Dishes":      "Roots. Culture.\nFlavour.",
  "Traditional Specials": "The taste of home.\nThe pride of origin.",
  "BLACKROCK EXPERIENCE": "The finest.\nOnly at BLACKROCK.",
  "Wines":                "For the\ndiscerning palate.",
  "Spirits":              "Neat. On ice.\nYour call.",
  "Beer & Cider":         "Cold, crisp\nand refreshing.",
  "Cocktails":            "Crafted with\nprecision.",
  "Mocktails":            "All the flavour.\nNone of the alcohol.",
  "Soft Drinks & Water":  "Simple sips.\nAlways cold.",
  "Hot Drinks":           "Warm up.\nSlow down.",
  "Fresh Juice":          "Pressed fresh.\nEvery time.",
};

const CATEGORY_DESCRIPTIONS = {
  "Starters":             "Light bites to start\nyour meal the right way.",
  "Salads":               "Fresh, healthy and full\nof flavour.",
  "Rice":                 "The heart of every\ngreat Nigerian table.",
  "Pasta":                "Wok-tossed or slow-sauced.\nBoth excellent.",
  "Bush Bar Kitchen":     "Pepper, fire and\ndeep Nigerian soul.",
  "Continental":          "European classics,\nprepared with precision.",
  "Sauces":               "Bold sauces to pair\nwith every plate.",
  "Charcoal Grills":      "Open flame, patient\nhands, serious flavour.",
  "National Dishes":      "Classic Nigerian plates,\nprepared with pride.",
  "Traditional Specials": "Heritage dishes from\nacross Nigeria.",
  "BLACKROCK EXPERIENCE": "Signature dishes exclusive\nto BLACKROCK.",
  "Wines":                "Reds, whites and rosés\ncurated for BLACKROCK.",
  "Spirits":              "Premium bottles from\naround the world.",
  "Beer & Cider":         "Local and imported\nbrews on ice.",
  "Cocktails":            "Bar-crafted cocktails\nmixed to order.",
  "Mocktails":            "Flavourful blends,\nperfectly balanced.",
  "Soft Drinks & Water":  "Chilled drinks and\nstill or sparkling water.",
  "Hot Drinks":           "Coffee, tea and\nwarm evening drinks.",
  "Fresh Juice":          "Cold-pressed juices,\nno added sugar.",
};

function fmtPrice(n) {
  return `₦${Number(n).toLocaleString("en-NG")}`;
}

const woAudio = { ctx: null };
function woUnlockAudio() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  if (!woAudio.ctx) woAudio.ctx = new Ctx();
  woAudio.ctx.resume();
}
function woPlayTones(list) {
  const ctx = woAudio.ctx;
  if (!ctx || ctx.state !== "running") return;
  try {
    list.forEach(({ freq, at, len, vol, type }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + at;
      osc.type = type || "sine";
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(vol, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + len);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + len + 0.05);
    });
  } catch {}
}
function woPlayReadyChime() {
  woPlayTones([
    { freq: 784, at: 0,    len: 0.5, vol: 0.28, type: "triangle" },
    { freq: 659, at: 0.22, len: 0.5, vol: 0.28, type: "triangle" },
    { freq: 523, at: 0.44, len: 0.6, vol: 0.28, type: "triangle" },
  ]);
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

const STATIC_CAT_REMAP = { "Noodles": "Pasta", "Pepper Soup & Specials": "Bush Bar Kitchen" };

function buildStaticFood() {
  const food = {};
  for (const [rawCat, dishes] of Object.entries(MENU)) {
    const cat = STATIC_CAT_REMAP[rawCat] || rawCat;
    food[cat] = dishes.map((d, idx) => ({
      id: `static-${slugify(cat)}-${idx}`,
      name: d.name,
      description: d.desc,
      price: parseInt((d.price || "0").replace(/[^\d]/g, ""), 10) || 0,
      category: cat,
      available: true,
    }));
  }
  return food;
}

export default function WaiterOrder({ waiterName, onSwitchWaiter }) {
  const [cart, setCart] = useState([]);
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState("");
  const [tableFlash, setTableFlash] = useState(false);
  const [menuType, setMenuType] = useState("food");
  const [foodData, setFoodData] = useState(null);
  const [activeTab, setActiveTab] = useState(FOOD_CATEGORY_ORDER[0]);
  const [dbCategoryImages, setDbCategoryImages] = useState({});
  const [soupModal, setSoupModal] = useState(null);
  const [traditionalModal, setTraditionalModal] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [doneOrder, setDoneOrder] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const sectionRefs = useRef({});
  const scrollingRef = useRef(false);
  const tabsRef = useRef(null);
  const [readyBanners, setReadyBanners] = useState([]);
  const mountedRef = useRef(true);
  const channelRef = useRef(null);
  const woConnectedRef = useRef(false);
  const notifiedReadyIdsRef = useRef(new Set());

  useEffect(() => {
    supabase.from("tables").select("*").eq("active", true).order("table_number", { ascending: true })
      .then(({ data }) => setTables(data || []));
  }, []);

  useEffect(() => {
    supabase.from("site_content").select("data").eq("section", "menu-category-images").maybeSingle()
      .then(({ data }) => { if (data?.data) setDbCategoryImages(data.data); });
  }, []);

  useEffect(() => {
    async function loadMenu() {
      try {
        const { data, error } = await supabase
          .from("menu_items").select("*").eq("available", true)
          .order("sort_order", { ascending: true, nullsFirst: false });
        const food = {};
        if (!error && data?.length > 0) {
          for (const item of data) {
            const rawCat = item.category || "Other";
            const cat = ALL_CATEGORY_ORDER.find(c => c.toLowerCase() === rawCat.toLowerCase()) || rawCat;
            if (!food[cat]) food[cat] = [];
            food[cat].push(item);
          }
        }
        if (Object.keys(food).length === 0) Object.assign(food, buildStaticFood());
        setFoodData(food);
        const first = ALL_CATEGORY_ORDER.find(c => food[c]?.length > 0);
        if (first) setActiveTab(first);
      } catch {
        setFoodData(buildStaticFood());
      }
    }
    loadMenu();
  }, []);

  const categories = useMemo(() => {
    const order = menuType === "food" ? FOOD_CATEGORY_ORDER : DRINK_CATEGORY_ORDER;
    return foodData ? order.filter(c => foodData[c]?.length > 0) : [];
  }, [menuType, foodData]);

  const switchMenuType = (type) => {
    setMenuType(type);
    const order = type === "food" ? FOOD_CATEGORY_ORDER : DRINK_CATEGORY_ORDER;
    if (foodData) {
      const first = order.find(c => foodData[c]?.length > 0);
      if (first) setActiveTab(first);
    }
    if (tabsRef.current) {
      const top = tabsRef.current.getBoundingClientRect().top + window.scrollY - HEADER_H;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  useEffect(() => {
    if (!foodData) return;
    const els = Object.values(sectionRefs.current).filter(Boolean);
    if (!els.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (scrollingRef.current) return;
        let best = null;
        for (const e of entries) {
          if (e.isIntersecting && (!best || e.boundingClientRect.top < best.boundingClientRect.top)) best = e;
        }
        if (best) setActiveTab(best.target.dataset.category);
      },
      { rootMargin: "-100px 0px -55% 0px", threshold: 0 }
    );
    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [foodData, categories]);

  const scrollToCategory = useCallback((cat) => {
    const el = sectionRefs.current[cat];
    if (!el) return;
    scrollingRef.current = true;
    setActiveTab(cat);
    const tabsBottom = tabsRef.current ? tabsRef.current.getBoundingClientRect().bottom : HEADER_H + 50;
    const top = el.getBoundingClientRect().top + window.scrollY - tabsBottom - 8;
    window.scrollTo({ top, behavior: "smooth" });
    setTimeout(() => { scrollingRef.current = false; }, 900);
  }, []);

  const subscribeReady = useCallback(() => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    const ch = supabase
      .channel(`waiter-ready-${Date.now()}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, (payload) => {
        if (!mountedRef.current) return;
        if (payload.new?.order_status !== "ready") return;
        const id = payload.new?.id;
        if (!id || notifiedReadyIdsRef.current.has(id)) return;
        notifiedReadyIdsRef.current.add(id);
        woPlayReadyChime();
        setReadyBanners(prev => [...prev, {
          id,
          tableNum: payload.new?.table_number,
          orderNum: payload.new?.order_number,
          placedBy: payload.new?.placed_by,
        }]);
        setTimeout(() => {
          if (!mountedRef.current) return;
          setReadyBanners(prev => prev.filter(b => b.id !== id));
        }, 10_000);
      })
      .subscribe((status) => { woConnectedRef.current = status === "SUBSCRIBED"; });
    channelRef.current = ch;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    mountedRef.current = true;
    subscribeReady();
    let misses = 0;
    const pollId = setInterval(() => {
      if (!mountedRef.current) return;
      if (!woConnectedRef.current) { misses++; if (misses % 4 === 0) subscribeReady(); }
      else misses = 0;
    }, 15_000);
    let last = Date.now();
    const driftId = setInterval(() => {
      const now = Date.now();
      if (now - last > 30_000 && !woConnectedRef.current) subscribeReady();
      last = now;
    }, 5_000);
    const onVisible = () => { if (document.visibilityState === "visible" && !woConnectedRef.current) subscribeReady(); };
    const onOnline = () => { if (!woConnectedRef.current) subscribeReady(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    return () => {
      mountedRef.current = false;
      clearInterval(pollId);
      clearInterval(driftId);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
      if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
    };
  }, [subscribeReady]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "TOKEN_REFRESHED") return;
      setTimeout(() => {
        if (!mountedRef.current) return;
        if (channelRef.current?.state !== "joined") subscribeReady();
      }, 2000);
    });
    return () => subscription.unsubscribe();
  }, [subscribeReady]);

  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  function addItem(item) {
    setCart(prev => {
      const ex = prev.find(i => i.id === item.id);
      if (ex) return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...item, qty: 1 }];
    });
  }

  function setQty(id, qty) {
    if (qty <= 0) setCart(prev => prev.filter(i => i.id !== id));
    else setCart(prev => prev.map(i => i.id === id ? { ...i, qty } : i));
  }

  const getCartItem = useCallback((id) => cart.find(i => i.id === id), [cart]);
  const getNationalCartItems = useCallback((id) => cart.filter(i => i.baseId === id), [cart]);

  function flashTable() {
    setTableFlash(true);
    setTimeout(() => setTableFlash(false), 1200);
  }

  async function placeOrder() {
    if (!selectedTable) { flashTable(); return; }
    setSubmitting(true);
    setSubmitError("");
    try {
      const tbl = tables.find(t => String(t.id) === String(selectedTable));
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderType: "dine-in",
          tableNumber: tbl?.table_number || selectedTable,
          orderSource: "waiter",
          placedBy: waiterName,
          guestName: `Table ${tbl?.table_number || selectedTable}`,
          guestPhone: "—",
          guestEmail: null,
          specialInstructions: null,
          scheduledTime: null,
          paymentMethod: "pay_on_arrival",
          items: cart.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty, menuType: i.menuType || "food" })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to place order.");
      setDoneOrder({ orderNumber: data.orderNumber, tableNumber: tbl?.table_number || selectedTable });
      setCart([]);
      setConfirmOpen(false);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const readyBannerUI = readyBanners.length === 0 ? null : (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 70, display: "flex", flexDirection: "column" }}>
      {readyBanners.map(b => (
        <div
          key={b.id}
          style={{ background: "#16a34a", color: "#fff", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, fontSize: 15, fontWeight: 700, fontFamily: "inherit", borderBottom: "1px solid rgba(0,0,0,0.12)", animation: "wo-ready-slide 0.25s ease" }}
        >
          <span>
            {b.tableNum ? `Table ${b.tableNum}` : b.orderNum ? `#${b.orderNum}` : "Order"} — Ready
            {b.placedBy ? ` · ${b.placedBy}` : ""}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); setReadyBanners(prev => prev.filter(x => x.id !== b.id)); }}
            style={{ background: "rgba(0,0,0,0.18)", border: "none", color: "#fff", borderRadius: 4, width: 26, height: 26, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );

  if (doneOrder) {
    return (
      <>
        {readyBannerUI}
        <WaiterDoneOverlay
          orderNumber={doneOrder.orderNumber}
          tableNumber={doneOrder.tableNumber}
          waiterName={waiterName}
          onNewOrder={() => { setDoneOrder(null); setSelectedTable(""); }}
          onSwitchWaiter={onSwitchWaiter}
        />
      </>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0f0d0a", color: "#F5F0E8" }} onClick={woUnlockAudio}>
      {readyBannerUI}
      <style>{`
        .wo-cat-body { display: grid; grid-template-columns: 300px 1fr; gap: 48px; align-items: start; }
        @media (max-width: 860px) { .wo-cat-body { grid-template-columns: 1fr; gap: 28px; } }
        .wo-tabs::-webkit-scrollbar { display: none; }
        .wo-tabs { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes wo-table-flash { 0%,100% { border-color: rgba(201,168,76,0.3); } 50% { border-color: #f59e0b; box-shadow: 0 0 0 2px rgba(245,158,11,0.22); } }
        .wo-table-flash { animation: wo-table-flash 0.4s ease 0s 3; }
        @keyframes wo-out-fwd  { from { transform: translateX(0); }     to { transform: translateX(-100%); } }
        @keyframes wo-out-bwd  { from { transform: translateX(0); }     to { transform: translateX(100%);  } }
        @keyframes wo-in-fwd   { from { transform: translateX(100%); }  to { transform: translateX(0); }    }
        @keyframes wo-in-bwd   { from { transform: translateX(-100%); } to { transform: translateX(0); }    }
        @keyframes wo-ready-slide { from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>

      {/* STICKY HEADER */}
      <div style={{
        position: "sticky", top: 0, zIndex: 60,
        background: "rgba(15,13,10,0.98)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
        borderBottom: "1px solid #2e2820", height: HEADER_H,
        display: "flex", alignItems: "center", gap: 14, padding: "0 20px",
      }}>
        {/* Brand + waiter name */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 }}>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 14, fontWeight: 700, letterSpacing: "2.5px", color: "#c8a96e", textTransform: "uppercase", lineHeight: 1 }}>BLACKROCK</span>
          <span style={{ fontSize: 10, color: "#9C8E7A", lineHeight: 1 }}>{waiterName}</span>
        </div>

        <div style={{ width: 1, height: 28, background: "#2e2820", flexShrink: 0 }} />

        {/* Food / Drinks toggle */}
        <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
          {["food", "drink"].map(type => (
            <button
              key={type}
              onClick={() => switchMenuType(type)}
              style={{
                padding: "5px 14px", borderRadius: 99, fontSize: 11, fontFamily: "inherit",
                border: menuType === type ? "1px solid #c8a96e" : "1px solid rgba(245,240,232,0.2)",
                background: menuType === type ? "#c8a96e" : "transparent",
                color: menuType === type ? "#0f0d0a" : "rgba(245,240,232,0.65)",
                fontWeight: menuType === type ? 700 : 500,
                textTransform: "uppercase", letterSpacing: "0.08em", cursor: "pointer",
              }}
            >
              {type === "food" ? "Food" : "Drinks"}
            </button>
          ))}
        </div>

        {/* Table dropdown */}
        <select
          value={selectedTable}
          onChange={e => setSelectedTable(e.target.value)}
          className={tableFlash ? "wo-table-flash" : ""}
          style={{
            background: "#1a1612",
            border: `1px solid ${tableFlash ? "#f59e0b" : selectedTable ? "#c8a96e" : "rgba(201,168,76,0.3)"}`,
            borderRadius: 7, padding: "6px 10px",
            color: selectedTable ? "#F5F0E8" : "#9C8E7A",
            fontSize: 12, fontWeight: selectedTable ? 600 : 400,
            cursor: "pointer", fontFamily: "inherit", outline: "none", minWidth: 130, flexShrink: 0,
          }}
        >
          <option value="">Select table…</option>
          {tables.map(t => (
            <option key={t.id} value={t.id}>Table {t.table_number}</option>
          ))}
        </select>

        <div style={{ flex: 1 }} />

        {/* Switch Waiter */}
        <button
          onClick={onSwitchWaiter}
          style={{ background: "transparent", border: "1px solid #2e2820", borderRadius: 6, padding: "6px 11px", color: "#9C8E7A", fontSize: 11, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.04em", flexShrink: 0 }}
        >
          Switch Waiter
        </button>

        {/* Cart badge */}
        {cartCount > 0 && (
          <button
            onClick={() => { setSubmitError(""); setConfirmOpen(true); }}
            style={{ display: "flex", alignItems: "center", gap: 7, background: "#c8a96e", borderRadius: 99, padding: "7px 14px", border: "none", cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}
          >
            <span style={{ background: "#0f0d0a", color: "#c8a96e", borderRadius: 99, fontSize: 10, fontWeight: 700, padding: "1px 7px" }}>{cartCount}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#0f0d0a" }}>Review — {fmtPrice(cartTotal)}</span>
          </button>
        )}
      </div>

      {/* CATEGORY TABS */}
      <div
        ref={tabsRef}
        className="wo-tabs"
        style={{ position: "sticky", top: HEADER_H, zIndex: 50, background: "rgba(15,13,10,0.97)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", borderBottom: "1px solid rgba(255,255,255,0.07)", overflowX: "auto" }}
      >
        <div style={{ display: "flex", gap: 6, padding: "10px 24px", maxWidth: 1200, margin: "0 auto", whiteSpace: "nowrap" }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => scrollToCategory(cat)}
              style={{
                flexShrink: 0, padding: "7px 16px", borderRadius: 99, fontSize: 12,
                fontWeight: activeTab === cat ? 700 : 500,
                border: `1px solid ${activeTab === cat ? "#C9A84C" : "rgba(255,255,255,0.12)"}`,
                background: activeTab === cat ? "#C9A84C" : "transparent",
                color: activeTab === cat ? "#0f0d0a" : "rgba(245,240,232,0.65)",
                cursor: "pointer", transition: "all 0.15s", fontFamily: "inherit",
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* MENU SECTIONS */}
      {foodData === null ? (
        <div style={{ textAlign: "center", color: "#9C8E7A", padding: "80px 24px" }}>Loading menu…</div>
      ) : (
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 160px" }}>
          {categories.map(cat => {
            const dishes = foodData[cat] || [];
            return (
              <section
                key={`${menuType}-${cat}`}
                ref={el => { sectionRefs.current[cat] = el; }}
                data-category={cat}
                style={{ padding: "60px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 36 }}>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "#C9A84C", margin: "0 0 8px" }}>{cat}</p>
                    <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "clamp(32px, 3.8vw, 52px)", fontWeight: 600, color: "#F5F0E8", margin: "0 0 14px", lineHeight: 1 }}>{cat}</h2>
                    <div style={{ width: 44, height: 2, background: "#C9A84C", borderRadius: 2 }} />
                  </div>
                  <p style={{ fontSize: 13, color: "#9C8E7A", textAlign: "right", lineHeight: 1.65, maxWidth: 190, margin: 0, paddingTop: 6, whiteSpace: "pre-line", flexShrink: 0 }}>
                    {CATEGORY_DESCRIPTIONS[cat] || ""}
                  </p>
                </div>

                <div className="wo-cat-body">
                  <div>
                    <div style={{ width: "100%", height: LIST_H, overflow: "hidden", borderRadius: 3, background: "#1a1612" }}>
                      <img
                        src={dbCategoryImages[cat] || CATEGORY_IMAGES[cat] || "/images/menu/starters.jpg"}
                        alt={cat}
                        loading="lazy"
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    </div>
                    <div style={{ marginTop: 16 }}>
                      <div style={{ width: 28, height: 1.5, background: "#C9A84C", marginBottom: 10 }} />
                      <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#C9A84C", margin: 0, lineHeight: 1.9, whiteSpace: "pre-line" }}>
                        {CATEGORY_TAGLINES[cat] || ""}
                      </p>
                    </div>
                  </div>

                  <WoPaginatedDishList
                    dishes={dishes}
                    renderDish={(dish, idx, chunk) => {
                      const isNational    = cat === "National Dishes";
                      const isTraditional = cat === "Traditional Specials";
                      const needsPicker   = isNational || isTraditional;
                      const cartItem      = needsPicker ? null : getCartItem(dish.id);
                      const natItems      = needsPicker ? getNationalCartItems(dish.id) : null;
                      const natQty        = natItems ? natItems.reduce((s, i) => s + i.qty, 0) : 0;
                      return (
                        <div
                          key={dish.id}
                          style={{
                            display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20,
                            padding: "20px 0",
                            borderTop: "1px solid rgba(255,255,255,0.08)",
                            borderBottom: idx === chunk.length - 1 ? "1px solid rgba(255,255,255,0.08)" : "none",
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 17, fontWeight: 600, color: "#F5F0E8", margin: "0 0 5px", lineHeight: 1.3 }}>{dish.name}</h3>
                            {dish.description && <p style={{ fontSize: 13, color: "#9C8E7A", margin: 0, lineHeight: 1.6 }}>{dish.description}</p>}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
                            <span style={{ fontSize: 15, fontWeight: 700, color: "#C9A84C", whiteSpace: "nowrap" }}>{fmtPrice(dish.price)}</span>
                            {needsPicker ? (
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                                <WoCircleAddBtn onClick={() => isNational ? setSoupModal(dish) : setTraditionalModal(dish)} />
                                {natQty > 0 && <span style={{ fontSize: 10, color: "#C9A84C", fontWeight: 700, lineHeight: 1 }}>{natQty}</span>}
                              </div>
                            ) : cartItem ? (
                              <WoQtyControl
                                qty={cartItem.qty}
                                onDec={() => setQty(dish.id, cartItem.qty - 1)}
                                onInc={() => setQty(dish.id, cartItem.qty + 1)}
                              />
                            ) : (
                              <WoCircleAddBtn onClick={() => addItem({ id: dish.id, name: dish.name, price: dish.price, category: dish.category, menuType: menuType === "drink" ? "drink" : "food", description: dish.description })} />
                            )}
                          </div>
                        </div>
                      );
                    }}
                  />
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* CONFIRM OVERLAY */}
      {confirmOpen && (
        <WaiterConfirmOverlay
          cart={cart}
          cartTotal={cartTotal}
          tables={tables}
          selectedTable={selectedTable}
          setSelectedTable={setSelectedTable}
          tableFlash={tableFlash}
          submitting={submitting}
          submitError={submitError}
          waiterName={waiterName}
          onClose={() => setConfirmOpen(false)}
          onPlaceOrder={placeOrder}
        />
      )}

      {/* SOUP / SWALLOW MODALS */}
      {soupModal && (
        <WaiterPickerModal
          dish={soupModal}
          showSoup
          onClose={() => setSoupModal(null)}
          onConfirm={(soup, swallow) => {
            addItem({ id: `${soupModal.id}|${soup}|${swallow}`, baseId: soupModal.id, name: soupModal.name, price: soupModal.price, category: soupModal.category, menuType: "food", soup, swallow });
            setSoupModal(null);
          }}
        />
      )}
      {traditionalModal && (
        <WaiterPickerModal
          dish={traditionalModal}
          showSoup={false}
          onClose={() => setTraditionalModal(null)}
          onConfirm={(_soup, swallow) => {
            addItem({ id: `${traditionalModal.id}|${swallow}`, baseId: traditionalModal.id, name: traditionalModal.name, price: traditionalModal.price, category: traditionalModal.category, menuType: "food", swallow });
            setTraditionalModal(null);
          }}
        />
      )}
    </div>
  );
}

/* ── Paginated dish list ────────────────────────────────────────────── */
function WoPaginatedDishList({ dishes, renderDish }) {
  const [page, setPage] = useState(0);
  const [slide, setSlide] = useState(null);
  const totalPages = Math.ceil(dishes.length / PER_PAGE);
  const chunk = (p) => dishes.slice(p * PER_PAGE, (p + 1) * PER_PAGE);

  useEffect(() => { setPage(0); setSlide(null); }, [dishes]);

  if (totalPages <= 1) {
    return (
      <div style={{ overflow: "hidden", height: LIST_H }}>
        {chunk(0).map((dish, idx, arr) => renderDish(dish, idx, arr))}
      </div>
    );
  }

  const displayPage = slide ? slide.to : page;
  const go = (newPage) => {
    if (slide !== null || newPage === displayPage || newPage < 0 || newPage >= totalPages) return;
    const dir = newPage > displayPage ? 1 : -1;
    setSlide({ from: page, to: newPage, dir });
    setTimeout(() => { setPage(newPage); setSlide(null); }, 380);
  };

  const outAnim = slide ? (slide.dir === 1 ? "wo-out-fwd" : "wo-out-bwd") : undefined;
  const inAnim  = slide ? (slide.dir === 1 ? "wo-in-fwd"  : "wo-in-bwd")  : undefined;
  const DUR = "0.36s cubic-bezier(0.4,0,0.2,1) forwards";
  const outChunk = chunk(page);
  const inChunk  = slide ? chunk(slide.to) : null;

  return (
    <div>
      <div style={{ position: "relative", overflow: "hidden", height: LIST_H }}>
        <div style={{ position: "absolute", inset: 0, animation: outAnim ? `${outAnim} ${DUR}` : "none" }}>
          {outChunk.map((dish, idx) => renderDish(dish, idx, outChunk))}
        </div>
        {slide && inChunk && (
          <div style={{ position: "absolute", inset: 0, animation: `${inAnim} ${DUR}` }}>
            {inChunk.map((dish, idx) => renderDish(dish, idx, inChunk))}
          </div>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
        <WoPageArrow dir="back" disabled={displayPage === 0} onClick={() => go(displayPage - 1)} />
        <span style={{ fontSize: 11, color: "#9C8E7A", fontFamily: "'Manrope', sans-serif", letterSpacing: "0.12em", minWidth: 36, textAlign: "center" }}>
          {displayPage + 1} / {totalPages}
        </span>
        <WoPageArrow dir="fwd" disabled={displayPage === totalPages - 1} onClick={() => go(displayPage + 1)} />
      </div>
    </div>
  );
}

function WoPageArrow({ dir, disabled, onClick }) {
  return (
    <button
      onClick={onClick} disabled={disabled}
      style={{ width: 34, height: 34, borderRadius: "50%", border: `1.5px solid ${disabled ? "rgba(201,168,76,0.18)" : "rgba(201,168,76,0.65)"}`, background: "transparent", color: disabled ? "rgba(201,168,76,0.25)" : "#C9A84C", display: "flex", alignItems: "center", justifyContent: "center", cursor: disabled ? "default" : "pointer", transition: "background 0.15s, color 0.15s", flexShrink: 0 }}
      onMouseEnter={e => { if (!disabled) { e.currentTarget.style.background = "#C9A84C"; e.currentTarget.style.color = "#0f0d0a"; } }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = disabled ? "rgba(201,168,76,0.25)" : "#C9A84C"; }}
    >
      {dir === "back" ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
    </button>
  );
}

function WoCircleAddBtn({ onClick }) {
  return (
    <button
      onClick={onClick}
      style={{ width: 34, height: 34, borderRadius: "50%", border: "1.5px solid rgba(201,168,76,0.65)", background: "transparent", color: "#C9A84C", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, transition: "background 0.15s, color 0.15s" }}
      onMouseEnter={e => { e.currentTarget.style.background = "#C9A84C"; e.currentTarget.style.color = "#0f0d0a"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#C9A84C"; }}
    >
      <Plus size={16} />
    </button>
  );
}

function WoQtyControl({ qty, onDec, onInc }) {
  const btn = { width: 30, height: 30, border: "none", background: "#2a2118", color: "#F5F0E8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4 };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <button onClick={onDec} style={btn}><Minus size={13} /></button>
      <span style={{ width: 26, textAlign: "center", fontSize: 14, fontWeight: 700, color: "#F5F0E8" }}>{qty}</span>
      <button onClick={onInc} style={btn}><Plus size={13} /></button>
    </div>
  );
}

/* ── Soup/swallow picker modal ──────────────────────────────────────── */
function WaiterPickerModal({ dish, showSoup = true, onClose, onConfirm }) {
  const [soup, setSoup] = useState("");
  const [swallow, setSwallow] = useState("");
  const ready = (!showSoup || soup) && swallow;

  const chip = (active) => ({
    padding: "8px 16px", borderRadius: 99, fontSize: 13, fontWeight: 500, cursor: "pointer",
    background: active ? "#c8a96e" : "transparent", color: active ? "#0f0d0a" : "#9C8E7A",
    border: `1px solid ${active ? "#c8a96e" : "#3e3426"}`, transition: "all 0.15s", fontFamily: "inherit",
  });

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.75)", padding: 16 }}>
      <div style={{ background: "#1a1612", border: "1px solid #3e3426", borderRadius: 12, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 16px", borderBottom: "1px solid #2e2820" }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "#c8a96e" }}>Choose sides</p>
            <h3 style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 700, color: "#F5F0E8", fontFamily: "'Cormorant Garamond', serif" }}>{dish.name}</h3>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9C8E7A", display: "flex" }}><X size={20} /></button>
        </div>
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 24 }}>
          {showSoup && (
            <div>
              <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#F5F0E8" }}>Soup <span style={{ color: "#ef4444" }}>*</span></p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {SOUPS.map(s => <button key={s} onClick={() => setSoup(s)} style={chip(soup === s)}>{s}</button>)}
              </div>
            </div>
          )}
          <div>
            <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#F5F0E8" }}>Swallow <span style={{ color: "#ef4444" }}>*</span></p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {SWALLOWS.map(sw => <button key={sw} onClick={() => setSwallow(sw)} style={chip(swallow === sw)}>{sw}</button>)}
            </div>
          </div>
          {!ready && <p style={{ margin: 0, fontSize: 12, color: "#9C8E7A" }}>{showSoup ? "Select a soup and swallow to continue." : "Select a swallow to continue."}</p>}
        </div>
        <div style={{ padding: "16px 24px", borderTop: "1px solid #2e2820", display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "12px", borderRadius: 6, border: "1px solid #3e3426", background: "transparent", color: "#9C8E7A", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          <button
            onClick={() => ready && onConfirm(soup, swallow)}
            disabled={!ready}
            style={{ flex: 2, padding: "12px", borderRadius: 6, border: "none", background: ready ? "#c8a96e" : "#2e2820", color: ready ? "#0f0d0a" : "#5a4e46", fontSize: 13, fontWeight: 700, cursor: ready ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, letterSpacing: "0.05em", textTransform: "uppercase", fontFamily: "inherit" }}
          >
            <Check size={14} /> Add to Order
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Confirm overlay ────────────────────────────────────────────────── */
function WaiterConfirmOverlay({ cart, cartTotal, tables, selectedTable, setSelectedTable, tableFlash, submitting, submitError, waiterName, onClose, onPlaceOrder }) {
  const selectedTableObj = tables.find(t => String(t.id) === String(selectedTable));

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.82)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0 0 0 0" }}>
      <div style={{ background: "#1a1612", border: "1px solid #2e2820", borderRadius: "16px 16px 0 0", width: "100%", maxWidth: 600, maxHeight: "90vh", overflowY: "auto", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 16px", borderBottom: "1px solid #2e2820", flexShrink: 0 }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "#c8a96e" }}>BLACKROCK · {waiterName}</p>
            <h3 style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 700, color: "#F5F0E8", fontFamily: "'Cormorant Garamond', serif" }}>Confirm with Guest</h3>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9C8E7A", display: "flex" }}><X size={20} /></button>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
          {/* Table selector (required) */}
          <div>
            <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#F5F0E8" }}>
              Table <span style={{ color: "#ef4444" }}>*</span>
            </p>
            <select
              value={selectedTable}
              onChange={e => setSelectedTable(e.target.value)}
              className={tableFlash ? "wo-table-flash" : ""}
              style={{
                background: "#251f19",
                border: `1px solid ${tableFlash ? "#f59e0b" : selectedTable ? "#c8a96e" : "rgba(201,168,76,0.3)"}`,
                borderRadius: 7, padding: "10px 14px", color: selectedTable ? "#F5F0E8" : "#9C8E7A",
                fontSize: 14, fontWeight: selectedTable ? 600 : 400,
                cursor: "pointer", fontFamily: "inherit", outline: "none", width: "100%",
              }}
            >
              <option value="">Select a table to place this order…</option>
              {tables.map(t => <option key={t.id} value={t.id}>Table {t.table_number}</option>)}
            </select>
            {!selectedTable && tableFlash && (
              <p style={{ margin: "6px 0 0", fontSize: 12, color: "#f59e0b" }}>Please select a table before placing the order.</p>
            )}
          </div>

          {/* Order items */}
          <div style={{ background: "#13110e", border: "1px solid #2e2820", borderRadius: 10, overflow: "hidden" }}>
            {cart.map((item, idx) => (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "13px 18px", borderBottom: idx < cart.length - 1 ? "1px solid #1e1a16" : "none", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "#F5F0E8" }}>{item.name}</div>
                  {(item.soup || item.swallow) && (
                    <div style={{ fontSize: 11, color: "#9C8E7A", marginTop: 2 }}>
                      {[item.soup, item.swallow].filter(Boolean).join(" · ")}
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: "#9C8E7A", marginTop: 2 }}>{fmtPrice(item.price)} × {item.qty}</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#F5F0E8", flexShrink: 0 }}>{fmtPrice(item.price * item.qty)}</div>
              </div>
            ))}
            <div style={{ padding: "13px 18px", borderTop: "1px solid #2e2820", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#F5F0E8" }}>Total</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#c8a96e" }}>{fmtPrice(cartTotal)}</span>
            </div>
          </div>

          {/* Pay at table note */}
          <div style={{ background: "rgba(200,169,110,0.07)", border: "1px solid rgba(200,169,110,0.18)", borderRadius: 8, padding: "11px 15px" }}>
            <p style={{ margin: 0, fontSize: 13, color: "#c8a96e", lineHeight: 1.5 }}><strong>Pay at Table.</strong> Guest pays when they're ready to leave.</p>
          </div>

          {/* Submit error */}
          {submitError && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "11px 15px" }}>
              <AlertCircle size={15} style={{ color: "#ef4444", flexShrink: 0, marginTop: 1 }} />
              <p style={{ margin: 0, fontSize: 13, color: "#ef4444" }}>{submitError}</p>
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid #2e2820", display: "flex", gap: 12, flexShrink: 0 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: "13px", borderRadius: 7, border: "1px solid #2e2820", background: "transparent", color: "#9C8E7A", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
          >
            Edit Order
          </button>
          <button
            onClick={onPlaceOrder}
            disabled={submitting}
            style={{ flex: 2, padding: "13px", borderRadius: 7, border: "none", background: submitting ? "#2e2820" : "#7a1c1c", color: submitting ? "#5a4e46" : "#F5F0E8", fontSize: 13, fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer", fontFamily: "inherit", letterSpacing: "0.02em" }}
          >
            {submitting ? "Placing Order…" : "Place Order →"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Done overlay ───────────────────────────────────────────────────── */
function WaiterDoneOverlay({ orderNumber, tableNumber, waiterName, onNewOrder, onSwitchWaiter }) {
  return (
    <div style={{ minHeight: "100vh", background: "#0f0d0a", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'DM Sans', 'Montserrat', sans-serif" }}>
      <div style={{ maxWidth: 400, width: "100%", textAlign: "center" }}>
        <div style={{ width: 68, height: 68, borderRadius: "50%", background: "rgba(34,197,94,0.1)", border: "2px solid #22c55e", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
          <Check size={30} style={{ color: "#22c55e" }} />
        </div>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 30, fontWeight: 700, color: "#F5F0E8", margin: "0 0 8px" }}>Order Placed!</h2>
        <p style={{ fontSize: 15, color: "#F5F0E8", fontWeight: 600, margin: "0 0 4px" }}>{orderNumber}</p>
        <p style={{ fontSize: 13, color: "#9C8E7A", margin: "0 0 6px" }}>Table {tableNumber} · Sent to kitchen</p>
        <p style={{ fontSize: 12, color: "#9C8E7A", margin: "0 0 36px" }}>Waiter: {waiterName}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <button
            onClick={onNewOrder}
            style={{ width: "100%", padding: "14px", borderRadius: 8, border: "none", background: "#c8a96e", color: "#0f0d0a", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
          >
            Take Another Order
          </button>
          <button
            onClick={onSwitchWaiter}
            style={{ width: "100%", padding: "13px", borderRadius: 8, border: "1px solid #2e2820", background: "transparent", color: "#9C8E7A", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
          >
            Switch Waiter
          </button>
        </div>
      </div>
    </div>
  );
}
