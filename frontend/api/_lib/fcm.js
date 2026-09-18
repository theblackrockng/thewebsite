'use strict';

const admin = require('firebase-admin');

let _app = null;

function getApp() {
  if (_app) return _app;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    const cred = JSON.parse(raw);
    _app = admin.apps.length
      ? admin.apps[0]
      : admin.initializeApp({ credential: admin.credential.cert(cred) });
    return _app;
  } catch (err) {
    console.error('[fcm] Failed to init Firebase Admin:', err.message);
    return null;
  }
}

async function sendPush(tokens, title, body, data = {}) {
  const app = getApp();
  const validTokens = (tokens || []).filter(Boolean);
  if (!app || !validTokens.length) return { sent: 0, failed: 0 };

  const messaging = admin.messaging(app);
  try {
    const res = await messaging.sendEachForMulticast({
      notification: { title, body },
      data,
      tokens: validTokens,
    });
    return { sent: res.successCount, failed: res.failureCount };
  } catch (err) {
    console.error('[fcm] sendEachForMulticast error:', err.message);
    return { sent: 0, failed: validTokens.length };
  }
}

module.exports = { sendPush };
