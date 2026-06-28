'use strict';

const { createClient } = require('@supabase/supabase-js');
const { sendBlackRockEmail } = require('./_lib/email');

const TOKEN   = process.env.TELEGRAM_BOT_TOKEN   || process.env.REACT_APP_TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID     || process.env.REACT_APP_TELEGRAM_CHAT_ID;

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

    // Only process replies
    if (!message.reply_to_message) return res.status(200).json({ ok: true });

    const replyToMsgId = message.reply_to_message.message_id;
    const replyText = message.text?.trim();

    if (!replyText) return res.status(200).json({ ok: true });

    const db = getSupabase();
    if (!db) {
      await sendTelegram('⚠️ Webhook error: Supabase not configured. Check SUPABASE_URL env var.');
      return res.status(200).json({ ok: true });
    }

    // Look up the enquiry linked to the replied-to message
    const { data: rows, error: dbErr } = await db
      .from('enquiry_telegram_messages')
      .select('*')
      .eq('telegram_message_id', replyToMsgId)
      .limit(1);

    if (dbErr) {
      console.error('[telegram-webhook] Supabase lookup error:', dbErr);
      await sendTelegram(`⚠️ DB lookup failed: ${dbErr.message}`);
      return res.status(200).json({ ok: true });
    }

    if (!rows || rows.length === 0) {
      // Not a tracked enquiry message — notify so staff know
      await sendTelegram(`⚠️ No enquiry found for message #${replyToMsgId}. This reply was NOT sent.\n\nOnly replies to notifications with the italic instruction line are forwarded to guests.`);
      return res.status(200).json({ ok: true });
    }

    const { guest_email, guest_name, enquiry_id } = rows[0];

    const staffName = (message.from?.first_name + (message.from?.last_name ? ' ' + message.from.last_name : '')) || message.from?.username || 'Staff';

    const escapedReplyText = replyText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');

    // No sign-off here — the email template wrapper adds "Warm regards, The BLACKROCK Team"
    const bodyHtml = `
      <p style="margin:0 0 20px;color:#333333;">Thank you for getting in touch with BLACKROCK Restaurant &amp; Lounge.</p>
      <p style="margin:0 0 20px;color:#333333;">${escapedReplyText}</p>
      <p style="margin:20px 0 0;color:#555555;font-size:14px;line-height:1.7;">
        If you need further assistance, please reply to this email or call us on
        <a href="tel:+2349030482774" style="color:#c8a96e;white-space:nowrap;">+234 903 048 2774</a>.
      </p>
    `;

    try {
      await sendBlackRockEmail({
        to: guest_email,
        subject: `Re: Your enquiry — BLACKROCK Restaurant & Lounge`,
        type: 'general',
        guestName: guest_name,
        bodyHtml,
      });

      await sendTelegram(`✅ Reply sent to <b>${guest_name}</b> (${guest_email}) by ${staffName}`);

      if (enquiry_id) {
        await db.from('enquiries').update({ status: 'responded' }).eq('id', enquiry_id);
      }
    } catch (emailErr) {
      console.error('[telegram-webhook] Failed to send email reply:', emailErr);
      await sendTelegram(`❌ Reply by ${staffName} to <b>${guest_name}</b> (${guest_email}) failed to send. Please try again or email manually.`);
    }
  } catch (err) {
    console.error('[telegram-webhook] Unexpected error:', err);
    await sendTelegram(`⚠️ Webhook crashed: ${err.message}`);
  }

  return res.status(200).json({ ok: true });
};
