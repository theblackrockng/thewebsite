/**
 * Daily cron — runs every day at 8:00 AM WAT (07:00 UTC).
 * Sends reminder (24–48h before), day-of welcome, and post-dining thank-you emails.
 */

const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');
const { reminderEmail, dayOfEmail, thankYouEmail } = require('./_lib/templates');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().split('T')[0];
}

function todayUTC() {
  return new Date().toISOString().split('T')[0];
}

async function send({ to, subject, html, tag }) {
  const { error } = await resend.emails.send({
    from: 'BLACKROCK <reservations@blackrockrestaurantng.com>',
    to: [to],
    subject,
    html,
  });
  if (error) {
    console.error(`[${tag}] Resend error for ${to}:`, error);
    return false;
  }
  return true;
}

async function markSent(id, column) {
  const { error } = await supabase
    .from('reservations')
    .update({ [column]: true })
    .eq('id', id);
  if (error) console.error(`markSent(${column}) failed for id ${id}:`, error);
}

exports.handler = async () => {
  const today = todayUTC();
  const tomorrow = addDays(today, 1);
  const dayAfter = addDays(today, 2);
  const yesterday = addDays(today, -1);

  // Fetch all confirmed/pending reservations in the relevant window
  const { data: reservations, error } = await supabase
    .from('reservations')
    .select('*')
    .in('status', ['pending', 'confirmed'])
    .gte('date', yesterday)
    .lte('date', dayAfter);

  if (error) {
    console.error('Supabase fetch error:', error);
    return { statusCode: 500, body: error.message };
  }

  let sent = 0;
  let failed = 0;

  for (const r of reservations || []) {
    // ── EMAIL 2: REMINDER (send if dining tomorrow or day-after, not yet sent) ──
    if ((r.date === tomorrow || r.date === dayAfter) && !r.reminder_sent && r.email) {
      const ok = await send({
        to: r.email,
        subject: `Reminder — your table at BLACKROCK is ${r.date === tomorrow ? 'tomorrow' : 'in 2 days'}`,
        html: reminderEmail({ name: r.name, date: r.date, time: r.time, party: Number(r.party) || 2, occasion: r.occasion }),
        tag: 'REMINDER',
      });
      if (ok) { await markSent(r.id, 'reminder_sent'); sent++; } else { failed++; }
    }

    // ── EMAIL 3: DAY-OF (send if dining today, not yet sent) ──
    if (r.date === today && !r.day_of_sent && r.email) {
      const ok = await send({
        to: r.email,
        subject: `Tonight at BLACKROCK — your table is ready, ${(r.name || '').split(' ')[0]}`,
        html: dayOfEmail({ name: r.name, date: r.date, time: r.time, party: Number(r.party) || 2, occasion: r.occasion }),
        tag: 'DAY-OF',
      });
      if (ok) { await markSent(r.id, 'day_of_sent'); sent++; } else { failed++; }
    }

    // ── EMAIL 4: THANK YOU (send if dined yesterday, not yet sent) ──
    if (r.date === yesterday && !r.thankyou_sent && r.email) {
      const ok = await send({
        to: r.email,
        subject: `Thank you for dining with us — BLACKROCK`,
        html: thankYouEmail({ name: r.name, occasion: r.occasion }),
        tag: 'THANK-YOU',
      });
      if (ok) { await markSent(r.id, 'thankyou_sent'); sent++; } else { failed++; }
    }
  }

  console.log(`Scheduled emails done. Sent: ${sent}, Failed: ${failed}, Total reservations checked: ${(reservations || []).length}`);
  return { statusCode: 200, body: JSON.stringify({ sent, failed }) };
};
