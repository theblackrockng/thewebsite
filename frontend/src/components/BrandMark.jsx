import { LOGO_URL } from "../lib/data";

/**
 * BrandMark — visual brand identity for The BlackRock Lagos
 *
 * variant="light"  →  PNG logo with white BG knocked out via mix-blend-mode
 *                     (best for cream/warm-white sections)
 * variant="dark"   →  CSS-rendered wordmark in brush font
 *                     (used on charcoal/burgundy sections; sidesteps the white-bg
 *                     issue in the source PNG and keeps the mark bold + visible)
 */
export default function BrandMark({ variant = "light", size = "md", className = "" }) {
  const sizes = {
    sm:   { img: "h-14",        title: "text-3xl md:text-4xl",           sub: "text-[10px]" },
    md:   { img: "h-16 md:h-20",title: "text-4xl md:text-5xl",           sub: "text-[11px]" },
    lg:   { img: "h-24 md:h-28",title: "text-5xl md:text-6xl",           sub: "text-xs" },
    xl:   { img: "h-28 md:h-32",title: "text-6xl md:text-7xl",           sub: "text-sm" },
    hero: { img: "h-36 md:h-44",title: "text-7xl sm:text-8xl md:text-9xl", sub: "text-base md:text-lg" },
  };
  const s = sizes[size] || sizes.md;

  if (variant === "light") {
    return (
      <img
        src={LOGO_URL}
        alt="The BlackRock Lagos"
        className={`${s.img} w-auto logo-img-light ${className}`}
        data-testid="brand-mark-light"
      />
    );
  }

  // dark variant — text rendition
  const isHero = size === "hero";
  return (
    <span className={`brand-mark-text dark size-${size} ${className}`} data-testid="brand-mark-dark">
      <span className={`bm-title ${s.title}`}>{isHero ? "BLACKROCK" : "The BlackRock"}</span>
      <span className={`bm-sub ${s.sub}`}>LAGOS</span>
    </span>
  );
}
