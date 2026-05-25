import { Link } from "react-router-dom";
import { Instagram, MapPin, Phone, Mail } from "lucide-react";
import { BRAND, NAV_LINKS } from "../lib/data";
import BrandMark from "./BrandMark";

export default function Footer() {
  return (
    <footer className="bg-[var(--charcoal)] text-[var(--warm-white)] relative grain" data-testid="footer">
      <div className="max-w-[1440px] mx-auto px-6 md:px-12 pt-20 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">
          {/* Brand */}
          <div className="md:col-span-5">
            <BrandMark variant="dark" size="lg" className="mb-8" />
            <p className="font-serif-italic text-xl text-[var(--gold)] leading-snug max-w-md mb-6">
              "Lagos on a plate. Lagos in a glass. Lagos in the air."
            </p>
            <p className="text-sm text-white/60 leading-relaxed max-w-md">
              A restaurant, lounge and rooftop in the heart of Ikeja. From jollof to T-bone,
              pepper soup to palm wine — every flavour of Lagos, under one roof.
            </p>
          </div>

          {/* Visit */}
          <div className="md:col-span-3">
            <h4 className="gold-line left mb-6">Visit</h4>
            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <MapPin size={16} className="text-[var(--gold)] mt-1 flex-shrink-0" />
                <span className="text-white/80">{BRAND.address}</span>
              </div>
              <a href={`tel:${BRAND.phoneTel}`} className="flex items-start gap-3 hover:text-[var(--gold)] transition-colors" data-testid="footer-phone">
                <Phone size={16} className="text-[var(--gold)] mt-1 flex-shrink-0" />
                <span className="text-white/80">{BRAND.phone}</span>
              </a>
              <a href={`mailto:${BRAND.email}`} className="flex items-start gap-3 hover:text-[var(--gold)] transition-colors" data-testid="footer-email">
                <Mail size={16} className="text-[var(--gold)] mt-1 flex-shrink-0" />
                <span className="text-white/80">{BRAND.email}</span>
              </a>
            </div>
          </div>

          {/* Hours */}
          <div className="md:col-span-2">
            <h4 className="gold-line left mb-6">Hours</h4>
            <div className="space-y-2 text-sm">
              {BRAND.hours.map((h) => (
                <div key={h.day} className="text-white/70">
                  <div className="text-white/90">{h.day}</div>
                  <div className="text-xs text-white/50">{h.time}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigate */}
          <div className="md:col-span-2">
            <h4 className="gold-line left mb-6">Navigate</h4>
            <ul className="space-y-2 text-sm">
              {NAV_LINKS.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-white/70 hover:text-[var(--gold)] transition-colors" data-testid={`footer-nav-${l.label.toLowerCase()}`}>
                    {l.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link to="/reservations" className="text-[var(--gold)] hover:underline">Reserve a Table</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/40 tracking-wider">
            © {new Date().getFullYear()} The BlackRock Lagos. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-white/60 hover:text-[var(--gold)] transition-colors" aria-label="Instagram">
              <Instagram size={18} />
            </a>
            <span className="text-xs text-white/40 tracking-[0.3em] uppercase">Crafted in Lagos</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
