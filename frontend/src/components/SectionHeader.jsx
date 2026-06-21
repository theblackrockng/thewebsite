import { motion } from "framer-motion";

export default function SectionHeader({ kicker, title, subtitle, align = "center", dark = true }) {
  const textAlign = align === "left" ? "text-left items-start" : "text-center items-center";
  const titleColor = dark ? "text-[var(--warm-white)]" : "text-[var(--charcoal)]";
  const subColor = dark ? "text-white/65" : "text-[var(--muted)]";

  return (
    <div className={`flex flex-col ${textAlign} gap-5 max-w-3xl ${align === "center" ? "mx-auto" : ""}`}>
      {kicker && (
        <motion.span
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="gold-line"
        >
          {kicker}
        </motion.span>
      )}
      {title && (
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className={`font-serif-display text-4xl md:text-5xl lg:text-6xl leading-[1.05] ${titleColor}`}
        >
          {title}
        </motion.h2>
      )}
      {subtitle && (
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className={`text-base md:text-lg leading-relaxed font-light ${subColor}`}
        >
          {subtitle}
        </motion.p>
      )}
    </div>
  );
}
