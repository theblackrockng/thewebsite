import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://jwklezuaqesptccsnesr.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    if (!serviceRoleKey) {
      return res.status(500).json({ error: "Server misconfiguration: missing service role key" });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { userId } = req.body ?? {};
    if (!userId) return res.status(400).json({ error: "userId is required" });

    // Remove from staff_profiles first (FK constraint)
    await supabase.from("staff_profiles").delete().eq("id", userId);

    // Delete from Supabase Auth
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) return res.status(400).json({ error: error.message });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("[delete-staff] unhandled error:", err);
    return res.status(500).json({ error: err?.message || "An unexpected error occurred" });
  }
}
