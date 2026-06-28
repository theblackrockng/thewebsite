'use strict';

const { createClient } = require('@supabase/supabase-js');
const { sendBlackRockEmail } = require('./_lib/email');
const { enquiryReplyEmail } = require('./_lib/templates');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TELEGRAM_TOKEN   = process.env.TELEGRAM_BOT_TOKEN || process.env.REACT_APP_TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID   || process.env.REACT_APP_TELEGRAM_CHAT_ID;

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

  // Step 1: Send Telegram notification — always first, never blocked by DB
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

  // Step 2: Look up enquiry ID (best-effort — failure does not block anything)
  let enquiryId = null;
  try {
    const { data: enquiryRow } = await supabase
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

  // Step 3: Store message mapping (enquiry_id may be null — webhook still works via guest_email)
  try {
    await supabase.from('enquiry_telegram_messages').insert({
      telegram_message_id: messageId,
      enquiry_id: enquiryId,
      guest_email: email,
      guest_name: name,
    });
  } catch (err) {
    console.error('[send-enquiry-reply] enquiry_telegram_messages insert error:', err.message);
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { name, email, message } = req.body || {};
  if (!email || !name) return res.status(400).json({ error: 'Missing required fields' });

  // Telegram notification + message_id storage (non-blocking, server-side with service role key)
  notifyTelegramAndStore({ name, email, message }).catch(() => {});

  try {
    const { subject, bodyHtml, guestName } = enquiryReplyEmail({ name, message });
    await sendBlackRockEmail({ to: email, subject, guestName, bodyHtml, type: 'enquiry' });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[send-enquiry-reply]', err);
    return res.status(500).json({ error: err.message });
  }
};
