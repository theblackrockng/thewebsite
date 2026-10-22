'use strict';

// One serverless function for the two Front Desk endpoints (Vercel Hobby allows
// 12 functions). vercel.json aliases /api/front-desk-orders and
// /api/front-desk-reservations to ?resource=orders and ?resource=reservations.

const { createClient } = require('@supabase/supabase-js');
const {
  getIP,
  checkInMemoryRateLimit,
  applySecurityHeaders,
  getCorsHeaders,
  checkUserAgent,
  checkCors,
} = require('./_lib/security');
const { requireStaff, verifyVoidToken, verifyGuesthouseToken } = require('./_lib/auth');
const { sendBlackRockEmail } = require('./_lib/email');
const { buildEodEmailHtml, buildEodText, buildEodMonthlyDigestHtml } = require('./_lib/eod-report');

const ORDER_ROLES        = ['front_desk', 'manager'];
const RESERVATION_ROLES  = ['front_desk', 'manager', 'super_admin'];
const WAITER_CALL_ROLES  = ['bar', 'front_desk', 'manager', 'super_admin'];
const ORDER_ITEM_ROLES   = ['front_desk', 'manager'];
const GUESTHOUSE_ROLES   = ['front_desk', 'manager', 'super_admin'];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TOKEN          = process.env.TELEGRAM_BOT_TOKEN || process.env.REACT_APP_TELEGRAM_BOT_TOKEN;
const CHAT_ID        = process.env.TELEGRAM_CHAT_ID   || process.env.REACT_APP_TELEGRAM_CHAT_ID;
const KITCHEN_CHAT_ID = process.env.KITCHEN_TELEGRAM_CHAT_ID || null;

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

async function notifyTelegram(tag, text) {
  if (!TOKEN || !CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'HTML' }),
    });
  } catch (err) {
    console.error(`[${tag}] Telegram error:`, err);
  }
}

async function notifyKitchenTelegram(tag, text) {
  if (!TOKEN || !KITCHEN_CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: KITCHEN_CHAT_ID, text, parse_mode: 'HTML' }),
    });
  } catch (err) {
    console.error(`[${tag}] kitchen Telegram error:`, err);
  }
}

// ── Orders ──────────────────────────────────────────────────────────────

const ORDER_KEYS = new Set(['id', 'order_status', 'payment_status']);

const ACTIVE_STATUSES = ['new', 'confirmed', 'preparing', 'ready'];
const SETTABLE_ORDER_STATUSES = ['confirmed', 'completed'];
const SETTABLE_PAYMENT_STATUSES = ['paid', 'proof_received'];

function isMissingColumn(err) {
  return err && (err.code === 'PGRST204' || err.code === '42703' || /completed_at/i.test(err.message || ''));
}

