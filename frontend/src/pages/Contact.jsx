import { useState } from "react";
import { motion } from "framer-motion";
import { Phone, Mail, MapPin, MessageCircle, Clock, Send, Check } from "lucide-react";
import { BRAND } from "../lib/data";
import SectionHeader from "../components/SectionHeader";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sent, setSent] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setForm({ name: "", email: "", message: "" });
    }, 4000);
  };

  return (
    <div className="page-enter pt-20 md:pt-28 lg:pt-36">
      {/* Header */}
      <section className="bg-[var(--charcoal)] pt-16 pb-12 md:pt-24" data-testid="contact-header">
        <div className="max-w-[1200px] mx-auto px-6 md:px-12 text-center">
          <span className="gold-line">Contact</span>
          <h1 className="font-serif-display text-3xl md:text-5xl lg:text-8xl leading-[0.95] mt-6 md:mt-8 text-[var(--warm-white)]">
            Say <span className="font-serif-italic text-[var(--gold)]">hello.</span>
          </h1>
          <p className="text-[var(--muted)] mt-8 max-w-xl mx-auto font-light text-base md:text-lg">
            We'll respond quickly. For tonight's bookings, the phone is always faster.
          </p>
        </div>
      </section>

      {/* Contact methods */}
      <section className="bg-[var(--charcoal)] py-12 md:py-20" data-testid="contact-methods">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { icon: Phone, label: "Call", value: <span>+234 805 523 8353<br />+234 903 048 2774</span>, href: `tel:${BRAND.phoneTel}`, tag: "Fastest" },
            { icon: MessageCircle, label: "WhatsApp", value: "Chat with a host", href: BRAND.whatsapp, tag: "Mobile" },
            { icon: Mail, label: "Email", value: BRAND.email, href: `mailto:${BRAND.email}`, tag: "Anytime" },
            { icon: MapPin, label: "Visit", value: BRAND.address, href: `https://maps.google.com/?q=${encodeURIComponent(BRAND.address)}`, tag: "Ikeja" },
          ].map((c, i) => (
            <motion.a
              key={c.label}
              href={c.href}
              target={c.icon === MessageCircle || c.icon === MapPin ? "_blank" : undefined}
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.08 }}
              className="block p-5 md:p-8 bg-[var(--charcoal-soft)] hover:bg-[var(--burgundy)] hover:text-[var(--warm-white)] transition-all duration-500 group border border-[var(--border-soft)] hover:border-[var(--burgundy)]"
              data-testid={`contact-${c.label.toLowerCase()}`}
            >
              <div className="flex items-start justify-between mb-8">
                <c.icon size={22} className="text-[var(--gold)] group-hover:text-[var(--warm-white)] transition-colors" />
                <span className="text-[10px] uppercase tracking-[0.28em] opacity-50">{c.tag}</span>
              </div>
              <div className="text-xs uppercase tracking-[0.28em] opacity-60 mb-2">{c.label}</div>
              <div className="font-serif-display text-lg md:text-2xl leading-snug">{c.value}</div>
            </motion.a>
          ))}
        </div>
      </section>

      {/* Hours + Form */}
      <section className="bg-[var(--charcoal-soft)] py-24 md:py-32" data-testid="contact-form-section">
        <div className="max-w-[1200px] mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-12 gap-16">
          {/* Hours */}
          <div className="lg:col-span-5">
            <span className="gold-line left">Opening Hours</span>
            <h2 className="font-serif-display text-4xl md:text-5xl mt-6 text-[var(--warm-white)]">
              When we're <span className="font-serif-italic text-[var(--gold)]">open.</span>
            </h2>
            <div className="mt-10 space-y-5">
              {BRAND.hours.map((h, i) => (
                <motion.div
                  key={h.day}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="flex items-baseline justify-between border-b border-[var(--border-soft)] pb-4"
                >
                  <div className="flex items-center gap-3">
                    <Clock size={14} className="text-[var(--gold)]" />
                    <div className="font-serif-display text-xl text-[var(--warm-white)]">{h.day}</div>
                  </div>
                  <div className="text-sm text-[var(--muted)] font-light">{h.time}</div>
                </motion.div>
              ))}
            </div>
            <div className="mt-10 p-6 bg-[var(--charcoal)] border-l-2 border-[var(--gold)]">
              <div className="text-xs uppercase tracking-[0.28em] text-[var(--gold)] mb-2">Kitchen closes</div>
              <div className="text-sm text-[var(--muted)] font-light leading-relaxed">
                Last orders 90 minutes before closing. The bar runs a little longer. Always.
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-7">
            <span className="gold-line left">Send a Note</span>
            <h2 className="font-serif-display text-4xl md:text-5xl mt-6 text-[var(--warm-white)]">
              General <span className="font-serif-italic text-[var(--gold)]">enquiries.</span>
            </h2>
            <p className="text-[var(--muted)] mt-4 font-light">
              Press, partnerships, private events, or just to say hello.
            </p>
            <form onSubmit={submit} className="mt-10 space-y-8" data-testid="contact-form">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="tbr-label">Name</label>
                  <input
                    required
                    className="tbr-input"
                    placeholder="Your name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    data-testid="contact-input-name"
                  />
                </div>
                <div>
                  <label className="tbr-label">Email</label>
                  <input
                    required
                    type="email"
                    className="tbr-input"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    data-testid="contact-input-email"
                  />
                </div>
              </div>
              <div>
                <label className="tbr-label">Message</label>
                <textarea
                  required
                  rows={5}
                  className="tbr-input resize-none"
                  placeholder="Tell us what you're thinking..."
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  data-testid="contact-input-message"
                />
              </div>
              <button
                type="submit"
                disabled={sent}
                className="btn-burgundy"
                data-testid="contact-submit"
              >
                {sent ? (<><Check size={14} /> <span>Sent. We'll be in touch</span></>) : (<><Send size={14} /> <span>Send Message</span></>)}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Map */}
      <section className="bg-[var(--charcoal)]" data-testid="contact-map">
        <div className="w-full h-[280px] md:h-[450px] lg:h-[560px]">
          <iframe
            title="The BlackRock Location"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3963.0!2d3.3441!3d6.6019!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sIkeja+GRA+Lagos!5e0!3m2!1sen!2sng!4v0000000000"
            className="w-full h-full border-0 grayscale contrast-110"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </section>
    </div>
  );
}
