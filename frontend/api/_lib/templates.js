'use strict';

const BRAND = {
  name: 'BLACKROCK',
  address: '11 Ajao Road, off Adeniyi Jones Road, Ikeja, Lagos',
  phone: '+234 903 048 2774',
  email: 'reservations@blackrockrestaurantng.com',
  website: 'blackrockrestaurantng.com',
  instagram: '@blackrockrestaurantng',
  googleReview: 'https://g.page/r/blackrock-restaurant-ng/review',
};

function fmtDate(dateStr) {
  // Parse as noon UTC to avoid timezone off-by-one
  const d = new Date(dateStr + 'T12:00:00Z');
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function detailRow(label, value) {
  return `<tr>
    <td style="padding:12px 0;border-bottom:1px solid #e5e0d8;color:#888;font-size:11px;letter-spacing:2px;text-transform:uppercase;width:120px;vertical-align:top;">${label}</td>
    <td style="padding:12px 0;border-bottom:1px solid #e5e0d8;color:#1a1a1a;font-size:15px;text-align:right;vertical-align:top;">${value}</td>
  </tr>`;
}

function detailTable(rows) {
  return `<table width="100%" style="border-collapse:collapse;margin:20px 0;">
    ${rows}
  </table>`;
}

/* ── EMAIL 1: CONFIRMATION ── */
exports.confirmationEmail = ({ name, date, time, party, occasion, notes }) => {
  const firstName = (name || 'friend').split(' ')[0];
  const partyLabel = party === 1 ? '1 guest' : `${party} guests`;

  const rows = [
    detailRow('Occasion', occasion || 'Reservation'),
    date ? detailRow('Date', fmtDate(date)) : '',
    time ? detailRow('Time', time) : '',
    detailRow('Party', partyLabel),
    detailRow('Address', BRAND.address),
    notes ? detailRow('Notes', notes) : '',
  ].join('');

  const bodyHtml = `
    <p style="margin:0 0 20px;color:#1a1a1a;">We've received your reservation and we're looking forward to welcoming you.</p>

    <div style="border-left:3px solid #c8a96e;padding-left:16px;margin:20px 0 4px;">
      <p style="margin:0;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#c8a96e;font-family:Arial,sans-serif;">Booking Details</p>
    </div>
    ${detailTable(rows)}

    <p style="margin:20px 0;color:#555;font-size:14px;">
      For changes, call <a href="tel:+2349030482774" style="color:#c8a96e;text-decoration:none;font-weight:bold;">+234 903 048 2774</a>
    </p>

    <p style="margin:24px 0 0;font-style:italic;color:#888;font-size:14px;border-top:1px solid rgba(200,169,110,0.2);padding-top:20px;">
      "Clean food. Natural ingredients. Exceptional experience. — That's the BLACKROCK promise."
    </p>
  `;

  return {
    subject: `Your reservation is confirmed — ${occasion || 'BLACKROCK'}`,
    bodyHtml,
    guestName: name,
  };
};

/* ── EMAIL 2: REMINDER (24–48 hrs before) ── */
exports.reminderEmail = ({ name, date, time, party, occasion }) => {
  const firstName = (name || 'friend').split(' ')[0];
  const partyLabel = party === 1 ? '1 guest' : `${party} guests`;

  const rows = [
    detailRow('Occasion', occasion || 'Reservation'),
    date ? detailRow('Date', fmtDate(date)) : '',
    time ? detailRow('Time', time) : '',
    detailRow('Party', partyLabel),
    detailRow('Address', BRAND.address),
  ].join('');

  const bodyHtml = `
    <p style="margin:0 0 20px;color:#1a1a1a;">Your table is ready and we're preparing for your arrival. Here are your booking details.</p>

    <div style="border-left:3px solid #c8a96e;padding-left:16px;margin:20px 0 4px;">
      <p style="margin:0;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#c8a96e;font-family:Arial,sans-serif;">Booking Details</p>
    </div>
    ${detailTable(rows)}

    <p style="margin:20px 0;color:#555;font-size:14px;">
      Need to reschedule? Call us: <a href="tel:+2349030482774" style="color:#c8a96e;text-decoration:none;font-weight:bold;">+234 903 048 2774</a>
    </p>

    <p style="margin:24px 0 0;color:#555;font-size:14px;">We look forward to an evening worth remembering.</p>
  `;

  return {
    subject: `Your table at BLACKROCK — a gentle reminder`,
    bodyHtml,
    guestName: name,
  };
};

/* ── EMAIL 3: DAY-OF WELCOME ── */
exports.dayOfEmail = ({ name, date, time, party, occasion }) => {
  const firstName = (name || 'friend').split(' ')[0];
  const partyLabel = party === 1 ? '1 guest' : `${party} guests`;

  const rows = [
    occasion ? detailRow('Occasion', occasion) : '',
    time ? detailRow('Time', time) : '',
    detailRow('Party', partyLabel),
    detailRow('Address', BRAND.address),
  ].join('');

  const bodyHtml = `
    <p style="margin:0 0 20px;color:#1a1a1a;">Tonight is your night. We've been looking forward to welcoming you all week.</p>

    <div style="border-left:3px solid #c8a96e;padding-left:16px;margin:20px 0 4px;">
      <p style="margin:0;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#c8a96e;font-family:Arial,sans-serif;">Tonight's Details</p>
    </div>
    ${detailTable(rows)}

    <div style="background:#f9f6f1;border:1px solid #e5e0d8;border-radius:4px;padding:20px 24px;margin:20px 0;">
      <p style="margin:0 0 8px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#c8a96e;font-family:Arial,sans-serif;">Getting Here</p>
      <p style="margin:0;color:#555;font-size:14px;line-height:1.7;">We're on Ajao Road, off Adeniyi Jones Road, Ikeja. There is parking available on-site. If you need directions, call us and we'll guide you in.</p>
    </div>

    <p style="margin:20px 0 0;font-style:italic;color:#888;font-size:15px;line-height:1.7;">"The best evenings begin with the right table. Yours is waiting."</p>
  `;

  return {
    subject: `Tonight at BLACKROCK — your table is ready`,
    bodyHtml,
    guestName: name,
  };
};

/* ── EMAIL 4: POST-DINING THANK YOU ── */
exports.thankYouEmail = ({ name, occasion }) => {
  const firstName = (name || 'friend').split(' ')[0];

  const bodyHtml = `
    <p style="margin:0 0 20px;color:#1a1a1a;">
      Thank you for choosing BLACKROCK${occasion ? ` for your ${occasion.toLowerCase()}` : ''}.
      We hope the evening was everything you imagined.
    </p>

    <p style="margin:0 0 20px;color:#555;font-size:15px;line-height:1.8;">
      Your experience matters to us deeply. If you enjoyed your evening — or if anything fell short of what you expected — we'd love to hear from you.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:28px 0;">
      <tr>
        <td align="center">
          <a href="${BRAND.googleReview}" style="background:#1a1a1a;color:#c8a96e;padding:14px 36px;border-radius:4px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;text-decoration:none;display:inline-block;font-family:Arial,sans-serif;font-weight:600;">Leave a Review</a>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 20px;color:#888;font-size:13px;text-align:center;line-height:1.6;">Your review helps other guests find us, and it helps us keep getting better. Thank you.</p>

    <div style="border-top:1px solid rgba(200,169,110,0.2);padding-top:20px;margin-top:24px;">
      <p style="margin:0 0 12px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#c8a96e;font-family:Arial,sans-serif;text-align:center;">Ready for your next visit?</p>
      <p style="margin:0 0 16px;color:#888;font-size:14px;text-align:center;">Your table is never far away.</p>
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td align="center">
            <a href="https://blackrockrestaurantng.com/reservations" style="background:#1a1a1a;color:#c8a96e;padding:14px 36px;border-radius:4px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;text-decoration:none;display:inline-block;font-family:Arial,sans-serif;font-weight:600;">Book Again</a>
          </td>
        </tr>
      </table>
    </div>

  `;

  return {
    subject: `Thank you for dining with us — BLACKROCK`,
    bodyHtml,
    guestName: name,
  };
};

/* ── EMAIL 5: ENQUIRY AUTO-REPLY ── */
exports.enquiryReplyEmail = ({ name, message }) => {
  const firstName = (name || 'friend').split(' ')[0];
  const escapedMessage = (message || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const bodyHtml = `
    <p style="margin:0 0 20px;color:#1a1a1a;">We've received your enquiry and one of our team will get back to you shortly.</p>

    <div style="margin:24px 0;">
      <p style="margin:0 0 8px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#c8a96e;font-family:Arial,sans-serif;">Your message</p>
      <div style="border-left:3px solid #c8a96e;background:#f9f6f1;padding:16px 20px;border-radius:0 4px 4px 0;">
        <p style="margin:0;color:#555;font-size:14px;line-height:1.8;font-style:italic;">"${escapedMessage}"</p>
      </div>
    </div>

    <p style="margin:20px 0;color:#555;font-size:14px;line-height:1.7;">
      If urgent, call: <a href="tel:+2349030482774" style="color:#c8a96e;text-decoration:none;font-weight:bold;">+234 903 048 2774</a>
    </p>

  `;

  return {
    subject: `We received your enquiry — BLACKROCK`,
    bodyHtml,
    guestName: name,
  };
};
