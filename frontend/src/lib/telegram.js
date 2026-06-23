const TOKEN  = process.env.REACT_APP_TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.REACT_APP_TELEGRAM_CHAT_ID;

export async function notifyTelegram(text) {
  if (!TOKEN || !CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: "HTML" }),
    });
  } catch {}
}

export function reservationMessage(r) {
  const dateStr = r.date
    ? new Date(r.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : "—";
  return [
    "🍽 <b>New Reservation — BLACKROCK</b>",
    "",
    `👤 <b>${r.name}</b>`,
    `📅 ${dateStr} at ${r.time || "—"}`,
    `👥 Party of ${r.party || "—"}`,
    r.occasion ? `🎉 ${r.occasion}` : null,
    "",
    r.phone ? `📞 ${r.phone}` : null,
    r.email ? `✉️ ${r.email}` : null,
    r.notes ? `\n📝 ${r.notes}` : null,
  ].filter((l) => l !== null).join("\n");
}

export function enquiryMessage(e) {
  const preview = e.message
    ? e.message.length > 200 ? e.message.slice(0, 200) + "…" : e.message
    : "—";
  return [
    "💬 <b>New Enquiry — BLACKROCK</b>",
    "",
    `👤 <b>${e.name}</b>`,
    e.email ? `✉️ ${e.email}` : null,
    e.phone ? `📞 ${e.phone}` : null,
    "",
    `📩 ${preview}`,
  ].filter((l) => l !== null).join("\n");
}
