import { useState, useEffect, useLayoutEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutGrid, CalendarDays, MessageSquare, UtensilsCrossed,
  Image, FileEdit, Users, Settings, Bell, Sun, Moon, LogOut,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

/* ─── useTheme ─── */
function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    try { return localStorage.getItem("blackrock-theme") === "dark"; } catch { return false; }
  });
  useLayoutEffect(() => {
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  }, [isDark]);
  const toggleDark = useCallback(() => {
    setIsDark(prev => {
      const next = !prev;
      try { localStorage.setItem("blackrock-theme", next ? "dark" : "light"); } catch {}
      return next;
    });
  }, []);
  return [isDark, toggleDark];
}

/* ─── Nav items ─── */
const NAV_ITEMS = [
  { to: "/",             label: "Dashboard",    icon: LayoutGrid,      key: "dashboard" },
  { to: "/reservations", label: "Reservations", icon: CalendarDays,    key: "reservations", badge: "pending" },
  { to: "/enquiries",    label: "Enquiries",    icon: MessageSquare,   key: "enquiries",    badge: "enquiries" },
  { to: "/menu",         label: "Menu",         icon: UtensilsCrossed, key: "menu" },
  { to: "/media",        label: "Media",        icon: Image,           key: "media" },
  { to: "/content",      label: "Content",      icon: FileEdit,        key: "content" },
  { to: "/users",        label: "Users",        icon: Users,           key: "users" },
  { to: null,            label: "Settings",     icon: Settings,        key: "settings" },
];

/* ─── NavTab ─── */
function NavTab({ item, pathname, pendingCount, newEnqCount }) {
  const Icon = item.icon;
  const active = item.to !== null && pathname === item.to;
  const badge =
    item.badge === "pending" ? pendingCount :
    item.badge === "enquiries" ? newEnqCount : 0;

  const inner = (
    <>
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={16} strokeWidth={1.75} />
        {badge > 0 && (
          <span style={{
            position: "absolute", top: -6, right: -10,
            minWidth: 15, height: 15, borderRadius: 99,
            background: item.badge === "pending" ? "#d97706" : "#ef4444",
            color: "#fff", fontSize: 8, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0 3px", border: "1.5px solid var(--ds-surface)",
            lineHeight: 1,
          }}>{badge > 99 ? "99" : badge}</span>
        )}
      </div>
      <span className="nav-label" style={{
        fontSize: 9, fontWeight: active ? 600 : 500,
        letterSpacing: "0.05em", textTransform: "uppercase",
        lineHeight: 1, marginTop: 2,
      }}>{item.label}</span>
    </>
  );

  const sharedStyle = {
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    gap: 0, padding: "0 12px", height: "100%",
    textDecoration: "none", flexShrink: 0,
    borderBottom: `2px solid ${active ? "var(--ds-gold)" : "transparent"}`,
    transition: "color 0.15s, border-color 0.15s, background 0.15s",
    position: "relative",
  };

  if (!item.to) {
    return (
      <div style={{ ...sharedStyle, color: "var(--ds-muted)", opacity: 0.38, cursor: "not-allowed" }}>
        {inner}
      </div>
    );
  }

  return (
    <Link
      to={item.to}
      style={{ ...sharedStyle, color: active ? "var(--ds-gold)" : "var(--ds-muted)" }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.color = "var(--ds-text)"; e.currentTarget.style.background = "var(--ds-input-bg)"; } }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.color = "var(--ds-muted)"; e.currentTarget.style.background = "transparent"; } }}
    >
      {inner}
    </Link>
  );
}

