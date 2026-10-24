// Server-side EOD report builder (CommonJS). Mirrors the pure classifier/aggregator
// used by FrontDeskDisplay.jsx + EodHistory.jsx but exposes two renderers:
//   - buildEodEmailHtml()    : wide, email-safe HTML for the manager email list
//   - buildEodKitchenText()  : plain text (HTML-escaped) for Telegram recipients
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
  const discounts = [];
  let totalDiscount = 0;
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
    const amt = Number(order.discount_amount) || 0;
    if (amt > 0) {
      totalDiscount += amt;
      discounts.push({
        ref: order.order_number || (order.table_number ? `Table ${order.table_number}` : (order.id ? String(order.id).slice(0, 8) : '')),
        amount: amt,
        by: order.discount_by_name || null,
        reason: order.discount_reason || null,
      });
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
  return { sectionAgg, voidedAgg, discounts, totalDiscount, paidOrderCount: paidOrders.length };
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
  const { sectionAgg, voidedAgg, discounts, totalDiscount, paidOrderCount } = aggregateEod(completedOrders, menuCategoryMap);
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

  function discountsBlock() {
    if (!discounts || discounts.length === 0) return '';
    let body = '';
    for (const d of discounts) {
      const meta = [d.by ? `by ${d.by}` : '', d.reason].filter(Boolean).join(' · ');
      const label = `${esc(d.ref || 'Order')}${meta ? ` <span style="color:#7a6f60;font-size:12px">(${esc(meta)})</span>` : ''}`;
      body += `<tr><td style="${styles.td}">${label}</td><td style="${styles.tdR}">- ${esc(fmtNaira(d.amount))}</td></tr>`;
    }
    return `
<div style="${styles.secH}">Discounts Given</div>
<table style="${styles.tbl}">
  <thead><tr><th style="${styles.th}">Order</th><th style="${styles.thR}">Amount Off</th></tr></thead>
  <tbody>${body}
    <tr><td style="${styles.sub1}">Total Discounts</td><td style="${styles.sub1R}">- ${esc(fmtNaira(totalDiscount))}</td></tr>
  </tbody>
</table>`;
  }

  const mainKitchen  = sectionBlock('Main Kitchen', sectionAgg['Main Kitchen']);
  const grillKitchen = sectionBlock('Grill Kitchen', sectionAgg['Grill Kitchen']);
  const drinks       = kitchenOnly ? '' : sectionBlock('Drinks', sectionAgg['Drinks']);
  const guesthouse   = kitchenOnly ? '' : guesthouseBlock(bookings);
  const voided       = voidedBlock(voidedAgg);
  const discountsHtml = kitchenOnly ? '' : discountsBlock();

  const foodTotal =
    [...sectionAgg['Main Kitchen'].values()].reduce((s, r) => s + r.total, 0)
    + [...sectionAgg['Grill Kitchen'].values()].reduce((s, r) => s + r.total, 0);
  const drinkTotal = [...sectionAgg['Drinks'].values()].reduce((s, r) => s + r.total, 0);
  const guesthousePaidTotal = (bookings || [])
    .filter((b) => b.payment_status === 'paid')
    .reduce((s, b) => s + Number(b.total_amount || 0), 0);
  const gross = foodTotal + (kitchenOnly ? 0 : drinkTotal + guesthousePaidTotal);
  const discountForTotal = kitchenOnly ? 0 : totalDiscount;
  const grandTotal = Math.max(0, gross - discountForTotal);

  const anyContent = mainKitchen || grillKitchen || drinks || guesthouse || voided || discountsHtml;
  const emptyBlock = anyContent ? '' : `<div style="${styles.empty}">No activity on this date.</div>`;

  const grandBlock = kitchenOnly ? '' : `
<table style="${styles.tbl}">
  ${discountForTotal > 0 ? `<tr><td style="${styles.sub1}">Gross (before discounts)</td><td style="${styles.sub1R}">${esc(fmtNaira(gross))}</td></tr>
  <tr><td style="${styles.sub1}">Discounts Applied</td><td style="${styles.sub1R}">- ${esc(fmtNaira(discountForTotal))}</td></tr>` : ''}
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
    ${mainKitchen}${grillKitchen}${drinks}${guesthouse}${discountsHtml}${voided}${emptyBlock}${grandBlock}
  </div>
  <div style="${styles.foot}">Automated by the 6am EOD cron. Manage recipients in the admin console.</div>
</div>
</body>
</html>`;
}

