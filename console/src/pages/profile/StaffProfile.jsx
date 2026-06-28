import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Camera, Check, X, Eye, EyeOff, Loader2, AlertCircle,
  CheckCircle2, Lock, Shield, Bell, Clock, LayoutGrid,
  CalendarDays, MessageSquare, UtensilsCrossed, Image,
  FileEdit, Users, Settings, Layers, BookOpen, BookUser,
  ShieldAlert, ChevronRight, AlertTriangle, Mail,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { useStaff } from "../../context/StaffContext";

const GOLD    = "#c8a96e";
const BURGUNDY = "#7a1c1c";
const DM     = "'DM Sans', system-ui, sans-serif";
const CORMORANT = "'Cormorant Garamond', Georgia, serif";

function toWAT(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-NG", {
    timeZone: "Africa/Lagos",
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }) + " WAT";
}

function toWATDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-NG", {
    timeZone: "Africa/Lagos",
    day: "2-digit", month: "long", year: "numeric",
  });
}

const ROLE_COLORS = {
  super_admin:          { bg: "rgba(200,169,110,0.15)", text: GOLD,        label: "Super Admin" },
  manager:              { bg: "rgba(99,179,237,0.15)",  text: "#63b3ed",   label: "Manager" },
  content_creator:      { bg: "rgba(139,92,246,0.15)",  text: "#a78bfa",   label: "Content Creator" },
  social_media_manager: { bg: "rgba(236,72,153,0.13)",  text: "#f472b6",   label: "Social Media Manager" },
  staff:                { bg: "rgba(160,174,192,0.12)", text: "var(--ds-muted)", label: "Staff" },
};

const ROLE_OPTIONS = [
  { value: "super_admin",          label: "Super Admin" },
  { value: "manager",              label: "Manager" },
  { value: "content_creator",      label: "Content Creator" },
  { value: "social_media_manager", label: "Social Media Manager" },
  { value: "staff",                label: "Staff" },
];

const ALL_MODULES = [
  { key: "dashboard",    label: "Dashboard",        icon: LayoutGrid,     superAdminOnly: false },
  { key: "reservations", label: "Reservations",     icon: CalendarDays,   superAdminOnly: false },
  { key: "enquiries",    label: "Enquiries",        icon: MessageSquare,  superAdminOnly: false },
  { key: "menu",         label: "Menu Management",  icon: UtensilsCrossed, superAdminOnly: false },
  { key: "media",        label: "Media Library",    icon: Image,          superAdminOnly: false },
  { key: "content",      label: "Site Content",     icon: FileEdit,       superAdminOnly: false },
  { key: "content_hub",  label: "Content Hub",      icon: Layers,         superAdminOnly: false },
  { key: "blog",         label: "Blog",             icon: BookOpen,       superAdminOnly: false },
  { key: "users",        label: "User Management",  icon: Users,          superAdminOnly: false },
  { key: "settings",     label: "Settings",         icon: Settings,       superAdminOnly: false },
  { key: "security",     label: "Security Log",     icon: ShieldAlert,    superAdminOnly: true },
];

/* ─── Shared input style ─── */
function inputStyle(focused, disabled) {
  return {
    fontFamily: DM, fontSize: 14, color: disabled ? "var(--ds-muted)" : "var(--ds-text)",
    width: "100%", padding: "11px 14px", borderRadius: 8,
    border: focused ? `1.5px solid ${GOLD}` : "1.5px solid var(--ds-border)",
    background: disabled ? "var(--ds-input-bg)" : "var(--ds-surface)",
    boxShadow: focused ? `0 0 0 3px rgba(200,169,110,0.12)` : "none",
    transition: "border-color .15s, box-shadow .15s", outline: "none",
    boxSizing: "border-box",
  };
}

/* ─── Card wrapper ─── */
function Card({ children, style = {} }) {
  return (
    <div style={{
      background: "var(--ds-surface)", border: "1px solid var(--ds-border)",
      borderRadius: 12, padding: "24px 28px", ...style,
    }}>
      {children}
    </div>
  );
}

/* ─── Section title ─── */
function SectionTitle({ children }) {
  return (
    <div style={{
      fontFamily: CORMORANT, fontSize: 19, fontWeight: 700,
      color: "var(--ds-text)", marginBottom: 20, letterSpacing: "0.01em",
    }}>{children}</div>
  );
}

/* ─── Alert banner ─── */
function Alert({ type, message }) {
  if (!message) return null;
  const isErr = type === "error";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "10px 14px", borderRadius: 8, marginBottom: 16,
      background: isErr ? "rgba(122,28,28,0.07)" : "rgba(34,197,94,0.08)",
      border: `1px solid ${isErr ? "rgba(122,28,28,0.2)" : "rgba(34,197,94,0.25)"}`,
      fontSize: 13, color: isErr ? BURGUNDY : "#16a34a", fontFamily: DM,
    }}>
      {isErr ? <AlertCircle size={13} style={{ flexShrink: 0 }} /> : <CheckCircle2 size={13} style={{ flexShrink: 0 }} />}
      {message}
    </div>
  );
}

