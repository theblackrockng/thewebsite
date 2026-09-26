const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");
const { requireStaff } = require("./_lib/auth");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ANY_STAFF = ["waiter", "staff", "manager", "super_admin", "front_desk", "kitchen", "bar"];

function hashPin(salt, pin) {
  return crypto.createHash("sha256").update(salt + pin).digest("hex");
}

function generateSalt() {
  return crypto.randomBytes(16).toString("hex");
}

function validPin(pin) {
  return typeof pin === "string" && /^\d{4}$/.test(pin);
}

// In-memory rate limiter for PIN verify: 5 attempts per IP per minute
const _attempts = new Map();
function checkRateLimit(ip) {
  const now = Date.now();
  let rec = _attempts.get(ip);
  if (!rec || now > rec.resetAt) rec = { count: 0, resetAt: now + 60_000 };
  rec.count += 1;
  _attempts.set(ip, rec);
  return rec.count <= 5;
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  // POST ?action=verify — PIN verification (merged from verify-waiter-pin.js)
  if (req.method === "POST" && req.query.action === "verify") {
    const staff = await requireStaff(req, res, ANY_STAFF);
    if (!staff) return;

    const ip =
      (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
      req.socket?.remoteAddress ||
      "unknown";

    if (!checkRateLimit(ip)) {
      return res.status(429).json({ ok: false, error: "Too many attempts. Wait 1 minute." });
    }

    const { id, pin } = req.body || {};
    if (!id || typeof pin !== "string") {
      return res.status(400).json({ error: "id and pin are required." });
    }

    const { data, error } = await supabase
      .from("waiter_profiles")
      .select("pin_hash, pin_salt, active, name")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return res.status(404).json({ ok: false });
    if (!data.active) return res.status(400).json({ ok: false, error: "Waiter profile is inactive." });

    const match = hashPin(data.pin_salt, pin) === data.pin_hash;
    return res.status(200).json({ ok: match });
  }

  // GET — any authenticated staff can fetch active waiter names (no hashes returned)
  if (req.method === "GET") {
    const staff = await requireStaff(req, res, ANY_STAFF);
    if (!staff) return;
    const { data, error } = await supabase
      .from("waiter_profiles")
      .select("id, name, active")
      .eq("active", true)
      .order("name", { ascending: true });
    if (error) return res.status(500).json({ error: "Failed to fetch waiter profiles." });
    return res.status(200).json({ waiters: data || [] });
  }

  // POST — create new waiter profile (super_admin only)
  if (req.method === "POST") {
    const staff = await requireStaff(req, res, ["super_admin"]);
    if (!staff) return;
    const { name, pin } = req.body || {};
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Name is required." });
    }
    if (!validPin(pin)) {
      return res.status(400).json({ error: "PIN must be exactly 4 digits." });
    }
    const salt = generateSalt();
    const { data, error } = await supabase
      .from("waiter_profiles")
      .insert({ name: name.trim(), pin_hash: hashPin(salt, pin), pin_salt: salt, active: true })
      .select("id, name, active, created_at")
      .single();
    if (error) return res.status(500).json({ error: "Failed to create waiter profile." });
    return res.status(201).json({ ok: true, waiter: data });
  }

  // PATCH — update name, PIN, or active status (super_admin only)
  if (req.method === "PATCH") {
    const staff = await requireStaff(req, res, ["super_admin"]);
    if (!staff) return;
    const { id, name, pin, active } = req.body || {};
    if (!id) return res.status(400).json({ error: "id is required." });
    const updates = {};
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ error: "Name cannot be empty." });
      }
      updates.name = name.trim();
    }
    if (pin !== undefined) {
      if (!validPin(pin)) return res.status(400).json({ error: "PIN must be exactly 4 digits." });
      const salt = generateSalt();
      updates.pin_hash = hashPin(salt, pin);
      updates.pin_salt = salt;
    }
    if (active !== undefined) updates.active = !!active;
    if (!Object.keys(updates).length) return res.status(400).json({ error: "Nothing to update." });
    const { data, error } = await supabase
      .from("waiter_profiles")
      .update(updates)
      .eq("id", id)
      .select("id, name, active, created_at")
      .single();
    if (error) return res.status(500).json({ error: "Failed to update waiter profile." });
    return res.status(200).json({ ok: true, waiter: data });
  }

  // DELETE — soft delete: set active=false (super_admin only)
  if (req.method === "DELETE") {
    const staff = await requireStaff(req, res, ["super_admin"]);
    if (!staff) return;
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: "id is required." });
    const { error } = await supabase
      .from("waiter_profiles")
      .update({ active: false })
      .eq("id", id);
    if (error) return res.status(500).json({ error: "Failed to deactivate waiter profile." });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed." });
};
