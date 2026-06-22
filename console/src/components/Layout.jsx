import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { CalendarDays, UtensilsCrossed, MessageSquare, LayoutDashboard, LogOut, Menu, X, ChevronRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/reservations", label: "Reservations", icon: CalendarDays },
  { to: "/menu", label: "Menu Editor", icon: UtensilsCrossed },
  { to: "/enquiries", label: "Enquiries", icon: MessageSquare },
];

function NavItem({ item, onClick }) {
  const location = useLocation();
  const active = location.pathname === item.to;
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-150 group ${
        active
          ? "bg-[var(--gold)] text-[var(--charcoal)]"
          : "text-[var(--muted)] hover:text-[var(--warm-white)] hover:bg-[var(--charcoal-mid)]"
      }`}
    >
      <Icon size={16} />
      <span>{item.label}</span>
      {active && <ChevronRight size={14} className="ml-auto opacity-60" />}
    </Link>
  );
}

export default function Layout({ children }) {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--charcoal)" }}>
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex flex-col w-56 flex-shrink-0 border-r border-[var(--border-soft)]" style={{ background: "var(--surface)" }}>
        {/* Brand */}
        <div className="px-5 py-6 border-b border-[var(--border-soft)]">
          <div className="font-serif text-lg text-[var(--gold)]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>BlackRock Restaurant</div>
          <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted)] mt-1">Admin Console</div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {NAV.map((item) => <NavItem key={item.to} item={item} />)}
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t border-[var(--border-soft)]">
          <div className="text-xs text-[var(--muted)] truncate mb-3">{session?.user?.email}</div>
          <button onClick={handleSignOut} className="btn-ghost w-full justify-center text-xs">
            <LogOut size={13} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile topbar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14 border-b border-[var(--border-soft)]" style={{ background: "var(--surface)" }}>
        <div className="font-serif text-base text-[var(--gold)]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>BlackRock Restaurant</div>
        <button onClick={() => setMobileOpen(true)} className="text-[var(--warm-white)]">
          <Menu size={22} />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 flex flex-col border-r border-[var(--border-soft)]" style={{ background: "var(--surface)" }}>
            <div className="flex items-center justify-between px-5 py-5 border-b border-[var(--border-soft)]">
              <div className="font-serif text-lg text-[var(--gold)]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>BlackRock Restaurant</div>
              <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted)] mt-1">Admin Console</div>
              <button onClick={() => setMobileOpen(false)} className="text-[var(--muted)]"><X size={20} /></button>
            </div>
            <nav className="flex-1 py-4">
              {NAV.map((item) => <NavItem key={item.to} item={item} onClick={() => setMobileOpen(false)} />)}
            </nav>
            <div className="px-4 py-4 border-t border-[var(--border-soft)]">
              <button onClick={handleSignOut} className="btn-ghost w-full justify-center text-xs">
                <LogOut size={13} /> Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
        {children}
      </main>
    </div>
  );
}
