import { sendBlackRockEmail } from './_lib/email.js';
import { requireStaff } from './_lib/auth.js';

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const staff = await requireStaff(req, res, 'any');
  if (!staff) return;

  try {
    const { to, subject, body, guestName, type = 'general' } = req.body ?? {};

    if (!to)      return res.status(400).json({ error: "Recipient email (to) is required" });
    if (!subject) return res.status(400).json({ error: "Subject is required" });
    if (!body)    return res.status(400).json({ error: "Body is required" });

    const escapedBody = (body || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');

    const bodyHtml = `<p style="margin:0;">${escapedBody}</p>`;

    await sendBlackRockEmail({ to, subject, guestName: guestName || 'Guest', bodyHtml, type });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("[send-email] error:", err);
    return res.status(500).json({ error: err?.message || "Failed to send email" });
  }
}
