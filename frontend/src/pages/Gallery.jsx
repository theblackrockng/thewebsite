import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { IMAGES } from "../lib/data";
import { supabase } from "../lib/supabase";
import SectionHeader from "../components/SectionHeader";

const FALLBACK_GALLERY = [
  { src: IMAGES.heroRooftop,  tag: "Ambience",          label: "Lagos by night" },
  { src: IMAGES.jollof,       tag: "Food",               label: "Party jollof" },
  { src: IMAGES.interior1,    tag: "Ambience",          label: "Ground floor" },
  { src: IMAGES.cocktail,     tag: "Ambience",          label: "Palm wine spritz" },
  { src: IMAGES.rooftopNight, tag: "Ambience",          label: "Rooftop nights" },
  { src: IMAGES.pepperSoup,   tag: "Food",               label: "Catfish pepper soup" },
  { src: IMAGES.grilledFish,  tag: "Food",               label: "Whole grilled croaker" },
  { src: IMAGES.interior2,    tag: "Ambience",          label: "Quiet corners" },
  { src: IMAGES.grill,        tag: "Food",               label: "Asun off the grill" },
  { src: IMAGES.suya,         tag: "Food",               label: "Suya plate" },
  { src: IMAGES.riceDish,     tag: "Food",               label: "Ofada & ayamase" },
];

const CATEGORY_HEROES = [
  { src: "/images/menu/starters.jpg",    tag: "Food", label: "Starters" },
  { src: "/images/menu/salads.jpg",      tag: "Food", label: "Salads" },
  { src: "/images/menu/rice.jpg",        tag: "Food", label: "Rice" },
  { src: "/images/menu/noodles.jpg",     tag: "Food", label: "Noodles" },
  { src: "/images/menu/pepper-soup.jpg", tag: "Food", label: "Pepper Soup & Specials" },
  { src: "/images/menu/continental.jpg", tag: "Food", label: "Continental" },
  { src: "/images/menu/sauces.jpg",      tag: "Food", label: "Sauces" },
  { src: "/images/menu/grills.jpg",      tag: "Food", label: "Charcoal Grills" },
  { src: "/images/menu/national.jpg",    tag: "Food", label: "National Dishes" },
  { src: "/images/menu/traditional.jpg", tag: "Food", label: "Traditional Specials" },
];

const FILTERS = ["All", "Food", "Ambience", "Behind The Scenes"];