async function ordersHandler(req, res) {
  applySecurityHeaders(res);
  const corsHeaders = getCorsHeaders(req);
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });

  const staff = await requireStaff(req, res, ORDER_ROLES);
  if (!staff) return;

  const ip = getIP(req);

  const { blocked } = checkUserAgent(req);
  if (blocked) return res.status(400).json({ error: 'Bad request' });

  const { allowed } = checkCors(req);
  if (!allowed) return res.status(403).json({ error: 'Forbidden' });

  const { limited } = checkInMemoryRateLimit(ip, 'front-desk-orders', 200, 60 * 60 * 1000);
  if (limited) return res.status(429).json({ error: 'Too many requests.' });

  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ error: 'Invalid request body.' });
  }
  if (Object.keys(body).some((k) => !ORDER_KEYS.has(k))) {
    return res.status(400).json({ error: 'Only order_status or payment_status can be changed.' });
  }

  const { id, order_status: nextStatus, payment_status: nextPayment } = body;

  if (typeof id !== 'string' || !UUID_RE.test(id)) {
    return res.status(400).json({ error: 'Missing or invalid order id.' });
  }
  if ((nextStatus === undefined) === (nextPayment === undefined)) {
    return res.status(400).json({ error: 'Send exactly one of order_status or payment_status.' });
  }
  if (nextStatus !== undefined && !SETTABLE_ORDER_STATUSES.includes(nextStatus)) {
    return res.status(400).json({ error: 'Front desk can only confirm or complete an order.' });
  }
  if (nextPayment !== undefined && !SETTABLE_PAYMENT_STATUSES.includes(nextPayment)) {
    return res.status(400).json({ error: 'Payment status must be paid or proof_received.' });
  }

  const db = getDb();
  if (!db) return res.status(500).json({ error: 'Database not configured.' });

  try {
    const { data: order, error: fetchErr } = await db
      .from('orders')
      .select('id, order_number, order_status, payment_status, order_type')
      .eq('id', id)
      .single();

    if (fetchErr || !order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    let updates;
    let guard;

    if (nextStatus !== undefined) {
      if (nextStatus === 'confirmed' && order.order_status !== 'new') {
        return res.status(400).json({ error: `Cannot confirm an order that is '${order.order_status}'.` });
      }
      if (nextStatus === 'completed' && !ACTIVE_STATUSES.includes(order.order_status)) {
        return res.status(400).json({ error: `Cannot complete an order that is '${order.order_status}'.` });
      }
      updates = { order_status: nextStatus };
      if (nextStatus === 'confirmed') {
        updates.confirmed_by = staff.profile.full_name || staff.profile.email || 'Front Desk';
      }
      if (nextStatus === 'completed') {
        updates.completed_at = new Date().toISOString();
      }
      guard = { column: 'order_status', value: order.order_status };
    } else {
      if (order.order_status === 'cancelled') {
        return res.status(400).json({ error: 'Cannot change payment on a cancelled order.' });
      }
      if (order.payment_status === 'paid') {
        return res.status(400).json({ error: 'This order is already paid.' });
      }
      if (nextPayment === 'proof_received' && order.payment_status !== 'awaiting_proof') {
        return res.status(400).json({ error: `Cannot mark proof received when payment is '${order.payment_status}'.` });
      }
      updates = { payment_status: nextPayment };
      guard = { column: 'payment_status', value: order.payment_status };
    }

    const runUpdate = (values) => {
      const q = db.from('orders').update(values).eq('id', id);
      return (guard.value === null ? q.is(guard.column, null) : q.eq(guard.column, guard.value)).select('id');
    };

    let { data: changed, error: updateErr } = await runUpdate(updates);
    if (updateErr && updates.completed_at && isMissingColumn(updateErr)) {
      const { completed_at: _skip, ...withoutColumn } = updates;
      ({ data: changed, error: updateErr } = await runUpdate(withoutColumn));
    }

    if (updateErr) {
      console.error('[front-desk-orders] update error:', updateErr);
      return res.status(500).json({ error: 'Failed to update the order.' });
    }
    if (!changed || changed.length === 0) {
      return res.status(409).json({ error: 'The order changed while you were updating it. Refresh and try again.' });
    }

    if (nextStatus !== undefined) {
      const ref = order.order_number || id.slice(0, 8);
      const byLine = nextStatus === 'confirmed' ? ` by <b>${escapeHtml(updates.confirmed_by)}</b>` : '';
      await notifyTelegram('front-desk-orders', `📋 Order ${escapeHtml(ref)} is now <b>${nextStatus}</b>${byLine}`);
      if (nextStatus === 'confirmed' && (order.order_type === 'pickup' || order.order_type === 'delivery')) {
        const typeLabel = order.order_type === 'pickup' ? 'Pickup' : 'Delivery';
        const kitchenMsg = `🛒 <b>Order ${escapeHtml(ref)} — ${typeLabel}</b>\nConfirmed by <b>${escapeHtml(updates.confirmed_by)}</b>`;
        await notifyKitchenTelegram('front-desk-orders', kitchenMsg);
      }
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[front-desk-orders] unexpected error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
}

// ── Reservations ────────────────────────────────────────────────────────

const RESERVATION_KEYS = new Set(['id', 'status', 'meal_payment_status']);
const RANGES = ['all', 'today', 'upcoming', 'pending', 'past'];

const PAST_DAYS = 7;
const LIST_LIMIT = 500;

// Which current statuses may move to each status. Nothing goes backwards and
// a cancelled reservation can never be confirmed again.
const TRANSITIONS = {
  confirmed: ['pending', 'rescheduled'],
  cancelled: ['pending', 'rescheduled', 'confirmed'],
};

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
    pre_selected_meals: r.pre_selected_meals || null,
    meal_payment_status: r.meal_payment_status || null,
    meal_payment_choice: r.meal_payment_choice || null,
    meal_payment_amount: r.meal_payment_amount || null,
  };
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
  if (Object.keys(body).some((k) => !RESERVATION_KEYS.has(k))) {
    return res.status(400).json({ error: 'Only status or meal_payment_status can be changed.' });
  }

  const { id, status: nextStatus, meal_payment_status: nextMealPayment } = body;

  if (typeof id !== 'string' || !UUID_RE.test(id)) {
    return res.status(400).json({ error: 'Missing or invalid reservation id.' });
  }

  // meal_payment_status-only update (Mark Payment Verified)
  if (!nextStatus && nextMealPayment) {
    if (nextMealPayment !== 'paid') {
      return res.status(400).json({ error: 'meal_payment_status can only be set to paid.' });
    }
    const { error: updateErr } = await db
      .from('reservations')
      .update({ meal_payment_status: 'paid' })
      .eq('id', id)
      .eq('meal_payment_status', 'awaiting_proof');
    if (updateErr) {
      console.error('[front-desk-reservations] meal payment update error:', updateErr);
      if (updateErr.code === '42703') return res.status(200).json({ ok: true, meal_payment_status: 'paid', note: 'column_absent' });
      return res.status(500).json({ error: 'Failed to update payment status.' });
    }
    return res.status(200).json({ ok: true, meal_payment_status: 'paid' });
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
  await notifyTelegram('front-desk-reservations', telegramText(reservation, nextStatus, staffName));

  return res.status(200).json({ ok: true, status: nextStatus });
}

async function reservationsHandler(req, res) {
  applySecurityHeaders(res);
  const corsHeaders = getCorsHeaders(req);
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET' && req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });

  const staff = await requireStaff(req, res, RESERVATION_ROLES);
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
}

// ── Waiter calls ────────────────────────────────────────────────────────

async function waiterCallsHandler(req, res) {
  applySecurityHeaders(res);
  const corsHeaders = getCorsHeaders(req);
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET' && req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed.' });

  const staff = await requireStaff(req, res, WAITER_CALL_ROLES);
  if (!staff) return;

  const ip = getIP(req);
  const { blocked } = checkUserAgent(req);
  if (blocked) return res.status(400).json({ error: 'Bad request.' });
  const { allowed } = checkCors(req);
  if (!allowed) return res.status(403).json({ error: 'Forbidden.' });

  const isRead = req.method === 'GET';
  const { limited } = isRead
    ? checkInMemoryRateLimit(ip, 'waiter-calls-read',  1500, 60 * 60 * 1000)
    : checkInMemoryRateLimit(ip, 'waiter-calls-write',  200, 60 * 60 * 1000);
  if (limited) return res.status(429).json({ error: 'Too many requests.' });

  const db = getDb();
  if (!db) return res.status(500).json({ error: 'Database not configured.' });

  try {
    if (isRead) {
      const { data, error } = await db
        .from('waiter_calls')
        .select('id, table_number, status, created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[waiter-calls] list error:', error);
        return res.status(500).json({ error: 'Could not load waiter calls.' });
      }
      return res.status(200).json({ calls: data || [] });
    }

    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({ error: 'Invalid request body.' });
    }
    const { id } = body;
    if (typeof id !== 'string' || !UUID_RE.test(id)) {
      return res.status(400).json({ error: 'Missing or invalid call id.' });
    }

    const { data: changed, error: updateErr } = await db
      .from('waiter_calls')
      .update({
        status: 'acknowledged',
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: staff.profile.id,
      })
      .eq('id', id)
      .eq('status', 'pending')
      .select('id');

    if (updateErr) {
      console.error('[waiter-calls] acknowledge error:', updateErr);
      return res.status(500).json({ error: 'Could not acknowledge call.' });
    }
    if (!changed || changed.length === 0) {
      return res.status(409).json({ error: 'Call already acknowledged or not found.' });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[waiter-calls] unexpected error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
}