/* ─── OTP flow hook ─── */
function useOTP(session, purpose) {
  const [sent, setSent]       = useState(false);
  const [sending, setSending] = useState(false);
  const [code, setCode]       = useState("");
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpSuccess, setOtpSuccess] = useState("");

  async function sendOTP(email, name) {
    setSending(true); setOtpError(""); setSent(false); setVerified(false); setCode("");
    try {
      const r = await fetch("/api/send-otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: session.user.id, purpose, email, name }),
      });
      const d = await r.json();
      if (!r.ok) { setOtpError(d.error || "Failed to send code"); return false; }
      setSent(true);
      return true;
    } catch { setOtpError("Network error. Please try again."); return false; }
    finally { setSending(false); }
  }

  async function verifyOTP() {
    if (!code.trim()) { setOtpError("Please enter the verification code."); return false; }
    setVerifying(true); setOtpError("");
    try {
      const r = await fetch("/api/verify-otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: session.user.id, purpose, code: code.trim() }),
      });
      const d = await r.json();
      if (!r.ok) { setOtpError(d.error || "Invalid code"); return false; }
      setVerified(true); setOtpSuccess("Identity verified.");
      return true;
    } catch { setOtpError("Network error. Please try again."); return false; }
    finally { setVerifying(false); }
  }

  function reset() { setSent(false); setCode(""); setVerified(false); setOtpError(""); setOtpSuccess(""); }

  return { sent, sending, code, setCode, verified, verifying, otpError, otpSuccess, sendOTP, verifyOTP, reset };
}

/* ─── Avatar uploader ─── */
function AvatarSection({ profile, isSelf, onAvatarChange }) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr]             = useState("");
  const fileRef = useRef(null);

  const name     = profile?.full_name || profile?.email?.split("@")[0] || "?";
  const initials = name.slice(0, 2).toUpperCase();
  const avatarUrl = profile?.avatar_url;

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setErr("Only JPG, PNG, or WebP files are accepted."); return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setErr("File must be under 2 MB."); return;
    }
    setErr(""); setUploading(true);
    try {
      // Center-crop to square using canvas
      const squareBlob = await cropToSquare(file);
      const path = `${profile.id}/avatar.jpg`;
      const { error: upErr } = await supabase.storage.from("staff-avatars").upload(path, squareBlob, {
        contentType: "image/jpeg", upsert: true,
      });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("staff-avatars").getPublicUrl(path);
      const url = `${publicUrl}?t=${Date.now()}`;
      await supabase.from("staff_profiles").update({ avatar_url: url }).eq("id", profile.id);
      onAvatarChange(url);
    } catch (e) {
      setErr("Upload failed. Please try again.");
      console.error(e);
    } finally { setUploading(false); }
    e.target.value = "";
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
      <div style={{ position: "relative" }}>
        <div style={{
          width: 100, height: 100, borderRadius: "50%",
          border: `2px solid ${GOLD}`,
          background: avatarUrl ? "transparent" : "rgba(200,169,110,0.12)",
          display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden", flexShrink: 0,
        }}>
          {avatarUrl
            ? <img src={avatarUrl} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <span style={{ fontSize: 28, fontWeight: 700, color: GOLD, fontFamily: DM }}>{initials}</span>
          }
          {uploading && (
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Loader2 size={20} color="#fff" className="animate-spin" />
            </div>
          )}
        </div>
      </div>

      {isSelf && (
        <>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{
              fontFamily: DM, fontSize: 12, fontWeight: 600, letterSpacing: "0.05em",
              padding: "7px 16px", borderRadius: 7,
              background: "none", border: `1.5px solid var(--ds-border)`,
              color: "var(--ds-text)", cursor: uploading ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            <Camera size={13} />
            {uploading ? "Uploading…" : "Change Photo"}
          </button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={handleFile} />
          {err && <p style={{ fontSize: 11.5, color: BURGUNDY, textAlign: "center", margin: 0, fontFamily: DM }}>{err}</p>}
        </>
      )}
    </div>
  );
}

async function cropToSquare(file) {
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const size = Math.min(img.width, img.height);
      const canvas = document.createElement("canvas");
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, (img.width - size) / 2, (img.height - size) / 2, size, size, 0, 0, size, size);
      URL.revokeObjectURL(url);
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Canvas export failed")), "image/jpeg", 0.9);
    };
    img.onerror = reject;
    img.src = url;
  });
}

