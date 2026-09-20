import { supabase } from "./supabase";

// Attaches the signed-in staff session's access token so protected
// serverless endpoints can verify it and read the caller's role
// server-side. Returns {} when signed out.
export async function authHeader() {
  const { data } = await supabase.auth.getSession();
  return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
}
