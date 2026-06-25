import { useEffect, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { ShieldCheck, ArrowRight, Loader2, Lock, Eye, CalendarCheck, MessageSquare, UtensilsCrossed, Image, FileText, Users, Settings, LayoutDashboard } from "lucide-react";

const DM = "'DM Sans', system-ui, sans-serif";
const SERIF = "'Cormorant Garamond', Georgia, serif";
const GOLD = "#C8A96E";
const BURGUNDY = "#7a1c1c";

const ROLE_LABELS = {
  super_admin: "Super Admin",
  manager:     "Manager",
  staff:       "Staff",
};

const ROLE_COLORS = {
  super_admin: { bg: "rgba(200,169,110,0.12)", text: "#C8A96E", border: "rgba(200,169,110,0.35)" },
  manager:     { bg: "rgba(99,179,237,0.10)",  text: "#63b3ed", border: "rgba(99,179,237,0.3)" },
  staff:       { bg: "rgba(160,174,192,0.10)", text: "#9a9388", border: "rgba(160,174,192,0.3)" },
};

const PERMISSION_META = {
  dashboard:    { icon: LayoutDashboard, label: "Dashboard",      desc: "View live reservation counts, enquiry metrics and daily activity." },
  reservations: { icon: CalendarCheck,   label: "Reservations",   desc: "View, manage and confirm guest table reservations." },
  enquiries:    { icon: MessageSquare,   label: "Enquiries",      desc: "Read and respond to incoming guest messages and enquiries." },
  menu:         { icon: UtensilsCrossed, label: "Menu Management",desc: "Add, edit and organise the restaurant menu and pricing." },
  media:        { icon: Image,           label: "Media Library",  desc: "Upload and manage photos and assets used across the site." },
  content:      { icon: FileText,        label: "Site Content",   desc: "Edit website copy, pages and published content." },
  users:        { icon: Users,           label: "Staff Management",desc: "Invite team members, assign roles and manage access levels." },
  settings:     { icon: Settings,        label: "Settings",       desc: "Configure console preferences and system settings." },
};

export default function Welcome() {
  const { session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) return;
    supabase
      .from("staff_profiles")
      .select("*")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => {
        setProfile(data);
        setLoading(false);
      });
  }, [session]);

  const handleEnter = () => navigate("/", { replace: true });

  const firstName = profile?.full_name?.split(" ")[0] || session?.user?.email?.split("@")[0] || "there";
  const role = profile?.role || "staff";
  const roleColors = ROLE_COLORS[role] ?? ROLE_COLORS.staff;
  const isSuperAdmin = role === "super_admin";

  const activePermissions = isSuperAdmin
    ? Object.keys(PERMISSION_META)
    : Object.keys(PERMISSION_META).filter(key => profile?.permissions?.[key]);

  if (authLoading) return null;
  if (!session) return <Navigate to="/login" replace />;

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f7f4f0" }}>
        <Loader2 size={22} style={{ color: "#9a9388", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f7f4f0", fontFamily: DM, padding: "40px 20px 80px" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontFamily: DM, fontSize: 10, fontWeight: 800, letterSpacing: "0.3em", textTransform: "uppercase", color: BURGUNDY, marginBottom: 20 }}>
            BLACKROCK ADMIN CONSOLE
          </div>
          <h1 style={{ fontFamily: SERIF, fontSize: "clamp(32px, 6vw, 48px)", fontWeight: 600, color: "#1a1a1a", margin: "0 0 12px", lineHeight: 1.1 }}>
            Welcome, <span style={{ color: GOLD, fontStyle: "italic" }}>{firstName}.</span>
          </h1>
          <p style={{ fontSize: 15, color: "#6f685d", margin: 0, lineHeight: 1.6, maxWidth: 440, marginInline: "auto" }}>
            Your account is active. Before you begin, please take a moment to read the guidelines below.
          </p>
        </div>

        {/* Role card */}
        <div style={{
          background: "#fff", borderRadius: 16, padding: "22px 24px",
          border: "1px solid #ece8e1", marginBottom: 16,
          display: "flex", alignItems: "center", gap: 16,
          boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, flexShrink: 0,
            background: roleColors.bg, border: `1px solid ${roleColors.border}`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <ShieldCheck size={22} style={{ color: roleColors.text }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9a9388", marginBottom: 4 }}>Your Role</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 600, color: "#1a1a1a" }}>
                {ROLE_LABELS[role] ?? role}
              </span>
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                textTransform: "uppercase", padding: "3px 10px", borderRadius: 99,
                background: roleColors.bg, color: roleColors.text, border: `1px solid ${roleColors.border}`,
              }}>
                {isSuperAdmin ? "Full Access" : `${activePermissions.length} section${activePermissions.length !== 1 ? "s" : ""}`}
              </span>
            </div>
          </div>
        </div>

        {/* Confidentiality notice */}
        <div style={{
          background: "#fff", borderRadius: 16, padding: "22px 24px",
          border: "1px solid #ece8e1", marginBottom: 16,
          boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(122,28,28,0.07)", border: "1px solid rgba(122,28,28,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Lock size={15} style={{ color: BURGUNDY }} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", letterSpacing: "0.01em" }}>Confidentiality & Access Policy</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              "This console is strictly for internal use by authorised BLACKROCK staff only.",
              "Do not share your login credentials, access links or any console data with anyone outside the team.",
              "All activity within this console is logged and monitored.",
              "Treat all guest information — reservations, enquiries and contact details — as strictly confidential.",
              "Unauthorised access or data sharing may result in immediate account suspension and further action.",
            ].map((rule, i) => (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{
                  width: 20, height: 20, borderRadius: "50%", flexShrink: 0, marginTop: 1,
                  background: "rgba(122,28,28,0.07)", border: "1px solid rgba(122,28,28,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, fontWeight: 800, color: BURGUNDY,
                }}>
                  {i + 1}
                </div>
                <p style={{ margin: 0, fontSize: 13.5, color: "#4a443d", lineHeight: 1.65 }}>{rule}</p>
              </div>
            ))}
          </div>
        </div>

        {/* What you can do */}
        <div style={{
          background: "#fff", borderRadius: 16, padding: "22px 24px",
          border: "1px solid #ece8e1", marginBottom: 32,
          boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(200,169,110,0.1)", border: "1px solid rgba(200,169,110,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Eye size={15} style={{ color: GOLD }} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>Your Console Access</div>
          </div>

          {activePermissions.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: "#9a9388", fontStyle: "italic" }}>
              No sections have been assigned yet. Contact your administrator.
            </p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
              {activePermissions.map(key => {
                const meta = PERMISSION_META[key];
                if (!meta) return null;
                const Icon = meta.icon;
                return (
                  <div key={key} style={{
                    display: "flex", gap: 12, alignItems: "flex-start",
                    padding: "12px 14px", borderRadius: 10,
                    background: "rgba(200,169,110,0.05)",
                    border: "1px solid rgba(200,169,110,0.18)",
                  }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: 7, flexShrink: 0,
                      background: "rgba(200,169,110,0.1)", border: "1px solid rgba(200,169,110,0.2)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Icon size={14} style={{ color: GOLD }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: "#1a1a1a", marginBottom: 2 }}>{meta.label}</div>
                      <div style={{ fontSize: 11.5, color: "#6f685d", lineHeight: 1.5 }}>{meta.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* CTA */}
        <div style={{ textAlign: "center" }}>
          <button
            onClick={handleEnter}
            style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              padding: "16px 40px", borderRadius: 12, border: "none",
              background: BURGUNDY, color: "#fff",
              fontFamily: DM, fontSize: 15, fontWeight: 600,
              cursor: "pointer", letterSpacing: "0.01em",
              boxShadow: "0 8px 24px -8px rgba(122,28,28,0.45)",
              transition: "background 0.15s, transform 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#8b2020"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = BURGUNDY; e.currentTarget.style.transform = "translateY(0)"; }}
          >
            Enter Console <ArrowRight size={16} />
          </button>
          <p style={{ marginTop: 14, fontSize: 11.5, color: "#9a9388" }}>
            By continuing, you confirm you have read and understood the above guidelines.
          </p>
        </div>

      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
