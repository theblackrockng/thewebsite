import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { UserPlus, Shield, Users, Edit2, ToggleLeft, ToggleRight, X, Check, Loader, Mail } from "lucide-react";

const PERMISSIONS = [
  { key: "dashboard",    label: "Dashboard" },
  { key: "reservations", label: "Reservations" },
  { key: "enquiries",    label: "Enquiries" },
  { key: "menu",         label: "Menu" },
  { key: "media",        label: "Media" },
  { key: "content",      label: "Content" },
  { key: "users",        label: "Users" },
  { key: "settings",     label: "Settings" },
];

const DEFAULT_PERMS = {
  dashboard: true, reservations: false, enquiries: false,
  menu: false, media: false, content: false, users: false, settings: false,
};

const ROLE_OPTIONS = ["staff", "manager", "super_admin"];

const ROLE_COLORS = {
  super_admin: { bg: "rgba(200,169,110,0.15)", text: "var(--ds-gold)", label: "Super Admin" },
  manager:     { bg: "rgba(99,179,237,0.15)",  text: "#63b3ed",        label: "Manager" },
  staff:       { bg: "rgba(160,174,192,0.12)", text: "var(--ds-muted)", label: "Staff" },
};

function RoleBadge({ role }) {
  const c = ROLE_COLORS[role] ?? ROLE_COLORS.staff;
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, letterSpacing: "0.06em",
      textTransform: "uppercase", padding: "2px 8px", borderRadius: 99,
      background: c.bg, color: c.text,
    }}>{c.label}</span>
  );
}

function PermDots({ permissions, role }) {
  if (role === "super_admin") {
    return <span style={{ fontSize: 11, color: "var(--ds-gold)" }}>Full access</span>;
  }
  const active = PERMISSIONS.filter(p => permissions?.[p.key]);
  if (!active.length) return <span style={{ fontSize: 11, color: "var(--ds-muted)" }}>No access</span>;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {active.map(p => (
        <span key={p.key} style={{
          fontSize: 10, padding: "1px 7px", borderRadius: 4,
          background: "var(--ds-input-bg)", color: "var(--ds-muted)",
          border: "1px solid var(--ds-border)",
        }}>{p.label}</span>
      ))}
    </div>
  );
}

