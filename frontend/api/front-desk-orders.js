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

const FRONT_DESK_ROLES = ['front_desk', 'manager'];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_KEYS = new Set(['id', 'order_status', 'payment_status']);

const ACTIVE_STATUSES = ['new', 'confirmed', 'preparing', 'ready'];
const SETTABLE_ORDER_STATUSES = ['confirmed', 'completed'];
const SETTABLE_PAYMENT_STATUSES = ['paid', 'proof_received'];

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

async function notifyTelegram(text) {
  if (!TOKEN || !CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'HTML' }),
    });
  } catch (err) {
    console.error('[front-desk-orders] Telegram error:', err);
  }
}

module.exports = async function handler(req, res) {
  applySecurityHeaders(res);
  const corsHeaders = getCorsHeaders(req);
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });

  const staff = await requireStaff(req, res, FRONT_DESK_ROLES);
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
  if (Object.keys(body).some((k) => !ALLOWED_KEYS.has(k))) {
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
      .select('id, order_number, order_status, payment_status')
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

    let query = db.from('orders').update(updates).eq('id', id);
    query = guard.value === null ? query.is(guard.column, null) : query.eq(guard.column, guard.value);
    const { data: changed, error: updateErr } = await query.select('id');

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
      await notifyTelegram(`📋 Order ${escapeHtml(ref)} is now <b>${nextStatus}</b>${byLine}`);
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[front-desk-orders] unexpected error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
};
