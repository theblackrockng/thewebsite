import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight } from "lucide-react";
import { IMAGES } from "../lib/data";
import { supabase } from "../lib/supabase";
import SectionHeader from "../components/SectionHeader";

const FALLBACK_GALLERY = [
  { src: IMAGES.heroRooftop, tag: "Rooftop", label: "Lagos by night" },
  { src: IMAGES.jollof, tag: "Kitchen", label: "Party jollof" },
  { src: IMAGES.interior1, tag: "Restaurant", label: "Ground floor" },
  { src: IMAGES.cocktail, tag: "Bar", label: "Palm wine spritz" },
  { src: IMAGES.rooftopNight, tag: "Rooftop", label: "Rooftop nights" },
  { src: IMAGES.pepperSoup, tag: "Kitchen", label: "Catfish pepper soup" },
  { src: IMAGES.grilledFish, tag: "Kitchen", label: "Whole grilled croaker" },
  { src: IMAGES.interior2, tag: "Restaurant", label: "Quiet corners" },
  { src: IMAGES.grill, tag: "Kitchen", label: "Asun off the grill" },
  { src: IMAGES.suya, tag: "Kitchen", label: "Suya plate" },
  { src: IMAGES.riceDish, tag: "Kitchen", label: "Ofada & ayamase" },
];

const filters = ["All", "Restaurant", "Rooftop", "Kitchen", "Bar", "Food"];

export default function Gallery() {
  const [filter, setFilter] = useState("All");
  const [lightbox, setLightbox] = useState(null);
  const [galleryImages, setGalleryImages] = useState([]);

  useEffect(() => {
    async function loadImages() {
      try {
        // Try site_content gallery section first
        const { data: contentRow } = await supabase
          .from("site_content")
          .select("data")
          .eq("section", "gallery")
          .maybeSingle();

        const contentUrls = Array.isArray(contentRow?.data?.images) ? contentRow.data.images : [];

        // Also fetch any media_assets tagged as gallery
        const { data: assets } = await supabase
          .from("media_assets")
          .select("url, filename")
          .eq("used_in", "gallery")
          .order("uploaded_at", { ascending: false });

        const assetUrls = (assets ?? []).map((a) => a.url);

        // Merge, deduplicate
        const allUrls = [...new Set([...contentUrls, ...assetUrls])];

        if (allUrls.length > 0) {
          setGalleryImages(
            allUrls.map((src) => ({ src, tag: "Food", label: "" }))
          );
        } else {
          setGalleryImages(FALLBACK_GALLERY);
        }
      } catch {
        setGalleryImages(FALLBACK_GALLERY);
      }
    }
    loadImages();
  }, []);

  // While loading show fallback
  const images = galleryImages.length > 0 ? galleryImages : FALLBACK_GALLERY;
  const filtered = filter === "All" ? images : images.filter((g) => g.tag === filter);

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

      {/* Filter */}
      <section className="bg-[var(--charcoal)] pb-8">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12">
          <div className="flex gap-2 overflow-x-auto no-scrollbar justify-start md:justify-center pb-2">
            {filters.map((f) => (
              <motion.button
                key={f}
                onClick={() => setFilter(f)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className={`flex-shrink-0 px-5 py-2 text-xs uppercase tracking-[0.28em] transition-all duration-300 border ${
                  filter === f
                    ? "bg-[var(--gold)] text-[var(--charcoal)] border-[var(--gold)]"
                    : "bg-transparent text-[var(--muted)] border-[var(--border-soft)] hover:border-[var(--gold)] hover:text-[var(--warm-white)]"
                }`}
                data-testid={`gallery-filter-${f.toLowerCase()}`}
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
            {filtered.map((g, i) => (
              <motion.button
                key={`${g.src}-${i}`}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.03, zIndex: 1, transition: { duration: 0.25 } }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.5, delay: (i % 8) * 0.05 }}
                onClick={() => setLightbox(g)}
                className={`img-hover relative cursor-pointer overflow-hidden group ${
                  i % 7 === 0 ? "row-span-2 aspect-[3/5]" : i % 5 === 0 ? "aspect-square" : "aspect-[4/5]"
                }`}
                data-testid={`gallery-item-${i}`}
              >
                <img src={g.src} alt={g.label || "BlackRock"} loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                {g.label && (
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-left">
                    <div className="text-[10px] uppercase tracking-[0.28em] text-[var(--gold)] opacity-0 group-hover:opacity-100 transition-opacity">{g.tag}</div>
                    <div className="font-serif-display text-lg text-white opacity-0 group-hover:opacity-100 transition-opacity">{g.label}</div>
                  </div>
                )}
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
              { img: IMAGES.rooftopDay, title: "Daylight & Fresh", desc: "Sunday brunches, soft afternoon light, slow lunches that turn into dinner." },
              { img: IMAGES.rooftopNight, title: "After Dark", desc: "The city below, the night above. The rooftop at its best. Candlelit, open sky, you in the middle of it." },
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
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[90] bg-black/95 flex items-center justify-center p-4"
            onClick={() => setLightbox(null)}
            data-testid="gallery-lightbox"
          >
            <button
              onClick={() => setLightbox(null)}
              className="absolute top-6 right-6 text-white/70 hover:text-white"
              aria-label="Close"
            >
              <X size={28} />
            </button>
            <motion.img
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              src={lightbox.src}
              alt={lightbox.label || "BlackRock"}
              className="max-h-[85vh] max-w-[90vw] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            {lightbox.label && (
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center">
                <div className="text-[10px] uppercase tracking-[0.3em] text-[var(--gold)] mb-2">{lightbox.tag}</div>
                <div className="font-serif-display text-2xl text-white">{lightbox.label}</div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