export default function Gallery() {
  const [filter, setFilter] = useState("All");
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [baseImages, setBaseImages] = useState(FALLBACK_GALLERY);
  const [menuDishImages, setMenuDishImages] = useState([]);

  // Load curated gallery images (site_content / media_assets)
  useEffect(() => {
    async function loadGallery() {
      try {
        const { data: contentRow } = await supabase
          .from("site_content")
          .select("data")
          .eq("section", "gallery")
          .maybeSingle();
        const contentUrls = Array.isArray(contentRow?.data?.images) ? contentRow.data.images : [];

        const { data: assets } = await supabase
          .from("media_assets")
          .select("url, filename")
          .eq("used_in", "gallery")
          .order("uploaded_at", { ascending: false });
        const assetUrls = (assets ?? []).map((a) => a.url);

        const allUrls = [...new Set([...contentUrls, ...assetUrls])];
        if (allUrls.length > 0) {
          setBaseImages(allUrls.map((src) => ({ src, tag: "Ambience", label: "" })));
        } else {
          setBaseImages(FALLBACK_GALLERY);
        }
      } catch {
        setBaseImages(FALLBACK_GALLERY);
      }
    }
    loadGallery();
  }, []);

  // Load menu item images from Supabase — dynamic, updates when dishes are added
  useEffect(() => {
    async function loadMenuDishes() {
      try {
        const { data } = await supabase
          .from("menu_items")
          .select("name, category, image_url")
          .not("image_url", "is", null)
          .neq("image_url", "");
        if (data?.length) {
          setMenuDishImages(
            data.map((item) => ({ src: item.image_url, tag: "Food", label: item.name }))
          );
        }
      } catch {
        // fail silently — category heroes still cover food section
      }
    }
    loadMenuDishes();
  }, []);

  const allImages = [...baseImages, ...CATEGORY_HEROES, ...menuDishImages];
  const filtered = filter === "All" ? allImages : allImages.filter((g) => g.tag === filter);

  // Lightbox keyboard navigation
  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const handler = (e) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft")  setLightboxIndex((i) => Math.max(0, i - 1));
      if (e.key === "ArrowRight") setLightboxIndex((i) => Math.min(filtered.length - 1, i + 1));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxIndex, filtered.length, closeLightbox]);

  const lightboxItem = lightboxIndex !== null ? filtered[lightboxIndex] : null;

  return (
    <div className="page-enter pt-20 md:pt-28 lg:pt-36">
      {/* Header */}
      <section className="bg-[var(--charcoal)] pt-16 pb-12 md:pt-24" data-testid="gallery-header">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 text-center">
          <span className="gold-line">Gallery</span>
          <h1 className="font-serif-display text-3xl md:text-5xl lg:text-8xl leading-[0.95] mt-6 md:mt-8 text-[var(--warm-white)]">
            A look <span className="font-serif-italic text-[var(--gold)]">inside.</span>
          </h1>
          <p className="text-[var(--muted)] mt-8 max-w-xl mx-auto font-light text-base md:text-lg">
            Plates, rooms, hours. Pieces of a normal Tuesday at BlackRock.
          </p>
        </div>
      </section>

      {/* Filter tabs */}
      <section className="bg-[var(--charcoal)] pb-8">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12">
          <div className="flex gap-2 overflow-x-auto no-scrollbar justify-start md:justify-center pb-2">
            {FILTERS.map((f) => (
              <motion.button
                key={f}
                onClick={() => { setFilter(f); setLightboxIndex(null); }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className={`flex-shrink-0 px-5 py-2 text-xs uppercase tracking-[0.28em] transition-all duration-300 border ${
                  filter === f
                    ? "bg-[var(--gold)] text-[var(--charcoal)] border-[var(--gold)]"
                    : "bg-transparent text-[var(--muted)] border-[var(--border-soft)] hover:border-[var(--gold)] hover:text-[var(--warm-white)]"
                }`}
                data-testid={`gallery-filter-${f.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {f}
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="bg-[var(--charcoal)] pb-24 md:pb-32" data-testid="gallery-grid">
        <div className="max-w-[1600px] mx-auto px-6 md:px-12">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[2px]">
            {filtered.map((g, i) => (
              <motion.button
                key={`${g.src}-${i}`}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: (i % 8) * 0.04 }}
                onClick={() => setLightboxIndex(i)}
                className={`relative cursor-pointer overflow-hidden group ${
                  i % 7 === 0 ? "row-span-2 aspect-[3/5]" : i % 5 === 0 ? "aspect-square" : "aspect-[4/5]"
                }`}
                data-testid={`gallery-item-${i}`}
              >
                <img
                  src={g.src}
                  alt={g.label || "BlackRock"}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  style={{ background: "rgba(0,0,0,0.4)" }}
                >
                  {g.tag && (
                    <div className="text-[10px] uppercase tracking-[0.28em] text-[var(--gold)] mb-2">{g.tag}</div>
                  )}
                  {g.label && (
                    <div className="font-serif-display text-lg text-white text-center px-4 leading-snug">{g.label}</div>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* Two concepts */}
      <section className="bg-[var(--charcoal-soft)] text-[var(--warm-white)] py-24 md:py-32" data-testid="concepts-section">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12">
          <SectionHeader kicker="Two Faces" title="Daylight & After Dark." />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-16">
            {[
              { img: IMAGES.rooftopDay,   title: "Daylight & Fresh", desc: "Sunday brunches, soft afternoon light, slow lunches that turn into dinner." },
              { img: IMAGES.rooftopNight, title: "After Dark",        desc: "The city below, the night above. The rooftop at its best. Candlelit, open sky, you in the middle of it." },
            ].map((c, i) => (
              <motion.div
                key={c.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: i * 0.15 }}
                whileHover={{ y: -6, transition: { duration: 0.3 } }}
                className="img-hover aspect-[4/3] relative"
              >
                <img src={c.img} alt={c.title} loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
                  <h3 className="font-serif-display text-3xl md:text-5xl">{c.title}</h3>
                  <p className="text-white/70 mt-3 max-w-md font-light">{c.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[var(--charcoal)] py-24 text-center" data-testid="gallery-cta">
        <div className="max-w-2xl mx-auto px-6">
          <SectionHeader
            kicker="See it for yourself"
            title="Pictures can't pour you a drink."
            subtitle="Book a table. The rest is in person."
          />
          <Link to="/reservations" className="btn-burgundy mt-12 inline-flex" data-testid="gallery-reserve">
            Reserve a Table <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[90] flex items-center justify-center p-4 md:p-12"
            style={{ background: "rgba(0,0,0,0.95)" }}
            onClick={closeLightbox}
            data-testid="gallery-lightbox"
          >
            {/* Close */}
            <button
              onClick={closeLightbox}
              className="absolute top-5 right-5 text-white/60 hover:text-white transition-colors z-10 p-2"
              aria-label="Close lightbox"
            >
              <X size={28} />
            </button>

            {/* Prev */}
            {lightboxIndex > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => i - 1); }}
                className="absolute left-3 md:left-6 text-white/60 hover:text-white transition-colors z-10 p-2"
                aria-label="Previous image"
              >
                <ChevronLeft size={40} />
              </button>
            )}

            {/* Image */}
            <motion.img
              key={lightboxItem.src}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              src={lightboxItem.src}
              alt={lightboxItem.label || "BlackRock"}
              className="max-h-[82vh] max-w-[80vw] object-contain"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Next */}
            {lightboxIndex < filtered.length - 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => i + 1); }}
                className="absolute right-3 md:right-6 text-white/60 hover:text-white transition-colors z-10 p-2"
                aria-label="Next image"
              >
                <ChevronRight size={40} />
              </button>
            )}

            {/* Caption */}
            {(lightboxItem.label || lightboxItem.tag) && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center pointer-events-none">
                {lightboxItem.tag && (
                  <div className="text-[10px] uppercase tracking-[0.3em] text-[var(--gold)] mb-2">{lightboxItem.tag}</div>
                )}
                {lightboxItem.label && (
                  <div className="font-serif-display text-xl md:text-2xl text-white">{lightboxItem.label}</div>
                )}
              </div>
            )}

            {/* Counter */}
            <div className="absolute top-5 left-5 text-xs text-white/40 tracking-[0.2em] pointer-events-none">
              {lightboxIndex + 1} / {filtered.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
