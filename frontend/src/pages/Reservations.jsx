import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Phone, MessageCircle, X, ArrowRight, ArrowLeft, Minus, Plus, UtensilsCrossed, Loader2, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { OCCASIONS, BRAND, IMAGES, MENU } from "../lib/data";
import { supabase } from "../lib/supabase";
import SEO from "../components/SEO";
import { PickerModal, SidePickerModal, SOUPS, SWALLOWS, SIDES } from "./OrderPreview";

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

const FOOD_CATEGORY_ORDER = [
  "Starters", "Salads", "Rice", "Pasta",
  "Bush Bar Kitchen", "Continental", "Sauces",
  "Charcoal Grills", "National Dishes", "Traditional Specials",
  "BLACKROCK EXPERIENCE",
];

const DRINK_CATEGORIES = new Set([
  "Wines", "Spirits", "Beer & Cider", "Cocktails",
  "Mocktails", "Soft Drinks & Water", "Hot Drinks", "Fresh Juice",
]);

const MEAL_CATEGORY_IMAGES = {
  "Starters":             "/images/menu/starters.jpg",
  "Salads":               "/images/menu/salads.jpg",
  "Rice":                 "/images/menu/rice.jpg",
  "Pasta":                "/images/menu/noodles.jpg",
  "Bush Bar Kitchen":     "/images/menu/pepper-soup.jpg",
  "Continental":          "/images/menu/continental.jpg",
  "Sauces":               "/images/menu/sauces.jpg",
  "Charcoal Grills":      "/images/menu/grills.jpg",
  "National Dishes":      "/images/menu/national.jpg",
  "Traditional Specials":  "/images/menu/traditional.jpg",
  "BLACKROCK EXPERIENCE":  "/images/menu/continental.jpg",
};

const WHATSAPP_NUMBER = "2348055238353";
const BANK_NAME = "Guaranty Trust Bank";
const BANK_ACCOUNT_NAME = "Blackrock Restaurant LoungeBar";
const BANK_ACCOUNT_NUMBER = "9006080442";

const RES_PER_PAGE = 5;
const RES_LIST_H = 360;

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

