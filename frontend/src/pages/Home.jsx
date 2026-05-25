import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Star, MapPin, Phone } from "lucide-react";
import { IMAGES, BRAND, OCCASIONS } from "../lib/data";
import SectionHeader from "../components/SectionHeader";
import BrandMark from "../components/BrandMark";

const occasionPreview = OCCASIONS.slice(0, 4);

export default function Home() {
  return (
    <div className="page-enter">
      {/* HERO */}
      <section className="relative h-screen min-h-[580px] md:min-h-[720px] w-full overflow-hidden" data-testid="hero-section">
        <div className="absolute inset-0">
          <img
            src={IMAGES.heroRooftop}
            alt="The BlackRock rooftop"
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
            className="font-serif-display text-[var(--warm-white)] text-3xl sm:text-4xl md:text-6xl lg:text-7xl leading-[0.95] max-w-4xl drop-shadow-[0_4px_24px_rgba(0,0,0,0.7)]"
          >
            Lagos,<br />
            <span className="font-serif-italic text-[var(--gold)]">served right.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 1.05 }}
            className="text-white/85 text-base md:text-lg font-light max-w-xl mt-8 leading-relaxed drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]"
          >
            A restaurant, lounge and rooftop in the soul of Ikeja — where
            good food meets candlelight, and every evening tastes like home.
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
      <section className="bg-[var(--warm-white)] py-20 md:py-28 overflow-hidden" data-testid="brand-statement">
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
            className="font-serif-display text-2xl md:text-4xl text-[var(--charcoal)] mt-5 leading-snug"
          >
            We built BlackRock for Lagos —
            <span className="font-serif-italic text-[var(--burgundy)]"> for nights that take their time.</span>
          </motion.p>
        </div>

        {/* Marquee strip — same as Instagram section */}
        <div className="overflow-hidden">
          <div className="flex marquee gap-3 w-max">
            {[
              IMAGES.jollof, IMAGES.starter, IMAGES.pepperSoup, IMAGES.noodles,
              IMAGES.pasta, IMAGES.photo1, IMAGES.photo2, IMAGES.food3,
              IMAGES.food4, IMAGES.food5, IMAGES.food7,
              IMAGES.food12, IMAGES.food13,
              IMAGES.food14, IMAGES.food15, IMAGES.food16,
              IMAGES.jollof, IMAGES.starter, IMAGES.pepperSoup, IMAGES.noodles,
              IMAGES.pasta, IMAGES.photo1, IMAGES.photo2, IMAGES.food3,
              IMAGES.food4, IMAGES.food5, IMAGES.food7,
              IMAGES.food12, IMAGES.food13,
              IMAGES.food14, IMAGES.food15, IMAGES.food16,
            ].map((src, i) => (
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
      <section className="bg-[var(--cream)] py-24 md:py-32" data-testid="occasions-preview">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12">
          <SectionHeader
            kicker="Made for moments"
            title="Every night, a different kind of evening."
            subtitle="From quiet date nights to private dining for twenty — tell us why you're coming, and we'll build the night around it."
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
      <section className="bg-[var(--warm-white)] py-24 md:py-36" data-testid="signature-section">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.9 }}
            className="img-hover aspect-[4/5] order-2 lg:order-1"
          >
            <img src={IMAGES.jollof} alt="Signature plate" loading="lazy" />
          </motion.div>
          <div className="order-1 lg:order-2">
            <span className="gold-line left mb-6">The Kitchen</span>
            <h2 className="font-serif-display text-4xl md:text-5xl lg:text-6xl leading-tight mt-6 text-[var(--charcoal)]">
              From Mile 12 to
              <br />
              <span className="font-serif-italic text-[var(--burgundy)]">your table.</span>
            </h2>
            <p className="text-[var(--muted)] text-base md:text-lg leading-relaxed mt-8 max-w-xl font-light">
              Jollof smoked over open fire. Pepper soup that clears the head.
              Goat that falls off the bone. Suya the way Sabo intended.
              Our menu is a tour of Nigeria — cooked with respect, plated with pride.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-4 md:gap-6 max-w-md">
              <div>
                <div className="font-serif-display text-4xl text-[var(--burgundy)]">85+</div>
                <div className="text-xs uppercase tracking-[0.22em] text-[var(--muted)] mt-1">Dishes On Menu</div>
              </div>
              <div>
                <div className="font-serif-display text-4xl text-[var(--burgundy)]">100%</div>
                <div className="text-xs uppercase tracking-[0.22em] text-[var(--muted)] mt-1">Local Sourced</div>
              </div>
              <div>
                <div className="font-serif-display text-4xl text-[var(--burgundy)]">36</div>
                <div className="text-xs uppercase tracking-[0.22em] text-[var(--muted)] mt-1">States Represented</div>
              </div>
            </div>
            <Link to="/menu" className="btn-ghost-dark mt-12 inline-flex" data-testid="explore-menu-link">
              Explore the Menu <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* THREE SPACES */}
      <section className="bg-[var(--charcoal)] text-[var(--warm-white)] py-24 md:py-36 grain relative" data-testid="three-spaces">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12">
          <SectionHeader
            kicker="Three Spaces, One Address"
            title="Choose your evening."
            subtitle="Each floor speaks in its own language. Pick the one that matches your mood."
            dark
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20">
            {[
              { img: IMAGES.interior1, name: "The Restaurant", desc: "Continental and traditional. White linen, warm light, full flavours.", floor: "Ground" },
              { img: IMAGES.bar, name: "The Bush Bar", desc: "Pepper soup, palm wine, asun off the grill — Lagos turnt up.", floor: "First Floor" },
              { img: IMAGES.rooftopNight, name: "The Rooftop", desc: "Open sky, Ikeja skyline, fire pits, the night stretches long.", floor: "Top" },
            ].map((s, i) => (
              <motion.div
                key={s.name}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.8, delay: i * 0.15 }}
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
      <section className="bg-[var(--cream)] py-24 md:py-36" data-testid="testimonial-section">
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
            className="font-serif-italic text-3xl md:text-4xl lg:text-5xl leading-[1.25] text-[var(--charcoal)]"
          >
            "Best jollof in Ikeja — and I don't say that lightly. We came for dinner, stayed for the asun. Lagos at its finest."
          </motion.blockquote>
          <div className="mt-10 text-xs uppercase tracking-[0.32em] text-[var(--muted)]">
            Tomi A. · Google Review
          </div>
        </div>
      </section>

      {/* INSTAGRAM STRIP */}
      <section className="bg-[var(--warm-white)] py-20 overflow-hidden" data-testid="instagram-strip">
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
      <section className="bg-[var(--charcoal)] text-[var(--warm-white)] py-24 md:py-36" data-testid="location-section">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="gold-line left mb-6">Find Us</span>
            <h2 className="font-serif-display text-4xl md:text-5xl lg:text-6xl leading-tight mt-6">
              In the heart of
              <br />
              <span className="font-serif-italic text-[var(--gold)]">Ikeja GRA.</span>
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
              <a href="https://maps.google.com/?q=Ikeja+GRA+Lagos" target="_blank" rel="noopener noreferrer" className="btn-ghost-dark text-[var(--gold)] border-[var(--gold)]" style={{borderBottomColor: "var(--gold)", color: "var(--gold)"}}>
                Get Directions <ArrowRight size={14} />
              </a>
            </div>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="img-hover aspect-square lg:aspect-[4/5]"
          >
            <iframe
              title="The BlackRock Location"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3963.0!2d3.3441!3d6.6019!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sIkeja+GRA+Lagos!5e0!3m2!1sen!2sng!4v0000000000"
              className="w-full h-full border-0 grayscale contrast-110"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </motion.div>
        </div>
      </section>
    </div>
  );
}
