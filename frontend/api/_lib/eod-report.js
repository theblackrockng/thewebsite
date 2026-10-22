// Server-side EOD report builder (CommonJS). Mirrors the pure classifier/aggregator
// used by FrontDeskDisplay.jsx + EodHistory.jsx but exposes two renderers:
//   - buildEodEmailHtml()    : wide, email-safe HTML for Oluchi + Chef Oluchukwu
//   - buildEodKitchenText()  : plain text (HTML-escaped) for Chef Pius's Telegram
// Keep the classification sets in sync with frontend/src/pages/FrontDeskDisplay.jsx.

const EOD_MAIN_KITCHEN_CATEGORIES = new Set([
  'Starters', 'Salads', 'Rice', 'Pasta',
  'Bush Bar Kitchen', 'Continental', 'Sauces',
  'National Dishes', 'Traditional Specials',
  'BLACKROCK EXPERIENCE', 'Buffet', 'Packaging', 'Protein Section',
]);
const EOD_GRILL_KITCHEN_CATEGORIES = new Set(['Charcoal Grills']);
const EOD_GRILL_KITCHEN_ITEM_NAMES = new Set([
  'Naan Bread (Cheese)', 'Naan Bread (Garlic & Plain)',
]);
const EOD_DRINK_CATEGORIES = new Set([
  'Wines', 'Spirits', 'Beer & Cider', 'Cocktails',
  'Mocktails', 'Soft Drinks & Water', 'Hot Drinks', 'Fresh Juice',
]);

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fmtNaira(n) {
  return '₦' + Number(n || 0).toLocaleString('en-NG');
}

function classifyEodSection(item, menuCategoryMap) {
  if (EOD_GRILL_KITCHEN_ITEM_NAMES.has(item.item_name)) return 'Grill Kitchen';
  const sub = (menuCategoryMap && item.item_id && menuCategoryMap.get(item.item_id)) || null;
  if (sub && EOD_GRILL_KITCHEN_CATEGORIES.has(sub)) return 'Grill Kitchen';
  if (sub && EOD_DRINK_CATEGORIES.has(sub)) return 'Drinks';
  if (sub && EOD_MAIN_KITCHEN_CATEGORIES.has(sub)) return 'Main Kitchen';
  if (item.category === 'drink') return 'Drinks';
  return 'Main Kitchen';
}

function aggregateEod(completedOrders, menuCategoryMap) {
  const paidOrders = (completedOrders || []).filter(
    (o) => o.order_status === 'completed' && o.payment_status === 'paid'
  );
  const sectionAgg = {
    'Main Kitchen': new Map(),
    'Grill Kitchen': new Map(),
    'Drinks': new Map(),
  };
  for (const order of paidOrders) {
    for (const item of (order.order_items || [])) {
      if (item.voided) continue;
      const section = classifyEodSection(item, menuCategoryMap);
      const bucket = sectionAgg[section];
      const key = `${item.item_name}||${item.modifiers || ''}`;
      if (bucket.has(key)) {
        const row = bucket.get(key);
        row.qty += (item.qty || 0);
        row.total += (Number(item.line_total) || 0);
      } else {
        bucket.set(key, {
          name: item.item_name,
          modifier: item.modifiers || null,
          qty: item.qty || 0,
          unit_price: Number(item.unit_price) || 0,
          total: Number(item.line_total) || 0,
        });
      }
    }
  }
  const voidedAgg = new Map();
  for (const order of (completedOrders || [])) {
    if (order.order_status !== 'completed') continue;
    for (const item of (order.order_items || [])) {
      if (!item.voided) continue;
      const key = `${item.item_name}||${item.modifiers || ''}`;
      if (voidedAgg.has(key)) {
        const row = voidedAgg.get(key);
        row.qty += (item.qty || 0);
        row.total += (Number(item.line_total) || 0);
      } else {
        voidedAgg.set(key, {
          name: item.item_name,
          modifier: item.modifiers || null,
          qty: item.qty || 0,
          unit_price: Number(item.unit_price) || 0,
          total: Number(item.line_total) || 0,
        });
      }
    }
  }
  return { sectionAgg, voidedAgg, paidOrderCount: paidOrders.length };
}

function dateHeader(reportDate) {
  const d = reportDate ? new Date(`${reportDate}T12:00:00+01:00`) : new Date();
  return d.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Lagos',
  });
}