/* ─── Identity card ─── */
function IdentityCard({ profile }) {
  const rc = ROLE_COLORS[profile?.role] ?? ROLE_COLORS.staff;
  const isActive = profile?.active !== false && profile?.status !== "suspended";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontFamily: DM, fontSize: 18, fontWeight: 700, color: "var(--ds-text)", lineHeight: 1.2 }}>
        {profile?.full_name || profile?.email?.split("@")[0] || "Staff Member"}
      </div>
      {profile?.job_title && (
        <div style={{ fontFamily: DM, fontSize: 13.5, color: "var(--ds-muted)" }}>{profile.job_title}</div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
        <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", padding: "3px 10px", borderRadius: 99, background: rc.bg, color: rc.text }}>
          {rc.label}
        </span>
        <span style={{
          fontSize: 10.5, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase",
          padding: "3px 10px", borderRadius: 99,
          background: isActive ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.12)",
          color: isActive ? "#16a34a" : "#d97706",
        }}>
          {isActive ? "Active" : "Suspended"}
        </span>
        {profile?.two_fa_enabled && (
          <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", padding: "3px 10px", borderRadius: 99, background: "rgba(99,179,237,0.12)", color: "#63b3ed" }}>
            2FA On
          </span>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 4 }}>
        <div style={{ fontSize: 12, color: "var(--ds-muted)", fontFamily: DM }}>
          <span style={{ fontWeight: 500 }}>Joined:</span> {toWATDate(profile?.created_at)}
        </div>
        {profile?.last_login_at && (
          <div style={{ fontSize: 12, color: "var(--ds-muted)", fontFamily: DM }}>
            <span style={{ fontWeight: 500 }}>Last login:</span> {toWAT(profile.last_login_at)}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Password change section ─── */
function PasswordSection({ session, profile }) {
  const [newPwd, setNewPwd]         = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showNew, setShowNew]       = useState(false);
  const [focused, setFocused]       = useState("");
  const [saving, setSaving]         = useState(false);
  const [result, setResult]         = useState({ type: "", msg: "" });

  const otp = useOTP(session, "password_change");

  async function handleSend() {
    await otp.sendOTP(profile.email, profile.full_name);
  }

  async function handleSave() {
    setResult({ type: "", msg: "" });
    if (!newPwd || newPwd.length < 8) { setResult({ type: "error", msg: "New password must be at least 8 characters." }); return; }
    if (newPwd !== confirmPwd) { setResult({ type: "error", msg: "Passwords do not match." }); return; }
    if (!otp.verified) { setResult({ type: "error", msg: "Please verify your identity via OTP first." }); return; }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPwd });
    setSaving(false);
    if (error) { setResult({ type: "error", msg: error.message }); return; }
    setResult({ type: "success", msg: "Password updated successfully." });
    setNewPwd(""); setConfirmPwd(""); otp.reset();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Alert type={result.type || (otp.otpError ? "error" : "")} message={result.msg || otp.otpError} />
      <Alert type="success" message={otp.otpSuccess} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ds-muted)", fontFamily: DM, display: "block", marginBottom: 6 }}>New Password</label>
          <div style={{ position: "relative" }}>
            <input
              type={showNew ? "text" : "password"}
              placeholder="Min. 8 characters"
              value={newPwd}
              onChange={e => setNewPwd(e.target.value)}
              onFocus={() => setFocused("new")}
              onBlur={() => setFocused("")}
              style={{ ...inputStyle(focused === "new"), paddingRight: 44 }}
              disabled={saving}
            />
            <button type="button" onClick={() => setShowNew(v => !v)}
              style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--ds-muted)", display: "flex" }}>
              {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ds-muted)", fontFamily: DM, display: "block", marginBottom: 6 }}>Confirm New Password</label>
          <input
            type="password"
            placeholder="Repeat new password"
            value={confirmPwd}
            onChange={e => setConfirmPwd(e.target.value)}
            onFocus={() => setFocused("confirm")}
            onBlur={() => setFocused("")}
            style={inputStyle(focused === "confirm")}
            disabled={saving}
          />
        </div>
      </div>

      {/* OTP row */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ds-muted)", fontFamily: DM, display: "block", marginBottom: 6 }}>
            Verification Code {otp.sent && <span style={{ color: "var(--ds-muted)", textTransform: "none", letterSpacing: 0 }}>— sent to {profile?.email}</span>}
          </label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder={otp.sent ? "Enter 6-digit code" : "Click 'Send Code' first"}
            value={otp.code}
            onChange={e => otp.setCode(e.target.value.replace(/\D/g, ""))}
            onFocus={() => setFocused("otp")}
            onBlur={() => setFocused("")}
            style={inputStyle(focused === "otp", !otp.sent || otp.verified)}
            disabled={!otp.sent || otp.verified || saving}
          />
        </div>
        {!otp.verified && (
          <button
            onClick={otp.sent ? otp.verifyOTP : handleSend}
            disabled={otp.sending || otp.verifying}
            style={{
              fontFamily: DM, fontSize: 13, fontWeight: 600, padding: "11px 18px", borderRadius: 8, border: "none",
              background: GOLD, color: "#1a1a1a", cursor: "pointer", whiteSpace: "nowrap",
              opacity: otp.sending || otp.verifying ? 0.6 : 1,
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            {(otp.sending || otp.verifying) && <Loader2 size={13} className="animate-spin" />}
            {otp.sending ? "Sending…" : otp.verifying ? "Verifying…" : otp.sent ? "Verify Code" : "Send Code"}
          </button>
        )}
        {otp.verified && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#16a34a", fontSize: 13, fontFamily: DM, paddingBottom: 1 }}>
            <CheckCircle2 size={15} /> Verified
          </div>
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={saving || !otp.verified || !newPwd || !confirmPwd}
        style={{
          fontFamily: DM, fontSize: 13.5, fontWeight: 600, padding: "11px 24px",
          borderRadius: 8, border: "none", alignSelf: "flex-start",
          background: saving || !otp.verified || !newPwd || !confirmPwd ? "var(--ds-input-bg)" : GOLD,
          color: saving || !otp.verified || !newPwd || !confirmPwd ? "var(--ds-muted)" : "#1a1a1a",
          cursor: saving || !otp.verified || !newPwd || !confirmPwd ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", gap: 6,
          transition: "background .15s, color .15s",
        }}
      >
        {saving && <Loader2 size={13} className="animate-spin" />}
        Update Password
      </button>
    </div>
  );
}

/* ─── 2FA toggle ─── */
function TwoFASection({ session, profile, onUpdate }) {
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [result, setResult]         = useState({ type: "", msg: "" });
  const otp = useOTP(session, "2fa_setup");

  const enabled = profile?.two_fa_enabled ?? false;

  async function handleToggle() {
    if (!enabled) {
      // Turning on: require OTP first
      setConfirming(true);
      setResult({ type: "", msg: "" });
      otp.reset();
      const sent = await otp.sendOTP(profile.email, profile.full_name);
      if (!sent) setConfirming(false);
    } else {
      // Turning off: direct update
      setSaving(true);
      await supabase.from("staff_profiles").update({ two_fa_enabled: false }).eq("id", profile.id);
      setSaving(false);
      onUpdate({ two_fa_enabled: false });
      setResult({ type: "success", msg: "Two-factor authentication has been disabled." });
    }
  }

  async function handleConfirm2FA() {
    setResult({ type: "", msg: "" });
    const verified = await otp.verifyOTP();
    if (!verified) return;
    setSaving(true);
    await supabase.from("staff_profiles").update({ two_fa_enabled: true }).eq("id", profile.id);
    setSaving(false);
    onUpdate({ two_fa_enabled: true });
    setConfirming(false);
    otp.reset();
    setResult({ type: "success", msg: "Two-factor authentication is now enabled." });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Alert type={result.type || (otp.otpError ? "error" : "")} message={result.msg || otp.otpError} />

      <div style={{
        display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16,
        padding: "16px 18px", borderRadius: 10, border: "1px solid var(--ds-border)",
        background: "var(--ds-input-bg)",
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Shield size={14} color={enabled ? "#63b3ed" : "var(--ds-muted)"} />
            <span style={{ fontFamily: DM, fontSize: 14, fontWeight: 600, color: "var(--ds-text)" }}>Two-Factor Authentication</span>
            {enabled && (
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", padding: "2px 8px", borderRadius: 99, background: "rgba(99,179,237,0.12)", color: "#63b3ed" }}>ENABLED</span>
            )}
          </div>
          <p style={{ fontFamily: DM, fontSize: 12.5, color: "var(--ds-muted)", margin: 0, lineHeight: 1.5 }}>
            Require an email verification code every time you sign in to the console.
          </p>
        </div>
        <button
          onClick={handleToggle}
          disabled={saving || confirming}
          style={{
            width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
            background: enabled ? "#63b3ed" : "var(--ds-border)",
            position: "relative", flexShrink: 0, transition: "background .2s",
          }}
        >
          <div style={{
            position: "absolute", top: 2, left: enabled ? 22 : 2,
            width: 20, height: 20, borderRadius: "50%",
            background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
            transition: "left .2s",
          }} />
        </button>
      </div>

      {confirming && (
        <div style={{ padding: "16px 18px", borderRadius: 10, border: "1px solid var(--ds-border)", background: "var(--ds-surface)", display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ fontFamily: DM, fontSize: 13, color: "var(--ds-text)", margin: 0 }}>
            A verification code was sent to <strong>{profile?.email}</strong>. Enter it below to enable 2FA.
          </p>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <input
              type="text" inputMode="numeric" maxLength={6}
              placeholder="6-digit code"
              value={otp.code} onChange={e => otp.setCode(e.target.value.replace(/\D/g, ""))}
              style={{ ...inputStyle(false), flex: 1 }}
            />
            <button onClick={handleConfirm2FA} disabled={saving || otp.verifying || !otp.code}
              style={{ fontFamily: DM, fontSize: 13, fontWeight: 600, padding: "11px 16px", borderRadius: 8, border: "none", background: GOLD, color: "#1a1a1a", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              {(saving || otp.verifying) && <Loader2 size={13} className="animate-spin" />}
              Enable 2FA
            </button>
            <button onClick={() => { setConfirming(false); otp.reset(); }}
              style={{ fontFamily: DM, fontSize: 13, padding: "11px 14px", borderRadius: 8, border: "1px solid var(--ds-border)", background: "none", color: "var(--ds-muted)", cursor: "pointer" }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Permissions list ─── */
function PermissionsSection({ profile }) {
  const isSA = profile?.role === "super_admin";
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      {ALL_MODULES.map(mod => {
        const hasAccess = isSA || (mod.superAdminOnly ? false : profile?.permissions?.[mod.key] === true);
        const Icon = mod.icon;
        return (
          <div key={mod.key} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "9px 12px", borderRadius: 8,
            background: hasAccess ? "rgba(200,169,110,0.06)" : "var(--ds-input-bg)",
            border: `1px solid ${hasAccess ? "rgba(200,169,110,0.2)" : "var(--ds-border)"}`,
          }}>
            <Icon size={13} color={hasAccess ? GOLD : "var(--ds-muted)"} />
            <span style={{ fontFamily: DM, fontSize: 12.5, color: hasAccess ? "var(--ds-text)" : "var(--ds-muted)", flex: 1 }}>
              {mod.label}
            </span>
            {hasAccess
              ? <Check size={12} color="#16a34a" />
              : <Lock size={11} color="var(--ds-muted)" />
            }
          </div>
        );
      })}
    </div>
  );
}

/* ─── Notification prefs ─── */
function NotificationsSection({ profile, onUpdate }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [emailOn, setEmailOn] = useState(profile?.notification_email ?? true);
  const [telegramOn, setTelegramOn] = useState(profile?.notification_telegram ?? true);

  async function save() {
    setSaving(true);
    await supabase.from("staff_profiles").update({ notification_email: emailOn, notification_telegram: telegramOn }).eq("id", profile.id);
    setSaving(false); setSaved(true);
    onUpdate({ notification_email: emailOn, notification_telegram: telegramOn });
    setTimeout(() => setSaved(false), 2500);
  }

  function Toggle({ on, onChange, label, desc }) {
    return (
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, padding: "14px 0", borderBottom: "1px solid var(--ds-border)" }}>
        <div>
          <div style={{ fontFamily: DM, fontSize: 13.5, fontWeight: 500, color: "var(--ds-text)", marginBottom: 3 }}>{label}</div>
          <div style={{ fontFamily: DM, fontSize: 12, color: "var(--ds-muted)", lineHeight: 1.4 }}>{desc}</div>
        </div>
        <button onClick={() => onChange(!on)} style={{
          width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer",
          background: on ? GOLD : "var(--ds-border)", position: "relative", flexShrink: 0, transition: "background .2s",
        }}>
          <div style={{
            position: "absolute", top: 2, left: on ? 20 : 2,
            width: 18, height: 18, borderRadius: "50%", background: "#fff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transition: "left .2s",
          }} />
        </button>
      </div>
    );
  }

  return (
    <div>
      <Toggle on={emailOn} onChange={setEmailOn} label="Email Notifications"
        desc="Receive updates about reservations, enquiries, and important console activity via email." />
      <Toggle on={telegramOn} onChange={setTelegramOn} label="Telegram Notifications"
        desc="Get instant Telegram alerts for new reservations, messages, and security events." />
      <button onClick={save} disabled={saving}
        style={{
          marginTop: 16, fontFamily: DM, fontSize: 13, fontWeight: 600, padding: "9px 20px",
          borderRadius: 8, border: "none",
          background: saved ? "rgba(34,197,94,0.12)" : GOLD,
          color: saved ? "#16a34a" : "#1a1a1a",
          cursor: saving ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", gap: 6,
          transition: "background .2s, color .2s",
        }}>
        {saving && <Loader2 size={13} className="animate-spin" />}
        {saved ? <><Check size={13} /> Saved</> : "Save Preferences"}
      </button>
    </div>
  );
}

/* ─── Recent activity ─── */
const MODULE_ICONS = {
  reservations: CalendarDays, enquiries: MessageSquare, menu: UtensilsCrossed,
  media: Image, content: FileEdit, users: Users, settings: Settings,
  security: ShieldAlert, blog: BookOpen, dashboard: LayoutGrid,
};

function ActivitySection({ userId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("activity_log").select("*").eq("user_id", userId)
      .order("created_at", { ascending: false }).limit(10)
      .then(({ data }) => { setItems(data || []); setLoading(false); });
  }, [userId]);

  if (loading) return <div style={{ fontSize: 13, color: "var(--ds-muted)", fontFamily: DM }}>Loading activity…</div>;
  if (!items.length) return (
    <div style={{ textAlign: "center", padding: "24px 0", fontSize: 13, color: "var(--ds-muted)", fontFamily: DM }}>
      No activity recorded yet.
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {items.map(item => {
          const Icon = MODULE_ICONS[item.module] ?? LayoutGrid;
          return (
            <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--ds-border)" }}>
              <div style={{ width: 30, height: 30, borderRadius: 7, background: "var(--ds-input-bg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={13} color="var(--ds-muted)" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: DM, fontSize: 13, color: "var(--ds-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.action}</div>
                <div style={{ fontFamily: DM, fontSize: 11, color: "var(--ds-muted)", marginTop: 2 }}>{toWAT(item.created_at)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Admin controls card ─── */
function AdminControls({ target, onUpdate }) {
  const [role, setRole]           = useState(target.role);
  const [savingRole, setSavingRole] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [deleteOpen, setDeleteOpen]   = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [working, setWorking]     = useState(false);
  const [result, setResult]       = useState({ type: "", msg: "" });
  const navigate = useNavigate();

  const isActive = target.active !== false;
  const targetName = target.full_name || target.email;

  async function handleRoleSave() {
    setSavingRole(true); setResult({ type: "", msg: "" });
    await supabase.from("staff_profiles").update({ role }).eq("id", target.id);
    setSavingRole(false);
    onUpdate({ role });
    setResult({ type: "success", msg: `Role updated to ${ROLE_COLORS[role]?.label ?? role}.` });
  }

  async function handleSuspend() {
    setWorking(true);
    await supabase.from("staff_profiles").update({ active: false, status: "suspended" }).eq("id", target.id);
    setWorking(false); setSuspendOpen(false);
    onUpdate({ active: false, status: "suspended" });
    setResult({ type: "success", msg: `${targetName}'s account has been suspended.` });
  }

  async function handleReactivate() {
    setWorking(true);
    await supabase.from("staff_profiles").update({ active: true, status: "active" }).eq("id", target.id);
    setWorking(false);
    onUpdate({ active: true, status: "active" });
    setResult({ type: "success", msg: `${targetName}'s account has been reactivated.` });
  }

  async function handleDelete() {
    if (deleteConfirm !== targetName) return;
    setWorking(true);
    // Delete via Supabase admin (service role needed — use console API or direct admin auth delete)
    const { error } = await supabase.auth.admin.deleteUser(target.id);
    setWorking(false);
    if (error) { setResult({ type: "error", msg: "Failed to delete account. Please try from Supabase dashboard." }); setDeleteOpen(false); return; }
    navigate("/users");
  }

  async function handleResetPassword() {
    setResult({ type: "", msg: "" });
    const { error } = await supabase.auth.resetPasswordForEmail(target.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) { setResult({ type: "error", msg: error.message }); return; }
    setResult({ type: "success", msg: `Password reset email sent to ${target.email}.` });
  }

  return (
    <Card style={{ border: "1px solid rgba(245,158,11,0.3)", background: "rgba(245,158,11,0.03)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <AlertTriangle size={15} color="#d97706" />
        <span style={{ fontFamily: CORMORANT, fontSize: 18, fontWeight: 700, color: "var(--ds-text)", letterSpacing: "0.01em" }}>Admin Controls</span>
      </div>

      <Alert type={result.type} message={result.msg} />

      {/* Role change */}
      <div style={{ marginBottom: 20, padding: "16px", borderRadius: 10, border: "1px solid var(--ds-border)", background: "var(--ds-input-bg)" }}>
        <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ds-muted)", fontFamily: DM, display: "block", marginBottom: 8 }}>Change Role</label>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <select
            value={role}
            onChange={e => setRole(e.target.value)}
            style={{ ...inputStyle(false), flex: 1, cursor: "pointer" }}
          >
            {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button onClick={handleRoleSave} disabled={savingRole || role === target.role}
            style={{ fontFamily: DM, fontSize: 13, fontWeight: 600, padding: "11px 18px", borderRadius: 8, border: "none", background: GOLD, color: "#1a1a1a", cursor: role === target.role ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6, opacity: role === target.role ? 0.5 : 1 }}>
            {savingRole && <Loader2 size={13} className="animate-spin" />}
            Save Role
          </button>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <button onClick={handleResetPassword}
          style={{ fontFamily: DM, fontSize: 12.5, fontWeight: 600, padding: "9px 16px", borderRadius: 8, border: "1px solid var(--ds-border)", background: "var(--ds-surface)", color: "var(--ds-text)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <Mail size={13} /> Reset Password Email
        </button>

        {isActive ? (
          <button onClick={() => setSuspendOpen(true)}
            style={{ fontFamily: DM, fontSize: 12.5, fontWeight: 600, padding: "9px 16px", borderRadius: 8, border: "1px solid rgba(245,158,11,0.3)", background: "rgba(245,158,11,0.08)", color: "#d97706", cursor: "pointer" }}>
            Suspend Account
          </button>
        ) : (
          <button onClick={handleReactivate} disabled={working}
            style={{ fontFamily: DM, fontSize: 12.5, fontWeight: 600, padding: "9px 16px", borderRadius: 8, border: "1px solid rgba(34,197,94,0.3)", background: "rgba(34,197,94,0.08)", color: "#16a34a", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            {working && <Loader2 size={13} className="animate-spin" />}
            Reactivate Account
          </button>
        )}

        <button onClick={() => setDeleteOpen(true)}
          style={{ fontFamily: DM, fontSize: 12.5, fontWeight: 600, padding: "9px 16px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.06)", color: "#dc2626", cursor: "pointer" }}>
          Delete Account
        </button>
      </div>

      {/* Suspend dialog */}
      {suspendOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "rgba(0,0,0,0.5)" }}>
          <div style={{ background: "var(--ds-surface)", borderRadius: 14, padding: 28, maxWidth: 420, width: "100%", border: "1px solid var(--ds-border)" }}>
            <div style={{ fontFamily: CORMORANT, fontSize: 20, fontWeight: 700, color: "var(--ds-text)", marginBottom: 12 }}>Suspend Account?</div>
            <p style={{ fontFamily: DM, fontSize: 13.5, color: "var(--ds-muted)", marginBottom: 20, lineHeight: 1.6 }}>
              Suspending this account will immediately revoke <strong style={{ color: "var(--ds-text)" }}>{targetName}</strong>'s access. They will not be able to log in until their account is reactivated. Continue?
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setSuspendOpen(false)} style={{ fontFamily: DM, fontSize: 13, padding: "9px 18px", borderRadius: 8, border: "1px solid var(--ds-border)", background: "none", color: "var(--ds-muted)", cursor: "pointer" }}>Cancel</button>
              <button onClick={handleSuspend} disabled={working}
                style={{ fontFamily: DM, fontSize: 13, fontWeight: 600, padding: "9px 18px", borderRadius: 8, border: "none", background: "#d97706", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                {working && <Loader2 size={13} className="animate-spin" />}
                Suspend
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete dialog */}
      {deleteOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "rgba(0,0,0,0.5)" }}>
          <div style={{ background: "var(--ds-surface)", borderRadius: 14, padding: 28, maxWidth: 440, width: "100%", border: "1px solid rgba(239,68,68,0.25)" }}>
            <div style={{ fontFamily: CORMORANT, fontSize: 20, fontWeight: 700, color: "#dc2626", marginBottom: 12 }}>Delete Account</div>
            <p style={{ fontFamily: DM, fontSize: 13.5, color: "var(--ds-muted)", marginBottom: 16, lineHeight: 1.6 }}>
              This action is <strong>permanent and irreversible</strong>. All data associated with this account will be removed. Type <strong style={{ color: "var(--ds-text)" }}>{targetName}</strong> to confirm.
            </p>
            <input
              type="text" placeholder={`Type "${targetName}" to confirm`}
              value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)}
              style={{ ...inputStyle(false), marginBottom: 16 }}
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => { setDeleteOpen(false); setDeleteConfirm(""); }} style={{ fontFamily: DM, fontSize: 13, padding: "9px 18px", borderRadius: 8, border: "1px solid var(--ds-border)", background: "none", color: "var(--ds-muted)", cursor: "pointer" }}>Cancel</button>
              <button onClick={handleDelete} disabled={working || deleteConfirm !== targetName}
                style={{ fontFamily: DM, fontSize: 13, fontWeight: 600, padding: "9px 18px", borderRadius: 8, border: "none", background: deleteConfirm === targetName ? "#dc2626" : "var(--ds-input-bg)", color: deleteConfirm === targetName ? "#fff" : "var(--ds-muted)", cursor: deleteConfirm === targetName ? "pointer" : "not-allowed", display: "flex", alignItems: "center", gap: 6 }}>
                {working && <Loader2 size={13} className="animate-spin" />}
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

/* ═══════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════ */
export default function StaffProfile() {
  const { userId: paramUserId } = useParams();
  const { session } = useAuth();
  const { profile: ownProfile, isSuperAdmin, setProfile: setOwnProfile } = useStaff();
  const navigate = useNavigate();

  const isSelf = !paramUserId || paramUserId === session?.user?.id;
  const targetUserId = isSelf ? session?.user?.id : paramUserId;

  const [profile, setProfileState] = useState(null);
  const [loading, setLoading]      = useState(true);
  const [notFound, setNotFound]    = useState(false);

  // Editable form state
  const [form, setForm] = useState({ full_name: "", job_title: "", email: "", phone: "" });
  const [dirty, setDirty]   = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState({ type: "", msg: "" });
  const [focused, setFocused] = useState("");

  // Email change OTP
  const emailOtp = useOTP(session, "email_change");
  const [newEmail, setNewEmail] = useState("");
  const [changingEmail, setChangingEmail] = useState(false);

  // Load profile
  useEffect(() => {
    if (!targetUserId) return;
    setLoading(true);
    supabase.from("staff_profiles").select("*").eq("id", targetUserId).maybeSingle()
      .then(({ data }) => {
        if (!data) { setNotFound(true); setLoading(false); return; }
        setProfileState(data);
        setForm({
          full_name: data.full_name || "",
          job_title: data.job_title || "",
          email: data.email || "",
          phone: data.phone || "",
        });
        setLoading(false);
      });
  }, [targetUserId]);

  // Guard: non-super-admin trying to view someone else's profile
  useEffect(() => {
    if (!isSelf && !isSuperAdmin && !loading) navigate("/profile", { replace: true });
  }, [isSelf, isSuperAdmin, loading]);

  function updateField(key, value) {
    setForm(f => ({ ...f, [key]: value }));
    setDirty(true);
  }

  function updateProfile(patch) {
    setProfileState(prev => ({ ...prev, ...patch }));
    if (isSelf) setOwnProfile(prev => ({ ...prev, ...patch }));
  }

  async function handleSave() {
    if (!dirty) return;
    setSaving(true); setSaveResult({ type: "", msg: "" });
    const patch = { full_name: form.full_name, job_title: form.job_title, phone: form.phone };
    const { error } = await supabase.from("staff_profiles").update(patch).eq("id", targetUserId);
    setSaving(false);
    if (error) { setSaveResult({ type: "error", msg: error.message }); return; }
    updateProfile(patch);
    setDirty(false);
    setSaveResult({ type: "success", msg: "Profile saved." });
    setTimeout(() => setSaveResult({ type: "", msg: "" }), 3000);
  }

  // Email change flow
  async function handleEmailChange() {
    if (!newEmail || newEmail === profile.email) return;
    const verified = await emailOtp.verifyOTP();
    if (!verified) return;
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) { return; }
    updateProfile({ email: newEmail });
    setForm(f => ({ ...f, email: newEmail }));
    setChangingEmail(false); setNewEmail(""); emailOtp.reset();
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "50vh" }}>
      <Loader2 size={22} color={GOLD} className="animate-spin" />
    </div>
  );

  if (notFound) return (
    <div style={{ padding: "60px 32px", textAlign: "center" }}>
      <p style={{ fontFamily: DM, fontSize: 15, color: "var(--ds-muted)" }}>Profile not found.</p>
    </div>
  );

  const pageTitle = isSelf ? "My Profile" : `${profile?.full_name || "Staff Member"}'s Profile`;
  const viewingOther = !isSelf && isSuperAdmin;

  return (
    <div style={{ padding: "32px 32px 60px", maxWidth: 1100, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: CORMORANT, fontSize: 30, fontWeight: 700, color: "var(--ds-text)", margin: "0 0 6px", letterSpacing: "0.01em" }}>{pageTitle}</h1>
          <p style={{ fontFamily: DM, fontSize: 13.5, color: "var(--ds-muted)", margin: 0 }}>
            {isSelf ? "Manage your account settings and preferences." : "Viewing staff profile as Super Admin."}
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          style={{
            fontFamily: DM, fontSize: 13.5, fontWeight: 600, padding: "10px 24px", borderRadius: 9, border: "none",
            background: dirty && !saving ? GOLD : "var(--ds-input-bg)",
            color: dirty && !saving ? "#1a1a1a" : "var(--ds-muted)",
            cursor: dirty && !saving ? "pointer" : "not-allowed",
            boxShadow: dirty && !saving ? "0 4px 14px rgba(200,169,110,0.35)" : "none",
            transition: "background .15s, box-shadow .15s",
            display: "flex", alignItems: "center", gap: 8,
          }}
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>

      {saveResult.msg && <Alert type={saveResult.type} message={saveResult.msg} />}

      {/* Two-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 35%) 1fr", gap: 24, alignItems: "start" }}>

        {/* LEFT: Avatar + Identity */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Card>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
              <AvatarSection profile={profile} isSelf={isSelf} onAvatarChange={url => updateProfile({ avatar_url: url })} />
              <div style={{ width: "100%", height: 1, background: "var(--ds-border)" }} />
              <div style={{ width: "100%" }}>
                <IdentityCard profile={profile} />
              </div>
            </div>
          </Card>
        </div>

        {/* RIGHT: Sections */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Section 1: Personal Information */}
          <Card>
            <SectionTitle>Personal Information</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ds-muted)", fontFamily: DM, display: "block", marginBottom: 6 }}>Full Name</label>
                  <input value={form.full_name} onChange={e => updateField("full_name", e.target.value)}
                    onFocus={() => setFocused("name")} onBlur={() => setFocused("")}
                    style={inputStyle(focused === "name")} placeholder="Full name" />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ds-muted)", fontFamily: DM, display: "block", marginBottom: 6 }}>Job Title</label>
                  <input value={form.job_title} onChange={e => updateField("job_title", e.target.value)}
                    onFocus={() => setFocused("title")} onBlur={() => setFocused("")}
                    style={inputStyle(focused === "title")} placeholder="e.g. Restaurant Manager" />
                </div>
              </div>

              {/* Email field */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ds-muted)", fontFamily: DM, display: "block", marginBottom: 6 }}>Email Address</label>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input value={changingEmail ? newEmail : form.email}
                    onChange={e => changingEmail ? setNewEmail(e.target.value) : undefined}
                    onFocus={() => setFocused("email")} onBlur={() => setFocused("")}
                    style={{ ...inputStyle(focused === "email", !changingEmail), flex: 1 }}
                    placeholder="Email address" readOnly={!changingEmail} type="email" />
                  {isSelf && !changingEmail && (
                    <button onClick={() => { setChangingEmail(true); emailOtp.reset(); setNewEmail(form.email); }}
                      style={{ fontFamily: DM, fontSize: 12, fontWeight: 600, padding: "11px 14px", borderRadius: 8, border: "1px solid var(--ds-border)", background: "none", color: "var(--ds-muted)", cursor: "pointer", whiteSpace: "nowrap" }}>
                      Change
                    </button>
                  )}
                </div>
                {changingEmail && (
                  <div style={{ marginTop: 10, padding: "14px 16px", borderRadius: 10, border: "1px solid var(--ds-border)", background: "var(--ds-input-bg)", display: "flex", flexDirection: "column", gap: 10 }}>
                    <p style={{ fontFamily: DM, fontSize: 12.5, color: "var(--ds-muted)", margin: 0 }}>
                      A verification code will be sent to your current email to confirm this change.
                    </p>
                    {!emailOtp.sent ? (
                      <button onClick={() => emailOtp.sendOTP(profile.email, profile.full_name)} disabled={emailOtp.sending}
                        style={{ fontFamily: DM, fontSize: 12.5, fontWeight: 600, padding: "9px 16px", borderRadius: 8, border: "none", background: GOLD, color: "#1a1a1a", cursor: "pointer", alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 6 }}>
                        {emailOtp.sending && <Loader2 size={13} className="animate-spin" />}
                        Send Verification Code
                      </button>
                    ) : (
                      <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                        <input type="text" inputMode="numeric" maxLength={6} placeholder="6-digit code"
                          value={emailOtp.code} onChange={e => emailOtp.setCode(e.target.value.replace(/\D/g, ""))}
                          style={{ ...inputStyle(false), flex: 1 }} disabled={emailOtp.verified} />
                        {!emailOtp.verified
                          ? <button onClick={handleEmailChange} disabled={emailOtp.verifying || !emailOtp.code || !newEmail}
                              style={{ fontFamily: DM, fontSize: 12.5, fontWeight: 600, padding: "11px 16px", borderRadius: 8, border: "none", background: GOLD, color: "#1a1a1a", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                              {emailOtp.verifying && <Loader2 size={13} className="animate-spin" />}
                              Confirm Change
                            </button>
                          : <CheckCircle2 size={18} color="#16a34a" />
                        }
                      </div>
                    )}
                    {emailOtp.otpError && <Alert type="error" message={emailOtp.otpError} />}
                    <button onClick={() => { setChangingEmail(false); emailOtp.reset(); setNewEmail(""); }}
                      style={{ fontFamily: DM, fontSize: 12, color: "var(--ds-muted)", background: "none", border: "none", cursor: "pointer", alignSelf: "flex-start", padding: 0 }}>
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ds-muted)", fontFamily: DM, display: "block", marginBottom: 6 }}>Phone Number <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
                <input value={form.phone} onChange={e => updateField("phone", e.target.value)}
                  onFocus={() => setFocused("phone")} onBlur={() => setFocused("")}
                  style={inputStyle(focused === "phone")} placeholder="+234 800 000 0000" type="tel" />
              </div>
            </div>
          </Card>

          {/* Section 2: Security */}
          {isSelf && (
            <Card>
              <SectionTitle>Security</SectionTitle>
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontFamily: DM, fontSize: 13.5, fontWeight: 600, color: "var(--ds-text)", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                  <Lock size={14} /> Change Password
                </div>
                <PasswordSection session={session} profile={profile} />
              </div>
              <div style={{ height: 1, background: "var(--ds-border)", margin: "4px 0 24px" }} />
              <TwoFASection session={session} profile={profile} onUpdate={updateProfile} />
            </Card>
          )}

          {/* Section 3: Role & Access */}
          <Card>
            <SectionTitle>Role &amp; Access</SectionTitle>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ds-muted)", fontFamily: DM, display: "block", marginBottom: 8 }}>Role</label>
              {viewingOther ? (
                <select value={profile?.role ?? "staff"}
                  onChange={async e => {
                    const newRole = e.target.value;
                    await supabase.from("staff_profiles").update({ role: newRole }).eq("id", profile.id);
                    updateProfile({ role: newRole });
                  }}
                  style={{ ...inputStyle(false), maxWidth: 260 }}>
                  {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "9px 16px", borderRadius: 8, background: "var(--ds-input-bg)", border: "1px solid var(--ds-border)",
                }}>
                  {profile?.role === "super_admin" && <Shield size={13} color={GOLD} />}
                  <span style={{ fontFamily: DM, fontSize: 13.5, color: "var(--ds-text)" }}>
                    {ROLE_COLORS[profile?.role]?.label ?? "Staff"}
                  </span>
                </div>
              )}
            </div>

            <div style={{ marginTop: 20 }}>
              <div style={{ fontFamily: DM, fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ds-muted)", marginBottom: 12 }}>Module Access</div>
              <PermissionsSection profile={profile} />
              {!isSuperAdmin && (
                <p style={{ fontFamily: DM, fontSize: 12, color: "var(--ds-muted)", marginTop: 14, lineHeight: 1.5 }}>
                  Access is determined by your role. Contact your Super Admin to request changes.
                </p>
              )}
            </div>
          </Card>

          {/* Section 4: Notifications */}
          <Card>
            <SectionTitle>Notification Preferences</SectionTitle>
            <p style={{ fontFamily: DM, fontSize: 13, color: "var(--ds-muted)", margin: "0 0 16px", lineHeight: 1.5 }}>How would you like to be notified?</p>
            <NotificationsSection profile={profile} onUpdate={updateProfile} />
          </Card>

          {/* Section 5: Recent Activity */}
          <Card>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <SectionTitle>Recent Activity</SectionTitle>
              {isSuperAdmin && (
                <button onClick={() => navigate(`/security?user=${targetUserId}`)}
                  style={{ fontFamily: DM, fontSize: 12, color: GOLD, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                  View Full Log <ChevronRight size={12} />
                </button>
              )}
            </div>
            <ActivitySection userId={targetUserId} />
          </Card>
        </div>
      </div>

      {/* Admin Controls */}
      {viewingOther && (
        <div style={{ marginTop: 24 }}>
          <AdminControls target={profile} onUpdate={updateProfile} />
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .profile-grid { grid-template-columns: 1fr !important; }
        }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
