'use strict';

const { createClient } = require('@supabase/supabase-js');
const { sendBlackRockEmail } = require('./email');

// ─── Supabase (service role — security ops only) ─────────────────────────────
let _db = null;
function getDb() {
  if (_db) return _db;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _db = createClient(url, key);
  return _db;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getIP(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

function toWAT(date = new Date()) {
  return date.toLocaleString('en-NG', {
    timeZone: 'Africa/Lagos',
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: true,
  }) + ' WAT';
}

// ─── In-memory rate limiter (per Vercel instance) ────────────────────────────
const _buckets = new Map();

function checkInMemoryRateLimit(ip, key, limit, windowMs) {
  try {
    const bk = `${ip}::${key}`;
    const now = Date.now();
    let b = _buckets.get(bk);
    if (!b || now - b.start >= windowMs) {
      _buckets.set(bk, { count: 1, start: now });
      return { limited: false, count: 1 };
    }
    b.count++;
    return { limited: b.count > limit, count: b.count };
  } catch {
    return { limited: false, count: 0 };
  }
}

// ─── Supabase-backed rate limiter (persistent across instances) ───────────────
// Used for login attempts — must survive cold starts.
async function checkPersistentRateLimit(ip, key, limit, windowMs) {
  try {
    const db = getDb();
    if (!db) return { limited: false, count: 0 };

    const cutoff = new Date(Date.now() - windowMs).toISOString();

    // Insert this attempt, then count total in window
    await db.from('rate_limit_buckets').insert({ ip, bucket_key: key });

    const { count } = await db
      .from('rate_limit_buckets')
      .select('*', { count: 'exact', head: true })
      .eq('ip', ip)
      .eq('bucket_key', key)
      .gte('created_at', cutoff);

    // Async cleanup — old rows beyond 2 hours, non-blocking
    db.from('rate_limit_buckets')
      .delete()
      .lt('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
      .then(() => {}).catch(() => {});

    return { limited: (count ?? 0) > limit, count: count ?? 0 };
  } catch {
    return { limited: false, count: 0 };
  }
}

// ─── Duplicate submission detection (in-memory) ──────────────────────────────
const _submissions = new Map();

function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  }
  return h.toString(36);
}

function isDuplicateSubmission(ip, content) {
  try {
    const now = Date.now();
    const WINDOW = 10 * 60 * 1000;
    const hash = simpleHash(String(content));
    let list = (_submissions.get(ip) || []).filter(s => now - s.t < WINDOW);
    const count = list.filter(s => s.h === hash).length;
    list.push({ h: hash, t: now });
    _submissions.set(ip, list.slice(-20));
    return count >= 3;
  } catch {
    return false;
  }
}

// ─── Input sanitization ──────────────────────────────────────────────────────
const SQL_PATTERNS = [
  /\bUNION\b.{0,20}\bSELECT\b/i,
  /\bDROP\b\s+\bTABLE\b/i,
  /\bDELETE\b\s+\bFROM\b/i,
  /\bINSERT\b\s+\bINTO\b/i,
  /\bSELECT\b.{0,20}\bFROM\b/i,
  /\bUPDATE\b.{0,20}\bSET\b/i,
  /\bEXEC(\s|\()/i,
  /\bxp_\w+/i,
  /('|(''))\s*(OR|AND)\s*('|('')|\d)/i,
  /;\s*(DROP|DELETE|INSERT|UPDATE|CREATE|ALTER|TRUNCATE)\b/i,
];

const XSS_PATTERNS = [
  /<script[\s\S]*?>/i,
  /javascript\s*:/i,
  /on\w+\s*=/i,
  /<\s*iframe/i,
  /<\s*object/i,
  /<\s*embed/i,
  /data\s*:\s*text\/html/i,
  /vbscript\s*:/i,
];

function detectSQLInjection(v) { return SQL_PATTERNS.some(p => p.test(v)); }
function detectXSS(v) { return XSS_PATTERNS.some(p => p.test(v)); }
function stripHtml(v) { return String(v).replace(/<[^>]*>/g, '').trim(); }

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,253}\.[^\s@]{2,}$/;
// Nigerian numbers: +234XXXXXXXXXX or 0XXXXXXXXXX
const PHONE_RE = /^(\+?234|0)[789]\d{9}$/;

function validateEmail(email) { return EMAIL_RE.test(String(email)); }
function validatePhone(phone) {
  if (!phone) return true;
  return PHONE_RE.test(String(phone).replace(/[\s\-().]/g, ''));
}

// Returns { clean, threat } — threat is null or { type: 'xss'|'sql', value }
function sanitizeField(value, maxLen) {
  if (value === undefined || value === null) return { clean: '', threat: null };
  const str = String(value);
  if (detectXSS(str)) return { clean: null, threat: { type: 'xss', value: str.slice(0, 500) } };
  if (detectSQLInjection(str)) return { clean: null, threat: { type: 'sql', value: str.slice(0, 500) } };
  return { clean: stripHtml(str).slice(0, maxLen), threat: null };
}

// fieldDefs: { fieldName: maxLen }
// Returns { sanitized, threat } — threat is null or { field, type, value }
function sanitizeBody(body, fieldDefs) {
  const sanitized = {};
  for (const [field, maxLen] of Object.entries(fieldDefs)) {
    const raw = body[field];
    if (raw === undefined) { sanitized[field] = undefined; continue; }
    const { clean, threat } = sanitizeField(raw, maxLen);
    if (threat) return { sanitized: null, threat: { field, ...threat } };
    sanitized[field] = clean;
  }
  return { sanitized, threat: null };
}

// ─── Bot detection ────────────────────────────────────────────────────────────
function checkUserAgent(req) {
  const ua = req.headers['user-agent'];
  if (!ua || !ua.trim()) return { blocked: true, reason: 'Missing User-Agent' };
  return { blocked: false };
}

// ─── CORS ─────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = new Set([
  'https://blackrockrestaurantng.com',
  'https://www.blackrockrestaurantng.com',
  'http://localhost:3000',
  'http://localhost:5173',
]);

