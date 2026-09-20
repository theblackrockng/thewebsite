'use strict';

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let _admin = null;
function getAdmin() {
  if (_admin) return _admin;
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return null;
  _admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  return _admin;
}

// Verifies the bearer token against Supabase Auth and reads the caller's role
// from staff_profiles server-side (service role, bypasses RLS) — the role is
// never trusted from the request body or any client-supplied value.
//
// allowedRoles: array of role strings, or the string "any" to allow every
// active staff role. super_admin always passes regardless of allowedRoles.
//
// On failure this writes the response itself (401 no/invalid session, 403
// wrong role) and returns null — callers should `if (!staff) return;`.
async function requireStaff(req, res, allowedRoles) {
  const authHeader = req.headers.authorization || req.headers.Authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }

  const admin = getAdmin();
  if (!admin) {
    res.status(500).json({ error: 'Server misconfiguration' });
    return null;
  }

  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }

  const { data: profile } = await admin
    .from('staff_profiles')
    .select('id, role, active, full_name, email')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (!profile || profile.active === false) {
    res.status(403).json({ error: 'Forbidden' });
    return null;
  }

  const allowed = allowedRoles === 'any' || profile.role === 'super_admin' || allowedRoles.includes(profile.role);
  if (!allowed) {
    res.status(403).json({ error: 'Forbidden' });
    return null;
  }

  return { user: userData.user, profile };
}

module.exports = { requireStaff };
