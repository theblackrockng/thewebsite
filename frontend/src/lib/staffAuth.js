import { supabase } from "./supabase";

// Signs in through the rate-limited, logged /api/staff-login endpoint (never
// calls supabase.auth.signInWithPassword directly from the browser), then
// hydrates the shared supabase client with the returned session so every
// later query and Realtime subscription on this client carries the JWT.
export async function loginStaff(email, password) {
  const res = await fetch("/api/staff-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json().catch(() => ({}));

  if (!res.ok || !json.session) {
    return { error: json.error || "Sign in failed." };
  }

  const { error: setErr } = await supabase.auth.setSession({
    access_token: json.session.access_token,
    refresh_token: json.session.refresh_token,
  });
  if (setErr) {
    return { error: "Failed to start session." };
  }

  return { error: null, profile: json.profile };
}

export async function signOutStaff() {
  await supabase.auth.signOut();
}

export async function loadStaffProfile(userId) {
  const { data } = await supabase
    .from("staff_profiles")
    .select("id, full_name, role, active")
    .eq("id", userId)
    .maybeSingle();
  return data || null;
}

// Returns the current session's access token, or null if signed out.
export async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

export async function authHeader() {
  const token = await getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
