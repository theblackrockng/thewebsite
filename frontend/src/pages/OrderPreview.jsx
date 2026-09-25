import { useState, useEffect, useRef, useCallback } from "react";
import {
  ShoppingBag, Clock, Package, MessageCircle,
  Plus, Minus, ChevronUp, X, Check, ArrowRight,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { MENU } from "../lib/data";
import { useCart } from "../context/CartContext";
import SEO from "../components/SEO";

const FOOD_CATEGORY_ORDER = [
  "Starters", "Salads", "Rice", "Pasta",
  "Bush Bar Kitchen", "Continental", "Sauces",
  "Charcoal Grills", "National Dishes", "Traditional Specials",
];

const SOUPS = [
  "Efo Riro", "Edika-Ikong", "Egusi", "Mixed Okro",
  "Fisherman Soup", "Seafood", "Banga", "Ofe Nsala", "Miyan Kuka", "Ewedu",
];

const SWALLOWS = ["Pounded Yam", "Eba", "Amala", "Fufu", "Wheat", "Semo"];

const CATEGORY_IMAGES = {
  "Starters":           "/images/menu/starters.jpg",
  "Salads":             "/images/menu/salads.jpg",
  "Rice":               "/images/menu/rice.jpg",
  "Pasta":              "/images/menu/noodles.jpg",
  "Bush Bar Kitchen":   "/images/menu/pepper-soup.jpg",
  "Continental":        "/images/menu/continental.jpg",
  "Sauces":             "/images/menu/sauces.jpg",
  "Charcoal Grills":    "/images/menu/grills.jpg",
  "National Dishes":    "/images/menu/national.jpg",
  "Traditional Specials": "/images/menu/traditional.jpg",
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
};

function fmtPrice(n) {
  return `₦${Number(n).toLocaleString("en-NG")}`;
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

const circleBtn = {
  width: 34,
  height: 34,
  borderRadius: "50%",
  border: "1.5px solid rgba(201,168,76,0.65)",
  background: "transparent",
  color: "#C9A84C",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  flexShrink: 0,
};

const qtyBtnStyle = {
  width: 30,
  height: 30,
  border: "none",
  background: "#2e2820",
  color: "#F5F0E8",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 4,
};

export default function OrderPreview() {
  const { items: cartItems, addItem, setQty, totalItems, subtotal, setDrawerOpen } = useCart();
  const [foodData, setFoodData] = useState(null);
  const [activeTab, setActiveTab] = useState(FOOD_CATEGORY_ORDER[0]);
  const [soupModal, setSoupModal] = useState(null);
  const [traditionalModal, setTraditionalModal] = useState(null);

  const sectionRefs = useRef({});
  const scrollingRef = useRef(false);
  const tabsRef = useRef(null);

  useEffect(() => {
    async function loadMenu() {
      try {
        const { data, error } = await supabase
          .from("menu_items")
          .select("*")
          .eq("available", true)
          .order("sort_order", { ascending: true, nullsFirst: false });

        const food = {};
        if (!error && data?.length > 0) {
          for (const item of data) {
            const type = item.menu_type ?? "food";
            if (type !== "food") continue;
            const cat = item.category || "Other";
            if (!food[cat]) food[cat] = [];
            food[cat].push(item);
          }
        }

        if (Object.keys(food).length === 0) {
          for (const [cat, dishes] of Object.entries(MENU)) {
            food[cat] = dishes.map((d, idx) => ({
              id: `static-${slugify(cat)}-${idx}`,
              name: d.name,
              description: d.desc,
              price: parseInt((d.price || "0").replace(/[₦,]/g, ""), 10) || 0,
              category: cat,
              available: true,
            }));
          }
        }

        setFoodData(food);
        const fCats = FOOD_CATEGORY_ORDER.filter(c => food[c]?.length > 0);
        if (fCats[0]) setActiveTab(fCats[0]);
      } catch {
        const food = {};
        for (const [cat, dishes] of Object.entries(MENU)) {
          food[cat] = dishes.map((d, idx) => ({
            id: `static-${slugify(cat)}-${idx}`,
            name: d.name,
            description: d.desc,
            price: parseInt((d.price || "0").replace(/[₦,]/g, ""), 10) || 0,
            category: cat,
            available: true,
          }));
        }
        setFoodData(food);
      }
    }
    loadMenu();
  }, []);

  const categories = foodData
    ? FOOD_CATEGORY_ORDER.filter(c => foodData[c]?.length > 0)
    : [];

  useEffect(() => {
    if (!foodData) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (scrollingRef.current) return;
        let topEntry = null;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (!topEntry || entry.boundingClientRect.top < topEntry.boundingClientRect.top) {
              topEntry = entry;
            }
          }
        }
        if (topEntry) setActiveTab(topEntry.target.dataset.category);
      },
      { rootMargin: "-120px 0px -60% 0px", threshold: 0 }
    );
    Object.values(sectionRefs.current).forEach(el => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [foodData]);

  const scrollToCategory = useCallback((cat) => {
    const el = sectionRefs.current[cat];
    if (!el) return;
    scrollingRef.current = true;
    setActiveTab(cat);
    const navHeight = 80;
    const tabHeight = 56;
    const top = el.getBoundingClientRect().top + window.scrollY - navHeight - tabHeight - 8;
    window.scrollTo({ top, behavior: "smooth" });
    setTimeout(() => { scrollingRef.current = false; }, 800);
  }, []);

  const getCartItem = useCallback((id) => cartItems.find(i => i.id === id), [cartItems]);
  const getNationalCartItems = useCallback((id) => cartItems.filter(i => i.baseId === id), [cartItems]);

  const handleStartOrdering = () => {
    if (tabsRef.current) {
      const top = tabsRef.current.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0f0d0a", color: "#F5F0E8" }}>
      <SEO title="Order Online | BLACKROCK" canonical="/order-preview" />
      <style>{`
        .op-hero { display: grid; grid-template-columns: 1fr 1fr; min-height: 520px; }
        .op-hero-text { padding: 130px 56px 80px 40px; }
        .op-hero-img { display: block; }
        .op-cat-grid { display: grid; grid-template-columns: 300px 1fr; gap: 48px; align-items: start; }
        .op-info-icons { display: flex; gap: 28px; flex-wrap: wrap; margin-bottom: 40px; }
        @media (max-width: 900px) {
          .op-hero { grid-template-columns: 1fr; }
          .op-hero-img { display: none; }
          .op-hero-text { padding: 110px 24px 56px !important; max-width: 100% !important; }
          .op-cat-grid { grid-template-columns: 1fr; gap: 32px; }
        }
        @media (max-width: 480px) {
          .op-info-icons { gap: 16px; }
        }
      `}</style>

      {/* HERO */}
      <section className="op-hero" style={{ background: "#0f0d0a", overflow: "hidden", position: "relative" }}>
        <div className="op-hero-text" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "#C9A84C", margin: "0 0 18px" }}>
            Online Ordering
          </p>
          <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "clamp(36px, 4.2vw, 62px)", fontWeight: 700, color: "#F5F0E8", lineHeight: 1.08, margin: "0 0 18px" }}>
            Your favourite<br />dishes, prepared<br />fresh.
          </h1>
          <p style={{ fontSize: 15, color: "#9C8E7A", margin: "0 0 36px", lineHeight: 1.65 }}>
            Pickup or delivery, from our kitchen to you.
          </p>

          <div className="op-info-icons">
            {[
              { Icon: Clock,         top: "Ready in",  bot: "25 - 35 mins" },
              { Icon: Package,       top: "Pickup or", bot: "Delivery"      },
              { Icon: MessageCircle, top: "Order on",  bot: "WhatsApp"      },
            ].map(({ Icon, top, bot }) => (
              <div key={top} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", border: "1.5px solid rgba(201,168,76,0.45)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={16} style={{ color: "#C9A84C" }} />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#9C8E7A", lineHeight: 1.4 }}>{top}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#F5F0E8", lineHeight: 1.4 }}>{bot}</div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleStartOrdering}
            style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "13px 26px", border: "1.5px solid #C9A84C", borderRadius: 6, background: "transparent", color: "#C9A84C", fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer", width: "fit-content", fontFamily: "'Montserrat', sans-serif" }}
            onMouseEnter={e => { e.currentTarget.style.background = "#C9A84C"; e.currentTarget.style.color = "#0f0d0a"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#C9A84C"; }}
          >
            Start Ordering <ArrowRight size={14} />
          </button>
        </div>

        <div className="op-hero-img" style={{ position: "relative", overflow: "hidden" }}>
          <img
            src="/images/menu/grills.jpg"
            alt="BLACKROCK signature dishes"
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", display: "block" }}
          />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, #0f0d0a 0%, rgba(15,13,10,0.15) 45%, transparent 100%)" }} />
        </div>
      </section>

      {/* CATEGORY TABS */}
      <div
        ref={tabsRef}
        style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(15,13,10,0.97)", backdropFilter: "blur(10px)", borderBottom: "1px solid rgba(255,255,255,0.07)", overflowX: "auto", scrollbarWidth: "none" }}
      >
        <div style={{ display: "flex", gap: 6, padding: "12px 24px", maxWidth: 1200, margin: "0 auto", whiteSpace: "nowrap" }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => scrollToCategory(cat)}
              style={{
                flexShrink: 0, padding: "8px 20px", borderRadius: 99, fontSize: 13,
                fontWeight: activeTab === cat ? 700 : 500,
                border: `1px solid ${activeTab === cat ? "#C9A84C" : "rgba(255,255,255,0.12)"}`,
                background: activeTab === cat ? "#C9A84C" : "transparent",
                color: activeTab === cat ? "#0f0d0a" : "rgba(245,240,232,0.65)",
                cursor: "pointer", transition: "all 0.15s", fontFamily: "'Montserrat', sans-serif",
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* MENU SECTIONS */}
      {foodData === null ? (
        <div style={{ textAlign: "center", color: "#9C8E7A", padding: "80px 0" }}>Loading menu...</div>
      ) : (
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 160px" }}>
          {categories.map(cat => (
            <section
              key={cat}
              ref={el => { sectionRefs.current[cat] = el; }}
              data-category={cat}
              style={{ padding: "64px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
            >
              {/* Section header */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 36 }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "#C9A84C", margin: "0 0 8px" }}>
                    {cat}
                  </p>
                  <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "clamp(34px, 4vw, 54px)", fontWeight: 600, color: "#F5F0E8", margin: "0 0 14px", lineHeight: 1 }}>
                    {cat}
                  </h2>
                  <div style={{ width: 44, height: 2, background: "#C9A84C", borderRadius: 2 }} />
                </div>
                <p style={{ fontSize: 13, color: "#9C8E7A", textAlign: "right", lineHeight: 1.65, maxWidth: 180, margin: 0, paddingTop: 6, whiteSpace: "pre-line", flexShrink: 0 }}>
                  {CATEGORY_DESCRIPTIONS[cat] || ""}
                </p>
              </div>

              {/* Image left + items right */}
              <div className="op-cat-grid">
                {/* Left: image + tagline */}
                <div>
                  <div style={{ width: "100%", aspectRatio: "4/5", overflow: "hidden", borderRadius: 4, background: "#1a1612" }}>
                    <img
                      src={CATEGORY_IMAGES[cat] || "/images/menu/starters.jpg"}
                      alt={cat}
                      loading="lazy"
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  </div>
                  <div style={{ marginTop: 18, paddingLeft: 2 }}>
                    <div style={{ width: 28, height: 1.5, background: "#C9A84C", marginBottom: 10 }} />
                    <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#C9A84C", margin: 0, lineHeight: 1.9, whiteSpace: "pre-line" }}>
                      {CATEGORY_TAGLINES[cat] || ""}
                    </p>
                  </div>
                </div>

                {/* Right: item rows */}
                <div>
                  {(foodData[cat] || []).map((dish, idx) => {
                    const isNational = cat === "National Dishes";
                    const isTraditional = cat === "Traditional Specials";
                    const needsPicker = isNational || isTraditional;
                    const cartItem = needsPicker ? null : getCartItem(dish.id);
                    const nationalItems = needsPicker ? getNationalCartItems(dish.id) : null;
                    const nationalQty = nationalItems ? nationalItems.reduce((s, i) => s + i.qty, 0) : 0;

                    return (
                      <div
                        key={dish.id}
                        style={{
                          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
                          gap: 16, padding: "20px 0",
                          borderTop: idx === 0 ? "1px solid rgba(255,255,255,0.08)" : "none",
                          borderBottom: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 17, fontWeight: 600, color: "#F5F0E8", margin: "0 0 5px", lineHeight: 1.3 }}>
                            {dish.name}
                          </h3>
                          {dish.description && (
                            <p style={{ fontSize: 13, color: "#9C8E7A", margin: 0, lineHeight: 1.6, maxWidth: 380 }}>
                              {dish.description}
                            </p>
                          )}
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
                          <span style={{ fontSize: 15, fontWeight: 700, color: "#C9A84C", whiteSpace: "nowrap" }}>
                            {fmtPrice(dish.price)}
                          </span>

                          {needsPicker ? (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                              <button
                                onClick={() => isNational ? setSoupModal(dish) : setTraditionalModal(dish)}
                                style={circleBtn}
                              >
                                <Plus size={16} />
                              </button>
                              {nationalQty > 0 && (
                                <span style={{ fontSize: 10, color: "#C9A84C", fontWeight: 700 }}>{nationalQty}</span>
                              )}
                            </div>
                          ) : cartItem ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                              <button onClick={() => setQty(dish.id, cartItem.qty - 1)} style={qtyBtnStyle}><Minus size={13} /></button>
                              <span style={{ width: 28, textAlign: "center", fontSize: 14, fontWeight: 700, color: "#F5F0E8" }}>{cartItem.qty}</span>
                              <button onClick={() => setQty(dish.id, cartItem.qty + 1)} style={qtyBtnStyle}><Plus size={13} /></button>
                            </div>
                          ) : (
                            <button
                              onClick={() => addItem({ id: dish.id, name: dish.name, price: dish.price, category: dish.category, menuType: "food", description: dish.description })}
                              style={circleBtn}
                            >
                              <Plus size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          ))}
        </div>
      )}

      {/* SOUP + SWALLOW MODAL */}
      {soupModal && (
        <SoupSwallowModal
          dish={soupModal}
          onClose={() => setSoupModal(null)}
          onConfirm={(soup, swallow) => {
            addItem({ id: `${soupModal.id}|${soup}|${swallow}`, baseId: soupModal.id, name: soupModal.name, price: soupModal.price, category: soupModal.category, menuType: "food", soup, swallow });
            setSoupModal(null);
          }}
        />
      )}
      {traditionalModal && (
        <SoupSwallowModal
          dish={traditionalModal}
          showSoup={false}
          onClose={() => setTraditionalModal(null)}
          onConfirm={(_soup, swallow) => {
            addItem({ id: `${traditionalModal.id}|${swallow}`, baseId: traditionalModal.id, name: traditionalModal.name, price: traditionalModal.price, category: traditionalModal.category, menuType: "food", swallow });
            setTraditionalModal(null);
          }}
        />
      )}

      {/* STICKY CART BAR */}
      {totalItems > 0 && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100, background: "#181410", borderTop: "1px solid rgba(201,168,76,0.18)", padding: "14px 24px", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <ShoppingBag size={24} style={{ color: "#C9A84C" }} />
            <span style={{ position: "absolute", top: -8, right: -8, background: "#C9A84C", color: "#0f0d0a", fontSize: 10, fontWeight: 700, borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {totalItems}
            </span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: "#9C8E7A" }}>{totalItems} item{totalItems !== 1 ? "s" : ""}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#F5F0E8", lineHeight: 1.2 }}>{fmtPrice(subtotal)}</div>
          </div>
          <ChevronUp size={18} style={{ color: "#9C8E7A", flexShrink: 0 }} />
          <button
            onClick={() => setDrawerOpen(true)}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 22px", background: "#C9A84C", border: "none", borderRadius: 6, color: "#0f0d0a", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", flexShrink: 0, fontFamily: "'Montserrat', sans-serif" }}
          >
            View Order <ArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

function SoupSwallowModal({ dish, onClose, onConfirm, showSoup = true }) {
  const [soup, setSoup] = useState("");
  const [swallow, setSwallow] = useState("");
  const canConfirm = (!showSoup || soup) && swallow;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.75)", padding: 16 }}>
      <div style={{ background: "#1a1612", border: "1px solid #3e3426", borderRadius: 12, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 16px", borderBottom: "1px solid #2e2820" }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "#c8a96e" }}>Choose your sides</p>
            <h3 style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 700, color: "#F5F0E8", fontFamily: "'Cormorant Garamond', serif" }}>{dish.name}</h3>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9C8E7A", display: "flex" }}><X size={20} /></button>
        </div>
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 24 }}>
          {showSoup && (
            <div>
              <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#F5F0E8" }}>
                Soup <span style={{ color: "#ef4444" }}>*</span>
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {SOUPS.map(s => (
                  <button key={s} onClick={() => setSoup(s)} style={{ padding: "8px 16px", borderRadius: 99, fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "all 0.15s", background: soup === s ? "#c8a96e" : "transparent", color: soup === s ? "#0f0d0a" : "#9C8E7A", border: `1px solid ${soup === s ? "#c8a96e" : "#3e3426"}` }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#F5F0E8" }}>
              Swallow <span style={{ color: "#ef4444" }}>*</span>
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {SWALLOWS.map(sw => (
                <button key={sw} onClick={() => setSwallow(sw)} style={{ padding: "8px 16px", borderRadius: 99, fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "all 0.15s", background: swallow === sw ? "#c8a96e" : "transparent", color: swallow === sw ? "#0f0d0a" : "#9C8E7A", border: `1px solid ${swallow === sw ? "#c8a96e" : "#3e3426"}` }}>
                  {sw}
                </button>
              ))}
            </div>
          </div>
          {!canConfirm && (
            <p style={{ margin: 0, fontSize: 12, color: "#9C8E7A" }}>
              {showSoup ? "Please select both a soup and swallow to continue." : "Please select a swallow to continue."}
            </p>
          )}
        </div>
        <div style={{ padding: "16px 24px", borderTop: "1px solid #2e2820", display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "12px", borderRadius: 6, border: "1px solid #3e3426", background: "transparent", color: "#9C8E7A", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
          <button
            onClick={() => canConfirm && onConfirm(soup, swallow)}
            disabled={!canConfirm}
            style={{ flex: 2, padding: "12px", borderRadius: 6, border: "none", background: canConfirm ? "#c8a96e" : "#2e2820", color: canConfirm ? "#0f0d0a" : "#5a4e46", fontSize: 13, fontWeight: 700, cursor: canConfirm ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, letterSpacing: "0.05em", textTransform: "uppercase" }}
          >
            <Check size={14} /> Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}
