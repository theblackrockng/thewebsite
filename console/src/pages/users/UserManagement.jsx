import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { UserPlus, Shield, Users, Edit2, ToggleLeft, ToggleRight, X, Check, Loader, Mail, Send, Copy, ExternalLink, Trash2, AlertTriangle, UserCircle } from "lucide-react";

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

const ROLE_OPTIONS = ["staff", "manager", "content_creator", "social_media_manager", "super_admin"];

const ROLE_COLORS = {
  super_admin:          { bg: "rgba(200,169,110,0.15)", text: "var(--ds-gold)",  label: "Super Admin" },
  manager:              { bg: "rgba(99,179,237,0.15)",  text: "#63b3ed",         label: "Manager" },
  content_creator:      { bg: "rgba(139,92,246,0.15)",  text: "#a78bfa",         label: "Content Creator" },
  social_media_manager: { bg: "rgba(236,72,153,0.13)",  text: "#f472b6",         label: "Social Media Manager" },
  staff:                { bg: "rgba(160,174,192,0.12)", text: "var(--ds-muted)", label: "Staff" },
};

const CONTENT_ONLY_PERMS = { ...Object.fromEntries(Object.keys(DEFAULT_PERMS).map(k => [k, false])), dashboard: true, content: true, media: true };

const ROLE_PRESETS = {
  content_creator:      CONTENT_ONLY_PERMS,
  social_media_manager: CONTENT_ONLY_PERMS,
};