// ── Order items: void or edit a line on a confirmed order ──────────────
// Requires a valid x-void-token header issued by /api/staff-login?action=verify-void-pin.
// POST   { order_id, item_id, reason? }           → void (soft-delete) a line
// PATCH  { order_id, item_id, qty, note? }        → edit qty / modifiers on a line
// After either, recompute orders.subtotal and orders.total from non-voided rows.

const EDITABLE_ORDER_STATUSES = ['new', 'confirmed', 'preparing', 'ready'];

async function recomputeOrderTotals(db, orderId) {
  let rows;
  let err;
  ({ data: rows, error: err } = await db
    .from('order_items')
    .select('line_total, voided')
    .eq('order_id', orderId));
  if (err && isMissingColumn(err)) {
    ({ data: rows, error: err } = await db
      .from('order_items')
      .select('line_total')
      .eq('order_id', orderId));
  }
  if (err) throw err;
  const subtotal = (rows || [])
    .filter((r) => !r.voided)
    .reduce((sum, r) => sum + Number(r.line_total || 0), 0);
  const { data: order } = await db
    .from('orders')
    .select('delivery_fee')
    .eq('id', orderId)
    .maybeSingle();
  const deliveryFee = Number(order?.delivery_fee || 0);
  await db
    .from('orders')
    .update({ subtotal, total: subtotal + deliveryFee })
    .eq('id', orderId);
  return { subtotal, total: subtotal + deliveryFee };
}

