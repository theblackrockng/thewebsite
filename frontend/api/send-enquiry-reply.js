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

async function notifyTelegramAndStore({ name, email, message, enquiryId }) {
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

  try {
    const resp = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'HTML' }),
    });
    const data = await resp.json();
    const messageId = data?.result?.message_id;

    if (messageId && enquiryId) {
      const { error } = await supabase.from('enquiry_telegram_messages').insert({
        telegram_message_id: messageId,
        enquiry_id: enquiryId,
        guest_email: email,
        guest_name: name,
      });
      if (error) console.error('[send-enquiry-reply] enquiry_telegram_messages insert error:', error.message);
    }
  } catch (err) {
    console.error('[send-enquiry-reply] Telegram notify error:', err.message);
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { name, email, message, enquiry_id } = req.body || {};
  if (!email || !name) return res.status(400).json({ error: 'Missing required fields' });

  // Send Telegram notification and store message_id mapping (non-blocking)
  notifyTelegramAndStore({ name, email, message, enquiryId: enquiry_id }).catch(() => {});

  try {
    const { subject, bodyHtml, guestName } = enquiryReplyEmail({ name, message });
    await sendBlackRockEmail({ to: email, subject, guestName, bodyHtml, type: 'enquiry' });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[send-enquiry-reply]', err);
    return res.status(500).json({ error: err.message });
  }
};
