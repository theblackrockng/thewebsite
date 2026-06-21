import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Phone, MessageCircle, X, ArrowRight, ArrowLeft } from "lucide-react";
import { OCCASIONS, BRAND, IMAGES } from "../lib/data";
import { supabase } from "../lib/supabase";

const today = new Date().toISOString().split("T")[0];

const timeSlots = [
  "5:00 PM", "5:30 PM", "6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM",
  "8:00 PM", "8:30 PM", "9:00 PM", "9:30 PM", "10:00 PM",
];

export default function Reservations() {
  const [searchParams] = useSearchParams();
  const initialOcc = searchParams.get("occasion") || "";
  const [step, setStep] = useState(initialOcc ? 2 : 1);
  const [occasion, setOccasion] = useState(initialOcc);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    date: today,
    time: "7:30 PM",
    party: 2,
    partyOther: "",
    special: "",
    // dynamic
    whoseBirthday: "",
    ageTurning: "",
    companyName: "",
    yearsAnniversary: "",
    celebratingWhat: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialOcc) setOccasion(initialOcc);
  }, [initialOcc]);

  const selectedOcc = OCCASIONS.find((o) => o.id === occasion);
  const isConcierge = selectedOcc?.concierge;

  const handleChange = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitting(true);

    const partyValue = form.party === "other" ? form.partyOther : form.party;
    const notes = [
      form.special,
      form.whoseBirthday && `Birthday person: ${form.whoseBirthday}`,
      form.ageTurning && `Turning: ${form.ageTurning}`,
      form.companyName && `Company: ${form.companyName}`,
      form.yearsAnniversary && `Years: ${form.yearsAnniversary}`,
      form.celebratingWhat && `Celebrating: ${form.celebratingWhat}`,
    ].filter(Boolean).join(" | ");

    const { error } = await supabase.from("reservations").insert({
      name: form.name,
      email: form.email,
      phone: form.phone,
      date: form.date,
      time: form.time,
      party: String(partyValue),
      occasion: selectedOcc?.label || occasion,
      notes: notes || null,
      status: "pending",
    });

    setSubmitting(false);
    if (error) { setSubmitError("Something went wrong. Please try again or call us directly."); return; }
    setSubmitted(true);
  };

  return (
    <div className="page-enter pt-20 md:pt-28 lg:pt-36">
      {/* Header */}
      <section className="bg-[var(--charcoal)] pt-12 pb-8 md:pt-20" data-testid="reservation-header">
        <div className="max-w-[1200px] mx-auto px-6 md:px-12 text-center">
          <span className="gold-line">Reserve</span>
          <h1 className="font-serif-display text-3xl md:text-5xl lg:text-8xl leading-[0.95] mt-6 md:mt-8 text-[var(--warm-white)]">
            Tell us about <span className="font-serif-italic text-[var(--gold)]">your night.</span>
          </h1>
          <p className="text-[var(--muted)] mt-8 max-w-xl mx-auto font-light text-base md:text-lg leading-relaxed">
            Every booking begins with an occasion. The night is shaped around it.
          </p>
        </div>
      </section>

      <section className="bg-[var(--charcoal)] pb-24 md:pb-32">
        <div className="max-w-[1200px] mx-auto px-6 md:px-12">
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-3 mb-10 md:mb-16">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-3">
                <div
                  className={`w-7 h-7 md:w-8 md:h-8 flex items-center justify-center text-xs tracking-wider transition-all ${
                    step >= s
                      ? "bg-[var(--gold)] text-[var(--charcoal)]"
                      : "bg-transparent border border-[var(--border-soft)] text-[var(--muted)]"
                  }`}
                >
                  {step > s ? <Check size={14} /> : s}
                </div>
                {s < 3 && <div className={`w-12 h-px ${step > s ? "bg-[var(--gold)]" : "bg-[var(--border-soft)]"}`} />}
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.5 }}
                data-testid="step-occasion"
              >
                <div className="text-center mb-12">
                  <h2 className="font-serif-display text-3xl md:text-4xl text-[var(--warm-white)]">
                    What are you celebrating?
                  </h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {OCCASIONS.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => { setOccasion(o.id); setStep(2); }}
                      className={`occasion-card text-left ${occasion === o.id ? "selected" : ""}`}
                      data-testid={`occasion-${o.id}`}
                    >
                      <h3 className="font-serif-display text-lg md:text-3xl mb-2">{o.label}</h3>
                      <p className="text-xs leading-relaxed opacity-70">{o.note}</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 2 && isConcierge && (
              <motion.div
                key="concierge"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                data-testid="step-concierge"
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                  <div className="img-hover aspect-[4/5]">
                    <img src={IMAGES.cocktail} alt="" loading="lazy" />
                  </div>
                  <div>
                    <span className="gold-line left">Concierge</span>
                    <h2 className="font-serif-display text-4xl md:text-5xl mt-6 text-[var(--warm-white)]">
                      This deserves a <span className="font-serif-italic text-[var(--gold)]">personal touch.</span>
                    </h2>
                    <p className="text-[var(--muted)] mt-6 leading-relaxed font-light text-base md:text-lg">
                      {selectedOcc.note} Speak with our host team. We'll arrange every detail, in private.
                    </p>
                    <div className="mt-10 space-y-3">
                      <a
                        href={`tel:${BRAND.phoneTel}`}
                        className="flex items-center justify-between p-5 border border-[var(--border-soft)] hover:border-[var(--gold)] transition-colors group"
                        data-testid="concierge-call"
                      >
                        <div className="flex items-center gap-4">
                          <Phone size={18} className="text-[var(--burgundy)]" />
                          <div>
                            <div className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Call directly</div>
                            <div className="font-serif-display text-xl">{BRAND.phone}</div>
                          </div>
                        </div>
                        <ArrowRight size={16} className="text-[var(--muted)] group-hover:translate-x-1 transition-transform" />
                      </a>
                      <a
                        href={BRAND.whatsapp}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-5 border border-[var(--border-soft)] hover:border-[var(--gold)] transition-colors group"
                        data-testid="concierge-whatsapp"
                      >
                        <div className="flex items-center gap-4">
                          <MessageCircle size={18} className="text-[var(--burgundy)]" />
                          <div>
                            <div className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">WhatsApp</div>
                            <div className="font-serif-display text-xl">Chat with a host</div>
                          </div>
                        </div>
                        <ArrowRight size={16} className="text-[var(--muted)] group-hover:translate-x-1 transition-transform" />
                      </a>
                      <button
                        onClick={() => setStep(2.5)}
                        className="w-full flex items-center justify-between p-5 border border-[var(--border-soft)] hover:border-[var(--gold)] transition-colors group text-left"
                        data-testid="concierge-form"
                      >
                        <div>
                          <div className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Or</div>
                          <div className="font-serif-display text-xl">Send a brief. We'll call you back</div>
                        </div>
                        <ArrowRight size={16} className="text-[var(--muted)] group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                    <button onClick={() => setStep(1)} className="btn-ghost-dark mt-12" data-testid="concierge-back">
                      <ArrowLeft size={14} /> Change occasion
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {(step === 2 && !isConcierge && occasion) || step === 2.5 ? (
              <motion.form
                key="step2"
                onSubmit={handleSubmit}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="max-w-3xl mx-auto"
                data-testid="reservation-form"
              >
                <div className="text-center mb-12">
                  <div className="text-xs uppercase tracking-[0.32em] text-[var(--burgundy)] mb-3">
                    {selectedOcc?.label}
                  </div>
                  <h2 className="font-serif-display text-3xl md:text-4xl text-[var(--warm-white)]">
                    {isConcierge ? "Tell us what you need" : "Your details"}
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <div>
                    <label className="tbr-label">Full Name</label>
                    <input
                      required
                      type="text"
                      className="tbr-input"
                      placeholder="Tomi Adekola"
                      value={form.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                      data-testid="input-name"
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
                      onChange={(e) => handleChange("email", e.target.value)}
                      data-testid="input-email"
                    />
                  </div>
                  <div>
                    <label className="tbr-label">Phone</label>
                    <input
                      required
                      type="tel"
                      className="tbr-input"
                      placeholder="+234 803 ..."
                      value={form.phone}
                      onChange={(e) => handleChange("phone", e.target.value)}
                      data-testid="input-phone"
                    />
                  </div>
                  {!isConcierge && (
                    <div>
                      <label className="tbr-label">Party Size</label>
                      <select
                        className="tbr-input"
                        value={form.party}
                        onChange={(e) => handleChange("party", e.target.value)}
                        data-testid="input-party"
                      >
                        {[1,2,3,4,5,6,7,8,9,10,12,15,20].map((n) => (
                          <option key={n} value={n}>{n} {n === 1 ? "guest" : "guests"}</option>
                        ))}
                        <option value="other">More than 20 guests</option>
                      </select>
                      {form.party === "other" && (
                        <input
                          type="number"
                          min="21"
                          className="tbr-input mt-3"
                          placeholder="How many guests?"
                          value={form.partyOther}
                          onChange={(e) => handleChange("partyOther", e.target.value)}
                          data-testid="input-party-other"
                        />
                      )}
                    </div>
                  )}
                  {!isConcierge && (
                    <>
                      <div>
                        <label className="tbr-label">Date</label>
                        <input
                          required
                          type="date"
                          min={today}
                          className="tbr-input"
                          value={form.date}
                          onChange={(e) => handleChange("date", e.target.value)}
                          data-testid="input-date"
                        />
                      </div>
                      <div>
                        <label className="tbr-label">Time</label>
                        <select
                          className="tbr-input"
                          value={form.time}
                          onChange={(e) => handleChange("time", e.target.value)}
                          data-testid="input-time"
                        >
                          {timeSlots.map((t) => (<option key={t} value={t}>{t}</option>))}
                        </select>
                      </div>
                    </>
                  )}
                </div>

                {/* Occasion-specific fields */}
                {occasion === "birthday" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    <div>
                      <label className="tbr-label">Whose birthday?</label>
                      <input className="tbr-input" placeholder="Their name" value={form.whoseBirthday} onChange={(e) => handleChange("whoseBirthday", e.target.value)} data-testid="input-whose-birthday" />
                    </div>
                    <div>
                      <label className="tbr-label">Age turning</label>
                      <input className="tbr-input" placeholder="e.g. 30" value={form.ageTurning} onChange={(e) => handleChange("ageTurning", e.target.value)} data-testid="input-age" />
                    </div>
                  </div>
                )}
                {occasion === "corporate" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    <div>
                      <label className="tbr-label">Company</label>
                      <input className="tbr-input" placeholder="Company name" value={form.companyName} onChange={(e) => handleChange("companyName", e.target.value)} data-testid="input-company" />
                    </div>
                  </div>
                )}
                {occasion === "anniversary" && (
                  <div className="mb-8">
                    <label className="tbr-label">How many years?</label>
                    <input className="tbr-input" placeholder="e.g. 5 years" value={form.yearsAnniversary} onChange={(e) => handleChange("yearsAnniversary", e.target.value)} data-testid="input-years" />
                  </div>
                )}
                {occasion === "special" && (
                  <div className="mb-8">
                    <label className="tbr-label">What are you celebrating?</label>
                    <input className="tbr-input" placeholder="Tell us..." value={form.celebratingWhat} onChange={(e) => handleChange("celebratingWhat", e.target.value)} data-testid="input-celebrating" />
                  </div>
                )}

                <div className="mb-12">
                  <label className="tbr-label">Anything special?</label>
                  <textarea
                    className="tbr-input resize-none"
                    rows={3}
                    placeholder={occasion === "date-night" ? "Candles, window table, a specific drink..." : "Dietary requirements, seating preferences..."}
                    value={form.special}
                    onChange={(e) => handleChange("special", e.target.value)}
                    data-testid="input-special"
                  />
                </div>

                {submitError && (
                  <p className="text-sm text-red-400 border border-red-400/20 bg-red-400/5 px-4 py-3 mb-2">{submitError}</p>
                )}
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <button type="button" onClick={() => setStep(1)} className="btn-ghost-dark" data-testid="form-back">
                    <ArrowLeft size={14} /> Change occasion
                  </button>
                  <button type="submit" disabled={submitting} className="btn-burgundy" data-testid="form-submit">
                    <span>{submitting ? "Sending..." : "Confirm Reservation"}</span>
                    {!submitting && <ArrowRight size={14} />}
                  </button>
                </div>
              </motion.form>
            ) : null}
          </AnimatePresence>
        </div>
      </section>

      {/* Success modal */}
      <AnimatePresence>
        {submitted && (
          <SuccessModal
            form={form}
            occasion={selectedOcc}
            onClose={() => {
              setSubmitted(false);
              setStep(1);
              setOccasion("");
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function SuccessModal({ form, occasion, onClose }) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="sheet-overlay"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 10 }}
        transition={{ duration: 0.5, ease: [0.2, 0.7, 0.2, 1] }}
        className="fixed inset-0 z-[80] flex items-center justify-center p-4 pointer-events-none"
        data-testid="success-modal"
      >
        <div className="bg-[var(--charcoal)] max-w-xl w-full pointer-events-auto relative overflow-hidden">
          <div className="bg-[var(--charcoal)] p-10 md:p-14 text-center relative grain">
            <button
              onClick={onClose}
              className="absolute top-5 right-5 text-white/60 hover:text-white"
              data-testid="success-close"
              aria-label="Close"
            >
              <X size={22} />
            </button>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              className="w-16 h-16 rounded-full bg-[var(--gold)] flex items-center justify-center mx-auto mb-8"
            >
              <Check size={28} className="text-[var(--charcoal)]" strokeWidth={2.5} />

            </motion.div>
            <div className="gold-line mb-4">Confirmed</div>
            <h3 className="font-serif-display text-3xl md:text-4xl text-[var(--warm-white)]">
              Your table awaits, <span className="font-serif-italic text-[var(--gold)]">{form.name.split(" ")[0] || "friend"}.</span>
            </h3>
            <p className="text-white/65 mt-4 text-sm">
              A confirmation email is on its way to {form.email}.
            </p>
          </div>
          <div className="p-8 md:p-10 space-y-4">
            <Row label="Occasion" value={occasion?.label || "Reservation"} />
            {form.date && <Row label="Date" value={new Date(form.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} />}
            {form.time && <Row label="Time" value={form.time} />}
            {form.party && <Row label="Party" value={form.party === "other" ? `${form.partyOther} guests` : `${form.party} ${form.party == 1 ? "guest" : "guests"}`} />}
            <Row label="Address" value={BRAND.address} />
          </div>
          <div className="p-6 bg-[var(--charcoal-soft)] text-center text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
            For changes, call <a href={`tel:${BRAND.phoneTel}`} className="text-[var(--burgundy)]">{BRAND.phone}</a>
          </div>
        </div>
      </motion.div>
    </>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-[var(--border-soft)] pb-3">
      <div className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">{label}</div>
      <div className="font-serif-display text-lg text-[var(--warm-white)] text-right">{value}</div>
    </div>
  );
}