function roleLabel(r) {
  return ROLE_COLORS[r]?.label ?? "Staff";
}

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

  const handleRoleChange = (role) => {
    setForm(f => ({ ...f, role }));
    if (ROLE_PRESETS[role]) setPerms({ ...ROLE_PRESETS[role] });
  };

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
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { throw new Error(`Server error (${res.status}). Please try again.`); }
      if (!res.ok) throw new Error(data.error || "Failed to invite user");
      onSuccess();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const isSuperAdmin      = form.role === "super_admin";
  const isContentCreator  = form.role === "content_creator" || form.role === "social_media_manager";

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
              onChange={e => handleRoleChange(e.target.value)}
              style={{ width: "100%", background: "var(--ds-input-bg)", border: "1px solid var(--ds-border)", borderRadius: 7, padding: "9px 12px", fontSize: 13, color: "var(--ds-text)", outline: "none", cursor: "pointer" }}
            >
              {ROLE_OPTIONS.map(r => (
                <option key={r} value={r}>{roleLabel(r)}</option>
              ))}
            </select>
          </div>

          {isContentCreator && (
            <div style={{ padding: "10px 14px", borderRadius: 7, background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.25)", fontSize: 12, color: "#a78bfa" }}>
              Content Creators have access to the Content Hub and Media Library only.
            </div>
          )}

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
                <option key={r} value={r}>{roleLabel(r)}</option>
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

/* ─── TelegramInviteModal ─── */
function TelegramInviteModal({ member, onClose }) {
  const [loading, setLoading] = useState(false);
  const [link, setLink]       = useState("");
  const [copied, setCopied]   = useState(false);
  const [err, setErr]         = useState("");

  const name = member.full_name || member.email.split("@")[0];

  const generate = async () => {
    setErr(""); setLink(""); setLoading(true);
    try {
      const res  = await fetch("/api/telegram-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate link");
      setLink(data.link);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div style={{
        position: "relative", width: "100%", maxWidth: 440,
        background: "var(--ds-surface)", border: "1px solid var(--ds-border)",
        borderRadius: 12, padding: 28, boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: "rgba(41,182,246,0.12)", border: "1px solid rgba(41,182,246,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Send size={13} style={{ color: "#29b6f6" }} />
              </div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 19, fontWeight: 700, color: "var(--ds-text)" }}>
                Telegram Invite
              </div>
            </div>
            <div style={{ fontSize: 12, color: "var(--ds-muted)", paddingLeft: 36 }}>
              Generate a one-time link for <strong style={{ color: "var(--ds-text)" }}>{name}</strong>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ds-muted)", display: "flex", marginTop: 2 }}>
            <X size={17} />
          </button>
        </div>

        {/* Info box */}
        <div style={{ background: "var(--ds-input-bg)", border: "1px solid var(--ds-border)", borderRadius: 8, padding: "12px 14px", marginBottom: 20, fontSize: 12.5, color: "var(--ds-muted)", lineHeight: 1.6 }}>
          This generates a <strong style={{ color: "var(--ds-text)" }}>single-use</strong> invite link to the BLACKROCK staff Telegram group.
          Share it with {name} via WhatsApp, SMS, or any channel — once they join, the link expires automatically.
        </div>

        {/* Generated link */}
        {link && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--ds-muted)", marginBottom: 8 }}>Invite Link</div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{
                flex: 1, background: "rgba(41,182,246,0.06)", border: "1px solid rgba(41,182,246,0.2)",
                borderRadius: 7, padding: "9px 12px", fontSize: 12,
                color: "#29b6f6", fontFamily: "monospace", overflow: "hidden",
                textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {link}
              </div>
              <button
                onClick={copy}
                title="Copy link"
                style={{
                  width: 38, flexShrink: 0, borderRadius: 7,
                  border: copied ? "1px solid #4ade80" : "1px solid var(--ds-border)",
                  background: copied ? "rgba(74,222,128,0.1)" : "var(--ds-input-bg)",
                  color: copied ? "#4ade80" : "var(--ds-muted)",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.2s",
                }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
              <a
                href={link}
                target="_blank"
                rel="noreferrer"
                title="Open in Telegram"
                style={{
                  width: 38, flexShrink: 0, borderRadius: 7,
                  border: "1px solid var(--ds-border)",
                  background: "var(--ds-input-bg)",
                  color: "var(--ds-muted)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  textDecoration: "none", transition: "all 0.15s",
                }}
              >
                <ExternalLink size={14} />
              </a>
            </div>
            <div style={{ fontSize: 11, color: "var(--ds-muted)", marginTop: 8, opacity: 0.7 }}>
              Link expires after 1 use. Generate a new one if needed.
            </div>
          </div>
        )}

        {err && (
          <div style={{ fontSize: 12, color: "#ef4444", padding: "9px 12px", borderRadius: 7, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", marginBottom: 16 }}>
            {err}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: "10px", borderRadius: 7, border: "1px solid var(--ds-border)",
            background: "none", color: "var(--ds-muted)", fontSize: 13, cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}>
            Close
          </button>
          <button onClick={generate} disabled={loading} style={{
            flex: 2, padding: "10px", borderRadius: 7, border: "none",
            background: loading ? "rgba(41,182,246,0.3)" : "rgba(41,182,246,0.15)",
            color: loading ? "var(--ds-muted)" : "#29b6f6",
            border: "1px solid rgba(41,182,246,0.3)",
            fontSize: 13, fontWeight: 600, cursor: loading ? "default" : "pointer",
            fontFamily: "'DM Sans', sans-serif",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>
            {loading
              ? <><Loader size={13} className="spin" /> Generating…</>
              : <><Send size={13} /> {link ? "Generate New Link" : "Generate Invite Link"}</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── DeleteConfirmModal ─── */
function DeleteConfirmModal({ member, onClose, onConfirm, deleting }) {
  const name = member.full_name || member.email.split("@")[0];
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 70, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div style={{
        position: "relative", width: "100%", maxWidth: 420,
        background: "var(--ds-surface)", border: "1px solid rgba(239,68,68,0.3)",
        borderRadius: 12, padding: 28, boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 20 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <AlertTriangle size={18} style={{ color: "#ef4444" }} />
          </div>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 700, color: "var(--ds-text)", marginBottom: 4 }}>
              Remove staff member?
            </div>
            <div style={{ fontSize: 12.5, color: "var(--ds-muted)", lineHeight: 1.5 }}>
              <strong style={{ color: "var(--ds-text)" }}>{name}</strong> ({member.email}) will lose all access immediately. This cannot be undone.
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onClose}
            disabled={deleting}
            style={{
              flex: 1, padding: "10px", borderRadius: 7, border: "1px solid var(--ds-border)",
              background: "none", color: "var(--ds-muted)", fontSize: 13, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            style={{
              flex: 2, padding: "10px", borderRadius: 7, border: "none",
              background: deleting ? "rgba(239,68,68,0.4)" : "#ef4444",
              color: "#fff", fontSize: 13, fontWeight: 600,
              cursor: deleting ? "default" : "pointer",
              fontFamily: "'DM Sans', sans-serif",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            {deleting
              ? <><Loader size={13} className="spin" /> Removing…</>
              : <><Trash2 size={13} /> Remove Staff</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── StaffRow ─── */
function StaffRow({ member, currentUserId, isSuperAdmin, onEdit, onToggle, onTelegram, onDelete }) {
  const navigate = useNavigate();
  const name     = member.full_name || member.email.split("@")[0];
  const initials = name.slice(0, 2).toUpperCase();
  const isSelf   = member.id === currentUserId;

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "40px 1fr 160px 1fr 100px 136px",
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
        flexShrink: 0, overflow: "hidden",
      }}>
        {member.avatar_url
          ? <img src={member.avatar_url} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : initials
        }
      </div>

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
          onClick={() => onTelegram(member)}
          title="Send Telegram invite"
          style={{
            width: 30, height: 30, borderRadius: 6,
            border: "1px solid rgba(41,182,246,0.25)",
            background: "rgba(41,182,246,0.07)", cursor: "pointer",
            color: "#29b6f6", display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(41,182,246,0.15)"; e.currentTarget.style.borderColor = "rgba(41,182,246,0.5)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(41,182,246,0.07)"; e.currentTarget.style.borderColor = "rgba(41,182,246,0.25)"; }}
        >
          <Send size={12} />
        </button>
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
        {isSuperAdmin && (
          <button
            onClick={() => navigate(isSelf ? "/profile" : `/profile/${member.id}`)}
            title="View profile"
            style={{
              width: 30, height: 30, borderRadius: 6,
              border: "1px solid rgba(200,169,110,0.25)",
              background: "rgba(200,169,110,0.07)", cursor: "pointer",
              color: "var(--ds-gold)", display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(200,169,110,0.16)"; e.currentTarget.style.borderColor = "rgba(200,169,110,0.5)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(200,169,110,0.07)"; e.currentTarget.style.borderColor = "rgba(200,169,110,0.25)"; }}
          >
            <UserCircle size={12} />
          </button>
        )}
        {isSuperAdmin && !isSelf && (
          <button
            onClick={() => onDelete(member)}
            title="Remove staff"
            style={{
              width: 30, height: 30, borderRadius: 6,
              border: "1px solid rgba(239,68,68,0.25)",
              background: "rgba(239,68,68,0.06)", cursor: "pointer",
              color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.14)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.5)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(239,68,68,0.06)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.25)"; }}
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── UserManagement ─── */
export default function UserManagement() {
  const { session } = useAuth();
  const [staff, setStaff]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showInvite, setShowInvite]       = useState(false);
  const [editTarget, setEditTarget]       = useState(null);
  const [telegramTarget, setTelegramTarget] = useState(null);
  const [deleteTarget, setDeleteTarget]   = useState(null);
  const [deleting, setDeleting]           = useState(false);
  const [toast, setToast]                 = useState("");

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

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/delete-staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: deleteTarget.id }),
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { throw new Error(`Server error (${res.status})`); }
      if (!res.ok) throw new Error(data.error || "Failed to remove staff");
      setStaff(s => s.filter(m => m.id !== deleteTarget.id));
      showToast(`${deleteTarget.full_name || "Staff"} removed.`);
      setDeleteTarget(null);
    } catch (e) {
      showToast(`Error: ${e.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const currentUserRole = staff.find(m => m.id === session?.user?.id)?.role;
  const isSuperAdmin = currentUserRole === "super_admin";

  const superAdmins        = staff.filter(m => m.role === "super_admin");
  const managers           = staff.filter(m => m.role === "manager");
  const contentCreators    = staff.filter(m => m.role === "content_creator");
  const socialMediaManagers = staff.filter(m => m.role === "social_media_manager");
  const regular            = staff.filter(m => m.role === "staff");

  const tableHeader = (
    <div style={{
      display: "grid",
      gridTemplateColumns: "40px 1fr 160px 1fr 100px 136px",
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

      {/* Logo */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
        <img src="/logo.png" alt="BLACKROCK" style={{ height: 90, width: "auto", objectFit: "contain" }} />
      </div>

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
                  <StaffRow key={m.id} member={m} currentUserId={session?.user?.id} isSuperAdmin={isSuperAdmin} onEdit={setEditTarget} onToggle={toggleActive} onTelegram={setTelegramTarget} onDelete={setDeleteTarget} />
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
                  <StaffRow key={m.id} member={m} currentUserId={session?.user?.id} isSuperAdmin={isSuperAdmin} onEdit={setEditTarget} onToggle={toggleActive} onTelegram={setTelegramTarget} onDelete={setDeleteTarget} />
                ))}
              </div>
            </section>
          )}

          {/* Content Creators */}
          {contentCreators.length > 0 && (
            <section>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#a78bfa", flexShrink: 0 }} />
                <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#a78bfa" }}>
                  Content Creators
                </span>
              </div>
              <div style={{ border: "1px solid var(--ds-border)", borderRadius: 10, overflow: "hidden", background: "var(--ds-surface)" }}>
                {tableHeader}
                {contentCreators.map(m => (
                  <StaffRow key={m.id} member={m} currentUserId={session?.user?.id} isSuperAdmin={isSuperAdmin} onEdit={setEditTarget} onToggle={toggleActive} onTelegram={setTelegramTarget} onDelete={setDeleteTarget} />
                ))}
              </div>
            </section>
          )}

          {/* Social Media Managers */}
          {socialMediaManagers.length > 0 && (
            <section>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f472b6", flexShrink: 0 }} />
                <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#f472b6" }}>
                  Social Media Managers
                </span>
              </div>
              <div style={{ border: "1px solid var(--ds-border)", borderRadius: 10, overflow: "hidden", background: "var(--ds-surface)" }}>
                {tableHeader}
                {socialMediaManagers.map(m => (
                  <StaffRow key={m.id} member={m} currentUserId={session?.user?.id} isSuperAdmin={isSuperAdmin} onEdit={setEditTarget} onToggle={toggleActive} onTelegram={setTelegramTarget} onDelete={setDeleteTarget} />
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
                  <StaffRow key={m.id} member={m} currentUserId={session?.user?.id} isSuperAdmin={isSuperAdmin} onEdit={setEditTarget} onToggle={toggleActive} onTelegram={setTelegramTarget} onDelete={setDeleteTarget} />
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

      {telegramTarget && (
        <TelegramInviteModal
          member={telegramTarget}
          onClose={() => setTelegramTarget(null)}
        />
      )}

      {editTarget && (
        <EditModal
          staff={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={() => { setEditTarget(null); fetchStaff(); showToast("Staff updated."); }}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          member={deleteTarget}
          deleting={deleting}
          onClose={() => !deleting && setDeleteTarget(null)}
          onConfirm={handleDelete}
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