async function orderItemsHandler(req, res) {
  applySecurityHeaders(res);
  const corsHeaders = getCorsHeaders(req);
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
  res.setHeader('Access-Control-Allow-Methods', 'POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Void-Token');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST' && req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed.' });

  const staff = await requireStaff(req, res, ORDER_ITEM_ROLES);
  if (!staff) return;

  const ip = getIP(req);
  const { blocked } = checkUserAgent(req);
  if (blocked) return res.status(400).json({ error: 'Bad request.' });
  const { allowed } = checkCors(req);
  if (!allowed) return res.status(403).json({ error: 'Forbidden.' });
  const { limited } = checkInMemoryRateLimit(ip, 'front-desk-order-items', 200, 60 * 60 * 1000);
  if (limited) return res.status(429).json({ error: 'Too many requests.' });

  const voidToken = req.headers['x-void-token'] || req.headers['X-Void-Token'] || '';
  const authz = verifyVoidToken(voidToken);
  if (!authz) return res.status(401).json({ error: 'Manager PIN required. Verify and try again.' });

  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ error: 'Invalid request body.' });
  }
  const { order_id: orderId, item_id: itemId } = body;
  if (typeof orderId !== 'string' || !UUID_RE.test(orderId)) return res.status(400).json({ error: 'Missing or invalid order id.' });
  if (typeof itemId !== 'string' || !UUID_RE.test(itemId)) return res.status(400).json({ error: 'Missing or invalid item id.' });

  const db = getDb();
  if (!db) return res.status(500).json({ error: 'Database not configured.' });

  const { data: order, error: orderErr } = await db
    .from('orders')
    .select('id, order_number, order_status')
    .eq('id', orderId)
    .maybeSingle();
  if (orderErr || !order) return res.status(404).json({ error: 'Order not found.' });
  if (!EDITABLE_ORDER_STATUSES.includes(order.order_status)) {
    return res.status(400).json({ error: `Cannot edit items on an order that is '${order.order_status}'.` });
  }

  let item;
  let itemErr;
  ({ data: item, error: itemErr } = await db
    .from('order_items')
    .select('id, order_id, item_name, unit_price, qty, voided')
    .eq('id', itemId)
    .maybeSingle());
  const voidedColumnMissing = itemErr && isMissingColumn(itemErr);
  if (voidedColumnMissing) {
    ({ data: item, error: itemErr } = await db
      .from('order_items')
      .select('id, order_id, item_name, unit_price, qty')
      .eq('id', itemId)
      .maybeSingle());
  }
  if (itemErr || !item || item.order_id !== orderId) return res.status(404).json({ error: 'Item not found on this order.' });
  if (item.voided) return res.status(400).json({ error: 'Item is already voided.' });

  try {
    if (req.method === 'POST') {
      const reason = typeof body.reason === 'string' ? body.reason.slice(0, 240) : null;
      if (voidedColumnMissing) {
        const { error: delErr } = await db
          .from('order_items')
          .delete()
          .eq('id', itemId);
        if (delErr) {
          console.error('[front-desk-order-items] delete fallback error:', delErr);
          return res.status(500).json({ error: 'Failed to void item.' });
        }
      } else {
        const { error: voidErr } = await db
          .from('order_items')
          .update({
            voided: true,
            voided_by: authz.by_name || staff.profile.full_name,
            voided_at: new Date().toISOString(),
            void_reason: reason,
          })
          .eq('id', itemId)
          .eq('voided', false);
        if (voidErr) {
          console.error('[front-desk-order-items] void error:', voidErr);
          return res.status(500).json({ error: 'Failed to void item.' });
        }
      }
      const totals = await recomputeOrderTotals(db, orderId);
      const ref = order.order_number || orderId.slice(0, 8);
      await notifyTelegram(
        'front-desk-order-items',
        `🗑️ Void on <b>${escapeHtml(ref)}</b>: ${escapeHtml(item.item_name)} ×${item.qty} — authorized by <b>${escapeHtml(authz.by_name || '?')}</b>${reason ? ` · ${escapeHtml(reason)}` : ''}`,
      );
      return res.status(200).json({ ok: true, action: 'void', ...totals });
    }

    const nextQty = body.qty;
    if (!Number.isInteger(nextQty) || nextQty < 1 || nextQty > 99) {
      return res.status(400).json({ error: 'qty must be an integer between 1 and 99.' });
    }
    const nextNote = body.note === undefined ? undefined : (body.note === null ? null : String(body.note).slice(0, 240));
    const updates = {
      qty: nextQty,
      line_total: Number(item.unit_price || 0) * nextQty,
    };
    if (nextNote !== undefined) updates.modifiers = nextNote;
    const patchQuery = db
      .from('order_items')
      .update(updates)
      .eq('id', itemId);
    const { error: patchErr } = await (voidedColumnMissing ? patchQuery : patchQuery.eq('voided', false));
    if (patchErr) {
      console.error('[front-desk-order-items] patch error:', patchErr);
      return res.status(500).json({ error: 'Failed to update item.' });
    }
    const totals = await recomputeOrderTotals(db, orderId);
    const ref = order.order_number || orderId.slice(0, 8);
    await notifyTelegram(
      'front-desk-order-items',
      `✏️ Edit on <b>${escapeHtml(ref)}</b>: ${escapeHtml(item.item_name)} → ×${nextQty} — authorized by <b>${escapeHtml(authz.by_name || '?')}</b>`,
    );
    return res.status(200).json({ ok: true, action: 'edit', ...totals });
  } catch (err) {
    console.error('[front-desk-order-items] unexpected:', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
}

// ── Append items to an existing table order (Front Desk "Add Items") ───
// POST { order_id, request_id?, items: [{ id, name, price, qty, menuType, modifiers? }] }
// Inserts into order_items, recomputes totals, notifies kitchen. No PIN
// required — additive, not destructive. request_id dedups duplicate submits
// from the same modal session.

const ADD_ITEMS_IDEMPOTENCY = new Map();
const ADD_ITEMS_TTL_MS = 2 * 60 * 1000;
function rememberAddItems(key, response) {
  ADD_ITEMS_IDEMPOTENCY.set(key, { ts: Date.now(), response });
  if (ADD_ITEMS_IDEMPOTENCY.size > 500) {
    const cutoff = Date.now() - ADD_ITEMS_TTL_MS;
    for (const [k, v] of ADD_ITEMS_IDEMPOTENCY.entries()) {
      if (v.ts < cutoff) ADD_ITEMS_IDEMPOTENCY.delete(k);
    }
  }
}
function recallAddItems(key) {
  const hit = ADD_ITEMS_IDEMPOTENCY.get(key);
  if (!hit) return null;
  if (Date.now() - hit.ts > ADD_ITEMS_TTL_MS) {
    ADD_ITEMS_IDEMPOTENCY.delete(key);
    return null;
  }
  return hit.response;
}

async function addItemsHandler(req, res) {
  applySecurityHeaders(res);
  const corsHeaders = getCorsHeaders(req);
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  const staff = await requireStaff(req, res, ORDER_ITEM_ROLES);
  if (!staff) return;

  const ip = getIP(req);
  const { blocked } = checkUserAgent(req);
  if (blocked) return res.status(400).json({ error: 'Bad request.' });
  const { allowed } = checkCors(req);
  if (!allowed) return res.status(403).json({ error: 'Forbidden.' });
  const { limited } = checkInMemoryRateLimit(ip, 'front-desk-add-items', 200, 60 * 60 * 1000);
  if (limited) return res.status(429).json({ error: 'Too many requests.' });

  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ error: 'Invalid request body.' });
  }
  const { order_id: orderId, items, request_id: requestId } = body;
  if (typeof orderId !== 'string' || !UUID_RE.test(orderId)) {
    return res.status(400).json({ error: 'Missing or invalid order id.' });
  }
  if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
    return res.status(400).json({ error: 'items must be a non-empty array (max 50).' });
  }

  const idemKey = typeof requestId === 'string' && requestId.length >= 8 && requestId.length <= 128
    ? `${orderId}:${requestId}`
    : null;
  if (idemKey) {
    const cached = recallAddItems(idemKey);
    if (cached) return res.status(200).json({ ...cached, deduped: true });
  }

  const db = getDb();
  if (!db) return res.status(500).json({ error: 'Database not configured.' });

  const { data: order, error: orderErr } = await db
    .from('orders')
    .select('id, order_number, order_status, table_number, order_type')
    .eq('id', orderId)
    .maybeSingle();
  if (orderErr || !order) return res.status(404).json({ error: 'Order not found.' });
  if (!EDITABLE_ORDER_STATUSES.includes(order.order_status)) {
    return res.status(400).json({ error: `Cannot add items to an order that is '${order.order_status}'.` });
  }

  const rows = [];
  for (const it of items) {
    const qty = Number(it.qty);
    const price = Number(it.price);
    if (!Number.isFinite(qty) || qty < 1 || qty > 99) {
      return res.status(400).json({ error: 'Each item needs a qty between 1 and 99.' });
    }
    if (!Number.isFinite(price) || price < 0) {
      return res.status(400).json({ error: 'Each item needs a non-negative price.' });
    }
    if (!it.name || typeof it.name !== 'string') {
      return res.status(400).json({ error: 'Each item needs a name.' });
    }
    rows.push({
      order_id: orderId,
      item_id: it.id || null,
      item_name: String(it.name).slice(0, 200),
      unit_price: price,
      qty,
      line_total: price * qty,
      category: it.menuType === 'drink' ? 'drink' : 'food',
      modifiers: it.modifiers ? String(it.modifiers).slice(0, 240) : null,
    });
  }

  const { error: insertErr } = await db.from('order_items').insert(rows);
  if (insertErr) {
    console.error('[front-desk-add-items] insert error:', insertErr);
    return res.status(500).json({ error: 'Failed to add items.', detail: insertErr.message });
  }

  let totals;
  try {
    totals = await recomputeOrderTotals(db, orderId);
  } catch (err) {
    console.error('[front-desk-add-items] recompute error:', err);
    totals = null;
  }

  const staffName = staff.profile.full_name || staff.profile.email || 'Front Desk';
  const ref = order.order_number || orderId.slice(0, 8);
  const itemsText = rows
    .map((r) => `  ${r.qty}× ${r.item_name}${r.modifiers ? ` (${r.modifiers})` : ''} — ₦${(r.line_total).toLocaleString('en-NG')}`)
    .join('\n');
  const location = order.table_number ? `Table ${order.table_number}` : (order.order_type || 'order');
  const telegramMsg = [
    `➕ <b>Items added to ${escapeHtml(ref)}</b> (${escapeHtml(location)})`,
    `By <b>${escapeHtml(staffName)}</b>`,
    '',
    'Added:',
    escapeHtml(itemsText),
    totals ? `\nNew total: ₦${totals.total.toLocaleString('en-NG')}` : '',
  ].filter(Boolean).join('\n');
  await notifyTelegram('front-desk-add-items', telegramMsg);

  const hasFood = rows.some((r) => r.category !== 'drink');
  if (hasFood) {
    await notifyKitchenTelegram('front-desk-add-items', telegramMsg);
  }

  const response = { ok: true, added: rows.length, ...(totals || {}) };
  if (idemKey) rememberAddItems(idemKey, response);
  return res.status(200).json(response);
}

