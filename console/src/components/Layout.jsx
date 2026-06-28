import { useState, useEffect, useLayoutEffect, useCallback, useRef } from "react";
import { Link, useLocation, useNavigate, useMatch } from "react-router-dom";
import {
  LayoutGrid, CalendarDays, MessageSquare, UtensilsCrossed,
  Image, FileEdit, Users, UserCircle, Settings, Home, Search,
  Bell, Sun, Moon, LogOut, Menu, X, Shield, ShieldAlert, Layers, BookUser, BookOpen,
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

/* ─── useCurrentPage ─── */
function useCurrentPage() {
  const { pathname } = useLocation();
  const map = {
    "/": "Dashboard", "/reservations": "Reservations",
    "/menu": "Menu Management", "/enquiries": "Enquiries",
    "/media": "Media Library", "/content": "Site Content",
    "/users": "Staff Management", "/content-hub": "Content Hub",
    "/settings": "Settings", "/blog": "Blog", "/security": "Security Log",
    "/profile": "My Profile",
  };
  if (pathname.startsWith("/profile/")) return "Staff Profile";
  return map[pathname] ?? "Console";
}

/* ─── Nav groups ─── */
const NAV_GROUPS = [
  {
    label: "Management",
    items: [
      { to: "/",             label: "Dashboard",    icon: LayoutGrid },
      { to: "/reservations", label: "Reservations", icon: CalendarDays,   badge: "pending" },
      { to: "/enquiries",    label: "Enquiries",    icon: MessageSquare,  badge: "enquiries" },
    ],
  },
  {
    label: "Content",
    items: [
      { to: "/menu",         label: "Menu Management", icon: UtensilsCrossed },
      { to: "/media",        label: "Media Library",   icon: Image },
      { to: "/content",      label: "Site Content",    icon: FileEdit },
      { to: "/content-hub",  label: "Content Hub",     icon: Layers },
      { to: "/blog",         label: "Blog",            icon: BookOpen },
    ],
  },
  {
    label: "People",
    items: [
      { to: "/users", label: "Staff Management", icon: Users },
      { href: "/staff-directory/index.html", label: "Staff Directory", icon: BookUser },
    ],
  },
  {
    label: "System",
    items: [
      { to: "/settings",  label: "Settings",     icon: Settings },
      { to: "/security",  label: "Security Log",  icon: ShieldAlert, superAdminOnly: true },
    ],
  },
];

/* ─── NavItem ─── */
function NavItem({ item, pathname, pendingCount, newEnqCount, onClick }) {
  const Icon = item.icon;
  const active = item.to !== null && pathname === item.to;
  const isLink = item.to !== null;
  const isExternal = !!item.href;

  const badge = (() => {
    if (item.badge === "pending" && pendingCount > 0)
      return <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 600, background: "rgba(245,158,11,0.15)", color: "#d97706", padding: "1px 6px", borderRadius: 99 }}>{pendingCount > 99 ? "99+" : pendingCount}</span>;
    if (item.badge === "enquiries" && newEnqCount > 0)
      return <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 600, background: "rgba(239,68,68,0.15)", color: "#ef4444", padding: "1px 6px", borderRadius: 99 }}>{newEnqCount > 99 ? "99+" : newEnqCount}</span>;
    return null;
  })();

  const base = { display: "flex", alignItems: "center", gap: 9, borderRadius: 7, fontSize: 13, textDecoration: "none", userSelect: "none" };

  if (active) {
    return (
      <Link to={item.to} onClick={onClick} style={{ ...base, padding: "8px 12px", background: "var(--ds-nav-active)", borderLeft: "3px solid var(--ds-gold)", color: "var(--ds-gold)", fontWeight: 500 }}>
        <Icon size={15} strokeWidth={1.75} style={{ flexShrink: 0 }} />{item.label}{badge}
      </Link>
    );
  }

  if (!isLink && !isExternal) {
    return (
      <div style={{ ...base, padding: "8px 12px 8px 15px", color: "var(--ds-muted)", cursor: "default", opacity: 0.5 }}>
        <Icon size={15} strokeWidth={1.75} style={{ flexShrink: 0 }} />{item.label}{badge}
      </div>
    );
  }

  if (isExternal) {
    return (
      <a
        href={item.href}
        onClick={onClick}
        onMouseEnter={e => { e.currentTarget.style.background = "var(--ds-nav-active)"; e.currentTarget.style.color = "var(--ds-text)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--ds-muted)"; }}
        style={{ ...base, padding: "8px 12px 8px 15px", color: "var(--ds-muted)", background: "transparent" }}
      >
        <Icon size={15} strokeWidth={1.75} style={{ flexShrink: 0 }} />{item.label}{badge}
      </a>
    );
  }

  return (
    <Link
      to={item.to}
      onClick={onClick}
      onMouseEnter={e => { e.currentTarget.style.background = "var(--ds-nav-active)"; e.currentTarget.style.color = "var(--ds-text)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--ds-muted)"; }}
      style={{ ...base, padding: "8px 12px 8px 15px", color: "var(--ds-muted)", background: "transparent" }}
    >
      <Icon size={15} strokeWidth={1.75} style={{ flexShrink: 0 }} />{item.label}{badge}
    </Link>
  );
}

