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

const TOKEN   = process.env.TELEGRAM_BOT_TOKEN || process.env.REACT_APP_TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID   || process.env.REACT_APP_TELEGRAM_CHAT_ID;

let _db = null;
function getDb() {
  if (_db) return _db;
  const url  = process.env.SUPABASE_URL;
  const key  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _db = createClient(url, key);
  return _db;
}

async function notifyTelegram(tableNumber) {
  if (!TOKEN || !CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: `🔔 <b>Waiter Requested</b>\nTable <b>${tableNumber}</b> needs a waiter.`,
        parse_mode: 'HTML',
      }),
    });
  } catch (err) {
    console.error('[call-waiter] Telegram error:', err);
  }
}

module.exports = async function handler(req, res) {
  applySecurityHeaders(res);
  const corsHeaders = getCorsHeaders(req);
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  const { blocked } = checkUserAgent(req);
  if (blocked) return res.status(400).json({ error: 'Bad request.' });

  const { allowed } = checkCors(req);
  if (!allowed) return res.status(403).json({ error: 'Forbidden.' });

  const ip = getIP(req);
  const { limited } = checkInMemoryRateLimit(ip, 'call-waiter', 10, 60 * 60 * 1000);
  if (limited) return res.status(429).json({ error: 'Too many requests. Please wait before calling again.' });

  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ error: 'Invalid request body.' });
  }

  const raw = body.table_number;
  const tableNumber = typeof raw === 'number' ? raw : parseInt(raw, 10);
  if (!Number.isInteger(tableNumber) || tableNumber < 1 || tableNumber > 999) {
    return res.status(400).json({ error: 'Invalid table number.' });
  }

  const db = getDb();
  if (!db) return res.status(500).json({ error: 'Database not configured.' });

  try {
    const { data: table, error: tableErr } = await db
      .from('tables')
      .select('id')
      .eq('table_number', tableNumber)
      .eq('active', true)
      .maybeSingle();

    if (tableErr) {
      console.error('[call-waiter] table lookup error:', tableErr);
      return res.status(500).json({ error: 'Could not verify table.' });
    }
    if (!table) {
      return res.status(400).json({ error: 'Invalid table.' });
    }

    // Server-side 2-minute per-table cooldown
    const since = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { data: recent, error: recentErr } = await db
      .from('waiter_calls')
      .select('id')
      .eq('table_number', tableNumber)
      .eq('status', 'pending')
      .gte('created_at', since)
      .limit(1);

    if (recentErr) {
      console.error('[call-waiter] cooldown check error:', recentErr);
      return res.status(500).json({ error: 'Could not process request.' });
    }
    if (recent && recent.length > 0) {
      return res.status(429).json({ error: 'A waiter has already been called for this table. Please wait a moment.' });
    }

    const { error: insertErr } = await db
      .from('waiter_calls')
      .insert({ table_number: tableNumber, status: 'pending' });

    if (insertErr) {
      console.error('[call-waiter] insert error:', insertErr);
      return res.status(500).json({ error: 'Could not record call.' });
    }

    await notifyTelegram(tableNumber);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[call-waiter] unexpected error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
};
