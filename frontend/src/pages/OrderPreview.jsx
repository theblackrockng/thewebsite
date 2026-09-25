import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  ShoppingBag, Clock, Package, MessageCircle,
  Plus, Minus, ChevronUp, ChevronLeft, ChevronRight,
  X, Check,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { MENU } from "../lib/data";
import { useCart } from "../context/CartContext";
import SEO from "../components/SEO";

const PER_PAGE = 5;
const LIST_H   = 440; // fixed px — both image col and list clip zone

const FOOD_CATEGORY_ORDER = [
  "Starters", "Salads", "Rice", "Pasta",
  "Bush Bar Kitchen", "Continental", "Sauces",
  "Charcoal Grills", "National Dishes", "Traditional Specials",
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

export default function OrderPreview() {
  const { items: cartItems, addItem, setQty, totalItems, subtotal, setDrawerOpen } = useCart();
  const [menuType, setMenuType] = useState("food"); // "food" | "drink"
  const [foodData, setFoodData] = useState(null);
  const [activeTab, setActiveTab] = useState(FOOD_CATEGORY_ORDER[0]);
  const [soupModal, setSoupModal] = useState(null);
  const [traditionalModal, setTraditionalModal] = useState(null);
  const [dbCategoryImages, setDbCategoryImages] = useState({});

  const sectionRefs = useRef({});
  const scrollingRef = useRef(false);
  const tabsRef = useRef(null);

  useEffect(() => {
    supabase
      .from("site_content")
      .select("data")
      .eq("section", "menu-category-images")
      .maybeSingle()
      .then(({ data }) => { if (data?.data) setDbCategoryImages(data.data); });
  }, []);

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
            const cat = item.category || "Other";
            if (!food[cat]) food[cat] = [];
            food[cat].push(item);
          }
        }

        if (Object.keys(food).length === 0) {
          Object.assign(food, buildStaticFood());
        }

        setFoodData(food);
        const available = FOOD_CATEGORY_ORDER.filter(c => food[c]?.length > 0);
        if (available[0]) setActiveTab(available[0]);
      } catch {
        setFoodData(buildStaticFood());
      }
    }
    loadMenu();
  }, []);

  // Active categories depend on current toggle state
  const categories = useMemo(() => {
    const order = menuType === "food" ? FOOD_CATEGORY_ORDER : DRINK_CATEGORY_ORDER;
    return foodData ? order.filter(c => foodData[c]?.length > 0) : [];
  }, [menuType, foodData]);

  // When switching menu type, jump active tab to first available category
  const switchMenuType = (type) => {
    setMenuType(type);
    const order = type === "food" ? FOOD_CATEGORY_ORDER : DRINK_CATEGORY_ORDER;
    if (foodData) {
      const first = order.find(c => foodData[c]?.length > 0);
      if (first) setActiveTab(first);
    }
    const navH = window.innerWidth >= 1024 ? 144 : window.innerWidth >= 768 ? 112 : 80;
    window.scrollTo({ top: tabsRef.current ? tabsRef.current.getBoundingClientRect().top + window.scrollY - navH : 0, behavior: "smooth" });
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
          if (e.isIntersecting) {
            if (!best || e.boundingClientRect.top < best.boundingClientRect.top) best = e;
          }
        }
        if (best) setActiveTab(best.target.dataset.category);
      },
      { rootMargin: "-100px 0px -55% 0px", threshold: 0 }
    );
    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [foodData, categories]); // re-observe when categories list changes

  const scrollToCategory = useCallback((cat) => {
    const el = sectionRefs.current[cat];
    if (!el) return;
    scrollingRef.current = true;
    setActiveTab(cat);
    const tabsBottom = tabsRef.current ? tabsRef.current.getBoundingClientRect().bottom : 142;
    const top = el.getBoundingClientRect().top + window.scrollY - tabsBottom - 8;
    window.scrollTo({ top, behavior: "smooth" });
    setTimeout(() => { scrollingRef.current = false; }, 900);
  }, []);

  const getCartItem = useCallback((id) => cartItems.find(i => i.id === id), [cartItems]);
  const getNationalCartItems = useCallback((id) => cartItems.filter(i => i.baseId === id), [cartItems]);

  return (
    <div style={{ minHeight: "100vh", background: "#0f0d0a", color: "#F5F0E8" }}>
      <SEO title="Order Online | BLACKROCK" canonical="/order-preview" />
      <style>{`
        /* Hero: explicit height so image cannot push the section taller than the text column */
        .op-hero {
          display: grid;
          grid-template-columns: 55% 45%;
          height: 580px;
          background: #0f0d0a;
          overflow: hidden;
        }
        .op-hero-content {
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 0 52px 0 40px;
          overflow: hidden;
        }
        .op-hero-img { display: block; position: relative; overflow: hidden; }

        .op-cat-body {
          display: grid;
          grid-template-columns: 300px 1fr;
          gap: 48px;
          align-items: start;
        }

        @media (max-width: 860px) {
          .op-hero { grid-template-columns: 1fr; height: auto; min-height: 420px; }
          .op-hero-img { display: none; }
          .op-hero-content { padding: 110px 24px 56px; }
          .op-cat-body { grid-template-columns: 1fr; gap: 28px; }
        }

        .op-tabs::-webkit-scrollbar { display: none; }
        .op-tabs { -ms-overflow-style: none; scrollbar-width: none; }

        /* Sits directly below the main navbar at every breakpoint.
           Navbar heights: h-20 (80px) / md:h-28 (112px) / lg:h-36 (144px).
           z-index 40 keeps it below the navbar's z-50. */
        .op-tabs-sticky {
          position: sticky;
          top: 80px;
          z-index: 40;
        }
        @media (min-width: 768px)  { .op-tabs-sticky { top: 112px; } }
        @media (min-width: 1024px) { .op-tabs-sticky { top: 144px; } }

        @keyframes op-out-fwd  { from { transform: translateX(0); }     to { transform: translateX(-100%); } }
        @keyframes op-out-bwd  { from { transform: translateX(0); }     to { transform: translateX(100%);  } }
        @keyframes op-in-fwd   { from { transform: translateX(100%); }  to { transform: translateX(0); }    }
        @keyframes op-in-bwd   { from { transform: translateX(-100%); } to { transform: translateX(0); }    }
      `}</style>

      {/* HERO */}
      <section className="op-hero">
        <div className="op-hero-content">
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "#C9A84C", margin: "0 0 16px" }}>
            Online Ordering
          </p>
          <h1 style={{ fontFamily: "'Poppins', sans-serif", fontSize: "clamp(26px, 3vw, 44px)", fontWeight: 700, color: "#F5F0E8", lineHeight: 1.3, margin: "0 0 36px" }}>
            Your favourite dishes.<br />
            <span style={{ paddingLeft: "1.5em" }}>Prepared fresh.</span>
          </h1>
          <p style={{ fontSize: 15, color: "#9C8E7A", margin: "0 0 34px", lineHeight: 1.65 }}>
            Pickup or delivery. Fresh from our kitchen to you
          </p>

          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 36 }}>
            {[
              { Icon: Clock,         line1: "Ready in",  line2: "25 - 35 mins" },
              { Icon: Package,       line1: "Pickup or", line2: "Delivery"      },
              { Icon: MessageCircle, line1: "Order on",  line2: "WhatsApp"      },
            ].map(({ Icon, line1, line2 }) => (
              <div key={line1} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", border: "1.5px solid rgba(201,168,76,0.45)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={16} style={{ color: "#C9A84C" }} />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#9C8E7A", lineHeight: 1.35 }}>{line1}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#F5F0E8", lineHeight: 1.35 }}>{line2}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            {["food", "drink"].map(type => (
              <button
                key={type}
                onClick={() => switchMenuType(type)}
                style={{
                  padding: "10px 24px", borderRadius: 99, fontSize: 12,
                  fontWeight: menuType === type ? 700 : 500,
                  border: `1.5px solid ${menuType === type ? "#C9A84C" : "rgba(255,255,255,0.22)"}`,
                  background: menuType === type ? "#C9A84C" : "transparent",
                  color: menuType === type ? "#0f0d0a" : "rgba(245,240,232,0.6)",
                  cursor: "pointer", transition: "all 0.15s",
                  fontFamily: "'Montserrat', sans-serif",
                  letterSpacing: "0.12em", textTransform: "uppercase",
                }}
              >
                {type === "food" ? "Food" : "Drinks"}
              </button>
            ))}
          </div>
        </div>

        <div className="op-hero-img">
          <img
            src="/food/creamy-herb-soup.png"
            alt="BLACKROCK kitchen"
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", display: "block" }}
            fetchpriority="high"
          />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, #0f0d0a 0%, rgba(15,13,10,0.55) 40%, rgba(15,13,10,0.08) 100%)", pointerEvents: "none" }} />
        </div>
      </section>

      {/* FOOD / DRINKS TOGGLE + CATEGORY TABS */}
      <div
        ref={tabsRef}
        className="op-tabs op-tabs-sticky"
        style={{ background: "rgba(15,13,10,0.97)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", borderBottom: "1px solid rgba(255,255,255,0.07)", overflowX: "auto" }}
      >
        <div style={{ display: "flex", gap: 6, padding: "10px 24px", maxWidth: 1200, margin: "0 auto", whiteSpace: "nowrap", alignItems: "center" }}>
          {/* Category tabs — filtered by hero toggle */}
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => scrollToCategory(cat)}
              style={{
                flexShrink: 0, padding: "8px 18px", borderRadius: 99, fontSize: 13,
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
        <div style={{ textAlign: "center", color: "#9C8E7A", padding: "80px 24px" }}>Loading menu...</div>
      ) : (
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 180px" }}>
          {categories.map(cat => {
            const dishes = foodData[cat] || [];
            return (
              <section
                key={`${menuType}-${cat}`}
                ref={el => { sectionRefs.current[cat] = el; }}
                data-category={cat}
                style={{ padding: "60px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
              >
                {/* Section header */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 36 }}>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "#C9A84C", margin: "0 0 8px" }}>
                      {cat}
                    </p>
                    <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "clamp(32px, 3.8vw, 52px)", fontWeight: 600, color: "#F5F0E8", margin: "0 0 14px", lineHeight: 1 }}>
                      {cat}
                    </h2>
                    <div style={{ width: 44, height: 2, background: "#C9A84C", borderRadius: 2 }} />
                  </div>
                  <p style={{ fontSize: 13, color: "#9C8E7A", textAlign: "right", lineHeight: 1.65, maxWidth: 190, margin: 0, paddingTop: 6, whiteSpace: "pre-line", flexShrink: 0 }}>
                    {CATEGORY_DESCRIPTIONS[cat] || ""}
                  </p>
                </div>

                {/* Image left | paginated list right */}
                <div className="op-cat-body">

                  {/* LEFT: fixed-height category image */}
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
                      <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#C9A84C", margin: 0, lineHeight: 1.9, whiteSpace: "pre-line" }}>
                        {CATEGORY_TAGLINES[cat] || ""}
                      </p>
                    </div>
                  </div>

                  {/* RIGHT: paginated dish list */}
                  <PaginatedDishList
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
                            display: "flex",
                            alignItems: "flex-start",
                            justifyContent: "space-between",
                            gap: 20,
                            padding: "20px 0",
                            borderTop: "1px solid rgba(255,255,255,0.08)",
                            borderBottom: idx === chunk.length - 1 ? "1px solid rgba(255,255,255,0.08)" : "none",
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 17, fontWeight: 600, color: "#F5F0E8", margin: "0 0 5px", lineHeight: 1.3 }}>
                              {dish.name}
                            </h3>
                            {dish.description && (
                              <p style={{ fontSize: 13, color: "#9C8E7A", margin: 0, lineHeight: 1.6 }}>
                                {dish.description}
                              </p>
                            )}
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
                            <span style={{ fontSize: 15, fontWeight: 700, color: "#C9A84C", whiteSpace: "nowrap" }}>
                              {fmtPrice(dish.price)}
                            </span>

                            {needsPicker ? (
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                                <CircleAddBtn onClick={() => isNational ? setSoupModal(dish) : setTraditionalModal(dish)} />
                                {natQty > 0 && (
                                  <span style={{ fontSize: 10, color: "#C9A84C", fontWeight: 700, lineHeight: 1 }}>{natQty}</span>
                                )}
                              </div>
                            ) : cartItem ? (
                              <QtyControl
                                qty={cartItem.qty}
                                onDec={() => setQty(dish.id, cartItem.qty - 1)}
                                onInc={() => setQty(dish.id, cartItem.qty + 1)}
                              />
                            ) : (
                              <CircleAddBtn onClick={() => addItem({ id: dish.id, name: dish.name, price: dish.price, category: dish.category, menuType: menuType === "drink" ? "drink" : "food", description: dish.description })} />
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

      {/* MODALS */}
      {soupModal && (
        <PickerModal
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
        <PickerModal
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
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100, background: "#181410", borderTop: "1px solid rgba(201,168,76,0.18)", padding: "14px 24px", display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <ShoppingBag size={26} style={{ color: "#C9A84C" }} />
            <span style={{ position: "absolute", top: -8, right: -8, background: "#C9A84C", color: "#0f0d0a", fontSize: 10, fontWeight: 700, borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {totalItems}
            </span>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: "#9C8E7A", lineHeight: 1.2 }}>
              {totalItems} item{totalItems !== 1 ? "s" : ""}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#F5F0E8", lineHeight: 1.2 }}>
              {fmtPrice(subtotal)}
            </div>
          </div>

          <ChevronUp size={18} style={{ color: "#9C8E7A", flexShrink: 0 }} />

          <button
            onClick={() => setDrawerOpen(true)}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "13px 22px", background: "#C9A84C", border: "none", borderRadius: 6, color: "#0f0d0a", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", flexShrink: 0, fontFamily: "'Montserrat', sans-serif" }}
          >
            View Order <ArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

function PaginatedDishList({ dishes, renderDish }) {
  const [page, setPage] = useState(0);
  const [slide, setSlide] = useState(null); // { from, to, dir: 1|-1 }
  const totalPages = Math.ceil(dishes.length / PER_PAGE);

  const chunk = (p) => dishes.slice(p * PER_PAGE, (p + 1) * PER_PAGE);

  // Reset to page 0 whenever the dishes list changes (category switch)
  useEffect(() => {
    setPage(0);
    setSlide(null);
  }, [dishes]);

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
    setTimeout(() => {
      setPage(newPage);
      setSlide(null);
    }, 380);
  };

  const outAnim = slide ? (slide.dir === 1 ? "op-out-fwd" : "op-out-bwd") : undefined;
  const inAnim  = slide ? (slide.dir === 1 ? "op-in-fwd"  : "op-in-bwd")  : undefined;
  const DUR = "0.36s cubic-bezier(0.4,0,0.2,1) forwards";

  const outChunk = chunk(page);
  const inChunk  = slide ? chunk(slide.to) : null;

  return (
    <div>
      <div style={{ position: "relative", overflow: "hidden", height: LIST_H }}>
        <div
          style={{
            position: "absolute", inset: 0,
            animation: outAnim ? `${outAnim} ${DUR}` : "none",
          }}
        >
          {outChunk.map((dish, idx) => renderDish(dish, idx, outChunk))}
        </div>

        {slide && inChunk && (
          <div style={{ position: "absolute", inset: 0, animation: `${inAnim} ${DUR}` }}>
            {inChunk.map((dish, idx) => renderDish(dish, idx, inChunk))}
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
        <PageArrow dir="back" disabled={displayPage === 0} onClick={() => go(displayPage - 1)} />
        <span style={{ fontSize: 11, color: "#9C8E7A", fontFamily: "'Montserrat', sans-serif", letterSpacing: "0.12em", minWidth: 36, textAlign: "center" }}>
          {displayPage + 1} / {totalPages}
        </span>
        <PageArrow dir="fwd" disabled={displayPage === totalPages - 1} onClick={() => go(displayPage + 1)} />
      </div>
    </div>
  );
}

function PageArrow({ dir, disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 34, height: 34, borderRadius: "50%",
        border: `1.5px solid ${disabled ? "rgba(201,168,76,0.18)" : "rgba(201,168,76,0.65)"}`,
        background: "transparent",
        color: disabled ? "rgba(201,168,76,0.25)" : "#C9A84C",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: disabled ? "default" : "pointer",
        transition: "background 0.15s, color 0.15s",
        flexShrink: 0,
      }}
      onMouseEnter={e => {
        if (!disabled) { e.currentTarget.style.background = "#C9A84C"; e.currentTarget.style.color = "#0f0d0a"; }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = disabled ? "rgba(201,168,76,0.25)" : "#C9A84C";
      }}
    >
      {dir === "back" ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
    </button>
  );
}

function CircleAddBtn({ onClick }) {
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

function QtyControl({ qty, onDec, onInc }) {
  const btn = { width: 30, height: 30, border: "none", background: "#2a2118", color: "#F5F0E8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4 };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <button onClick={onDec} style={btn}><Minus size={13} /></button>
      <span style={{ width: 26, textAlign: "center", fontSize: 14, fontWeight: 700, color: "#F5F0E8" }}>{qty}</span>
      <button onClick={onInc} style={btn}><Plus size={13} /></button>
    </div>
  );
}

function PickerModal({ dish, showSoup = true, onClose, onConfirm }) {
  const [soup, setSoup] = useState("");
  const [swallow, setSwallow] = useState("");
  const ready = (!showSoup || soup) && swallow;

  const chip = (active) => ({
    padding: "8px 16px", borderRadius: 99, fontSize: 13, fontWeight: 500, cursor: "pointer",
    background: active ? "#c8a96e" : "transparent",
    color: active ? "#0f0d0a" : "#9C8E7A",
    border: `1px solid ${active ? "#c8a96e" : "#3e3426"}`,
    transition: "all 0.15s",
  });

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
                  <button key={s} onClick={() => setSoup(s)} style={chip(soup === s)}>{s}</button>
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
                <button key={sw} onClick={() => setSwallow(sw)} style={chip(swallow === sw)}>{sw}</button>
              ))}
            </div>
          </div>
          {!ready && (
            <p style={{ margin: 0, fontSize: 12, color: "#9C8E7A" }}>
              {showSoup ? "Select a soup and swallow to continue." : "Select a swallow to continue."}
            </p>
          )}
        </div>

        <div style={{ padding: "16px 24px", borderTop: "1px solid #2e2820", display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "12px", borderRadius: 6, border: "1px solid #3e3426", background: "transparent", color: "#9C8E7A", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
          <button
            onClick={() => ready && onConfirm(soup, swallow)}
            disabled={!ready}
            style={{ flex: 2, padding: "12px", borderRadius: 6, border: "none", background: ready ? "#c8a96e" : "#2e2820", color: ready ? "#0f0d0a" : "#5a4e46", fontSize: 13, fontWeight: 700, cursor: ready ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, letterSpacing: "0.05em", textTransform: "uppercase" }}
          >
            <Check size={14} /> Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}
