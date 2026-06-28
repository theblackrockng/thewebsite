'use strict';

module.exports = async function handler(req, res) {
  // DEBUG — remove after confirming env var value
  const cronSecret = process.env.CRON_SECRET;
  console.log('[telegram-setup] CRON_SECRET:', cronSecret);
  console.log('[telegram-setup] Authorization header:', req.headers.authorization);
  console.log('[telegram-setup] All env keys:', Object.keys(process.env).filter(k => k.includes('CRON')));
  return res.status(200).json({
    debug: true,
    cron_secret_value: cronSecret ?? null,
    cron_secret_defined: cronSecret !== undefined,
    authorization_header: req.headers.authorization ?? null,
    cron_related_env_keys: Object.keys(process.env).filter(k => k.includes('CRON')),
  });

  const token = process.env.TELEGRAM_BOT_TOKEN || process.env.REACT_APP_TELEGRAM_BOT_TOKEN;
  const baseUrl = process.env.WEBHOOK_BASE_URL; // e.g. https://blackrockrestaurantng.com

  if (!token || !baseUrl) {
    return res.status(400).json({ error: 'Missing TELEGRAM_BOT_TOKEN or WEBHOOK_BASE_URL' });
  }

  const webhookUrl = `${baseUrl}/api/telegram-webhook`;

  const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: webhookUrl }),
  });
  const data = await response.json();
  return res.status(200).json({ webhookUrl, telegram: data });
};
