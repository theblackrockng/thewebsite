import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Star, MapPin, Phone } from "lucide-react";
import { IMAGES, BRAND, OCCASIONS } from "../lib/data";
import { supabase } from "../lib/supabase";
import SectionHeader from "../components/SectionHeader";
import BrandMark from "../components/BrandMark";

const occasionPreview = OCCASIONS.slice(0, 4);

const KITCHEN_IMAGES = [
  { src: "/images/menu/pepper-soup.jpg", alt: "Pepper soup" },
  { src: "/images/menu/rice.jpg",        alt: "Rice" },
  { src: "/images/menu/traditional.jpg", alt: "Traditional specials" },
];

const OCCASION_TINTS = {
  "date-night":    "linear-gradient(135deg, rgba(139,26,43,0.32) 0%, rgba(15,13,10,0.88) 100%)",
  "birthday":      "linear-gradient(135deg, rgba(201,140,76,0.28) 0%, rgba(15,13,10,0.88) 100%)",
  "family":        "linear-gradient(135deg, rgba(76,139,76,0.22) 0%, rgba(15,13,10,0.88) 100%)",
  "corporate":     "linear-gradient(135deg, rgba(76,100,139,0.25) 0%, rgba(15,13,10,0.88) 100%)",
  "anniversary":   "linear-gradient(135deg, rgba(100,18,32,0.38) 0%, rgba(15,13,10,0.88) 100%)",
  "proposal":      "linear-gradient(135deg, rgba(201,168,76,0.22) 0%, rgba(15,13,10,0.88) 100%)",
  "private-dining":"linear-gradient(135deg, rgba(25,22,18,0.95) 0%, rgba(15,13,10,0.98) 100%)",
  "special":       "linear-gradient(135deg, rgba(156,142,122,0.22) 0%, rgba(15,13,10,0.88) 100%)",
};

const FALLBACK_FOOD_REEL = [
  IMAGES.jollof, IMAGES.starter, IMAGES.pepperSoup, IMAGES.noodles,
  IMAGES.pasta, IMAGES.photo1, IMAGES.photo2, IMAGES.food3,
  IMAGES.food4, IMAGES.food5, IMAGES.food7,
  IMAGES.food12, IMAGES.food13, IMAGES.food14, IMAGES.food15, IMAGES.food16,
];

