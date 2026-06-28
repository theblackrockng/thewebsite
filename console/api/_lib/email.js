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
    ? `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:28px 0;">
        <tr>
          <td align="center">
            <a href="${ctaUrl}" style="background:#1a1a1a;color:#c8a96e;padding:14px 36px;border-radius:4px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;text-decoration:none;display:inline-block;font-family:Arial,sans-serif;font-weight:600;">${ctaText}</a>
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
<body style="margin:0;padding:0;background:#f5f0eb;-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${safePreheader}&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>

<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f5f0eb;padding:32px 16px;">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;">

        <!-- HEADER: cream with gold top border -->
        <tr>
          <td style="background:#faf8f5;border-top:4px solid #c8a96e;padding:32px 40px;text-align:center;border-radius:8px 8px 0 0;">
            <img src="https://blackrockrestaurantng.com/logo.png" height="70" alt="BLACKROCK Restaurant &amp; Lounge" style="display:block;margin:0 auto;height:70px;">
            <div style="border-top:1px solid rgba(200,169,110,0.4);margin-top:24px;font-size:0;line-height:0;">&nbsp;</div>
          </td>
        </tr>

        <!-- BODY: white reading area -->
        <tr>
          <td style="background:#ffffff;padding:40px 48px;font-family:Arial,sans-serif;font-size:15px;line-height:1.8;color:#333333;">
            <p style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:18px;font-weight:bold;color:#1a1a1a;">Dear ${guestName},</p>
            ${bodyHtml}
            ${ctaBlock}
            <div style="border-top:1px solid rgba(200,169,110,0.2);margin:32px 0;font-size:0;line-height:0;">&nbsp;</div>
            <p style="margin:0 0 4px;font-family:Georgia,'Times New Roman',serif;font-style:italic;color:#666666;font-size:15px;">Warm regards,</p>
            <p style="margin:0;font-family:Arial,sans-serif;font-weight:bold;color:#1a1a1a;font-size:15px;">The BLACKROCK Team</p>
          </td>
        </tr>

        <!-- FOOTER: dark charcoal -->
        <tr>
          <td style="background:#1a1a1a;border-top:2px solid rgba(200,169,110,0.3);padding:28px 40px;text-align:center;border-radius:0 0 8px 8px;">
            <p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:13px;color:#aaaaaa;">📍 11 Ajao Road, off Adeniyi Jones Road, Ikeja, Lagos</p>
            <p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:13px;color:#aaaaaa;">📞 +234 903 048 2774</p>
            <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;"><a href="https://blackrockrestaurantng.com" style="color:#c8a96e;text-decoration:none;">🌐 blackrockrestaurantng.com</a></p>
            <p style="margin:16px 0 0;font-family:Arial,sans-serif;font-size:11px;color:#666666;">© 2026 BLACKROCK Restaurant &amp; Lounge. All rights reserved.</p>
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
