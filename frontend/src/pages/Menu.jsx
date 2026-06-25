import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { IMAGES } from "../lib/data";
import { supabase } from "../lib/supabase";
import SectionHeader from "../components/SectionHeader";

const imgByCat = {
  Starters: IMAGES.starter,
  Salads: IMAGES.salad,
  Rice: IMAGES.jollof,
  Noodles: IMAGES.noodles,
  "Pepper Soup & Specials": IMAGES.pepperSoup,
  Continental: IMAGES.steak,
  Sauces: IMAGES.pasta,
  "Charcoal Grills": IMAGES.grill,
  "National Dishes": IMAGES.grilledFish,
  "Traditional Specials": IMAGES.riceDish,
};

export default function MenuPage() {
  const [menuByCategory, setMenuByCategory] = useState({});
  const [categories, setCategories] = useState([]);
  const [active, setActive] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("menu_items")
      .select("*")
      .eq("available", true)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .then(({ data }) => {
        if (!data || data.length === 0) { setLoading(false); return; }
        const grouped = {};
        data.forEach((item) => {
          if (!grouped[item.category]) grouped[item.category] = [];
          grouped[item.category].push(item);
        });
        const cats = Object.keys(grouped);
        setMenuByCategory(grouped);
        setCategories(cats);
        setActive(cats[0]);
        setLoading(false);
      });
  }, []);

  return (
    <div className="page-enter">
      {/* Header */}
      <section className="relative overflow-hidden" data-testid="menu-header">
        <div className="absolute inset-0">
          <img
            src="/Menuhero.png"
            alt="BlackRock dishes"
            className="w-full h-full object-cover object-center"
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
            What we'll <span className="font-serif-italic text-[var(--burgundy)]">cook for you.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="text-white/75 mt-8 max-w-2xl mx-auto font-light text-base md:text-lg leading-relaxed"
          >
            Our menu shifts with the seasons and the markets. What follows is a
            recent expression. Your night may bring something new.
          </motion.p>
        </div>
      </section>

      {/* Category tabs */}
      <section
        className="sticky top-20 md:top-28 lg:top-36 z-30 backdrop-blur-md border-y border-[var(--border-soft)]"
        style={{ backgroundColor: "rgba(15,13,10,0.96)" }}
        data-testid="menu-tabs"
      >
        <div className="max-w-[1440px] mx-auto px-6 md:px-12">
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-4">
            {categories.map((cat) => (
              <motion.button
                key={cat}
                onClick={() => setActive(cat)}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className={`flex-shrink-0 px-4 py-2 md:px-6 md:py-3 text-xs uppercase tracking-[0.22em] font-medium transition-all duration-300 border ${
                  active === cat
                    ? "bg-[var(--gold)] text-[var(--charcoal)] border-[var(--gold)]"
                    : "bg-transparent text-[var(--muted)] border-[var(--border-soft)] hover:border-[var(--gold)] hover:text-[var(--warm-white)]"
                }`}
                data-testid={`menu-tab-${cat.toLowerCase()}`}
              >
                {cat}
              </motion.button>
            ))}
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
          ) : categories.length === 0 ? (
            <div className="text-center py-24 text-[var(--muted)] text-sm">
              Menu coming soon.
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.5 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16"
              >
                {/* Featured image */}
                <div className="lg:col-span-5 lg:sticky lg:top-44 self-start">
                  <div className="img-hover aspect-[4/5]">
                    <img src={imgByCat[active]} alt={active} className="w-full h-full object-cover" />
                  </div>
                  <div className="mt-8">
                    <span className="gold-line left">Category</span>
                    <h2 className="font-serif-display text-4xl md:text-5xl mt-4 text-[var(--charcoal)]">{active}</h2>
                  </div>
                </div>

                {/* Items */}
                <div className="lg:col-span-7 space-y-1">
                  {(menuByCategory[active] || []).map((item, i) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: i * 0.08 }}
                      whileHover={{ x: 4, transition: { duration: 0.2 } }}
                      className="py-8 border-b border-[var(--border-soft)] hover:bg-[var(--charcoal-soft)]/40 transition-colors px-2 -mx-2"
                      data-testid={`menu-item-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <div className="flex items-start justify-between gap-6">
                        <h3 className="font-serif-display text-lg md:text-2xl text-[var(--warm-white)] leading-snug">
                          {item.name}
                        </h3>
                        <div className="flex-shrink-0 bg-[var(--gold)] text-[var(--charcoal)] font-sans font-bold text-sm md:text-base px-3 py-1 tracking-wide mt-1">
                          {item.price}
                        </div>
                      </div>
                      <p className="text-[var(--muted)] text-sm md:text-base font-light mt-3 leading-relaxed max-w-2xl">
                        {item.description}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[var(--charcoal-soft)] py-24" data-testid="menu-cta">
        <div className="max-w-3xl mx-auto px-6 md:px-12 text-center">
          <SectionHeader
            kicker="Hungry?"
            title="Best book ahead."
            subtitle="Weekends fill up by Wednesday. Tuesdays are quiet, intimate, and ours."
          />
          <Link to="/reservations" className="btn-burgundy mt-12 inline-flex" data-testid="menu-reserve-cta">
            Reserve a Table <ArrowRight size={14} />
          </Link>
        </div>
      </section>
    </div>
  );
}
