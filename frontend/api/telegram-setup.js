'use strict';

module.exports = async function handler(req, res) {
  // Protect with CRON_SECRET
  const auth = req.headers.authorization;
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

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
  if (!data.ok) {
    return res.status(500).json({ ok: false, error: data.description || 'Telegram rejected the webhook', telegram: data });
  }
  return res.status(200).json({ ok: true, message: 'Webhook registered successfully', webhookUrl, telegram: data });
};
