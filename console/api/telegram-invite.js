import { requireStaff } from "./_lib/auth.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // This generates a staff-onboarding Telegram invite link (called from
  // UserManagement), not a bar/waiter tablet flow — any authenticated staff
  // member matches how it's used today.
  const staff = await requireStaff(req, res, "any");
  if (!staff) return;

  const botToken = process.env.REACT_APP_TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  const chatId   = process.env.REACT_APP_TELEGRAM_CHAT_ID   || process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    return res.status(500).json({ error: "Telegram credentials not configured" });
  }

  const { name } = req.body ?? {};

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/createChatInviteLink`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          name: name ? `Staff invite — ${name}` : "Staff invite",
          member_limit: 1,
          creates_join_request: false,
        }),
      }
    );

    const data = await response.json();

    if (!data.ok) {
      console.error("Telegram API error:", data);
      return res.status(500).json({ error: data.description || "Telegram API error" });
    }

    return res.status(200).json({ link: data.result.invite_link });
  } catch (err) {
    console.error("telegram-invite error:", err);
    return res.status(500).json({ error: err.message });
  }
}
