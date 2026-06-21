import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import SectionHeader from "../components/SectionHeader";

export default function Blog() {
  return (
    <div className="page-enter pt-20 md:pt-28 lg:pt-36">
      <section className="bg-[var(--charcoal)] pt-16 pb-12 md:pt-24 md:pb-20">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 text-center">
          <span className="gold-line">The BLACKROCK Journal</span>
          <h1 className="font-serif-display text-3xl md:text-5xl lg:text-8xl leading-[0.95] mt-6 md:mt-8 text-[var(--warm-white)]">
            Stories from <span className="font-serif-italic text-[var(--gold)]">the table.</span>
          </h1>
          <p className="text-[var(--muted)] mt-8 max-w-xl mx-auto font-light text-base md:text-lg leading-relaxed">
            Recipes, behind-the-scenes moments, and everything happening at BLACKROCK.
          </p>
        </div>
      </section>

      <section className="bg-[var(--charcoal)] pb-32">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col items-center justify-center py-32 text-center border border-[var(--border-soft)]"
          >
            <div className="font-serif-display text-6xl md:text-8xl text-[var(--gold)]/20 mb-8">01</div>
            <p className="font-serif-display text-2xl md:text-3xl text-[var(--warm-white)]">
              First stories coming soon.
            </p>
            <p className="text-[var(--muted)] mt-4 font-light max-w-md">
              We're putting pen to paper. Check back shortly for recipes, chef notes, and what's happening at BLACKROCK.
            </p>
            <Link to="/reservations" className="btn-burgundy mt-12 inline-flex">
              Reserve a Table <ArrowRight size={14} />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