// ── Guest House: rooms + bookings ──────────────────────────────────────

async function guesthouseRoomsHandler(req, res) {
  applySecurityHeaders(res);
  const corsHeaders = getCorsHeaders(req);
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });

  const staff = await requireStaff(req, res, GUESTHOUSE_ROLES);
  if (!staff) return;

  const db = getDb();
  if (!db) return res.status(500).json({ error: 'Database not configured.' });

  const { data: rooms, error: roomsErr } = await db
    .from('guest_rooms')
    .select('id, room_number, room_type, price, status, notes')
    .order('room_number');
  if (roomsErr) {
    console.error('[guesthouse-rooms] fetch error:', roomsErr);
    return res.status(500).json({ error: 'Failed to load rooms.' });
  }

  const roomIds = (rooms || []).map((r) => r.id);
  const { data: activeBookings } = roomIds.length
    ? await db
        .from('guest_room_bookings')
        .select('id, room_id, guest_name, guest_phone, check_in_at, nights, total_amount, key_encoded_at, payment_status, checked_in_by_name')
        .in('room_id', roomIds)
        .eq('status', 'active')
    : { data: [] };

  const byRoom = new Map();
  for (const b of activeBookings || []) byRoom.set(b.room_id, b);

  const withBooking = (rooms || []).map((r) => ({ ...r, active_booking: byRoom.get(r.id) || null }));
  return res.status(200).json({ ok: true, rooms: withBooking });
}