function DatePickerField({ value, onChange, min, error, onBlur }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const minDate = min ? new Date(min + "T00:00:00") : undefined;
  const selected = value ? new Date(value + "T00:00:00") : undefined;

  const displayValue = selected
    ? selected.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "Select a date";

  useEffect(() => {
    if (!open) return;
    function handleDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    function handleKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  function handleSelect(date) {
    if (!date) return;
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    onChange(iso);
    setOpen(false);
  }

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onBlur={onBlur}
        data-testid="input-date"
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "transparent",
          border: "none",
          borderBottom: `1px solid ${error ? "rgba(248,113,113,0.7)" : open ? "var(--gold)" : "var(--border-soft)"}`,
          padding: "14px 0",
          fontFamily: "'Montserrat', sans-serif",
          fontSize: "14px",
          color: selected ? "var(--warm-white)" : "#6b6358",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span>{displayValue}</span>
        <Calendar size={14} style={{ color: "var(--gold)", flexShrink: 0 }} />
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            zIndex: 100,
            background: "#1a1814",
            border: "1px solid rgba(200,169,110,0.4)",
            padding: "8px",
            "--rdp-accent-color": "#c8a96e",
            "--rdp-background-color": "rgba(200,169,110,0.12)",
            "--rdp-accent-color-dark": "rgba(200,169,110,0.5)",
            "--rdp-cell-size": "36px",
            "--rdp-selected-color": "#0f0d0a",
          }}
        >
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            disabled={minDate ? { before: minDate } : undefined}
            defaultMonth={selected || minDate || new Date()}
            styles={{
              caption_label: { color: "#F5F0E8", fontFamily: "Montserrat, sans-serif", fontSize: "12px", letterSpacing: "0.1em", textTransform: "uppercase" },
              head_cell: { color: "#9C8E7A", fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase" },
              day: { color: "#F5F0E8", fontSize: "13px", borderRadius: 0 },
            }}
          />
        </div>
      )}
    </div>
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
  const [fieldErrors, setFieldErrors] = useState({});

  // Meal pre-selection state
  const [menuItems, setMenuItems] = useState([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [mealCart, setMealCart] = useState([]); // [{ cartKey, id, name, qty, price, category, modifier }]
  const [activeCat, setActiveCat] = useState(null);
  const [soupModal, setSoupModal] = useState(null);
  const [traditionalModal, setTraditionalModal] = useState(null);
  const [sideModal, setSideModal] = useState(null);
  const [payStep, setPayStep] = useState(null); // null | 'choice' | 'bank' | 'done'
  const [payChoice, setPayChoice] = useState(null); // null | 'deposit_70' | 'pay_full' | 'preference_only'

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

  // Step 2 form → validate then advance to meal selection
  const handleGoToMeals = (e) => {
    e.preventDefault();
    const errors = {};
    if (!form.name || form.name.trim().length < 2) {
      errors.name = form.name.trim() ? "Name must be at least 2 characters." : "Full name is required.";
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(form.email)) {
      errors.email = "Please enter a valid email address.";
    }
    if (form.phone) {
      if (/[a-zA-Z]/.test(form.phone)) {
        errors.phone = "Phone number cannot contain letters.";
      } else if (form.phone.replace(/[\s\-().]/g, '').length > 20) {
        errors.phone = "Phone number exceeds 20 characters.";
      }
    }
    if (!isConcierge && !form.date) {
      errors.date = "Please select a date.";
    }
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
    setFieldErrors({});
    setDir(1);
    setStep(3);
  };

  const cartTotal = useMemo(() => mealCart.reduce((s, i) => s + i.price * i.qty, 0), [mealCart]);
  const cartItemCount = useMemo(() => mealCart.reduce((s, i) => s + i.qty, 0), [mealCart]);

  const addToCart = (cartKey, id, name, price, category, modifier) => {
    setMealCart((prev) => {
      const existing = prev.find((i) => i.cartKey === cartKey);
      if (existing) return prev.map((i) => i.cartKey === cartKey ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { cartKey, id, name, qty: 1, price, category, modifier: modifier || null }];
    });
  };

  const removeFromCart = (cartKey) => {
    setMealCart((prev) => prev.filter((i) => i.cartKey !== cartKey));
  };

  const updateCartQty = (cartKey, delta) => {
    setMealCart((prev) => prev
      .map((i) => i.cartKey === cartKey ? { ...i, qty: Math.max(0, i.qty + delta) } : i)
      .filter((i) => i.qty > 0)
    );
  };

  const buildMealsPayload = () =>
    mealCart.map((i) => ({
      id: i.id,
      name: i.name,
      qty: i.qty,
      price: i.price,
      category: i.category,
      modifier: i.modifier || null,
    }));

  // Actual reservation submission
  const handleFinalSubmit = async (skipMeals = false, mealPaymentChoice = null) => {
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
    const mealPaymentStatus = (mealPaymentChoice === "deposit_70" || mealPaymentChoice === "pay_full") ? "awaiting_proof" : null;
    const mealPaymentAmount = hasMeals && mealPaymentChoice === "deposit_70"
      ? Math.round(cartTotal * 0.7)
      : hasMeals && mealPaymentChoice === "pay_full"
      ? cartTotal
      : null;

    try {
      const res = await fetch("/api/send-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          date: form.date,
          time: form.time,
          party: partyValue,
          occasion: selectedOcc?.label || occasion,
          notes: notes || null,
          preSelectedMeals: hasMeals ? preSelectedMeals : null,
          mealPaymentChoice: mealPaymentChoice || null,
          mealPaymentStatus,
          mealPaymentAmount,
          _hp: form._hp,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSubmitError(data.error || "Something went wrong. Please try again or call us directly.");
        setSubmitting(false);
        return;
      }
    } catch {
      setSubmitError("Something went wrong. Please try again or call us directly.");
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    if (mealPaymentStatus === "awaiting_proof") {
      setPayStep("done");
    } else {
      setSubmitted(true);
    }
  };

  const indicatorStep = submitted ? 4 : step >= 3 ? 3 : step >= 2 ? 2 : 1;

  const foodMenuItems = useMemo(() =>
    menuItems.filter((item) => !DRINK_CATEGORIES.has(item.category?.trim())),
    [menuItems]
  );

  const menuByCategory = useMemo(() => foodMenuItems.reduce((acc, item) => {
    const cat = item.category?.trim() || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {}), [foodMenuItems]);

  const sortedCategories = useMemo(() => {
    const lower = FOOD_CATEGORY_ORDER.map((c) => c.toLowerCase());
    return Object.entries(menuByCategory).sort(([a], [b]) => {
      const ai = lower.indexOf(a.toLowerCase());
      const bi = lower.indexOf(b.toLowerCase());
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
  }, [menuByCategory]);

  const activeCatFinal = activeCat || (sortedCategories.length > 0 ? sortedCategories[0][0] : null);

  return (
    <div className="page-enter pt-20 md:pt-28 lg:pt-36">
      <SEO
        title="Make a Reservation"
        description="Reserve a table at BLACKROCK Restaurant &amp; Lounge, Ikeja. Date nights, birthdays, corporate dining, proposals, private events — we'll shape the experience around you."
        canonical="/reservations"
      />
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
                    <input
                      required
                      type="text"
                      className="tbr-input"
                      placeholder="Tomi Adekola"
                      maxLength={100}
                      value={form.name}
                      onChange={(e) => {
                        handleChange("name", e.target.value);
                        if (fieldErrors.name) setFieldErrors((p) => ({ ...p, name: undefined }));
                      }}
                      onBlur={() => {
                        if (!form.name || form.name.trim().length < 2) {
                          setFieldErrors((p) => ({ ...p, name: form.name.trim() ? "Name must be at least 2 characters." : "Full name is required." }));
                        }
                      }}
                      data-testid="input-name"
                    />
                    <div style={{ minHeight: "20px" }}>
                      {fieldErrors.name && <p className="text-xs text-red-400 mt-1.5" data-testid="error-name">{fieldErrors.name}</p>}
                    </div>
                  </div>
                  <div>
                    <label className="tbr-label">Email</label>
                    <input
                      required
                      type="email"
                      className="tbr-input"
                      placeholder="you@example.com"
                      value={form.email}
                      onChange={(e) => {
                        handleChange("email", e.target.value);
                        if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
                      }}
                      data-testid="input-email"
                    />
                    <div style={{ minHeight: "20px" }}>
                      {fieldErrors.email && <p className="text-xs text-red-400 mt-1.5" data-testid="error-email">{fieldErrors.email}</p>}
                    </div>
                  </div>
                  <div>
                    <label className="tbr-label">Phone</label>
                    <input
                      required
                      type="tel"
                      className="tbr-input"
                      placeholder="+234 803 ..."
                      maxLength={20}
                      value={form.phone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^\d\s+\-]/g, '').slice(0, 20);
                        handleChange("phone", val);
                        if (fieldErrors.phone) setFieldErrors((p) => ({ ...p, phone: undefined }));
                      }}
                      data-testid="input-phone"
                    />
                    <div style={{ minHeight: "20px" }}>
                      {fieldErrors.phone && <p className="text-xs text-red-400 mt-1.5" data-testid="error-phone">{fieldErrors.phone}</p>}
                    </div>
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
                        <DatePickerField
                          value={form.date}
                          onChange={(v) => {
                            handleChange("date", v);
                            if (fieldErrors.date) setFieldErrors((p) => ({ ...p, date: undefined }));
                          }}
                          min={today}
                          error={fieldErrors.date}
                          onBlur={() => {
                            if (!form.date) setFieldErrors((p) => ({ ...p, date: "Please select a date." }));
                          }}
                        />
                        <div style={{ minHeight: "20px" }}>
                          {fieldErrors.date && <p className="text-xs text-red-400 mt-1.5" data-testid="error-date">{fieldErrors.date}</p>}
                        </div>
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
                  <div className="flex items-baseline justify-between">
                    <label className="tbr-label">Anything special?</label>
                    <span className="text-[10px] text-[var(--muted)]" style={{ letterSpacing: "0.1em" }}>
                      {form.special.length}/2000
                    </span>
                  </div>
                  <textarea
                    className="tbr-input resize-none"
                    rows={3}
                    maxLength={2000}
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
                data-testid="step-meals"
              >
                {/* ── Meal picker ── */}
                {!payStep && (
                  <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-8">
                      <div className="flex items-center justify-center gap-3 mb-4">
                        <UtensilsCrossed size={20} className="text-[var(--gold)]" />
                        <h2 className="font-serif-display text-3xl md:text-4xl text-[var(--warm-white)]">
                          Plan your meal <span className="font-serif-italic text-[var(--gold)] text-2xl md:text-3xl">(optional)</span>
                        </h2>
                      </div>
                      <p className="text-[var(--muted)] text-sm md:text-base max-w-xl mx-auto leading-relaxed">
                        Pick dishes you would like. Pay a deposit and we will have them ready when you arrive.
                      </p>
                    </div>

                    {menuLoading ? (
                      <div className="flex items-center justify-center py-16 gap-3 text-[var(--muted)]">
                        <Loader2 size={18} className="animate-spin text-[var(--gold)]" />
                        <span className="text-sm">Loading menu...</span>
                      </div>
                    ) : (
                      <>
                        {/* Category tabs */}
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 28 }}>
                          {sortedCategories.map(([cat]) => (
                            <button
                              key={cat}
                              onClick={() => setActiveCat(cat)}
                              style={{
                                padding: "7px 16px",
                                borderRadius: 99,
                                fontSize: 12,
                                fontWeight: 600,
                                letterSpacing: "0.1em",
                                textTransform: "uppercase",
                                cursor: "pointer",
                                border: `1.5px solid ${activeCatFinal === cat ? "rgba(201,168,76,0.8)" : "rgba(201,168,76,0.25)"}`,
                                background: activeCatFinal === cat ? "rgba(201,168,76,0.12)" : "transparent",
                                color: activeCatFinal === cat ? "#C9A84C" : "#9C8E7A",
                                transition: "all 0.15s",
                              }}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>

                        {/* Image + dish list */}
                        {activeCatFinal && (() => {
                          const dishes = menuByCategory[activeCatFinal] || [];
                          const imgSrc = MEAL_CATEGORY_IMAGES[activeCatFinal];
                          const isNational    = activeCatFinal === "National Dishes";
                          const isTraditional = activeCatFinal === "Traditional Specials";
                          const isGrill       = activeCatFinal === "Charcoal Grills" || activeCatFinal === "Continental";
                          const needsPicker   = isNational || isTraditional || isGrill;

                          return (
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "start" }}>
                              {imgSrc && (
                                <div style={{ aspectRatio: "4/5", overflow: "hidden", borderRadius: 4 }}>
                                  <img src={imgSrc} alt={activeCatFinal} style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
                                </div>
                              )}
                              <div style={{ minWidth: 0 }}>
                                <ResPaginatedList
                                  dishes={dishes}
                                  renderDish={(dish) => {
                                    const cartEntries = mealCart.filter((i) => i.id === dish.id);
                                    const totalQty = cartEntries.reduce((s, i) => s + i.qty, 0);

                                    return (
                                      <div
                                        key={dish.id}
                                        style={{
                                          display: "flex",
                                          alignItems: "flex-start",
                                          justifyContent: "space-between",
                                          gap: 16,
                                          padding: "18px 0",
                                          borderTop: "1px solid rgba(255,255,255,0.08)",
                                        }}
                                      >
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                          <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 15, fontWeight: 600, color: "#F5F0E8", margin: "0 0 4px", lineHeight: 1.3 }}>{dish.name}</div>
                                          {dish.description && (
                                            <p style={{ fontSize: 12, color: "#9C8E7A", margin: 0, lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{dish.description}</p>
                                          )}
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                                          <span style={{ fontSize: 14, fontWeight: 700, color: "#C9A84C", whiteSpace: "nowrap" }}>{fmtPrice(dish.price)}</span>
                                          {needsPicker ? (
                                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                                              <ResCircleAddBtn onClick={() => isNational ? setSoupModal(dish) : isTraditional ? setTraditionalModal(dish) : setSideModal(dish)} />
                                              {totalQty > 0 && <span style={{ fontSize: 10, color: "#C9A84C", fontWeight: 700 }}>{totalQty}</span>}
                                            </div>
                                          ) : totalQty > 0 ? (
                                            <ResQtyControl
                                              qty={totalQty}
                                              onDec={() => {
                                                const entry = cartEntries[0];
                                                if (entry) updateCartQty(entry.cartKey, -1);
                                              }}
                                              onInc={() => {
                                                const entry = cartEntries[0];
                                                if (entry) updateCartQty(entry.cartKey, 1);
                                                else addToCart(dish.id, dish.id, dish.name, dish.price, dish.category, null);
                                              }}
                                            />
                                          ) : (
                                            <ResCircleAddBtn onClick={() => addToCart(dish.id, dish.id, dish.name, dish.price, dish.category, null)} />
                                          )}
                                        </div>
                                      </div>
                                    );
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })()}
                      </>
                    )}

                    {/* Running total */}
                    {cartItemCount > 0 && (
                      <div className="mt-8 px-4 py-4 border border-[var(--gold)]/30 bg-[var(--gold)]/5 flex items-center justify-between">
                        <div>
                          <span className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Your selection</span>
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                            {mealCart.map((i) => (
                              <span key={i.cartKey} className="text-xs text-[var(--warm-white)]">
                                {i.qty}x {i.name}{i.modifier ? ` (${i.modifier})` : ""}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-6">
                          <div className="font-serif-display text-lg text-[var(--gold)]">{fmtPrice(cartTotal)}</div>
                          <div className="text-xs text-[var(--muted)]">{cartItemCount} {cartItemCount === 1 ? "dish" : "dishes"}</div>
                        </div>
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
                          Skip, just reserve my table
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (cartItemCount === 0) {
                              handleFinalSubmit(true);
                            } else {
                              setPayStep("choice");
                            }
                          }}
                          disabled={submitting}
                          className="btn-burgundy"
                          data-testid="meal-confirm"
                        >
                          {cartItemCount === 0
                            ? <><span>Confirm Reservation</span><ArrowRight size={14} /></>
                            : <><span>Confirm selection</span><ArrowRight size={14} /></>
                          }
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Payment choice ── */}
                {payStep === "choice" && (
                  <div className="max-w-xl mx-auto">
                    <div className="text-center mb-8">
                      <div className="text-xs uppercase tracking-[0.32em] text-[var(--burgundy)] mb-3">Step 3 of 3</div>
                      <h2 className="font-serif-display text-3xl md:text-4xl text-[var(--warm-white)]">
                        How would you like to handle payment?
                      </h2>
                      <p className="text-[var(--muted)] text-sm mt-3">
                        Your selected meals total <span className="text-[var(--gold)] font-medium">{fmtPrice(cartTotal)}</span>.
                      </p>
                    </div>
                    <div className="space-y-3">
                      {[
                        { key: "deposit_70", label: "Pay 70% deposit now", sub: `${fmtPrice(Math.round(cartTotal * 0.7))} via bank transfer`, note: "We will have your dishes ready. Settle the balance on arrival." },
                        { key: "pay_full", label: "Pay in full now", sub: `${fmtPrice(cartTotal)} via bank transfer`, note: "Full amount paid ahead. Nothing to settle on arrival." },
                        { key: "preference_only", label: "No payment now", sub: "Preferences only", note: "We will note your selections. No payment is required at this stage." },
                      ].map((opt) => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => {
                            setPayChoice(opt.key);
                            if (opt.key === "preference_only") {
                              handleFinalSubmit(false, "preference_only");
                            } else {
                              setPayStep("bank");
                            }
                          }}
                          disabled={submitting}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            padding: "18px 20px",
                            border: "1px solid var(--border-soft)",
                            background: "transparent",
                            color: "var(--warm-white)",
                            cursor: "pointer",
                            transition: "border-color 0.15s",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--gold)")}
                          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-soft)")}
                        >
                          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 600, marginBottom: 2 }}>{opt.label}</div>
                          <div style={{ fontSize: 13, color: "var(--gold)", fontWeight: 600 }}>{opt.sub}</div>
                          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{opt.note}</div>
                          {submitting && opt.key === payChoice && <Loader2 size={14} style={{ marginTop: 6, animation: "spin 1s linear infinite", color: "var(--gold)" }} />}
                        </button>
                      ))}
                    </div>
                    {submitError && (
                      <p className="text-sm text-red-400 border border-red-400/20 bg-red-400/5 px-4 py-3 mt-4">{submitError}</p>
                    )}
                    <button type="button" onClick={() => setPayStep(null)} className="btn-ghost-dark mt-8">
                      <ArrowLeft size={14} /> Back to dishes
                    </button>
                  </div>
                )}

                {/* ── Bank transfer ── */}
                {payStep === "bank" && (
                  <div className="max-w-xl mx-auto">
                    <div className="text-center mb-8">
                      <div className="text-xs uppercase tracking-[0.32em] text-[var(--burgundy)] mb-3">Bank Transfer</div>
                      <h2 className="font-serif-display text-3xl text-[var(--warm-white)]">
                        Transfer {payChoice === "deposit_70" ? "70% deposit" : "full amount"}
                      </h2>
                    </div>
                    <div style={{ border: "1px solid rgba(201,168,76,0.3)", padding: "24px 28px", marginBottom: 24 }}>
                      {[
                        { label: "Bank", value: BANK_NAME },
                        { label: "Account Name", value: BANK_ACCOUNT_NAME },
                        { label: "Account Number", value: BANK_ACCOUNT_NUMBER },
                        { label: "Amount", value: fmtPrice(payChoice === "deposit_70" ? Math.round(cartTotal * 0.7) : cartTotal) },
                      ].map(({ label, value }) => (
                        <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#9C8E7A" }}>{label}</span>
                          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 600, color: label === "Amount" ? "#C9A84C" : "#F5F0E8" }}>{value}</span>
                        </div>
                      ))}
                    </div>
                    <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 24, lineHeight: 1.6 }}>
                      Once you have made the transfer, click the button below. We will verify your payment and have your dishes ready.
                    </p>
                    {submitError && (
                      <p className="text-sm text-red-400 border border-red-400/20 bg-red-400/5 px-4 py-3 mb-4">{submitError}</p>
                    )}
                    <button
                      type="button"
                      onClick={() => handleFinalSubmit(false, payChoice)}
                      disabled={submitting}
                      className="btn-burgundy w-full justify-center"
                      style={{ padding: "16px", fontSize: 15 }}
                    >
                      {submitting
                        ? <><Loader2 size={14} className="animate-spin" /> Confirming...</>
                        : "I have made payment"
                      }
                    </button>
                    <button type="button" onClick={() => setPayStep("choice")} className="btn-ghost-dark mt-4">
                      <ArrowLeft size={14} /> Back
                    </button>
                  </div>
                )}

                {/* ── Payment confirmed ── */}
                {payStep === "done" && (
                  <div className="max-w-xl mx-auto text-center py-10">
                    <div className="w-16 h-16 rounded-full bg-[var(--gold)] flex items-center justify-center mx-auto mb-8">
                      <Check size={28} className="text-[var(--charcoal)]" strokeWidth={2.5} />
                    </div>
                    <div className="gold-line mb-4">Reservation Confirmed</div>
                    <h3 className="font-serif-display text-3xl md:text-4xl text-[var(--warm-white)]">
                      Your table awaits, <span className="font-serif-italic text-[var(--gold)]">{form.name.split(" ")[0] || "friend"}.</span>
                    </h3>
                    <p style={{ color: "rgba(245,240,232,0.65)", marginTop: 12, fontSize: 14, lineHeight: 1.6 }}>
                      We have received your reservation and meal selections. Send your payment proof on WhatsApp so we can verify and confirm.
                    </p>
                    <a
                      href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hello, I just made a payment for my reservation.\n\nName: ${form.name}\nDate: ${form.date ? new Date(form.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : ""}\nTime: ${form.time || ""}\n\nPlease find my proof of payment attached.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-burgundy inline-flex mt-8"
                      style={{ padding: "14px 28px" }}
                    >
                      <MessageCircle size={16} />
                      <span>Send Payment Proof on WhatsApp</span>
                    </a>
                    <div className="mt-6">
                      <button
                        type="button"
                        onClick={() => {
                          setSubmitted(false);
                          setPayStep(null);
                          setPayChoice(null);
                          setMealCart([]);
                          setActiveCat(null);
                          setStep(1);
                          setOccasion("");
                        }}
                        className="text-sm text-[var(--muted)] hover:text-[var(--warm-white)] transition-colors underline underline-offset-2"
                      >
                        Make another reservation
                      </button>
                    </div>
                  </div>
                )}

                {/* Picker modals */}
                {soupModal && (
                  <PickerModal
                    dish={soupModal}
                    showSoup
                    onClose={() => setSoupModal(null)}
                    onConfirm={(soup, swallow) => {
                      const key = `${soupModal.id}|${soup}|${swallow}`;
                      addToCart(key, soupModal.id, soupModal.name, soupModal.price, soupModal.category, `${soup} + ${swallow}`);
                      setSoupModal(null);
                    }}
                  />
                )}
                {traditionalModal && (
                  <PickerModal
                    dish={traditionalModal}
                    showSoup={false}
                    onClose={() => setTraditionalModal(null)}
                    onConfirm={(_soup, swallow) => {
                      const key = `${traditionalModal.id}|${swallow}`;
                      addToCart(key, traditionalModal.id, traditionalModal.name, traditionalModal.price, traditionalModal.category, swallow);
                      setTraditionalModal(null);
                    }}
                  />
                )}
                {sideModal && (
                  <SidePickerModal
                    dish={sideModal}
                    onClose={() => setSideModal(null)}
                    onConfirm={(side) => {
                      const key = `${sideModal.id}|${side}`;
                      addToCart(key, sideModal.id, sideModal.name, sideModal.price, sideModal.category, side);
                      setSideModal(null);
                    }}
                  />
                )}
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
              setMealCart([]);
              setActiveCat(null);
              setPayStep(null);
              setPayChoice(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ResPageArrow({ dir, disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 32, height: 32, borderRadius: "50%",
        border: `1.5px solid ${disabled ? "rgba(201,168,76,0.18)" : "rgba(201,168,76,0.65)"}`,
        background: "transparent",
        color: disabled ? "rgba(201,168,76,0.25)" : "#C9A84C",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: disabled ? "default" : "pointer",
        transition: "background 0.15s, color 0.15s",
        flexShrink: 0,
      }}
      onMouseEnter={(e) => { if (!disabled) { e.currentTarget.style.background = "#C9A84C"; e.currentTarget.style.color = "#0f0d0a"; } }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = disabled ? "rgba(201,168,76,0.25)" : "#C9A84C"; }}
    >
      {dir === "back" ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
    </button>
  );
}

