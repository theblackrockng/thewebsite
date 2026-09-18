import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { supabase } from "../lib/supabase";
import SectionHeader from "../components/SectionHeader";
import OrderNowLink from "../components/OrderNowLink";
import SEO from "../components/SEO";

const categoryImages = {
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

const DRINK_CATEGORY_IMAGES = {
  "Wines":               "/images/menu/bar.jpg",
  "Spirits":             "/images/menu/bar.jpg",
  "Beer & Cider":        "/images/menu/bar.jpg",
  "Cocktails":           "/images/menu/bar.jpg",
  "Mocktails":           "/images/menu/bar.jpg",
  "Soft Drinks & Water": "/images/menu/bar.jpg",
  "Hot Drinks":          "/images/menu/bar.jpg",
  "Fresh Juice":         "/images/menu/bar.jpg",
};

const FOOD_CATEGORY_ORDER = [
  "Starters", "Salads", "Rice", "Pasta",
  "Bush Bar Kitchen", "Continental", "Sauces",
  "Charcoal Grills", "National Dishes", "Traditional Specials",
];

const DRINK_CATEGORY_ORDER = [
  "Wines", "Spirits", "Beer & Cider", "Cocktails",
  "Mocktails", "Soft Drinks & Water", "Hot Drinks", "Fresh Juice",
];

function formatPrice(price) {
  const num = parseFloat(String(price).replace(/[^0-9.]/g, ""));
  if (isNaN(num)) return String(price);
  return `₦${num.toLocaleString("en-NG")}`;
}

function CategoryImage({ category, menuType, dbCategoryImages }) {
  const [errorCats, setErrorCats] = useState(new Set());
  const fallbackMap = menuType === "drink" ? DRINK_CATEGORY_IMAGES : categoryImages;
  const src = dbCategoryImages?.[category] || fallbackMap[category];
  const hasError = errorCats.has(category);
  const showImage = src && !hasError;

  return (
    <div className="relative aspect-[4/5] overflow-hidden">
      <AnimatePresence mode="wait">
        {showImage ? (
          <motion.img
            key={`${menuType}-${category}`}
            src={src}
            alt={category}
            onError={() => setErrorCats(prev => new Set([...prev, category]))}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <motion.div
            key={`placeholder-${menuType}-${category}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: "#1a1a1a" }}
          >
            <span style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: "1.5rem",
              letterSpacing: "0.2em",
              color: "#c8a96e",
            }}>
              BLACKROCK
            </span>
          </motion.div>
        )}
      </AnimatePresence>
      <div
        className="absolute inset-x-0 bottom-0 pointer-events-none"
        style={{ height: "30%", background: "linear-gradient(to top, rgba(0,0,0,0.5), transparent)" }}
      />
    </div>
  );
}

export default function MenuPage() {
  const [foodByCategory, setFoodByCategory] = useState({});
  const [drinksByCategory, setDrinksByCategory] = useState({});
  const [foodCategories, setFoodCategories] = useState([]);
  const [drinkCategories, setDrinkCategories] = useState([]);
  const [menuType, setMenuType] = useState("food");
  const [active, setActive] = useState("");
  const [loading, setLoading] = useState(true);
  const [dbCategoryImages, setDbCategoryImages] = useState({});

  useEffect(() => {
    supabase
      .from("site_content")
      .select("data")
      .eq("section", "menu-category-images")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.data) setDbCategoryImages(data.data);
      });
  }, []);

  useEffect(() => {
    supabase
      .from("menu_items")
      .select("*")
      .eq("available", true)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .then(({ data }) => {
        if (!data || data.length === 0) { setLoading(false); return; }

        const food = {};
        const drinks = {};

        data.forEach((item) => {
          const type = item.menu_type ?? "food";
          if (type === "drink") {
            if (!drinks[item.category]) drinks[item.category] = [];
            drinks[item.category].push(item);
          } else {
            if (!food[item.category]) food[item.category] = [];
            food[item.category].push(item);
          }
        });

        const sortCats = (grouped, order) => {
          const orderLower = order.map((c) => c.toLowerCase());
          return Object.keys(grouped).sort((a, b) => {
            const ai = orderLower.indexOf(a.toLowerCase());
            const bi = orderLower.indexOf(b.toLowerCase());
            return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
          });
        };

        const fCats = sortCats(food, FOOD_CATEGORY_ORDER);
        const dCats = sortCats(drinks, DRINK_CATEGORY_ORDER);

        setFoodByCategory(food);
        setDrinksByCategory(drinks);
        setFoodCategories(fCats);
        setDrinkCategories(dCats);
        setActive(fCats[0] || "");
        setLoading(false);
      });
  }, []);

  const switchMenuType = (type) => {
    setMenuType(type);
    if (type === "food") {
      setActive(foodCategories[0] || "");
    } else {
      setActive(drinkCategories[0] || "");
    }
  };

  const activeCategories = menuType === "drink" ? drinkCategories : foodCategories;
  const activeMenuByCategory = menuType === "drink" ? drinksByCategory : foodByCategory;

  return (
    <div className="page-enter">
      <SEO
        title="Menu"
        description="Explore BLACKROCK's full menu — Nigerian classics, charcoal grills, continental dishes, cocktails and more. Available daily in Ikeja, Lagos."
        canonical="/menu"
        schema={{
          "@context": "https://schema.org",
          "@type": "Menu",
          "name": "BLACKROCK Restaurant Menu",
          "url": "https://blackrockrestaurantng.com/menu",
          "hasMenuSection": [
            { "@type": "MenuSection", "name": "Food" },
            { "@type": "MenuSection", "name": "Drinks" }
          ]
        }}
      />
      {/* Header */}
      <section className="relative overflow-hidden" data-testid="menu-header">
        <div className="absolute inset-0">
          <img
            src={menuType === "drink" ? "/drink-menu-hero.png" : "/food-menu-hero.png"}
            alt="BlackRock dishes"
            className="w-full h-full object-cover object-center"
            style={{ transition: "opacity 0.4s ease" }}
          />
          <div className="absolute inset-0" style={{ background: "rgba(20,20,20,0.72)" }} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(20,20,20,0.4) 0%, rgba(20,20,20,0.5) 60%, rgba(20,20,20,1) 100%)" }} />
        </div>
        <div className="relative z-10 max-w-[1440px] mx-auto px-6 md:px-12 text-center pt-32 pb-24 md:pt-44 md:pb-32">
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="gold-line"
          >
            Our Menu
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.5 }}
            className="font-serif-display text-3xl md:text-5xl lg:text-8xl leading-[0.95] mt-6 md:mt-8 text-[var(--warm-white)] drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]"
          >
            A menu built for{" "}
            <span className="font-serif-italic text-[var(--burgundy)]">every moment.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="text-white/75 mt-8 max-w-2xl mx-auto font-light text-base md:text-lg leading-relaxed"
          >
            From our kitchen to our bar. Freshly made, carefully chosen, served with care.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.9 }}
            className="flex gap-4 mt-8 justify-center"
            data-testid="menu-type-switcher"
          >
            {[
              { key: "food",  label: "FOOD" },
              { key: "drink", label: "DRINKS" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => switchMenuType(key)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "14px 40px",
                  background: menuType === key ? "#c8a96e" : "transparent",
                  color: menuType === key ? "#1a1a1a" : "rgba(245,240,232,0.9)",
                  border: menuType === key ? "1px solid #c8a96e" : "1px solid rgba(245,240,232,0.5)",
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: "13px",
                  fontWeight: menuType === key ? 700 : 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  cursor: "pointer",
                  transition: "background 0.2s ease, color 0.2s ease, border-color 0.2s ease",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {label}
              </button>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Category tabs */}
      <section
        className="sticky top-20 md:top-28 lg:top-36 z-30 backdrop-blur-md border-y border-[var(--border-soft)]"
        style={{ backgroundColor: "rgba(15,13,10,0.96)" }}
        data-testid="menu-tabs"
      >
        <div className="max-w-[1440px] mx-auto px-6 md:px-12">
          <div className="relative">
            <div
              className="flex gap-2 py-4"
              style={{ overflowX: "auto", scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
            >
              <AnimatePresence mode="wait">
                {activeCategories.map((cat) => (
                  <motion.button
                    key={`${menuType}-${cat}`}
                    onClick={() => setActive(cat)}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    className={`flex-shrink-0 px-4 py-2 md:px-6 md:py-3 text-xs uppercase tracking-[0.22em] font-medium transition-all duration-300 border whitespace-nowrap ${
                      active === cat
                        ? "bg-[var(--gold)] text-[var(--charcoal)] border-[var(--gold)]"
                        : "bg-transparent text-[var(--muted)] border-[var(--border-soft)] hover:border-[var(--gold)] hover:text-[var(--warm-white)]"
                    }`}
                    data-testid={`menu-tab-${cat.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {cat}
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
            <div
              className="absolute right-0 top-0 bottom-0 w-16 pointer-events-none"
              style={{ background: "linear-gradient(to right, transparent, rgba(15,13,10,0.96))" }}
            />
          </div>
        </div>
      </section>

      {/* Menu items */}
      <section className="bg-[var(--charcoal)] py-20 md:py-28" data-testid="menu-items-section">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12">
          {loading ? (
            <div className="text-center py-24 text-[var(--muted)] text-sm tracking-widest uppercase">
              Loading menu…
            </div>
          ) : activeCategories.length === 0 ? (
            <div className="text-center py-24 text-[var(--muted)] text-sm">
              {menuType === "drink" ? "Drinks menu coming soon." : "Menu coming soon."}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">
              {/* Category image */}
              <div className="lg:col-span-5 lg:sticky lg:top-44 self-start">
                <CategoryImage category={active} menuType={menuType} dbCategoryImages={dbCategoryImages} />
                <div className="mt-6">
                  <span className="gold-line">{active}</span>
                </div>
              </div>

              {/* Item list */}
              <div className="lg:col-span-7">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${menuType}-${active}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.5 }}
                  >
                    {(activeMenuByCategory[active] || []).map((item, i) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: i * 0.06 }}
                        className="border-b border-[var(--border-soft)] px-3 -mx-3"
                        style={{ paddingTop: "2.8rem", paddingBottom: "2.8rem" }}
                        data-testid={`menu-item-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <div className="flex items-baseline justify-between gap-4">
                          <h3
                            className="font-serif-display leading-snug"
                            style={{ fontSize: "1.05rem", fontWeight: 600, color: "var(--warm-white)" }}
                          >
                            {item.name}
                          </h3>
                          <span
                            className="flex-shrink-0 font-sans"
                            style={{ fontSize: "1.05rem", fontWeight: 500, color: "#c8a96e" }}
                          >
                            {formatPrice(item.price)}
                          </span>
                        </div>
                        {item.description && (
                          <p
                            className="font-light mt-2 leading-relaxed"
                            style={{ fontSize: "0.83rem", color: "#888580" }}
                          >
                            {item.description}
                          </p>
                        )}
                      </motion.div>
                    ))}

                    {/* Swallow — shown only for Traditional Specials */}
                    {active === "Traditional Specials" && (
                      <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        style={{
                          marginTop: "2.5rem",
                          padding: "1.5rem 1.75rem",
                          border: "1px solid rgba(200,169,110,0.25)",
                          borderRadius: "10px",
                          background: "rgba(200,169,110,0.05)",
                        }}
                      >
                        <p style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#c8a96e", marginBottom: "1rem" }}>
                          Served with choice of Carbohydrate
                        </p>
                        <p style={{ fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--warm-white)", marginBottom: "0.75rem" }}>
                          Swallow
                        </p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                          {["Pounded Yam", "Eba", "Amala", "Fufu", "Wheat", "Semo"].map((s) => (
                            <span key={s} style={{ fontSize: "0.82rem", fontWeight: 500, color: "#F5F0E8", background: "rgba(200,169,110,0.12)", border: "1px solid rgba(200,169,110,0.4)", borderRadius: "99px", padding: "4px 14px" }}>
                              {s}
                            </span>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {/* Soups & Carbohydrates — shown only for National Dishes */}
                    {active === "National Dishes" && (
                      <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        style={{
                          marginTop: "2.5rem",
                          padding: "1.5rem 1.75rem",
                          border: "1px solid rgba(200,169,110,0.25)",
                          borderRadius: "10px",
                          background: "rgba(200,169,110,0.05)",
                        }}
                      >
                        <p style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#c8a96e", marginBottom: "1rem" }}>
                          Served with choice of Soup &amp; Carbohydrate
                        </p>

                        <p style={{ fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--warm-white)", marginBottom: "0.75rem" }}>
                          Soups
                        </p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1.25rem" }}>
                          {["Efo Riro", "Edika-Ikong", "Egusi", "Mixed Okro", "Fisherman Soup", "Seafood", "Banga", "Ofe Nsala", "Miyan Kuka", "Ewedu"].map((s) => (
                            <span key={s} style={{ fontSize: "0.82rem", fontWeight: 500, color: "#F5F0E8", background: "rgba(200,169,110,0.12)", border: "1px solid rgba(200,169,110,0.4)", borderRadius: "99px", padding: "4px 14px" }}>
                              {s}
                            </span>
                          ))}
                        </div>

                        <p style={{ fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--warm-white)", marginBottom: "0.75rem" }}>
                          Swallow
                        </p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                          {["Pounded Yam", "Eba", "Amala", "Fufu", "Wheat", "Semo"].map((s) => (
                            <span key={s} style={{ fontSize: "0.82rem", fontWeight: 500, color: "#F5F0E8", background: "rgba(200,169,110,0.12)", border: "1px solid rgba(200,169,110,0.4)", borderRadius: "99px", padding: "4px 14px" }}>
                              {s}
                            </span>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[var(--charcoal-soft)] py-24" data-testid="menu-cta">
        <div className="max-w-3xl mx-auto px-6 md:px-12 text-center">
          <SectionHeader
            kicker="Hungry?"
            title="Best enjoyed in person."
            subtitle="Order ahead and have it ready when you arrive. Or have it delivered to your doorstep."
          />
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
            <OrderNowLink className="btn-burgundy" data-testid="menu-order-cta">
              <span>Order Now</span>
              <ArrowRight size={14} />
            </OrderNowLink>
            <Link to="/reservations" className="btn-outline-gold" data-testid="menu-reserve-cta">
              <span>Reserve a Table</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      <style>{`
        [data-testid="menu-tabs"] div::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
