'use strict';

const crypto = require('crypto');
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

const VOID_TOKEN_TTL_MS = 5 * 60 * 1000;
const VOID_ATTEMPTS = new Map();

function sha256Hex(salt, value) {
  return crypto.createHash('sha256').update(salt + value).digest('hex');
}

function voidPinRateCheck(ip) {
  const now = Date.now();
  let rec = VOID_ATTEMPTS.get(ip);
  if (!rec || now > rec.resetAt) rec = { count: 0, resetAt: now + 60_000 };
  rec.count += 1;
  VOID_ATTEMPTS.set(ip, rec);
  return rec.count <= 5;
}

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

const { requireStaff, signVoidToken, signGuesthouseToken } = require('./_lib/auth');

const GUESTHOUSE_ATTEMPTS = new Map();
function guesthousePinRateCheck(ip) {
  const now = Date.now();
  let rec = GUESTHOUSE_ATTEMPTS.get(ip);
  if (!rec || now > rec.resetAt) rec = { count: 0, resetAt: now + 60_000 };
  rec.count += 1;
  GUESTHOUSE_ATTEMPTS.set(ip, rec);
  return rec.count <= 5;
}

module.exports = async function handler(req, res) {
  applySecurityHeaders(res);
  const corsHeaders = getCorsHeaders(req);
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === 'OPTIONS') return res.status(200).end();

  // POST ?action=verify-void-pin — manager PIN check for void/edit of confirmed orders.
  // Any authenticated staff may call this (front_desk is the real caller) but the PIN
  // itself must belong to a profile with can_void_orders=true, or role super_admin/manager.
  // Returns a short-lived HMAC token the front-desk endpoint accepts for void/edit calls.
  if (req.method === 'POST' && req.query?.action === 'verify-void-pin') {
    const staff = await requireStaff(req, res, 'any');
    if (!staff) return;

    const ip = getIP(req);
    if (!voidPinRateCheck(ip)) {
      return res.status(429).json({ ok: false, error: 'Too many attempts. Wait a minute.' });
    }

    const { pin } = req.body || {};
    if (typeof pin !== 'string' || !/^\d{4,8}$/.test(pin)) {
      return res.status(400).json({ ok: false, error: 'PIN must be 4-8 digits.' });
    }

    const db = getDb();
    if (!db) return res.status(500).json({ ok: false, error: 'Server misconfiguration.' });

    const { data: candidates } = await db
      .from('staff_profiles')
      .select('id, full_name, role, active, can_void_orders, void_pin_hash, void_pin_salt')
      .eq('active', true)
      .not('void_pin_hash', 'is', null)
      .not('void_pin_salt', 'is', null);

    const authorized = (candidates || []).find((p) => {
      if (!p.void_pin_hash || !p.void_pin_salt) return false;
      const permitted = p.role === 'super_admin' || p.role === 'manager' || p.can_void_orders === true;
      if (!permitted) return false;
      return sha256Hex(p.void_pin_salt, pin) === p.void_pin_hash;
    });

    if (!authorized) {
      await logAndAlert({
        eventType: 'void_pin_failed',
        severity: 'medium',
        ip,
        endpoint: '/api/staff-login?action=verify-void-pin',
        payload: `by=${staff.profile.full_name || staff.profile.id}`,
        userAgent: req.headers['user-agent'],
      });
      return res.status(401).json({ ok: false, error: 'Invalid PIN.' });
    }

    const payload = {
      by_id: authorized.id,
      by_name: authorized.full_name,
      exp: Date.now() + VOID_TOKEN_TTL_MS,
    };
    return res.status(200).json({
      ok: true,
      token: signVoidToken(payload),
      authorized_by: { id: authorized.id, name: authorized.full_name },
      expires_at: payload.exp,
    });
  }

  // POST ?action=set-void-pin — set/update the caller's own void PIN. Only super_admin,
  // manager, or staff with can_void_orders=true may set a PIN; the console gates the UI
  // separately but we enforce it here too.
  if (req.method === 'POST' && req.query?.action === 'set-void-pin') {
    const staff = await requireStaff(req, res, 'any');
    if (!staff) return;

    const { pin } = req.body || {};
    if (typeof pin !== 'string' || !/^\d{4,8}$/.test(pin)) {
      return res.status(400).json({ error: 'PIN must be 4-8 digits.' });
    }

    const db = getDb();
    if (!db) return res.status(500).json({ error: 'Server misconfiguration.' });

    const { data: profile } = await db
      .from('staff_profiles')
      .select('role, can_void_orders')
      .eq('id', staff.profile.id)
      .maybeSingle();

    const permitted = profile && (profile.role === 'super_admin' || profile.role === 'manager' || profile.can_void_orders === true);
    if (!permitted) return res.status(403).json({ error: 'You are not authorized to set a void PIN.' });

    const salt = crypto.randomBytes(16).toString('hex');
    const { error } = await db
      .from('staff_profiles')
      .update({ void_pin_hash: sha256Hex(salt, pin), void_pin_salt: salt })
      .eq('id', staff.profile.id);
    if (error) {
      console.error('[set-void-pin] update error:', error);
      return res.status(500).json({ error: 'Failed to save PIN.' });
    }
    return res.status(200).json({ ok: true });
  }

  // POST ?action=verify-guesthouse-pin — PIN check for guest house check-in / key encoding.
  // Any authenticated staff may call this. PIN must belong to a profile with
  // can_manage_guesthouse=true, or role super_admin/manager/front_desk.
  if (req.method === 'POST' && req.query?.action === 'verify-guesthouse-pin') {
    const staff = await requireStaff(req, res, 'any');
    if (!staff) return;

    const ip = getIP(req);
    if (!guesthousePinRateCheck(ip)) {
      return res.status(429).json({ ok: false, error: 'Too many attempts. Wait a minute.' });
    }

    const { pin } = req.body || {};
    if (typeof pin !== 'string' || !/^\d{4,8}$/.test(pin)) {
      return res.status(400).json({ ok: false, error: 'PIN must be 4-8 digits.' });
    }

    const db = getDb();
    if (!db) return res.status(500).json({ ok: false, error: 'Server misconfiguration.' });

    const { data: candidates } = await db
      .from('staff_profiles')
      .select('id, full_name, role, active, can_manage_guesthouse, guesthouse_pin_hash, guesthouse_pin_salt')
      .eq('active', true)
      .not('guesthouse_pin_hash', 'is', null)
      .not('guesthouse_pin_salt', 'is', null);

    let authorized = (candidates || []).find((p) => {
      if (!p.guesthouse_pin_hash || !p.guesthouse_pin_salt) return false;
      const permitted = p.role === 'super_admin' || p.role === 'manager' || p.role === 'front_desk' || p.role === 'guesthouse' || p.can_manage_guesthouse === true;
      if (!permitted) return false;
      return sha256Hex(p.guesthouse_pin_salt, pin) === p.guesthouse_pin_hash;
    });

    if (!authorized) {
      const { data: ghStaff } = await db
        .from('guesthouse_staff')
        .select('id, name, active, pin_hash, pin_salt')
        .eq('active', true);
      const match = (ghStaff || []).find((p) => p.pin_hash && p.pin_salt && sha256Hex(p.pin_salt, pin) === p.pin_hash);
      if (match) {
        authorized = { id: match.id, full_name: match.name };
      }
    }

    if (!authorized) {
      await logAndAlert({
        eventType: 'guesthouse_pin_failed',
        severity: 'medium',
        ip,
        endpoint: '/api/staff-login?action=verify-guesthouse-pin',
        payload: `by=${staff.profile.full_name || staff.profile.id}`,
        userAgent: req.headers['user-agent'],
      });
      return res.status(401).json({ ok: false, error: 'Invalid PIN.' });
    }

    const payload = {
      by_id: authorized.id,
      by_name: authorized.full_name,
      exp: Date.now() + VOID_TOKEN_TTL_MS,
    };
    return res.status(200).json({
      ok: true,
      token: signGuesthouseToken(payload),
      authorized_by: { id: authorized.id, name: authorized.full_name },
      expires_at: payload.exp,
    });
  }

  // POST ?action=set-guesthouse-pin — set/update caller's own guesthouse PIN.
  if (req.method === 'POST' && req.query?.action === 'set-guesthouse-pin') {
    const staff = await requireStaff(req, res, 'any');
    if (!staff) return;

    const { pin } = req.body || {};
    if (typeof pin !== 'string' || !/^\d{4,8}$/.test(pin)) {
      return res.status(400).json({ error: 'PIN must be 4-8 digits.' });
    }

    const db = getDb();
    if (!db) return res.status(500).json({ error: 'Server misconfiguration.' });

    const { data: profile } = await db
      .from('staff_profiles')
      .select('role, can_manage_guesthouse')
      .eq('id', staff.profile.id)
      .maybeSingle();

    const permitted = profile && (profile.role === 'super_admin' || profile.role === 'manager' || profile.role === 'front_desk' || profile.role === 'guesthouse' || profile.can_manage_guesthouse === true);
    if (!permitted) return res.status(403).json({ error: 'You are not authorized to set a guesthouse PIN.' });

    const salt = crypto.randomBytes(16).toString('hex');
    const { error } = await db
      .from('staff_profiles')
      .update({ guesthouse_pin_hash: sha256Hex(salt, pin), guesthouse_pin_salt: salt })
      .eq('id', staff.profile.id);
    if (error) {
      console.error('[set-guesthouse-pin] update error:', error);
      return res.status(500).json({ error: 'Failed to save PIN.' });
    }
    return res.status(200).json({ ok: true });
  }

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
