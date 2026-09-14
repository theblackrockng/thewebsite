import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { IMAGES } from "../lib/data";
import { supabase } from "../lib/supabase";
import SectionHeader from "../components/SectionHeader";
import OrderNowLink from "../components/OrderNowLink";

const FALLBACK_AMBIENCE = [
  { src: IMAGES.heroRooftop,  tag: "Ambience", label: "Lagos by night" },
  { src: IMAGES.interior1,    tag: "Ambience", label: "Ground floor" },
  { src: IMAGES.cocktail,     tag: "Ambience", label: "Palm wine spritz" },
  { src: IMAGES.rooftopNight, tag: "Ambience", label: "Rooftop nights" },
  { src: IMAGES.interior2,    tag: "Ambience", label: "Quiet corners" },
];

const FILTERS = ["Food", "Drinks", "Ambience", "Behind The Scenes"];

const DRINK_KEYWORDS = ["heineken", "beer", "wine", "spirit", "whiskey", "vodka", "gin", "rum", "mocktail", "cider", "champagne", "prosecco", "brandy", "whisky", "liquor", "lager", "stout"];

function isDrink(filename) {
  const lower = (filename || "").toLowerCase();
  return DRINK_KEYWORDS.some((k) => lower.includes(k));
}

export default function Gallery() {
  const [filter, setFilter] = useState("Food");
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [ambienceImages, setAmbienceImages] = useState(FALLBACK_AMBIENCE);
  const [foodImages, setFoodImages] = useState([]);
  const [drinkImages, setDrinkImages] = useState([]);
  const [behindImages, setBehindImages] = useState([]);
  const [menuDishImages, setMenuDishImages] = useState([]);
  const [facesDayImg, setFacesDayImg] = useState("/black-rock-5.jpg");
  const [facesEveImg, setFacesEveImg] = useState("/black-rock-5.jpg");

  // Load Two Faces section images from site_content
  useEffect(() => {
    async function loadFaces() {
      try {
        const [dayRow, eveRow] = await Promise.all([
          supabase.from("site_content").select("data").eq("section", "gallery-faces-day").maybeSingle(),
          supabase.from("site_content").select("data").eq("section", "gallery-faces-evening").maybeSingle(),
        ]);
        if (dayRow.data?.data?.image) setFacesDayImg(dayRow.data.data.image);
        if (eveRow.data?.data?.image) setFacesEveImg(eveRow.data.data.image);
      } catch {}
    }
    loadFaces();
  }, []);

  // Load curated gallery images from media_assets by section tag
  useEffect(() => {
    async function loadGallery() {
      try {
        const [foodRes, foodReelRes, drinkRes, ambienceRes, behindRes] = await Promise.all([
          supabase.from("media_assets").select("url, filename").eq("used_in", "gallery-food").order("uploaded_at", { ascending: false }),
          supabase.from("media_assets").select("url, filename").eq("used_in", "home-food-reel").order("uploaded_at", { ascending: false }),
          supabase.from("media_assets").select("url, filename").eq("used_in", "gallery-drinks").order("uploaded_at", { ascending: false }),
          supabase.from("media_assets").select("url, filename").eq("used_in", "gallery").order("uploaded_at", { ascending: false }),
          supabase.from("media_assets").select("url, filename").eq("used_in", "gallery-behind").order("uploaded_at", { ascending: false }),
        ]);

        const combinedFood = [...(foodRes.data ?? []), ...(foodReelRes.data ?? [])];
        const actualFood = combinedFood.filter((a) => !isDrink(a.filename));
        const detectedDrinks = combinedFood.filter((a) => isDrink(a.filename));

        if (actualFood.length) {
          setFoodImages(actualFood.map((a) => ({ src: a.url, tag: "Food", label: a.filename || "" })));
        }

        const allDrinks = [...(drinkRes.data ?? []), ...detectedDrinks];
        if (allDrinks.length) {
          setDrinkImages(allDrinks.map((a) => ({ src: a.url, tag: "Drinks", label: a.filename || "" })));
        }
        if (ambienceRes.data?.length) {
          setAmbienceImages(ambienceRes.data.map((a) => ({ src: a.url, tag: "Ambience", label: a.filename || "" })));
        }
        if (behindRes.data?.length) {
          setBehindImages(behindRes.data.map((a) => ({ src: a.url, tag: "Behind The Scenes", label: a.filename || "" })));
        }
      } catch {}
    }
    loadGallery();
  }, []);

  // Load menu item images — food items go to Food tab, drink items go to Drinks tab
  useEffect(() => {
    async function loadMenuDishes() {
      try {
        const { data } = await supabase
          .from("menu_items")
          .select("name, menu_type, image_url")
          .not("image_url", "is", null)
          .neq("image_url", "");
        if (data?.length) {
          setMenuDishImages(
            data.map((item) => ({
              src: item.image_url,
              tag: item.menu_type === "drink" ? "Drinks" : "Food",
              label: item.name,
            }))
          );
        }
      } catch {}
    }
    loadMenuDishes();
  }, []);

  const allImages = [...foodImages, ...menuDishImages, ...drinkImages, ...ambienceImages, ...behindImages];
  const filtered = allImages.filter((g) => g.tag === filter);

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
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
              <p className="text-[var(--muted)] text-base font-light">No images in this category yet.</p>
              <p className="text-[var(--muted)] text-sm opacity-60">Photos will appear here once added from the console.</p>
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[2px]">
            {filtered.map((g, i) => (
              <motion.button
                key={`${g.src}-${i}`}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: (i % 8) * 0.04 }}
                onClick={() => setLightboxIndex(i)}
                className="relative cursor-pointer overflow-hidden group aspect-square"
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
      <section className="bg-[var(--charcoal-soft)] text-[var(--warm-white)] pt-24 md:pt-32 pb-0" data-testid="concepts-section">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12">
          <SectionHeader kicker="Two Faces" title="Daylight & After Dark." />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-16">
            {[
              {
                img: facesDayImg,
                title: "Daylight & Fresh",
                desc: "Sunday brunches, soft afternoon light, slow lunches that turn into dinner.",
              },
              {
                img: facesEveImg,
                title: "After Dark",
                desc: "The city below, the night above. The rooftop at its best. Candlelit, open sky, you in the middle of it.",
              },
            ].map((c, i) => (
              <motion.div
                key={c.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: i * 0.15 }}
                whileHover={{ y: -6, transition: { duration: 0.3 } }}
                style={{ height: 480, overflow: "hidden", position: "relative" }}
              >
                <img
                  src={c.img}
                  alt={c.title}
                  loading="lazy"
                  style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", display: "block" }}
                />
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
      <section className="bg-[var(--charcoal-soft)] pb-24 text-center" style={{ paddingTop: 60 }} data-testid="gallery-cta">
        <div className="max-w-2xl mx-auto px-6">
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="gold-line"
          >
            See it for yourself
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-serif-display text-[var(--warm-white)] leading-[1.05] mt-5"
            style={{ fontSize: "clamp(1.8rem, 5vw, 2.8rem)" }}
          >
            Pictures can't pour you a drink.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="font-light leading-relaxed mt-5"
            style={{ fontSize: "1rem", color: "rgba(255,255,255,0.7)" }}
          >
            But we can. Order online or come in and experience it yourself.
          </motion.p>
          <div className="flex flex-col sm:flex-row gap-4 mt-12">
            <OrderNowLink className="btn-burgundy" data-testid="gallery-order">
              <span>Order Now</span>
              <ArrowRight size={14} />
            </OrderNowLink>
            <Link to="/reservations" className="btn-outline-gold" data-testid="gallery-reserve">
              <span>Reserve a Table</span>
              <ArrowRight size={14} />
            </Link>
          </div>
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
