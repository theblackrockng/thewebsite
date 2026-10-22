import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { requireStaff } from "./_lib/auth.js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://jwklezuaqesptccsnesr.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function hashPin(salt, pin) {
  return crypto.createHash("sha256").update(salt + pin).digest("hex");
}

function generateSalt() {
  return crypto.randomBytes(16).toString("hex");
}

function validPin(pin) {
  return typeof pin === "string" && /^\d{4}$/.test(pin);
}

function resolveTable(req) {
  const resource = (req.query?.resource || "").toString();
  if (resource === "guesthouse-staff") {
    return { table: "guesthouse_staff", responseKey: "staff", label: "guesthouse staff" };
  }
  return { table: "waiter_profiles", responseKey: "waiters", label: "waiter profile" };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { table, responseKey, label } = resolveTable(req);

  if (req.method === "GET") {
    const staff = await requireStaff(req, res, "any");
    if (!staff) return;
    const isSuperAdmin = staff.profile.role === "super_admin";
    let query = supabase
      .from(table)
      .select("id, name, active, created_at")
      .order("name", { ascending: true });
    if (!isSuperAdmin) query = query.eq("active", true);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: `Failed to fetch ${label} list.` });
    return res.status(200).json({ [responseKey]: data || [] });
  }

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
      .from(table)
      .insert({ name: name.trim(), pin_hash: hashPin(salt, pin), pin_salt: salt, active: true })
      .select("id, name, active, created_at")
      .single();
    if (error) return res.status(500).json({ error: `Failed to create ${label}.` });
    return res.status(201).json({ ok: true, [table === "waiter_profiles" ? "waiter" : "staff"]: data });
  }

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
      .from(table)
      .update(updates)
      .eq("id", id)
      .select("id, name, active, created_at")
      .single();
    if (error) return res.status(500).json({ error: `Failed to update ${label}.` });
    return res.status(200).json({ ok: true, [table === "waiter_profiles" ? "waiter" : "staff"]: data });
  }

  if (req.method === "DELETE") {
    const staff = await requireStaff(req, res, ["super_admin"]);
    if (!staff) return;
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: "id is required." });
    const { error } = await supabase
      .from(table)
      .update({ active: false })
      .eq("id", id);
    if (error) return res.status(500).json({ error: `Failed to deactivate ${label}.` });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed." });
}