function checkCors(req) {
  const origin = req.headers['origin'];
  if (!origin) return { allowed: true };
  return { allowed: ALLOWED_ORIGINS.has(origin), origin };
}

function getCorsHeaders(req) {
  const origin = req.headers['origin'];
  const allowedOrigin = ALLOWED_ORIGINS.has(origin)
    ? origin
    : 'https://blackrockrestaurantng.com';
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

// ─── Security headers ─────────────────────────────────────────────────────────
const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "connect-src 'self' https://*.supabase.co https://api.telegram.org",
  ].join('; '),
};

function applySecurityHeaders(res, extra = {}) {
  Object.entries({ ...SECURITY_HEADERS, ...extra }).forEach(([k, v]) => res.setHeader(k, v));
}

// ─── Alerting ────────────────────────────────────────────────────────────────
const ALERT_TO = 'info@blackrockrestaurantng.com';
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.REACT_APP_TELEGRAM_BOT_TOKEN;
const TG_CHAT  = process.env.TELEGRAM_CHAT_ID   || process.env.REACT_APP_TELEGRAM_CHAT_ID;

async function sendTelegramAlert(text) {
  if (!TG_TOKEN || !TG_CHAT) return;
  try {
    await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_CHAT, text, parse_mode: 'HTML' }),
    });
  } catch {}
}

const SEVERITY_COLOR = {
  critical: '#dc2626', high: '#ef4444', medium: '#d97706', low: '#6b7280',
};
const SEVERITY_BG = {
  critical: 'rgba(220,38,38,0.07)', high: 'rgba(239,68,68,0.06)',
  medium: 'rgba(217,119,6,0.06)', low: 'rgba(107,114,128,0.06)',
};
const SEVERITY_REC = {
  low:      'No action needed.',
  medium:   'Monitor this IP for further activity.',
  high:     'Consider blocking this IP.',
  critical: 'Investigate immediately.',
};
const EVENT_LABELS = {
  rate_limit:          'Rate Limit Exceeded',
  login_failed:        'Failed Login Attempt',
  injection_attempt:   'Injection Attempt Detected',
  bot_detected:        'Bot Detected',
  brute_force:         'Brute Force Attack',
  suspicious_activity: 'Suspicious Activity',
  ip_blocked:          'IP Blocked',
};

