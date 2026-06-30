'use strict';

const { createClient } = require('@supabase/supabase-js');
const { applySecurityHeaders } = require('./_lib/security');
const { provider, activeProvider } = require('./_lib/payments/provider');
const { sendBlackRockEmail } = require('./_lib/email');

const TOKEN   = process.env.TELEGRAM_BOT_TOKEN   || process.env.REACT_APP_TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID     || process.env.REACT_APP_TELEGRAM_CHAT_ID;

let _supabase = null;
function getSupabase() {
  if (_supabase) return _supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _supabase = createClient(url, key);
  return _supabase;
}

async function sendTelegram(text) {
  if (!TOKEN || !CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'HTML' }),
    });
  } catch {}
}

function verifyPaystackSignature(req) {
  const crypto = require('crypto');
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return false;
  const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(req.body)).digest('hex');
  return hash === req.headers['x-paystack-signature'];
}

function verifyFlutterwaveSignature(req) {
  const hash = req.headers['verif-hash'];
  const secret = process.env.FLUTTERWAVE_SECRET_HASH;
  if (!secret || !hash) return false;
  return hash === secret;
}

module.exports = async function handler(req, res) {
  applySecurityHeaders(res);

  if (req.method !== 'POST') return res.status(200).end();

  // Verify signature based on provider
  let reference = null;
  let eventType = null;

  if (activeProvider === 'paystack') {
    if (!verifyPaystackSignature(req)) {
      console.warn('[payment-webhook] Invalid Paystack signature');
      return res.status(200).json({ ok: false });
    }
    const event = req.body;
    if (event.event !== 'charge.success') return res.status(200).json({ ok: true });
    reference = event.data?.reference;
    eventType = event.event;
  } else if (activeProvider === 'flutterwave') {
    if (!verifyFlutterwaveSignature(req)) {
      console.warn('[payment-webhook] Invalid Flutterwave signature');
      return res.status(200).json({ ok: false });
    }
    const event = req.body;
    if (event.event !== 'charge.completed') return res.status(200).json({ ok: true });
    reference = event.data?.tx_ref;
    eventType = event.event;
  } else {
    // No payment provider configured
    return res.status(200).json({ ok: true });
  }

  if (!reference) return res.status(200).json({ ok: false, error: 'No reference' });

  // Verify payment with provider
  const verification = await provider.verifyPayment({ reference });
  if (!verification.success) {
    console.error('[payment-webhook] Verification failed:', verification.error);
    return res.status(200).json({ ok: false });
  }

  const db = getSupabase();
  if (!db) return res.status(200).json({ ok: false, error: 'DB not configured' });

  // Find order by reference in metadata or order id embedded in reference
  // References are formatted as: BR-{orderId}-{timestamp}
  const parts = reference.split('-');
  // Try extracting order ID prefix from reference
  // Format: BR-{year}-{idPrefix} for order number OR BR-{uuid}-{timestamp} for payment ref
  // Payment ref format: BR-{orderId}-{timestamp}
  let orderId = null;
  if (parts.length >= 3) {
    // Try the second segment as a UUID fragment, search by order_number or partial match
    // For Paystack: BR-{orderId}-{timestamp} → orderId is parts[1]
    // But UUID has dashes, so we need a different approach
    // Search by reference stored in payments or look up metadata
    orderId = parts.slice(1, -1).join('-');
  }

  if (!orderId) return res.status(200).json({ ok: false, error: 'Cannot parse orderId from reference' });

  const { data: order, error: orderErr } = await db
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (orderErr || !order) {
    console.error('[payment-webhook] Order not found for reference:', reference);
    return res.status(200).json({ ok: false });
  }

  // Update payment status
  const { error: updateErr } = await db
    .from('orders')
    .update({ payment_status: 'paid' })
    .eq('id', orderId);

  if (updateErr) {
    console.error('[payment-webhook] Failed to update payment status:', updateErr);
    return res.status(200).json({ ok: false });
  }

  // Telegram notification
  sendTelegram(
    `💰 <b>Payment Received</b>\n\nOrder: <b>${order.order_number || orderId}</b>\nGuest: ${order.guest_name}\nAmount: ₦${(order.total || 0).toLocaleString('en-NG')}\nRef: ${reference}`
  ).catch(() => {});

  // Email confirmation
  if (order.guest_email) {
    sendBlackRockEmail({
      to: order.guest_email,
      subject: `Payment confirmed — ${order.order_number || 'Your order'}`,
      guestName: order.guest_name,
      bodyHtml: `<p style="margin:0 0 20px;color:#1a1a1a;">We've received your payment of <strong>₦${(order.total || 0).toLocaleString('en-NG')}</strong> for order <strong>${order.order_number || orderId}</strong>. Your order is now being prepared.</p>`,
      type: 'order',
    }).catch(() => {});
  }

  return res.status(200).json({ ok: true });
};
