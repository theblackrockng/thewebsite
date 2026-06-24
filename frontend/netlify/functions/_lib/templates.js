const BRAND = {
  name: 'BLACKROCK',
  address: 'Ajao Road, off Adeniyi Jones Road, Ikeja, Lagos',
  phone: '08055238353 / 09030482774',
  email: 'theblackrock.ng@gmail.com',
  website: 'blackrockrestaurantng.com',
  instagram: '@blackrockrestaurantng',
  googleReview: 'https://g.page/r/blackrock-restaurant-ng/review',
};

function fmtDate(dateStr) {
  // Parse as noon UTC to avoid timezone off-by-one
  const d = new Date(dateStr + 'T12:00:00Z');
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function shell({ preheader, content }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>${BRAND.name}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background:#0f0d0a;-webkit-font-smoothing:antialiased;">
<!-- preheader -->
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>

<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#0f0d0a;padding:32px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;">

      <!-- HEADER -->
      <tr>
        <td style="padding:40px 40px 32px;text-align:center;background:#0f0d0a;border-bottom:1px solid #2e2820;">
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:11px;letter-spacing:5px;color:#9C8E7A;text-transform:uppercase;margin-bottom:10px;">Est. 2020 · Lagos</div>
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:700;letter-spacing:7px;color:#C9A84C;text-transform:uppercase;line-height:1;">BLACKROCK</div>
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:10px;letter-spacing:3px;color:#9C8E7A;text-transform:uppercase;margin-top:6px;">Restaurant &amp; Lounge</div>
          <div style="width:40px;height:1px;background:#C9A84C;margin:18px auto 0;opacity:0.5;"></div>
        </td>
      </tr>

      <!-- CONTENT -->
      <tr>
        <td style="background:#1a1612;">
          ${content}
        </td>
      </tr>

      <!-- FOOTER -->
      <tr>
        <td style="background:#0f0d0a;padding:28px 40px;border-top:1px solid #2e2820;text-align:center;">
          <p style="margin:0 0 6px;font-family:Georgia,serif;font-size:12px;color:#9C8E7A;">${BRAND.address}</p>
          <p style="margin:0 0 6px;font-family:Georgia,serif;font-size:12px;color:#9C8E7A;">${BRAND.phone}</p>
          <p style="margin:0 0 16px;font-family:Georgia,serif;font-size:12px;color:#9C8E7A;">${BRAND.email}</p>
          <div style="width:32px;height:1px;background:#C9A84C;margin:0 auto 16px;opacity:0.3;"></div>
          <p style="margin:0;font-family:Georgia,serif;font-size:10px;color:#3d3830;letter-spacing:1px;">© 2025 BLACKROCK. All rights reserved.</p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function detailRow(label, value) {
  return `<tr>
    <td style="padding:14px 0;border-bottom:1px solid #2e2820;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td style="font-family:Georgia,serif;font-size:10px;letter-spacing:2.5px;color:#9C8E7A;text-transform:uppercase;width:120px;vertical-align:top;padding-right:16px;">${label}</td>
          <td style="font-family:Georgia,serif;font-size:15px;color:#F5F0E8;text-align:right;vertical-align:top;">${value}</td>
        </tr>
      </table>
    </td>
  </tr>`;
}

/* ── EMAIL 1: CONFIRMATION ── */
exports.confirmationEmail = ({ name, date, time, party, occasion, notes }) => {
  const firstName = (name || 'friend').split(' ')[0];
  const partyLabel = party === 1 ? '1 guest' : `${party} guests`;

  const content = `
    <!-- Hero -->
    <div style="padding:48px 40px 32px;text-align:center;border-bottom:1px solid #2e2820;">
      <div style="width:56px;height:56px;border-radius:50%;background:#C9A84C;margin:0 auto 24px;display:flex;align-items:center;justify-content:center;">
        <div style="width:56px;height:56px;border-radius:50%;background:#C9A84C;line-height:56px;text-align:center;font-size:22px;">✓</div>
      </div>
      <div style="font-family:Georgia,serif;font-size:10px;letter-spacing:3px;color:#C9A84C;text-transform:uppercase;margin-bottom:12px;">— Confirmed —</div>
      <h1 style="margin:0;font-family:Georgia,serif;font-size:28px;font-weight:400;color:#F5F0E8;line-height:1.3;">Your table awaits,<br><em style="color:#C9A84C;">${firstName}.</em></h1>
      <p style="margin:16px 0 0;font-family:Georgia,serif;font-size:14px;color:#9C8E7A;line-height:1.7;">We've received your reservation and we're looking<br>forward to welcoming you.</p>
    </div>

    <!-- Details -->
    <div style="padding:32px 40px;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        ${detailRow('Occasion', occasion || 'Reservation')}
        ${date ? detailRow('Date', fmtDate(date)) : ''}
        ${time ? detailRow('Time', time) : ''}
        ${detailRow('Party', partyLabel)}
        ${detailRow('Address', BRAND.address)}
        ${notes ? detailRow('Notes', notes) : ''}
      </table>
    </div>

    <!-- Call to action strip -->
    <div style="background:#0f0d0a;padding:20px 40px;border-top:1px solid #2e2820;border-bottom:1px solid #2e2820;text-align:center;">
      <p style="margin:0;font-family:Georgia,serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#9C8E7A;">
        For changes, call
        <a href="tel:08055238353" style="color:#C9A84C;text-decoration:none;font-weight:600;">08055238353</a>
        &nbsp;/&nbsp;
        <a href="tel:09030482774" style="color:#C9A84C;text-decoration:none;font-weight:600;">09030482774</a>
      </p>
    </div>

    <!-- Closing note -->
    <div style="padding:32px 40px;text-align:center;">
      <p style="margin:0;font-family:Georgia,serif;font-size:14px;color:#9C8E7A;line-height:1.8;font-style:italic;">"Clean food. Natural ingredients. Exceptional experience."</p>
      <p style="margin:12px 0 0;font-family:Georgia,serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#4a4440;">That's the BLACKROCK promise.</p>
    </div>
  `;

  return shell({
    preheader: `Your table is confirmed, ${firstName}. ${occasion ? occasion + ' · ' : ''}${date ? fmtDate(date) : ''} at ${time || ''}.`,
    content,
  });
};

/* ── EMAIL 2: REMINDER (24–48 hrs before) ── */
exports.reminderEmail = ({ name, date, time, party, occasion }) => {
  const firstName = (name || 'friend').split(' ')[0];
  const partyLabel = party === 1 ? '1 guest' : `${party} guests`;

  const content = `
    <div style="padding:48px 40px 32px;text-align:center;border-bottom:1px solid #2e2820;">
      <div style="font-family:Georgia,serif;font-size:10px;letter-spacing:3px;color:#C9A84C;text-transform:uppercase;margin-bottom:12px;">— A Gentle Reminder —</div>
      <h1 style="margin:0;font-family:Georgia,serif;font-size:28px;font-weight:400;color:#F5F0E8;line-height:1.3;">We'll see you tomorrow,<br><em style="color:#C9A84C;">${firstName}.</em></h1>
      <p style="margin:16px 0 0;font-family:Georgia,serif;font-size:14px;color:#9C8E7A;line-height:1.7;">Your table is ready and we're preparing for your arrival.<br>Here are your booking details.</p>
    </div>

    <div style="padding:32px 40px;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        ${detailRow('Occasion', occasion || 'Reservation')}
        ${date ? detailRow('Date', fmtDate(date)) : ''}
        ${time ? detailRow('Time', time) : ''}
        ${detailRow('Party', partyLabel)}
        ${detailRow('Address', BRAND.address)}
      </table>
    </div>

    <div style="padding:0 40px 32px;">
      <div style="background:#8B1A2B;border-radius:4px;padding:20px 24px;text-align:center;">
        <p style="margin:0;font-family:Georgia,serif;font-size:13px;color:#F5F0E8;line-height:1.7;">Need to reschedule or make changes?<br>Call us at <strong style="color:#C9A84C;">08055238353 / 09030482774</strong> — we're happy to help.</p>
      </div>
    </div>

    <div style="padding:0 40px 40px;text-align:center;">
      <p style="margin:0;font-family:Georgia,serif;font-size:14px;color:#9C8E7A;line-height:1.8;">We look forward to an evening worth remembering.</p>
    </div>
  `;

  return shell({
    preheader: `A reminder — your table at BLACKROCK is tomorrow, ${fmtDate(date)} at ${time}.`,
    content,
  });
};

/* ── EMAIL 3: DAY-OF WELCOME ── */
exports.dayOfEmail = ({ name, date, time, party, occasion }) => {
  const firstName = (name || 'friend').split(' ')[0];
  const partyLabel = party === 1 ? '1 guest' : `${party} guests`;

  const content = `
    <div style="padding:48px 40px 32px;text-align:center;border-bottom:1px solid #2e2820;">
      <div style="font-family:Georgia,serif;font-size:10px;letter-spacing:3px;color:#C9A84C;text-transform:uppercase;margin-bottom:12px;">— Tonight —</div>
      <h1 style="margin:0;font-family:Georgia,serif;font-size:28px;font-weight:400;color:#F5F0E8;line-height:1.3;">Your table awaits tonight,<br><em style="color:#C9A84C;">${firstName}.</em></h1>
      <p style="margin:16px 0 0;font-family:Georgia,serif;font-size:14px;color:#9C8E7A;line-height:1.7;">Tonight is your night. We've been looking forward<br>to welcoming you all week.</p>
    </div>

    <div style="padding:32px 40px;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        ${occasion ? detailRow('Occasion', occasion) : ''}
        ${time ? detailRow('Time', time) : ''}
        ${detailRow('Party', partyLabel)}
        ${detailRow('Address', BRAND.address)}
      </table>
    </div>

    <div style="padding:0 40px 32px;">
      <div style="border:1px solid #2e2820;border-radius:4px;padding:20px 24px;">
        <p style="margin:0 0 8px;font-family:Georgia,serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#C9A84C;">Getting Here</p>
        <p style="margin:0;font-family:Georgia,serif;font-size:13px;color:#9C8E7A;line-height:1.7;">We're on Ajao Road, off Adeniyi Jones Road, Ikeja. There is parking available on-site. If you need directions, call us and we'll guide you in.</p>
      </div>
    </div>

    <div style="padding:0 40px 40px;text-align:center;">
      <p style="margin:0;font-family:Georgia,serif;font-size:15px;color:#F5F0E8;font-style:italic;line-height:1.7;">"The best evenings begin with the right table.<br>Yours is waiting."</p>
    </div>
  `;

  return shell({
    preheader: `Tonight's the night, ${firstName}. Your table at BLACKROCK is ready for ${time}.`,
    content,
  });
};

/* ── EMAIL 4: POST-DINING THANK YOU ── */
exports.thankYouEmail = ({ name, occasion }) => {
  const firstName = (name || 'friend').split(' ')[0];

  const content = `
    <div style="padding:48px 40px 32px;text-align:center;border-bottom:1px solid #2e2820;">
      <div style="font-family:Georgia,serif;font-size:10px;letter-spacing:3px;color:#C9A84C;text-transform:uppercase;margin-bottom:12px;">— Thank You —</div>
      <h1 style="margin:0;font-family:Georgia,serif;font-size:28px;font-weight:400;color:#F5F0E8;line-height:1.3;">It was a pleasure,<br><em style="color:#C9A84C;">${firstName}.</em></h1>
      <p style="margin:16px 0 0;font-family:Georgia,serif;font-size:14px;color:#9C8E7A;line-height:1.7;">Thank you for choosing BLACKROCK${occasion ? ` for your ${occasion.toLowerCase()}` : ''}.<br>We hope the evening was everything you imagined.</p>
    </div>

    <div style="padding:40px;text-align:center;border-bottom:1px solid #2e2820;">
      <p style="margin:0 0 24px;font-family:Georgia,serif;font-size:14px;color:#9C8E7A;line-height:1.8;">Your experience matters to us deeply. If you enjoyed your evening — or if anything fell short of what you expected — we'd love to hear from you.</p>

      <a href="${BRAND.googleReview}" style="display:inline-block;background:#C9A84C;color:#0f0d0a;font-family:Georgia,serif;font-size:11px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;text-decoration:none;padding:14px 32px;border-radius:2px;">Leave a Review</a>

      <p style="margin:24px 0 0;font-family:Georgia,serif;font-size:12px;color:#4a4440;line-height:1.6;">Your review helps other guests find us, and it helps us<br>keep getting better. Thank you.</p>
    </div>

    <div style="padding:32px 40px;">
      <div style="background:#0f0d0a;border-radius:4px;padding:24px;text-align:center;">
        <p style="margin:0 0 6px;font-family:Georgia,serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#C9A84C;">Ready for your next visit?</p>
        <p style="margin:0 0 16px;font-family:Georgia,serif;font-size:13px;color:#9C8E7A;">Your table is never far away.</p>
        <a href="https://blackrockrestaurantng.com/reservations" style="display:inline-block;border:1px solid #C9A84C;color:#C9A84C;font-family:Georgia,serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;text-decoration:none;padding:12px 28px;border-radius:2px;">Book Again</a>
      </div>
    </div>

    <div style="padding:0 40px 40px;text-align:center;">
      <p style="margin:0;font-family:Georgia,serif;font-size:13px;color:#9C8E7A;font-style:italic;line-height:1.8;">Until next time,<br><strong style="color:#F5F0E8;font-style:normal;">The BLACKROCK Team</strong></p>
    </div>
  `;

  return shell({
    preheader: `Thank you for dining with us, ${firstName}. We'd love to hear about your evening.`,
    content,
  });
};
