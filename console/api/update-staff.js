import { createClient } from "@supabase/supabase-js";
import { requireStaff } from "./_lib/auth.js";
import { getIP, logAndAlert } from "./_lib/security.js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://jwklezuaqesptccsnesr.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const KNOWN_ROLES = [
  "staff", "waiter", "kitchen", "bar", "front_desk", "guesthouse",
  "manager", "content_creator", "social_media_manager", "super_admin",
];

function getDb() {
  if (!SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Super Admin only.
  const staff = await requireStaff(req, res, []);
  if (!staff) return;

  const db = getDb();
  if (!db) return res.status(500).json({ error: "Server misconfiguration" });

  const { userId, role, permissions, active, status, can_void_orders, void_pin, can_manage_guesthouse, guesthouse_pin, manager_pin } = req.body || {};
  if (!userId) return res.status(400).json({ error: "userId is required." });

  if (role !== undefined && !KNOWN_ROLES.includes(role)) {
    return res.status(400).json({ error: "Unknown role." });
  }

  if (void_pin !== undefined && void_pin !== null && !/^\d{4,8}$/.test(String(void_pin))) {
    return res.status(400).json({ error: "void_pin must be 4-8 digits." });
  }

  if (guesthouse_pin !== undefined && guesthouse_pin !== null && !/^\d{4,8}$/.test(String(guesthouse_pin))) {
    return res.status(400).json({ error: "guesthouse_pin must be 4-8 digits." });
  }

  if (manager_pin !== undefined && manager_pin !== null && !/^\d{4,8}$/.test(String(manager_pin))) {
    return res.status(400).json({ error: "manager_pin must be 4-8 digits." });
  }

  if (role !== undefined && userId === staff.user.id) {
    return res.status(403).json({ error: "You cannot change your own role." });
  }

  const { data: target } = await db
    .from("staff_profiles")
    .select("id, role, active, full_name, email")
    .eq("id", userId)
    .maybeSingle();

  if (!target) return res.status(404).json({ error: "Staff member not found." });

  const demotingRole = role !== undefined && role !== "super_admin" && target.role === "super_admin";
  const deactivating = active === false || (status !== undefined && status !== "active");

  if (target.role === "super_admin" && (demotingRole || deactivating)) {
    const { count } = await db
      .from("staff_profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "super_admin")
      .eq("active", true);
    if ((count ?? 0) <= 1) {
      return res.status(403).json({ error: "Cannot demote or deactivate the last active Super Admin." });
    }
  }

  const updates = {};
  if (role !== undefined) updates.role = role;
  if (permissions !== undefined) updates.permissions = permissions;
  if (active !== undefined) updates.active = active;
  if (status !== undefined) updates.status = status;
  if (can_void_orders !== undefined) updates.can_void_orders = !!can_void_orders;
  if (void_pin !== undefined) {
    if (void_pin === null) {
      updates.void_pin_hash = null;
      updates.void_pin_salt = null;
    } else {
      const { createHash, randomBytes } = await import("crypto");
      const salt = randomBytes(16).toString("hex");
      updates.void_pin_salt = salt;
      updates.void_pin_hash = createHash("sha256").update(salt + String(void_pin)).digest("hex");
    }
  }
  if (can_manage_guesthouse !== undefined) updates.can_manage_guesthouse = !!can_manage_guesthouse;
  if (guesthouse_pin !== undefined) {
    if (guesthouse_pin === null) {
      updates.guesthouse_pin_hash = null;
      updates.guesthouse_pin_salt = null;
    } else {
      const { createHash, randomBytes } = await import("crypto");
      const salt = randomBytes(16).toString("hex");
      updates.guesthouse_pin_salt = salt;
      updates.guesthouse_pin_hash = createHash("sha256").update(salt + String(guesthouse_pin)).digest("hex");
    }
  }
  if (manager_pin !== undefined) {
    if (manager_pin === null) {
      updates.void_pin_hash = null;
      updates.void_pin_salt = null;
      updates.guesthouse_pin_hash = null;
      updates.guesthouse_pin_salt = null;
    } else {
      const { createHash, randomBytes } = await import("crypto");
      const salt = randomBytes(16).toString("hex");
      const hash = createHash("sha256").update(salt + String(manager_pin)).digest("hex");
      updates.void_pin_salt = salt;
      updates.void_pin_hash = hash;
      updates.guesthouse_pin_salt = salt;
      updates.guesthouse_pin_hash = hash;
      updates.can_void_orders = true;
      updates.can_manage_guesthouse = true;
    }
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "No changes provided." });
  }

  const { error } = await db.from("staff_profiles").update(updates).eq("id", userId);
  if (error) return res.status(500).json({ error: error.message });

  const changeSummary = Object.keys(updates).map((k) => `${k}=${JSON.stringify(updates[k])}`).join(" ");

  await db.from("activity_log").insert({
    user_id: userId,
    module: "users",
    action: `${staff.profile.full_name || staff.profile.email} changed ${changeSummary}`,
  }).then(() => {}, () => {});

  if (role !== undefined) {
    await logAndAlert({
      eventType: "staff_role_change",
      severity: "medium",
      ip: getIP(req),
      endpoint: "/api/update-staff",
      payload: `by=${staff.profile.email} target=${target.email} newRole=${role}`,
    }).catch(() => {});
  }

  return res.status(200).json({ ok: true });
}
