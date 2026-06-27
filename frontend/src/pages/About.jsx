import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { IMAGES } from "../lib/data";
import SectionHeader from "../components/SectionHeader";

const values = [
  { num: "01", title: "Roots on the plate", body: "Every dish traces back to a Nigerian market, a family kitchen, a recipe passed down without being written. We cook with memory and intention, not just ingredients." },
  { num: "02", title: "Hospitality with soul", body: "We believe in you — your name, your mood, your unspoken need for a glass of water that arrives before you ask. You are considered before you walk in, attended to while you sit with us, and remembered long after you leave. Because to us, a guest is not a number. A guest is someone we get to take care of." },
  { num: "03", title: "A room that was thought about", body: "The light falls softly — so everyone looks like they do on their best day. The music breathes with the room; it knows when to step forward and when to fade into the background. The table is set so you can lean in, laugh without strain, and stay longer than you planned. Nothing here is accidental. Every detail was chosen carefully to make you feel welcomed." },
];

const reveal = (y = 24, delay = 0, duration = 0.7) => ({
  initial: { opacity: 0, y },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration, delay, ease: "easeOut" },
});

export default function About() {
  return (
    <div className="page-enter">
      {/* Hero */}
      <section className="relative h-[50vh] md:h-[65vh] min-h-[320px] overflow-hidden" data-testid="about-hero">
        <img src="/heroimage.png" alt="" className="w-full h-full object-cover object-center" />
        <div className="absolute inset-0 bg-black/55" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="font-serif-display text-[var(--warm-white)] text-3xl md:text-6xl lg:text-8xl leading-[0.95]"
          >
            Cut from <span className="font-serif-italic text-[var(--gold)]">black rock.</span>
          </motion.h1>
        </div>
      </section>

      {/* Brand story */}
      <section className="bg-[var(--charcoal)] py-24 md:py-36" data-testid="opening-statement">
        <div className="max-w-[680px] mx-auto px-6 md:px-12">
          <motion.p
            {...reveal(32, 0, 0.9)}
            className="font-serif-display text-[1.5rem] md:text-[2rem] leading-snug text-[var(--warm-white)] text-center"
            style={{ marginBottom: 32 }}
          >
            BlackRock was born from a simple realization:
            <span className="font-serif-italic text-[var(--gold)]"> Great food deserves a great experience.</span>
          </motion.p>

          <div className="space-y-8" style={{ fontSize: "1.05rem", lineHeight: 1.85, color: "rgba(255,255,255,0.75)", fontWeight: 300 }}>
            <motion.p {...reveal(24, 0)}>
              Our founder, Mr. Shegun Ogunsanya, traveled across different countries and dined in numerous restaurants. During those experiences, he discovered something remarkable. Many of the so-called international dishes were not necessarily better than the rich, flavorful meals we enjoy here at home. What often made the difference was the environment, the professionalism of the service, the ambience, and the attention to detail that made every guest feel valued.
            </motion.p>
            <motion.p {...reveal(24, 0.15)}>
              Inspired by this insight, BLACKROCK was created to offer the very best of both worlds: delicious local and continental cuisine served in a welcoming, elegant environment with exceptional customer service.
            </motion.p>
            <motion.p {...reveal(24, 0.3)}>
              At BLACKROCK, we believe that quality food begins with quality ingredients. Every meal is prepared using carefully selected natural ingredients, free from artificial additives, colors, and preservatives. Our ingredients are professionally sourced, tested, and transformed into memorable meals by trained culinary professionals in a well-organized kitchen.
            </motion.p>
            <motion.p {...reveal(24, 0.45)}>
              We are passionate about serving food that not only tastes exceptional but also supports the health and well-being of our guests. Generous portions, affordable pricing, and uncompromising quality are at the heart of everything we do.
            </motion.p>
            <motion.p {...reveal(24, 0.6)}>
              Whether you're dining with family, friends, colleagues, or simply treating yourself, BLACKROCK is a place where great food, excellent service, and a remarkable dining experience come together.
            </motion.p>
          </div>

          <motion.div
            {...reveal(20, 0.3, 0.9)}
            className="mt-16 pt-12 border-t border-[var(--gold)]/20 text-center"
          >
            <p className="font-serif-display text-2xl md:text-3xl lg:text-4xl text-[var(--warm-white)] leading-snug">
              Clean food. Natural ingredients.<br />
              <span className="font-serif-italic text-[var(--gold)]">Exceptional experience.</span>
            </p>
            <p className="text-[var(--muted)] text-sm uppercase tracking-[0.3em] mt-6">That's the BLACKROCK promise.</p>
          </motion.div>
        </div>
      </section>

      {/* Two spaces detailed */}
      <section className="bg-[var(--charcoal-soft)] pt-24 pb-24 md:pt-28 md:pb-28" data-testid="three-spaces-about">
        {/* Heading */}
        <div className="max-w-[1440px] mx-auto px-6 md:px-12" style={{ marginBottom: 40 }}>
          <SectionHeader
            kicker="Two Spaces"
            title="One destination, two moods."
            align="left"
          />
        </div>

        {/* Panels */}
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12, padding: "0 24px" }}>
          {[
            { img: "/restaurant-interior.jpg", name: "The Restaurant",     floor: "Ground Floor", desc: "White linen, warm light, an open kitchen. Continental, traditional, and everything in between. From grilled T-bone to ofada and ayamase. The night begins here.", imgLeft: true,  num: "01" },
            { img: "/rooftop.jpg",             name: "The Rooftop Lounge", floor: "Rooftop",      desc: "Open to the sky. The Ikeja skyline curling around you. Smaller plates, longer pours, conversations that stretch into morning.",                              imgLeft: false, num: "02" },
          ].map((s) => (
            <div key={s.name} className="flex flex-col md:flex-row" style={{ height: 420 }}>

              {/* Image */}
              <motion.div
                {...reveal(30, 0, 0.9)}
                style={{ order: s.imgLeft ? 0 : 1, overflow: "hidden", flexShrink: 0 }}
                className="w-full md:w-[55%] h-[260px] md:h-full"
              >
                <img
                  src={s.img}
                  alt={s.name}
                  loading="lazy"
                  style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", display: "block" }}
                />
              </motion.div>

              {/* Text */}
              <motion.div
                {...reveal(24, 0.15)}
                style={{
                  order: s.imgLeft ? 1 : 0,
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "flex-start",
                  padding: "48px",
                  background: "var(--charcoal)",
                  height: "100%",
                }}
                className="p-8 md:p-12"
              >
                <span className="gold-line left">{s.floor}</span>
                <h3 className="font-serif-display text-3xl md:text-4xl lg:text-5xl mt-6 text-[var(--warm-white)]">
                  {s.name}
                </h3>
                <p className="text-[var(--muted)] text-sm md:text-base leading-relaxed mt-5 font-light" style={{ maxWidth: 380 }}>
                  {s.desc}
                </p>
                <div className="mt-8 flex items-center gap-3">
                  <div className="font-serif-display text-4xl text-[var(--burgundy)] leading-none">{s.num}</div>
                  <div className="w-8 h-px bg-[var(--gold)]" />
                  <div className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Open Daily from 10:00 AM</div>
                </div>
              </motion.div>
            </div>
          ))}
        </div>
      </section>

      {/* Values */}
      <section className="bg-[var(--charcoal)] text-[var(--warm-white)] pt-20 pb-16 grain" data-testid="values-section">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12">
          <SectionHeader kicker="Our Philosophy" title="What We Hold Dear." dark />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 mt-16">
            {values.map((v, i) => (
              <motion.div
                key={v.num}
                {...reveal(30, i * 0.12)}
                className="border-l border-[var(--gold)]/30 pl-8"
              >
                <div className="font-serif-display text-6xl text-[var(--gold)] leading-none">{v.num}</div>
                <h4 className="mt-6" style={{ fontSize: "1.15rem", fontWeight: 600, color: "var(--warm-white)" }}>{v.title}</h4>
                <p className="text-white/65 font-light mt-4" style={{ fontSize: "0.95rem", lineHeight: 1.8 }}>{v.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof numbers */}
      <section className="bg-[var(--charcoal)] py-20" data-testid="social-proof">
        <div className="max-w-[1200px] mx-auto px-6 md:px-12 grid grid-cols-2 md:grid-cols-4 gap-10 text-center">
          {[
            { n: "4.2", l: "Customer Rating" },
            { n: "255+", l: "Reviews" },
            { n: "85+", l: "Dishes on Menu" },
            { n: "2", l: "Floors of Experience" },
          ].map((s, i) => (
            <motion.div key={s.l} {...reveal(20, i * 0.1, 0.6)}>
              <div className="font-serif-display text-5xl md:text-6xl text-[var(--burgundy)]">{s.n}</div>
              <div className="text-xs uppercase tracking-[0.28em] text-[var(--muted)] mt-3">{s.l}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="bg-[var(--burgundy)] text-[var(--warm-white)] py-24 md:py-32 grain relative" data-testid="about-cta">
        <motion.div
          {...reveal(24, 0, 0.9)}
          className="max-w-3xl mx-auto px-6 md:px-12 text-center relative z-10"
        >
          <span className="gold-line mb-8">Reserve</span>
          <h2 className="font-serif-display text-4xl md:text-6xl leading-tight mt-6">
            Come see for yourself.
          </h2>
          <p className="text-white/80 mt-8 max-w-xl mx-auto font-light text-lg">
            Open daily from 10:00 AM. The good tables go quickly.
          </p>
          <motion.div {...reveal(16, 0.2)} className="mt-12">
            <Link
              to="/reservations"
              style={{
                display: "inline-flex", alignItems: "center", gap: 10,
                background: "#c8a96e", color: "#1a1612",
                padding: "16px 40px",
                fontSize: "0.85rem", fontWeight: 600,
                letterSpacing: "0.1em", textTransform: "uppercase",
                fontFamily: "'Montserrat', sans-serif",
                textDecoration: "none",
              }}
            >
              Reserve a Table <ArrowRight size={14} />
            </Link>
          </motion.div>
        </motion.div>
      </section>
    </div>
  );
}
