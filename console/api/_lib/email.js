import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

// ── Supabase client (lazy — only created when URL is available) ───────────────
let _supabase = null;
function getSupabase() {
  if (_supabase) return _supabase;
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _supabase = createClient(url, key);
  return _supabase;
}

// ── Sender configuration by email type ───────────────────────────────────────
function getSenderConfig(type) {
  switch (type) {
    case 'reservation':
      return {
        fromName: 'BLACKROCK Reservations',
        fromEmail: 'reservations@blackrockrestaurantng.com',
        password: process.env.ZOHO_RESERVATIONS_PASSWORD || process.env.ZOHO_APP_PASSWORD,
      };
    case 'enquiry':
      return {
        fromName: 'BLACKROCK Restaurant & Lounge',
        fromEmail: 'enquiries@blackrockrestaurantng.com',
        password: process.env.ZOHO_ENQUIRIES_PASSWORD || process.env.ZOHO_APP_PASSWORD,
      };
    case 'general':
    default:
      return {
        fromName: 'BLACKROCK Restaurant & Lounge',
        fromEmail: 'info@blackrockrestaurantng.com',
        password: process.env.ZOHO_APP_PASSWORD,
      };
  }
}

// ── HTML template builder ─────────────────────────────────────────────────────
export function buildTemplate({ guestName, bodyHtml, subject, preheader, ctaText, ctaUrl }) {
  const safePreheader = preheader || subject || '';

  const ctaBlock = (ctaText && ctaUrl)
    ? `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:28px 0 8px;">
        <tr>
          <td align="center">
            <a href="${ctaUrl}" style="background:#c8a96e;color:#1a1a1a;padding:14px 32px;border-radius:4px;font-weight:bold;text-decoration:none;display:inline-block;font-family:Georgia,'Times New Roman',serif;font-size:15px;">${ctaText}</a>
          </td>
        </tr>
      </table>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>BLACKROCK Restaurant &amp; Lounge</title>
</head>
<body style="margin:0;padding:0;background:#1a1a1a;-webkit-font-smoothing:antialiased;">
<!-- preheader -->
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${safePreheader}&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>

<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#1a1a1a;padding:32px 16px;">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;">

        <!-- HEADER -->
        <tr>
          <td style="background:#1a1a1a;padding:32px 40px;text-align:center;">
            <img src="https://blackrockrestaurantng.com/logo.png" height="60" alt="BLACKROCK Restaurant &amp; Lounge" style="display:block;margin:0 auto;height:60px;">
          </td>
        </tr>

        <!-- GOLD ACCENT ROW -->
        <tr>
          <td style="background:#c8a96e;height:3px;font-size:0;line-height:0;">&nbsp;</td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="padding:40px;color:#1a1a1a;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.7;">
            <p style="margin:0 0 20px;"><strong style="color:#1a1a1a;">Dear ${guestName},</strong></p>
            ${bodyHtml}
            ${ctaBlock}
          </td>
        </tr>

        <!-- GOLD DIVIDER -->
        <tr>
          <td style="padding:0 40px;">
            <div style="border-top:1px solid rgba(200,169,110,0.3);"></div>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="background:#1a1a1a;padding:24px 40px;text-align:center;color:#888580;font-family:Arial,sans-serif;font-size:12px;line-height:1.7;border-radius:0 0 8px 8px;">
            <p style="margin:0 0 4px;">📍 11 Ajao Road, off Adeniyi Jones Road, Ikeja, Lagos</p>
            <p style="margin:0 0 4px;">📞 +234 903 048 2774</p>
            <p style="margin:0 0 12px;">🌐 blackrockrestaurantng.com</p>
            <p style="margin:0;font-size:11px;color:#666;">© 2026 BLACKROCK Restaurant &amp; Lounge. All rights reserved.</p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

// ── Core send function ────────────────────────────────────────────────────────
export async function sendBlackRockEmail({ to, subject, guestName, bodyHtml, type = 'general', ctaText, ctaUrl, preheader }) {
  const { fromName, fromEmail, password } = getSenderConfig(type);

  const html = buildTemplate({ guestName, bodyHtml, subject, preheader, ctaText, ctaUrl });

  const transporter = nodemailer.createTransport({
    host: 'smtp.zoho.com',
    port: 465,
    secure: true,
    auth: {
      user: fromEmail,
      pass: password,
    },
  });

  let status = 'sent';
  let errorMessage = null;

  try {
    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      replyTo: 'info@blackrockrestaurantng.com',
      subject,
      html,
    });
  } catch (err) {
    status = 'failed';
    errorMessage = err?.message || String(err);
    console.error(`[sendBlackRockEmail] Failed to send to ${to}:`, err);
    // Log to Supabase before re-throwing
    try {
      await getSupabase()?.from('email_logs').insert({
        to_email: to,
        guest_name: guestName || null,
        subject,
        type,
        status,
        error_message: errorMessage,
      });
    } catch (logErr) {
      console.error('[sendBlackRockEmail] Failed to log to Supabase:', logErr);
    }
    throw err;
  }

  // Log success
  try {
    await getSupabase()?.from('email_logs').insert({
      to_email: to,
      guest_name: guestName || null,
      subject,
      type,
      status,
      error_message: null,
    });
  } catch (logErr) {
    console.error('[sendBlackRockEmail] Failed to log success to Supabase:', logErr);
  }
}