async function guesthouseBookingsHandler(req, res) {
  applySecurityHeaders(res);
  const corsHeaders = getCorsHeaders(req);
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Guesthouse-Token');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const staff = await requireStaff(req, res, GUESTHOUSE_ROLES);
  if (!staff) return;

  const db = getDb();
  if (!db) return res.status(500).json({ error: 'Database not configured.' });

  const ip = getIP(req);
  const { blocked } = checkUserAgent(req);
  if (blocked) return res.status(400).json({ error: 'Bad request.' });

  // GET → list bookings. Optional ?from=YYYY-MM-DD&to=YYYY-MM-DD; defaults to today's.
  if (req.method === 'GET') {
    const { limited } = checkInMemoryRateLimit(ip, 'front-desk-guesthouse-list', 200, 60 * 60 * 1000);
    if (limited) return res.status(429).json({ error: 'Too many requests.' });

    const from = typeof req.query.from === 'string' ? req.query.from : null;
    const to   = typeof req.query.to === 'string'   ? req.query.to   : null;
    const status = typeof req.query.status === 'string' ? req.query.status : null;

    let q = db.from('guest_room_bookings')
      .select('*')
      .order('check_in_at', { ascending: false })
      .limit(300);
    if (from) q = q.gte('check_in_at', `${from}T00:00:00`);
    if (to)   q = q.lte('check_in_at', `${to}T23:59:59`);
    if (status) q = q.eq('status', status);
    const { data, error } = await q;
    if (error) {
      console.error('[guesthouse-bookings] list error:', error);
      return res.status(500).json({ error: 'Failed to load bookings.' });
    }
    return res.status(200).json({ ok: true, bookings: data || [] });
  }

  // POST → check-in (requires guesthouse PIN token).
  // Body: { room_id, guest_name, guest_phone?, guest_email?, nights, discount?, payment_method?, notes? }
  if (req.method === 'POST') {
    const token = req.headers['x-guesthouse-token'] || req.headers['X-Guesthouse-Token'] || '';
    const authz = verifyGuesthouseToken(token);
    if (!authz) return res.status(401).json({ error: 'Guesthouse PIN required. Verify and try again.' });

    const { limited } = checkInMemoryRateLimit(ip, 'front-desk-guesthouse-write', 60, 60 * 60 * 1000);
    if (limited) return res.status(429).json({ error: 'Too many requests.' });

    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({ error: 'Invalid request body.' });
    }
    const { room_id, guest_name, guest_phone, guest_email, nights, discount, payment_method, notes } = body;
    if (typeof room_id !== 'string' || !UUID_RE.test(room_id)) return res.status(400).json({ error: 'Missing or invalid room id.' });
    if (typeof guest_name !== 'string' || !guest_name.trim()) return res.status(400).json({ error: 'Guest name is required.' });
    const nightsN = Number.parseInt(nights, 10);
    if (!Number.isInteger(nightsN) || nightsN < 1 || nightsN > 365) return res.status(400).json({ error: 'Nights must be between 1 and 365.' });
    const discountN = Number.parseInt(discount, 10) || 0;
    if (discountN < 0) return res.status(400).json({ error: 'Discount cannot be negative.' });

    const { data: room, error: roomErr } = await db
      .from('guest_rooms')
      .select('id, room_number, room_type, price')
      .eq('id', room_id)
      .maybeSingle();
    if (roomErr || !room) return res.status(404).json({ error: 'Room not found.' });

    const { data: existing } = await db
      .from('guest_room_bookings')
      .select('id')
      .eq('room_id', room_id)
      .eq('status', 'active')
      .limit(1);
    if (existing && existing.length > 0) return res.status(409).json({ error: 'Room is already occupied. Check out the current guest first.' });

    const baseAmount = room.price * nightsN;
    const totalAmount = Math.max(0, baseAmount - discountN);

    const { data: inserted, error: insErr } = await db
      .from('guest_room_bookings')
      .insert({
        room_id,
        room_number: room.room_number,
        guest_name: guest_name.trim(),
        guest_phone: guest_phone?.trim() || null,
        guest_email: guest_email?.trim() || null,
        nights: nightsN,
        base_amount: baseAmount,
        discount: discountN,
        total_amount: totalAmount,
        payment_method: payment_method || null,
        notes: notes || null,
        checked_in_by_id: staff.profile.id,
        checked_in_by_name: staff.profile.full_name || staff.profile.email || 'Front Desk',
      })
      .select('*')
      .single();
    if (insErr) {
      console.error('[guesthouse-bookings] insert error:', insErr);
      return res.status(500).json({ error: 'Failed to create booking.' });
    }

    await db.from('guest_rooms').update({ status: 'occupied' }).eq('id', room_id);

    const msg = [
      `🛏️ <b>Guest House check-in</b>`,
      `Room <b>${escapeHtml(room.room_number)}</b> (${escapeHtml(room.room_type)}) — ${nightsN} night${nightsN === 1 ? '' : 's'}`,
      `Guest: <b>${escapeHtml(guest_name)}</b>${guest_phone ? ` · ${escapeHtml(guest_phone)}` : ''}`,
      discountN > 0 ? `Discount: ₦${discountN.toLocaleString('en-NG')}` : '',
      `Total: ₦${totalAmount.toLocaleString('en-NG')}`,
      `By ${escapeHtml(staff.profile.full_name || 'Front Desk')} (PIN: ${escapeHtml(authz.by_name || '—')})`,
    ].filter(Boolean).join('\n');
    await notifyTelegram('guesthouse-checkin', msg);

    return res.status(200).json({ ok: true, booking: inserted });
  }

  // PATCH → check-out, mark payment, or log key encoded.
  // Body: { id, action: 'check-out' | 'mark-paid' | 'log-key-encoded', payment_method?, notes? }
  if (req.method === 'PATCH') {
    const { limited } = checkInMemoryRateLimit(ip, 'front-desk-guesthouse-write', 60, 60 * 60 * 1000);
    if (limited) return res.status(429).json({ error: 'Too many requests.' });

    const token = req.headers['x-guesthouse-token'] || req.headers['X-Guesthouse-Token'] || '';
    const authz = verifyGuesthouseToken(token);
    if (!authz) return res.status(401).json({ error: 'Guesthouse PIN required. Verify and try again.' });

    const body = req.body || {};
    const { id, action, payment_method, notes } = body;
    if (typeof id !== 'string' || !UUID_RE.test(id)) return res.status(400).json({ error: 'Missing or invalid booking id.' });

    const { data: booking, error: bErr } = await db
      .from('guest_room_bookings')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (bErr || !booking) return res.status(404).json({ error: 'Booking not found.' });

    if (action === 'check-out') {
      if (booking.status !== 'active') return res.status(400).json({ error: 'Booking is not active.' });
      const now = new Date().toISOString();
      const { error: upErr } = await db
        .from('guest_room_bookings')
        .update({
          status: 'checked_out',
          check_out_at: now,
          checked_out_by_id: staff.profile.id,
          checked_out_by_name: staff.profile.full_name || 'Front Desk',
          updated_at: now,
        })
        .eq('id', id);
      if (upErr) return res.status(500).json({ error: 'Failed to check out.' });
      await db.from('guest_rooms').update({ status: 'cleaning' }).eq('id', booking.room_id);
      await notifyTelegram('guesthouse-checkout', `🚪 Room ${escapeHtml(booking.room_number)} checked out by ${escapeHtml(staff.profile.full_name || 'Front Desk')}. Guest: ${escapeHtml(booking.guest_name)}.`);
      return res.status(200).json({ ok: true });
    }

    if (action === 'mark-paid') {
      const { error: upErr } = await db
        .from('guest_room_bookings')
        .update({
          payment_status: 'paid',
          payment_method: payment_method || booking.payment_method,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (upErr) return res.status(500).json({ error: 'Failed to mark paid.' });
      return res.status(200).json({ ok: true });
    }

    if (action === 'log-key-encoded') {
      const now = new Date().toISOString();
      const { error: upErr } = await db
        .from('guest_room_bookings')
        .update({
          key_encoded_by_id: staff.profile.id,
          key_encoded_by_name: staff.profile.full_name || 'Front Desk',
          key_encoded_at: now,
          notes: notes || booking.notes,
          updated_at: now,
        })
        .eq('id', id);
      if (upErr) return res.status(500).json({ error: 'Failed to log key encoded.' });
      await notifyTelegram('guesthouse-key', `🔑 Room ${escapeHtml(booking.room_number)} key encoded by ${escapeHtml(staff.profile.full_name || 'Front Desk')} for ${escapeHtml(booking.guest_name)}.`);
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Unknown action.' });
  }

  return res.status(405).json({ error: 'Method not allowed.' });
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function lagosDayBounds(dateStr) {
  const start = `${dateStr}T00:00:00+01:00`;
  const d = new Date(start);
  const end = new Date(d.getTime() + 24 * 60 * 60 * 1000).toISOString();
  return { start: new Date(start).toISOString(), end };
}

async function eodHandler(req, res) {
  applySecurityHeaders(res);
  const corsHeaders = getCorsHeaders(req);
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });

  const staff = await requireStaff(req, res, GUESTHOUSE_ROLES);
  if (!staff) return;

  const db = getDb();
  if (!db) return res.status(500).json({ error: 'Database not configured.' });

  const ip = getIP(req);
  const { blocked } = checkUserAgent(req);
  if (blocked) return res.status(400).json({ error: 'Bad request.' });

  const { limited } = checkInMemoryRateLimit(ip, 'front-desk-eod', 120, 60 * 60 * 1000);
  if (limited) return res.status(429).json({ error: 'Too many requests.' });

  const date = typeof req.query.date === 'string' ? req.query.date : '';
  if (!DATE_RE.test(date)) return res.status(400).json({ error: 'Pass ?date=YYYY-MM-DD.' });

  const archiveLookup = await db
    .from('eod_archives')
    .select('report_date, snapshot, created_at')
    .eq('report_date', date)
    .maybeSingle();

  if (archiveLookup.data && !archiveLookup.error) {
    return res.status(200).json({
      ok: true,
      date,
      source: 'archive',
      archived_at: archiveLookup.data.created_at,
      completedOrders: archiveLookup.data.snapshot.completedOrders || [],
      bookings: archiveLookup.data.snapshot.bookings || [],
    });
  }

  const { start, end } = lagosDayBounds(date);

  const ordersReq = db
    .from('orders')
    .select('*, order_items(*)')
    .eq('order_status', 'completed')
    .or(`completed_at.gte.${start},and(completed_at.is.null,created_at.gte.${start})`)
    .or(`completed_at.lt.${end},and(completed_at.is.null,created_at.lt.${end})`)
    .order('created_at', { ascending: false })
    .limit(1000);

  const bookingsReq = db
    .from('guest_room_bookings')
    .select('*')
    .gte('check_in_at', start)
    .lt('check_in_at', end)
    .order('check_in_at', { ascending: false })
    .limit(500);

  const [{ data: orders, error: ordersErr }, { data: bookings, error: bookingsErr }] = await Promise.all([ordersReq, bookingsReq]);

  if (ordersErr) {
    console.error('[eod] orders error:', ordersErr);
    return res.status(500).json({ error: 'Failed to load orders.' });
  }
  if (bookingsErr) {
    console.error('[eod] bookings error:', bookingsErr);
    return res.status(500).json({ error: 'Failed to load bookings.' });
  }

  return res.status(200).json({
    ok: true,
    date,
    source: 'live',
    completedOrders: orders || [],
    bookings: bookings || [],
  });
}

// 6am Lagos cron: builds yesterday's EOD, writes it to eod_archives, and
// delivers it to every active row in eod_recipients. Authenticated via
// Authorization: Bearer <CRON_SECRET> (Vercel cron auth).
async function eodCronHandler(req, res) {
  applySecurityHeaders(res);

  const authz = req.headers.authorization || '';
  if (!process.env.CRON_SECRET || authz !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const db = getDb();
  if (!db) return res.status(500).json({ error: 'Database not configured.' });

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const reportDate = typeof req.query.date === 'string' && DATE_RE.test(req.query.date)
    ? req.query.date
    : yesterday.toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' });
  const { start, end } = lagosDayBounds(reportDate);

  const [ordersRes, bookingsRes, menuRes, recipientsRes] = await Promise.all([
    db.from('orders')
      .select('*, order_items(*)')
      .eq('order_status', 'completed')
      .or(`completed_at.gte.${start},and(completed_at.is.null,created_at.gte.${start})`)
      .or(`completed_at.lt.${end},and(completed_at.is.null,created_at.lt.${end})`)
      .order('created_at', { ascending: false })
      .limit(1000),
    db.from('guest_room_bookings')
      .select('*')
      .gte('check_in_at', start)
      .lt('check_in_at', end)
      .order('check_in_at', { ascending: false })
      .limit(500),
    db.from('menu_items').select('id, category').limit(2000),
    db.from('eod_recipients').select('*').eq('active', true),
  ]);

  if (ordersRes.error)    { console.error('[eod-cron] orders:', ordersRes.error);    return res.status(500).json({ error: 'orders query failed' }); }
  if (bookingsRes.error)  { console.error('[eod-cron] bookings:', bookingsRes.error); return res.status(500).json({ error: 'bookings query failed' }); }
  if (menuRes.error)      { console.error('[eod-cron] menu:', menuRes.error);         return res.status(500).json({ error: 'menu query failed' }); }

  const completedOrders = ordersRes.data || [];
  const bookings = bookingsRes.data || [];
  const menuCategoryMap = new Map();
  for (const row of (menuRes.data || [])) {
    if (row.id && row.category) menuCategoryMap.set(row.id, row.category);
  }

  const archive = await db.from('eod_archives').upsert({
    report_date: reportDate,
    snapshot: { completedOrders, bookings },
    created_by: 'cron',
  }, { onConflict: 'report_date' });
  if (archive.error) console.error('[eod-cron] archive upsert:', archive.error);

  const recipients = recipientsRes.error ? [] : (recipientsRes.data || []);
  if (recipientsRes.error) console.error('[eod-cron] recipients query:', recipientsRes.error);

  const emailResults = [];
  const telegramResults = [];
  const titleFor = (mode) => mode === 'kitchen' ? 'Kitchen End of Day' : 'End of Day Report';
  const dateLabel = new Date(`${reportDate}T12:00:00+01:00`)
    .toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos' });

  for (const r of recipients) {
    const mode = r.mode === 'kitchen' ? 'kitchen' : 'full';
    if (r.kind === 'email') {
      try {
        const bodyHtml = buildEodEmailHtml(completedOrders, menuCategoryMap, bookings, mode, reportDate);
        await sendBlackRockEmail({
          to: r.value,
          subject: `${titleFor(mode)} — ${dateLabel}`,
          guestName: r.label || 'Team',
          bodyHtml,
          type: 'general',
          preheader: `Daily sales summary for ${dateLabel}.`,
        });
        emailResults.push({ to: r.value, status: 'sent' });
      } catch (err) {
        emailResults.push({ to: r.value, status: 'failed', error: err?.message || String(err) });
        console.error('[eod-cron] email send failed:', r.value, err);
      }
    } else if (r.kind === 'telegram') {
      if (!TOKEN) { telegramResults.push({ to: r.value, status: 'skipped', reason: 'no token' }); continue; }
      const text = buildEodText(completedOrders, menuCategoryMap, bookings, mode, reportDate);
      try {
        const tgRes = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: r.value, text, parse_mode: 'HTML' }),
        });
        if (!tgRes.ok) {
          const errBody = await tgRes.text().catch(() => '');
          telegramResults.push({ to: r.value, status: 'failed', error: `${tgRes.status} ${errBody.slice(0, 200)}` });
          console.error('[eod-cron] telegram failed:', r.value, tgRes.status, errBody);
        } else {
          telegramResults.push({ to: r.value, status: 'sent' });
        }
      } catch (err) {
        telegramResults.push({ to: r.value, status: 'failed', error: err?.message || String(err) });
        console.error('[eod-cron] telegram send failed:', r.value, err);
      }
    }
  }

  // Rolling 30-day digest + purge. When archives reach 30 rows, send a
  // consolidated email to active email recipients, then delete those 30 rows.
  // Email only — Telegram does not receive the monthly digest (user preference).
  const digest = await maybeRunMonthlyDigest(db, menuCategoryMap, recipients);

  return res.status(200).json({
    ok: true,
    date: reportDate,
    orders: completedOrders.length,
    bookings: bookings.length,
    archive: archive.error ? 'failed' : 'written',
    emails: emailResults,
    telegrams: telegramResults,
    digest,
  });
}

