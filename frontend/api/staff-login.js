'use strict';

const { createClient } = require('@supabase/supabase-js');
const {
  getIP,
  checkPersistentRateLimit,
  applySecurityHeaders,
  getCorsHeaders,
  checkCors,
  checkUserAgent,
  logAndAlert,
} = require('./_lib/security');

const SUPABASE_URL = process.env.SUPABASE_URL;
const ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// register-device logic (merged from register-device.js)
let _db = null;
function getDb() {
  if (_db) return _db;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _db = createClient(url, key);
  return _db;
}

const { requireStaff } = require('./_lib/auth');

module.exports = async function handler(req, res) {
  applySecurityHeaders(res);
  const corsHeaders = getCorsHeaders(req);
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === 'OPTIONS') return res.status(200).end();

  // POST ?action=register-device — FCM token upsert (merged from register-device.js)
  if (req.method === 'POST' && req.query?.action === 'register-device') {
    const { role, staff_id, fcm_token } = req.body || {};
    if (!role || !['waiter', 'bar'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role.' });
    }
    if (!fcm_token || typeof fcm_token !== 'string') {
      return res.status(400).json({ error: 'Missing fcm_token.' });
    }
    const staff = await requireStaff(req, res, [role]);
    if (!staff) return;
    const db = getDb();
    if (!db) return res.status(500).json({ error: 'Database not configured.' });
    const conflictCol = staff_id ? 'role,staff_id' : 'fcm_token';
    const { error } = await db
      .from('push_tokens')
      .upsert({ role, staff_id: staff_id || null, fcm_token }, { onConflict: conflictCol });
    if (error) return res.status(500).json({ error: 'Failed to register device.' });
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getIP(req);

  const { blocked } = checkUserAgent(req);
  if (blocked) return res.status(400).json({ error: 'Bad request' });

  const { allowed } = checkCors(req);
  if (!allowed) return res.status(403).json({ error: 'Forbidden' });

  const { email, password } = req.body || {};
  if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  const cleanEmail = email.trim().slice(0, 254);

  // Rate limit by IP: 10 attempts per 15 minutes, persistent across cold starts.
  const { limited } = await checkPersistentRateLimit(ip, 'staff-login', 10, 15 * 60 * 1000);
  if (limited) {
    await logAndAlert({
      eventType: 'rate_limit',
      severity: 'high',
      ip,
      endpoint: '/api/staff-login',
      payload: `email=${cleanEmail}`,
      userAgent: req.headers['user-agent'],
    });
    return res.status(429).json({ error: 'Too many sign-in attempts. Please try again later.' });
  }

  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Server misconfiguration.' });
  }

  const authClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data, error } = await authClient.auth.signInWithPassword({ email: cleanEmail, password });

  if (error || !data?.session) {
    await logAndAlert({
      eventType: 'login_failed',
      severity: 'medium',
      ip,
      endpoint: '/api/staff-login',
      payload: `email=${cleanEmail}`,
      userAgent: req.headers['user-agent'],
    });
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: profile } = await admin
    .from('staff_profiles')
    .select('id, full_name, role, active')
    .eq('id', data.user.id)
    .maybeSingle();

  if (!profile || profile.active === false) {
    await logAndAlert({
      eventType: 'login_failed',
      severity: 'high',
      ip,
      endpoint: '/api/staff-login',
      payload: `email=${cleanEmail} reason=no_staff_profile`,
      userAgent: req.headers['user-agent'],
    });
    return res.status(403).json({ error: 'Your account does not have staff access.' });
  }

  await logAndAlert({
    eventType: 'staff_login',
    severity: 'low',
    ip,
    endpoint: '/api/staff-login',
    payload: `email=${cleanEmail} role=${profile.role}`,
    userAgent: req.headers['user-agent'],
    alert: false,
  });

  return res.status(200).json({
    ok: true,
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
    },
    profile: { id: profile.id, full_name: profile.full_name, role: profile.role },
  });
};