export default function Home() {
  const [heroImage, setHeroImage] = useState("/heroimage.png");
  const [foodReel, setFoodReel] = useState(FALLBACK_FOOD_REEL);
  const [kitchenSlide, setKitchenSlide] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setKitchenSlide(prev => (prev + 1) % KITCHEN_IMAGES.length);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    async function loadDynamic() {
      try {
        // Hero image from site_content
        const { data: heroRow } = await supabase
          .from("site_content")
          .select("data")
          .eq("section", "hero")
          .maybeSingle();
        if (heroRow?.data?.image) setHeroImage(heroRow.data.image);

        // Food reel from media_assets
        const { data: reelAssets } = await supabase
          .from("media_assets")
          .select("url")
          .eq("used_in", "home-food-reel")
          .order("uploaded_at", { ascending: true });
        if (reelAssets?.length) setFoodReel(reelAssets.map((a) => a.url));
      } catch {}
    }
    loadDynamic();
  }, []);
  return (
    <div className="page-enter">
      {/* HERO */}
      <section className="relative h-screen min-h-[580px] md:min-h-[720px] w-full overflow-hidden" data-testid="hero-section">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="BlackRock Restaurant dining room"
            className="w-full h-full object-cover ken-burns"
          />
          {/* Strong layered overlays for legibility */}
          <div className="absolute inset-0 bg-[var(--charcoal)]/75" />
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--charcoal)]/50 via-[var(--charcoal)]/60 to-[var(--charcoal)]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--charcoal)] via-[var(--charcoal)]/80 to-[var(--charcoal)]/40" />
        </div>
        <div className="relative z-10 h-full flex flex-col justify-center px-4 md:px-16 max-w-[1440px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.1, delay: 0.5 }}
            className="mb-3"
          >
            <BrandMark variant="dark" size="hero" />
          </motion.div>
          <motion.span
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.7 }}
            className="gold-line left mb-8"
          >
            Restaurant · Lounge · Rooftop
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.9 }}
            className="font-serif-display text-[var(--warm-white)] text-3xl sm:text-4xl md:text-6xl lg:text-7xl leading-[1.05] max-w-4xl drop-shadow-[0_4px_24px_rgba(0,0,0,0.7)]"
          >
            Where exceptional food<br />
            meets beautiful ambience,<br />
            <span className="font-serif-italic text-[var(--gold)]">and every meal feels like home.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 1.05 }}
            className="text-white/85 text-base md:text-lg font-light max-w-xl mt-8 leading-relaxed drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]"
          >
            A restaurant and rooftop lounge in the heart of Ikeja. Quality ingredients, exceptional service, and a space where every guest feels valued.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 1.25 }}
            className="flex flex-col sm:flex-row gap-4 mt-10"
          >
            <Link to="/reservations" className="btn-burgundy" data-testid="hero-reserve">
              <span>Reserve a Table</span>
              <ArrowRight size={14} />
            </Link>
            <Link to="/menu" className="btn-outline-gold" data-testid="hero-menu">
              <span>View Menu</span>
            </Link>
          </motion.div>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 hidden md:flex flex-col items-center gap-3">
          <span className="text-xs text-white/50 uppercase tracking-[0.32em]">Scroll</span>
          <div className="w-px h-12 bg-white/30 relative overflow-hidden">
            <motion.div
              animate={{ y: [-48, 48] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-0 left-0 w-full h-6 bg-[var(--gold)]"
            />
          </div>
        </div>
      </section>

      {/* FOOD SHOWCASE */}
      <section className="bg-[var(--charcoal)] py-20 md:py-28 overflow-hidden" data-testid="brand-statement">
        {/* Header */}
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 text-center mb-12">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="gold-line mb-6"
          >
            On The Table
          </motion.span>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, delay: 0.2 }}
            className="font-serif-display text-2xl md:text-4xl text-[var(--warm-white)] mt-5 leading-snug"
          >
            Great food deserves
            <span className="font-serif-italic text-[var(--burgundy)]"> a great experience.</span>
          </motion.p>
        </div>

        {/* Marquee strip - same as Instagram section */}
        <div className="overflow-hidden">
          <div className="flex marquee gap-3 w-max">
            {[...foodReel, ...foodReel].map((src, i) => (
              <div key={i} className="img-hover w-[160px] h-[160px] md:w-[240px] md:h-[240px] flex-shrink-0">
                <img src={src} alt="BlackRock dish" loading="lazy" />
              </div>
            ))}
          </div>
        </div>

        {/* CTAs */}
        <div className="max-w-[1440px] mx-auto px-6 md:px-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mt-12"
          >
            <Link to="/menu" className="btn-burgundy">
              <span>Explore Full Menu</span>
              <ArrowRight size={14} />
            </Link>
            <Link to="/reservations" className="btn-outline-gold">
              <span>Reserve a Table</span>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* OCCASIONS PREVIEW */}
      <section className="bg-[var(--charcoal)] py-24 md:py-32" data-testid="occasions-preview">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12">
          <SectionHeader
            kicker="Made for moments"
            title="Every night, a different kind of evening."
            subtitle="From quiet date nights to private dining for twenty. Tell us why you're coming, and we'll build the night around it."
          />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5 mt-10 md:mt-16">
            {occasionPreview.map((o, i) => (
              <motion.div
                key={o.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, delay: i * 0.08 }}
              >
                <Link
                  to={`/reservations?occasion=${o.id}`}
                  className="occasion-card block h-full"
                  style={{ background: OCCASION_TINTS[o.id] }}
                  data-testid={`occasion-preview-${o.id}`}
                >
                  <div className="text-xs uppercase tracking-[0.3em] opacity-60 mb-4">0{i + 1}</div>
                  <h3 className="font-serif-display text-2xl md:text-3xl mb-3">{o.label}</h3>
                  <p className="text-sm leading-relaxed opacity-75">{o.note}</p>
                  <div className="mt-8 inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em] opacity-90">
                    Reserve <ArrowRight size={14} />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SIGNATURE EXPERIENCE - SPLIT */}
      <section className="bg-[var(--charcoal)] py-24 md:py-36" data-testid="signature-section">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Crossfade image carousel */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.9 }}
            className="relative aspect-[4/5] overflow-hidden order-2 lg:order-1"
          >
            {KITCHEN_IMAGES.map((img, i) => (
              <img
                key={img.src}
                src={img.src}
                alt={img.alt}
                className="absolute inset-0 w-full h-full object-cover"
                style={{
                  opacity: kitchenSlide === i ? 1 : 0,
                  transition: "opacity 0.8s ease-in-out",
                }}
              />
            ))}
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.9 }}
            className="order-1 lg:order-2"
          >
            <span className="gold-line left mb-6">The Kitchen</span>
            <h2 className="font-serif-display text-4xl md:text-5xl lg:text-6xl leading-tight mt-6 text-[var(--warm-white)]">
              From Mile 12 to
              <br />
              <span className="font-serif-italic text-[var(--burgundy)]">your table.</span>
            </h2>
            <p className="text-[var(--muted)] text-base md:text-lg leading-relaxed mt-8 max-w-xl font-light">
              Jollof smoked over open fire. Pepper soup that clears the head.
              Goat that falls off the bone. Suya the way Sabo intended.
              Our menu is a tour of Nigeria, cooked with respect, plated with pride.
            </p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="mt-8 grid grid-cols-3 gap-4 md:gap-6 max-w-md"
            >
              <div>
                <div className="font-serif-display text-4xl text-[var(--burgundy)]">85+</div>
                <div className="text-xs uppercase tracking-[0.22em] text-[var(--muted)] mt-1">Dishes On Menu</div>
              </div>
              <div>
                <div className="font-serif-display text-4xl text-[var(--burgundy)]">100%</div>
                <div className="text-xs uppercase tracking-[0.22em] text-[var(--muted)] mt-1">Local Sourced</div>
              </div>
              <div>
                <div className="font-serif-display text-xl leading-tight text-[var(--burgundy)]">Every Guest,<br />Remembered</div>
                <div className="text-xs uppercase tracking-[0.22em] text-[var(--muted)] mt-1">Our Promise</div>
              </div>
            </motion.div>
            <Link to="/menu" className="btn-ghost-dark mt-12 inline-flex" data-testid="explore-menu-link">
              Explore the Menu <ArrowRight size={14} />
            </Link>
          </motion.div>

        </div>
      </section>

      {/* TWO SPACES */}
      <section className="bg-[var(--charcoal)] text-[var(--warm-white)] py-24 md:py-36 grain relative" data-testid="three-spaces">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12">
          <SectionHeader
            kicker="Two Spaces, One Address"
            title="Choose your evening."
            subtitle="A restaurant downstairs, a rooftop lounge above. Two moods, one destination."
            dark
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-20">
            {[
              { img: IMAGES.interior1, name: "The Restaurant", desc: "Continental and traditional. White linen, warm light, full flavours.", floor: "Ground Floor" },
              { img: IMAGES.rooftopNight, name: "The Rooftop Lounge", desc: "Open sky, the Ikeja skyline around you. Good company, longer pours, the night stretches.", floor: "Rooftop" },
            ].map((s, i) => (
              <motion.div
                key={s.name}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.8, delay: i * 0.15 }}
                whileHover={{ y: -6, transition: { duration: 0.3 } }}
                className="group relative"
                data-testid={`space-${s.floor.toLowerCase().replace(" ", "-")}`}
              >
                <div className="img-hover aspect-[3/4]">
                  <img src={s.img} alt={s.name} loading="lazy" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-8">
                  <div className="text-xs uppercase tracking-[0.3em] text-[var(--gold)] mb-3">{s.floor}</div>
                  <h3 className="font-serif-display text-3xl md:text-4xl mb-3">{s.name}</h3>
                  <p className="text-sm text-white/70 leading-relaxed font-light">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section className="bg-[var(--charcoal-soft)] py-24 md:py-36" data-testid="testimonial-section">
        <div className="max-w-4xl mx-auto px-6 md:px-12 text-center">
          <div className="flex justify-center gap-1 mb-8">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={16} className="text-[var(--gold)] fill-[var(--gold)]" />
            ))}
          </div>
          <motion.blockquote
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9 }}
            className="font-serif-italic text-3xl md:text-4xl lg:text-5xl leading-[1.25] text-[var(--warm-white)]"
          >
            "Best jollof in Ikeja, and I don't say that lightly. We came for dinner, stayed for the asun. Lagos at its finest."
          </motion.blockquote>
          <div className="mt-10 text-xs uppercase tracking-[0.32em] text-[var(--muted)]">
            Tomi A. · Google Review
          </div>
        </div>
      </section>

      {/* INSTAGRAM STRIP */}
      <section className="bg-[var(--charcoal)] py-20 overflow-hidden" data-testid="instagram-strip">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 mb-12">
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div>
              <span className="gold-line left">@theblackrock.lagos</span>
              <h3 className="font-serif-display text-3xl md:text-4xl mt-4">Lately, on the gram.</h3>
            </div>
            <a href="#" className="btn-ghost-dark hidden md:inline-flex">Follow Us <ArrowRight size={14} /></a>
          </div>
        </div>
        <div className="overflow-hidden">
          <div className="flex marquee gap-3 w-max">
            {[...IMAGES.ig, ...IMAGES.ig].map((src, i) => (
              <div key={i} className="img-hover w-[220px] h-[220px] md:w-[280px] md:h-[280px] flex-shrink-0">
                <img src={src} alt={`Instagram ${i}`} loading="lazy" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LOCATION / FIND US */}
      <section className="bg-[var(--charcoal)] text-[var(--warm-white)] pt-24 pb-0 md:pt-36 md:pb-0" data-testid="location-section">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.9 }}
          >
            <span className="gold-line left mb-6">Find Us</span>
            <h2 className="font-serif-display text-4xl md:text-5xl lg:text-6xl leading-tight mt-6">
              In the heart of
              <br />
              <span className="font-serif-italic text-[var(--gold)]">Ikeja.</span>
            </h2>
            <div className="mt-12 space-y-5">
              <div className="flex items-start gap-4">
                <MapPin size={18} className="text-[var(--gold)] mt-1" />
                <div>
                  <div className="text-xs uppercase tracking-[0.28em] text-white/60 mb-1">Address</div>
                  <div className="text-lg font-light">{BRAND.address}</div>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Phone size={18} className="text-[var(--gold)] mt-1" />
                <div>
                  <div className="text-xs uppercase tracking-[0.28em] text-white/60 mb-1">Reservations</div>
                  <a href={`tel:${BRAND.phoneTel}`} className="text-lg font-light hover:text-[var(--gold)]">{BRAND.phone}</a>
                </div>
              </div>
            </div>
            <div className="mt-12 flex flex-wrap gap-4">
              <Link to="/reservations" className="btn-outline-gold" data-testid="location-reserve">Reserve a Table</Link>
              <a href="https://maps.google.com/?q=11+Ajao+Road+Adeniyi+Jones+Ikeja+Lagos" target="_blank" rel="noopener noreferrer" className="btn-ghost-dark text-[var(--gold)] border-[var(--gold)]" style={{borderBottomColor: "var(--gold)", color: "var(--gold)"}}>
                Get Directions <ArrowRight size={14} />
              </a>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="img-hover aspect-square lg:aspect-[4/5]"
          >
            <iframe
              title="The BlackRock Location"
              src="https://maps.google.com/maps?q=6.6018,3.3515&z=17&t=m&output=embed"
              className="w-full h-full border-0"
              style={{ filter: "invert(92%) hue-rotate(180deg) saturate(0.85) brightness(0.9)" }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </motion.div>
        </div>
      </section>
    </div>
  );
}
