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

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

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
