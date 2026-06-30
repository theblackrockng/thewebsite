'use strict';

const { createClient } = require('@supabase/supabase-js');
const {
  getIP,
  checkInMemoryRateLimit,
  sanitizeBody,
  validateEmail,
  validatePhone,
  checkUserAgent,
  checkCors,
  getCorsHeaders,
  applySecurityHeaders,
  logAndAlert,
} = require('./_lib/security');
const { sendBlackRockEmail } = require('./_lib/email');
const { orderConfirmationEmail } = require('./_lib/templates');

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

async function sendTelegram(text, replyMarkup) {
  if (!TOKEN || !CHAT_ID) return null;
  try {
    const body = { chat_id: CHAT_ID, text, parse_mode: 'HTML' };
    if (replyMarkup) body.reply_markup = replyMarkup;
    const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return data?.result?.message_id || null;
  } catch (err) {
    console.error('[orders] Telegram error:', err);
    return null;
  }
}

function generateOrderNumber(id) {
  const year = new Date().getFullYear();
  const suffix = id.replace(/-/g, '').slice(0, 4).toUpperCase();
  return `BR-${year}-${suffix}`;
}

function fmtScheduledTime(iso) {
  if (!iso) return 'ASAP';
  try {
    return new Date(iso).toLocaleString('en-NG', {
      weekday: 'short', day: 'numeric', month: 'short',
      hour: '2-digit', minute: '2-digit', hour12: true,
      timeZone: 'Africa/Lagos',
    });
  } catch { return iso; }
}

