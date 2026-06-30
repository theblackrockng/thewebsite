import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Minus, ShoppingBag } from "lucide-react";
import { supabase } from "../lib/supabase";
import { MENU } from "../lib/data";
import { useCart } from "../context/CartContext";

const CATEGORY_ORDER = [
  "Starters",
  "Salads",
  "Rice",
  "Noodles",
  "Pepper Soup & Specials",
  "Continental",
  "Sauces",
  "Charcoal Grills",
  "National Dishes",
  "Traditional Specials",
];

function fmtPrice(n) {
  return `₦${Number(n).toLocaleString("en-NG")}`;
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export default function Order() {
  const navigate = useNavigate();
  const { items: cartItems, addItem, setQty, totalItems, subtotal, setDrawerOpen } = useCart();
  const [menuData, setMenuData] = useState(null);
  const [activeCategory, setActiveCategory] = useState(CATEGORY_ORDER[0]);
  const sectionRefs = useRef({});
  const scrollingProgrammatically = useRef(false);
  const tabsRef = useRef(null);

  useEffect(() => {
    async function fetchMenu() {
      try {
        const { data, error } = await supabase
          .from("menu_items")
          .select("*")
          .eq("is_available", true)
          .order("category")
          .order("sort_order", { ascending: true, nullsFirst: false });

        if (error || !data || data.length === 0) {
          // Fallback to static MENU data
          const converted = {};
          for (const [cat, dishes] of Object.entries(MENU)) {
            converted[cat] = dishes.map((d, idx) => ({
              id: `static-${slugify(cat)}-${idx}`,
              name: d.name,
              description: d.desc,
              price: parseInt((d.price || "0").replace(/[₦,]/g, ""), 10) || 0,
              category: cat,
              is_available: true,
            }));
          }
          setMenuData(converted);
        } else {
          // Group by category
          const grouped = {};
          for (const item of data) {
            const cat = item.category || "Other";
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(item);
          }
          setMenuData(grouped);
        }
      } catch {
        // Fallback
        const converted = {};
        for (const [cat, dishes] of Object.entries(MENU)) {
          converted[cat] = dishes.map((d, idx) => ({
            id: `static-${slugify(cat)}-${idx}`,
            name: d.name,
            description: d.desc,
            price: parseInt((d.price || "0").replace(/[₦,]/g, ""), 10) || 0,
            category: cat,
            is_available: true,
          }));
        }
        setMenuData(converted);
      }
    }
    fetchMenu();
  }, []);

  // Observe sections for active tab
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (scrollingProgrammatically.current) return;
        let topEntry = null;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (!topEntry || entry.boundingClientRect.top < topEntry.boundingClientRect.top) {
              topEntry = entry;
            }
          }
        }
        if (topEntry) {
          setActiveCategory(topEntry.target.dataset.category);
        }
      },
      { rootMargin: "-120px 0px -60% 0px", threshold: 0 }
    );

    const refs = sectionRefs.current;
    Object.values(refs).forEach((el) => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [menuData]);

  const scrollToCategory = useCallback((cat) => {
    const el = sectionRefs.current[cat];
    if (!el) return;
    scrollingProgrammatically.current = true;
    setActiveCategory(cat);
    const navHeight = 140;
    const tabHeight = 56;
    const top = el.getBoundingClientRect().top + window.scrollY - navHeight - tabHeight - 8;
    window.scrollTo({ top, behavior: "smooth" });
    setTimeout(() => { scrollingProgrammatically.current = false; }, 800);
  }, []);

  const getCartItem = useCallback((id) => cartItems.find((i) => i.id === id), [cartItems]);

  const categories = menuData
    ? CATEGORY_ORDER.filter((c) => menuData[c] && menuData[c].length > 0)
    : [];

  return (
    <div style={{ minHeight: "100vh", background: "var(--charcoal, #0f0d0a)" }}>
      {/* Hero */}
      <section
        style={{
          position: "relative",
          paddingTop: 160,
          paddingBottom: 80,
          textAlign: "center",
          background: "linear-gradient(180deg, #1a1612 0%, var(--charcoal, #0f0d0a) 100%)",
        }}
      >
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 24px" }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: "var(--gold, #C9A84C)",
              marginBottom: 16,
            }}
          >
            Online Ordering
          </p>
          <h1
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: "clamp(40px, 6vw, 68px)",
              fontWeight: 700,
              color: "var(--warm-white, #F5F0E8)",
              lineHeight: 1.1,
              margin: "0 0 20px",
            }}
          >
            Order Online
          </h1>
          <p style={{ fontSize: 16, color: "var(--muted, #9C8E7A)", lineHeight: 1.7, margin: 0 }}>
            Pickup or delivery — fresh from our kitchen to you.
          </p>
        </div>
      </section>

      {/* Sticky category tabs */}
      <div
        ref={tabsRef}
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(15,13,10,0.96)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--border-soft, #2e2820)",
          overflowX: "auto",
          scrollbarWidth: "none",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 4,
            padding: "12px 24px",
            maxWidth: 1200,
            margin: "0 auto",
          }}
        >
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => scrollToCategory(cat)}
              style={{
                flexShrink: 0,
                padding: "7px 16px",
                borderRadius: 99,
                fontSize: 12,
                fontWeight: 600,
                border: `1px solid ${activeCategory === cat ? "var(--gold, #C9A84C)" : "var(--border-soft, #2e2820)"}`,
                background: activeCategory === cat ? "var(--gold, #C9A84C)" : "transparent",
                color: activeCategory === cat ? "#0f0d0a" : "var(--muted, #9C8E7A)",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s",
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Menu sections */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px 140px" }}>
        {menuData === null && (
          <div style={{ textAlign: "center", color: "var(--muted, #9C8E7A)", padding: "80px 0" }}>
            Loading menu…
          </div>
        )}

        {menuData &&
          categories.map((cat) => (
            <section
              key={cat}
              ref={(el) => { sectionRefs.current[cat] = el; }}
              data-category={cat}
              style={{ marginBottom: 56 }}
            >
              {/* Category header */}
              <div style={{ marginBottom: 24 }}>
                <h2
                  style={{
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                    fontSize: "clamp(24px, 3vw, 32px)",
                    fontWeight: 700,
                    color: "var(--warm-white, #F5F0E8)",
                    margin: "0 0 8px",
                  }}
                >
                  {cat}
                </h2>
                <div
                  style={{
                    height: 2,
                    width: 48,
                    background: "var(--gold, #C9A84C)",
                    borderRadius: 2,
                  }}
                />
              </div>

              {/* Dish grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: 16,
                }}
              >
                {menuData[cat].map((dish) => (
                  <DishCard
                    key={dish.id}
                    dish={dish}
                    cartItem={getCartItem(dish.id)}
                    onAdd={() =>
                      addItem({
                        id: dish.id,
                        name: dish.name,
                        price: dish.price,
                        category: dish.category,
                        description: dish.description,
                      })
                    }
                    onSetQty={(q) => setQty(dish.id, q)}
                  />
                ))}
              </div>
            </section>
          ))}
      </div>

      {/* Floating cart bar */}
      {totalItems > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 100,
            background: "var(--gold, #C9A84C)",
            borderRadius: 99,
            padding: "14px 24px",
            display: "flex",
            alignItems: "center",
            gap: 16,
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
          onClick={() => setDrawerOpen(true)}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ShoppingBag size={18} style={{ color: "#0f0d0a" }} />
            <span
              style={{
                background: "#0f0d0a",
                color: "var(--gold, #C9A84C)",
                borderRadius: 99,
                fontSize: 11,
                fontWeight: 700,
                padding: "2px 7px",
              }}
            >
              {totalItems}
            </span>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#0f0d0a", letterSpacing: "0.03em" }}>
            View Cart — {fmtPrice(subtotal)}
          </span>
        </div>
      )}
    </div>
  );
}

function DishCard({ dish, cartItem, onAdd, onSetQty }) {
  return (
    <div
      style={{
        background: "#1a1612",
        border: "1px solid var(--border-soft, #2e2820)",
        borderRadius: 10,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        transition: "border-color 0.15s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#3e3426"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-soft, #2e2820)"; }}
    >
      <div style={{ flex: 1 }}>
        <h3
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: "var(--warm-white, #F5F0E8)",
            margin: "0 0 6px",
            lineHeight: 1.3,
          }}
        >
          {dish.name}
        </h3>
        {dish.description && (
          <p
            style={{
              fontSize: 12.5,
              color: "var(--muted, #9C8E7A)",
              margin: "0 0 12px",
              lineHeight: 1.6,
            }}
          >
            {dish.description}
          </p>
        )}
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: "var(--gold, #C9A84C)",
          }}
        >
          {fmtPrice(dish.price)}
        </div>
      </div>

      {/* Add / Stepper */}
      {cartItem ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, color: "var(--muted, #9C8E7A)", fontWeight: 500 }}>In cart</span>
          <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
            <button
              onClick={() => onSetQty(cartItem.qty - 1)}
              aria-label="Decrease"
              style={{
                width: 32,
                height: 32,
                background: "#2e2820",
                border: "none",
                borderRadius: "6px 0 0 6px",
                color: "var(--warm-white, #F5F0E8)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Minus size={14} />
            </button>
            <span
              style={{
                width: 36,
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#251f19",
                color: "var(--warm-white, #F5F0E8)",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {cartItem.qty}
            </span>
            <button
              onClick={() => onSetQty(cartItem.qty + 1)}
              aria-label="Increase"
              style={{
                width: 32,
                height: 32,
                background: "#2e2820",
                border: "none",
                borderRadius: "0 6px 6px 0",
                color: "var(--warm-white, #F5F0E8)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={onAdd}
          style={{
            width: "100%",
            background: "transparent",
            border: "1px solid var(--gold, #C9A84C)",
            color: "var(--gold, #C9A84C)",
            borderRadius: 6,
            padding: "10px 16px",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--gold, #C9A84C)";
            e.currentTarget.style.color = "#0f0d0a";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--gold, #C9A84C)";
          }}
        >
          <Plus size={14} />
          Add to Cart
        </button>
      )}
    </div>
  );
}
