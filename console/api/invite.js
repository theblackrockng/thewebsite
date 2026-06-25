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
    if (!supabaseUrl) {
      return res.status(500).json({ error: "Server misconfiguration: missing Supabase URL" });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { email, full_name, role, permissions, invited_by } = req.body ?? {};

    if (!email) return res.status(400).json({ error: "Email is required" });

    const defaultPermissions = {
      dashboard: true,
      reservations: false,
      enquiries: false,
      menu: false,
      media: false,
      content: false,
      users: false,
      settings: false,
    };

    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { full_name: full_name || email.split("@")[0] },
      options: {
        redirectTo: "https://console.blackrockrestaurantng.com/reset-password",
      },
    });

    if (error) return res.status(400).json({ error: error.message });

    await supabase.from("staff_profiles").upsert(
      {
        id: data.user.id,
        email,
        full_name: full_name || email.split("@")[0],
        role: role || "staff",
        permissions: permissions ?? defaultPermissions,
        active: true,
        invited_by: invited_by || null,
      },
      { onConflict: "id" }
    );

    return res.status(200).json({ success: true, userId: data.user.id });
  } catch (err) {
    console.error("[invite] unhandled error:", err);
    return res.status(500).json({ error: err?.message || "An unexpected error occurred" });
  }
}
