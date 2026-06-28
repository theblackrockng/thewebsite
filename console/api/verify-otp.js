import { createClient } from '@supabase/supabase-js';
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

export default async function handler(req, res) {
  applySecurityHeaders(res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId, purpose, code } = req.body || {};
  if (!userId || !purpose || !code) return res.status(400).json({ error: 'Missing required fields' });

  const supabase = getSupabase();
  if (!supabase) return res.status(500).json({ error: 'Service unavailable' });

  const { data: otp, error: fetchErr } = await supabase
    .from('otp_codes')
    .select('*')
    .eq('user_id', userId)
    .eq('purpose', purpose)
    .eq('used', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchErr || !otp) {
    return res.status(400).json({ error: 'No active verification code found. Please request a new one.' });
  }

  if (new Date() > new Date(otp.expires_at)) {
    await supabase.from('otp_codes').delete().eq('id', otp.id);
    return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
  }

  if (otp.attempts >= 3) {
    return res.status(429).json({ error: 'Too many incorrect attempts. Please request a new code.' });
  }

  if (otp.code !== String(code).trim()) {
    const newAttempts = otp.attempts + 1;
    await supabase.from('otp_codes').update({ attempts: newAttempts }).eq('id', otp.id);
    const remaining = 3 - newAttempts;
    if (remaining <= 0) {
      return res.status(429).json({ error: 'Too many incorrect attempts. Please request a new code.' });
    }
    return res.status(400).json({ error: `Incorrect code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.` });
  }

  // Mark as used
  await supabase.from('otp_codes').update({ used: true }).eq('id', otp.id);

  return res.status(200).json({ ok: true, verified: true });
}