// Email-safe HTML — wide tables, inline styles, Gmail-friendly. One mode toggle:
// 'all' includes Drinks + Guest House + Grand Total; 'kitchen' omits them.
function buildEodEmailHtml(completedOrders, menuCategoryMap, bookings, mode, reportDate) {
  const kitchenOnly = mode === 'kitchen';
  const { sectionAgg, voidedAgg, paidOrderCount } = aggregateEod(completedOrders, menuCategoryMap);
  const dateStr = dateHeader(reportDate);

  const styles = {
    wrap:   'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;background:#faf8f5;padding:24px;max-width:720px;margin:0 auto',
    card:   'background:#ffffff;border:1px solid #e4dccd;border-radius:12px;padding:24px;margin-bottom:16px',
    h1:     'font-size:22px;letter-spacing:2px;font-weight:800;margin:0 0 4px;color:#1a1a1a',
    sub:    'font-size:13px;color:#7a6f60;margin:0 0 20px',
    secH:   'font-size:13px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#7a1c1c;margin:16px 0 8px;padding-top:12px;border-top:1px solid #e4dccd',
    tbl:    'width:100%;border-collapse:collapse;font-size:14px;margin-bottom:4px',
    th:     'text-align:left;padding:8px 10px;background:#f3eee6;color:#7a6f60;font-size:12px;letter-spacing:0.4px;text-transform:uppercase;font-weight:700;border-bottom:1px solid #e4dccd',
    thR:    'text-align:right;padding:8px 10px;background:#f3eee6;color:#7a6f60;font-size:12px;letter-spacing:0.4px;text-transform:uppercase;font-weight:700;border-bottom:1px solid #e4dccd',
    td:     'padding:8px 10px;border-bottom:1px solid #f3eee6;vertical-align:top',
    tdR:    'padding:8px 10px;border-bottom:1px solid #f3eee6;text-align:right;white-space:nowrap',
    sub1:   'padding:10px 10px;border-top:1px solid #e4dccd;font-weight:700;font-style:italic;color:#1a1a1a',
    sub1R:  'padding:10px 10px;border-top:1px solid #e4dccd;text-align:right;white-space:nowrap;font-weight:700;color:#1a1a1a',
    grand:  'padding:14px 10px;border-top:2px solid #c8a96e;background:#faf3e4;font-size:17px;font-weight:800;color:#1a1a1a',
    grandR: 'padding:14px 10px;border-top:2px solid #c8a96e;background:#faf3e4;text-align:right;white-space:nowrap;font-size:17px;font-weight:800;color:#1a1a1a',
    empty:  'padding:24px 0;text-align:center;color:#7a6f60;font-style:italic',
    foot:   'margin:20px 0 0;font-size:12px;color:#7a6f60;text-align:center',
  };

  function sectionBlock(title, agg) {
    const rows = [...agg.values()].sort((a, b) => a.name.localeCompare(b.name));
    if (rows.length === 0) return '';
    let body = '';
    for (const r of rows) {
      const label = r.modifier ? `${esc(r.name)} <span style="color:#7a6f60;font-size:12px">(${esc(r.modifier)})</span>` : esc(r.name);
      body += `<tr><td style="${styles.td}">${label}</td><td style="${styles.tdR}">${r.qty}</td><td style="${styles.tdR}">${esc(fmtNaira(r.unit_price))}</td><td style="${styles.tdR}">${esc(fmtNaira(r.total))}</td></tr>`;
    }
    const subtotal = rows.reduce((s, r) => s + r.total, 0);
    return `
<div style="${styles.secH}">${esc(title)}</div>
<table style="${styles.tbl}">
  <thead><tr><th style="${styles.th}">Item</th><th style="${styles.thR}">Qty</th><th style="${styles.thR}">Unit</th><th style="${styles.thR}">Total</th></tr></thead>
  <tbody>${body}
    <tr><td style="${styles.sub1}" colspan="3">${esc(title)} Subtotal</td><td style="${styles.sub1R}">${esc(fmtNaira(subtotal))}</td></tr>
  </tbody>
</table>`;
  }

  function voidedBlock(agg) {
    const rows = [...agg.values()].sort((a, b) => a.name.localeCompare(b.name));
    if (rows.length === 0) return '';
    let body = '';
    for (const r of rows) {
      const label = r.modifier ? `${esc(r.name)} <span style="color:#7a6f60;font-size:12px">(${esc(r.modifier)})</span>` : esc(r.name);
      body += `<tr><td style="${styles.td}">${label}</td><td style="${styles.tdR}">${r.qty}</td><td style="${styles.tdR}">${esc(fmtNaira(r.unit_price))}</td><td style="${styles.tdR}">${esc(fmtNaira(r.total))}</td></tr>`;
    }
    const subtotal = rows.reduce((s, r) => s + r.total, 0);
    return `
<div style="${styles.secH}">Voided Items</div>
<table style="${styles.tbl}">
  <thead><tr><th style="${styles.th}">Item</th><th style="${styles.thR}">Qty</th><th style="${styles.thR}">Unit</th><th style="${styles.thR}">Total</th></tr></thead>
  <tbody>${body}
    <tr><td style="${styles.sub1}" colspan="3">Voided Subtotal (not counted)</td><td style="${styles.sub1R}">${esc(fmtNaira(subtotal))}</td></tr>
  </tbody>
</table>`;
  }

  function guesthouseBlock(bks) {
    const rows = [...(bks || [])].sort(
      (a, b) => String(a.room_number || '').localeCompare(String(b.room_number || ''))
    );
    if (rows.length === 0) return '';
    let body = '';
    let paidSum = 0;
    for (const b of rows) {
      const total = Number(b.total_amount || 0);
      const paid = b.payment_status === 'paid';
      if (paid) paidSum += total;
      body += `<tr><td style="${styles.td}">Room ${esc(b.room_number || '?')} &middot; ${esc(b.guest_name || '')}</td><td style="${styles.tdR}">${esc(String(b.nights || ''))}n</td><td style="${styles.tdR}">${paid ? 'PAID' : 'UNPAID'}</td><td style="${styles.tdR}">${esc(fmtNaira(total))}</td></tr>`;
    }
    return `
<div style="${styles.secH}">Guest House</div>
<table style="${styles.tbl}">
  <thead><tr><th style="${styles.th}">Room / Guest</th><th style="${styles.thR}">Nts</th><th style="${styles.thR}">Pay</th><th style="${styles.thR}">Total</th></tr></thead>
  <tbody>${body}
    <tr><td style="${styles.sub1}" colspan="3">Guest House Subtotal (paid)</td><td style="${styles.sub1R}">${esc(fmtNaira(paidSum))}</td></tr>
  </tbody>
</table>`;
  }

  const mainKitchen  = sectionBlock('Main Kitchen', sectionAgg['Main Kitchen']);
  const grillKitchen = sectionBlock('Grill Kitchen', sectionAgg['Grill Kitchen']);
  const drinks       = kitchenOnly ? '' : sectionBlock('Drinks', sectionAgg['Drinks']);
  const guesthouse   = kitchenOnly ? '' : guesthouseBlock(bookings);
  const voided       = voidedBlock(voidedAgg);

  const foodTotal =
    [...sectionAgg['Main Kitchen'].values()].reduce((s, r) => s + r.total, 0)
    + [...sectionAgg['Grill Kitchen'].values()].reduce((s, r) => s + r.total, 0);
  const drinkTotal = [...sectionAgg['Drinks'].values()].reduce((s, r) => s + r.total, 0);
  const guesthousePaidTotal = (bookings || [])
    .filter((b) => b.payment_status === 'paid')
    .reduce((s, b) => s + Number(b.total_amount || 0), 0);
  const grandTotal = foodTotal + (kitchenOnly ? 0 : drinkTotal + guesthousePaidTotal);

  const anyContent = mainKitchen || grillKitchen || drinks || guesthouse || voided;
  const emptyBlock = anyContent ? '' : `<div style="${styles.empty}">No activity on this date.</div>`;

  const grandBlock = kitchenOnly ? '' : `
<table style="${styles.tbl}">
  <tr><td style="${styles.grand}">Grand Total</td><td style="${styles.grandR}">${esc(fmtNaira(grandTotal))}</td></tr>
</table>
<div style="${styles.foot}">${esc(String(paidOrderCount))} completed order${paidOrderCount !== 1 ? 's' : ''} included</div>`;

  const title = kitchenOnly ? 'Kitchen End of Day' : 'End of Day Sales Report';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>${esc(title)} &middot; ${esc(dateStr)}</title></head>
<body style="margin:0;background:#faf8f5">
<div style="${styles.wrap}">
  <div style="${styles.card}">
    <h1 style="${styles.h1}">BLACKROCK</h1>
    <p style="${styles.sub}">${esc(title)} &middot; ${esc(dateStr)}</p>
    ${mainKitchen}${grillKitchen}${drinks}${guesthouse}${voided}${emptyBlock}${grandBlock}
  </div>
  <div style="${styles.foot}">Automated by the 6am EOD cron. Manage recipients in the admin console.</div>
</div>
</body>
</html>`;
}

// Telegram-ready text (parse_mode=HTML). mode='kitchen' omits Drinks/Guest
// House/Grand Total so Chef Pius only sees what the kitchen cooked.
function buildEodText(completedOrders, menuCategoryMap, bookings, mode, reportDate) {
  const kitchenOnly = mode === 'kitchen';
  const { sectionAgg, voidedAgg, paidOrderCount } = aggregateEod(completedOrders, menuCategoryMap);
  const dateStr = dateHeader(reportDate);

  function section(title, agg) {
    const rows = [...agg.values()].sort((a, b) => a.name.localeCompare(b.name));
    if (rows.length === 0) return '';
    let body = `\n<b>${esc(title)}</b>`;
    for (const r of rows) {
      const label = r.modifier ? `${r.name} (${r.modifier})` : r.name;
      body += `\n  ${r.qty} x ${esc(label)}`;
    }
    const subtotal = rows.reduce((s, r) => s + r.total, 0);
    body += `\n  <i>Subtotal: ${esc(fmtNaira(subtotal))}</i>`;
    return body;
  }

  function voidedBlock(agg) {
    const rows = [...agg.values()].sort((a, b) => a.name.localeCompare(b.name));
    if (rows.length === 0) return '';
    let body = `\n<b>Voided</b>`;
    for (const r of rows) {
      const label = r.modifier ? `${r.name} (${r.modifier})` : r.name;
      body += `\n  ${r.qty} x ${esc(label)}`;
    }
    const subtotal = rows.reduce((s, r) => s + r.total, 0);
    body += `\n  <i>Voided subtotal: ${esc(fmtNaira(subtotal))} (not counted)</i>`;
    return body;
  }

  function guesthouseBlock(bks) {
    const rows = [...(bks || [])].sort(
      (a, b) => String(a.room_number || '').localeCompare(String(b.room_number || ''))
    );
    if (rows.length === 0) return '';
    let body = `\n<b>Guest House</b>`;
    let paidSum = 0;
    for (const b of rows) {
      const total = Number(b.total_amount || 0);
      const paid = b.payment_status === 'paid';
      if (paid) paidSum += total;
      body += `\n  Rm ${esc(b.room_number || '?')} · ${esc(b.guest_name || '')} · ${esc(String(b.nights || ''))}n · ${paid ? 'PAID' : 'UNPAID'} · ${esc(fmtNaira(total))}`;
    }
    body += `\n  <i>Guest House subtotal (paid): ${esc(fmtNaira(paidSum))}</i>`;
    return body;
  }

  const mainKitchen  = section('Main Kitchen',  sectionAgg['Main Kitchen']);
  const grillKitchen = section('Grill Kitchen', sectionAgg['Grill Kitchen']);
  const drinks       = kitchenOnly ? '' : section('Drinks', sectionAgg['Drinks']);
  const guesthouse   = kitchenOnly ? '' : guesthouseBlock(bookings);
  const voided       = voidedBlock(voidedAgg);

  const foodTotal =
    [...sectionAgg['Main Kitchen'].values()].reduce((s, r) => s + r.total, 0)
    + [...sectionAgg['Grill Kitchen'].values()].reduce((s, r) => s + r.total, 0);
  const drinkTotal = [...sectionAgg['Drinks'].values()].reduce((s, r) => s + r.total, 0);
  const guesthousePaidTotal = (bookings || [])
    .filter((b) => b.payment_status === 'paid')
    .reduce((s, b) => s + Number(b.total_amount || 0), 0);
  const grandTotal = foodTotal + (kitchenOnly ? 0 : drinkTotal + guesthousePaidTotal);

  const anyContent = mainKitchen || grillKitchen || drinks || guesthouse || voided;
  const body = anyContent
    ? `${mainKitchen}${grillKitchen}${drinks}${guesthouse}${voided}`
    : `\n<i>No activity on this date.</i>`;
  const totalBlock = kitchenOnly ? '' : `\n\n<b>Grand Total: ${esc(fmtNaira(grandTotal))}</b>\n<i>${paidOrderCount} completed order${paidOrderCount !== 1 ? 's' : ''}</i>`;

  const title = kitchenOnly ? 'Kitchen End of Day' : 'End of Day Report';
  return `<b>BLACKROCK — ${esc(title)}</b>\n${esc(dateStr)}\n${body}${totalBlock}`;
}

module.exports = {
  EOD_MAIN_KITCHEN_CATEGORIES,
  EOD_GRILL_KITCHEN_CATEGORIES,
  EOD_GRILL_KITCHEN_ITEM_NAMES,
  EOD_DRINK_CATEGORIES,
  classifyEodSection,
  aggregateEod,
  buildEodEmailHtml,
  buildEodText,
};
