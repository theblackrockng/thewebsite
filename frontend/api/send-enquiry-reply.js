'use strict';

const { createClient } = require('@supabase/supabase-js');
const { sendBlackRockEmail } = require('./_lib/email');
const { enquiryReplyEmail } = require('./_lib/templates');

const TELEGRAM_TOKEN   = process.env.TELEGRAM_BOT_TOKEN || process.env.REACT_APP_TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID   || process.env.REACT_APP_TELEGRAM_CHAT_ID;

// Lazy Supabase client
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

  // Step 1: Send Telegram notification
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

  // Step 2: Look up enquiry ID
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

  // Step 3: Store message mapping
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
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { name, email, message } = req.body || {};
  if (!email || !name) return res.status(400).json({ error: 'Missing required fields' });

  // Run Telegram notification and auto-reply email in parallel.
  // Both are awaited so Vercel does not terminate the function before the DB insert completes.
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
