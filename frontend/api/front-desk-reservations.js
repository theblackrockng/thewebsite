'use strict';

const { createClient } = require('@supabase/supabase-js');
const {
  getIP,
  checkInMemoryRateLimit,
  applySecurityHeaders,
  getCorsHeaders,
  checkUserAgent,
  checkCors,
} = require('./_lib/security');
const { requireStaff } = require('./_lib/auth');

const FRONT_DESK_ROLES = ['front_desk', 'manager', 'super_admin'];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_KEYS = new Set(['id', 'status']);
const RANGES = ['all', 'today', 'upcoming', 'pending', 'past'];

const PAST_DAYS = 7;
const LIST_LIMIT = 500;

// Which current statuses may move to each status. Nothing goes backwards and
// a cancelled reservation can never be confirmed again.
const TRANSITIONS = {
  confirmed: ['pending', 'rescheduled'],
  cancelled: ['pending', 'rescheduled', 'confirmed'],
};

const TOKEN   = process.env.TELEGRAM_BOT_TOKEN || process.env.REACT_APP_TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID   || process.env.REACT_APP_TELEGRAM_CHAT_ID;

let _db = null;
function getDb() {
  if (_db) return _db;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _db = createClient(url, key);
  return _db;
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Lagos is UTC+1 all year with no daylight saving.
function lagosDate(offsetDays = 0) {
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

function fmtDate(d) {
  if (!d) return '';
  return new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtTime(t) {
  if (!t) return '';
  if (/[AaPp][Mm]/.test(t)) return t.trim();
  const [h, m] = t.split(':');
  const hr = parseInt(h, 10);
  return `${hr > 12 ? hr - 12 : hr || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
}

function fmtOccasion(o) {
  if (!o) return '';
  return o.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function timeMinutes(t) {
  const m = /^(\d{1,2}):(\d{2})\s*([AaPp][Mm])?/.exec(String(t || '').trim());
  if (!m) return 24 * 60;
  let h = parseInt(m[1], 10) % 24;
  if (m[3]) h = (h % 12) + (m[3].toLowerCase() === 'pm' ? 12 : 0);
  return h * 60 + parseInt(m[2], 10);
}

function partyOf(r) {
  return r.party === 'other' ? (r.party_other ?? '') : (r.party ?? '');
}

function publicRow(r) {
  return {
    id: r.id,
    name: r.name,
    phone: r.phone || null,
    date: r.date,
    time: r.time || null,
    party: String(partyOf(r)),
    occasion: r.occasion || null,
    notes: r.notes || r.special_requests || null,
    status: r.status,
    is_concierge: !!r.is_concierge,
    created_at: r.created_at,
  };
}

async function notifyTelegram(text) {
  if (!TOKEN || !CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'HTML' }),
    });
  } catch (err) {
    console.error('[front-desk-reservations] Telegram error:', err);
  }
}

function telegramText(r, nextStatus, staffName) {
  const when = `${fmtDate(r.date)}${r.time ? ` at ${fmtTime(r.time)}` : ''}`;
  const by = escapeHtml(staffName);
  if (nextStatus === 'confirmed') {
    return [
      '✅ <b>Reservation Confirmed</b>',
      `👤 ${escapeHtml(r.name)}`,
      `📅 ${escapeHtml(when)}`,
      `👥 ${escapeHtml(partyOf(r))} guests`,
      r.occasion ? `🎉 ${escapeHtml(fmtOccasion(r.occasion))}` : null,
      '',
      `🧑‍💼 Confirmed by: <b>${by}</b>`,
    ].filter((l) => l !== null).join('\n');
  }
  return [
    '❌ <b>Reservation Cancelled</b>',
    `👤 ${escapeHtml(r.name)}`,
    `📅 ${escapeHtml(when)}`,
    '',
    `🧑‍💼 Cancelled by: <b>${by}</b>`,
  ].join('\n');
}

async function handleList(req, res, db) {
  const range = req.query?.range === undefined ? 'all' : String(req.query.range);
  if (!RANGES.includes(range)) {
    return res.status(400).json({ error: `range must be one of ${RANGES.join(', ')}.` });
  }

  const today = lagosDate();
  const from = lagosDate(-PAST_DAYS);

  const { data, error } = await db
    .from('reservations')
    .select('*')
    .gte('date', from)
    .order('date', { ascending: true })
    .limit(LIST_LIMIT);

  if (error) {
    console.error('[front-desk-reservations] list error:', error);
    return res.status(500).json({ error: 'Failed to load reservations.' });
  }

  const rows = (data || [])
    .map(publicRow)
    .sort((a, b) => (a.date === b.date ? timeMinutes(a.time) - timeMinutes(b.time) : (a.date < b.date ? -1 : 1)));

  const filters = {
    all: () => true,
    today: (r) => r.date === today,
    upcoming: (r) => r.date > today,
    pending: (r) => r.status === 'pending' && r.date >= today,
    past: (r) => r.date < today,
  };

  return res.status(200).json({ today, reservations: rows.filter(filters[range]) });
}

async function handleUpdate(req, res, db, staff) {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ error: 'Invalid request body.' });
  }
  if (Object.keys(body).some((k) => !ALLOWED_KEYS.has(k))) {
    return res.status(400).json({ error: 'Only the status can be changed.' });
  }

  const { id, status: nextStatus } = body;

  if (typeof id !== 'string' || !UUID_RE.test(id)) {
    return res.status(400).json({ error: 'Missing or invalid reservation id.' });
  }
  if (typeof nextStatus !== 'string' || !Object.prototype.hasOwnProperty.call(TRANSITIONS, nextStatus)) {
    return res.status(400).json({ error: 'Front desk can only confirm or cancel a reservation.' });
  }

  const { data: reservation, error: fetchErr } = await db
    .from('reservations')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchErr || !reservation) {
    return res.status(404).json({ error: 'Reservation not found.' });
  }

  if (reservation.date && reservation.date < lagosDate()) {
    return res.status(400).json({ error: 'Past reservations are read only.' });
  }
  if (!TRANSITIONS[nextStatus].includes(reservation.status)) {
    return res.status(400).json({ error: `Cannot ${nextStatus === 'confirmed' ? 'confirm' : 'cancel'} a reservation that is '${reservation.status}'.` });
  }

  const { data: changed, error: updateErr } = await db
    .from('reservations')
    .update({ status: nextStatus })
    .eq('id', id)
    .eq('status', reservation.status)
    .select('id');

  if (updateErr) {
    console.error('[front-desk-reservations] update error:', updateErr);
    return res.status(500).json({ error: 'Failed to update the reservation.' });
  }
  if (!changed || changed.length === 0) {
    return res.status(409).json({ error: 'The reservation changed while you were updating it. Refresh and try again.' });
  }

  const staffName = staff.profile.full_name || staff.profile.email || 'Front Desk';
  await notifyTelegram(telegramText(reservation, nextStatus, staffName));

  return res.status(200).json({ ok: true, status: nextStatus });
}

module.exports = async function handler(req, res) {
  applySecurityHeaders(res);
  const corsHeaders = getCorsHeaders(req);
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET' && req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });

  const staff = await requireStaff(req, res, FRONT_DESK_ROLES);
  if (!staff) return;

  const ip = getIP(req);

  const { blocked } = checkUserAgent(req);
  if (blocked) return res.status(400).json({ error: 'Bad request' });

  const { allowed } = checkCors(req);
  if (!allowed) return res.status(403).json({ error: 'Forbidden' });

  // The screen polls every 15 seconds (240 an hour), so reads get their own larger bucket.
  const isRead = req.method === 'GET';
  const { limited } = isRead
    ? checkInMemoryRateLimit(ip, 'front-desk-reservations-read', 1500, 60 * 60 * 1000)
    : checkInMemoryRateLimit(ip, 'front-desk-reservations', 200, 60 * 60 * 1000);
  if (limited) return res.status(429).json({ error: 'Too many requests.' });

  const db = getDb();
  if (!db) return res.status(500).json({ error: 'Database not configured.' });

  try {
    return isRead ? await handleList(req, res, db) : await handleUpdate(req, res, db, staff);
  } catch (err) {
    console.error('[front-desk-reservations] unexpected error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
};
