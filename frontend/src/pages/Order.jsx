import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Minus, ShoppingBag, X, Check, UtensilsCrossed, ChefHat } from "lucide-react";
import { supabase } from "../lib/supabase";
import { MENU } from "../lib/data";
import { useCart } from "../context/CartContext";
import { useTable } from "../context/TableContext";

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

const DRINK_CATEGORY_ORDER = [
  "Beer & Cider", "Cocktails", "Mocktails",
  "Soft Drinks & Water", "Hot Drinks", "Fresh Juice",
  "Spirits", "Wines",
];

function fmtPrice(n) {
  return `₦${Number(n).toLocaleString("en-NG")}`;
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export default function Order() {
  const { items: cartItems, addItem, setQty, clearCart, totalItems, subtotal, setDrawerOpen } = useCart();
  const { tableNumber, tableValid, setTable } = useTable();
  const [searchParams] = useSearchParams();

  const [foodData, setFoodData] = useState(null);
  const [drinkData, setDrinkData] = useState(null);
  const [menuType, setMenuType] = useState("food");
  const [activeFoodCat, setActiveFoodCat] = useState(FOOD_CATEGORY_ORDER[0]);
  const [activeDrinkCat, setActiveDrinkCat] = useState(DRINK_CATEGORY_ORDER[0]);
  const [soupModal, setSoupModal] = useState(null); // dish object when open
  const [traditionalModal, setTraditionalModal] = useState(null); // swallow-only picker

  const [placing, setPlacing] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState(null);
  const [placeError, setPlaceError] = useState("");

  const foodSectionRefs = useRef({});
  const drinkSectionRefs = useRef({});
  const scrollingProgrammatically = useRef(false);
  const tabsRef = useRef(null);

  // Validate table query param once on mount
  useEffect(() => {
    const tableParam = searchParams.get("table");
    if (!tableParam) return;
    const n = parseInt(tableParam, 10);
    if (isNaN(n)) return;
    if (tableValid && tableNumber === n) return; // already validated this session
    supabase
      .from("tables")
      .select("id, table_number, active")
      .eq("table_number", n)
      .eq("active", true)
      .maybeSingle()
      .then(({ data }) => { if (data) setTable(data.table_number); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    async function fetchMenu() {
      try {
        const { data, error } = await supabase
          .from("menu_items")
          .select("*")
          .eq("available", true)
          .order("sort_order", { ascending: true, nullsFirst: false });

        const food = {};
        const drinks = {};

        if (!error && data && data.length > 0) {
          for (const item of data) {
            const type = item.menu_type ?? "food";
            const cat = item.category || "Other";
            if (type === "drink") {
              if (!drinks[cat]) drinks[cat] = [];
              drinks[cat].push(item);
            } else {
              if (!food[cat]) food[cat] = [];
              food[cat].push(item);
            }
          }
        }

        // Food fallback to static data if Supabase returned nothing
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
        setDrinkData(drinks);

        const fCats = FOOD_CATEGORY_ORDER.filter((c) => food[c]?.length > 0);
        const dCats = DRINK_CATEGORY_ORDER.filter((c) => drinks[c]?.length > 0);
        if (fCats[0]) setActiveFoodCat(fCats[0]);
        if (dCats[0]) setActiveDrinkCat(dCats[0]);
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
        setDrinkData({});
      }
    }
    fetchMenu();
  }, []);

  // Derived values for active menu type
  const activeCategory = menuType === "food" ? activeFoodCat : activeDrinkCat;
  const currentData = menuType === "food" ? foodData : drinkData;
  const categoryOrder = menuType === "food" ? FOOD_CATEGORY_ORDER : DRINK_CATEGORY_ORDER;
  const categories = currentData
    ? categoryOrder.filter((c) => currentData[c] && currentData[c].length > 0)
    : [];

  // Re-run observer whenever menu type or data changes
  useEffect(() => {
    const refs = menuType === "food" ? foodSectionRefs.current : drinkSectionRefs.current;
    const setActive = menuType === "food" ? setActiveFoodCat : setActiveDrinkCat;

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
        if (topEntry) setActive(topEntry.target.dataset.category);
      },
      { rootMargin: "-120px 0px -60% 0px", threshold: 0 }
    );

    Object.values(refs).forEach((el) => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [foodData, drinkData, menuType]);

  const scrollToCategory = useCallback((cat) => {
    const refs = menuType === "food" ? foodSectionRefs.current : drinkSectionRefs.current;
    const el = refs[cat];
    if (!el) return;
    scrollingProgrammatically.current = true;
    if (menuType === "food") setActiveFoodCat(cat);
    else setActiveDrinkCat(cat);
    const navHeight = 140;
    const tabHeight = 56;
    const top = el.getBoundingClientRect().top + window.scrollY - navHeight - tabHeight - 8;
    window.scrollTo({ top, behavior: "smooth" });
    setTimeout(() => { scrollingProgrammatically.current = false; }, 800);
  }, [menuType]);

  const getCartItem = useCallback((id) => cartItems.find((i) => i.id === id), [cartItems]);
  const getNationalCartItems = useCallback((id) => cartItems.filter((i) => i.baseId === id), [cartItems]);

  async function handleConfirmOrder() {
    if (totalItems === 0 || placing) return;
    setPlaceError("");
    setPlacing(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderType: "dine-in",
          tableNumber,
          orderSource: "qr",
          placedBy: "guest",
          guestName: `Table ${tableNumber}`,
          guestPhone: "—",
          items: cartItems.map((i) => ({
            id: i.id,
            name: i.name,
            price: i.price,
            qty: i.qty,
            menuType: i.menuType || "food",
          })),
        }),
      });
      const json = await res.json();
      if (res.ok) {
        clearCart();
        setOrderConfirmed(json.orderNumber || "Received");
      } else {
        setPlaceError(json.error || "Failed to place order. Please try again.");
      }
    } catch {
      setPlaceError("Network error. Please try again.");
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--charcoal, #0f0d0a)" }}>
      {/* Hero */}
      <section
        style={{
          position: "relative",
          paddingTop: 160,
          paddingBottom: 60,
          textAlign: "center",
          background: "linear-gradient(180deg, #1a1612 0%, var(--charcoal, #0f0d0a) 100%)",
        }}
      >
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 24px" }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.25em", textTransform: "uppercase", color: "var(--gold, #C9A84C)", marginBottom: 16 }}>
            {tableValid ? "Dine-In" : "Online Ordering"}
          </p>
          <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "clamp(40px, 6vw, 68px)", fontWeight: 700, color: "var(--warm-white, #F5F0E8)", lineHeight: 1.1, margin: "0 0 20px" }}>
            {tableValid ? `Table ${tableNumber}` : "Order Now"}
          </h1>
          {tableValid ? (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(200,169,110,0.12)", border: "1px solid rgba(200,169,110,0.3)", borderRadius: 99, padding: "8px 18px" }}>
              <UtensilsCrossed size={15} style={{ color: "#c8a96e" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#c8a96e", letterSpacing: "0.06em" }}>
                Dine-In Order — Pay at Table
              </span>
            </div>
          ) : (
            <p style={{ fontSize: 16, color: "var(--muted, #9C8E7A)", lineHeight: 1.7, margin: 0 }}>
              Pickup or delivery — fresh from our kitchen to you.
            </p>
          )}
        </div>
      </section>

      {/* Food / Drinks switcher */}
      <div style={{ padding: "24px 24px 0", display: "flex", justifyContent: "center", gap: 12, background: "var(--charcoal, #0f0d0a)" }}>
        {[
          { key: "food",  label: "FOOD" },
          { key: "drink", label: "DRINKS" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setMenuType(key)}
            style={{
              minWidth: 120,
              padding: "10px 32px",
              borderRadius: 50,
              border: menuType === key ? "1px solid #c8a96e" : "1px solid rgba(245,240,232,0.35)",
              background: menuType === key ? "#c8a96e" : "transparent",
              color: menuType === key ? "#1a1a1a" : "rgba(245,240,232,0.75)",
              fontWeight: menuType === key ? 700 : 500,
              fontSize: "13px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              cursor: "pointer",
              transition: "background 0.2s ease, color 0.2s ease, border-color 0.2s ease",
              fontFamily: "'Montserrat', sans-serif",
            }}
          >
            {label}
          </button>
        ))}
      </div>

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
          marginTop: 16,
        }}
      >
        <div style={{ display: "flex", gap: 4, padding: "12px 24px", maxWidth: 1200, margin: "0 auto" }}>
          {categories.map((cat) => (
            <button
              key={`${menuType}-${cat}`}
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
        {foodData === null && (
          <div style={{ textAlign: "center", color: "var(--muted, #9C8E7A)", padding: "80px 0" }}>
            Loading menu…
          </div>
        )}

        {/* Food sections */}
        {menuType === "food" && foodData &&
          categories.map((cat) => (
            <section
              key={`food-${cat}`}
              ref={(el) => { foodSectionRefs.current[cat] = el; }}
              data-category={cat}
              style={{ marginBottom: 56 }}
            >
              <CategoryHeader cat={cat} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                {foodData[cat].map((dish) => {
                  const isNational = cat === "National Dishes";
                  const isTraditional = cat === "Traditional Specials";
                  const needsPicker = isNational || isTraditional;
                  return (
                    <DishCard
                      key={dish.id}
                      dish={dish}
                      cartItem={needsPicker ? null : getCartItem(dish.id)}
                      nationalCartItems={needsPicker ? getNationalCartItems(dish.id) : null}
                      onAdd={() => {
                        if (isNational) setSoupModal(dish);
                        else if (isTraditional) setTraditionalModal(dish);
                        else addItem({ id: dish.id, name: dish.name, price: dish.price, category: dish.category, menuType: "food", description: dish.description });
                      }}
                      onSetQty={(q) => setQty(dish.id, q)}
                    />
                  );
                })}
              </div>
            </section>
          ))
        }

        {/* Drink sections */}
        {menuType === "drink" && drinkData && categories.length === 0 && (
          <div style={{ textAlign: "center", color: "var(--muted, #9C8E7A)", padding: "80px 0" }}>
            Drinks menu loading…
          </div>
        )}
        {menuType === "drink" && drinkData &&
          categories.map((cat) => (
            <section
              key={`drink-${cat}`}
              ref={(el) => { drinkSectionRefs.current[cat] = el; }}
              data-category={cat}
              style={{ marginBottom: 56 }}
            >
              <CategoryHeader cat={cat} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                {drinkData[cat].map((drink) => (
                  <DishCard
                    key={drink.id}
                    dish={drink}
                    cartItem={getCartItem(drink.id)}
                    onAdd={() => addItem({ id: drink.id, name: drink.name, price: drink.price, category: drink.category, menuType: "drink", description: drink.description })}
                    onSetQty={(q) => setQty(drink.id, q)}
                  />
                ))}
              </div>
            </section>
          ))
        }
      </div>

      {/* Soup & Swallow picker modal — National Dishes */}
      {soupModal && (
        <SoupSwallowModal
          dish={soupModal}
          onClose={() => setSoupModal(null)}
          onConfirm={(soup, swallow) => {
            const cartId = `${soupModal.id}|${soup}|${swallow}`;
            addItem({
              id: cartId,
              baseId: soupModal.id,
              name: soupModal.name,
              price: soupModal.price,
              category: soupModal.category,
              menuType: "food",
              soup,
              swallow,
            });
            setSoupModal(null);
          }}
        />
      )}

      {/* Swallow-only picker modal — Traditional Specials */}
      {traditionalModal && (
        <SoupSwallowModal
          dish={traditionalModal}
          showSoup={false}
          onClose={() => setTraditionalModal(null)}
          onConfirm={(_soup, swallow) => {
            const cartId = `${traditionalModal.id}|${swallow}`;
            addItem({
              id: cartId,
              baseId: traditionalModal.id,
              name: traditionalModal.name,
              price: traditionalModal.price,
              category: traditionalModal.category,
              menuType: "food",
              swallow,
            });
            setTraditionalModal(null);
          }}
        />
      )}

      {/* Floating bar — dine-in: Confirm Order / regular: View Cart */}
      {totalItems > 0 && !orderConfirmed && (
        tableValid ? (
          <div style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            width: "min(480px, calc(100vw - 48px))",
          }}>
            {placeError && (
              <div style={{ background: "rgba(239,68,68,0.9)", color: "#fff", fontSize: 12, fontWeight: 600, padding: "8px 16px", borderRadius: 8, width: "100%", textAlign: "center" }}>
                {placeError}
              </div>
            )}
            <button
              onClick={handleConfirmOrder}
              disabled={placing}
              style={{
                width: "100%",
                background: placing ? "#a07840" : "var(--gold, #C9A84C)",
                borderRadius: 99,
                padding: "16px 28px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                cursor: placing ? "not-allowed" : "pointer",
                border: "none",
                whiteSpace: "nowrap",
                fontFamily: "inherit",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <UtensilsCrossed size={18} style={{ color: "#0f0d0a" }} />
                <span style={{ background: "#0f0d0a", color: "var(--gold, #C9A84C)", borderRadius: 99, fontSize: 11, fontWeight: 700, padding: "2px 7px" }}>
                  {totalItems}
                </span>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#0f0d0a", letterSpacing: "0.03em" }}>
                {placing ? "Placing your order…" : `Confirm Order — ${fmtPrice(subtotal)}`}
              </span>
              {!placing && <span style={{ fontSize: 16, color: "#0f0d0a" }}>→</span>}
            </button>
          </div>
        ) : (
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
              <span style={{ background: "#0f0d0a", color: "var(--gold, #C9A84C)", borderRadius: 99, fontSize: 11, fontWeight: 700, padding: "2px 7px" }}>
                {totalItems}
              </span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#0f0d0a", letterSpacing: "0.03em" }}>
              View Cart — {fmtPrice(subtotal)}
            </span>
          </div>
        )
      )}

      {/* Order confirmed overlay */}
      {orderConfirmed && (
        <div style={{
          position: "fixed",
          inset: 0,
          zIndex: 500,
          background: "#0f0d0a",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 24px",
          textAlign: "center",
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: "50%",
            background: "rgba(34,197,94,0.15)",
            border: "2px solid rgba(34,197,94,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: 28,
          }}>
            <ChefHat size={32} style={{ color: "#22c55e" }} />
          </div>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.25em", textTransform: "uppercase", color: "#c8a96e", marginBottom: 12 }}>
            Order Received
          </p>
          <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 700, color: "#F5F0E8", margin: "0 0 16px", lineHeight: 1.15 }}>
            Your order is<br />on its way!
          </h2>
          <p style={{ fontSize: 15, color: "#9C8E7A", margin: "0 0 8px", lineHeight: 1.6 }}>
            Order <span style={{ color: "#c8a96e", fontWeight: 700 }}>#{orderConfirmed}</span> — Table {tableNumber}, we're on it.
          </p>
          <p style={{ fontSize: 14, color: "#9C8E7A", margin: "0 0 40px", lineHeight: 1.6 }}>
            Relax — your food will arrive at <span style={{ color: "#F5F0E8", fontWeight: 600 }}>Table {tableNumber}</span>.<br />
            Payment when you're ready to leave.
          </p>
          <button
            onClick={() => setOrderConfirmed(null)}
            style={{
              background: "transparent",
              border: "1px solid rgba(200,169,110,0.4)",
              color: "#c8a96e",
              borderRadius: 99,
              padding: "12px 32px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              letterSpacing: "0.06em",
              fontFamily: "inherit",
            }}
          >
            Order More
          </button>
        </div>
      )}
    </div>
  );
}