module.exports = async function handler(req, res) {
  applySecurityHeaders(res);
  const corsHeaders = getCorsHeaders(req);
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = getIP(req);

  // Bot check
  const { blocked } = checkUserAgent(req);
  if (blocked) {
    return res.status(400).json({ error: 'Bad request' });
  }

  // CORS check
  const { allowed } = checkCors(req);
  if (!allowed) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Rate limit: 20 orders per hour per IP
  const { limited } = checkInMemoryRateLimit(ip, 'orders', 20, 60 * 60 * 1000);
  if (limited) {
    await logAndAlert({
      eventType: 'rate_limit',
      severity: 'medium',
      ip,
      endpoint: '/api/orders',
      userAgent: req.headers['user-agent'],
    });
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  const body = req.body || {};

  // Sanitize text fields
  const { sanitized, threat } = sanitizeBody(body, {
    guestName: 100,
    guestPhone: 20,
    guestEmail: 254,
    specialInstructions: 1000,
    deliveryAddress: 300,
  });

  if (threat) {
    await logAndAlert({
      eventType: 'injection_attempt',
      severity: 'high',
      ip,
      endpoint: '/api/orders',
      payload: `field=${threat.field} type=${threat.type}`,
      userAgent: req.headers['user-agent'],
    });
    return res.status(400).json({ error: 'Invalid input detected.' });
  }

  const { guestName, guestPhone, guestEmail, specialInstructions, deliveryAddress } = sanitized;
  const { orderType, scheduledTime, paymentMethod, items } = body;

  // Validate required fields
  if (!guestName || !guestName.trim()) {
    return res.status(400).json({ error: 'Name is required.' });
  }
  if (!guestPhone || !guestPhone.trim()) {
    return res.status(400).json({ error: 'Phone number is required.' });
  }
  if (!['pickup', 'delivery'].includes(orderType)) {
    return res.status(400).json({ error: 'Invalid order type.' });
  }
  if (orderType === 'delivery' && (!deliveryAddress || !deliveryAddress.trim())) {
    return res.status(400).json({ error: 'Delivery address is required.' });
  }
  if (guestEmail && !validateEmail(guestEmail)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  // Validate items
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'At least one item is required.' });
  }
  if (items.length > 50) {
    return res.status(400).json({ error: 'Too many items in a single order.' });
  }
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item || typeof item !== 'object') return res.status(400).json({ error: `Invalid item at index ${i}.` });
    if (!item.id || typeof item.id !== 'string') return res.status(400).json({ error: `Item ${i} missing id.` });
    if (!item.name || typeof item.name !== 'string') return res.status(400).json({ error: `Item ${i} missing name.` });
    if (typeof item.price !== 'number' || item.price < 0) return res.status(400).json({ error: `Item ${i} has invalid price.` });
    if (!Number.isInteger(item.qty) || item.qty < 1) return res.status(400).json({ error: `Item ${i} has invalid quantity.` });
  }

  const db = getSupabase();
  if (!db) {
    return res.status(500).json({ error: 'Database not configured.' });
  }

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const deliveryFee = orderType === 'delivery' ? 1500 : 0;
  const total = subtotal + deliveryFee;

  // Validate scheduled time if provided
  let scheduledTimeISO = null;
  if (scheduledTime) {
    try {
      scheduledTimeISO = new Date(scheduledTime).toISOString();
    } catch {
      return res.status(400).json({ error: 'Invalid scheduled time.' });
    }
  }

  try {
    // Insert order
    const { data: orderRow, error: orderErr } = await db
      .from('orders')
      .insert({
        guest_name: guestName.trim(),
        guest_phone: guestPhone.trim(),
        guest_email: guestEmail ? guestEmail.trim() : null,
        order_type: orderType,
        delivery_address: orderType === 'delivery' ? deliveryAddress.trim() : null,
        special_instructions: specialInstructions ? specialInstructions.trim() : null,
        scheduled_time: scheduledTimeISO,
        payment_method: paymentMethod || 'pay_on_arrival',
        payment_status: 'pay_on_arrival',
        order_status: 'new',
        subtotal,
        delivery_fee: deliveryFee,
        total,
        ip_address: ip,
      })
      .select()
      .single();

    if (orderErr || !orderRow) {
      console.error('[orders] Insert error:', orderErr);
      return res.status(500).json({ error: 'Failed to create order.' });
    }

    const orderId = orderRow.id;
    const orderNumber = generateOrderNumber(orderId);

    // Update with order number
    await db.from('orders').update({ order_number: orderNumber }).eq('id', orderId);

    // Insert order items
    const orderItemsRows = items.map((item) => ({
      order_id: orderId,
      item_id: item.id,
      item_name: item.name,
      unit_price: item.price,
      qty: item.qty,
      line_total: item.price * item.qty,
    }));

    const { error: itemsErr } = await db.from('order_items').insert(orderItemsRows);
    if (itemsErr) {
      console.error('[orders] Order items insert error:', itemsErr);
    }

    // Telegram notification (fire-and-forget in background, but await for main flow)
    const itemsText = items
      .map((i) => `  ${i.qty}× ${i.name} — ₦${(i.price * i.qty).toLocaleString('en-NG')}`)
      .join('\n');

    const telegramText = [
      `🛒 <b>New Order — ${orderNumber}</b>`,
      ``,
      `👤 <b>${guestName.trim()}</b> — ${guestPhone.trim()}`,
      orderType === 'delivery'
        ? `🚚 Delivery to ${deliveryAddress ? deliveryAddress.trim() : 'Address not provided'}`
        : `📦 Pickup — 11 Ajao Road, Ikeja`,
      `💳 ${(paymentMethod === 'pay_on_arrival' || !paymentMethod) ? 'Pay on Arrival' : 'Paid Online'}`,
      ``,
      `Items:`,
      itemsText,
      ``,
      `Total: ₦${total.toLocaleString('en-NG')}`,
      scheduledTimeISO ? `Scheduled: ${fmtScheduledTime(scheduledTimeISO)}` : `Scheduled: ASAP`,
      specialInstructions ? `\nNote: ${specialInstructions.trim()}` : '',
    ].filter((l) => l !== null).join('\n');

    const replyMarkup = {
      inline_keyboard: [[
        { text: '✓ Confirm Order', callback_data: `order_confirm:${orderId}` },
        { text: '📋 Console', url: 'https://console.blackrockrestaurantng.com/orders' },
      ]],
    };

    sendTelegram(telegramText, replyMarkup).catch(() => {});

    // Email confirmation (fire-and-forget)
    if (guestEmail && guestEmail.trim()) {
      try {
        const { subject, bodyHtml, guestName: emailName } = orderConfirmationEmail({
          guestName: guestName.trim(),
          orderNumber,
          orderType,
          deliveryAddress: orderType === 'delivery' ? deliveryAddress.trim() : null,
          items: items.map((i) => ({ name: i.name, qty: i.qty, unit_price: i.price, price: i.price })),
          subtotal,
          deliveryFee,
          total,
          paymentMethod: paymentMethod || 'pay_on_arrival',
          scheduledTime: scheduledTimeISO,
        });

        sendBlackRockEmail({
          to: guestEmail.trim(),
          subject,
          guestName: emailName,
          bodyHtml,
          type: 'order',
          ctaText: 'Track Your Order',
          ctaUrl: `https://blackrockrestaurantng.com/order-confirmation/${orderId}`,
        }).catch((err) => {
          console.error('[orders] Email send error:', err);
        });
      } catch (emailErr) {
        console.error('[orders] Email template error:', emailErr);
      }
    }

    return res.status(200).json({ ok: true, orderId, orderNumber });
  } catch (err) {
    console.error('[orders] Unexpected error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
};
