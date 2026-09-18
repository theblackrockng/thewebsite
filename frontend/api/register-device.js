'use strict';

const { createClient } = require('@supabase/supabase-js');
const { applySecurityHeaders, getCorsHeaders } = require('./_lib/security');

let _db = null;
function getDb() {
  if (_db) return _db;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _db = createClient(url, key);
  return _db;
}

module.exports = async function handler(req, res) {
  applySecurityHeaders(res);
  const corsHeaders = getCorsHeaders(req);
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { role, staff_id, fcm_token } = req.body || {};

  if (!role || !['waiter', 'bar'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role.' });
  }
  if (!fcm_token || typeof fcm_token !== 'string') {
    return res.status(400).json({ error: 'Missing fcm_token.' });
  }

  const db = getDb();
  if (!db) return res.status(500).json({ error: 'Database not configured.' });

  try {
    // Try upsert on (role, staff_id) for waiter tokens, or (fcm_token) for bar tokens
    const conflictCol = staff_id ? 'role,staff_id' : 'fcm_token';
    const { error } = await db
      .from('push_tokens')
      .upsert(
        { role, staff_id: staff_id || null, fcm_token },
        { onConflict: conflictCol }
      );

    if (error) {
      console.error('[register-device] upsert error:', error);
      return res.status(500).json({ error: 'Failed to register device.' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[register-device] unexpected error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
};
