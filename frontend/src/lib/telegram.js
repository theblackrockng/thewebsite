const TOKEN  = process.env.REACT_APP_TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.REACT_APP_TELEGRAM_CHAT_ID;

export async function notifyTelegram(text, replyMarkup = null) {
  if (!TOKEN || !CHAT_ID) return null;
  try {
    const payload = { chat_id: CHAT_ID, text, parse_mode: "HTML" };
    if (replyMarkup) payload.reply_markup = replyMarkup;
    const resp = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await resp.json();
    return data?.result?.message_id ?? null;
  } catch {
    return null;
  }
}

export function reservationMessage(r) {
  const dateStr = r.date
    ? new Date(r.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : "—";
  const mealsLines = r.preSelectedMeals?.length > 0
    ? ["\n🍽️ Pre-selected meals:", ...r.preSelectedMeals.map((m) => `  ${m.qty}  ${m.name}`)]
    : [];
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
    ...mealsLines,
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
