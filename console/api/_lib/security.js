import { createClient } from '@supabase/supabase-js';
import { sendBlackRockEmail } from './email.js';

// ─── Supabase ────────────────────────────────────────────────────────────────
let _db = null;
function getDb() {
  if (_db) return _db;
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _db = createClient(url, key);
  return _db;
}

export function getIP(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

export function toWAT(date = new Date()) {
  return date.toLocaleString('en-NG', {
    timeZone: 'Africa/Lagos',
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: true,
  }) + ' WAT';
}

// ─── Supabase-backed rate limiter ─────────────────────────────────────────────
export async function checkPersistentRateLimit(ip, key, limit, windowMs) {
  try {
    const db = getDb();
    if (!db) return { limited: false, count: 0 };

    const cutoff = new Date(Date.now() - windowMs).toISOString();
    await db.from('rate_limit_buckets').insert({ ip, bucket_key: key });
    const { count } = await db
      .from('rate_limit_buckets')
      .select('*', { count: 'exact', head: true })
      .eq('ip', ip).eq('bucket_key', key)
      .gte('created_at', cutoff);

    db.from('rate_limit_buckets')
      .delete()
      .lt('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
      .then(() => {}).catch(() => {});

    return { limited: (count ?? 0) > limit, count: count ?? 0 };
  } catch {
    return { limited: false, count: 0 };
  }
}

// ─── Security headers ─────────────────────────────────────────────────────────
export const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

export function applySecurityHeaders(res, extra = {}) {
  Object.entries({ ...SECURITY_HEADERS, ...extra }).forEach(([k, v]) => res.setHeader(k, v));
}

// ─── Alerting ────────────────────────────────────────────────────────────────
const ALERT_TO = 'info@blackrockrestaurantng.com';
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHAT  = process.env.TELEGRAM_CHAT_ID;

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

const SEVERITY_COLOR = { critical: '#dc2626', high: '#ef4444', medium: '#d97706', low: '#6b7280' };
const SEVERITY_BG    = { critical: 'rgba(220,38,38,0.07)', high: 'rgba(239,68,68,0.06)', medium: 'rgba(217,119,6,0.06)', low: 'rgba(107,114,128,0.06)' };
const SEVERITY_REC   = { low: 'No action needed.', medium: 'Monitor this IP for further activity.', high: 'Consider blocking this IP.', critical: 'Investigate immediately.' };
const EVENT_LABELS   = { rate_limit: 'Rate Limit Exceeded', login_failed: 'Failed Login Attempt', injection_attempt: 'Injection Attempt Detected', bot_detected: 'Bot Detected', brute_force: 'Brute Force Attack', suspicious_activity: 'Suspicious Activity', ip_blocked: 'IP Blocked' };

export async function logAndAlert({ eventType, severity, ip, endpoint, payload, userAgent }) {
  const db = getDb();
  const timestamp = toWAT();
  const recommendation = SEVERITY_REC[severity] || 'Monitor activity.';
  const label = EVENT_LABELS[eventType] || eventType;
  const color = SEVERITY_COLOR[severity] || '#6b7280';
  const bg    = SEVERITY_BG[severity]    || 'rgba(107,114,128,0.06)';

  // 1. Log first
  if (db) {
    try {
      await db.from('security_logs').insert({
        event_type: eventType, severity,
        ip_address: ip || null, endpoint: endpoint || null,
        payload: payload ? String(payload).slice(0, 1000) : null,
        user_agent: userAgent ? String(userAgent).slice(0, 500) : null,
      });
    } catch (err) {
      console.error('[security] log insert failed:', err.message);
    }
  }

  // 2. Alert email
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
        <tr><td style="padding:10px 0;border-bottom:1px solid #e5e0d8;color:#888;font-size:11px;letter-spacing:2px;text-transform:uppercase;width:130px;">Timestamp</td><td style="padding:10px 0;border-bottom:1px solid #e5e0d8;color:#1a1a1a;font-size:14px;">${timestamp}</td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid #e5e0d8;color:#888;font-size:11px;letter-spacing:2px;text-transform:uppercase;">IP Address</td><td style="padding:10px 0;border-bottom:1px solid #e5e0d8;color:#1a1a1a;font-size:14px;font-family:monospace;">${ip || '—'}</td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid #e5e0d8;color:#888;font-size:11px;letter-spacing:2px;text-transform:uppercase;">Endpoint</td><td style="padding:10px 0;border-bottom:1px solid #e5e0d8;color:#1a1a1a;font-size:14px;font-family:monospace;">${endpoint || '—'}</td></tr>
        ${safePayload ? `<tr><td style="padding:10px 0;border-bottom:1px solid #e5e0d8;color:#888;font-size:11px;letter-spacing:2px;text-transform:uppercase;vertical-align:top;">Payload</td><td style="padding:10px 0;border-bottom:1px solid #e5e0d8;color:#333;font-size:13px;font-family:monospace;word-break:break-all;">${safePayload}</td></tr>` : ''}
      </table>
      <div style="padding:14px 16px;border-radius:6px;background:#f9f6f1;border:1px solid #e5e0d8;">
        <p style="margin:0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#c8a96e;font-family:Arial,sans-serif;">Recommended Action</p>
        <p style="margin:8px 0 0;color:#333;font-size:14px;line-height:1.6;">${recommendation}</p>
      </div>
    `;
    await sendBlackRockEmail({ to: ALERT_TO, subject: `🚨 BLACKROCK Security Alert: ${label}`, guestName: 'Security Team', bodyHtml, type: 'general' });
  } catch (err) {
    console.error('[security] alert email failed:', err.message);
  }

  // 3. Telegram for HIGH / CRITICAL
  if (severity === 'high' || severity === 'critical') {
    sendTelegramAlert([
      `🚨 <b>SECURITY ALERT — ${severity.toUpperCase()}</b>`,
      `Event: ${label}`,
      `IP: <code>${ip || 'unknown'}</code>`,
      `Target: ${endpoint || '—'}`,
      `Time: ${timestamp}`,
      `Action: ${recommendation}`,
    ].join('\n')).catch(() => {});
  }
}
