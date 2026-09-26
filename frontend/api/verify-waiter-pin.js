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

// In-memory rate limiter: 5 attempts per IP per minute
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
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });

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
};
