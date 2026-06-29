'use strict';

const { sendBlackRockEmail } = require('./_lib/email');
const { confirmationEmail } = require('./_lib/templates');
const {
  getIP, checkInMemoryRateLimit, sanitizeBody, validateEmail, validatePhone,
  checkUserAgent, checkCors, getCorsHeaders, applySecurityHeaders, logAndAlert,
} = require('./_lib/security');

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

  // Honeypot check — bots fill this, humans don't
  if (req.body?._hp) {
    logAndAlert({ eventType: 'bot_detected', severity: 'medium', ip, endpoint: '/api/send-confirmation', payload: `Honeypot filled: ${String(req.body._hp).slice(0, 100)}`, userAgent: req.headers['user-agent'] || '' }).catch(() => {});
    return res.status(200).json({ ok: true }); // silent
  }

  // Sanitize inputs
  const { sanitized, threat } = sanitizeBody(req.body || {}, {
    name:     100,
    email:    254,
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

  const { name, email, date, time, party, occasion, notes } = sanitized;
  const preSelectedMeals = Array.isArray(req.body?.preSelectedMeals) ? req.body.preSelectedMeals : [];

  if (!email || !name) return res.status(400).json({ error: 'Missing required fields' });
  if (!validateEmail(email)) return res.status(400).json({ error: 'Invalid email address.' });

  try {
    const { subject, bodyHtml, guestName } = confirmationEmail({ name, date, time, party: Number(party) || 2, occasion, notes, preSelectedMeals });
    await sendBlackRockEmail({ to: email, subject, guestName, bodyHtml, type: 'reservation', ctaText: 'View Reservations', ctaUrl: 'https://blackrockrestaurantng.com/reservations' });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[send-confirmation]', err);
    return res.status(500).json({ error: err.message });
  }
};
