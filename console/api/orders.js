import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "https://jwklezuaqesptccsnesr.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getDb() {
  if (!serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  const db = getDb();
  if (!db) return res.status(500).json({ error: "Server misconfiguration" });

  // GET /api/orders — fetch orders, optional ?from=ISO&to=ISO date filters
  if (req.method === "GET") {
    try {
      const { from, to } = req.query || {};
      let query = db.from("orders").select("*").order("created_at", { ascending: false });
      if (from) query = query.gte("created_at", from);
      if (to)   query = query.lte("created_at", to);
      if (!from && !to) query = query.limit(500);

      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json({ ok: true, data });
    } catch (err) {
      console.error("[api/orders] GET error:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  // PATCH /api/orders — update order_status or payment_status
  if (req.method === "PATCH") {
    const { id, order_status, payment_status, confirmed_by } = req.body || {};
    if (!id) return res.status(400).json({ error: "Missing order id" });

    const updates = {};
    if (order_status !== undefined) updates.order_status = order_status;
    if (payment_status !== undefined) updates.payment_status = payment_status;
    if (confirmed_by !== undefined) updates.confirmed_by = confirmed_by;

    try {
      const { error } = await db.from("orders").update(updates).eq("id", id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error("[api/orders] PATCH error:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