function ResCircleAddBtn({ onClick }) {
  return (
    <button
      onClick={onClick}
      style={{ width: 32, height: 32, borderRadius: "50%", border: "1.5px solid rgba(201,168,76,0.65)", background: "transparent", color: "#C9A84C", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, transition: "background 0.15s, color 0.15s" }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "#C9A84C"; e.currentTarget.style.color = "#0f0d0a"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#C9A84C"; }}
    >
      <Plus size={14} />
    </button>
  );
}

function ResQtyControl({ qty, onDec, onInc }) {
  const btn = { width: 28, height: 28, border: "none", background: "#2a2118", color: "#F5F0E8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4 };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <button onClick={onDec} style={btn}><Minus size={12} /></button>
      <span style={{ width: 22, textAlign: "center", fontSize: 13, fontWeight: 700, color: "#F5F0E8" }}>{qty}</span>
      <button onClick={onInc} style={btn}><Plus size={12} /></button>
    </div>
  );
}

function ResPaginatedList({ dishes, renderDish }) {
  const [page, setPage] = useState(0);
  const [slide, setSlide] = useState(null);
  const totalPages = Math.ceil(dishes.length / RES_PER_PAGE);

  useEffect(() => { setPage(0); setSlide(null); }, [dishes]);

  const chunk = (p) => dishes.slice(p * RES_PER_PAGE, (p + 1) * RES_PER_PAGE);

  if (totalPages <= 1) {
    return (
      <div style={{ overflow: "hidden", minHeight: RES_LIST_H }}>
        {chunk(0).map((dish) => renderDish(dish))}
      </div>
    );
  }

  const displayPage = slide ? slide.to : page;

  const go = (newPage) => {
    if (slide !== null || newPage === displayPage || newPage < 0 || newPage >= totalPages) return;
    const d = newPage > displayPage ? 1 : -1;
    setSlide({ from: page, to: newPage, dir: d });
    setTimeout(() => { setPage(newPage); setSlide(null); }, 360);
  };

  const outAnim = slide ? (slide.dir === 1 ? "op-out-fwd" : "op-out-bwd") : undefined;
  const inAnim  = slide ? (slide.dir === 1 ? "op-in-fwd"  : "op-in-bwd")  : undefined;
  const DUR = "0.34s cubic-bezier(0.4,0,0.2,1) forwards";

  return (
    <div>
      <div style={{ position: "relative", overflow: "hidden", minHeight: RES_LIST_H }}>
        <div style={{ position: "absolute", inset: 0, animation: outAnim ? `${outAnim} ${DUR}` : "none" }}>
          {chunk(page).map((dish) => renderDish(dish))}
        </div>
        {slide && (
          <div style={{ position: "absolute", inset: 0, animation: `${inAnim} ${DUR}` }}>
            {chunk(slide.to).map((dish) => renderDish(dish))}
          </div>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
        <ResPageArrow dir="back" disabled={displayPage === 0} onClick={() => go(displayPage - 1)} />
        <span style={{ fontSize: 11, color: "#9C8E7A", letterSpacing: "0.12em", minWidth: 34, textAlign: "center" }}>
          {displayPage + 1} / {totalPages}
        </span>
        <ResPageArrow dir="fwd" disabled={displayPage === totalPages - 1} onClick={() => go(displayPage + 1)} />
      </div>
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
