const { Resend } = require('resend');
const { confirmationEmail } = require('./_lib/templates');

const resend = new Resend(process.env.RESEND_API_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const { name, email, date, time, party, occasion, notes } = body;

  if (!email || !name) {
    return { statusCode: 400, body: 'Missing required fields: name, email' };
  }

  try {
    const { error } = await resend.emails.send({
      from: 'BLACKROCK <reservations@blackrockrestaurantng.com>',
      to: [email],
      subject: `Your reservation is confirmed — ${occasion || 'BLACKROCK'}`,
      html: confirmationEmail({ name, date, time, party: Number(party) || 2, occasion, notes }),
    });

    if (error) {
      console.error('Resend error:', error);
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true }),
    };
  } catch (err) {
    console.error('Function error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