function CategoryHeader({ cat }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "clamp(24px, 3vw, 32px)", fontWeight: 700, color: "var(--warm-white, #F5F0E8)", margin: "0 0 8px" }}>
        {cat}
      </h2>
      <div style={{ height: 2, width: 48, background: "var(--gold, #C9A84C)", borderRadius: 2 }} />
    </div>
  );
}

function DishCard({ dish, cartItem, nationalCartItems, onAdd, onSetQty }) {
  const totalNationalQty = nationalCartItems ? nationalCartItems.reduce((s, i) => s + i.qty, 0) : 0;

  return (
    <div
      style={{ background: "#1a1612", border: "1px solid var(--border-soft, #2e2820)", borderRadius: 10, padding: 20, display: "flex", flexDirection: "column", gap: 10, transition: "border-color 0.15s" }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#3e3426"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-soft, #2e2820)"; }}
    >
      <div style={{ flex: 1 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--warm-white, #F5F0E8)", margin: "0 0 6px", lineHeight: 1.3 }}>
          {dish.name}
        </h3>
        {dish.description && (
          <p style={{ fontSize: 12.5, color: "var(--muted, #9C8E7A)", margin: "0 0 12px", lineHeight: 1.6 }}>
            {dish.description}
          </p>
        )}
        <div style={{ fontSize: 15, fontWeight: 700, color: "#c8a96e" }}>
          {fmtPrice(dish.price)}
        </div>
      </div>

      {/* National Dishes: always show Add button + in-cart summary */}
      {nationalCartItems !== null ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {totalNationalQty > 0 && (
            <p style={{ fontSize: 11.5, color: "#c8a96e", margin: 0 }}>
              {totalNationalQty} variation{totalNationalQty > 1 ? "s" : ""} in cart
            </p>
          )}
          <button
            onClick={onAdd}
            style={{ width: "100%", background: "transparent", border: "1px solid var(--gold, #C9A84C)", color: "var(--gold, #C9A84C)", borderRadius: 6, padding: "10px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", letterSpacing: "0.06em", textTransform: "uppercase", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all 0.15s" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--gold, #C9A84C)"; e.currentTarget.style.color = "#0f0d0a"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--gold, #C9A84C)"; }}
          >
            <Plus size={14} /> Add to Cart
          </button>
        </div>
      ) : cartItem ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, color: "var(--muted, #9C8E7A)", fontWeight: 500 }}>In cart</span>
          <div style={{ display: "flex", alignItems: "center" }}>
            <button onClick={() => onSetQty(cartItem.qty - 1)} style={{ width: 32, height: 32, background: "#2e2820", border: "none", borderRadius: "6px 0 0 6px", color: "var(--warm-white, #F5F0E8)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Minus size={14} /></button>
            <span style={{ width: 36, height: 32, display: "flex", alignItems: "center", justifyContent: "center", background: "#251f19", color: "var(--warm-white, #F5F0E8)", fontSize: 14, fontWeight: 600 }}>{cartItem.qty}</span>
            <button onClick={() => onSetQty(cartItem.qty + 1)} style={{ width: 32, height: 32, background: "#2e2820", border: "none", borderRadius: "0 6px 6px 0", color: "var(--warm-white, #F5F0E8)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Plus size={14} /></button>
          </div>
        </div>
      ) : (
        <button
          onClick={onAdd}
          style={{ width: "100%", background: "transparent", border: "1px solid var(--gold, #C9A84C)", color: "var(--gold, #C9A84C)", borderRadius: 6, padding: "10px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", letterSpacing: "0.06em", textTransform: "uppercase", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all 0.15s" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--gold, #C9A84C)"; e.currentTarget.style.color = "#0f0d0a"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--gold, #C9A84C)"; }}
        >
          <Plus size={14} /> Add to Cart
        </button>
      )}
    </div>
  );
}

function SoupSwallowModal({ dish, onClose, onConfirm, showSoup = true }) {
  const [soup, setSoup] = useState("");
  const [swallow, setSwallow] = useState("");
  const canConfirm = (!showSoup || soup) && swallow;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)", padding: 16 }}>
      <div style={{ background: "#1a1612", border: "1px solid #3e3426", borderRadius: 12, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 16px", borderBottom: "1px solid #2e2820" }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "#c8a96e" }}>Choose your sides</p>
            <h3 style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 700, color: "#F5F0E8", fontFamily: "'Cormorant Garamond', serif" }}>{dish.name}</h3>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9C8E7A", display: "flex" }}><X size={20} /></button>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Soup — only for National Dishes */}
          {showSoup && (
            <div>
              <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#F5F0E8" }}>
                Soup <span style={{ color: "#ef4444" }}>*</span>
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {SOUPS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSoup(s)}
                    style={{
                      padding: "8px 16px", borderRadius: 99, fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "all 0.15s",
                      background: soup === s ? "#c8a96e" : "transparent",
                      color: soup === s ? "#0f0d0a" : "#9C8E7A",
                      border: `1px solid ${soup === s ? "#c8a96e" : "#3e3426"}`,
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Swallow */}
          <div>
            <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#F5F0E8" }}>
              Swallow <span style={{ color: "#ef4444" }}>*</span>
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {SWALLOWS.map((sw) => (
                <button
                  key={sw}
                  onClick={() => setSwallow(sw)}
                  style={{
                    padding: "8px 16px", borderRadius: 99, fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "all 0.15s",
                    background: swallow === sw ? "#c8a96e" : "transparent",
                    color: swallow === sw ? "#0f0d0a" : "#9C8E7A",
                    border: `1px solid ${swallow === sw ? "#c8a96e" : "#3e3426"}`,
                  }}
                >
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

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid #2e2820", display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "12px", borderRadius: 6, border: "1px solid #3e3426", background: "transparent", color: "#9C8E7A", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Cancel
          </button>
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
