import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { IMAGES, MENU } from "../lib/data";
import SectionHeader from "../components/SectionHeader";

const categories = Object.keys(MENU);

const imgByCat = {
  Starters: IMAGES.starter,
  Salads: IMAGES.salad,
  Rice: IMAGES.jollof,
  Noodles: IMAGES.noodles,
  "Bush Bar Kitchen": IMAGES.pepperSoup,
  Continental: IMAGES.steak,
  Sauces: IMAGES.pasta,
  "Charcoal Grills": IMAGES.grill,
  "National Dishes": IMAGES.grilledFish,
  "Traditional Specials": IMAGES.riceDish,
};

export default function MenuPage() {
  const [active, setActive] = useState(categories[0]);

  return (
    <div className="page-enter pt-20 md:pt-28 lg:pt-36">
      {/* Header */}
      <section className="bg-[var(--warm-white)] pt-16 pb-12 md:pt-24 md:pb-20" data-testid="menu-header">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 text-center">
          <span className="gold-line">Our Menu</span>
          <h1 className="font-serif-display text-3xl md:text-5xl lg:text-8xl leading-[0.95] mt-6 md:mt-8 text-[var(--charcoal)]">
            What we'll <span className="font-serif-italic text-[var(--burgundy)]">cook for you.</span>
          </h1>
          <p className="text-[var(--muted)] mt-8 max-w-2xl mx-auto font-light text-base md:text-lg leading-relaxed">
            Our menu shifts with the seasons and the markets. What follows is a
            recent expression — your night may bring something new.
          </p>
        </div>
      </section>

      {/* Category tabs */}
      <section
        className="sticky top-20 md:top-28 lg:top-36 z-30 backdrop-blur-md border-y border-[var(--border-soft)]"
        style={{ backgroundColor: "rgba(250, 248, 245, 0.95)" }}
        data-testid="menu-tabs"
      >
        <div className="max-w-[1440px] mx-auto px-6 md:px-12">
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-4">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActive(cat)}
                className={`flex-shrink-0 px-4 py-2 md:px-6 md:py-3 text-xs uppercase tracking-[0.22em] font-medium transition-all duration-300 border ${
                  active === cat
                    ? "bg-[var(--charcoal)] text-[var(--warm-white)] border-[var(--charcoal)]"
                    : "bg-transparent text-[var(--charcoal)] border-[var(--border-soft)] hover:border-[var(--charcoal)]"
                }`}
                data-testid={`menu-tab-${cat.toLowerCase()}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Menu items */}
      <section className="bg-[var(--warm-white)] py-20 md:py-28" data-testid="menu-items-section">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12">
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
                {MENU[active].map((item, i) => (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: i * 0.08 }}
                    className="py-8 border-b border-[var(--border-soft)] hover:bg-[var(--cream)]/40 transition-colors px-2 -mx-2"
                    data-testid={`menu-item-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <div className="flex items-baseline justify-between gap-6">
                      <h3 className="font-serif-display text-lg md:text-3xl text-[var(--charcoal)]">
                        {item.name}
                      </h3>
                      <div className="font-serif-display text-base md:text-2xl text-[var(--burgundy)] flex-shrink-0">
                        {item.price}
                      </div>
                    </div>
                    <p className="text-[var(--muted)] text-sm md:text-base font-light mt-3 leading-relaxed max-w-2xl">
                      {item.desc}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[var(--cream)] py-24" data-testid="menu-cta">
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
