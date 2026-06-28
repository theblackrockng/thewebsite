import { getIP, checkPersistentRateLimit, logAndAlert, applySecurityHeaders } from './_lib/security.js';

export default async function handler(req, res) {
  applySecurityHeaders(res);

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const ip = getIP(req);
  const { eventType = 'login_failed', email } = req.body || {};

  // Count login failures from this IP in the last 10 minutes
  const { count } = await checkPersistentRateLimit(ip, 'login_failed', 5, 15 * 60 * 1000);

  let severity = 'low';
  let blocked = false;

  if (count > 10) {
    severity = 'critical';
    blocked = true;
    await logAndAlert({
      eventType: 'brute_force',
      severity: 'critical',
      ip,
      endpoint: '/login',
      payload: `${count} failed attempts in 10 min${email ? ` for email: ${String(email).slice(0, 100)}` : ''}`,
      userAgent: req.headers['user-agent'],
    });
  } else if (count > 5) {
    severity = 'high';
    await logAndAlert({
      eventType: 'login_failed',
      severity: 'high',
      ip,
      endpoint: '/login',
      payload: `${count} failed attempts${email ? ` for: ${String(email).slice(0, 100)}` : ''}`,
      userAgent: req.headers['user-agent'],
    });
  } else if (count > 3) {
    severity = 'medium';
    await logAndAlert({
      eventType: 'login_failed',
      severity: 'medium',
      ip,
      endpoint: '/login',
      payload: `${count} failed attempts`,
      userAgent: req.headers['user-agent'],
    });
  } else {
    // Log without alerting for early failures
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const key = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (url && key) {
        const db = createClient(url, key);
        await db.from('security_logs').insert({
          event_type: 'login_failed', severity: 'low',
          ip_address: ip, endpoint: '/login',
          payload: email ? `email: ${String(email).slice(0, 100)}` : null,
          user_agent: req.headers['user-agent'] ? String(req.headers['user-agent']).slice(0, 500) : null,
        });
      }
    } catch {}
  }

  return res.status(200).json({ ok: true, blocked, count });
}
