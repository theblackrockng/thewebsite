import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Phone, MessageCircle, X, ArrowRight, ArrowLeft, Minus, Plus, UtensilsCrossed, Loader2 } from "lucide-react";
import { OCCASIONS, BRAND, IMAGES, MENU } from "../lib/data";
import { supabase } from "../lib/supabase";
import { notifyTelegram, reservationMessage } from "../lib/telegram";

const today = new Date().toISOString().split("T")[0];

const CATEGORY_ORDER = [
  "Starters",
  "Salads",
  "Rice",
  "Noodles",
  "Pepper Soup & Specials",
  "Continental",
  "Sauces",
  "Charcoal Grills",
  "National Dishes",
  "Traditional Specials",
];

const timeSlots = [
  "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM",
  "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM",
  "4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM",
  "6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM",
  "8:00 PM", "8:30 PM", "9:00 PM", "9:30 PM", "10:00 PM",
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

const pageVariants = {
  enter: (dir) => ({ opacity: 0, x: dir * 60 }),
  center: { opacity: 1, x: 0 },
  exit: (dir) => ({ opacity: 0, x: dir * -60 }),
};

const pageTransition = { duration: 0.28, ease: "easeInOut" };

function fmtPrice(p) {
  return `₦${Number(p).toLocaleString("en-NG")}`;
}

// Convert MENU constant to same shape as menu_items table rows (fallback)
function menuFallback() {
  return Object.entries(MENU).flatMap(([category, items]) =>
    items.map((item, i) => ({
      id: `${category}-${i}`,
      name: item.name,
      description: item.desc,
      price: parseInt(String(item.price).replace(/[₦,\s]/g, ""), 10),
      category,
    }))
  );
}

export default function Reservations() {
  const [searchParams] = useSearchParams();
  const initialOcc = searchParams.get("occasion") || "";
  const [step, setStep] = useState(initialOcc ? 2 : 1);
  const [dir, setDir] = useState(1);
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
    whoseBirthday: "",
    ageTurning: "",
    companyName: "",
    yearsAnniversary: "",
    celebratingWhat: "",
    _hp: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Meal pre-selection state
  const [menuItems, setMenuItems] = useState([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [mealSelections, setMealSelections] = useState({}); // { [itemId]: qty }

  useEffect(() => {
    if (initialOcc) setOccasion(initialOcc);
  }, [initialOcc]);

  // Fetch menu items when user reaches step 3
  useEffect(() => {
    if (step !== 3 || menuItems.length > 0) return;
    setMenuLoading(true);
    supabase
      .from("menu_items")
      .select("id, name, description, price, category")
      .eq("available", true)
      .order("name")
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          setMenuItems(data);
        } else {
          setMenuItems(menuFallback());
        }
        setMenuLoading(false);
      });
  }, [step, menuItems.length]);

  const selectedOcc = OCCASIONS.find((o) => o.id === occasion);
  const isConcierge = selectedOcc?.concierge;

  const partyMax = form.party === "other"
    ? (parseInt(form.partyOther, 10) || 20)
    : (parseInt(String(form.party), 10) || 10);

  const handleChange = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const goForward = () => { setDir(1); setStep(2); };
  const goBack = () => { setDir(-1); setStep(1); };
  const goBackToDetails = () => { setDir(-1); setStep(step === 2.5 ? 2.5 : 2); };

  // Step 2 form → advance to meal selection
  const handleGoToMeals = (e) => {
    e.preventDefault();
    setDir(1);
    setStep(3);
  };

  const setMealQty = (id, qty) => {
    setMealSelections((prev) => ({ ...prev, [id]: Math.max(0, Math.min(qty, partyMax)) }));
  };

  const totalSelected = Object.values(mealSelections).reduce((s, q) => s + q, 0);

  const buildMealsPayload = () =>
    menuItems
      .filter((item) => (mealSelections[item.id] ?? 0) > 0)
      .map((item) => ({
        id: item.id,
        name: item.name,
        qty: mealSelections[item.id],
        price: item.price,
        category: item.category,
      }));

  // Actual reservation submission
  const handleFinalSubmit = async (skipMeals = false) => {
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

    const preSelectedMeals = skipMeals ? null : buildMealsPayload();
    const hasMeals = preSelectedMeals && preSelectedMeals.length > 0;

    const { data: inserted, error } = await supabase.from("reservations").insert({
      name: form.name,
      email: form.email,
      phone: form.phone,
      date: form.date,
      time: form.time,
      party: String(partyValue),
      occasion: selectedOcc?.label || occasion,
      notes: notes || null,
      status: "pending",
      pre_selected_meals: hasMeals ? preSelectedMeals : null,
    }).select("id").single();

    setSubmitting(false);
    if (error) { setSubmitError("Something went wrong. Please try again or call us directly."); return; }

    if (form.email) {
      fetch("/api/send-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          date: form.date,
          time: form.time,
          party: form.party === "other" ? form.partyOther : form.party,
          occasion: selectedOcc?.label || occasion,
          notes: notes || null,
          preSelectedMeals: hasMeals ? preSelectedMeals : null,
          _hp: form._hp,
        }),
      }).catch(() => {});
    }

    const reservationId = inserted?.id;
    const actionKeyboard = reservationId ? {
      inline_keyboard: [[
        { text: "✓ Confirm",    callback_data: `confirm:${reservationId}` },
        { text: "📅 Reschedule", callback_data: `reschedule:${reservationId}` },
        { text: "✗ Cancel",     callback_data: `cancel:${reservationId}` },
        { text: "✉️ Email",      callback_data: `email:${reservationId}` },
      ]],
    } : null;

    notifyTelegram(reservationMessage({
      name: form.name,
      email: form.email,
      phone: form.phone,
      date: form.date,
      time: form.time,
      party: form.party === "other" ? form.partyOther : form.party,
      occasion: selectedOcc?.label || occasion,
      notes: notes || null,
      preSelectedMeals: hasMeals ? preSelectedMeals : null,
    }), actionKeyboard);
    setSubmitted(true);
  };

  const indicatorStep = submitted ? 4 : step >= 3 ? 3 : step >= 2 ? 2 : 1;

  // Group menu items by category, normalised key
  const menuByCategory = menuItems.reduce((acc, item) => {
    const cat = item.category?.trim() || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const CATEGORY_ORDER_LOWER = CATEGORY_ORDER.map((c) => c.toLowerCase());
  const sortedCategories = Object.entries(menuByCategory).sort(([a], [b]) => {
    const ai = CATEGORY_ORDER_LOWER.indexOf(a.toLowerCase());
    const bi = CATEGORY_ORDER_LOWER.indexOf(b.toLowerCase());
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  return (
    <div className="page-enter pt-20 md:pt-28 lg:pt-36">
      {/* Hero */}
      <section
        className="relative pt-12 pb-10 md:pt-20 md:pb-14 overflow-hidden"
        style={{
          backgroundImage: `url('${IMAGES.heroRooftop}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        data-testid="reservation-header"
      >
        <div className="absolute inset-0" style={{ background: "rgba(15,13,10,0.82)" }} />
        <div className="relative z-10 max-w-[1200px] mx-auto px-6 md:px-12 text-center">
          <span className="gold-line">Reserve</span>
          <h1 className="font-serif-display text-3xl md:text-5xl lg:text-8xl leading-[0.95] mt-6 md:mt-8 text-[var(--warm-white)]">
            Tell us about <span className="font-serif-italic text-[var(--gold)]">your visit.</span>
          </h1>
          <p className="text-[var(--muted)] mt-8 max-w-xl mx-auto font-light text-base md:text-lg leading-relaxed">
            Every booking begins with an occasion. Your experience is shaped around it.
          </p>
        </div>
      </section>

      {/* Gold decorative transition line */}
      <div className="w-full h-px" style={{ background: "linear-gradient(90deg, transparent 0%, rgba(201,168,76,0.45) 30%, rgba(201,168,76,0.45) 70%, transparent 100%)" }} />

      <section className="bg-[var(--charcoal)] pb-24 md:pb-32">
        <div className="max-w-[1200px] mx-auto px-6 md:px-12">

          {/* Step progress bar */}
          <div className="flex items-start justify-center pt-10 mb-5 md:mb-6">
            {["Your Occasion", "Your Details", "Meal Selection", "Confirm"].map((label, i) => {
              const n = i + 1;
              const isCompleted = indicatorStep > n;
              const isActive = indicatorStep === n;
              return (
                <div key={n} className="flex items-center">
                  <div className="flex flex-col items-center gap-1.5 min-w-[60px] md:min-w-[76px]">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium"
                      style={{
                        background: isCompleted || isActive ? "var(--gold)" : "transparent",
                        border: isCompleted || isActive ? "none" : "1px solid #3a3228",
                        color: isCompleted || isActive ? "var(--charcoal)" : "var(--muted)",
                        transition: "all 0.2s ease",
                      }}
                    >
                      {isCompleted ? <Check size={12} strokeWidth={3} /> : n}
                    </div>
                    <span
                      className="text-[9px] md:text-[10px] uppercase tracking-[0.18em] text-center whitespace-nowrap"
                      style={{
                        color: isActive || isCompleted ? "var(--gold)" : "var(--muted)",
                        transition: "color 0.2s ease",
                      }}
                    >
                      {label}
                    </span>
                  </div>
                  {n < 4 && (
                    <div
                      className="w-8 md:w-16 h-px mx-1 mb-5"
                      style={{
                        background: isCompleted ? "var(--gold)" : "var(--border-soft)",
                        transition: "background 0.5s ease",
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <AnimatePresence mode="wait" custom={dir}>
            {step === 1 && (
              <motion.div
                key="step1"
                custom={dir}
                variants={pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={pageTransition}
                data-testid="step-occasion"
              >
                <div className="text-center mb-8">
                  <h2 className="font-serif-display text-3xl md:text-4xl text-[var(--warm-white)]">
                    What are you celebrating?
                  </h2>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {OCCASIONS.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => setOccasion(o.id)}
                      className={`occasion-card text-left ${occasion === o.id ? "selected" : ""}`}
                      data-testid={`occasion-${o.id}`}
                      style={{ background: OCCASION_TINTS[o.id] }}
                    >
                      <AnimatePresence>
                        {occasion === o.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.6 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.6 }}
                            transition={{ duration: 0.15 }}
                            className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ background: "var(--gold)" }}
                          >
                            <Check size={10} strokeWidth={3} style={{ color: "var(--charcoal)" }} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <h3 className="font-serif-display text-lg md:text-3xl mb-2">{o.label}</h3>
                      <p className="text-xs leading-relaxed opacity-70">{o.note}</p>
                    </button>
                  ))}
                </div>

                <AnimatePresence>
                  {occasion && (
                    <motion.div
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="flex justify-center mt-8"
                    >
                      <button
                        onClick={goForward}
                        className="flex items-center gap-3 px-8 py-4 text-sm uppercase tracking-[0.24em] font-medium transition-colors duration-200"
                        style={{ background: "var(--gold)", color: "var(--charcoal)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--gold-light)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "var(--gold)")}
                      >
                        Continue to Details <ArrowRight size={15} />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {step === 2 && isConcierge && (
              <motion.div
                key="concierge"
                custom={dir}
                variants={pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={pageTransition}
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
                      <a href={`tel:${BRAND.phoneTel}`} className="flex items-center justify-between p-5 border border-[var(--border-soft)] hover:border-[var(--gold)] transition-colors group" data-testid="concierge-call">
                        <div className="flex items-center gap-4">
                          <Phone size={18} className="text-[var(--burgundy)]" />
                          <div>
                            <div className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Call directly</div>
                            <div className="font-serif-display text-xl">{BRAND.phone}</div>
                          </div>
                        </div>
                        <ArrowRight size={16} className="text-[var(--muted)] group-hover:translate-x-1 transition-transform" />
                      </a>
                      <a href={BRAND.whatsapp} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-5 border border-[var(--border-soft)] hover:border-[var(--gold)] transition-colors group" data-testid="concierge-whatsapp">
                        <div className="flex items-center gap-4">
                          <MessageCircle size={18} className="text-[var(--burgundy)]" />
                          <div>
                            <div className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">WhatsApp</div>
                            <div className="font-serif-display text-xl">Chat with a host</div>
                          </div>
                        </div>
                        <ArrowRight size={16} className="text-[var(--muted)] group-hover:translate-x-1 transition-transform" />
                      </a>
                      <button onClick={() => setStep(2.5)} className="w-full flex items-center justify-between p-5 border border-[var(--border-soft)] hover:border-[var(--gold)] transition-colors group text-left" data-testid="concierge-form">
                        <div>
                          <div className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Or</div>
                          <div className="font-serif-display text-xl">Send a brief. We'll call you back</div>
                        </div>
                        <ArrowRight size={16} className="text-[var(--muted)] group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                    <button onClick={goBack} className="btn-ghost-dark mt-12" data-testid="concierge-back">
                      <ArrowLeft size={14} /> Change occasion
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {(step === 2 && !isConcierge && occasion) || step === 2.5 ? (
              <motion.form
                key="step2"
                custom={dir}
                variants={pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={pageTransition}
                onSubmit={handleGoToMeals}
                className="max-w-3xl mx-auto"
                data-testid="reservation-form"
              >
                {/* Honeypot */}
                <div style={{ position: "absolute", left: "-9999px", top: "-9999px", width: 1, height: 1, overflow: "hidden" }} aria-hidden="true">
                  <label>Leave this empty</label>
                  <input type="text" name="website" tabIndex="-1" autoComplete="off" value={form._hp} onChange={(e) => handleChange("_hp", e.target.value)} />
                </div>

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
                    <input required type="text" className="tbr-input" placeholder="Tomi Adekola" value={form.name} onChange={(e) => handleChange("name", e.target.value)} data-testid="input-name" />
                  </div>
                  <div>
                    <label className="tbr-label">Email</label>
                    <input required type="email" className="tbr-input" placeholder="you@example.com" value={form.email} onChange={(e) => handleChange("email", e.target.value)} data-testid="input-email" />
                  </div>
                  <div>
                    <label className="tbr-label">Phone</label>
                    <input required type="tel" className="tbr-input" placeholder="+234 803 ..." value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} data-testid="input-phone" />
                  </div>
                  {!isConcierge && (
                    <div>
                      <label className="tbr-label">Party Size</label>
                      <select className="tbr-input" value={form.party} onChange={(e) => handleChange("party", e.target.value)} data-testid="input-party">
                        {[1,2,3,4,5,6,7,8,9,10,12,15,20].map((n) => (
                          <option key={n} value={n}>{n} {n === 1 ? "guest" : "guests"}</option>
                        ))}
                        <option value="other">More than 20 guests</option>
                      </select>
                      {form.party === "other" && (
                        <input type="number" min="21" className="tbr-input mt-3" placeholder="How many guests?" value={form.partyOther} onChange={(e) => handleChange("partyOther", e.target.value)} data-testid="input-party-other" />
                      )}
                    </div>
                  )}
                  {!isConcierge && (
                    <>
                      <div>
                        <label className="tbr-label">Date</label>
                        <input required type="date" min={today} className="tbr-input" value={form.date} onChange={(e) => handleChange("date", e.target.value)} data-testid="input-date" />
                      </div>
                      <div>
                        <label className="tbr-label">Time</label>
                        <select className="tbr-input" value={form.time} onChange={(e) => handleChange("time", e.target.value)} data-testid="input-time">
                          {timeSlots.map((t) => (<option key={t} value={t}>{t}</option>))}
                        </select>
                      </div>
                    </>
                  )}
                </div>

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

                <div className="flex items-center justify-between flex-wrap gap-4">
                  <button type="button" onClick={goBack} className="btn-ghost-dark" data-testid="form-back">
                    <ArrowLeft size={14} /> Change occasion
                  </button>
                  <button type="submit" className="btn-burgundy" data-testid="form-submit">
                    <span>Continue to Meal Selection</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </motion.form>
            ) : null}

            {step === 3 && (
              <motion.div
                key="step3"
                custom={dir}
                variants={pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={pageTransition}
                className="max-w-3xl mx-auto"
                data-testid="step-meals"
              >
                <div className="text-center mb-10">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <UtensilsCrossed size={20} className="text-[var(--gold)]" />
                    <h2 className="font-serif-display text-3xl md:text-4xl text-[var(--warm-white)]">
                      Plan your meal <span className="font-serif-italic text-[var(--gold)] text-2xl md:text-3xl">(optional)</span>
                    </h2>
                  </div>
                  <p className="text-[var(--muted)] text-sm md:text-base max-w-lg mx-auto leading-relaxed">
                    Let us know what you're thinking and we'll have everything ready for you.
                  </p>
                </div>

                {menuLoading ? (
                  <div className="flex items-center justify-center py-16 gap-3 text-[var(--muted)]">
                    <Loader2 size={18} className="animate-spin text-[var(--gold)]" />
                    <span className="text-sm">Loading menu…</span>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {sortedCategories.map(([category, items]) => (
                      <div key={category}>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="h-px flex-1" style={{ background: "rgba(201,168,76,0.2)" }} />
                          <span className="text-[10px] uppercase tracking-[0.28em] text-[var(--gold)] font-medium whitespace-nowrap">{category}</span>
                          <div className="h-px flex-1" style={{ background: "rgba(201,168,76,0.2)" }} />
                        </div>
                        <div className="space-y-2">
                          {items.map((item) => {
                            const qty = mealSelections[item.id] ?? 0;
                            return (
                              <div
                                key={item.id}
                                className="flex items-center gap-4 px-4 py-3 border transition-colors"
                                style={{
                                  borderColor: qty > 0 ? "rgba(201,168,76,0.4)" : "var(--border-soft)",
                                  background: qty > 0 ? "rgba(201,168,76,0.05)" : "transparent",
                                }}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-baseline gap-3 flex-wrap">
                                    <span className="text-sm font-medium text-[var(--warm-white)]">{item.name}</span>
                                    <span className="text-xs text-[var(--gold)] font-medium">{fmtPrice(item.price)}</span>
                                  </div>
                                  {item.description && (
                                    <p className="text-xs text-[var(--muted)] mt-0.5 leading-relaxed line-clamp-1">{item.description}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => setMealQty(item.id, qty - 1)}
                                    disabled={qty === 0}
                                    className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
                                    style={{
                                      border: "1px solid var(--border-soft)",
                                      background: qty > 0 ? "rgba(201,168,76,0.12)" : "transparent",
                                      color: qty > 0 ? "var(--gold)" : "var(--muted)",
                                      cursor: qty === 0 ? "not-allowed" : "pointer",
                                      opacity: qty === 0 ? 0.4 : 1,
                                    }}
                                  >
                                    <Minus size={10} />
                                  </button>
                                  <span className="w-5 text-center text-sm font-medium text-[var(--warm-white)]">{qty}</span>
                                  <button
                                    type="button"
                                    onClick={() => setMealQty(item.id, qty + 1)}
                                    disabled={qty >= partyMax}
                                    className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
                                    style={{
                                      border: "1px solid var(--border-soft)",
                                      background: qty < partyMax ? "rgba(201,168,76,0.12)" : "transparent",
                                      color: qty < partyMax ? "var(--gold)" : "var(--muted)",
                                      cursor: qty >= partyMax ? "not-allowed" : "pointer",
                                      opacity: qty >= partyMax ? 0.4 : 1,
                                    }}
                                  >
                                    <Plus size={10} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Running total */}
                {totalSelected > 0 && (
                  <div className="mt-6 px-4 py-3 border border-[var(--gold)]/30 bg-[var(--gold)]/5 flex items-center justify-between">
                    <span className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Dishes selected</span>
                    <span className="font-serif-display text-lg text-[var(--gold)]">{totalSelected} {totalSelected === 1 ? "dish" : "dishes"}</span>
                  </div>
                )}

                {submitError && (
                  <p className="text-sm text-red-400 border border-red-400/20 bg-red-400/5 px-4 py-3 mt-4">{submitError}</p>
                )}

                <div className="flex items-center justify-between flex-wrap gap-4 mt-8">
                  <button type="button" onClick={goBackToDetails} className="btn-ghost-dark">
                    <ArrowLeft size={14} /> Back to details
                  </button>
                  <div className="flex items-center gap-4 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleFinalSubmit(true)}
                      disabled={submitting}
                      className="text-sm text-[var(--muted)] hover:text-[var(--warm-white)] transition-colors underline underline-offset-2"
                      data-testid="meal-skip"
                    >
                      Skip this step
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFinalSubmit(false)}
                      disabled={submitting}
                      className="btn-burgundy"
                      data-testid="meal-confirm"
                    >
                      {submitting
                        ? <><Loader2 size={14} className="animate-spin" /> Confirming…</>
                        : <><span>Confirm Reservation</span><ArrowRight size={14} /></>
                      }
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
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
              setMealSelections({});
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
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="sheet-overlay" onClick={onClose} />
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
            <button onClick={onClose} className="absolute top-5 right-5 text-white/60 hover:text-white" data-testid="success-close" aria-label="Close">
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
            For changes, call <a href={`tel:${BRAND.phoneTel}`} className="text-[var(--gold)]">{BRAND.phone}</a>
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