/* ─── InviteModal ─── */
function InviteModal({ onClose, onSuccess, currentUserId }) {
  const [form, setForm]     = useState({ email: "", full_name: "", role: "staff" });
  const [perms, setPerms]   = useState({ ...DEFAULT_PERMS });
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState("");

  const togglePerm = (key) => setPerms(p => ({ ...p, [key]: !p[key] }));

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setSaving(true);
    try {
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          full_name: form.full_name,
          role: form.role,
          permissions: form.role === "super_admin" ? Object.fromEntries(PERMISSIONS.map(p => [p.key, true])) : perms,
          invited_by: currentUserId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to invite user");
      onSuccess();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const isSuperAdmin = form.role === "super_admin";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div style={{
        position: "relative", width: "100%", maxWidth: 480,
        background: "var(--ds-surface)", border: "1px solid var(--ds-border)",
        borderRadius: 12, padding: 28, boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 700, color: "var(--ds-text)" }}>Invite Staff</div>
            <div style={{ fontSize: 12, color: "var(--ds-muted)", marginTop: 3 }}>They'll receive an email to set up their account.</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ds-muted)", display: "flex" }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ds-muted)", display: "block", marginBottom: 6 }}>Email *</label>
            <input
              required type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="staff@example.com"
              style={{ width: "100%", background: "var(--ds-input-bg)", border: "1px solid var(--ds-border)", borderRadius: 7, padding: "9px 12px", fontSize: 13, color: "var(--ds-text)", outline: "none", boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ds-muted)", display: "block", marginBottom: 6 }}>Full Name</label>
            <input
              value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              placeholder="e.g. Emeka Okafor"
              style={{ width: "100%", background: "var(--ds-input-bg)", border: "1px solid var(--ds-border)", borderRadius: 7, padding: "9px 12px", fontSize: 13, color: "var(--ds-text)", outline: "none", boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ds-muted)", display: "block", marginBottom: 6 }}>Role</label>
            <select
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              style={{ width: "100%", background: "var(--ds-input-bg)", border: "1px solid var(--ds-border)", borderRadius: 7, padding: "9px 12px", fontSize: 13, color: "var(--ds-text)", outline: "none", cursor: "pointer" }}
            >
              {ROLE_OPTIONS.map(r => (
                <option key={r} value={r}>
                  {r === "super_admin" ? "Super Admin" : r === "manager" ? "Manager" : "Staff"}
                </option>
              ))}
            </select>
          </div>

          {!isSuperAdmin && (
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ds-muted)", display: "block", marginBottom: 10 }}>Permissions</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {PERMISSIONS.map(p => (
                  <label key={p.key} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "8px 10px", borderRadius: 6, cursor: "pointer",
                    background: perms[p.key] ? "rgba(200,169,110,0.08)" : "var(--ds-input-bg)",
                    border: `1px solid ${perms[p.key] ? "var(--ds-gold)" : "var(--ds-border)"}`,
                    transition: "all 0.15s",
                  }}>
                    <input
                      type="checkbox"
                      checked={!!perms[p.key]}
                      onChange={() => togglePerm(p.key)}
                      style={{ display: "none" }}
                    />
                    <div style={{
                      width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                      background: perms[p.key] ? "var(--ds-gold)" : "transparent",
                      border: `1.5px solid ${perms[p.key] ? "var(--ds-gold)" : "var(--ds-border)"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {perms[p.key] && <Check size={9} color="#000" strokeWidth={3} />}
                    </div>
                    <span style={{ fontSize: 12, color: perms[p.key] ? "var(--ds-text)" : "var(--ds-muted)", fontWeight: perms[p.key] ? 500 : 400 }}>{p.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {isSuperAdmin && (
            <div style={{ padding: "10px 14px", borderRadius: 7, background: "rgba(200,169,110,0.08)", border: "1px solid rgba(200,169,110,0.25)", fontSize: 12, color: "var(--ds-gold)" }}>
              Super admins have full access to all sections.
            </div>
          )}

          {err && <div style={{ fontSize: 12, color: "#ef4444", padding: "9px 12px", borderRadius: 7, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)" }}>{err}</div>}

          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: "10px", borderRadius: 7, border: "1px solid var(--ds-border)",
              background: "none", color: "var(--ds-muted)", fontSize: 13, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} style={{
              flex: 2, padding: "10px", borderRadius: 7, border: "none",
              background: saving ? "rgba(200,169,110,0.4)" : "var(--ds-gold)",
              color: "#000", fontSize: 13, fontWeight: 600, cursor: saving ? "default" : "pointer",
              fontFamily: "'DM Sans', sans-serif",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
              {saving ? <><Loader size={13} className="spin" /> Sending invite…</> : <><Mail size={13} /> Send Invite</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── EditModal ─── */
function EditModal({ staff, onClose, onSave }) {
  const [role, setRole]     = useState(staff.role);
  const [perms, setPerms]   = useState({ ...DEFAULT_PERMS, ...staff.permissions });
  const [saving, setSaving] = useState(false);

  const togglePerm = (key) => setPerms(p => ({ ...p, [key]: !p[key] }));

  const save = async () => {
    setSaving(true);
    const updates = {
      role,
      permissions: role === "super_admin"
        ? Object.fromEntries(PERMISSIONS.map(p => [p.key, true]))
        : perms,
    };
    await supabase.from("staff_profiles").update(updates).eq("id", staff.id);
    onSave();
    setSaving(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div style={{
        position: "relative", width: "100%", maxWidth: 460,
        background: "var(--ds-surface)", border: "1px solid var(--ds-border)",
        borderRadius: 12, padding: 28, boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 700, color: "var(--ds-text)" }}>
              Edit — {staff.full_name || staff.email.split("@")[0]}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--ds-muted)", marginTop: 3 }}>{staff.email}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ds-muted)", display: "flex" }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ds-muted)", display: "block", marginBottom: 6 }}>Role</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              style={{ width: "100%", background: "var(--ds-input-bg)", border: "1px solid var(--ds-border)", borderRadius: 7, padding: "9px 12px", fontSize: 13, color: "var(--ds-text)", outline: "none", cursor: "pointer" }}
            >
              {ROLE_OPTIONS.map(r => (
                <option key={r} value={r}>
                  {r === "super_admin" ? "Super Admin" : r === "manager" ? "Manager" : "Staff"}
                </option>
              ))}
            </select>
          </div>

          {role !== "super_admin" && (
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ds-muted)", display: "block", marginBottom: 10 }}>Permissions</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {PERMISSIONS.map(p => (
                  <label key={p.key} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "8px 10px", borderRadius: 6, cursor: "pointer",
                    background: perms[p.key] ? "rgba(200,169,110,0.08)" : "var(--ds-input-bg)",
                    border: `1px solid ${perms[p.key] ? "var(--ds-gold)" : "var(--ds-border)"}`,
                    transition: "all 0.15s",
                  }}>
                    <input type="checkbox" checked={!!perms[p.key]} onChange={() => togglePerm(p.key)} style={{ display: "none" }} />
                    <div style={{
                      width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                      background: perms[p.key] ? "var(--ds-gold)" : "transparent",
                      border: `1.5px solid ${perms[p.key] ? "var(--ds-gold)" : "var(--ds-border)"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {perms[p.key] && <Check size={9} color="#000" strokeWidth={3} />}
                    </div>
                    <span style={{ fontSize: 12, color: perms[p.key] ? "var(--ds-text)" : "var(--ds-muted)", fontWeight: perms[p.key] ? 500 : 400 }}>{p.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button onClick={onClose} style={{
              flex: 1, padding: "10px", borderRadius: 7, border: "1px solid var(--ds-border)",
              background: "none", color: "var(--ds-muted)", fontSize: 13, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}>
              Cancel
            </button>
            <button onClick={save} disabled={saving} style={{
              flex: 2, padding: "10px", borderRadius: 7, border: "none",
              background: saving ? "rgba(200,169,110,0.4)" : "var(--ds-gold)",
              color: "#000", fontSize: 13, fontWeight: 600, cursor: saving ? "default" : "pointer",
              fontFamily: "'DM Sans', sans-serif",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
              {saving ? <><Loader size={13} className="spin" /> Saving…</> : <><Check size={13} /> Save Changes</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── StaffRow ─── */
function StaffRow({ member, currentUserId, onEdit, onToggle }) {
  const name     = member.full_name || member.email.split("@")[0];
  const initials = name.slice(0, 2).toUpperCase();
  const isSelf   = member.id === currentUserId;

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "40px 1fr 160px 1fr 100px 80px",
      gap: 16, alignItems: "center",
      padding: "14px 20px",
      borderBottom: "1px solid var(--ds-border)",
      transition: "background 0.15s",
    }}
    onMouseEnter={e => e.currentTarget.style.background = "var(--ds-input-bg)"}
    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
    >
      {/* Avatar */}
      <div style={{
        width: 36, height: 36, borderRadius: "50%",
        background: member.active ? "rgba(200,169,110,0.12)" : "var(--ds-input-bg)",
        border: `1.5px solid ${member.active ? "var(--ds-gold)" : "var(--ds-border)"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, fontWeight: 700,
        color: member.active ? "var(--ds-gold)" : "var(--ds-muted)",
        flexShrink: 0,
      }}>{initials}</div>

      {/* Name + email */}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ds-text)", display: "flex", alignItems: "center", gap: 6 }}>
          {name}
          {isSelf && <span style={{ fontSize: 9.5, background: "rgba(200,169,110,0.15)", color: "var(--ds-gold)", padding: "1px 6px", borderRadius: 99, letterSpacing: "0.05em" }}>You</span>}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--ds-muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{member.email}</div>
      </div>

      {/* Role */}
      <div><RoleBadge role={member.role} /></div>

      {/* Permissions */}
      <div><PermDots permissions={member.permissions} role={member.role} /></div>

      {/* Status */}
      <button
        onClick={() => !isSelf && onToggle(member)}
        disabled={isSelf}
        title={isSelf ? "Cannot deactivate yourself" : member.active ? "Deactivate" : "Activate"}
        style={{
          display: "flex", alignItems: "center", gap: 5,
          background: "none", border: "none", cursor: isSelf ? "default" : "pointer",
          color: member.active ? "#4ade80" : "var(--ds-muted)",
          fontSize: 11.5, fontWeight: 500, opacity: isSelf ? 0.5 : 1,
          padding: 4,
        }}
      >
        {member.active
          ? <><ToggleRight size={18} /> Active</>
          : <><ToggleLeft size={18} /> Inactive</>
        }
      </button>

      {/* Actions */}
      <div style={{ display: "flex", gap: 4 }}>
        <button
          onClick={() => onEdit(member)}
          title="Edit"
          style={{
            width: 30, height: 30, borderRadius: 6, border: "1px solid var(--ds-border)",
            background: "var(--ds-input-bg)", cursor: "pointer",
            color: "var(--ds-muted)", display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.color = "var(--ds-text)"; e.currentTarget.style.borderColor = "var(--ds-gold)"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "var(--ds-muted)"; e.currentTarget.style.borderColor = "var(--ds-border)"; }}
        >
          <Edit2 size={12} />
        </button>
      </div>
    </div>
  );
}

/* ─── UserManagement ─── */
export default function UserManagement() {
  const { session } = useAuth();
  const [staff, setStaff]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [toast, setToast]         = useState("");

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  const fetchStaff = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("staff_profiles")
      .select("*")
      .order("created_at", { ascending: false });
    setStaff(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchStaff(); }, []);

  const toggleActive = async (member) => {
    await supabase.from("staff_profiles").update({ active: !member.active }).eq("id", member.id);
    setStaff(s => s.map(m => m.id === member.id ? { ...m, active: !m.active } : m));
    showToast(`${member.full_name || "Staff"} ${!member.active ? "activated" : "deactivated"}`);
  };

  const superAdmins = staff.filter(m => m.role === "super_admin");
  const managers    = staff.filter(m => m.role === "manager");
  const regular     = staff.filter(m => m.role === "staff");

  const tableHeader = (
    <div style={{
      display: "grid",
      gridTemplateColumns: "40px 1fr 160px 1fr 100px 80px",
      gap: 16, padding: "10px 20px",
      borderBottom: "1px solid var(--ds-border)",
      fontSize: 10, fontWeight: 600,
      letterSpacing: "0.08em", textTransform: "uppercase",
      color: "var(--ds-muted)",
    }}>
      <div />
      <div>Member</div>
      <div>Role</div>
      <div>Access</div>
      <div>Status</div>
      <div>Actions</div>
    </div>
  );

  return (
    <div style={{ padding: "32px 32px", maxWidth: 1100, margin: "0 auto" }}>

      {/* Page header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: "rgba(200,169,110,0.12)", border: "1px solid rgba(200,169,110,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Users size={17} style={{ color: "var(--ds-gold)" }} />
            </div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 700, color: "var(--ds-text)", margin: 0 }}>
              Staff Management
            </h1>
          </div>
          <p style={{ fontSize: 13, color: "var(--ds-muted)", margin: 0 }}>
            {staff.length} {staff.length === 1 ? "member" : "members"} · Invite staff and manage their access permissions.
          </p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 18px", borderRadius: 8, border: "none",
            background: "var(--ds-gold)", color: "#000",
            fontSize: 13, fontWeight: 600, cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <UserPlus size={14} /> Invite Staff
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--ds-muted)", fontSize: 13 }}>
          <Loader size={20} className="spin" style={{ marginBottom: 12 }} />
          <div>Loading team…</div>
        </div>
      ) : staff.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", border: "1px dashed var(--ds-border)", borderRadius: 10 }}>
          <Shield size={32} style={{ color: "var(--ds-muted)", marginBottom: 12 }} />
          <div style={{ fontSize: 15, fontWeight: 500, color: "var(--ds-text)", marginBottom: 6 }}>No staff yet</div>
          <div style={{ fontSize: 13, color: "var(--ds-muted)", marginBottom: 20 }}>Invite your first team member to get started.</div>
          <button
            onClick={() => setShowInvite(true)}
            style={{ padding: "9px 20px", borderRadius: 7, border: "1px solid var(--ds-gold)", background: "transparent", color: "var(--ds-gold)", fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
          >
            Send first invite
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Super Admins */}
          {superAdmins.length > 0 && (
            <section>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <Shield size={13} style={{ color: "var(--ds-gold)" }} />
                <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ds-gold)" }}>
                  Super Admins
                </span>
              </div>
              <div style={{ border: "1px solid var(--ds-border)", borderRadius: 10, overflow: "hidden", background: "var(--ds-surface)" }}>
                {tableHeader}
                {superAdmins.map(m => (
                  <StaffRow key={m.id} member={m} currentUserId={session?.user?.id} onEdit={setEditTarget} onToggle={toggleActive} />
                ))}
              </div>
            </section>
          )}

          {/* Managers */}
          {managers.length > 0 && (
            <section>
              <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ds-muted)", marginBottom: 12 }}>
                Managers
              </div>
              <div style={{ border: "1px solid var(--ds-border)", borderRadius: 10, overflow: "hidden", background: "var(--ds-surface)" }}>
                {tableHeader}
                {managers.map(m => (
                  <StaffRow key={m.id} member={m} currentUserId={session?.user?.id} onEdit={setEditTarget} onToggle={toggleActive} />
                ))}
              </div>
            </section>
          )}

          {/* Staff */}
          {regular.length > 0 && (
            <section>
              <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ds-muted)", marginBottom: 12 }}>
                Staff
              </div>
              <div style={{ border: "1px solid var(--ds-border)", borderRadius: 10, overflow: "hidden", background: "var(--ds-surface)" }}>
                {tableHeader}
                {regular.map(m => (
                  <StaffRow key={m.id} member={m} currentUserId={session?.user?.id} onEdit={setEditTarget} onToggle={toggleActive} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {showInvite && (
        <InviteModal
          currentUserId={session?.user?.id}
          onClose={() => setShowInvite(false)}
          onSuccess={() => { setShowInvite(false); fetchStaff(); showToast("Invite sent!"); }}
        />
      )}

      {editTarget && (
        <EditModal
          staff={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={() => { setEditTarget(null); fetchStaff(); showToast("Staff updated."); }}
        />
      )}

      {toast && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: "var(--ds-surface)", border: "1px solid var(--ds-border)",
          borderRadius: 8, padding: "11px 20px", fontSize: 13, color: "var(--ds-text)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)", zIndex: 70,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <Check size={14} style={{ color: "#4ade80" }} /> {toast}
        </div>
      )}

      <style>{`
        .spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