async function logAndAlert({ eventType, severity, ip, endpoint, payload, userAgent }) {
  const db = getDb();
  const timestamp = toWAT();
  const recommendation = SEVERITY_REC[severity] || 'Monitor activity.';
  const label = EVENT_LABELS[eventType] || eventType;
  const color = SEVERITY_COLOR[severity] || '#6b7280';
  const bg    = SEVERITY_BG[severity]    || 'rgba(107,114,128,0.06)';

  // 1. Log to Supabase first (always, even if email fails)
  if (db) {
    try {
      await db.from('security_logs').insert({
        event_type:  eventType,
        severity,
        ip_address:  ip    || null,
        endpoint:    endpoint || null,
        payload:     payload  ? String(payload).slice(0, 1000) : null,
        user_agent:  userAgent ? String(userAgent).slice(0, 500) : null,
      });
    } catch (err) {
      console.error('[security] log insert failed:', err.message);
    }
  }

  // 2. Alert email (all severity levels)
  try {
    const safePayload = payload
      ? String(payload).slice(0, 500)
          .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      : null;

    const bodyHtml = `
      <div style="margin:0 0 20px;padding:14px 16px;border-left:4px solid ${color};background:${bg};border-radius:0 6px 6px 0;">
        <p style="margin:0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${color};font-family:Arial,sans-serif;">${severity.toUpperCase()} SEVERITY</p>
        <p style="margin:8px 0 0;font-size:18px;font-weight:bold;color:#1a1a1a;font-family:Georgia,serif;">${label}</p>
      </div>
      <table width="100%" style="border-collapse:collapse;margin:0 0 20px;">
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #e5e0d8;color:#888;font-size:11px;letter-spacing:2px;text-transform:uppercase;width:130px;vertical-align:top;">Timestamp</td>
          <td style="padding:10px 0;border-bottom:1px solid #e5e0d8;color:#1a1a1a;font-size:14px;">${timestamp}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #e5e0d8;color:#888;font-size:11px;letter-spacing:2px;text-transform:uppercase;vertical-align:top;">IP Address</td>
          <td style="padding:10px 0;border-bottom:1px solid #e5e0d8;color:#1a1a1a;font-size:14px;font-family:monospace;">${ip || '—'}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #e5e0d8;color:#888;font-size:11px;letter-spacing:2px;text-transform:uppercase;vertical-align:top;">Endpoint</td>
          <td style="padding:10px 0;border-bottom:1px solid #e5e0d8;color:#1a1a1a;font-size:14px;font-family:monospace;">${endpoint || '—'}</td>
        </tr>
        ${safePayload ? `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #e5e0d8;color:#888;font-size:11px;letter-spacing:2px;text-transform:uppercase;vertical-align:top;">Payload</td>
          <td style="padding:10px 0;border-bottom:1px solid #e5e0d8;color:#333;font-size:13px;font-family:monospace;word-break:break-all;">${safePayload}</td>
        </tr>` : ''}
      </table>
      <div style="padding:14px 16px;border-radius:6px;background:#f9f6f1;border:1px solid #e5e0d8;">
        <p style="margin:0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#c8a96e;font-family:Arial,sans-serif;">Recommended Action</p>
        <p style="margin:8px 0 0;color:#333;font-size:14px;line-height:1.6;">${recommendation}</p>
      </div>
    `;
    await sendBlackRockEmail({
      to: ALERT_TO,
      subject: `🚨 BLACKROCK Security Alert: ${label}`,
      guestName: 'Security Team',
      bodyHtml,
      type: 'general',
    });
  } catch (err) {
    console.error('[security] alert email failed:', err.message);
  }

  // 3. Telegram alert for HIGH and CRITICAL only
  if (severity === 'high' || severity === 'critical') {
    const tgText = [
      `🚨 <b>SECURITY ALERT — ${severity.toUpperCase()}</b>`,
      `Event: ${label}`,
      `IP: <code>${ip || 'unknown'}</code>`,
      `Target: ${endpoint || '—'}`,
      `Time: ${timestamp}`,
      `Action: ${recommendation}`,
    ].join('\n');
    sendTelegramAlert(tgText).catch(() => {});
  }
}

module.exports = {
  getIP,
  toWAT,
  checkInMemoryRateLimit,
  checkPersistentRateLimit,
  isDuplicateSubmission,
  sanitizeBody,
  sanitizeField,
  validateEmail,
  validatePhone,
  checkUserAgent,
  checkCors,
  getCorsHeaders,
  applySecurityHeaders,
  logAndAlert,
  SECURITY_HEADERS,
};
