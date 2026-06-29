import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, Mail, MapPin, MessageCircle, Clock, Send, Check, ExternalLink } from "lucide-react";
import { BRAND } from "../lib/data";
import SectionHeader from "../components/SectionHeader";
import { supabase } from "../lib/supabase";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "", _hp: "" });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setSendError("");
    setSending(true);
    const { error } = await supabase.from("enquiries").insert({
      name: form.name,
      email: form.email,
      message: form.message,
      status: "new",
    });
    setSending(false);
    if (error) { setSendError("Something went wrong. Please try again or email us directly."); return; }

    // Auto-reply email + Telegram notification + message_id storage (all server-side)
    fetch("/api/send-enquiry-reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, email: form.email, message: form.message, _hp: form._hp }),
    }).catch(() => {});

    setSent(true);
    setForm({ name: "", email: "", message: "" });
    setTimeout(() => setSent(false), 8000);
  };

  return (
    <div className="page-enter pt-20 md:pt-28 lg:pt-36">
      {/* Header */}
      <section className="relative h-[420px] md:h-[520px] overflow-hidden flex items-center justify-center" data-testid="contact-header">
        <img src="/contactushero.jpg" alt="BlackRock dining room" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.75) 60%, rgba(0,0,0,0.88) 100%)" }} />
        <div className="relative z-10 text-center px-6 md:px-12">
          <span className="gold-line">Contact</span>
          <h1 className="font-serif-display text-3xl md:text-5xl lg:text-8xl leading-[0.95] mt-6 md:mt-8 text-[var(--warm-white)]" style={{ textShadow: "0 2px 12px rgba(0,0,0,0.8)" }}>
            Say <span className="font-serif-italic text-[var(--gold)]">hello.</span>
          </h1>
          <p className="text-white/70 mt-8 max-w-xl mx-auto font-light text-base md:text-lg" style={{ textShadow: "0 2px 12px rgba(0,0,0,0.8)" }}>
            We'll respond quickly. For everyday bookings, the phone is always faster.
          </p>
        </div>
      </section>

      {/* Contact methods */}
      <section className="bg-[var(--charcoal)] pt-12 md:pt-20" style={{ paddingBottom: "80px" }} data-testid="contact-methods">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { icon: Phone,         label: "Call",     value: "+234 903 048 2774", href: `tel:${BRAND.phoneTel}`,  tag: "Fastest", newTab: false, external: false, bg: "linear-gradient(135deg, #3d1a1a 0%, #1a0f0f 100%)", border: "rgba(120,50,50,0.35)",  fontSize: "1.1rem",  valueStyle: { fontFamily: "'Montserrat', sans-serif", fontWeight: 500, letterSpacing: "0.08em", wordBreak: "normal", overflowWrap: "break-word" } },
            { icon: MessageCircle, label: "WhatsApp", value: "Chat with a host",  href: BRAND.whatsapp,           tag: "Mobile",  newTab: true,  external: true,  bg: "linear-gradient(135deg, #2a2a1a 0%, #1a1a0f 100%)", border: "rgba(100,100,40,0.35)", fontSize: "1.25rem", valueStyle: { wordBreak: "normal",   overflowWrap: "break-word" } },
            { icon: Mail,          label: "Email",    value: BRAND.email,         href: `mailto:${BRAND.email}`,  tag: "Anytime", newTab: false, external: false, bg: "linear-gradient(135deg, #1a2a2a 0%, #0f1a1a 100%)", border: "rgba(40,100,100,0.35)", fontSize: "0.95rem", valueStyle: { whiteSpace: "nowrap",   overflow: "hidden",     textOverflow: "ellipsis" } },
            { icon: MapPin,        label: "Visit",    value: BRAND.address,       href: `https://maps.google.com/?q=${encodeURIComponent(BRAND.address)}`, tag: "Ikeja", newTab: true, external: false, bg: "linear-gradient(135deg, #1a1a2a 0%, #0f0f1a 100%)", border: "rgba(50,50,120,0.35)", fontSize: "1.1rem",  valueStyle: { wordBreak: "normal", overflowWrap: "break-word" } },
          ].map((c, i) => (
            <motion.a
              key={c.label}
              href={c.href}
              target={c.newTab ? "_blank" : undefined}
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.08 }}
              whileHover={{ y: -4, transition: { duration: 0.2, ease: "easeOut" } }}
              whileTap={{ scale: 0.98 }}
              className="block p-5 md:p-8 overflow-hidden"
              style={{ background: c.bg, border: `1px solid ${c.border}`, transition: "border-color 0.2s ease, box-shadow 0.2s ease" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#c8a96e"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(200,169,110,0.12)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = c.border; e.currentTarget.style.boxShadow = ""; }}
              data-testid={`contact-${c.label.toLowerCase()}`}
            >
              <div className="flex items-start justify-between mb-8">
                <c.icon size={22} className="text-[var(--gold)]" />
                <div className="flex items-center gap-2">
                  {c.external && <ExternalLink size={12} className="text-[var(--gold)] opacity-60" />}
                  <span className="uppercase tracking-[0.28em] opacity-50" style={{ fontSize: "0.7rem" }}>{c.tag}</span>
                </div>
              </div>
              <div className="uppercase tracking-[0.28em] opacity-60 mb-2" style={{ fontSize: "0.7rem" }}>{c.label}</div>
              <div className="font-serif-display leading-snug" style={{ fontSize: c.fontSize, ...c.valueStyle }}>{c.value}</div>
            </motion.a>
          ))}
        </div>
      </section>

      {/* Hours + Form */}
      <section className="bg-[var(--charcoal-soft)] pt-16 pb-24 md:pt-20 md:pb-32" data-testid="contact-form-section">
        <div className="max-w-[1200px] mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-12 gap-16">
          {/* Hours */}
          <div className="lg:col-span-5">
            <div className="p-8 md:p-10" style={{ background: "linear-gradient(135deg, #1e1c18 0%, #161410 100%)", border: "1px solid rgba(200,169,110,0.4)" }}>
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
                Last orders at 10:30 PM. The bar runs a little longer. Always.
              </div>
            </div>
            </div>
          </div>

          {/* Form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-7"
          >
            <div className="p-8 md:p-10" style={{ background: "linear-gradient(135deg, #1e1c18 0%, #161410 100%)", border: "1px solid rgba(200,169,110,0.4)" }}>
            <span className="gold-line left">Send a Note</span>
            <h2 className="font-serif-display text-4xl md:text-5xl mt-6 text-[var(--warm-white)]">
              General <span className="font-serif-italic text-[var(--gold)]">enquiries.</span>
            </h2>
            <p className="text-[var(--muted)] mt-4 font-light">
              Press, partnerships, private events, or just to say hello.
            </p>
            <AnimatePresence mode="wait">
              {sent ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="mt-10 p-8 border border-[var(--gold)]/30 bg-[var(--gold)]/5"
                  data-testid="contact-success"
                >
                  <Check size={22} className="text-[var(--gold)] mb-4" />
                  <p className="font-serif-display text-xl text-[var(--gold)] leading-snug">
                    Thank you for reaching out. We will get back to you shortly.
                  </p>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  onSubmit={submit}
                  className="mt-10 space-y-8"
                  data-testid="contact-form"
                >
                  {/* Honeypot — hidden from real users, bots fill it automatically */}
                  <div style={{ position: "absolute", left: "-9999px", top: "-9999px", width: 1, height: 1, overflow: "hidden" }} aria-hidden="true">
                    <label>Leave this empty</label>
                    <input
                      type="text"
                      name="website"
                      tabIndex="-1"
                      autoComplete="off"
                      value={form._hp}
                      onChange={(e) => setForm({ ...form, _hp: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="tbr-label">Name</label>
                      <input
                        required
                        className="tbr-input-box"
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
                        className="tbr-input-box"
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
                      className="tbr-input-box"
                      placeholder="Tell us what you're thinking..."
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      data-testid="contact-input-message"
                    />
                  </div>
                  {sendError && (
                    <p className="text-sm text-red-400/80 border border-red-400/20 bg-red-400/5 px-4 py-3" data-testid="contact-error">
                      Something went wrong. Please try again or call us directly.
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={sending}
                    className="btn-burgundy"
                    data-testid="contact-submit"
                  >
                    {sending ? <span>Sending...</span> : <><Send size={14} /><span>Send Message</span></>}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Map */}
      <section className="bg-[var(--charcoal)]" data-testid="contact-map">
        <div className="w-full h-[280px] md:h-[450px] lg:h-[560px]">
          <iframe
            title="The BlackRock Location"
            src="https://maps.google.com/maps?q=6.6018,3.3515&z=17&t=m&output=embed"
            className="w-full h-full border-0"
            style={{ filter: "invert(92%) hue-rotate(180deg) saturate(0.85) brightness(0.9)" }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </section>
    </div>
  );
}
