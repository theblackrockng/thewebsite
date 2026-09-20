import { createClient } from "@supabase/supabase-js";
import { requireStaff } from "./_lib/auth.js";

const supabaseUrl = process.env.SUPABASE_URL || "https://jwklezuaqesptccsnesr.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ORDER_ROLES = ["kitchen", "bar", "waiter", "front_desk", "manager"];

function getDb() {
  if (!serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const staff = await requireStaff(req, res, ORDER_ROLES);
  if (!staff) return;

  const db = getDb();
  if (!db) return res.status(500).json({ error: "Server misconfiguration" });

  const { order_id } = req.body || {};
  if (!order_id) return res.status(400).json({ error: "Missing order_id" });

  try {
    const { data, error } = await db
      .from("order_items")
      .select("*")
      .eq("order_id", order_id);

    if (error) throw error;
    return res.status(200).json({ ok: true, data });
  } catch (err) {
    console.error("[api/order-items] GET error:", err);
    return res.status(500).json({ error: err.message });
  }
}