async function maybeRunMonthlyDigest(db, menuCategoryMap, recipients) {
  const countRes = await db
    .from('eod_archives')
    .select('report_date', { count: 'exact', head: true });
  if (countRes.error) {
    console.error('[eod-cron] digest count failed:', countRes.error);
    return { ran: false, reason: 'count query failed' };
  }
  const total = countRes.count || 0;
  if (total < 30) return { ran: false, reason: `only ${total}/30 archives` };

  const batchRes = await db
    .from('eod_archives')
    .select('report_date, snapshot')
    .order('report_date', { ascending: true })
    .limit(30);
  if (batchRes.error) {
    console.error('[eod-cron] digest batch fetch failed:', batchRes.error);
    return { ran: false, reason: 'batch query failed' };
  }
  const batch = batchRes.data || [];
  if (batch.length === 0) return { ran: false, reason: 'empty batch' };

  const html = buildEodMonthlyDigestHtml(batch, menuCategoryMap);
  const first = batch[0].report_date;
  const last  = batch[batch.length - 1].report_date;
  const subjectLabel = `${first} → ${last}`;

  const emailRecipients = recipients.filter((r) => r.kind === 'email' && r.active);
  const results = [];
  for (const r of emailRecipients) {
    try {
      await sendBlackRockEmail({
        to: r.value,
        subject: `BLACKROCK — 30-Day Sales Summary (${subjectLabel})`,
        guestName: r.label || 'Team',
        bodyHtml: html,
        type: 'general',
        preheader: `30-day consolidated sales summary covering ${subjectLabel}.`,
      });
      results.push({ to: r.value, status: 'sent' });
    } catch (err) {
      results.push({ to: r.value, status: 'failed', error: err?.message || String(err) });
      console.error('[eod-cron] digest email failed:', r.value, err);
    }
  }

  const anySent = results.some((r) => r.status === 'sent');
  if (!anySent && emailRecipients.length > 0) {
    return { ran: true, purged: false, reason: 'all email sends failed', results };
  }

  const purge = await db
    .from('eod_archives')
    .delete()
    .lte('report_date', last);
  if (purge.error) {
    console.error('[eod-cron] digest purge failed:', purge.error);
    return { ran: true, purged: false, from: first, to: last, results, error: purge.error.message };
  }
  return { ran: true, purged: true, from: first, to: last, days: batch.length, results };
}

module.exports = function handler(req, res) {
  const resource = req.query && req.query.resource;
  if (resource === 'orders') return ordersHandler(req, res);
  if (resource === 'reservations') return reservationsHandler(req, res);
  if (resource === 'waiter-calls') return waiterCallsHandler(req, res);
  if (resource === 'order-items') return orderItemsHandler(req, res);
  if (resource === 'add-items') return addItemsHandler(req, res);
  if (resource === 'guesthouse-rooms') return guesthouseRoomsHandler(req, res);
  if (resource === 'guesthouse-bookings') return guesthouseBookingsHandler(req, res);
  if (resource === 'eod') return eodHandler(req, res);
  if (resource === 'eod-cron') return eodCronHandler(req, res);
  applySecurityHeaders(res);
  return res.status(400).json({ error: 'Unknown resource.' });
};
