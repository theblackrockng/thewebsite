'use strict';

const { createClient } = require('@supabase/supabase-js');
const { sendBlackRockEmail } = require('./_lib/email');
const { enquiryReplyEmail } = require('./_lib/templates');
const {
  getIP, checkInMemoryRateLimit, isDuplicateSubmission,
  sanitizeBody, validateEmail,
  checkUserAgent, checkCors, getCorsHeaders, applySecurityHeaders, logAndAlert,
} = require('./_lib/security');

const TELEGRAM_TOKEN   = process.env.TELEGRAM_BOT_TOKEN || process.env.REACT_APP_TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID   || process.env.REACT_APP_TELEGRAM_CHAT_ID;

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
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'HTML' }),
    });
  } catch {}
}

async function notifyTelegramAndStore({ name, email, message }) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) return;

  const preview = message && message.length > 200 ? message.slice(0, 200) + '…' : (message || '—');
  const text = [
    '💬 <b>New Enquiry — BLACKROCK</b>',
    '',
    `👤 <b>${name}</b>`,
    `✉️ ${email}`,
    '',
    `📩 ${preview}`,
    '',
    '<i>Reply to this message to send a branded email reply to the guest.</i>',
  ].join('\n');

  let messageId = null;
  try {
    const resp = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'HTML' }),
    });
    const data = await resp.json();
    messageId = data?.result?.message_id ?? null;
  } catch (err) {
    console.error('[send-enquiry-reply] Telegram send error:', err.message);
    return;
  }

  if (!messageId) return;

  const db = getSupabase();
  if (!db) {
    console.error('[send-enquiry-reply] Supabase not configured — message_id not stored');
    return;
  }

  let enquiryId = null;
  try {
    const { data: enquiryRow } = await db
      .from('enquiries')
      .select('id')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    enquiryId = enquiryRow?.id ?? null;
  } catch (err) {
    console.error('[send-enquiry-reply] Enquiry lookup error:', err.message);
  }

  try {
    const { error } = await db.from('enquiry_telegram_messages').insert({
      telegram_message_id: messageId,
      enquiry_id: enquiryId,
      guest_email: email,
      guest_name: name,
    });
    if (error) console.error('[send-enquiry-reply] Insert error:', error.message);
  } catch (err) {
    console.error('[send-enquiry-reply] enquiry_telegram_messages insert error:', err.message);
  }
}

module.exports = async function handler(req, res) {
  const ip = getIP(req);
  applySecurityHeaders(res, getCorsHeaders(req));

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  // Bot check
  const ua = checkUserAgent(req);
  if (ua.blocked) {
    logAndAlert({ eventType: 'bot_detected', severity: 'medium', ip, endpoint: '/api/send-enquiry-reply', userAgent: req.headers['user-agent'] || '' }).catch(() => {});
    return res.status(200).json({ ok: true }); // silent reject
  }

  // CORS check
  const cors = checkCors(req);
  if (!cors.allowed) {
    logAndAlert({ eventType: 'suspicious_activity', severity: 'medium', ip, endpoint: '/api/send-enquiry-reply', payload: `Origin: ${cors.origin}` }).catch(() => {});
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Rate limit: 5 per hour for contact form
  const rl = checkInMemoryRateLimit(ip, 'contact', 5, 60 * 60 * 1000);
  if (rl.limited) {
    logAndAlert({ eventType: 'rate_limit', severity: rl.count > 15 ? 'high' : 'medium', ip, endpoint: '/api/send-enquiry-reply', payload: `Count: ${rl.count}` }).catch(() => {});
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  // Honeypot check
  if (req.body?._hp) {
    logAndAlert({ eventType: 'bot_detected', severity: 'medium', ip, endpoint: '/api/send-enquiry-reply', payload: `Honeypot filled: ${String(req.body._hp).slice(0, 100)}`, userAgent: req.headers['user-agent'] || '' }).catch(() => {});
    return res.status(200).json({ ok: true }); // silent
  }

  // Sanitize inputs
  const { sanitized, threat } = sanitizeBody(req.body || {}, {
    name:    100,
    email:   254,
    message: 2000,
  });

  if (threat) {
    logAndAlert({
      eventType: 'injection_attempt',
      severity: threat.type === 'sql' ? 'critical' : 'high',
      ip, endpoint: '/api/send-enquiry-reply',
      payload: `Field: ${threat.field} | Type: ${threat.type} | Value: ${threat.value}`,
      userAgent: req.headers['user-agent'],
    }).catch(() => {});
    return res.status(400).json({ error: 'Invalid input detected.' });
  }

  const { name, email, message } = sanitized;
  if (!email || !name) return res.status(400).json({ error: 'Missing required fields' });
  if (!validateEmail(email)) return res.status(400).json({ error: 'Invalid email address.' });

  // Duplicate submission check
  if (isDuplicateSubmission(ip, `${name}|${email}|${message}`)) {
    logAndAlert({ eventType: 'suspicious_activity', severity: 'low', ip, endpoint: '/api/send-enquiry-reply', payload: 'Repeated identical form submission' }).catch(() => {});
    return res.status(200).json({ ok: true }); // silent — already processed earlier submission
  }

  // Run Telegram notification and auto-reply email in parallel.
  // Both are awaited so Vercel does not terminate before the DB insert completes.
  const [, emailResult] = await Promise.allSettled([
    notifyTelegramAndStore({ name, email, message }),
    (async () => {
      const { subject, bodyHtml, guestName } = enquiryReplyEmail({ name, message });
      await sendBlackRockEmail({ to: email, subject, guestName, bodyHtml, type: 'general' });
    })(),
  ]);

  if (emailResult.status === 'rejected') {
    const msg = emailResult.reason?.message || String(emailResult.reason);
    console.error('[send-enquiry-reply] Auto-reply email failed:', msg);
    await sendTelegram(`⚠️ Auto-reply email failed for <b>${name}</b> (${email})\n<code>${msg}</code>`);
  }

  return res.status(200).json({ ok: true });
};
