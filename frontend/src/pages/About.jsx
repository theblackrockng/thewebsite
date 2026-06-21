import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { IMAGES } from "../lib/data";
import SectionHeader from "../components/SectionHeader";

const values = [
  { num: "01", title: "Lagos on the plate", body: "Every dish on our menu traces back to a Nigerian market, a family kitchen, or a roadside that taught us how it should taste." },
  { num: "02", title: "Hospitality with intention", body: "We don't believe in standard. Every guest, every table, every greeting, considered." },
  { num: "03", title: "A room that listens", body: "Acoustics built so you can hear your dinner companion. Lighting that flatters everyone. Music that knows when to lift." },
];

export default function About() {
  return (
    <div className="page-enter">
      {/* Hero */}
      <section className="relative h-[70vh] min-h-[480px] overflow-hidden" data-testid="about-hero">
        <img src={IMAGES.interior2} alt="" className="w-full h-full object-cover ken-burns" />
        <div className="absolute inset-0 bg-[var(--charcoal)]/55" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          <motion.span
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="gold-line mb-6"
          >
            Our Story
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.7 }}
            className="font-serif-display text-[var(--warm-white)] text-3xl md:text-6xl lg:text-8xl leading-[0.95]"
          >
            Cut from <span className="font-serif-italic text-[var(--gold)]">black rock.</span>
          </motion.h1>
        </div>
      </section>

      {/* Brand story */}
      <section className="bg-[var(--charcoal)] py-24 md:py-36" data-testid="opening-statement">
        <div className="max-w-3xl mx-auto px-6 md:px-12">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="font-serif-display text-3xl md:text-4xl lg:text-5xl leading-[1.2] text-[var(--warm-white)] text-center mb-16"
          >
            BlackRock was born from a simple realization:
            <span className="font-serif-italic text-[var(--gold)]"> great food deserves a great experience.</span>
          </motion.p>
          <div className="space-y-8 text-[var(--muted)] text-base md:text-lg leading-relaxed font-light">
            <motion.p initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.1 }}>
              Our founder, Mr. Shegun Ogunsanya, traveled across different countries and dined in numerous restaurants. During those experiences, he discovered something remarkable. Many of the so-called international dishes were not necessarily better than the rich, flavorful meals we enjoy here at home. What often made the difference was the environment, the professionalism of the service, the ambience, and the attention to detail that made every guest feel valued.
            </motion.p>
            <motion.p initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.2 }}>
              Inspired by this insight, BLACKROCK was created to offer the very best of both worlds: delicious local and continental cuisine served in a welcoming, elegant environment with exceptional customer service.
            </motion.p>
            <motion.p initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.3 }}>
              At BLACKROCK, we believe that quality food begins with quality ingredients. Every meal is prepared using carefully selected natural ingredients, free from artificial additives, colors, and preservatives. Our ingredients are professionally sourced, tested, and transformed into memorable meals by trained culinary professionals in a well-organized kitchen.
            </motion.p>
            <motion.p initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.4 }}>
              We are passionate about serving food that not only tastes exceptional but also supports the health and well-being of our guests. Generous portions, affordable pricing, and uncompromising quality are at the heart of everything we do.
            </motion.p>
            <motion.p initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.5 }}>
              Whether you're dining with family, friends, colleagues, or simply treating yourself, BLACKROCK is a place where great food, excellent service, and a remarkable dining experience come together.
            </motion.p>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, delay: 0.6 }}
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
      <section className="bg-[var(--charcoal-soft)] py-24 md:py-36" data-testid="three-spaces-about">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12">
          <SectionHeader
            kicker="Two Spaces"
            title="One destination, two moods."
            align="left"
          />
          <div className="mt-16 space-y-24 md:space-y-32">
            {[
            { img: IMAGES.interior1, name: "The Restaurant", floor: "Ground Floor", desc: "White linen, warm light, an open kitchen. Continental, traditional, and everything in between. From grilled T-bone to ofada and ayamase. The night begins here.", reverse: false },
            { img: IMAGES.rooftopNight, name: "The Rooftop Lounge", floor: "Rooftop", desc: "Open to the sky. The Ikeja skyline curling around you. Smaller plates, longer pours, conversations that stretch into morning.", reverse: true },
            ].map((s, i) => (
              <div key={s.name} className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                <motion.div
                  initial={{ opacity: 0, x: s.reverse ? 30 : -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.9 }}
                  className={`img-hover aspect-[4/5] ${s.reverse ? "lg:order-2" : ""}`}
                >
                  <img src={s.img} alt={s.name} loading="lazy" />
                </motion.div>
                <div className={s.reverse ? "lg:order-1" : ""}>
                  <span className="gold-line left">{s.floor}</span>
                  <h3 className="font-serif-display text-4xl md:text-5xl lg:text-6xl mt-6 text-[var(--warm-white)]">
                    {s.name}
                  </h3>
                  <p className="text-[var(--muted)] text-base md:text-lg leading-relaxed mt-6 font-light max-w-lg">
                    {s.desc}
                  </p>
                  <div className="mt-10 flex items-center gap-3">
                    <div className="font-serif-display text-6xl text-[var(--burgundy)] leading-none">0{i + 1}</div>
                    <div className="w-12 h-px bg-[var(--gold)]" />
                    <div className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
                      Open Daily from 10:00 AM
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-[var(--charcoal)] text-[var(--warm-white)] py-24 md:py-36 grain" data-testid="values-section">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12">
          <SectionHeader kicker="Our Philosophy" title="What we hold dear." dark />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 mt-20">
            {values.map((v, i) => (
              <motion.div
                key={v.num}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: i * 0.12 }}
                className="border-l border-[var(--gold)]/30 pl-8"
              >
                <div className="font-serif-display text-6xl text-[var(--gold)] leading-none">{v.num}</div>
                <h4 className="font-serif-display text-2xl md:text-3xl mt-6">{v.title}</h4>
                <p className="text-white/65 text-base leading-relaxed font-light mt-4">{v.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof numbers */}
      <section className="bg-[var(--charcoal)] py-24" data-testid="social-proof">
        <div className="max-w-[1200px] mx-auto px-6 md:px-12 grid grid-cols-2 md:grid-cols-4 gap-10 text-center">
          {[
            { n: "4.9", l: "Google Rating" },
            { n: "1,800+", l: "Reviews" },
            { n: "48", l: "Seasonal Dishes" },
            { n: "2,400", l: "Bottles in Cellar" },
          ].map((s) => (
            <div key={s.l}>
              <div className="font-serif-display text-5xl md:text-6xl text-[var(--burgundy)]">{s.n}</div>
              <div className="text-xs uppercase tracking-[0.28em] text-[var(--muted)] mt-3">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="bg-[var(--burgundy)] text-[var(--warm-white)] py-24 md:py-32 grain relative" data-testid="about-cta">
        <div className="max-w-3xl mx-auto px-6 md:px-12 text-center relative z-10">
          <span className="gold-line mb-8">Reserve</span>
          <h2 className="font-serif-display text-4xl md:text-6xl leading-tight mt-6">
            Come see for yourself.
          </h2>
          <p className="text-white/80 mt-8 max-w-xl mx-auto font-light text-lg">
            Tables open six nights a week. The good ones go quickly.
          </p>
          <Link to="/reservations" className="btn-outline-gold mt-12 inline-flex" style={{ borderColor: "var(--gold)", color: "var(--gold)" }}>
            Reserve a Table <ArrowRight size={14} />
          </Link>
        </div>
      </section>
    </div>
  );
}