/* ─── SidebarContent ─── */
function SidebarContent({ pathname, pendingCount, newEnqCount, staffProfile, session, onNav }) {
  const name     = staffProfile?.full_name ?? session?.user?.email?.split("@")[0] ?? "Admin";
  const initials = name.slice(0, 2).toUpperCase() || "BK";
  const role     = staffProfile?.role ?? "staff";

  const roleLabel  = role === "super_admin" ? "Super Admin" : role === "manager" ? "Manager" : "Staff";
  const roleColor  = role === "super_admin" ? "var(--ds-gold)" : role === "manager" ? "#63b3ed" : "var(--ds-muted)";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Wordmark */}
      <div style={{ padding: "26px 20px 16px 24px" }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 21, fontWeight: 700, letterSpacing: "3.5px", color: "var(--ds-gold)", textTransform: "uppercase", lineHeight: 1 }}>
          BLACKROCK
        </div>
        <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "2.2px", color: "var(--ds-muted)", textTransform: "uppercase", marginTop: 5 }}>
          Admin Console
        </div>
      </div>

      {/* Gold rule */}
      <div style={{ height: 1, background: "linear-gradient(to right, var(--ds-gold), transparent)", margin: "0 0 16px 24px", width: "68%", opacity: 0.45 }} />

      {/* Nav */}
      <nav style={{ flex: 1, padding: "0 12px", overflowY: "auto" }}>
        {NAV_GROUPS.map(group => (
          <div key={group.label} style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "2px", color: "var(--ds-muted)", textTransform: "uppercase", padding: "0 12px", marginBottom: 4 }}>
              {group.label}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {group.items
                .filter(item => !item.superAdminOnly || staffProfile?.role === 'super_admin')
                .map(item => (
                <NavItem key={item.label} item={item} pathname={pathname} pendingCount={pendingCount} newEnqCount={newEnqCount} onClick={onNav} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Admin chip — links to /profile */}
      <div style={{ padding: "14px 16px", borderTop: "1px solid var(--ds-border)" }}>
        <Link to="/profile" onClick={onNav} style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, textDecoration: "none", borderRadius: 8, padding: "4px 4px", transition: "background .15s" }}
          onMouseEnter={e => { e.currentTarget.style.background = "var(--ds-nav-active)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
          {staffProfile?.avatar_url ? (
            <img src={staffProfile.avatar_url} alt={name} style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", border: "1.5px solid var(--ds-gold)", flexShrink: 0 }} />
          ) : (
            <div style={{
              width: 34, height: 34, borderRadius: "50%",
              background: "rgba(200,169,110,0.15)", border: "1.5px solid var(--ds-gold)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, fontSize: 11.5, fontWeight: 600, color: "var(--ds-gold)",
            }}>
              {initials}
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ds-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {name}
            </div>
            <div style={{ fontSize: 10, color: roleColor, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
              {role === "super_admin" && <Shield size={9} />}
              {roleLabel}
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

function timeAgo(iso) {
  const m = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/* ─── Layout ─── */
export default function Layout({ children }) {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [isDark, toggleDark] = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [newEnqCount, setNewEnqCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [clock, setClock] = useState("");
  const [staffProfile, setStaffProfile] = useState(null);
  const pageName = useCurrentPage();
  const notifRef = useRef(null);

  useEffect(() => {
    async function fetchCounts() {
      const [r1, r2, r3, r4] = await Promise.all([
        supabase.from("reservations").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("enquiries").select("id", { count: "exact", head: true }).eq("status", "new"),
        supabase.from("reservations").select("id, name, occasion, created_at").eq("status", "pending").order("created_at", { ascending: false }).limit(5),
        supabase.from("enquiries").select("id, name, message, created_at").eq("status", "new").order("created_at", { ascending: false }).limit(5),
      ]);
      setPendingCount(r1.count ?? 0);
      setNewEnqCount(r2.count ?? 0);
      const items = [
        ...(r3.data || []).map(r => ({ type: "reservation", id: r.id, label: r.name || "Guest", sub: r.occasion || "Reservation request", time: r.created_at })),
        ...(r4.data || []).map(e => ({ type: "enquiry", id: e.id, label: e.name || "Guest", sub: (e.message || "").slice(0, 55) || "New enquiry", time: e.created_at })),
      ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 8);
      setNotifications(items);
    }
    fetchCounts();
  }, []);

  useEffect(() => {
    if (!notifOpen) return;
    function handleClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [notifOpen]);

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

  const dateStr    = new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  const totalBadge = Math.min(99, pendingCount + newEnqCount);

  const handleSignOut = async () => { await signOut(); navigate("/login"); };

  const iconBtn = {
    width: 34, height: 34, borderRadius: 7,
    background: "none", border: "none", cursor: "pointer",
    color: "var(--ds-muted)",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  };

  const sidebarContent = (
    <SidebarContent
      pathname={pathname}
      pendingCount={pendingCount}
      newEnqCount={newEnqCount}
      staffProfile={staffProfile}
      session={session}
      onNav={() => setMobileOpen(false)}
    />
  );

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--ds-bg)" }}>

      {/* ── Sidebar desktop ── */}
      <aside style={{ width: 210, flexShrink: 0, background: "var(--ds-sidebar)", borderRight: "1px solid var(--ds-border)" }} className="ds-sidebar-desktop">
        {sidebarContent}
      </aside>

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)" }} onClick={() => setMobileOpen(false)} />
          <aside style={{ position: "relative", width: 240, background: "var(--ds-sidebar)", borderRight: "1px solid var(--ds-border)", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "12px 16px" }}>
              <button onClick={() => setMobileOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ds-muted)", display: "flex" }} aria-label="Close"><X size={18} /></button>
            </div>
            <div style={{ flex: 1, overflow: "hidden" }}>
              {sidebarContent}
            </div>
          </aside>
        </div>
      )}

      {/* ── Right column ── */}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, overflow: "hidden" }}>

        {/* Topbar */}
        <header style={{
          height: 56, flexShrink: 0,
          background: "var(--ds-surface)",
          borderBottom: "1px solid var(--ds-border)",
          display: "flex", alignItems: "center",
          padding: "0 20px", gap: 12,
        }}>
          {/* Hamburger mobile */}
          <button onClick={() => setMobileOpen(true)} style={{ ...iconBtn, display: "none" }} className="ds-hamburger" aria-label="Open menu">
            <Menu size={19} />
          </button>

          {/* Breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, fontSize: 13 }}>
            <Home size={13} style={{ color: "var(--ds-muted)" }} />
            <span style={{ color: "var(--ds-muted)" }}>/</span>
            <span style={{ color: "var(--ds-text)", fontWeight: 500 }}>{pageName}</span>
          </div>

          {/* Search */}
          <div style={{ flex: 1, maxWidth: 380, margin: "0 auto", position: "relative" }}>
            <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--ds-muted)", pointerEvents: "none" }} />
            <input
              type="text"
              placeholder="Search reservations, guests, menu…"
              style={{
                width: "100%", background: "var(--ds-input-bg)",
                border: "1px solid var(--ds-border)", borderRadius: 7,
                padding: "7px 12px 7px 32px", fontSize: 12.5,
                color: "var(--ds-text)", fontFamily: "'DM Sans', sans-serif", outline: "none",
              }}
            />
          </div>

          {/* Right controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0, marginLeft: "auto" }}>
            {/* Bell + dropdown */}
            <div ref={notifRef} style={{ position: "relative" }}>
              <button
                onClick={() => setNotifOpen(v => !v)}
                style={{ ...iconBtn, position: "relative", color: notifOpen ? "var(--ds-gold)" : "var(--ds-muted)", background: notifOpen ? "var(--ds-input-bg)" : "none" }}
                aria-label="Notifications"
              >
                <Bell size={17} />
                {totalBadge > 0 && (
                  <span style={{ position: "absolute", top: 5, right: 5, width: 15, height: 15, borderRadius: "50%", background: "#ef4444", border: "1.5px solid var(--ds-surface)", fontSize: 8.5, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {totalBadge}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div style={{
                  position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 100,
                  width: 320, background: "var(--ds-surface)",
                  border: "1px solid var(--ds-border)", borderRadius: 10,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
                  overflow: "hidden",
                }}>
                  {/* Header */}
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--ds-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ds-text)" }}>Notifications</span>
                    {totalBadge > 0 && (
                      <span style={{ fontSize: 10, color: "var(--ds-muted)" }}>{totalBadge} unread</span>
                    )}
                  </div>

                  {/* List */}
                  {notifications.length === 0 ? (
                    <div style={{ padding: "24px 16px", textAlign: "center", fontSize: 12.5, color: "var(--ds-muted)" }}>
                      No new notifications
                    </div>
                  ) : (
                    <div style={{ maxHeight: 320, overflowY: "auto" }}>
                      {notifications.map((n, i) => (
                        <button
                          key={`${n.type}-${n.id}`}
                          onClick={() => { setNotifOpen(false); navigate(n.type === "reservation" ? "/reservations" : "/enquiries"); }}
                          style={{
                            width: "100%", display: "flex", alignItems: "flex-start", gap: 10,
                            padding: "11px 16px", background: "none", border: "none", cursor: "pointer",
                            borderBottom: i < notifications.length - 1 ? "1px solid var(--ds-border)" : "none",
                            textAlign: "left",
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = "var(--ds-input-bg)"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
                        >
                          {/* Type icon */}
                          <div style={{
                            width: 30, height: 30, borderRadius: 7, flexShrink: 0,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            background: n.type === "reservation" ? "rgba(245,158,11,0.12)" : "rgba(239,68,68,0.1)",
                          }}>
                            {n.type === "reservation"
                              ? <CalendarDays size={14} style={{ color: "#d97706" }} />
                              : <MessageSquare size={14} style={{ color: "#ef4444" }} />
                            }
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ds-text)", display: "flex", justifyContent: "space-between", gap: 6 }}>
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.label}</span>
                              <span style={{ fontSize: 10.5, color: "var(--ds-muted)", flexShrink: 0 }}>{timeAgo(n.time)}</span>
                            </div>
                            <div style={{ fontSize: 11.5, color: "var(--ds-muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {n.sub}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Footer links */}
                  <div style={{ borderTop: "1px solid var(--ds-border)", display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                    <button onClick={() => { setNotifOpen(false); navigate("/reservations"); }}
                      style={{ padding: "10px", fontSize: 11.5, color: "var(--ds-muted)", background: "none", border: "none", borderRight: "1px solid var(--ds-border)", cursor: "pointer" }}
                      onMouseEnter={e => { e.currentTarget.style.color = "var(--ds-gold)"; e.currentTarget.style.background = "var(--ds-input-bg)"; }}
                      onMouseLeave={e => { e.currentTarget.style.color = "var(--ds-muted)"; e.currentTarget.style.background = "none"; }}
                    >
                      All Reservations
                    </button>
                    <button onClick={() => { setNotifOpen(false); navigate("/enquiries"); }}
                      style={{ padding: "10px", fontSize: 11.5, color: "var(--ds-muted)", background: "none", border: "none", cursor: "pointer" }}
                      onMouseEnter={e => { e.currentTarget.style.color = "var(--ds-gold)"; e.currentTarget.style.background = "var(--ds-input-bg)"; }}
                      onMouseLeave={e => { e.currentTarget.style.color = "var(--ds-muted)"; e.currentTarget.style.background = "none"; }}
                    >
                      All Enquiries
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Dark mode */}
            <button
              onClick={toggleDark}
              style={iconBtn}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              onMouseEnter={e => { e.currentTarget.style.color = "var(--ds-gold)"; e.currentTarget.style.background = "var(--ds-input-bg)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "var(--ds-muted)"; e.currentTarget.style.background = "none"; }}
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* Divider */}
            <div style={{ width: 1, height: 18, background: "var(--ds-border)", margin: "0 6px" }} />

            {/* Date & time */}
            <div style={{ fontSize: 12, color: "var(--ds-muted)", whiteSpace: "nowrap" }}>
              {dateStr} <span style={{ opacity: 0.4 }}>·</span>{" "}
              <span style={{ fontWeight: 500, color: "var(--ds-text)" }}>{clock}</span>
            </div>

            {/* Divider */}
            <div style={{ width: 1, height: 18, background: "var(--ds-border)", margin: "0 6px" }} />

            {/* Sign out */}
            <button
              onClick={handleSignOut}
              onMouseEnter={e => { e.currentTarget.style.color = "var(--ds-text)"; e.currentTarget.style.background = "var(--ds-input-bg)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "var(--ds-muted)"; e.currentTarget.style.background = "none"; }}
              style={{
                fontSize: 12.5, color: "var(--ds-muted)",
                padding: "6px 10px", borderRadius: 6,
                background: "none", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 5,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              <LogOut size={13} />
              Sign out
            </button>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: "auto", background: "var(--ds-bg)" }}>
          {children}
        </main>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .ds-sidebar-desktop { display: block !important; }
          .ds-hamburger { display: none !important; }
        }
        @media (max-width: 767px) {
          .ds-sidebar-desktop { display: none !important; }
          .ds-hamburger { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