// Telegram-ready text (parse_mode=HTML). mode='kitchen' omits Drinks/Guest
// House/Grand Total so the kitchen only sees what it cooked.
function buildEodText(completedOrders, menuCategoryMap, bookings, mode, reportDate) {
  const kitchenOnly = mode === 'kitchen';
  const { sectionAgg, voidedAgg, discounts, totalDiscount, paidOrderCount } = aggregateEod(completedOrders, menuCategoryMap);
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

  function discountsText() {
    if (!discounts || discounts.length === 0) return '';
    let body = `\n<b>Discounts Given</b>`;
    for (const d of discounts) {
      const meta = [d.by ? `by ${d.by}` : '', d.reason].filter(Boolean).join(' · ');
      body += `\n  ${esc(d.ref || 'Order')}${meta ? ` (${esc(meta)})` : ''}: -${esc(fmtNaira(d.amount))}`;
    }
    body += `\n  <i>Total discounts: -${esc(fmtNaira(totalDiscount))}</i>`;
    return body;
  }

  const mainKitchen  = section('Main Kitchen',  sectionAgg['Main Kitchen']);
  const grillKitchen = section('Grill Kitchen', sectionAgg['Grill Kitchen']);
  const drinks       = kitchenOnly ? '' : section('Drinks', sectionAgg['Drinks']);
  const guesthouse   = kitchenOnly ? '' : guesthouseBlock(bookings);
  const voided       = voidedBlock(voidedAgg);
  const discountsBlk = kitchenOnly ? '' : discountsText();

  const foodTotal =
    [...sectionAgg['Main Kitchen'].values()].reduce((s, r) => s + r.total, 0)
    + [...sectionAgg['Grill Kitchen'].values()].reduce((s, r) => s + r.total, 0);
  const drinkTotal = [...sectionAgg['Drinks'].values()].reduce((s, r) => s + r.total, 0);
  const guesthousePaidTotal = (bookings || [])
    .filter((b) => b.payment_status === 'paid')
    .reduce((s, b) => s + Number(b.total_amount || 0), 0);
  const gross = foodTotal + (kitchenOnly ? 0 : drinkTotal + guesthousePaidTotal);
  const discountForTotal = kitchenOnly ? 0 : totalDiscount;
  const grandTotal = Math.max(0, gross - discountForTotal);

  const anyContent = mainKitchen || grillKitchen || drinks || guesthouse || voided || discountsBlk;
  const body = anyContent
    ? `${mainKitchen}${grillKitchen}${drinks}${guesthouse}${discountsBlk}${voided}`
    : `\n<i>No activity on this date.</i>`;
  const grossLine = discountForTotal > 0
    ? `\n<i>Gross: ${esc(fmtNaira(gross))} · Discounts: -${esc(fmtNaira(discountForTotal))}</i>`
    : '';
  const totalBlock = kitchenOnly ? '' : `\n${grossLine}\n<b>Grand Total: ${esc(fmtNaira(grandTotal))}</b>\n<i>${paidOrderCount} completed order${paidOrderCount !== 1 ? 's' : ''}</i>`;

  const title = kitchenOnly ? 'Kitchen End of Day' : 'End of Day Report';
  return `<b>BLACKROCK — ${esc(title)}</b>\n${esc(dateStr)}\n${body}${totalBlock}`;
}

