'use strict';

const { createClient } = require('@supabase/supabase-js');
const { sendBlackRockEmail } = require('./_lib/email');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.REACT_APP_TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || process.env.REACT_APP_TELEGRAM_CHAT_ID;

async function sendTelegram(text) {
  if (!TOKEN || !CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'HTML' }),
    });
  } catch (err) {
    console.error('[telegram-webhook] sendTelegram error:', err);
  }
}

module.exports = async function handler(req, res) {
  // Always return 200 to Telegram to prevent retries
  if (req.method !== 'POST') {
    return res.status(200).json({ ok: true });
  }

  try {
    const update = req.body || {};
    const message = update.message;

    if (!message) return res.status(200).json({ ok: true });

    // Only process replies to existing messages
    if (!message.reply_to_message) return res.status(200).json({ ok: true });

    const replyToMsgId = message.reply_to_message.message_id;
    const replyText = message.text?.trim();

    if (!replyText) return res.status(200).json({ ok: true });

    // Look up the enquiry linked to the replied-to message
    const { data: rows, error: dbErr } = await supabase
      .from('enquiry_telegram_messages')
      .select('*')
      .eq('telegram_message_id', replyToMsgId)
      .limit(1);

    if (dbErr) {
      console.error('[telegram-webhook] Supabase lookup error:', dbErr);
      return res.status(200).json({ ok: true });
    }

    if (!rows || rows.length === 0) {
      // Not an enquiry message — ignore
      return res.status(200).json({ ok: true });
    }

    const row = rows[0];
    const { guest_email, guest_name, enquiry_id } = row;

    // Escape reply text for HTML
    const escapedReplyText = replyText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');

    const bodyHtml = `
      <p style="margin:0 0 20px;color:#1a1a1a;">Thank you for getting in touch with BLACKROCK Restaurant &amp; Lounge.</p>
      <p style="margin:0 0 20px;color:#1a1a1a;">${escapedReplyText}</p>
      <p style="margin-top:24px;color:#555;font-size:14px;">
        If you need further assistance, please reply to this email or contact us directly at
        <a href="tel:+2349030482774" style="color:#c8a96e;">+234 903 048 2774</a>.
      </p>
      <p style="margin-top:16px;font-style:italic;color:#666;">Warm regards,<br><strong style="color:#1a1a1a;">The BLACKROCK Team</strong></p>
    `;

    try {
      await sendBlackRockEmail({
        to: guest_email,
        subject: `Re: Your enquiry — BLACKROCK Restaurant & Lounge`,
        type: 'enquiry',
        guestName: guest_name,
        bodyHtml,
      });

      // Notify success in Telegram
      await sendTelegram(`✅ Reply sent to <b>${guest_name}</b> at ${guest_email}`);

      // Update enquiry status to 'replied'
      if (enquiry_id) {
        const { error: updateErr } = await supabase
          .from('enquiries')
          .update({ status: 'replied' })
          .eq('id', enquiry_id);
        if (updateErr) console.error('[telegram-webhook] Failed to update enquiry status:', updateErr);
      }
    } catch (emailErr) {
      console.error('[telegram-webhook] Failed to send email reply:', emailErr);
      await sendTelegram(`❌ Failed to send reply to ${guest_email}. Please try again or email manually.`);
    }
  } catch (err) {
    console.error('[telegram-webhook] Unexpected error:', err);
  }

  // Always return 200 to Telegram
  return res.status(200).json({ ok: true });
};
