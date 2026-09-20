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
const { sendPush } = require('./_lib/fcm');

// Only allow these kitchen/bar status transitions
const ALLOWED_TRANSITIONS = {
  new:       ['preparing'],
  confirmed: ['preparing'],
  preparing: ['ready'],
};

const STATUS_ROLES = ['kitchen', 'bar', 'waiter', 'front_desk', 'manager'];

let _db = null;
function getDb() {
  if (_db) return _db;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _db = createClient(url, key);
  return _db;
}

module.exports = async function handler(req, res) {
  applySecurityHeaders(res);
  const corsHeaders = getCorsHeaders(req);
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });

  const staff = await requireStaff(req, res, STATUS_ROLES);
  if (!staff) return;

  const ip = getIP(req);

  const { blocked } = checkUserAgent(req);
  if (blocked) return res.status(400).json({ error: 'Bad request' });

  const { allowed } = checkCors(req);
  if (!allowed) return res.status(403).json({ error: 'Forbidden' });

  const { limited } = checkInMemoryRateLimit(ip, 'kitchen-status', 200, 60 * 60 * 1000);
  if (limited) return res.status(429).json({ error: 'Too many requests.' });

  const { orderId, status } = req.body || {};

  if (!orderId || typeof orderId !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid orderId.' });
  }
  if (!status || typeof status !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid status.' });
  }

  const db = getDb();
  if (!db) return res.status(500).json({ error: 'Database not configured.' });

  try {
    const { data: order, error: fetchErr } = await db
      .from('orders')
      .select('id, order_status')
      .eq('id', orderId)
      .single();

    if (fetchErr || !order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const allowedNext = ALLOWED_TRANSITIONS[order.order_status] || [];
    if (!allowedNext.includes(status)) {
      return res.status(400).json({
        error: `Cannot transition from '${order.order_status}' to '${status}'.`,
      });
    }

    const { error: updateErr } = await db
      .from('orders')
      .update({ order_status: status })
      .eq('id', orderId);

    if (updateErr) {
      console.error('[kitchen-status] update error:', updateErr);
      return res.status(500).json({ error: 'Failed to update order status.' });
    }

    // Push notification: when order is ready, notify all registered waiters
    if (status === 'ready') {
      try {
        const { data: tokenRows } = await db
          .from('push_tokens')
          .select('fcm_token')
          .eq('role', 'waiter');

        if (tokenRows?.length) {
          const tokens = tokenRows.map((r) => r.fcm_token);
          const label = order.table_number ? `Table ${order.table_number}` : 'an order';
          await sendPush(tokens, 'Order Ready', `${label} is ready for pickup.`, { orderId });
        }
      } catch (pushErr) {
        console.error('[kitchen-status] push error:', pushErr);
      }
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[kitchen-status] unexpected error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
};