/* ─── Layout ─── */
export default function Layout({ children }) {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [isDark, toggleDark] = useTheme();
  const [pendingCount, setPendingCount] = useState(0);
  const [newEnqCount, setNewEnqCount] = useState(0);
  const [clock, setClock] = useState("");
  const [staffProfile, setStaffProfile] = useState(null);

  const emailRaw   = session?.user?.email ?? "";
  const displayName = staffProfile?.full_name ?? emailRaw.split("@")[0] ?? "Admin";
  const initials   = displayName.slice(0, 2).toUpperCase() || "BK";
  const role       = staffProfile?.role ?? "staff";
  const roleLabel  = role === "super_admin" ? "Super Admin" : role === "manager" ? "Manager" : "Staff";

  useEffect(() => {
    async function fetchCounts() {
      const [r1, r2] = await Promise.all([
        supabase.from("reservations").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("enquiries").select("id", { count: "exact", head: true }).eq("status", "new"),
      ]);
      setPendingCount(r1.count ?? 0);
      setNewEnqCount(r2.count ?? 0);
    }
    fetchCounts();
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;
    supabase.from("staff_profiles").select("*").eq("id", session.user.id).maybeSingle()
      .then(({ data }) => { if (data) setStaffProfile(data); });
  }, [session]);

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const totalBadge = pendingCount + newEnqCount;
  const dateStr    = new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

  const handleSignOut = async () => { await signOut(); navigate("/login"); };

  const iconBtn = {
    width: 32, height: 32, borderRadius: 6,
    background: "none", border: "none", cursor: "pointer",
    color: "var(--ds-muted)", display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0, transition: "color 0.15s, background 0.15s",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--ds-bg)" }}>

      {/* ── Top navbar ── */}
      <header style={{
        height: 58, flexShrink: 0,
        background: "var(--ds-surface)",
        borderBottom: "1px solid var(--ds-border)",
        display: "flex", alignItems: "stretch",
        position: "sticky", top: 0, zIndex: 40,
      }}>

        {/* Logo */}
        <div style={{
          display: "flex", flexDirection: "column", justifyContent: "center",
          padding: "0 20px",
          borderRight: "1px solid var(--ds-border)",
          flexShrink: 0,
        }}>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 16, fontWeight: 700, letterSpacing: "3.5px",
            color: "var(--ds-gold)", textTransform: "uppercase", lineHeight: 1,
          }}>
            BLACKROCK
          </div>
          <div style={{
            fontSize: 7.5, fontWeight: 600, letterSpacing: "2.5px",
            color: "var(--ds-muted)", textTransform: "uppercase", marginTop: 4,
          }}>
            Admin Console
          </div>
        </div>

        {/* Nav */}
        <nav style={{
          flex: 1, display: "flex", alignItems: "stretch",
          overflowX: "auto", overflowY: "hidden",
          scrollbarWidth: "none",
        }}>
          {NAV_ITEMS.map(item => (
            <NavTab
              key={item.key}
              item={item}
              pathname={pathname}
              pendingCount={pendingCount}
              newEnqCount={newEnqCount}
            />
          ))}
        </nav>

        {/* Right controls */}
        <div style={{
          display: "flex", alignItems: "center", gap: 3,
          padding: "0 16px",
          borderLeft: "1px solid var(--ds-border)",
          flexShrink: 0,
        }}>

          {/* Date + time */}
          <div className="ds-datetime" style={{
            fontSize: 11.5, color: "var(--ds-muted)",
            whiteSpace: "nowrap", marginRight: 6, lineHeight: 1.4,
            textAlign: "right",
          }}>
            <div style={{ fontSize: 9.5, letterSpacing: "0.02em" }}>{dateStr}</div>
            <div style={{ fontWeight: 600, color: "var(--ds-text)", fontSize: 12.5 }}>{clock}</div>
          </div>

          {/* Bell */}
          <button
            style={{ ...iconBtn, position: "relative" }}
            aria-label="Notifications"
            onMouseEnter={e => { e.currentTarget.style.color = "var(--ds-text)"; e.currentTarget.style.background = "var(--ds-input-bg)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "var(--ds-muted)"; e.currentTarget.style.background = "none"; }}
          >
            <Bell size={15} />
            {totalBadge > 0 && (
              <span style={{
                position: "absolute", top: 4, right: 4,
                width: 14, height: 14, borderRadius: "50%",
                background: "#ef4444", border: "1.5px solid var(--ds-surface)",
                fontSize: 8, fontWeight: 700, color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {totalBadge > 99 ? "99" : totalBadge}
              </span>
            )}
          </button>

          {/* Dark mode */}
          <button
            onClick={toggleDark}
            style={iconBtn}
            aria-label={isDark ? "Switch to light" : "Switch to dark"}
            onMouseEnter={e => { e.currentTarget.style.color = "var(--ds-gold)"; e.currentTarget.style.background = "var(--ds-input-bg)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "var(--ds-muted)"; e.currentTarget.style.background = "none"; }}
          >
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {/* Divider */}
          <div style={{ width: 1, height: 20, background: "var(--ds-border)", margin: "0 8px" }} />

          {/* Admin chip */}
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "rgba(200,169,110,0.12)",
              border: "1.5px solid var(--ds-gold)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700, color: "var(--ds-gold)",
              flexShrink: 0, letterSpacing: "0.05em",
            }}>
              {initials}
            </div>
            <div className="ds-admin-info">
              <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ds-text)", lineHeight: 1, whiteSpace: "nowrap" }}>
                {displayName}
              </div>
              <div style={{ fontSize: 9.5, color: "var(--ds-gold)", marginTop: 3, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                {roleLabel}
              </div>
            </div>
          </div>

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            style={{ ...iconBtn, marginLeft: 4 }}
            title="Sign out"
            onMouseEnter={e => { e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.background = "rgba(239,68,68,0.08)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "var(--ds-muted)"; e.currentTarget.style.background = "none"; }}
          >
            <LogOut size={14} />
          </button>
        </div>
      </header>

      {/* ── Page content ── */}
      <main style={{ flex: 1, overflowY: "auto", background: "var(--ds-bg)" }}>
        {children}
      </main>

      <style>{`
        nav::-webkit-scrollbar { display: none; }
        @media (max-width: 1024px) {
          .nav-label { display: none !important; }
        }
        @media (max-width: 720px) {
          .ds-admin-info { display: none !important; }
          .ds-datetime { display: none !important; }
        }
      `}</style>
    </div>
  );
}