// 30-day consolidated digest. Called by the cron when 30+ snapshots have piled
// up: builds one email-safe HTML page with a per-day section + a grand summary,
// then the caller purges the included rows.
// archives: [{ report_date, snapshot: { completedOrders, bookings } }, ...] sorted ascending by date.
function buildEodMonthlyDigestHtml(archives, menuCategoryMap) {
  const styles = {
    wrap:   'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;background:#faf8f5;padding:24px;max-width:720px;margin:0 auto',
    card:   'background:#ffffff;border:1px solid #e4dccd;border-radius:12px;padding:24px;margin-bottom:16px',
    h1:     'font-size:22px;letter-spacing:2px;font-weight:800;margin:0 0 4px;color:#1a1a1a',
    sub:    'font-size:13px;color:#7a6f60;margin:0 0 20px',
    overH:  'font-size:12px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#7a1c1c;margin:4px 0 10px',
    overTbl:'width:100%;border-collapse:collapse;font-size:13px;margin-bottom:18px;background:#faf3e4;border:1px solid #e4dccd;border-radius:8px;overflow:hidden',
    overTd: 'padding:10px 12px;color:#1a1a1a',
    overTdR:'padding:10px 12px;color:#1a1a1a;text-align:right;font-weight:700;white-space:nowrap',
    dayH:   'font-size:16px;font-weight:800;color:#1a1a1a;margin:28px 0 6px;padding-top:16px;border-top:2px solid #c8a96e',
    dayMeta:'font-size:12px;color:#7a6f60;margin:0 0 10px',
    tbl:    'width:100%;border-collapse:collapse;font-size:13px;margin-bottom:4px',
    th:     'text-align:left;padding:7px 10px;background:#f3eee6;color:#7a6f60;font-size:11px;letter-spacing:0.4px;text-transform:uppercase;font-weight:700;border-bottom:1px solid #e4dccd',
    thR:    'text-align:right;padding:7px 10px;background:#f3eee6;color:#7a6f60;font-size:11px;letter-spacing:0.4px;text-transform:uppercase;font-weight:700;border-bottom:1px solid #e4dccd',
    td:     'padding:7px 10px;border-bottom:1px solid #f3eee6;color:#1a1a1a',
    tdR:    'padding:7px 10px;border-bottom:1px solid #f3eee6;text-align:right;white-space:nowrap;color:#1a1a1a',
    dayTot: 'padding:9px 10px;border-top:1px solid #c8a96e;background:#faf3e4;font-weight:800;color:#1a1a1a',
    dayTotR:'padding:9px 10px;border-top:1px solid #c8a96e;background:#faf3e4;text-align:right;white-space:nowrap;font-weight:800;color:#1a1a1a',
    quiet:  'padding:14px 0;color:#7a6f60;font-style:italic;font-size:12.5px',
    foot:   'margin:20px 0 0;font-size:12px;color:#7a6f60;text-align:center',
  };

  function dayLabel(reportDate) {
    const d = new Date(`${reportDate}T12:00:00+01:00`);
    return d.toLocaleDateString('en-GB', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos',
    });
  }

  const days = [];
  let grandFood = 0, grandDrinks = 0, grandGuest = 0, grandDiscount = 0, grandOrders = 0, grandBookings = 0;

  for (const a of (archives || [])) {
    const snap = a.snapshot || {};
    const completedOrders = snap.completedOrders || [];
    const bookings = snap.bookings || [];
    const { sectionAgg, totalDiscount, paidOrderCount } = aggregateEod(completedOrders, menuCategoryMap);

    const main  = [...sectionAgg['Main Kitchen'].values()].reduce((s, r) => s + r.total, 0);
    const grill = [...sectionAgg['Grill Kitchen'].values()].reduce((s, r) => s + r.total, 0);
    const drinks = [...sectionAgg['Drinks'].values()].reduce((s, r) => s + r.total, 0);
    const guestPaid = (bookings || [])
      .filter((b) => b.payment_status === 'paid')
      .reduce((s, b) => s + Number(b.total_amount || 0), 0);
    const foodTotal = main + grill;
    const dayDiscount = Number(totalDiscount) || 0;
    const dayTotal = Math.max(0, foodTotal + drinks + guestPaid - dayDiscount);

    grandFood += foodTotal;
    grandDrinks += drinks;
    grandGuest += guestPaid;
    grandDiscount += dayDiscount;
    grandOrders += paidOrderCount;
    grandBookings += bookings.length;

    const quiet = foodTotal === 0 && drinks === 0 && guestPaid === 0;
    days.push({
      report_date: a.report_date,
      label: dayLabel(a.report_date),
      foodTotal, drinks, guestPaid, discount: dayDiscount, dayTotal, paidOrderCount, bookingCount: bookings.length, quiet,
    });
  }

  const first = days[0]?.report_date;
  const last  = days[days.length - 1]?.report_date;
  const rangeLabel = (first && last)
    ? `${dayLabel(first)} — ${dayLabel(last)}`
    : (first || 'No archives');
  const grandTotal = Math.max(0, grandFood + grandDrinks + grandGuest - grandDiscount);

  const overview = `
<div style="${styles.overH}">30-Day Summary</div>
<table style="${styles.overTbl}">
  <tr><td style="${styles.overTd}">Days covered</td><td style="${styles.overTdR}">${days.length}</td></tr>
  <tr><td style="${styles.overTd}">Paid orders (food &amp; drink)</td><td style="${styles.overTdR}">${grandOrders}</td></tr>
  <tr><td style="${styles.overTd}">Guest House bookings</td><td style="${styles.overTdR}">${grandBookings}</td></tr>
  <tr><td style="${styles.overTd}">Food subtotal</td><td style="${styles.overTdR}">${esc(fmtNaira(grandFood))}</td></tr>
  <tr><td style="${styles.overTd}">Drinks subtotal</td><td style="${styles.overTdR}">${esc(fmtNaira(grandDrinks))}</td></tr>
  <tr><td style="${styles.overTd}">Guest House (paid)</td><td style="${styles.overTdR}">${esc(fmtNaira(grandGuest))}</td></tr>
  ${grandDiscount > 0 ? `<tr><td style="${styles.overTd}">Discounts applied</td><td style="${styles.overTdR}">- ${esc(fmtNaira(grandDiscount))}</td></tr>` : ''}
  <tr><td style="${styles.overTd};font-weight:800;font-size:14px">Grand total</td><td style="${styles.overTdR};font-size:15px">${esc(fmtNaira(grandTotal))}</td></tr>
</table>`;

  let perDay = '';
  for (const d of days) {
    if (d.quiet) {
      perDay += `
<div style="${styles.dayH}">${esc(d.label)}</div>
<div style="${styles.quiet}">No completed sales recorded on this day.</div>`;
      continue;
    }
    perDay += `
<div style="${styles.dayH}">${esc(d.label)}</div>
<div style="${styles.dayMeta}">${d.paidOrderCount} paid order${d.paidOrderCount !== 1 ? 's' : ''}${d.bookingCount ? ` &middot; ${d.bookingCount} booking${d.bookingCount !== 1 ? 's' : ''}` : ''}</div>
<table style="${styles.tbl}">
  <thead><tr><th style="${styles.th}">Line</th><th style="${styles.thR}">Total</th></tr></thead>
  <tbody>
    <tr><td style="${styles.td}">Food (Main + Grill)</td><td style="${styles.tdR}">${esc(fmtNaira(d.foodTotal))}</td></tr>
    <tr><td style="${styles.td}">Drinks</td><td style="${styles.tdR}">${esc(fmtNaira(d.drinks))}</td></tr>
    <tr><td style="${styles.td}">Guest House (paid)</td><td style="${styles.tdR}">${esc(fmtNaira(d.guestPaid))}</td></tr>
    ${d.discount > 0 ? `<tr><td style="${styles.td}">Discounts applied</td><td style="${styles.tdR}">- ${esc(fmtNaira(d.discount))}</td></tr>` : ''}
    <tr><td style="${styles.dayTot}">Day total</td><td style="${styles.dayTotR}">${esc(fmtNaira(d.dayTotal))}</td></tr>
  </tbody>
</table>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>BLACKROCK &middot; 30-Day Sales Summary</title></head>
<body style="margin:0;background:#faf8f5">
<div style="${styles.wrap}">
  <div style="${styles.card}">
    <h1 style="${styles.h1}">BLACKROCK</h1>
    <p style="${styles.sub}">30-Day Sales Summary &middot; ${esc(rangeLabel)}</p>
    ${overview}
    ${perDay}
  </div>
  <div style="${styles.foot}">Daily snapshots for this period are now archived off the server. Keep this email for records.</div>
</div>
</body>
</html>`;
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
  buildEodMonthlyDigestHtml,
};
