import { createClient } from "@supabase/supabase-js";
import { requireStaff } from "./_lib/auth.js";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://jwklezuaqesptccsnesr.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// "website_manager" in the spec maps to the existing "manager" role — there
// is no separate website_manager role in staff_profiles today.
const TABLE_MANAGE_ROLES = ["manager"];

function getDb() {
  if (!SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  const db = getDb();
  if (!db) return res.status(500).json({ error: "Server misconfiguration" });

  // GET — list all tables (left open; not used by any customer ordering flow,
  // but kept available as requested)
  if (req.method === "GET") {
    const { data, error } = await db
      .from("tables")
      .select("*")
      .order("table_number", { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true, data });
  }

  // POST — create a new table
  if (req.method === "POST") {
    const staff = await requireStaff(req, res, TABLE_MANAGE_ROLES);
    if (!staff) return;

    const { table_number, qr_slug, active = true } = req.body || {};
    if (!table_number || !Number.isInteger(Number(table_number)) || Number(table_number) < 1) {
      return res.status(400).json({ error: "Valid table number required." });
    }
    const slug = (qr_slug || `table-${table_number}`).trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const { data, error } = await db
      .from("tables")
      .insert({ table_number: Number(table_number), qr_slug: slug, active })
      .select()
      .single();
    if (error) {
      if (error.code === "23505") return res.status(409).json({ error: "Table number or slug already exists." });
      return res.status(500).json({ error: error.message });
    }
    return res.status(201).json({ ok: true, data });
  }

  // PATCH — update a table
  if (req.method === "PATCH") {
    const staff = await requireStaff(req, res, TABLE_MANAGE_ROLES);
    if (!staff) return;

    const { id, table_number, qr_slug, active } = req.body || {};
    if (!id) return res.status(400).json({ error: "Missing table id." });
    const updates = {};
    if (table_number !== undefined) {
      if (!Number.isInteger(Number(table_number)) || Number(table_number) < 1)
        return res.status(400).json({ error: "Valid table number required." });
      updates.table_number = Number(table_number);
    }
    if (qr_slug !== undefined) updates.qr_slug = qr_slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
    if (active !== undefined) updates.active = Boolean(active);
    const { data, error } = await db.from("tables").update(updates).eq("id", id).select().single();
    if (error) {
      if (error.code === "23505") return res.status(409).json({ error: "Table number or slug already exists." });
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json({ ok: true, data });
  }

  // DELETE — remove a table
  if (req.method === "DELETE") {
    const staff = await requireStaff(req, res, TABLE_MANAGE_ROLES);
    if (!staff) return;

    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: "Missing table id." });
    const { error } = await db.from("tables").delete().eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
