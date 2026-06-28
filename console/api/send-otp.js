import { createClient } from '@supabase/supabase-js';
import { sendBlackRockEmail } from './_lib/email.js';
import { applySecurityHeaders } from './_lib/security.js';

let _supabase = null;
function getSupabase() {
  if (_supabase) return _supabase;
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _supabase = createClient(url, key);
  return _supabase;
}

function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

const PURPOSE_LABELS = {
  password_change: 'password change',
  email_change: 'email address change',
  '2fa_setup': 'two-factor authentication setup',
  '2fa_login': 'sign-in verification',
};

export default async function handler(req, res) {
  applySecurityHeaders(res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId, purpose, email, name } = req.body || {};
  if (!userId || !purpose || !email) return res.status(400).json({ error: 'Missing required fields' });
  if (!PURPOSE_LABELS[purpose]) return res.status(400).json({ error: 'Invalid purpose' });

  const supabase = getSupabase();
  if (!supabase) return res.status(500).json({ error: 'Service unavailable' });

  // Check for lockout: if latest OTP has 3+ attempts, block for 30 min
  const { data: recent } = await supabase
    .from('otp_codes')
    .select('attempts, created_at')
    .eq('user_id', userId)
    .eq('purpose', purpose)
    .eq('used', false)
    .order('created_at', { ascending: false })
    .limit(1);

  if (recent?.[0]?.attempts >= 3) {
    const lockedUntil = new Date(new Date(recent[0].created_at).getTime() + 30 * 60 * 1000);
    if (lockedUntil > new Date()) {
      return res.status(429).json({ error: 'Too many failed attempts. Please wait 30 minutes before requesting a new code.' });
    }
  }

  // Delete existing unused OTPs for this user + purpose
  await supabase.from('otp_codes').delete().eq('user_id', userId).eq('purpose', purpose).eq('used', false);

  const code = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const { error: insertErr } = await supabase.from('otp_codes').insert({
    user_id: userId,
    code,
    purpose,
    expires_at: expiresAt,
  });

  if (insertErr) {
    console.error('[send-otp] Insert failed:', insertErr);
    return res.status(500).json({ error: 'Failed to generate verification code' });
  }

  const label = PURPOSE_LABELS[purpose];
  const bodyHtml = `
    <p style="margin:0 0 20px;">You requested a verification code for your <strong>${label}</strong>.</p>
    <div style="text-align:center;margin:32px 0;padding:28px 24px;background:#f5f0eb;border-radius:8px;border:1px solid rgba(200,169,110,0.3);">
      <p style="margin:0 0 12px;font-family:Arial,sans-serif;font-size:12px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:#888888;">Verification Code</p>
      <div style="font-size:36px;font-weight:700;letter-spacing:0.25em;color:#c8a96e;font-family:Arial,sans-serif;">${code}</div>
    </div>
    <p style="margin:0 0 10px;font-size:14px;color:#666666;">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
    <p style="margin:0;font-size:14px;color:#666666;">If you did not request this, please contact your Super Admin immediately.</p>
  `;

  try {
    await sendBlackRockEmail({
      to: email,
      subject: 'Your BLACKROCK verification code',
      guestName: name || 'Staff Member',
      bodyHtml,
      type: 'general',
      preheader: `Your BLACKROCK verification code is ${code}`,
    });
  } catch (err) {
    console.error('[send-otp] Email failed:', err);
    // Clean up the inserted OTP so user can retry
    await supabase.from('otp_codes').delete().eq('user_id', userId).eq('purpose', purpose).eq('used', false);
    return res.status(500).json({ error: 'Failed to send verification email. Please try again.' });
  }

  return res.status(200).json({ ok: true });
}
