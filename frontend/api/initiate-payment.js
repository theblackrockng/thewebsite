'use strict';

const { createClient } = require('@supabase/supabase-js');
const {
  getIP,
  checkInMemoryRateLimit,
  checkUserAgent,
  checkCors,
  getCorsHeaders,
  applySecurityHeaders,
} = require('./_lib/security');
const { provider } = require('./_lib/payments/provider');

let _supabase = null;
function getSupabase() {
  if (_supabase) return _supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _supabase = createClient(url, key);
  return _supabase;
}

module.exports = async function handler(req, res) {
  applySecurityHeaders(res);
  const corsHeaders = getCorsHeaders(req);
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getIP(req);

  const { blocked } = checkUserAgent(req);
  if (blocked) return res.status(400).json({ error: 'Bad request' });

  const { allowed } = checkCors(req);
  if (!allowed) return res.status(403).json({ error: 'Forbidden' });

  const { limited } = checkInMemoryRateLimit(ip, 'initiate-payment', 10, 60 * 60 * 1000);
  if (limited) return res.status(429).json({ error: 'Too many requests.' });

  const { orderId, email } = req.body || {};
  if (!orderId) return res.status(400).json({ error: 'orderId is required.' });
  if (!email) return res.status(400).json({ error: 'email is required.' });

  const db = getSupabase();
  if (!db) return res.status(500).json({ error: 'Database not configured.' });

  const { data: order, error: orderErr } = await db
    .from('orders')
    .select('id, total, payment_status, order_status')
    .eq('id', orderId)
    .single();

  if (orderErr || !order) return res.status(404).json({ error: 'Order not found.' });
  if (order.payment_status === 'paid') return res.status(400).json({ error: 'Order already paid.' });
  if (order.order_status === 'cancelled') return res.status(400).json({ error: 'Order is cancelled.' });

  const result = await provider.initiatePayment({
    amount: order.total,
    email,
    orderId: order.id,
    metadata: { orderId: order.id },
  });

  if (!result.success) {
    return res.status(502).json({ error: result.error || 'Payment initiation failed.' });
  }

  return res.status(200).json({ ok: true, paymentUrl: result.paymentUrl, reference: result.reference });
};
