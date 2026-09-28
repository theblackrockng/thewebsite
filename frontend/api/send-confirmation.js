'use strict';

const { createClient } = require('@supabase/supabase-js');
const { sendBlackRockEmail } = require('./_lib/email');
const { confirmationEmail } = require('./_lib/templates');
const {
  getIP, checkInMemoryRateLimit, sanitizeBody, validateEmail, validatePhone,
  checkUserAgent, checkCors, getCorsHeaders, applySecurityHeaders, logAndAlert,
} = require('./_lib/security');

const TELEGRAM_TOKEN   = process.env.TELEGRAM_BOT_TOKEN || process.env.REACT_APP_TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID   || process.env.REACT_APP_TELEGRAM_CHAT_ID;

let _db = null;
function getDb() {
  if (_db) return _db;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _db = createClient(url, key);
  return _db;
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function sendTelegram(text, replyMarkup) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    const payload = { chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'HTML' };
    if (replyMarkup) payload.reply_markup = replyMarkup;
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {}
}

module.exports = async function handler(req, res) {
  const ip = getIP(req);
  applySecurityHeaders(res, getCorsHeaders(req));

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  // Bot check
  const ua = checkUserAgent(req);
  if (ua.blocked) {
    logAndAlert({ eventType: 'bot_detected', severity: 'medium', ip, endpoint: '/api/send-confirmation', userAgent: req.headers['user-agent'] || '' }).catch(() => {});
    return res.status(200).json({ ok: true }); // silent reject
  }

  // CORS check
  const cors = checkCors(req);
  if (!cors.allowed) {
    logAndAlert({ eventType: 'suspicious_activity', severity: 'medium', ip, endpoint: '/api/send-confirmation', payload: `Origin: ${cors.origin}` }).catch(() => {});
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Rate limit: 10 per hour for reservations
  const rl = checkInMemoryRateLimit(ip, 'reservation', 10, 60 * 60 * 1000);
  if (rl.limited) {
    logAndAlert({ eventType: 'rate_limit', severity: rl.count > 20 ? 'high' : 'medium', ip, endpoint: '/api/send-confirmation', payload: `Count: ${rl.count}` }).catch(() => {});
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  // Phone raw-length pre-check — reject before sanitization so we don't silently truncate
  const rawPhone = String(req.body?.phone || '');
  if (rawPhone && rawPhone.length > 20) {
    return res.status(400).json({ error: 'Phone number exceeds 20 characters.' });
  }

  // Honeypot check — bots fill this, humans don't
  if (req.body?._hp) {
    logAndAlert({ eventType: 'bot_detected', severity: 'medium', ip, endpoint: '/api/send-confirmation', payload: `Honeypot filled: ${String(req.body._hp).slice(0, 100)}`, userAgent: req.headers['user-agent'] || '' }).catch(() => {});
    return res.status(200).json({ ok: true }); // silent
  }

  // Sanitize inputs — all fields go through injection/XSS/allowlist checks
  const { sanitized, threat } = sanitizeBody(req.body || {}, {
    name:     100,
    email:    254,
    phone:    20,
    occasion: 100,
    notes:    2000,
    date:     20,
    time:     20,
    party:    10,
  });

  if (threat) {
    const isCritical = threat.type === 'sql';
    logAndAlert({
      eventType: 'injection_attempt',
      severity: isCritical ? 'critical' : 'high',
      ip, endpoint: '/api/send-confirmation',
      payload: `Field: ${threat.field} | Type: ${threat.type} | Value: ${threat.value}`,
      userAgent: req.headers['user-agent'],
    }).catch(() => {});
    return res.status(400).json({ error: 'Invalid input detected.' });
  }

  const { name, email, phone, date, time, party, occasion, notes } = sanitized;
  const preSelectedMeals = Array.isArray(req.body?.preSelectedMeals) ? req.body.preSelectedMeals : [];
  const mealPaymentChoice = typeof req.body?.mealPaymentChoice === 'string' ? req.body.mealPaymentChoice : null;
  const mealPaymentStatus = typeof req.body?.mealPaymentStatus === 'string' ? req.body.mealPaymentStatus : null;
  const mealPaymentAmount = Number.isInteger(req.body?.mealPaymentAmount) ? req.body.mealPaymentAmount : null;

  if (!name || !email) return res.status(400).json({ error: 'Missing required fields' });
  if (name.trim().length < 2) return res.status(400).json({ error: 'Name must be at least 2 characters.' });
  if (!validateEmail(email)) return res.status(400).json({ error: 'Invalid email address.' });
  if (phone && !validatePhone(phone)) return res.status(400).json({ error: 'Invalid phone number.' });

  // Insert reservation into Supabase server-side (after sanitization)
  const db = getDb();
  if (!db) {
    console.error('[send-confirmation] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured');
    return res.status(500).json({ error: 'Service configuration error.' });
  }

  let reservationId = null;
  try {
    const hasMeals = preSelectedMeals.length > 0;
    const basePayload = {
      name,
      email,
      phone: phone || null,
      date,
      time,
      party: String(party),
      occasion,
      notes: notes || null,
      status: 'pending',
      pre_selected_meals: hasMeals ? preSelectedMeals : null,
    };

    const fullPayload = {
      ...basePayload,
      meal_payment_choice: mealPaymentChoice,
      meal_payment_status: mealPaymentStatus,
      meal_payment_amount: mealPaymentAmount,
    };

    let inserted, insertErr;
    ({ data: inserted, error: insertErr } = await db.from('reservations').insert(fullPayload).select('id').single());

    if (insertErr && (insertErr.code === '42703' || insertErr.message?.includes('column'))) {
      ({ data: inserted, error: insertErr } = await db.from('reservations').insert(basePayload).select('id').single());
    }

    if (insertErr) {
      console.error('[send-confirmation] Supabase insert error:', insertErr.message);
      return res.status(500).json({ error: 'Failed to save reservation. Please try again.' });
    }
    reservationId = inserted?.id ?? null;
  } catch (err) {
    console.error('[send-confirmation] Supabase insert exception:', err.message);
    return res.status(500).json({ error: 'Failed to save reservation. Please try again.' });
  }

  // Send Telegram notification with action keyboard (server-side)
  try {
    const dateStr = date
      ? new Date(date + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : '—';
    const hasMeals = preSelectedMeals.length > 0;
    const mealsLines = hasMeals
      ? [
          '\n🍽️ Pre-selected meals:',
          ...preSelectedMeals.map((m) => `  ${m.qty}× ${escapeHtml(String(m.name || ''))}${m.modifier ? ` (${escapeHtml(String(m.modifier))})` : ''}`),
          mealPaymentChoice === 'deposit_70' ? `💳 Deposit (70%) — awaiting proof` :
          mealPaymentChoice === 'pay_full'   ? `💳 Full payment — awaiting proof` :
          mealPaymentChoice === 'preference_only' ? `📋 Preferences only — no payment` : null,
        ].filter(Boolean)
      : [];

    const tgText = [
      '🍽 <b>New Reservation — BLACKROCK</b>',
      '',
      `👤 <b>${escapeHtml(name)}</b>`,
      `📅 ${escapeHtml(dateStr)} at ${escapeHtml(time || '—')}`,
      `👥 Party of ${escapeHtml(String(party || '—'))}`,
      occasion ? `🎉 ${escapeHtml(occasion)}` : null,
      '',
      phone ? `📞 ${escapeHtml(phone)}` : null,
      email ? `✉️ ${escapeHtml(email)}` : null,
      notes ? `\n📝 ${escapeHtml(notes)}` : null,
      ...mealsLines,
    ].filter((l) => l !== null).join('\n');

    const actionKeyboard = reservationId ? {
      inline_keyboard: [[
        { text: '✓ Confirm',     callback_data: `confirm:${reservationId}` },
        { text: '📅 Reschedule', callback_data: `reschedule:${reservationId}` },
        { text: '✗ Cancel',      callback_data: `cancel:${reservationId}` },
        { text: '✉️ Email',      callback_data: `email:${reservationId}` },
      ]],
    } : null;

    sendTelegram(tgText, actionKeyboard).catch(() => {});
  } catch {}

  // Send confirmation email to guest
  try {
    const { subject, bodyHtml, guestName } = confirmationEmail({ name, date, time, party: Number(party) || 2, occasion, notes, preSelectedMeals });
    await sendBlackRockEmail({ to: email, subject, guestName, bodyHtml, type: 'reservation', ctaText: 'View Reservations', ctaUrl: 'https://blackrockrestaurantng.com/reservations' });
    return res.status(200).json({ ok: true, id: reservationId });
  } catch (err) {
    console.error('[send-confirmation]', err);
    return res.status(500).json({ error: err.message });
  }
};
