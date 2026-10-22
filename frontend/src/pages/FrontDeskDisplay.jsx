import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { authHeader } from "../lib/staffAuth";
import StaffLoginGate, { useStaffSession } from "../components/StaffLoginGate";
import { UtensilsCrossed, Package, Truck, RefreshCw, LogOut, Sun, Moon, Volume2, VolumeX, Wifi, WifiOff, X, CalendarDays, Phone, Users, Printer, Wine, Plus, Minus, Search, Lock, Trash2, Edit2, BedDouble, KeyRound, LogIn as LogInIcon, ChefHat, History } from "lucide-react";
import { MENU } from "../lib/data";

const FRONT_DESK_ROLES = ["front_desk", "manager"];

const ORDERS_API       = "/api/front-desk?resource=orders";
const RESERVATIONS_API = "/api/front-desk?resource=reservations";
const WAITER_CALLS_API = "/api/front-desk?resource=waiter-calls";

const POLL_MS = 15000;
const FLASH_MS = 45000;
const SESSION_CHECK_MS = 120000;
const SESSION_MARGIN_MS = 300000;
const WAKE_GAP_MS = 30000;
const ALERT_REPEAT_MS = 15000;
const REPROBE_MS = 600000;
const ACTIVE_STATUSES = ["new", "confirmed", "preparing", "ready"];

const GOLD = "#c8a96e";
const BURGUNDY = "#7a1c1c";

const THEMES = {
  light: { bg: "#faf8f5", card: "#ffffff", cardHead: "#f3eee6", border: "#e4dccd", text: "#1a1a1a", muted: "#7a6f60", gold: GOLD, accent: BURGUNDY, onGold: "#1a1a1a", input: "#ffffff" },
  dark:  { bg: "#1a1a1a", card: "#242220", cardHead: "#2c2926", border: "#3a352e", text: "#f5f0e8", muted: "#a89a84", gold: GOLD, accent: "#d05a5a", onGold: "#1a1a1a", input: "#2c2926" },
};

const STATUS_CFG = {
  new:       { label: "New",       color: "#d97706" },
  confirmed: { label: "Confirmed", color: "#3b82f6" },
  preparing: { label: "Preparing", color: "#8b5cf6" },
  ready:     { label: "Ready",     color: "#16a34a" },
  completed: { label: "Completed", color: "#6b7280" },
  cancelled: { label: "Cancelled", color: "#dc2626" },
};

const PAYMENT_CFG = {
  awaiting_proof: { label: "Awaiting Proof",  color: "#d97706" },
  proof_received: { label: "Proof Received",  color: "#3b82f6" },
  paid:           { label: "Paid",            color: "#16a34a" },
  pay_on_arrival: { label: "Pay on Arrival",  color: "#d97706" },
  bank_transfer:  { label: "Bank Transfer",   color: "#d97706" },
  pending:        { label: "Pending",         color: "#6b7280" },
  failed:         { label: "Payment Failed",  color: "#dc2626" },
};

const TABS = [
  { key: "all",    label: "All Orders" },
  { key: "table",  label: "Table Orders" },
  { key: "online", label: "Online Orders" },
  { key: "completed", label: "Completed Today" },
];

const STAT_KEYS = ["new", "confirmed", "preparing", "ready", "completed"];

const RES_STATUS_CFG = {
  pending:     { label: "Pending",     color: "#d97706" },
  confirmed:   { label: "Confirmed",   color: "#16a34a" },
  rescheduled: { label: "Rescheduled", color: "#8b5cf6" },
  cancelled:   { label: "Cancelled",   color: "#dc2626" },
};

const RES_TABS = [
  { key: "today",    label: "Today" },
  { key: "upcoming", label: "Upcoming" },
  { key: "pending",  label: "Pending" },
  { key: "past",     label: "Past 7 Days" },
];

const RES_STATS = [
  { key: "pending",   label: "Pending",   color: "#d97706", opens: "pending" },
  { key: "confirmed", label: "Confirmed", color: "#16a34a" },
  { key: "today",     label: "Today",     color: GOLD,      opens: "today" },
];

function fmtPrice(n) {
  return `₦${Number(n || 0).toLocaleString("en-NG")}`;
}

function fmtClock(d) {
  return d.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function fmtSeconds(d) {
  return d.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
}

function timeSince(iso, now) {
  if (!iso) return "";
  const m = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h}h ${rem}m ago` : `${h}h ago`;
}

// Lagos is UTC+1 all year with no daylight saving, so midnight there is a fixed offset.
function startOfToday() {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return new Date(`${ymd}T00:00:00+01:00`).getTime();
}

function fmtLagosTime(iso) {
  return new Date(iso).toLocaleTimeString("en-NG", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit", hour12: true });
}

// Orders completed from the console do not set completed_at, so fall back to the
// placed date for those. Without the column at all, use the placed date alone.
function completedTodayFilter(hasColumn) {
  const start = new Date(startOfToday()).toISOString();
  return hasColumn
    ? `completed_at.gte.${start},and(completed_at.is.null,created_at.gte.${start})`
    : `created_at.gte.${start}`;
}

function completionInfo(order) {
  return order.completed_at ? { iso: order.completed_at, known: true } : { iso: order.created_at, known: false };
}

function lagosToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function fmtResDate(date, today) {
  if (date === today) return "Today";
  const d = new Date(`${date}T12:00:00Z`);
  const tomorrow = new Date(`${today}T12:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  if (d.getTime() === tomorrow.getTime()) return "Tomorrow";
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

function fmtResTime(t) {
  if (!t) return "No time";
  if (/[AaPp][Mm]/.test(t)) return t.trim();
  const [h, m] = t.split(":");
  const hr = parseInt(h, 10);
  return `${hr > 12 ? hr - 12 : hr || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
}

function fmtOccasion(o) {
  return o.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function isTouchDevice() {
  try { return window.matchMedia("(pointer: coarse)").matches; } catch { return false; }
}

function isOpenPending(r, today) {
  return r.status === "pending" && r.date >= today;
}

const audio = { ctx: null, muted: false };

function unlockAudio() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return false;
  if (!audio.ctx) audio.ctx = new Ctx();
  audio.ctx.resume();
  return true;
}

function playTones(list) {
  const ctx = audio.ctx;
  if (!ctx || ctx.state !== "running" || audio.muted) return;
  try {
    list.forEach(({ freq, at, len, vol, type }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + at;
      osc.type = type || "sine";
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(vol, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + len);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + len + 0.05);
    });
  } catch {}
}

function playChime() {
  playTones([{ freq: 660, at: 0, len: 0.6, vol: 0.18 }, { freq: 880, at: 0.22, len: 0.6, vol: 0.18 }]);
}

function playAlert() {
  playTones([
    { freq: 880, at: 0, len: 0.3, vol: 0.35, type: "square" },
    { freq: 660, at: 0.4, len: 0.3, vol: 0.35, type: "square" },
    { freq: 880, at: 0.8, len: 0.3, vol: 0.35, type: "square" },
    { freq: 660, at: 1.2, len: 0.3, vol: 0.35, type: "square" },
  ]);
}

function playReadyChime() {
  playTones([
    { freq: 784, at: 0,    len: 0.5, vol: 0.28, type: "triangle" },
    { freq: 659, at: 0.22, len: 0.5, vol: 0.28, type: "triangle" },
    { freq: 523, at: 0.44, len: 0.6, vol: 0.28, type: "triangle" },
  ]);
}

// "ok": signed in with a token good for a while. "offline": could not reach the
// auth server, so keep going. "lost": there is no session that can be recovered.
async function ensureSession(force = false) {
  try {
    const { data } = await supabase.auth.getSession();
    const session = data?.session;
    if (session && !force && session.expires_at * 1000 - Date.now() > SESSION_MARGIN_MS) return "ok";
    const { data: refreshed, error } = await supabase.auth.refreshSession();
    if (!error && refreshed?.session) return "ok";
    if (error?.name === "AuthRetryableFetchError") return "offline";
    return "lost";
  } catch {
    return "offline";
  }
}

// Resolves to the Response, "lost" when the sign-in cannot be recovered, or
// "offline" when a 401 could not be refreshed because the network is down.
async function apiRequest(url, method, body) {
  const send = async () => fetch(url, {
    method,
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if ((await ensureSession()) === "lost") return "lost";
  let res = await send();
  if (res.status === 401) {
    const recovered = await ensureSession(true);
    if (recovered === "lost") return "lost";
    if (recovered === "offline") return "offline";
    res = await send();
    if (res.status === 401) return "lost";
  }
  return res;
}

function isTableOrder(o) {
  return o.order_type === "dine-in";
}

function orderLabel(o) {
  if (isTableOrder(o)) return `Table ${o.table_number}`;
  if (o.order_type === "delivery") return "Delivery";
  return "Pickup";
}

function OrderIcon({ order, color }) {
  const props = { size: 24, style: { color } };
  if (isTableOrder(order)) return <UtensilsCrossed {...props} />;
  if (order.order_type === "delivery") return <Truck {...props} />;
  return <Package {...props} />;
}

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export const DEFAULT_PRINT_STYLE = { fontSize: 9.5, fontFamily: "Courier New", pageWidth: 76 };
export const PRINT_STYLE_KEY = "blackrock-eod-print-style";
export const FONT_OPTIONS = [
  { label: "Courier New (default)", value: "Courier New" },
  { label: "Courier", value: "Courier" },
  { label: "Consolas", value: "Consolas" },
  { label: "Lucida Console", value: "Lucida Console" },
  { label: "Menlo", value: "Menlo" },
  { label: "Monaco", value: "Monaco" },
  { label: "System monospace", value: "ui-monospace, SFMono-Regular, monospace" },
];

export function loadPrintStyle() {
  try {
    const raw = localStorage.getItem(PRINT_STYLE_KEY);
    if (!raw) return { ...DEFAULT_PRINT_STYLE };
    const parsed = JSON.parse(raw);
    return {
      fontSize: Number(parsed.fontSize) || DEFAULT_PRINT_STYLE.fontSize,
      fontFamily: parsed.fontFamily || DEFAULT_PRINT_STYLE.fontFamily,
      pageWidth: Number(parsed.pageWidth) || DEFAULT_PRINT_STYLE.pageWidth,
    };
  } catch {
    return { ...DEFAULT_PRINT_STYLE };
  }
}

export function applyPrintStyle(html, style) {
  const s = style || loadPrintStyle();
  const base = DEFAULT_PRINT_STYLE.fontSize;
  const scale = s.fontSize / base;
  const r = (n) => (n * scale).toFixed(1);
  const w = Math.max(56, Math.min(120, Number(s.pageWidth) || 80));
  const ff = s.fontFamily.includes(",") ? s.fontFamily : `'${s.fontFamily}'`;
  const override = `
<style id="eod-print-override">
@page{size:${w}mm auto;margin:0 !important}
body{width:${w}mm !important;font-family:${ff},Courier,ui-monospace,monospace !important;font-size:${s.fontSize}pt !important}
.brand{font-size:${r(17)}pt !important}
.sub{font-size:${r(9)}pt !important}
.rpt{font-size:${r(12)}pt !important}
.dt{font-size:${r(9)}pt !important}
.tbl{font-size:${r(12)}pt !important}
.meta{font-size:${r(9)}pt !important}
.sec{font-size:${r(11)}pt !important}
thead tr th{font-size:${r(8.5)}pt !important}
tbody td{font-size:${r(9.5)}pt !important}
.item .nm,.item .pr{font-size:${r(10)}pt !important}
.ssub td{font-size:${r(9.5)}pt !important}
.tot td{font-size:${r(11.5)}pt !important}
.grand td{font-size:${r(12)}pt !important}
.smry{font-size:${r(9)}pt !important}
.pay{font-size:${r(12)}pt !important}
.bl,.bd{font-size:${r(9.5)}pt !important}
.eor{font-size:${r(11)}pt !important}
.foot{font-size:${r(8.5)}pt !important}
</style>`;
  return html.replace("</head>", `${override}</head>`);
}

function buildReceiptHtml(orders) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos' });
  const timeStr = now.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Africa/Lagos' });
  const isMulti = orders.length > 1;
  const tableHeader = orders.filter((o) => o.table_number).map((o) => `Table ${o.table_number}`).join('  /  ');
  const anyPaid = orders.some((o) => o.payment_status === 'paid');
  const payLabel = anyPaid ? 'PAID' : 'PENDING';
  const grandTotal = orders.reduce((s, o) => s + (Number(o.total) || 0), 0);
  const fmtN = (n) => '₦' + Number(n || 0).toLocaleString('en-NG');

  let rows = '';
  for (const o of orders) {
    const items = (o.order_items || []).filter((i) => !i.voided);
    if (isMulti) rows += `<tr class="tl"><td colspan="2">-- Table ${esc(String(o.table_number))} --</td></tr>`;
    for (const item of items) {
      rows += `<tr class="item"><td class="nm">${esc(item.qty)}x ${esc(item.item_name)}</td><td class="pr">${esc(fmtN(item.line_total))}</td></tr>`;
      if (item.modifiers) rows += `<tr class="mod"><td colspan="2">${esc(item.modifiers)}</td></tr>`;
    }
    if (isMulti) rows += `<tr class="gap"><td colspan="2"></td></tr>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
@page{size:80mm auto;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
body{margin:0;padding:0 7mm;width:80mm;font-family:'Courier New',Courier,ui-monospace,monospace;font-size:10pt;font-weight:900;color:#000;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact;-webkit-text-stroke:0.3px #000;text-rendering:geometricPrecision}
.brand{font-size:16pt;font-weight:900;letter-spacing:4px;text-align:center;margin-top:1mm;margin-bottom:1mm}
.sub{font-size:9pt;font-weight:900;text-align:center;letter-spacing:1px;margin-bottom:2mm;text-transform:uppercase}
.hr{border-top:2px solid #000;margin:2mm 0;height:0}
.hr2{border-top:3px double #000;margin:2mm 0;height:0}
.tbl{font-size:12pt;font-weight:900;text-align:center;margin:1mm 0;letter-spacing:2px;text-transform:uppercase}
.meta{font-size:9pt;font-weight:900;text-align:center;margin-bottom:2mm;letter-spacing:1px}
table{width:100%;border-collapse:collapse;table-layout:fixed}
.tl td{font-weight:900;padding:1.5mm 0 0.5mm;text-align:center;text-transform:uppercase;letter-spacing:1px}
.item .nm{font-size:10pt;word-break:break-word;padding:0.8mm 1mm 0.8mm 0;text-align:left}
.item .pr{width:24mm;font-size:10pt;text-align:right;white-space:nowrap;padding:0.8mm 0}
.mod td{font-size:8.5pt;font-weight:700;padding-left:4mm;padding-bottom:0.5mm;font-style:italic}
.gap td{height:2mm}
.tot td{padding:2mm 0;font-size:11.5pt;font-weight:900;border-top:3px double #000;border-bottom:3px double #000;text-transform:uppercase;letter-spacing:1px}
.tot .pr{width:24mm;text-align:right;white-space:nowrap}
.pay{text-align:center;font-size:12pt;font-weight:900;margin:2mm 0;letter-spacing:3px;text-transform:uppercase}
.bl{font-size:9.5pt;font-weight:900;text-align:center;margin-bottom:1mm;text-transform:uppercase;letter-spacing:1px}
.bd{font-size:9.5pt;font-weight:900;text-align:center;margin-bottom:0.5mm}
.foot{font-size:9pt;font-weight:900;text-align:center;margin-top:3mm;letter-spacing:1px}
</style>
</head>
<body>
<div class="brand">BLACKROCK</div>
<div class="sub">Restaurant &amp; Lounge Bar</div>
<div class="hr2"></div>
<div class="tbl">${esc(tableHeader || 'RECEIPT')}</div>
<div class="meta">${esc(dateStr)} &middot; ${esc(timeStr)}</div>
<div class="hr"></div>
<table>${rows}<tr class="tot"><td>Total</td><td class="pr">${esc(fmtN(grandTotal))}</td></tr></table>
<div class="pay">Payment: ${payLabel}</div>
<div class="hr2"></div>
<div class="bl">Bank Transfer</div>
<div class="bd">Guaranty Trust Bank (GTB)</div>
<div class="bd">Blackrock Restaurant LoungeBar</div>
<div class="bd">9006080442</div>
<div class="hr2"></div>
<div class="foot">Thank you for dining with us</div>
</body>
</html>`;
}

const EOD_MAIN_KITCHEN_CATEGORIES = new Set([
  "Starters", "Salads", "Rice", "Pasta",
  "Bush Bar Kitchen", "Continental", "Sauces",
  "National Dishes", "Traditional Specials",
  "BLACKROCK EXPERIENCE", "Buffet", "Packaging", "Protein Section",
]);
const EOD_GRILL_KITCHEN_CATEGORIES = new Set(["Charcoal Grills"]);
const EOD_GRILL_KITCHEN_ITEM_NAMES = new Set([
  "Naan Bread (Cheese)", "Naan Bread (Garlic & Plain)",
]);
const EOD_DRINK_CATEGORIES = new Set([
  "Wines", "Spirits", "Beer & Cider", "Cocktails",
  "Mocktails", "Soft Drinks & Water", "Hot Drinks", "Fresh Juice",
]);

function classifyEodSection(item, menuCategoryMap) {
  if (EOD_GRILL_KITCHEN_ITEM_NAMES.has(item.item_name)) return "Grill Kitchen";
  const sub = (menuCategoryMap && item.item_id && menuCategoryMap.get(item.item_id)) || null;
  if (sub && EOD_GRILL_KITCHEN_CATEGORIES.has(sub)) return "Grill Kitchen";
  if (sub && EOD_DRINK_CATEGORIES.has(sub)) return "Drinks";
  if (sub && EOD_MAIN_KITCHEN_CATEGORIES.has(sub)) return "Main Kitchen";
  if (item.category === "drink") return "Drinks";
  return "Main Kitchen";
}

export function buildEndOfDayHtml(completedOrders, menuCategoryMap, bookings, mode, reportDate) {
  const kitchenOnly = mode === "kitchen";
  const paidOrders = (completedOrders || []).filter(
    (o) => o.order_status === "completed" && o.payment_status === "paid"
  );
  const now = new Date();
  const refDate = reportDate ? new Date(`${reportDate}T12:00:00+01:00`) : now;
  const dateStr = refDate.toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Lagos",
  });
  const timeStr = now.toLocaleTimeString("en-NG", {
    hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Africa/Lagos",
  });
  const fmt = (n) => "₦" + Number(n || 0).toLocaleString("en-NG");

  const sectionAgg = {
    "Main Kitchen": new Map(),
    "Grill Kitchen": new Map(),
    "Drinks": new Map(),
  };
  for (const order of paidOrders) {
    for (const item of (order.order_items || [])) {
      if (item.voided) continue;
      const section = classifyEodSection(item, menuCategoryMap);
      const bucket = sectionAgg[section];
      const key = `${item.item_name}||${item.modifiers || ""}`;
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
    if (order.order_status !== "completed") continue;
    for (const item of (order.order_items || [])) {
      if (!item.voided) continue;
      const key = `${item.item_name}||${item.modifiers || ""}`;
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

  function sectionHtml(title, agg) {
    const rows = [...agg.values()].sort((a, b) => a.name.localeCompare(b.name));
    if (rows.length === 0) return "";
    let body = "";
    for (const r of rows) {
      const label = r.modifier ? `${esc(r.name)} (${esc(r.modifier)})` : esc(r.name);
      body += `<tr><td class="nm">${label}</td><td class="qty">${r.qty}</td><td class="up">${esc(fmt(r.unit_price))}</td><td class="ln">${esc(fmt(r.total))}</td></tr>`;
    }
    const subtotal = rows.reduce((s, r) => s + r.total, 0);
    return `
<div class="sec">${esc(title)}</div>
<table>
<thead><tr><th class="nm">ITEM</th><th class="qty">QTY</th><th class="up">UNIT</th><th class="ln">TOTAL</th></tr></thead>
<tbody>${body}</tbody>
</table>
<table><tr class="ssub"><td class="gl">${esc(title)} Subtotal</td><td class="gv">${esc(fmt(subtotal))}</td></tr></table>`;
  }

  function voidedHtml(agg) {
    const rows = [...agg.values()].sort((a, b) => a.name.localeCompare(b.name));
    if (rows.length === 0) return "";
    let body = "";
    for (const r of rows) {
      const label = r.modifier ? `${esc(r.name)} (${esc(r.modifier)})` : esc(r.name);
      body += `<tr><td class="nm">${label}</td><td class="qty">${r.qty}</td><td class="up">${esc(fmt(r.unit_price))}</td><td class="ln">${esc(fmt(r.total))}</td></tr>`;
    }
    const subtotal = rows.reduce((s, r) => s + r.total, 0);
    return `
<div class="sec">Voided Items</div>
<table>
<thead><tr><th class="nm">ITEM</th><th class="qty">QTY</th><th class="up">UNIT</th><th class="ln">TOTAL</th></tr></thead>
<tbody>${body}</tbody>
</table>
<table><tr class="ssub"><td class="gl">Voided Subtotal (not counted)</td><td class="gv">${esc(fmt(subtotal))}</td></tr></table>`;
  }

  function guesthouseHtml(bookings) {
    const todays = [...(bookings || [])];
    if (todays.length === 0) return "";
    todays.sort((a, b) => String(a.room_number || "").localeCompare(String(b.room_number || "")));
    let body = "";
    let paidSum = 0;
    for (const b of todays) {
      const total = Number(b.total_amount || 0);
      const paid = b.payment_status === "paid";
      if (paid) paidSum += total;
      const payLbl = paid ? "PAID" : "UNPAID";
      body += `<tr><td class="nm">Rm ${esc(b.room_number || "?")} · ${esc(b.guest_name || "")}</td><td class="qty">${esc(String(b.nights || ""))}n</td><td class="up">${esc(payLbl)}</td><td class="ln">${esc(fmt(total))}</td></tr>`;
    }
    return `
<div class="sec">Guest House</div>
<table>
<thead><tr><th class="nm">ROOM / GUEST</th><th class="qty">NTS</th><th class="up">PAY</th><th class="ln">TOTAL</th></tr></thead>
<tbody>${body}</tbody>
</table>
<table><tr class="ssub"><td class="gl">Guest House Subtotal (paid)</td><td class="gv">${esc(fmt(paidSum))}</td></tr></table>`;
  }

  const mainKitchen = sectionHtml("Main Kitchen", sectionAgg["Main Kitchen"]);
  const grillKitchen = sectionHtml("Grill Kitchen", sectionAgg["Grill Kitchen"]);
  const drinks = kitchenOnly ? "" : sectionHtml("Drinks", sectionAgg["Drinks"]);
  const guesthouse = kitchenOnly ? "" : guesthouseHtml(bookings);
  const voided = voidedHtml(voidedAgg);

  const foodTotal =
    [...sectionAgg["Main Kitchen"].values()].reduce((s, r) => s + r.total, 0)
    + [...sectionAgg["Grill Kitchen"].values()].reduce((s, r) => s + r.total, 0);
  const drinkTotal = [...sectionAgg["Drinks"].values()].reduce((s, r) => s + r.total, 0);
  const guesthousePaidTotal = (bookings || [])
    .filter((b) => b.payment_status === "paid")
    .reduce((s, b) => s + Number(b.total_amount || 0), 0);
  const grandTotal = foodTotal + (kitchenOnly ? 0 : drinkTotal + guesthousePaidTotal);
  const orderCount = paidOrders.length;

  const anyContent = mainKitchen || grillKitchen || drinks || guesthouse || voided;
  const emptyBlock = anyContent ? "" : `<div class="smry" style="padding:4mm 0;font-style:italic">No activity today</div>`;

  const grandBlock = kitchenOnly ? "" : `
<table><tr class="grand"><td class="gl">Grand Total</td><td class="gv">${esc(fmt(grandTotal))}</td></tr></table>
<div class="smry">${esc(String(orderCount))} completed order${orderCount !== 1 ? "s" : ""} included</div>
<div class="hr"></div>`;

  const title = kitchenOnly ? "Kitchen End of Day" : "End of Day Sales Report";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
@page{size:80mm auto;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
body{margin:0;padding:0 7mm;width:80mm;font-family:'Courier New',Courier,ui-monospace,monospace;font-size:9.5pt;font-weight:900;color:#000;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact;-webkit-text-stroke:0.3px #000;text-rendering:geometricPrecision;line-height:1.3}
.brand{font-size:17pt;font-weight:900;letter-spacing:5px;text-align:center;margin-top:1mm;margin-bottom:1mm}
.sub{font-size:9pt;font-weight:900;text-align:center;letter-spacing:1px;text-transform:uppercase;margin-bottom:2mm}
.rpt{font-size:12pt;font-weight:900;text-align:center;margin:1mm 0 1mm;text-transform:uppercase;letter-spacing:2px}
.dt{font-size:9pt;font-weight:900;text-align:center;margin-bottom:0.5mm;letter-spacing:1px}
.hr{border-top:2px solid #000;margin:2mm 0;height:0}
.hr2{border-top:3px double #000;margin:2mm 0;height:0}
.sec{font-size:11pt;font-weight:900;text-align:center;margin:3mm 0 1mm;letter-spacing:3px;text-transform:uppercase;padding:1mm 0;border-top:3px double #000;border-bottom:3px double #000}
table{width:100%;border-collapse:collapse;table-layout:fixed}
thead tr th{font-size:8.5pt;font-weight:900;padding:1mm 0;border-bottom:2px solid #000;text-transform:uppercase;letter-spacing:0.5px}
thead .nm{text-align:left}
thead .qty,thead .up,thead .ln{text-align:right}
tbody td{font-size:9.5pt;font-weight:900;padding:0.8mm 0}
.nm{word-break:break-word;text-align:left;padding-right:1mm}
.qty{width:7mm;text-align:right;white-space:nowrap;padding:0.8mm 1mm 0.8mm 0}
.up{width:16mm;text-align:right;white-space:nowrap;padding:0.8mm 1mm 0.8mm 0}
.ln{width:18mm;text-align:right;white-space:nowrap;padding:0.8mm 0}
.ssub td{padding:1.2mm 0;font-size:9.5pt;font-weight:900;border-top:1px dashed #000;text-transform:uppercase;letter-spacing:0.5px}
.grand td{padding:2mm 0;font-size:12pt;font-weight:900;border-top:3px double #000;border-bottom:3px double #000;text-transform:uppercase;letter-spacing:1.5px}
.gl{text-align:left}
.gv{text-align:right;white-space:nowrap}
.smry{font-size:9pt;font-weight:900;text-align:center;margin:2mm 0;letter-spacing:0.5px}
.eor{font-size:11pt;font-weight:900;text-align:center;margin:4mm 0 2mm;letter-spacing:2px;text-transform:uppercase;padding:1.5mm 0;border-top:3px double #000;border-bottom:3px double #000}
.foot{font-size:8.5pt;font-weight:900;text-align:center;margin-top:2mm;letter-spacing:1.5px;text-transform:uppercase}
</style>
</head>
<body>
<div class="brand">BLACKROCK</div>
<div class="sub">Restaurant &amp; Lounge Bar</div>
<div class="hr2"></div>
<div class="rpt">${esc(title)}</div>
<div class="dt">${esc(dateStr)}</div>
<div class="dt">Printed: ${esc(timeStr)}</div>
<div class="hr2"></div>
${mainKitchen}${grillKitchen}${drinks}${guesthouse}${voided}${emptyBlock}${grandBlock}
<div class="eor">*** END OF REPORT ***</div>
<div class="foot">Generated by BLACKROCK Front Desk</div>
</body>
</html>`;
}

function buildTestPrintHtml() {
  const ruler = '1234567890'.repeat(5);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
@page{size:80mm auto;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
body{margin:0;padding:0 8mm;width:80mm;font-family:'Courier New',Courier,monospace;font-size:9pt;font-weight:bold;color:#000;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.hr{border-top:1px dashed #000;margin:2mm 0}
.c{text-align:center}
.sm{font-size:8pt;font-weight:bold}
table{width:100%;border-collapse:collapse;table-layout:fixed}
.nm{word-break:break-word;padding-right:1mm}
.pr{width:22mm;text-align:right;white-space:nowrap}
.ruler{position:relative;height:5mm;border-left:2px solid #000;border-right:2px solid #000;margin:1mm 0}
.ruler-mid{position:absolute;left:50%;top:0;bottom:0;border-left:1px solid #000}
.ruler-lbl{display:flex;justify-content:space-between;font-size:7pt;margin-bottom:1mm}
</style>
</head>
<body>
<div class="c" style="font-size:11pt">PRINT WIDTH TEST</div>
<div class="c sm">8mm margins / 64mm content / 80mm total</div>
<div class="hr"></div>
<div class="sm">Edge-to-edge bar (should touch both margins):</div>
<div class="ruler"><div class="ruler-mid"></div></div>
<div class="ruler-lbl"><span>|LEFT</span><span>CENTER|</span><span>RIGHT|</span></div>
<div class="hr"></div>
<div class="sm">Straightness test (lines must be horizontal):</div>
<div class="hr"></div>
<div class="hr" style="margin-top:4mm"></div>
<div class="hr" style="margin-top:4mm"></div>
<div class="hr"></div>
<div class="sm">Sample prices (right column must not clip):</div>
<table>
<tr><td class="nm">Goat Meat Pepper Soup</td><td class="pr">&#x20A6;145,000</td></tr>
<tr><td class="nm">Seafood Okro with Pounded Yam</td><td class="pr">&#x20A6;63,500</td></tr>
<tr><td class="nm">Chapman</td><td class="pr">&#x20A6;800</td></tr>
<tr><td class="nm">Grilled Fish, Chips and Salad</td><td class="pr">&#x20A6;12,500</td></tr>
<tr><td colspan="2"><div class="hr"></div></td></tr>
<tr><td style="font-weight:bold">Total</td><td class="pr" style="font-weight:bold">&#x20A6;222,800</td></tr>
</table>
<div class="hr"></div>
<div class="c sm">PASS: left/right bars align top-to-bottom</div>
<div class="c sm">PASS: dashed lines are perfectly horizontal</div>
<div class="c sm">PASS: all prices fully visible</div>
</body>
</html>`;
}

export default function FrontDeskDisplay() {
  return (
    <StaffLoginGate
      allowedRoles={FRONT_DESK_ROLES}
      title="Front Desk"
      disableIdleLock
      renderSignedOut={({ onSignIn }) => <SignedOutScreen onSignIn={onSignIn} />}
    >
      <FrontDeskContent />
    </StaffLoginGate>
  );
}

function FrontDeskContent() {
  const { signOut } = useStaffSession();
  const [lost, setLost] = useState(false);
  const handleLost = useCallback(() => setLost(true), []);
  if (lost) return <SignedOutScreen onSignIn={signOut} />;
  return <FrontDeskMain onSessionLost={handleLost} />;
}

function SignedOutScreen({ onSignIn }) {
  useEffect(() => {
    playAlert();
    const id = setInterval(playAlert, ALERT_REPEAT_MS);
    return () => clearInterval(id);
  }, []);

  function handleTap() {
    if (audio.ctx) audio.ctx.resume();
    onSignIn();
  }

  return (
    <button
      onClick={handleTap}
      style={{
        position: "fixed", inset: 0, width: "100%", height: "100%", background: "#b91c1c", color: "#ffffff",
        border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", gap: 24, padding: 32, textAlign: "center", fontFamily: "'DM Sans', 'Montserrat', sans-serif",
      }}
    >
      <span style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.1 }}>Signed out. Tap to sign in</span>
      <span style={{ fontSize: 28, fontWeight: 600 }}>New orders are not updating on this screen.</span>
    </button>
  );
}

function FrontDeskMain({ onSessionLost }) {
  const [isDark, setIsDark] = useState(() => {
    try { return localStorage.getItem("blackrock-frontdesk-theme") === "dark"; } catch { return false; }
  });
  const t = THEMES[isDark ? "dark" : "light"];

  const [orders, setOrders] = useState([]);
  const [completedOrders, setCompletedOrders] = useState([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [completedLoaded, setCompletedLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [connected, setConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const [flashIds, setFlashIds] = useState(() => new Set());
  const [readyFlashIds, setReadyFlashIds] = useState(() => new Set());
  const [actionIds, setActionIds] = useState(() => new Set());
  const actionIdsRef = useRef(actionIds);
  actionIdsRef.current = actionIds;
  const [actionError, setActionError] = useState("");
  const [audioReady, setAudioReady] = useState(() => !!audio.ctx);
  const [muted, setMuted] = useState(() => audio.muted);

  const fdAlertLoopRef = useRef(null);
  const [fdAlertBanner, setFdAlertBanner] = useState(null);

  function stopFdAlertLoop() {
    if (fdAlertLoopRef.current) { clearInterval(fdAlertLoopRef.current); fdAlertLoopRef.current = null; }
    setFdAlertBanner(null);
  }

  const [view, setView] = useState(() => {
    try { const v = localStorage.getItem("blackrock-frontdesk-view"); return ["orders","bar","reservations","guesthouse"].includes(v) ? v : "orders"; } catch { return "orders"; }
  });

  function changeView(v) {
    setView(v);
    try { localStorage.setItem("blackrock-frontdesk-view", v); } catch {}
  }

  const [reservations, setReservations] = useState([]);
  const [resToday, setResToday] = useState(lagosToday);
  const [resLoaded, setResLoaded] = useState(false);
  const [resOk, setResOk] = useState(true);
  const [resUpdated, setResUpdated] = useState(null);
  const [resTab, setResTab] = useState("today");
  const [resFlashIds, setResFlashIds] = useState(() => new Set());
  const [resActionIds, setResActionIds] = useState(() => new Set());
  const [resPollError, setResPollError] = useState("");
  const [cancelTarget, setCancelTarget] = useState(null);

  const [waiterCalls, setWaiterCalls] = useState([]);
  const [callActionIds, setCallActionIds] = useState(() => new Set());
  const [statusFilter, setStatusFilter] = useState(null);
  const [eodPrintStatus, setEodPrintStatus] = useState(null);
  const [kitchenPrintStatus, setKitchenPrintStatus] = useState(null);
  const [testPrintStatus, setTestPrintStatus] = useState(null);
  const [menuCategoryMap, setMenuCategoryMap] = useState(() => new Map());
  const [todayBookings, setTodayBookings] = useState([]);

  const [guesthouseRooms, setGuesthouseRooms] = useState([]);
  const [guesthouseLoaded, setGuesthouseLoaded] = useState(false);
  const [guesthouseActionIds, setGuesthouseActionIds] = useState(() => new Set());
  const [guesthouseError, setGuesthouseError] = useState("");
  const [guesthousePinPrompt, setGuesthousePinPrompt] = useState(null);
  const guesthouseActiveCount = useMemo(
    () => guesthouseRooms.filter((r) => r.active_booking).length,
    [guesthouseRooms],
  );

  const knownResIdsRef = useRef(null);
  const resInFlightRef = useRef(false);
  const resPendingRef = useRef(false);
  const knownIdsRef = useRef(null);
  const readyIdsRef = useRef(null);
  const lastCallAlertRef = useRef(0);
  const mountedRef = useRef(true);
  const inFlightRef = useRef(false);
  const pendingRef = useRef(false);
  const tabRef = useRef(tab);
  const ordersRef = useRef(orders);
  const completedIdsRef = useRef(new Set());
  const hasColRef = useRef(null);
  const probedAtRef = useRef(0);
  const channelRef = useRef(null);
  const lostRef = useRef(onSessionLost);
  tabRef.current = tab;
  ordersRef.current = orders;
  lostRef.current = onSessionLost;

  const checkSession = useCallback(async () => {
    if ((await ensureSession()) === "lost" && mountedRef.current) lostRef.current();
  }, []);

  function toggleTheme() {
    setIsDark((prev) => {
      const next = !prev;
      try { localStorage.setItem("blackrock-frontdesk-theme", next ? "dark" : "light"); } catch {}
      return next;
    });
  }

  function toggleMuted() {
    audio.muted = !audio.muted;
    setMuted(audio.muted);
  }

  function enableSound() {
    if (unlockAudio()) {
      setAudioReady(true);
      playChime();
    }
  }

  const fetchOrders = useCallback(async () => {
    if (inFlightRef.current) { pendingRef.current = true; return; }
    inFlightRef.current = true;
    try {
      if (hasColRef.current === null || (hasColRef.current === false && Date.now() - probedAtRef.current > REPROBE_MS)) {
        const { error: probeErr } = await supabase.from("orders").select("completed_at").limit(1);
        probedAtRef.current = Date.now();
        if (!probeErr) hasColRef.current = true;
        else if (probeErr.code === "42703" || /completed_at/i.test(probeErr.message || "")) hasColRef.current = false;
      }
      const hasCol = hasColRef.current === true;

      const startISO = new Date(startOfToday()).toISOString();
      const doneFilter = completedTodayFilter(hasCol);
      const wantList = true;

      const activeReq = supabase
        .from("orders")
        .select("*, order_items(*)")
        .neq("order_status", "completed")
        .or(`created_at.gte.${startISO},order_status.in.(${ACTIVE_STATUSES.join(",")})`)
        .order("created_at", { ascending: false })
        .limit(300);

      const countReq = supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("order_status", "completed")
        .or(doneFilter);

      const listReq = wantList
        ? supabase
            .from("orders")
            .select("*, order_items(*)")
            .eq("order_status", "completed")
            .or(doneFilter)
            .order("created_at", { ascending: false })
            .limit(200)
        : Promise.resolve(null);

      const [{ data, error }, countRes, listRes] = await Promise.all([activeReq, countReq, listReq]);

      if (!mountedRef.current) return;
      if (error) {
        if (error.code === "PGRST301" || /jwt|token/i.test(error.message || "")) checkSession();
        setLoading(false);
        return;
      }

      const list = (data || []).filter((o) => !completedIdsRef.current.has(o.id));
      setOrders((prev) => {
        const merged = list
          .filter((o) => !actionIdsRef.current.has(o.id) || prev.some((p) => p.id === o.id))
          .map((o) => (actionIdsRef.current.has(o.id) ? prev.find((p) => p.id === o.id) || o : o));
        return merged;
      });
      setLoading(false);
      setLastUpdated(new Date());

      if (countRes && !countRes.error && countRes.count !== null) setCompletedCount(countRes.count);
      if (listRes && !listRes.error) {
        setCompletedOrders(listRes.data || []);
        setCompletedLoaded(true);
      }

      const ids = new Set(list.map((o) => o.id));
      if (knownIdsRef.current) {
        const arrivals = [...ids].filter((id) => !knownIdsRef.current.has(id));
        if (arrivals.length > 0) {
          setFlashIds((prev) => new Set([...prev, ...arrivals]));
          setTimeout(() => {
            if (!mountedRef.current) return;
            setFlashIds((prev) => {
              const n = new Set(prev);
              arrivals.forEach((id) => n.delete(id));
              return n;
            });
          }, FLASH_MS);
          const first = list.find((o) => arrivals.includes(o.id));
          const firstHasDrinks = first && (first.order_items || []).some((i) => i.category === "drink");
          const orderWord = firstHasDrinks ? "drink order" : "order";
          const label = first
            ? `New ${orderWord}${arrivals.length > 1 ? "s" : ""}, ${orderLabel(first)}${arrivals.length > 1 ? ` +${arrivals.length - 1} more` : ""}`
            : `${arrivals.length} new order${arrivals.length !== 1 ? "s" : ""}`;
          setFdAlertBanner((prev) => prev ? { label, count: arrivals.length + (prev.count || 0) } : { label, count: arrivals.length });
          if (!fdAlertLoopRef.current) {
            unlockAudio();
            setAudioReady(!!audio.ctx);
            playChime();
            let elapsed = 0;
            fdAlertLoopRef.current = setInterval(() => {
              elapsed += 2000;
              if (elapsed >= 30000) {
                clearInterval(fdAlertLoopRef.current); fdAlertLoopRef.current = null;
                setFdAlertBanner(null);
                return;
              }
              unlockAudio();
              playChime();
            }, 2000);
          }
        }
      }
      knownIdsRef.current = ids;

      // Detect transitions to "ready" — play distinct chime and flash the card
      const readySet = new Set(list.filter(o => o.order_status === "ready").map(o => o.id));
      if (readyIdsRef.current !== null) {
        const newlyReadyIds = [...readySet].filter(id => !readyIdsRef.current.has(id));
        if (newlyReadyIds.length > 0) {
          playReadyChime();
          setReadyFlashIds(prev => new Set([...prev, ...newlyReadyIds]));
          setTimeout(() => {
            if (!mountedRef.current) return;
            setReadyFlashIds(prev => { const n = new Set(prev); newlyReadyIds.forEach(id => n.delete(id)); return n; });
          }, FLASH_MS);
        }
      }
      readyIdsRef.current = readySet;
    } finally {
      inFlightRef.current = false;
      if (pendingRef.current && mountedRef.current) {
        pendingRef.current = false;
        fetchOrders();
      }
    }
  }, [checkSession]);

  // Reservations are polled, not subscribed to: the list comes from a service-role
  // endpoint and the reservations RLS policies for front_desk are not in the repo.
  const fetchReservations = useCallback(async () => {
    if (resInFlightRef.current) { resPendingRef.current = true; return; }
    resInFlightRef.current = true;
    try {
      const res = await apiRequest(RESERVATIONS_API, "GET");
      if (!mountedRef.current) return;
      if (res === "lost") { lostRef.current(); return; }
      if (res === "offline") { setResOk(false); return; }
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        if (!mountedRef.current) return;
        setResOk(false);
        setResPollError(`Could not load reservations. HTTP ${res.status}: ${json.error || res.statusText || "No message from the server."}`);
        return;
      }
      const json = await res.json();
      if (!mountedRef.current) return;

      const list = json.reservations || [];
      const today = json.today || lagosToday();
      setReservations(list);
      setResToday(today);
      setResLoaded(true);
      setResOk(true);
      setResPollError("");
      setResUpdated(new Date());

      const ids = new Set(list.filter((r) => isOpenPending(r, today)).map((r) => r.id));
      if (knownResIdsRef.current) {
        const arrivals = [...ids].filter((id) => !knownResIdsRef.current.has(id));
        if (arrivals.length > 0) {
          setResFlashIds((prev) => new Set([...prev, ...arrivals]));
          playChime();
          setTimeout(() => {
            if (!mountedRef.current) return;
            setResFlashIds((prev) => {
              const n = new Set(prev);
              arrivals.forEach((id) => n.delete(id));
              return n;
            });
          }, FLASH_MS);
        }
      }
      knownResIdsRef.current = ids;
    } catch {
      if (mountedRef.current) setResOk(false);
    } finally {
      resInFlightRef.current = false;
      if (resPendingRef.current && mountedRef.current) {
        resPendingRef.current = false;
        fetchReservations();
      }
    }
  }, []);

  const fetchWaiterCalls = useCallback(async () => {
    try {
      const res = await apiRequest(WAITER_CALLS_API, "GET");
      if (!mountedRef.current) return;
      if (res === "lost") { lostRef.current(); return; }
      if (res === "offline" || !res.ok) return;
      const json = await res.json();
      const calls = json.calls || [];
      setWaiterCalls(calls);
      if (calls.length > 0) {
        if (Date.now() - lastCallAlertRef.current >= ALERT_REPEAT_MS) {
          playAlert();
          lastCallAlertRef.current = Date.now();
        }
      } else {
        lastCallAlertRef.current = 0;
      }
    } catch {}
  }, []);

  const fetchGuesthouseRooms = useCallback(async () => {
    try {
      const res = await apiRequest("/api/front-desk?resource=guesthouse-rooms", "GET");
      if (!mountedRef.current) return;
      if (res === "lost") { lostRef.current(); return; }
      if (res === "offline" || !res.ok) return;
      const json = await res.json();
      setGuesthouseRooms(json.rooms || []);
      setGuesthouseLoaded(true);
      setGuesthouseError("");
    } catch {}
  }, []);

  const fetchTodayBookings = useCallback(async () => {
    try {
      const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });
      const res = await apiRequest(`/api/front-desk?resource=guesthouse-bookings&from=${today}&to=${today}`, "GET");
      if (!mountedRef.current) return;
      if (res === "lost" || res === "offline" || !res.ok) return;
      const json = await res.json();
      setTodayBookings(json.bookings || []);
    } catch {}
  }, []);

  function promptGuesthousePin(forAction) {
    return new Promise((resolve) => {
      setGuesthousePinPrompt({ forAction, resolve });
    });
  }

  async function checkInGuest(room, form) {
    const nights = Math.max(1, Math.min(365, parseInt(form.nights, 10) || 1));
    const discount = Math.max(0, parseInt(form.discount, 10) || 0);
    const guest_name = String(form.guest_name || "").trim();
    if (!guest_name) { setGuesthouseError("Guest name is required."); return; }
    const auth = await promptGuesthousePin("check in");
    if (!auth) return;
    setGuesthouseActionIds((prev) => new Set(prev).add(room.id));
    setGuesthouseError("");
    try {
      const res = await fetch("/api/front-desk?resource=guesthouse-bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-guesthouse-token": auth.token, ...(await authHeader()) },
        body: JSON.stringify({
          room_id: room.id,
          guest_name,
          guest_phone: form.guest_phone || null,
          guest_email: form.guest_email || null,
          nights,
          discount,
          payment_method: form.payment_method || null,
          notes: form.notes || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setGuesthouseError(json.error || "Could not check in guest."); return; }
      await fetchGuesthouseRooms();
    } catch {
      setGuesthouseError("Could not reach the server. Please try again.");
    } finally {
      setGuesthouseActionIds((prev) => { const n = new Set(prev); n.delete(room.id); return n; });
    }
  }

  async function checkOutGuest(room) {
    if (!room.active_booking) return;
    const auth = await promptGuesthousePin(`check out ${room.active_booking.guest_name} from room ${room.room_number}`);
    if (!auth) return;
    setGuesthouseActionIds((prev) => new Set(prev).add(room.id));
    setGuesthouseError("");
    try {
      const res = await fetch("/api/front-desk?resource=guesthouse-bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-guesthouse-token": auth.token, ...(await authHeader()) },
        body: JSON.stringify({ id: room.active_booking.id, action: "check-out" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setGuesthouseError(json.error || "Could not check out guest."); return; }
      await fetchGuesthouseRooms();
    } catch {
      setGuesthouseError("Could not reach the server. Please try again.");
    } finally {
      setGuesthouseActionIds((prev) => { const n = new Set(prev); n.delete(room.id); return n; });
    }
  }

  async function encodeRoomKey(room) {
    if (!room.active_booking) return;
    const auth = await promptGuesthousePin("encode a key card");
    if (!auth) return;
    setGuesthouseActionIds((prev) => new Set(prev).add(room.id));
    setGuesthouseError("");
    try {
      const res = await fetch("/api/front-desk?resource=guesthouse-bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-guesthouse-token": auth.token, ...(await authHeader()) },
        body: JSON.stringify({ id: room.active_booking.id, action: "log-key-encoded" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setGuesthouseError(json.error || "Could not log key encoding."); return; }
      await fetchGuesthouseRooms();
      window.alert(`Key encoding logged for room ${room.room_number}. Use the PCLMS reader to write the card.`);
    } catch {
      setGuesthouseError("Could not reach the server. Please try again.");
    } finally {
      setGuesthouseActionIds((prev) => { const n = new Set(prev); n.delete(room.id); return n; });
    }
  }

  async function markBookingPaid(room, method) {
    if (!room.active_booking) return;
    const auth = await promptGuesthousePin("mark as paid");
    if (!auth) return;
    setGuesthouseActionIds((prev) => new Set(prev).add(room.id));
    setGuesthouseError("");
    try {
      const res = await fetch("/api/front-desk?resource=guesthouse-bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-guesthouse-token": auth.token, ...(await authHeader()) },
        body: JSON.stringify({ id: room.active_booking.id, action: "mark-paid", payment_method: method || null }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setGuesthouseError(json.error || "Could not mark as paid."); return; }
      await fetchGuesthouseRooms();
    } catch {
      setGuesthouseError("Could not reach the server. Please try again.");
    } finally {
      setGuesthouseActionIds((prev) => { const n = new Set(prev); n.delete(room.id); return n; });
    }
  }

  const subscribe = useCallback(() => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    const channel = supabase
      .channel(`frontdesk-orders-${Date.now()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        fetchOrders();
      })
      .subscribe((status) => {
        if (!mountedRef.current || channelRef.current !== channel) return;
        setConnected(status === "SUBSCRIBED");
      });
    channelRef.current = channel;
  }, [fetchOrders]);

  useEffect(() => {
    mountedRef.current = true;
    fetchOrders();
    subscribe();

    return () => {
      mountedRef.current = false;
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    };
  }, [fetchOrders, subscribe]);

  // The client pushes a refreshed token to joined Realtime channels by itself.
  // This only steps in if the channel did not come back, then reconciles.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "TOKEN_REFRESHED") return;
      setTimeout(() => {
        if (!mountedRef.current) return;
        if (channelRef.current && channelRef.current.state !== "joined") subscribe();
        fetchOrders();
      }, 2000);
    });
    return () => subscription.unsubscribe();
  }, [subscribe, fetchOrders]);

  useEffect(() => {
    checkSession();
    const checkId = setInterval(checkSession, SESSION_CHECK_MS);
    let last = Date.now();
    const driftId = setInterval(() => {
      const n = Date.now();
      if (n - last > WAKE_GAP_MS) { checkSession(); fetchOrders(); fetchReservations(); fetchWaiterCalls(); }
      last = n;
    }, 5000);
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        checkSession();
        if (audio.ctx?.state === "suspended") audio.ctx.resume().catch(() => {});
      }
    };
    const onOnline = () => { checkSession(); fetchOrders(); fetchReservations(); fetchWaiterCalls(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    return () => {
      clearInterval(checkId);
      clearInterval(driftId);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    };
  }, [checkSession, fetchOrders, fetchReservations, fetchWaiterCalls]);

  useEffect(() => {
    fetchReservations();
    const id = setInterval(fetchReservations, POLL_MS);
    return () => clearInterval(id);
  }, [fetchReservations]);

  useEffect(() => {
    fetchWaiterCalls();
    const id = setInterval(fetchWaiterCalls, POLL_MS);
    return () => clearInterval(id);
  }, [fetchWaiterCalls]);

  useEffect(() => {
    fetchGuesthouseRooms();
    fetchTodayBookings();
    const id = setInterval(() => { fetchGuesthouseRooms(); fetchTodayBookings(); }, POLL_MS * 2);
    return () => clearInterval(id);
  }, [fetchGuesthouseRooms, fetchTodayBookings]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from("menu_items")
          .select("id, category")
          .limit(1000);
        if (cancelled || !mountedRef.current) return;
        const map = new Map();
        for (const row of (data || [])) {
          if (row.id && row.category) map.set(row.id, row.category);
        }
        setMenuCategoryMap(map);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (tab === "completed") fetchOrders();
  }, [tab, fetchOrders]);

  useEffect(() => {
    if (connected) return undefined;
    let misses = 0;
    const id = setInterval(() => {
      fetchOrders();
      misses += 1;
      if (misses % 4 === 0) subscribe();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [connected, fetchOrders, subscribe]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let sentinel = null;
    let cancelled = false;

    async function acquire() {
      try {
        if (!("wakeLock" in navigator) || document.visibilityState !== "visible") return;
        const lock = await navigator.wakeLock.request("screen");
        if (cancelled) { lock.release().catch(() => {}); return; }
        sentinel = lock;
      } catch {}
    }

    function onVisible() {
      if (document.visibilityState === "visible") {
        fetchOrders();
        fetchReservations();
        fetchWaiterCalls();
        acquire();
      }
    }

    acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      if (sentinel) sentinel.release().catch(() => {});
    };
  }, [fetchOrders, fetchReservations, fetchWaiterCalls]);

  async function printEod(mode) {
    const setStatus = mode === "kitchen" ? setKitchenPrintStatus : setEodPrintStatus;
    setStatus("printing");
    const html = applyPrintStyle(buildEndOfDayHtml(completedOrders, menuCategoryMap, todayBookings, mode));
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.printReceipt(html);
        setStatus(result.success ? "ok" : "error");
      } else {
        const w = window.open("", "_blank");
        if (w) {
          w.document.write(html);
          w.document.close();
          w.focus();
          try { w.print(); } catch {}
          setStatus("ok");
        } else {
          setStatus("error");
        }
      }
    } catch {
      setStatus("error");
    }
    setTimeout(() => setStatus(null), 3000);
  }
  const handleEndOfDayPrint = () => printEod("all");
  const handleKitchenEodPrint = () => printEod("kitchen");

  async function handleTestPrint() {
    setTestPrintStatus("printing");
    const html = buildTestPrintHtml();
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.printReceipt(html);
        setTestPrintStatus(result.success ? "ok" : "error");
      } else {
        const w = window.open("", "_blank");
        if (w) {
          w.document.write(html);
          w.document.close();
          w.focus();
          try { w.print(); } catch {}
          setTestPrintStatus("ok");
        } else {
          setTestPrintStatus("error");
        }
      }
    } catch {
      setTestPrintStatus("error");
    }
    setTimeout(() => setTestPrintStatus(null), 4000);
  }

  async function sendPatch(orderId, fields) {
    return fetch(ORDERS_API, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify({ id: orderId, ...fields }),
    });
  }

  async function patchOrder(orderId, fields, actionLabel) {
    setActionError("");
    // Optimistic update
    const snapshot = ordersRef.current.find((o) => o.id === orderId);
    if (fields.order_status === "completed") {
      completedIdsRef.current.add(orderId);
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      if (snapshot) {
        const done = { ...snapshot, order_status: "completed", ...(hasColRef.current ? { completed_at: new Date().toISOString() } : {}) };
        setCompletedOrders((prev) => (prev.some((o) => o.id === orderId) ? prev : [done, ...prev]));
      }
      setCompletedCount((c) => c + 1);
    } else {
      const apply = (prev) => prev.map((o) => (o.id === orderId ? { ...o, ...fields } : o));
      setOrders(apply);
      setCompletedOrders(apply);
    }
    const t0 = Date.now();
    setActionIds((prev) => new Set([...prev, orderId]));
    try {
      if ((await ensureSession()) === "lost") { onSessionLost(); return; }

      let res = await sendPatch(orderId, fields);
      console.log(`[front-desk patch] ${JSON.stringify(fields)} on ${orderId}: ${Date.now() - t0}ms HTTP ${res.status}`);
      if (res.status === 401) {
        const recovered = await ensureSession(true);
        if (recovered === "lost") { onSessionLost(); return; }
        if (recovered === "offline") {
          setActionError(`${actionLabel} failed. HTTP 401 and the sign-in could not be refreshed because the network is down. Try again.`);
          return;
        }
        res = await sendPatch(orderId, fields);
        if (res.status === 401) { onSessionLost(); return; }
      }

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        // Roll back optimistic update
        if (fields.order_status === "completed" && snapshot) {
          completedIdsRef.current.delete(orderId);
          setOrders((prev) => (prev.some((o) => o.id === orderId) ? prev : [snapshot, ...prev].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))));
          setCompletedOrders((prev) => prev.filter((o) => o.id !== orderId));
          setCompletedCount((c) => Math.max(0, c - 1));
        } else if (snapshot) {
          const rollback = (prev) => prev.map((o) => (o.id === orderId ? snapshot : o));
          setOrders(rollback);
          setCompletedOrders(rollback);
        }
        setActionError(`${actionLabel} failed. HTTP ${res.status}: ${json.error || res.statusText || "No message from the server."}`);
        return;
      }
    } catch (err) {
      console.log(`[front-desk patch] ${JSON.stringify(fields)} on ${orderId}: ${Date.now() - t0}ms network error`);
      if (fields.order_status === "completed" && snapshot) {
        completedIdsRef.current.delete(orderId);
        setOrders((prev) => (prev.some((o) => o.id === orderId) ? prev : [snapshot, ...prev].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))));
        setCompletedOrders((prev) => prev.filter((o) => o.id !== orderId));
        setCompletedCount((c) => Math.max(0, c - 1));
      } else if (snapshot) {
        const rollback = (prev) => prev.map((o) => (o.id === orderId ? snapshot : o));
        setOrders(rollback);
        setCompletedOrders(rollback);
      }
      setActionError(`${actionLabel} failed. Network error: ${err?.message || "could not reach the server."}`);
    } finally {
      setActionIds((prev) => { const n = new Set(prev); n.delete(orderId); return n; });
    }
  }

  const confirmOrder = (id) => patchOrder(id, { order_status: "confirmed" }, "Confirm");
  const completeOrder = (id) => patchOrder(id, { order_status: "completed" }, "Mark Completed");
  const setPayment = (id, payment_status) => patchOrder(id, { payment_status }, payment_status === "paid" ? "Mark Paid" : "Proof Received");

  async function updateBarStatus(orderId, newStatus) {
    const snapshot = ordersRef.current.find((o) => o.id === orderId);
    if (newStatus === "ready") {
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } else {
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, order_status: newStatus } : o));
    }
    setActionIds((prev) => new Set([...prev, orderId]));
    const t0 = Date.now();
    try {
      const res = await fetch("/api/kitchen-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ orderId, status: newStatus }),
      });
      console.log(`[bar-status] ${newStatus} ${orderId}: ${Date.now() - t0}ms HTTP ${res.status}`);
      if (!res.ok) {
        if (newStatus === "ready" && snapshot) {
          setOrders((prev) => prev.some((o) => o.id === orderId) ? prev : [snapshot, ...prev].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)));
        } else if (snapshot) {
          setOrders((prev) => prev.map((o) => o.id === orderId ? snapshot : o));
        }
        setActionError(`Bar status update failed. HTTP ${res.status}.`);
        setTimeout(() => setActionError(""), 5000);
      }
    } catch (err) {
      console.log(`[bar-status] ${newStatus} ${orderId}: ${Date.now() - t0}ms network error`);
      if (newStatus === "ready" && snapshot) {
        setOrders((prev) => prev.some((o) => o.id === orderId) ? prev : [snapshot, ...prev].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)));
      } else if (snapshot) {
        setOrders((prev) => prev.map((o) => o.id === orderId ? snapshot : o));
      }
      setActionError(`Bar status update failed. Network error.`);
      setTimeout(() => setActionError(""), 5000);
    } finally {
      setActionIds((prev) => { const n = new Set(prev); n.delete(orderId); return n; });
    }
  }

  async function patchReservation(id, status, actionLabel) {
    setActionError("");
    setResActionIds((prev) => new Set([...prev, id]));
    try {
      const res = await apiRequest(RESERVATIONS_API, "PATCH", { id, status });
      if (res === "lost") { onSessionLost(); return; }
      if (res === "offline") {
        setActionError(`${actionLabel} failed. HTTP 401 and the sign-in could not be refreshed because the network is down. Try again.`);
        return;
      }
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setActionError(`${actionLabel} failed. HTTP ${res.status}: ${json.error || res.statusText || "No message from the server."}`);
        if (res.status === 400 || res.status === 409) fetchReservations();
        return;
      }
      setReservations((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
      fetchReservations();
    } catch (err) {
      setActionError(`${actionLabel} failed. Network error: ${err?.message || "could not reach the server."}`);
    } finally {
      setResActionIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    }
  }

  const confirmReservation = (id) => patchReservation(id, "confirmed", "Confirm");
  const cancelReservation = (id) => patchReservation(id, "cancelled", "Cancel Booking");

  async function markPaymentVerified(id) {
    setResActionIds((prev) => new Set([...prev, id]));
    try {
      const res = await apiRequest(RESERVATIONS_API, "PATCH", { id, meal_payment_status: "paid" });
      if (res === "lost") { onSessionLost(); return; }
      if (!res.ok && res !== "offline") {
        const json = await res.json().catch(() => ({}));
        setActionError(`Mark Payment Verified failed. ${json.error || res.statusText || ""}`);
        return;
      }
      setReservations((prev) => prev.map((r) => (r.id === id ? { ...r, meal_payment_status: "paid" } : r)));
    } catch (err) {
      setActionError(`Mark Payment Verified failed. ${err?.message || "Network error."}`);
    } finally {
      setResActionIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    }
  }

  async function ackCall(id) {
    setCallActionIds((prev) => new Set([...prev, id]));
    try {
      const res = await apiRequest(WAITER_CALLS_API, "PATCH", { id });
      if (res === "lost") { onSessionLost(); return; }
      if (res !== "offline" && res.ok) {
        setWaiterCalls((prev) => {
          const next = prev.filter((c) => c.id !== id);
          if (next.length === 0) lastCallAlertRef.current = 0;
          return next;
        });
      }
    } catch {}
    setCallActionIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
  }

  const resLists = useMemo(() => {
    const live = reservations.filter((r) => r.status !== "cancelled");
    const past = reservations
      .filter((r) => r.date < resToday)
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    return {
      today: live.filter((r) => r.date === resToday),
      upcoming: live.filter((r) => r.date > resToday),
      pending: reservations.filter((r) => isOpenPending(r, resToday)),
      past,
    };
  }, [reservations, resToday]);

  const resCounts = useMemo(() => ({
    pending: resLists.pending.length,
    confirmed: reservations.filter((r) => r.status === "confirmed" && r.date >= resToday).length,
    today: resLists.today.length,
    upcoming: resLists.upcoming.length,
    past: resLists.past.length,
  }), [resLists, reservations, resToday]);

  const counts = useMemo(() => {
    const c = { new: 0, confirmed: 0, preparing: 0, ready: 0, completed: completedCount };
    orders.forEach((o) => {
      if (c[o.order_status] !== undefined && o.order_status !== "completed") c[o.order_status] += 1;
    });
    return c;
  }, [orders, completedCount]);

  const paidToday = useMemo(() => {
    const orderSum = completedOrders
      .filter((o) => o.payment_status === "paid")
      .reduce((s, o) => s + (Number(o.total) || 0), 0);
    const bookingSum = (todayBookings || [])
      .filter((b) => b.payment_status === "paid")
      .reduce((s, b) => s + (Number(b.total_amount) || 0), 0);
    return orderSum + bookingSum;
  }, [completedOrders, todayBookings]);

  const tabCounts = useMemo(() => ({
    all: orders.length,
    table: orders.filter(isTableOrder).length,
    online: orders.filter((o) => !isTableOrder(o)).length,
    completed: completedCount,
  }), [orders, completedCount]);

  const barOrders = useMemo(() =>
    orders
      .filter((o) => ["new", "confirmed", "preparing"].includes(o.order_status))
      .map((o) => ({ ...o, displayItems: (o.order_items || []).filter((i) => i.category === "drink" && !i.voided) }))
      .filter((o) => o.displayItems.length > 0)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
    [orders]
  );

  const isCompletedTab = tab === "completed";

  const visible = useMemo(() => {
    if (isCompletedTab) {
      return completedOrders
        .map((o) => ({ order: o, info: completionInfo(o) }))
        .sort((a, b) => new Date(b.info.iso) - new Date(a.info.iso));
    }
    return orders
      .filter((o) => (tab === "table" ? isTableOrder(o) : tab === "online" ? !isTableOrder(o) : true))
      .filter((o) => statusFilter ? o.order_status === statusFilter : true)
      .map((o) => ({ order: o, info: null }));
  }, [isCompletedTab, completedOrders, orders, tab, statusFilter]);

  const onReservations = view === "reservations";
  const onBar = view === "bar";
  const linkOk = onReservations ? resOk : connected;
  const viewUpdated = onReservations ? resUpdated : lastUpdated;

  const pill = {
    background: t.card, border: `1px solid ${t.border}`, borderRadius: 10, padding: "10px 16px",
    color: t.muted, cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
    fontSize: 15, fontWeight: 600, fontFamily: "inherit",
  };

  return (
    <div style={{ minHeight: "100vh", background: t.bg, color: t.text, padding: "24px 32px", fontFamily: "'DM Sans', 'Montserrat', sans-serif" }}>
      <style>{`
        @keyframes fd-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(200,169,110,0.65); }
          50%      { box-shadow: 0 0 0 12px rgba(200,169,110,0); }
        }
        .fd-flash { animation: fd-pulse 1.4s ease-in-out infinite; }
      `}</style>

      {fdAlertBanner && (
        <div
          onClick={stopFdAlertLoop}
          style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 999, background: "#d97706", color: "#fff", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: "inherit" }}
        >
          <span>{fdAlertBanner.count > 1 ? `${fdAlertBanner.count} new orders` : fdAlertBanner.label}. Tap to silence</span>
          <span style={{ fontSize: 18, lineHeight: 1 }}>x</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 16, paddingBottom: 20, borderBottom: `1px solid ${t.border}` }}>
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 28 }}>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 30, fontWeight: 700, color: t.gold, letterSpacing: "4px", textTransform: "uppercase", lineHeight: 1 }}>BLACKROCK</div>
            <div style={{ fontSize: 15, color: t.muted, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700, marginTop: 6 }}>Front Desk</div>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            {[
              { v: "orders",       label: "Front Desk",   icon: <UtensilsCrossed size={26} />, badge: counts.new,         ariaDesc: "new orders" },
              { v: "bar",          label: "Bar",          icon: <Wine size={26} />,            badge: barOrders.length,   ariaDesc: "drink orders" },
              { v: "reservations", label: "Reservations", icon: <CalendarDays size={26} />,    badge: resCounts.pending,  ariaDesc: "pending reservations" },
            ].map(({ v, label, icon, badge, ariaDesc }) => {
              const active = view === v;
              return (
                <button
                  key={v}
                  onClick={() => changeView(v)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "14px 24px", borderRadius: 12,
                    background: active ? t.gold : "transparent", color: active ? t.onGold : t.gold,
                    border: `2px solid ${t.gold}`, cursor: "pointer",
                    fontSize: 22, fontWeight: 800, fontFamily: "inherit",
                  }}
                >
                  {icon}
                  {label}
                  <span
                    aria-label={`${badge} ${ariaDesc}`}
                    style={{
                      minWidth: 36, height: 36, padding: "0 10px", borderRadius: 99, display: "inline-flex", alignItems: "center", justifyContent: "center",
                      fontSize: 18, fontWeight: 800, fontVariantNumeric: "tabular-nums",
                      background: badge > 0 ? t.accent : (active ? "rgba(0,0,0,0.18)" : "rgba(200,169,110,0.18)"),
                      color: badge > 0 ? "#ffffff" : (active ? t.onGold : t.gold),
                    }}
                  >
                    {badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {(() => {
          const active = view === "guesthouse";
          const badge = guesthouseActiveCount;
          return (
            <button
              onClick={() => changeView("guesthouse")}
              style={{
                display: "flex", alignItems: "center", gap: 12, padding: "14px 24px", borderRadius: 12,
                background: active ? t.gold : "transparent", color: active ? t.onGold : t.gold,
                border: `2px solid ${t.gold}`, cursor: "pointer",
                fontSize: 22, fontWeight: 800, fontFamily: "inherit",
                marginLeft: "auto",
              }}
            >
              <BedDouble size={26} />
              Guest House
              <span
                aria-label={`${badge} occupied rooms`}
                style={{
                  minWidth: 36, height: 36, padding: "0 10px", borderRadius: 99, display: "inline-flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, fontWeight: 800, fontVariantNumeric: "tabular-nums",
                  background: badge > 0 ? t.accent : (active ? "rgba(0,0,0,0.18)" : "rgba(200,169,110,0.18)"),
                  color: badge > 0 ? "#ffffff" : (active ? t.onGold : t.gold),
                }}
              >
                {badge}
              </span>
            </button>
          );
        })()}

        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12, flexBasis: "100%", justifyContent: "flex-end" }}>
          <div
            title={linkOk ? "Live updates connected" : (onReservations ? "Could not reach the server, retrying every 15 seconds" : "Live updates lost, checking every 15 seconds")}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 10, border: `1px solid ${linkOk ? "#16a34a" : t.accent}`, color: linkOk ? "#16a34a" : t.accent, fontSize: 15, fontWeight: 700 }}
          >
            {linkOk ? <Wifi size={18} /> : <WifiOff size={18} />}
            {linkOk ? "Connected" : "Reconnecting"}
          </div>

          <div style={{ fontSize: 15, color: t.muted, fontVariantNumeric: "tabular-nums" }}>
            Last updated {viewUpdated ? fmtSeconds(viewUpdated) : "..."}
          </div>

          <button onClick={onReservations ? fetchReservations : fetchOrders} style={pill}><RefreshCw size={18} /> Refresh</button>

          {!audioReady ? (
            <button onClick={enableSound} style={{ ...pill, background: t.gold, color: t.onGold, border: `1px solid ${t.gold}` }}>
              <Volume2 size={18} /> Enable sound
            </button>
          ) : (
            <button onClick={toggleMuted} style={{ ...pill, color: muted ? t.accent : t.text }}>
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />} {muted ? "Sound muted" : "Sound on"}
            </button>
          )}

          <button onClick={toggleTheme} style={pill} aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}>
            {isDark ? <Sun size={18} /> : <Moon size={18} />} {isDark ? "Light" : "Dark"}
          </button>

          <div style={{ fontSize: 20, fontWeight: 700, color: t.text, fontVariantNumeric: "tabular-nums" }}>{fmtClock(new Date(now))}</div>
          <SignOutButton pill={pill} />
        </div>
      </div>

      {(actionError || resPollError) && (
        <div
          role="alert"
          style={{
            position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000,
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
            padding: "18px 32px", background: BURGUNDY, color: "#ffffff",
            fontSize: 20, fontWeight: 700, boxShadow: "0 4px 18px rgba(0,0,0,0.35)",
          }}
        >
          <span>{actionError || resPollError}</span>
          <button
            onClick={() => { setActionError(""); setResPollError(""); }}
            aria-label="Dismiss error"
            style={{ background: "transparent", border: "2px solid #ffffff", borderRadius: 8, color: "#ffffff", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: 16, fontWeight: 700, fontFamily: "inherit", flexShrink: 0 }}
          >
            <X size={18} /> Dismiss
          </button>
        </div>
      )}

      {/* Waiter calls — shown in both orders and reservations views */}
      {waiterCalls.length > 0 && (
        <div style={{ background: "rgba(200,169,110,0.08)", border: `1px solid rgba(200,169,110,0.35)`, borderRadius: 12, padding: "14px 20px", margin: "20px 0 4px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: t.gold, marginBottom: 10 }}>
            Waiter Calls
          </div>
          {waiterCalls.map((call) => (
            <div key={call.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderTop: "1px solid rgba(200,169,110,0.15)" }}>
              <div>
                <span style={{ fontSize: 20, fontWeight: 700, color: t.text }}>Table {call.table_number}</span>
                <span style={{ fontSize: 14, color: t.muted, marginLeft: 12 }}>{timeSince(call.created_at, now)}</span>
              </div>
              <button
                onClick={() => ackCall(call.id)}
                disabled={callActionIds.has(call.id)}
                style={{ background: t.gold, color: t.onGold, border: "none", borderRadius: 8, padding: "10px 22px", fontSize: 15, fontWeight: 700, cursor: callActionIds.has(call.id) ? "default" : "pointer", opacity: callActionIds.has(call.id) ? 0.6 : 1, fontFamily: "inherit" }}
              >
                Acknowledge
              </button>
            </div>
          ))}
        </div>
      )}

      {view === "reservations" ? (
        <ReservationsView
          t={t}
          now={now}
          today={resToday}
          tab={resTab}
          setTab={setResTab}
          lists={resLists}
          counts={resCounts}
          loaded={resLoaded}
          flashIds={resFlashIds}
          actionIds={resActionIds}
          onConfirm={confirmReservation}
          onAskCancel={setCancelTarget}
          onMarkPaymentVerified={markPaymentVerified}
        />
      ) : view === "bar" ? (
        <BarView t={t} now={now} orders={barOrders} actionIds={actionIds} onUpdateStatus={updateBarStatus} />
      ) : view === "guesthouse" ? (
        <GuestHouseView
          t={t}
          rooms={guesthouseRooms}
          loaded={guesthouseLoaded}
          error={guesthouseError}
          actionIds={guesthouseActionIds}
          onCheckIn={checkInGuest}
          onCheckOut={checkOutGuest}
          onEncodeKey={encodeRoomKey}
          onMarkPaid={markBookingPaid}
          onRefresh={fetchGuesthouseRooms}
        />
      ) : (
      <>
      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 16, margin: "24px 0" }}>
        {STAT_KEYS.map((key) => {
          const isCompleted = key === "completed";
          const isActive = isCompleted ? isCompletedTab : statusFilter === key;
          const handleStatClick = () => {
            if (isCompleted) {
              setTab("completed");
              setStatusFilter(null);
            } else {
              setStatusFilter(statusFilter === key ? null : key);
              setTab("all");
            }
          };
          return (
            <div
              key={key}
              role="button"
              tabIndex={0}
              onClick={handleStatClick}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleStatClick(); }}
              style={{
                background: t.card, borderRadius: 12, padding: "16px 20px",
                border: `1px solid ${isActive ? t.gold : t.border}`, borderTopWidth: 5, borderTopColor: STATUS_CFG[key].color,
                cursor: "pointer",
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: t.muted }}>
                {STATUS_CFG[key].label}{isCompleted ? " Today" : ""}
              </div>
              <div style={{ fontSize: 48, fontWeight: 800, color: STATUS_CFG[key].color, lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>{counts[key]}</div>
            </div>
          );
        })}
        <div
          role="button"
          tabIndex={0}
          onClick={() => { setTab("completed"); setStatusFilter(null); }}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { setTab("completed"); setStatusFilter(null); } }}
          style={{
            background: t.card, borderRadius: 12, padding: "16px 20px",
            border: `1px solid ${isCompletedTab ? t.gold : t.border}`, borderTopWidth: 5, borderTopColor: "#16a34a",
            cursor: "pointer",
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: t.muted }}>Amount Made Today</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#16a34a", lineHeight: 1.1, fontVariantNumeric: "tabular-nums", marginTop: 4 }}>{fmtPrice(paidToday)}</div>
          <div style={{ fontSize: 12, color: t.muted, marginTop: 6 }}>Completed orders + paid rooms</div>
        </div>
      </div>

      {/* Tabs + End of Day Report */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {TABS.map((tb) => {
            const active = tab === tb.key;
            return (
              <button
                key={tb.key}
                onClick={() => { setTab(tb.key); setStatusFilter(null); }}
                style={{
                  padding: "14px 26px", borderRadius: 10, fontSize: 18, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                  background: active ? t.gold : t.card, color: active ? t.onGold : t.muted,
                  border: `1px solid ${active ? t.gold : t.border}`,
                }}
              >
                {tb.label} <span style={{ opacity: 0.75, marginLeft: 6 }}>{tabCounts[tb.key]}</span>
              </button>
            );
          })}
        </div>
        <button
          onClick={handleEndOfDayPrint}
          disabled={eodPrintStatus === "printing"}
          style={{
            display: "flex", alignItems: "center", gap: 8, padding: "14px 22px", borderRadius: 10,
            border: `1.5px solid ${eodPrintStatus === "error" ? t.accent : t.gold}`,
            background: eodPrintStatus === "ok" ? "rgba(200,169,110,0.10)" : "transparent",
            color: eodPrintStatus === "error" ? t.accent : t.gold,
            fontSize: 16, fontWeight: 700, cursor: eodPrintStatus === "printing" ? "default" : "pointer",
            fontFamily: "inherit", opacity: eodPrintStatus === "printing" ? 0.6 : 1, flexShrink: 0,
          }}
        >
          <Printer size={16} />
          {eodPrintStatus === "printing" ? "Printing..." : eodPrintStatus === "ok" ? "Sent to Printer" : eodPrintStatus === "error" ? "Print Failed" : "End of Day Report"}
        </button>
        <button
          onClick={handleKitchenEodPrint}
          disabled={kitchenPrintStatus === "printing"}
          style={{
            display: "flex", alignItems: "center", gap: 8, padding: "14px 22px", borderRadius: 10,
            border: `1.5px solid ${kitchenPrintStatus === "error" ? t.accent : t.gold}`,
            background: kitchenPrintStatus === "ok" ? "rgba(200,169,110,0.10)" : "transparent",
            color: kitchenPrintStatus === "error" ? t.accent : t.gold,
            fontSize: 16, fontWeight: 700, cursor: kitchenPrintStatus === "printing" ? "default" : "pointer",
            fontFamily: "inherit", opacity: kitchenPrintStatus === "printing" ? 0.6 : 1, flexShrink: 0,
          }}
          title="Kitchen-only EOD: Main Kitchen + Grill Kitchen + Voided items (no drinks, no guest house, no totals)"
        >
          <ChefHat size={16} />
          {kitchenPrintStatus === "printing" ? "Printing..." : kitchenPrintStatus === "ok" ? "Sent to Printer" : kitchenPrintStatus === "error" ? "Print Failed" : "Kitchen Only"}
        </button>
        <Link
          to="/eod"
          style={{
            display: "flex", alignItems: "center", gap: 8, padding: "14px 22px", borderRadius: 10,
            border: `1px solid ${t.border}`, background: "transparent", color: t.muted,
            fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            textDecoration: "none", flexShrink: 0,
          }}
          title="Browse archived EOD reports by date"
        >
          <History size={16} />
          View History
        </Link>
        <button
          onClick={handleTestPrint}
          disabled={testPrintStatus === "printing"}
          style={{
            display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", borderRadius: 10,
            border: `1px solid ${t.border}`,
            background: "transparent",
            color: testPrintStatus === "ok" ? "#16a34a" : testPrintStatus === "error" ? t.accent : t.muted,
            fontSize: 13, fontWeight: 700, cursor: testPrintStatus === "printing" ? "default" : "pointer",
            fontFamily: "inherit", opacity: testPrintStatus === "printing" ? 0.6 : 1, flexShrink: 0,
          }}
        >
          <Printer size={13} />
          {testPrintStatus === "printing" ? "Printing..." : testPrintStatus === "ok" ? "Test sent" : testPrintStatus === "error" ? "Failed" : "Test Width"}
        </button>
      </div>

      {statusFilter && !isCompletedTab && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, padding: "10px 16px", background: "rgba(200,169,110,0.08)", borderRadius: 8, border: `1px solid rgba(200,169,110,0.25)` }}>
          <span style={{ fontSize: 15, color: t.gold, fontWeight: 700 }}>
            Showing: {STATUS_CFG[statusFilter].label} ({visible.length})
          </span>
          <button
            onClick={() => setStatusFilter(null)}
            style={{ background: "none", border: `1px solid ${t.border}`, cursor: "pointer", color: t.muted, fontSize: 13, fontWeight: 700, fontFamily: "inherit", padding: "4px 10px", borderRadius: 6 }}
          >
            Clear
          </button>
        </div>
      )}

      {/* Order list */}
      {loading || (isCompletedTab && !completedLoaded) ? (
        <div style={{ textAlign: "center", color: t.muted, padding: "80px 0", fontSize: 20 }}>Loading orders...</div>
      ) : visible.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <UtensilsCrossed size={56} style={{ color: t.border, marginBottom: 16 }} />
          <p style={{ color: t.muted, fontSize: 20, margin: 0 }}>{isCompletedTab ? "No completed orders today" : "No orders to show"}</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(440px, 1fr))", gap: 20 }}>
          {visible.map(({ order, info }) => (
            <OrderCard
              key={order.id}
              order={order}
              t={t}
              now={now}
              completion={info}
              flashing={!isCompletedTab && flashIds.has(order.id)}
              readyFlashing={!isCompletedTab && readyFlashIds.has(order.id)}
              busy={actionIds.has(order.id)}
              onConfirm={confirmOrder}
              onComplete={completeOrder}
              onPayment={setPayment}
              otherTableOrders={orders.filter((o) => isTableOrder(o) && o.id !== order.id)}
            />
          ))}
        </div>
      )}
      </>
      )}

      {cancelTarget && (
        <CancelDialog
          t={t}
          reservation={cancelTarget}
          today={resToday}
          busy={resActionIds.has(cancelTarget.id)}
          onKeep={() => setCancelTarget(null)}
          onCancel={() => { const id = cancelTarget.id; setCancelTarget(null); cancelReservation(id); }}
        />
      )}

      {guesthousePinPrompt && (
        <GuesthousePinPrompt
          t={t}
          forAction={guesthousePinPrompt.forAction}
          onClose={(result) => {
            const { resolve } = guesthousePinPrompt;
            setGuesthousePinPrompt(null);
            resolve(result);
          }}
        />
      )}
    </div>
  );
}

function GuesthousePinPrompt({ t, forAction, onClose }) {
  const [pin, setPin] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");

  async function verify() {
    if (!/^\d{4,8}$/.test(pin)) { setError("Enter 4-8 digits."); return; }
    setVerifying(true); setError("");
    try {
      const res = await fetch("/api/staff-login?action=verify-guesthouse-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.token) {
        setError(data.error || "Invalid PIN.");
        setVerifying(false);
        setPin("");
        return;
      }
      onClose({ token: data.token, authorized_by: data.authorized_by });
    } catch {
      setError("Could not reach the server.");
      setVerifying(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 1600 }}
      onClick={() => !verifying && onClose(null)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: t.card, borderRadius: 14, maxWidth: 380, width: "100%", border: `2px solid ${t.gold}`, padding: 22 }}
      >
        <div style={{ fontSize: 18, fontWeight: 800, color: t.text, marginBottom: 6 }}>Guest House PIN</div>
        <div style={{ fontSize: 13, color: t.muted, marginBottom: 14 }}>
          Enter the guest house PIN to {forAction}.
        </div>
        <input
          type="password"
          inputMode="numeric"
          maxLength={8}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          onKeyDown={(e) => { if (e.key === "Enter") verify(); }}
          placeholder="PIN"
          autoFocus
          disabled={verifying}
          style={{ width: "100%", padding: "12px 14px", background: t.input, border: `1px solid ${t.border}`, borderRadius: 8, color: t.text, fontSize: 18, letterSpacing: 6, textAlign: "center", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
        />
        {error && (
          <div style={{ marginTop: 10, fontSize: 12.5, color: t.accent, background: "rgba(220,38,38,0.08)", border: `1px solid ${t.accent}`, borderRadius: 8, padding: "8px 12px" }}>{error}</div>
        )}
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button type="button" onClick={() => onClose(null)} disabled={verifying} style={{ flex: 1, padding: "10px", borderRadius: 8, border: `1px solid ${t.border}`, background: "transparent", color: t.muted, cursor: verifying ? "default" : "pointer", fontFamily: "inherit", fontSize: 13 }}>Cancel</button>
          <button type="button" onClick={verify} disabled={verifying || !pin} style={{ flex: 2, padding: "10px", borderRadius: 8, border: "none", background: t.gold, color: t.onGold, fontWeight: 700, fontSize: 13, cursor: verifying || !pin ? "default" : "pointer", opacity: verifying || !pin ? 0.6 : 1, fontFamily: "inherit" }}>
            {verifying ? "Verifying…" : "Unlock"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReservationsView({ t, now, today, tab, setTab, lists, counts, loaded, flashIds, actionIds, onConfirm, onAskCancel, onMarkPaymentVerified }) {
  const isPast = tab === "past";
  const visible = lists[tab];

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 16, margin: "24px 0" }}>
        {RES_STATS.map((s) => {
          const clickable = !!s.opens;
          const open = () => setTab(s.opens);
          return (
            <div
              key={s.key}
              role={clickable ? "button" : undefined}
              tabIndex={clickable ? 0 : undefined}
              onClick={clickable ? open : undefined}
              onKeyDown={clickable ? (e) => { if (e.key === "Enter" || e.key === " ") open(); } : undefined}
              style={{
                background: t.card, borderRadius: 12, padding: "16px 20px",
                border: `1px solid ${clickable && tab === s.opens ? t.gold : t.border}`, borderTopWidth: 5, borderTopColor: s.color,
                cursor: clickable ? "pointer" : "default",
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: t.muted }}>{s.label}</div>
              <div style={{ fontSize: 48, fontWeight: 800, color: s.color, lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>{counts[s.key]}</div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        {RES_TABS.map((tb) => {
          const active = tab === tb.key;
          return (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              style={{
                padding: "14px 26px", borderRadius: 10, fontSize: 18, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                background: active ? t.gold : t.card, color: active ? t.onGold : t.muted,
                border: `1px solid ${active ? t.gold : t.border}`,
              }}
            >
              {tb.label} <span style={{ opacity: 0.75, marginLeft: 6 }}>{counts[tb.key]}</span>
            </button>
          );
        })}
      </div>

      {!loaded ? (
        <div style={{ textAlign: "center", color: t.muted, padding: "80px 0", fontSize: 20 }}>Loading reservations...</div>
      ) : visible.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <CalendarDays size={56} style={{ color: t.border, marginBottom: 16 }} />
          <p style={{ color: t.muted, fontSize: 20, margin: 0 }}>
            {isPast ? "No reservations in the last 7 days" : tab === "pending" ? "No pending reservations" : tab === "upcoming" ? "No upcoming reservations" : "No reservations today"}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(440px, 1fr))", gap: 20 }}>
          {visible.map((r) => (
            <ReservationCard
              key={r.id}
              r={r}
              t={t}
              now={now}
              today={today}
              readOnly={isPast}
              flashing={!isPast && flashIds.has(r.id)}
              busy={actionIds.has(r.id)}
              onConfirm={onConfirm}
              onAskCancel={onAskCancel}
              onMarkPaymentVerified={onMarkPaymentVerified}
            />
          ))}
        </div>
      )}
    </>
  );
}

function ReservationCard({ r, t, now, today, readOnly, flashing, busy, onConfirm, onAskCancel, onMarkPaymentVerified }) {
  const cfg = RES_STATUS_CFG[r.status] ?? { label: r.status, color: "#6b7280" };
  const canConfirm = !readOnly && (r.status === "pending" || r.status === "rescheduled");
  const canCancel = !readOnly && r.status !== "cancelled";
  const guests = r.party ? `${r.party} ${r.party === "1" ? "guest" : "guests"}` : "Party size not given";
  const phoneHref = r.phone && isTouchDevice() ? `tel:${r.phone.replace(/[^\d+]/g, "")}` : null;

  const actionBtn = (bg, color) => ({
    flex: 1, minWidth: 140, padding: "16px 20px", borderRadius: 10, border: "none",
    background: bg, color, fontSize: 18, fontWeight: 800, cursor: busy ? "not-allowed" : "pointer",
    opacity: busy ? 0.6 : 1, fontFamily: "inherit", letterSpacing: "0.02em",
  });

  const phoneLine = (
    <>
      <Phone size={22} style={{ color: t.gold, flexShrink: 0 }} />
      {r.phone || "No phone number"}
    </>
  );

  return (
    <div
      className={flashing ? "fd-flash" : undefined}
      style={{
        background: t.card, borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column",
        border: `2px solid ${flashing ? t.gold : t.border}`, opacity: r.status === "cancelled" ? 0.72 : 1,
      }}
    >
      <div style={{ background: t.cardHead, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, borderBottom: `1px solid ${t.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
          <CalendarDays size={24} style={{ color: t.gold, flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 30, fontWeight: 800, color: t.text, lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>{fmtResTime(r.time)}</div>
            <div style={{ fontSize: 18, color: t.muted, marginTop: 2, fontWeight: 600 }}>{fmtResDate(r.date, today)}</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {flashing && (
              <span style={{ background: t.gold, color: t.onGold, borderRadius: 99, padding: "5px 12px", fontSize: 14, fontWeight: 800, letterSpacing: "0.08em" }}>NEW BOOKING</span>
            )}
            <Badge cfg={cfg} />
          </div>
          <span style={{ fontSize: 16, color: t.muted, fontWeight: 600 }}>Booked {timeSince(r.created_at, now).toLowerCase()}</span>
        </div>
      </div>

      <div style={{ padding: "16px 20px", flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: t.text, lineHeight: 1.15, wordBreak: "break-word" }}>{r.name}</div>

        {phoneHref ? (
          <a href={phoneHref} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 22, fontWeight: 700, color: t.text, textDecoration: "underline", textDecorationColor: t.gold }}>{phoneLine}</a>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 22, fontWeight: 700, color: t.text }}>{phoneLine}</div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 22, fontWeight: 700, color: t.text }}>
          <Users size={22} style={{ color: t.gold, flexShrink: 0 }} />
          {guests}
        </div>

        {(r.occasion || r.is_concierge) && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {r.occasion && (
              <span style={{ borderRadius: 99, padding: "5px 14px", fontSize: 16, fontWeight: 700, color: t.gold, border: `1.5px solid ${t.gold}` }}>{fmtOccasion(r.occasion)}</span>
            )}
            {r.is_concierge && (
              <span style={{ borderRadius: 99, padding: "5px 14px", fontSize: 16, fontWeight: 700, color: t.muted, border: `1.5px solid ${t.border}` }}>Concierge</span>
            )}
          </div>
        )}

        {r.notes && (
          <div style={{ padding: "10px 14px", borderRadius: 8, border: `1px solid ${t.accent}`, color: t.accent, fontSize: 17, fontStyle: "italic", wordBreak: "break-word" }}>
            Note: {r.notes}
          </div>
        )}

        {r.pre_selected_meals?.length > 0 && (
          <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(201,168,76,0.06)", border: `1px solid rgba(201,168,76,0.25)` }}>
            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: t.gold, marginBottom: 6 }}>
              Pre-selected meals
            </div>
            {r.pre_selected_meals.map((m, i) => (
              <div key={i} style={{ fontSize: 16, color: t.text, display: "flex", gap: 6 }}>
                <span style={{ color: t.gold, fontWeight: 700 }}>{m.qty}x</span>
                <span>{m.name}{m.modifier ? ` (${m.modifier})` : ""}</span>
              </div>
            ))}
            {r.meal_payment_status && (
              <div style={{ marginTop: 8, fontSize: 14, fontWeight: 700, color: r.meal_payment_status === "paid" ? "#22c55e" : t.gold }}>
                Payment: {r.meal_payment_status === "paid" ? "Verified" : r.meal_payment_status === "awaiting_proof" ? "Awaiting proof" : r.meal_payment_status}
                {r.meal_payment_choice === "deposit_70" ? " (70% deposit)" : r.meal_payment_choice === "pay_full" ? " (full)" : ""}
              </div>
            )}
          </div>
        )}
      </div>

      {(canConfirm || canCancel) && (
        <div style={{ padding: "0 20px 18px", display: "flex", gap: 10, flexWrap: "wrap" }}>
          {canConfirm && (
            <button disabled={busy} onClick={() => onConfirm(r.id)} style={actionBtn(t.gold, t.onGold)}>
              {busy ? "Updating..." : "Confirm"}
            </button>
          )}
          {canCancel && (
            <button disabled={busy} onClick={() => onAskCancel(r)} style={{ ...actionBtn("transparent", t.accent), border: `2px solid ${t.accent}` }}>
              Cancel
            </button>
          )}
        </div>
      )}

      {r.meal_payment_status === "awaiting_proof" && onMarkPaymentVerified && (
        <div style={{ padding: "0 20px 18px" }}>
          <button
            disabled={busy}
            onClick={() => onMarkPaymentVerified(r.id)}
            style={{ width: "100%", padding: "14px 20px", borderRadius: 10, border: "none", background: "#22c55e", color: "#ffffff", fontSize: 16, fontWeight: 800, cursor: busy ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: busy ? 0.6 : 1 }}
          >
            {busy ? "Updating..." : "Mark Payment Verified"}
          </button>
        </div>
      )}
    </div>
  );
}

function CancelDialog({ t, reservation, today, busy, onKeep, onCancel }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{ position: "fixed", inset: 0, zIndex: 900, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
    >
      <div style={{ background: t.card, color: t.text, border: `2px solid ${t.border}`, borderRadius: 16, padding: 32, maxWidth: 560, width: "100%", display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.15 }}>Cancel this booking?</div>
        <div style={{ fontSize: 22, color: t.muted, lineHeight: 1.4 }}>
          <strong style={{ color: t.text }}>{reservation.name}</strong>, {fmtResDate(reservation.date, today)} at {fmtResTime(reservation.time)}. This cannot be undone and cancelled bookings cannot be confirmed again.
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button onClick={onKeep} style={{ flex: 1, minWidth: 180, padding: "18px 20px", borderRadius: 10, border: `2px solid ${t.border}`, background: "transparent", color: t.text, fontSize: 20, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
            Keep Booking
          </button>
          <button disabled={busy} onClick={onCancel} style={{ flex: 1, minWidth: 180, padding: "18px 20px", borderRadius: 10, border: "none", background: BURGUNDY, color: "#ffffff", fontSize: 20, fontWeight: 800, cursor: busy ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
            Cancel Booking
          </button>
        </div>
      </div>
    </div>
  );
}

function Badge({ cfg }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", borderRadius: 99, padding: "5px 14px",
      fontSize: 15, fontWeight: 700, color: cfg.color, border: `1.5px solid ${cfg.color}`, background: "transparent",
      whiteSpace: "nowrap",
    }}>
      {cfg.label}
    </span>
  );
}

function MergePickerModal({ t, orders, selectedIds, onToggle, onDone }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{ position: "fixed", inset: 0, zIndex: 910, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
    >
      <div style={{ background: t.card, color: t.text, border: `2px solid ${t.border}`, borderRadius: 16, padding: 32, maxWidth: 480, width: "100%", display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ fontSize: 24, fontWeight: 800 }}>Add tables to this bill</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {orders.map((o) => {
            const sel = selectedIds.has(o.id);
            const itemCount = (o.order_items || []).length;
            const total = `₦${Number(o.total || 0).toLocaleString("en-NG")}`;
            return (
              <button
                key={o.id}
                onClick={() => onToggle(o.id)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "14px 18px", borderRadius: 10, cursor: "pointer", textAlign: "left",
                  background: sel ? "rgba(200,169,110,0.12)" : "transparent",
                  border: `2px solid ${sel ? t.gold : t.border}`,
                  color: t.text, fontFamily: "inherit",
                }}
              >
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>Table {o.table_number}</div>
                  <div style={{ fontSize: 13, color: t.muted, marginTop: 2 }}>
                    {itemCount} item{itemCount !== 1 ? "s" : ""} · {total}
                  </div>
                </div>
                <div style={{
                  width: 22, height: 22, borderRadius: 4, flexShrink: 0,
                  border: `2px solid ${sel ? t.gold : t.border}`,
                  background: sel ? t.gold : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {sel && <span style={{ color: t.onGold, fontSize: 14, fontWeight: 800, lineHeight: 1 }}>✓</span>}
                </div>
              </button>
            );
          })}
        </div>
        <button
          onClick={onDone}
          style={{ padding: "16px 20px", borderRadius: 10, border: "none", background: t.gold, color: t.onGold, fontSize: 18, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}
        >
          Done
        </button>
      </div>
    </div>
  );
}

function buildFallbackMenu() {
  const flat = [];
  Object.entries(MENU).forEach(([cat, dishes]) => {
    dishes.forEach((d, idx) => flat.push({
      id: `static-${cat.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${idx}`,
      name: d.name,
      price: parseInt((d.price || "0").replace(/[^\d]/g, ""), 10) || 0,
      category: cat,
      menuType: "food",
    }));
  });
  return flat;
}

function AddItemsModal({ order, t, staffName, onClose }) {
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState([]);
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const requestIdRef = useRef(null);
  if (!requestIdRef.current) {
    requestIdRef.current = (crypto.randomUUID && crypto.randomUUID()) ||
      `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from("menu_items")
          .select("*")
          .eq("available", true)
          .order("sort_order", { ascending: true, nullsFirst: false });
        if (cancelled) return;
        if (data?.length) {
          setMenu(data.map(it => ({
            id: it.id,
            name: it.name,
            price: Number(it.price || 0),
            category: it.category || "Other",
            menuType: it.menu_type === "drink" ? "drink" : "food",
          })));
        } else {
          setMenu(buildFallbackMenu());
        }
      } catch {
        if (!cancelled) setMenu(buildFallbackMenu());
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const categories = useMemo(() => {
    const seen = new Set();
    return menu.filter(m => { if (seen.has(m.category)) return false; seen.add(m.category); return true; }).map(m => m.category);
  }, [menu]);

  useEffect(() => { if (!activeCat && categories.length) setActiveCat(categories[0]); }, [categories, activeCat]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q) return menu.filter(m => m.name.toLowerCase().includes(q));
    return menu.filter(m => m.category === activeCat);
  }, [menu, query, activeCat]);

  function addItem(it) {
    setCart(prev => {
      const idx = prev.findIndex(c => c.id === it.id);
      if (idx >= 0) return prev.map((c, i) => i === idx ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { ...it, qty: 1, note: "" }];
    });
  }
  function setQty(id, qty) {
    if (qty <= 0) setCart(prev => prev.filter(c => c.id !== id));
    else setCart(prev => prev.map(c => c.id === id ? { ...c, qty } : c));
  }
  function setNote(id, note) {
    setCart(prev => prev.map(c => c.id === id ? { ...c, note } : c));
  }

  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);

  async function submit() {
    if (!cart.length || submitting) return;
    setSubmitting(true); setError("");
    try {
      const res = await fetch("/api/front-desk?resource=add-items", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({
          order_id: order.id,
          request_id: requestIdRef.current,
          items: cart.map(c => ({
            id: c.id,
            name: c.name,
            price: c.price,
            qty: c.qty,
            menuType: c.menuType || "food",
            modifiers: c.note?.trim() || null,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.detail ? `${data.error || "Failed"}: ${data.detail}` : (data.error || "Failed to add items."));
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 920, background: "rgba(0,0,0,0.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: t.card, color: t.text, border: `2px solid ${t.border}`, borderRadius: 16, width: "100%", maxWidth: 760, maxHeight: "90vh", display: "flex", flexDirection: "column" }}
      >
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: t.gold, fontWeight: 700 }}>Add to Table {order.table_number}</div>
            <div style={{ fontSize: 20, fontWeight: 800, marginTop: 2 }}>Extend this tab</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: t.muted, cursor: "pointer", display: "flex" }}><X size={22} /></button>
        </div>

        <div style={{ padding: "14px 24px", borderBottom: `1px solid ${t.border}`, display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: t.muted }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search menu…"
              style={{ width: "100%", padding: "10px 12px 10px 36px", borderRadius: 8, border: `1px solid ${t.border}`, background: t.input, color: t.text, fontSize: 14, fontFamily: "inherit", outline: "none" }}
            />
          </div>
        </div>

        {!query && (
          <div style={{ padding: "10px 24px", borderBottom: `1px solid ${t.border}`, overflowX: "auto", display: "flex", gap: 8 }}>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCat(cat)}
                style={{
                  padding: "7px 13px", borderRadius: 999, border: `1px solid ${activeCat === cat ? t.gold : t.border}`,
                  background: activeCat === cat ? t.gold : "transparent",
                  color: activeCat === cat ? t.onGold : t.muted,
                  fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", flex: 1, minHeight: 0 }}>
          <div style={{ overflowY: "auto", borderRight: `1px solid ${t.border}`, padding: "12px 16px" }}>
            {visible.length === 0 ? (
              <div style={{ color: t.muted, fontSize: 14, padding: 20, textAlign: "center" }}>No matches.</div>
            ) : visible.map(it => (
              <button
                key={it.id}
                onClick={() => addItem(it)}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${t.border}`, background: "transparent", color: t.text, cursor: "pointer", fontFamily: "inherit", textAlign: "left", marginBottom: 8 }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.name}</div>
                  <div style={{ fontSize: 12, color: t.muted }}>{fmtPrice(it.price)}</div>
                </div>
                <Plus size={16} style={{ color: t.gold, flexShrink: 0 }} />
              </button>
            ))}
          </div>

          <div style={{ overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            {cart.length === 0 ? (
              <div style={{ color: t.muted, fontSize: 14, textAlign: "center", padding: 20 }}>Tap items to add.</div>
            ) : cart.map(c => (
              <div key={c.id} style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${t.border}`, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: t.muted }}>{fmtPrice(c.price)} × {c.qty} = {fmtPrice(c.price * c.qty)}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button onClick={() => setQty(c.id, c.qty - 1)} style={{ width: 26, height: 26, borderRadius: 6, border: `1px solid ${t.border}`, background: "transparent", color: t.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Minus size={13} /></button>
                    <span style={{ minWidth: 20, textAlign: "center", fontWeight: 700 }}>{c.qty}</span>
                    <button onClick={() => setQty(c.id, c.qty + 1)} style={{ width: 26, height: 26, borderRadius: 6, border: `1px solid ${t.border}`, background: "transparent", color: t.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Plus size={13} /></button>
                  </div>
                </div>
                <input
                  value={c.note || ""}
                  onChange={(e) => setNote(c.id, e.target.value)}
                  placeholder="Note (e.g. Egusi, Semo)"
                  style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: `1px solid ${t.border}`, background: t.input, color: t.text, fontSize: 12, fontFamily: "inherit", outline: "none" }}
                />
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div style={{ padding: "10px 24px", color: "#ef4444", fontSize: 13, borderTop: `1px solid ${t.border}` }}>{error}</div>
        )}

        <div style={{ padding: "16px 24px", borderTop: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: t.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>Add-on total</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: t.text }}>{fmtPrice(total)}</div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} style={{ padding: "12px 18px", borderRadius: 10, border: `1px solid ${t.border}`, background: "transparent", color: t.muted, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
            <button
              onClick={submit}
              disabled={!cart.length || submitting}
              style={{ padding: "12px 22px", borderRadius: 10, border: "none", background: !cart.length || submitting ? t.border : t.gold, color: !cart.length || submitting ? t.muted : t.onGold, fontSize: 14, fontWeight: 800, cursor: !cart.length || submitting ? "not-allowed" : "pointer", fontFamily: "inherit" }}
            >
              {submitting ? "Adding…" : "Add Items →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderCard({ order, t, now, completion, flashing, readyFlashing, busy, onConfirm, onComplete, onPayment, otherTableOrders }) {
  const _baseCfg = STATUS_CFG[order.order_status] ?? { label: order.order_status, color: "#6b7280" };
  const statusCfg = (order.order_status === "new" && (order.order_type === "pickup" || order.order_type === "delivery"))
    ? { ..._baseCfg, label: "Awaiting confirmation" }
    : _baseCfg;
  const payCfg = PAYMENT_CFG[order.payment_status] ?? { label: order.payment_status || "Unknown", color: "#6b7280" };
  const items = (order.order_items || []).filter((it) => !it.voided);
  const session = useStaffSession();
  const staffName = session?.profile?.full_name || "Front Desk";
  const [mergedIds, setMergedIds] = useState(() => new Set());
  const [showMerge, setShowMerge] = useState(false);
  const [showAddItems, setShowAddItems] = useState(false);
  const [showEditOrder, setShowEditOrder] = useState(false);
  const [printStatus, setPrintStatus] = useState(null);

  const mergedOrders = (otherTableOrders || []).filter((o) => mergedIds.has(o.id));
  const printOrders = [order, ...mergedOrders];
  const tableList = printOrders.filter((o) => o.table_number).map((o) => `Table ${o.table_number}`).join(', ');
  const printLabel = printStatus === 'printing' ? 'Printing...'
    : printStatus === 'ok' ? 'Sent to Printer'
    : printStatus === 'error' ? 'Print Failed - Try Again'
    : mergedIds.size > 0 ? `Print Bill (${tableList})`
    : 'Print Receipt';
  const hasMergeable = isTableOrder(order) && otherTableOrders && otherTableOrders.length > 0;

  function toggleMerge(id) {
    setMergedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handlePrint() {
    setPrintStatus('printing');
    const html = applyPrintStyle(buildReceiptHtml(printOrders));
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.printReceipt(html);
        setPrintStatus(result.success ? 'ok' : 'error');
      } else {
        const w = window.open('', '_blank');
        if (w) {
          w.document.write(html);
          w.document.close();
          w.focus();
          try { w.print(); } catch {}
          setPrintStatus('ok');
        } else {
          setPrintStatus('error');
        }
      }
    } catch {
      setPrintStatus('error');
    }
    setTimeout(() => setPrintStatus(null), 3000);
  }

  const inCompletedTab = !!completion;
  const cancelled = order.order_status === "cancelled";
  const canConfirm = !inCompletedTab && order.order_status === "new";
  const canComplete = !inCompletedTab && order.order_status === "ready";
  const canAddItems = !inCompletedTab && !cancelled && isTableOrder(order) && ACTIVE_STATUSES.includes(order.order_status);
  const isPaid = order.payment_status === "paid";
  const canMarkPaid = !isPaid && !cancelled && (inCompletedTab || order.payment_status !== "failed");
  const canProof = !inCompletedTab && order.payment_status === "awaiting_proof" && !cancelled;
  const timeLine = inCompletedTab
    ? (completion.known ? `Completed ${fmtLagosTime(completion.iso)}` : `Placed ${fmtLagosTime(order.created_at)}`)
    : timeSince(order.created_at, now);

  const actionBtn = (bg, color) => ({
    flex: 1, minWidth: 140, padding: "16px 20px", borderRadius: 10, border: "none",
    background: bg, color, fontSize: 18, fontWeight: 800, cursor: busy ? "not-allowed" : "pointer",
    opacity: busy ? 0.6 : 1, fontFamily: "inherit", letterSpacing: "0.02em",
  });

  return (
    <div
      className={flashing ? "fd-flash" : undefined}
      style={{
        background: t.card, borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column",
        border: `2px solid ${readyFlashing ? "#16a34a" : flashing ? t.gold : t.border}`, opacity: cancelled ? 0.72 : 1,
      }}
    >
      <div style={{ background: t.cardHead, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, borderBottom: `1px solid ${t.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
          <OrderIcon order={order} color={t.gold} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: t.text, lineHeight: 1.1 }}>{orderLabel(order)}</div>
            {order.placed_by && (
              <div style={{ fontSize: 15, fontWeight: 700, color: t.gold, marginTop: 3, lineHeight: 1 }}>Waiter: {order.placed_by}</div>
            )}
            <div style={{ fontSize: 16, color: t.muted, marginTop: 2 }}>
              {order.order_number || order.id.slice(0, 8)}
              {order.guest_name ? ` · ${order.guest_name}` : ""}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {readyFlashing && (
              <span style={{ background: "#16a34a", color: "#fff", borderRadius: 99, padding: "5px 12px", fontSize: 14, fontWeight: 800, letterSpacing: "0.08em" }}>READY</span>
            )}
            {flashing && !readyFlashing && (
              <span style={{ background: t.gold, color: t.onGold, borderRadius: 99, padding: "5px 12px", fontSize: 14, fontWeight: 800, letterSpacing: "0.08em" }}>NEW ORDER</span>
            )}
            <Badge cfg={statusCfg} />
          </div>
          <span style={{ fontSize: 16, color: t.muted, fontWeight: 600 }}>{timeLine}</span>
        </div>
      </div>

      <div style={{ padding: "16px 20px", flex: 1 }}>
        {items.length === 0 ? (
          <div style={{ fontSize: 17, color: t.muted }}>No items recorded</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {items.map((item, idx) => (
              <div key={item.id || idx} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 19, color: t.text }}>
                <div style={{ fontWeight: 600 }}>
                  <span style={{ display: "inline-block", minWidth: 40, color: t.gold, fontWeight: 800 }}>{item.qty}×</span>
                  {item.item_name}
                  {item.modifiers && (
                    <div style={{ fontSize: 15, color: t.gold, fontWeight: 500, fontStyle: "italic", marginTop: 2, marginLeft: 40 }}>{item.modifiers}</div>
                  )}
                </div>
                <div style={{ color: t.muted, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{fmtPrice(item.line_total)}</div>
              </div>
            ))}
          </div>
        )}
        {order.special_instructions && (
          <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 8, border: `1px solid ${t.accent}`, color: t.accent, fontSize: 16, fontStyle: "italic" }}>
            Note: {order.special_instructions}
          </div>
        )}
      </div>

      <div style={{ padding: "14px 20px", borderTop: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontSize: 30, fontWeight: 800, color: t.text, fontVariantNumeric: "tabular-nums" }}>{fmtPrice(order.total)}</div>
        <Badge cfg={payCfg} />
      </div>

      {(canConfirm || canComplete || canMarkPaid || canProof) && (
        <div style={{ padding: "0 20px 18px", display: "flex", gap: 10, flexWrap: "wrap" }}>
          {canConfirm && (
            <button disabled={busy} onClick={() => onConfirm(order.id)} style={actionBtn(t.gold, t.onGold)}>
              {busy ? "Updating..." : "Confirm"}
            </button>
          )}
          {canComplete && (
            <button disabled={busy} onClick={() => onComplete(order.id)} style={actionBtn("#16a34a", "#ffffff")}>
              {busy ? "Updating..." : "Mark Completed"}
            </button>
          )}
          {canProof && (
            <button disabled={busy} onClick={() => onPayment(order.id, "proof_received")} style={{ ...actionBtn("transparent", t.text), border: `2px solid ${t.border}` }}>
              Proof Received
            </button>
          )}
          {canMarkPaid && (
            <button disabled={busy} onClick={() => onPayment(order.id, "paid")} style={{ ...actionBtn("transparent", t.accent), border: `2px solid ${t.accent}` }}>
              Mark Paid
            </button>
          )}
        </div>
      )}

      {items.length > 0 && (
        <div style={{ padding: "0 20px 18px" }}>
          <div style={{ borderTop: `1px dashed ${t.border}`, paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              onClick={handlePrint}
              disabled={printStatus === 'printing'}
              style={{
                width: "100%", padding: "11px 16px", borderRadius: 10,
                border: `1.5px solid ${printStatus === 'error' ? t.accent : t.gold}`,
                background: printStatus === 'ok' ? "rgba(200,169,110,0.10)" : "transparent",
                color: printStatus === 'error' ? t.accent : t.gold,
                fontSize: 15, fontWeight: 700,
                cursor: printStatus === 'printing' ? "default" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                fontFamily: "inherit", opacity: printStatus === 'printing' ? 0.6 : 1,
              }}
            >
              <Printer size={15} />
              {printLabel}
            </button>
            {canAddItems && (
              <button
                onClick={() => setShowAddItems(true)}
                style={{
                  width: "100%", padding: "11px 16px", borderRadius: 10,
                  border: `1.5px dashed ${t.gold}`, background: "transparent",
                  color: t.gold, fontSize: 14, fontWeight: 700, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  fontFamily: "inherit",
                }}
              >
                <Plus size={15} /> Add Items to Table {order.table_number}
              </button>
            )}
            {canAddItems && items.length > 0 && (
              <button
                onClick={() => setShowEditOrder(true)}
                style={{
                  width: "100%", padding: "11px 16px", borderRadius: 10,
                  border: `1.5px solid ${t.border}`, background: "transparent",
                  color: t.muted, fontSize: 14, fontWeight: 700, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  fontFamily: "inherit",
                }}
              >
                <Lock size={14} /> Edit / Void Items
              </button>
            )}
            {hasMergeable && (
              <button
                onClick={() => setShowMerge(true)}
                style={{
                  display: "block", width: "100%", background: "none", border: "none",
                  cursor: "pointer", color: t.muted, fontSize: 13, textAlign: "center",
                  fontFamily: "inherit", padding: "2px 0",
                }}
              >
                + Add another table to this bill
                {mergedIds.size > 0 && <span style={{ color: t.gold, marginLeft: 6 }}>({mergedIds.size} added)</span>}
              </button>
            )}
          </div>
        </div>
      )}

      {showMerge && (
        <MergePickerModal
          t={t}
          orders={otherTableOrders}
          selectedIds={mergedIds}
          onToggle={toggleMerge}
          onDone={() => setShowMerge(false)}
        />
      )}
      {showAddItems && (
        <AddItemsModal
          order={order}
          t={t}
          staffName={staffName}
          onClose={() => setShowAddItems(false)}
        />
      )}
      {showEditOrder && (
        <EditOrderModal
          order={order}
          t={t}
          onClose={() => setShowEditOrder(false)}
          onAddItems={() => { setShowEditOrder(false); setShowAddItems(true); }}
        />
      )}
    </div>
  );
}

function EditOrderModal({ order, t, onClose, onAddItems }) {
  const [stage, setStage] = useState("pin");
  const [pin, setPin] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [token, setToken] = useState("");
  const [authorizedBy, setAuthorizedBy] = useState("");
  const [tokenExp, setTokenExp] = useState(0);
  const [error, setError] = useState("");
  const [busyItemId, setBusyItemId] = useState("");
  const [items, setItems] = useState(() => (order.order_items || []).filter((i) => !i.voided));
  const [voidingItem, setVoidingItem] = useState(null);
  const [voidReason, setVoidReason] = useState("");

  async function verifyPin() {
    if (!/^\d{4,8}$/.test(pin)) { setError("Enter 4-8 digits."); return; }
    setVerifying(true); setError("");
    try {
      const res = await fetch("/api/verify-void-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.error || "Invalid PIN.");
        return;
      }
      setToken(data.token);
      setAuthorizedBy(data.authorized_by?.name || "");
      setTokenExp(data.expires_at || 0);
      setStage("edit");
    } finally {
      setVerifying(false);
      setPin("");
    }
  }

  async function callOrderItems(method, body) {
    const res = await fetch("/api/front-desk?resource=order-items", {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Void-Token": token,
        ...(await authHeader()),
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Failed.");
    return data;
  }

  function askVoid(it) {
    setVoidingItem(it);
    setVoidReason("");
    setError("");
  }

  async function confirmVoid() {
    const it = voidingItem;
    if (!it) return;
    const reason = voidReason.trim() ? voidReason.trim() : null;
    setBusyItemId(it.id); setError("");
    try {
      await callOrderItems("POST", { order_id: order.id, item_id: it.id, reason });
      setItems((prev) => prev.filter((x) => x.id !== it.id));
      setVoidingItem(null);
      setVoidReason("");
    } catch (e) {
      setError(e.message);
      if (/pin/i.test(e.message)) setStage("pin");
    } finally {
      setBusyItemId("");
    }
  }

  async function changeQty(it, delta) {
    const nextQty = Math.max(1, it.qty + delta);
    if (nextQty === it.qty) return;
    setBusyItemId(it.id); setError("");
    try {
      await callOrderItems("PATCH", { order_id: order.id, item_id: it.id, qty: nextQty });
      setItems((prev) => prev.map((x) => x.id === it.id ? { ...x, qty: nextQty, line_total: Number(x.unit_price || 0) * nextQty } : x));
    } catch (e) {
      setError(e.message);
      if (/pin/i.test(e.message)) setStage("pin");
    } finally {
      setBusyItemId("");
    }
  }

  const expiresIn = tokenExp ? Math.max(0, Math.round((tokenExp - Date.now()) / 1000)) : 0;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 70, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)" }} onClick={onClose} />
      <div style={{
        position: "relative", width: "100%", maxWidth: 540,
        background: t.card, border: `1px solid ${t.border}`,
        borderRadius: 12, padding: 24, color: t.text, maxHeight: "88vh", overflow: "auto",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
              <Lock size={16} style={{ color: t.gold }} /> Edit / Void — Table {order.table_number}
            </div>
            <div style={{ fontSize: 12, color: t.muted, marginTop: 4 }}>
              Order {order.order_number || order.id.slice(0, 8)}
              {authorizedBy && ` · authorized by ${authorizedBy} (${expiresIn}s)`}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: t.muted }}>
            <X size={18} />
          </button>
        </div>

        {stage === "pin" && (
          <div>
            <div style={{ fontSize: 13, color: t.muted, marginBottom: 12 }}>
              Enter the manager's void PIN. Only Oluchi, Super Admins, and staff with void authorization can approve.
            </div>
            <input
              type="password"
              inputMode="numeric"
              maxLength={8}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => { if (e.key === "Enter") verifyPin(); }}
              placeholder="Manager PIN"
              autoFocus
              style={{ width: "100%", padding: "12px 14px", background: t.input, border: `1px solid ${t.border}`, borderRadius: 8, color: t.text, fontSize: 18, letterSpacing: 6, textAlign: "center", outline: "none" }}
            />
            {error && (
              <div style={{ marginTop: 10, fontSize: 12.5, color: t.accent, background: "rgba(220,38,38,0.08)", border: `1px solid ${t.accent}`, borderRadius: 8, padding: "8px 12px" }}>{error}</div>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button onClick={onClose} style={{ flex: 1, padding: "10px", borderRadius: 8, border: `1px solid ${t.border}`, background: "transparent", color: t.muted, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>Cancel</button>
              <button onClick={verifyPin} disabled={verifying || !pin} style={{ flex: 2, padding: "10px", borderRadius: 8, border: "none", background: t.gold, color: t.onGold, fontWeight: 700, fontSize: 13, cursor: verifying ? "default" : "pointer", opacity: verifying || !pin ? 0.6 : 1 }}>
                {verifying ? "Verifying…" : "Unlock"}
              </button>
            </div>
          </div>
        )}

        {stage === "edit" && (
          <div>
            {items.length === 0 ? (
              <div style={{ padding: "24px", textAlign: "center", color: t.muted, fontSize: 14 }}>
                Nothing left on this order.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {items.map((it) => (
                  <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", border: `1px solid ${t.border}`, borderRadius: 8, background: t.input }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>{it.item_name}</div>
                      <div style={{ fontSize: 11.5, color: t.muted }}>₦{Number(it.unit_price || 0).toLocaleString("en-NG")} each</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <button onClick={() => changeQty(it, -1)} disabled={busyItemId === it.id || it.qty <= 1} style={{ padding: 6, border: `1px solid ${t.border}`, background: "transparent", color: t.text, borderRadius: 6, cursor: "pointer" }}>
                        <Minus size={12} />
                      </button>
                      <span style={{ minWidth: 24, textAlign: "center", fontWeight: 700, color: t.gold }}>{it.qty}</span>
                      <button onClick={() => changeQty(it, 1)} disabled={busyItemId === it.id} style={{ padding: 6, border: `1px solid ${t.border}`, background: "transparent", color: t.text, borderRadius: 6, cursor: "pointer" }}>
                        <Plus size={12} />
                      </button>
                    </div>
                    <button onClick={() => askVoid(it)} disabled={busyItemId === it.id} style={{ padding: "6px 10px", border: `1px solid ${t.accent}`, background: "transparent", color: t.accent, borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
                      <Trash2 size={12} /> Void
                    </button>
                  </div>
                ))}
              </div>
            )}
            {voidingItem && (
              <div style={{ marginTop: 14, padding: 14, border: `1px solid ${t.accent}`, borderRadius: 8, background: "rgba(220,38,38,0.08)" }}>
                <div style={{ fontSize: 13, color: t.text, marginBottom: 8 }}>
                  Void <strong>{voidingItem.item_name}</strong> from this order?
                </div>
                <input
                  type="text"
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value.slice(0, 240))}
                  placeholder="Reason (optional)"
                  autoFocus
                  style={{ width: "100%", padding: "8px 10px", background: t.input, border: `1px solid ${t.border}`, borderRadius: 6, color: t.text, fontSize: 13, outline: "none", marginBottom: 10 }}
                />
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button onClick={() => { setVoidingItem(null); setVoidReason(""); }} disabled={!!busyItemId} style={{ padding: "8px 14px", borderRadius: 6, border: `1px solid ${t.border}`, background: "transparent", color: t.muted, cursor: "pointer", fontSize: 12.5 }}>
                    Cancel
                  </button>
                  <button onClick={confirmVoid} disabled={busyItemId === voidingItem.id} style={{ padding: "8px 14px", borderRadius: 6, border: "none", background: t.accent, color: "#fff", cursor: "pointer", fontSize: 12.5, fontWeight: 700, opacity: busyItemId === voidingItem.id ? 0.6 : 1 }}>
                    {busyItemId === voidingItem.id ? "Voiding…" : "Confirm Void"}
                  </button>
                </div>
              </div>
            )}
            {error && (
              <div style={{ marginTop: 12, fontSize: 12.5, color: t.accent, background: "rgba(220,38,38,0.08)", border: `1px solid ${t.accent}`, borderRadius: 8, padding: "8px 12px" }}>{error}</div>
            )}
            <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", gap: 10 }}>
              {onAddItems ? (
                <button onClick={onAddItems} style={{ padding: "10px 16px", borderRadius: 8, border: `1px dashed ${t.gold}`, background: "transparent", color: t.gold, fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  <Plus size={14} /> Add
                </button>
              ) : <div />}
              <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, border: `1px solid ${t.border}`, background: "transparent", color: t.text, fontFamily: "inherit", fontSize: 13, cursor: "pointer" }}>
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BarView({ t, now, orders, actionIds, onUpdateStatus }) {
  if (orders.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "80px 0" }}>
        <Wine size={56} style={{ color: t.border, marginBottom: 16 }} />
        <p style={{ color: t.muted, fontSize: 20, margin: 0 }}>No drink orders in queue</p>
      </div>
    );
  }
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16, marginTop: 24 }}>
      {orders.map((order) => (
        <BarDeskCard key={order.id} order={order} t={t} now={now} busy={actionIds.has(order.id)} onUpdate={onUpdateStatus} />
      ))}
    </div>
  );
}

function BarDeskCard({ order, t, now, busy, onUpdate }) {
  const cfg = STATUS_CFG[order.order_status] ?? { label: order.order_status, color: "#6b7280" };
  const isNew = order.order_status === "new" || order.order_status === "confirmed";
  const nextStatus = isNew ? "preparing" : "ready";
  const nextLabel = isNew ? "Start Preparing" : "Mark Ready";

  return (
    <div style={{
      background: t.card, borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column",
      border: `2px solid ${order.order_status === "preparing" ? "#8b5cf6" : t.border}`,
    }}>
      <div style={{ background: t.cardHead, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${t.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Wine size={20} style={{ color: t.gold }} />
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: t.text }}>{orderLabel(order)}</div>
            <div style={{ fontSize: 13, color: t.muted }}>{order.order_number} · {timeSince(order.created_at, now)}</div>
          </div>
        </div>
        <Badge cfg={cfg} />
      </div>
      <div style={{ padding: "14px 18px", flex: 1 }}>
        {order.displayItems.map((item, idx) => (
          <div key={item.id || idx} style={{ display: "flex", gap: 10, marginBottom: idx < order.displayItems.length - 1 ? 10 : 0 }}>
            <span style={{ color: t.gold, fontWeight: 800, fontSize: 17, minWidth: 30 }}>{item.qty}x</span>
            <div>
              <span style={{ fontSize: 16, fontWeight: 600, color: t.text }}>{item.item_name}</span>
              {item.modifiers && (
                <div style={{ fontSize: 13, color: t.gold, fontStyle: "italic", marginTop: 2 }}>{item.modifiers}</div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: "12px 18px", borderTop: `1px solid ${t.border}` }}>
        <button
          onClick={() => onUpdate(order.id, nextStatus)}
          disabled={busy}
          style={{
            width: "100%", padding: "14px 20px", borderRadius: 8, border: "none",
            background: nextStatus === "ready" ? "#22c55e" : t.gold,
            color: nextStatus === "ready" ? "#fff" : t.onGold,
            fontSize: 16, fontWeight: 700, cursor: busy ? "not-allowed" : "pointer",
            opacity: busy ? 0.6 : 1, fontFamily: "inherit",
          }}
        >
          {busy ? "Updating..." : nextLabel}
        </button>
      </div>
    </div>
  );
}

function GuestHouseView({ t, rooms, loaded, error, actionIds, onCheckIn, onCheckOut, onEncodeKey, onMarkPaid, onRefresh }) {
  const [checkInRoom, setCheckInRoom] = useState(null);
  const [tab, setTab] = useState("rooms");
  const fmtN = (n) => "₦" + Number(n || 0).toLocaleString("en-NG");

  if (!loaded) {
    return <div style={{ textAlign: "center", color: t.muted, padding: "80px 0", fontSize: 20 }}>Loading rooms…</div>;
  }

  return (
    <>
      {error ? (
        <div style={{ margin: "20px 0 4px", padding: "14px 18px", borderRadius: 10, background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.4)", color: t.accent, fontSize: 15, fontWeight: 600 }}>
          {error}
        </div>
      ) : null}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "24px 0 16px", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: t.text, display: "flex", alignItems: "center", gap: 12 }}>
            <BedDouble size={26} style={{ color: t.gold }} /> Guest House
          </div>
          <div style={{ display: "inline-flex", borderRadius: 10, border: `1px solid ${t.border}`, overflow: "hidden" }}>
            <button
              onClick={() => setTab("rooms")}
              style={{ padding: "8px 16px", fontSize: 14, fontWeight: 700, background: tab === "rooms" ? t.gold : "transparent", color: tab === "rooms" ? t.onGold : t.text, border: "none", cursor: "pointer", fontFamily: "inherit" }}
            >
              Rooms
            </button>
            <button
              onClick={() => setTab("history")}
              style={{ padding: "8px 16px", fontSize: 14, fontWeight: 700, background: tab === "history" ? t.gold : "transparent", color: tab === "history" ? t.onGold : t.text, border: "none", borderLeft: `1px solid ${t.border}`, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <History size={14} /> Guest History
            </button>
          </div>
        </div>
        {tab === "rooms" ? (
          <button
            onClick={onRefresh}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 10, border: `1px solid ${t.border}`, background: t.card, color: t.text, cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 600 }}
          >
            <RefreshCw size={16} /> Refresh
          </button>
        ) : null}
      </div>

      {tab === "history" ? (
        <GuestHistoryPanel t={t} />
      ) : (
      <>
      <div style={{ display: "none" }} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 20 }}>
        {rooms.map((room) => {
          const b = room.active_booking;
          const busy = actionIds.has(room.id);
          const occupied = !!b;
          const borderColor = occupied ? t.accent : "rgba(22,163,74,0.6)";
          return (
            <div key={room.id} style={{ background: t.card, borderRadius: 14, border: `2px solid ${borderColor}`, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div style={{ background: t.cardHead, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${t.border}` }}>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: t.text }}>Room {room.room_number}</div>
                  <div style={{ fontSize: 14, color: t.muted, marginTop: 4 }}>{room.room_type}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: t.gold, fontVariantNumeric: "tabular-nums" }}>{fmtN(room.price)}</div>
                  <div style={{ fontSize: 13, color: t.muted }}>per night</div>
                </div>
              </div>

              <div style={{ padding: "16px 20px", flex: 1 }}>
                {occupied ? (
                  <>
                    <div style={{ fontSize: 13, letterSpacing: "0.14em", textTransform: "uppercase", color: t.accent, fontWeight: 700, marginBottom: 8 }}>Occupied</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: t.text }}>{b.guest_name}</div>
                    {b.guest_phone ? <div style={{ fontSize: 14, color: t.muted, marginTop: 4 }}>{b.guest_phone}</div> : null}
                    <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 10, fontSize: 14, color: t.text }}>
                      <span><strong>{b.nights}</strong> night{b.nights !== 1 ? "s" : ""}</span>
                      {b.discount > 0 ? <span>· Discount {fmtN(b.discount)}</span> : null}
                      <span>· Total <strong style={{ color: t.gold }}>{fmtN(b.total_amount)}</strong></span>
                    </div>
                    <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
                      <span style={{ padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 700, background: b.payment_status === "paid" ? "#16a34a" : "#d97706", color: "#fff" }}>
                        {b.payment_status === "paid" ? "Paid" : "Unpaid"}
                      </span>
                      {b.key_encoded_at ? (
                        <span style={{ padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 700, background: "rgba(200,169,110,0.2)", color: t.gold, display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <KeyRound size={12} /> Key encoded
                        </span>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 13, letterSpacing: "0.14em", textTransform: "uppercase", color: "#16a34a", fontWeight: 700 }}>Available</div>
                )}
              </div>

              <div style={{ padding: "14px 20px", borderTop: `1px solid ${t.border}`, display: "flex", flexWrap: "wrap", gap: 10 }}>
                {occupied ? (
                  <>
                    <button
                      onClick={() => onEncodeKey(room)}
                      disabled={busy}
                      style={{ flex: 1, minWidth: 140, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 14px", borderRadius: 8, border: `1px solid ${t.gold}`, background: "transparent", color: t.gold, fontWeight: 700, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.5 : 1, fontFamily: "inherit", fontSize: 14 }}
                    >
                      <KeyRound size={16} /> Encode key
                    </button>
                    {b.payment_status !== "paid" ? (
                      <button
                        onClick={() => onMarkPaid(room, "cash")}
                        disabled={busy}
                        style={{ flex: 1, minWidth: 120, padding: "12px 14px", borderRadius: 8, border: "none", background: t.gold, color: t.onGold, fontWeight: 700, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.5 : 1, fontFamily: "inherit", fontSize: 14 }}
                      >
                        Mark paid
                      </button>
                    ) : null}
                    <button
                      onClick={() => onCheckOut(room)}
                      disabled={busy}
                      style={{ flex: 1, minWidth: 120, padding: "12px 14px", borderRadius: 8, border: "none", background: t.accent, color: "#fff", fontWeight: 700, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.5 : 1, fontFamily: "inherit", fontSize: 14 }}
                    >
                      Check out
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setCheckInRoom(room)}
                    disabled={busy}
                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px", borderRadius: 8, border: "none", background: t.gold, color: t.onGold, fontWeight: 800, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.5 : 1, fontFamily: "inherit", fontSize: 16 }}
                  >
                    <LogInIcon size={18} /> Check in guest
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {checkInRoom ? (
        <CheckInModal
          t={t}
          room={checkInRoom}
          onClose={() => setCheckInRoom(null)}
          onSubmit={async (form) => { await onCheckIn(checkInRoom, form); setCheckInRoom(null); }}
        />
      ) : null}
      </>
      )}
    </>
  );
}

function GuestHistoryPanel({ t }) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });
  const [from, setFrom] = useState(thirtyDaysAgo);
  const [to, setTo] = useState(today);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const fmtN = (n) => "₦" + Number(n || 0).toLocaleString("en-NG");

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (statusFilter) params.set("status", statusFilter);
      const url = `/api/front-desk?resource=guesthouse-bookings&${params.toString()}`;
      const res = await fetch(url, { headers: { ...(await authHeader()) } });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(json.error || "Could not load history."); setBookings([]); }
      else setBookings(json.bookings || []);
    } catch {
      setErr("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }, [from, to, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return bookings;
    return bookings.filter((b) =>
      (b.guest_name || "").toLowerCase().includes(q)
      || (b.guest_phone || "").toLowerCase().includes(q)
      || (b.guest_email || "").toLowerCase().includes(q)
      || String(b.room_number || "").toLowerCase().includes(q)
    );
  }, [bookings, search]);

  const stats = useMemo(() => {
    const paid = filtered.filter((b) => b.payment_status === "paid");
    return {
      count: filtered.length,
      paidRevenue: paid.reduce((s, b) => s + Number(b.total_amount || 0), 0),
      unpaid: filtered.length - paid.length,
    };
  }, [filtered]);

  const inputStyle = { padding: "9px 12px", borderRadius: 8, border: `1px solid ${t.border}`, background: t.input, color: t.text, fontSize: 14, fontFamily: "inherit" };

  function statusChip(b) {
    const map = {
      active:    { bg: "#16a34a", label: "Active" },
      checked_out:{bg: "#6b7280", label: "Checked out" },
      cancelled: { bg: "#991b1b", label: "Cancelled" },
    };
    const m = map[b.status] || { bg: "#6b7280", label: b.status || "—" };
    return (
      <span style={{ padding: "3px 9px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: m.bg, color: "#fff" }}>{m.label}</span>
    );
  }

  function fmtDate(iso) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString("en-GB", { timeZone: "Africa/Lagos", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch { return iso; }
  }

  return (
    <div>
      <div style={{ background: t.card, borderRadius: 12, border: `1px solid ${t.border}`, padding: 16, marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: t.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>From</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={inputStyle} />
          </label>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: t.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>To</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={inputStyle} />
          </label>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: t.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Status</span>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={inputStyle}>
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="checked_out">Checked out</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: t.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Search (name / phone / room)</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Type to filter…" style={inputStyle} />
          </label>
        </div>
        <div style={{ marginTop: 12, display: "flex", gap: 24, flexWrap: "wrap", fontSize: 13, color: t.muted }}>
          <span><strong style={{ color: t.text }}>{stats.count}</strong> booking{stats.count !== 1 ? "s" : ""}</span>
          <span>Paid revenue: <strong style={{ color: t.gold }}>{fmtN(stats.paidRevenue)}</strong></span>
          {stats.unpaid > 0 ? <span>Unpaid: <strong style={{ color: t.accent }}>{stats.unpaid}</strong></span> : null}
        </div>
      </div>

      {err ? (
        <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.4)", color: t.accent, fontSize: 14, marginBottom: 12 }}>
          {err}
        </div>
      ) : null}

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: t.muted, fontSize: 15 }}>Loading history…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: t.muted, fontSize: 15, fontStyle: "italic" }}>
          No bookings found for this filter.
        </div>
      ) : (
        <div style={{ background: t.card, borderRadius: 12, border: `1px solid ${t.border}`, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ background: t.cardHead }}>
                  <th style={{ textAlign: "left", padding: "10px 14px", color: t.muted, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: `1px solid ${t.border}` }}>Guest</th>
                  <th style={{ textAlign: "left", padding: "10px 14px", color: t.muted, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: `1px solid ${t.border}` }}>Room</th>
                  <th style={{ textAlign: "left", padding: "10px 14px", color: t.muted, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: `1px solid ${t.border}` }}>Check-in</th>
                  <th style={{ textAlign: "left", padding: "10px 14px", color: t.muted, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: `1px solid ${t.border}` }}>Check-out</th>
                  <th style={{ textAlign: "right", padding: "10px 14px", color: t.muted, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: `1px solid ${t.border}` }}>Nts</th>
                  <th style={{ textAlign: "right", padding: "10px 14px", color: t.muted, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: `1px solid ${t.border}` }}>Total</th>
                  <th style={{ textAlign: "left", padding: "10px 14px", color: t.muted, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: `1px solid ${t.border}` }}>Status</th>
                  <th style={{ textAlign: "left", padding: "10px 14px", color: t.muted, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: `1px solid ${t.border}` }}>Pay</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr key={b.id} style={{ borderBottom: `1px solid ${t.border}` }}>
                    <td style={{ padding: "10px 14px", color: t.text }}>
                      <div style={{ fontWeight: 700 }}>{b.guest_name || "—"}</div>
                      {b.guest_phone ? <div style={{ fontSize: 12, color: t.muted }}>{b.guest_phone}</div> : null}
                      {b.guest_email ? <div style={{ fontSize: 12, color: t.muted }}>{b.guest_email}</div> : null}
                    </td>
                    <td style={{ padding: "10px 14px", color: t.text, fontWeight: 700 }}>{b.room_number || "—"}</td>
                    <td style={{ padding: "10px 14px", color: t.muted, fontSize: 13 }}>{fmtDate(b.check_in_at)}</td>
                    <td style={{ padding: "10px 14px", color: t.muted, fontSize: 13 }}>{fmtDate(b.check_out_at)}</td>
                    <td style={{ padding: "10px 14px", color: t.text, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{b.nights || "—"}</td>
                    <td style={{ padding: "10px 14px", color: t.gold, textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmtN(b.total_amount)}</td>
                    <td style={{ padding: "10px 14px" }}>{statusChip(b)}</td>
                    <td style={{ padding: "10px 14px", color: b.payment_status === "paid" ? "#16a34a" : t.accent, fontWeight: 700, fontSize: 12, textTransform: "uppercase" }}>
                      {b.payment_status === "paid" ? "Paid" : "Unpaid"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function CheckInModal({ t, room, onClose, onSubmit }) {
  const [guest_name, setGuestName] = useState("");
  const [guest_phone, setGuestPhone] = useState("");
  const [guest_email, setGuestEmail] = useState("");
  const [nights, setNights] = useState(1);
  const [discount, setDiscount] = useState(0);
  const [payment_method, setPaymentMethod] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const base = (Number(room.price) || 0) * Math.max(1, Number(nights) || 1);
  const total = Math.max(0, base - (Number(discount) || 0));
  const fmtN = (n) => "₦" + Number(n || 0).toLocaleString("en-NG");

  const inputStyle = { width: "100%", padding: "12px 14px", borderRadius: 8, border: `1px solid ${t.border}`, background: t.input, color: t.text, fontSize: 15, fontFamily: "inherit", boxSizing: "border-box" };

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({ guest_name, guest_phone, guest_email, nights, discount, payment_method, notes });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 1500 }}
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        style={{ background: t.card, borderRadius: 14, maxWidth: 520, width: "100%", maxHeight: "92vh", overflowY: "auto", border: `2px solid ${t.gold}` }}
      >
        <div style={{ padding: "18px 22px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: t.text }}>Check in · Room {room.room_number}</div>
            <div style={{ fontSize: 14, color: t.muted, marginTop: 2 }}>{room.room_type} · {fmtN(room.price)}/night</div>
          </div>
          <button type="button" onClick={onClose} style={{ background: "transparent", border: "none", color: t.muted, cursor: "pointer", padding: 6 }}>
            <X size={22} />
          </button>
        </div>

        <div style={{ padding: 22, display: "grid", gap: 14 }}>
          <label>
            <div style={{ fontSize: 13, fontWeight: 700, color: t.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>Guest name *</div>
            <input required value={guest_name} onChange={(e) => setGuestName(e.target.value)} style={inputStyle} />
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <label>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>Phone</div>
              <input value={guest_phone} onChange={(e) => setGuestPhone(e.target.value)} style={inputStyle} />
            </label>
            <label>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>Email</div>
              <input type="email" value={guest_email} onChange={(e) => setGuestEmail(e.target.value)} style={inputStyle} />
            </label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <label>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>Nights *</div>
              <input type="number" min={1} max={365} value={nights} onChange={(e) => setNights(e.target.value)} style={inputStyle} required />
            </label>
            <label>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>Discount (₦)</div>
              <input type="number" min={0} step={500} value={discount} onChange={(e) => setDiscount(e.target.value)} style={inputStyle} />
            </label>
          </div>
          <label>
            <div style={{ fontSize: 13, fontWeight: 700, color: t.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>Payment method</div>
            <select value={payment_method} onChange={(e) => setPaymentMethod(e.target.value)} style={inputStyle}>
              <option value="">Pay later</option>
              <option value="cash">Cash</option>
              <option value="transfer">Bank transfer</option>
              <option value="pos">POS</option>
            </select>
          </label>
          <label>
            <div style={{ fontSize: 13, fontWeight: 700, color: t.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>Notes</div>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
          </label>

          <div style={{ background: t.cardHead, padding: "14px 16px", borderRadius: 10, display: "grid", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: t.muted }}>
              <span>Base ({nights || 0} × {fmtN(room.price)})</span>
              <span style={{ color: t.text, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{fmtN(base)}</span>
            </div>
            {Number(discount) > 0 ? (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: t.muted }}>
                <span>Discount</span>
                <span style={{ color: t.accent, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>− {fmtN(discount)}</span>
              </div>
            ) : null}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: 800, color: t.gold, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>
              <span>Total</span>
              <span>{fmtN(total)}</span>
            </div>
          </div>
        </div>

        <div style={{ padding: "16px 22px", borderTop: `1px solid ${t.border}`, display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} style={{ padding: "12px 20px", borderRadius: 8, border: `1px solid ${t.border}`, background: "transparent", color: t.text, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 15 }}>
            Cancel
          </button>
          <button type="submit" disabled={submitting} style={{ padding: "12px 24px", borderRadius: 8, border: "none", background: t.gold, color: t.onGold, fontWeight: 800, cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.6 : 1, fontFamily: "inherit", fontSize: 15 }}>
            {submitting ? "Checking in…" : "Confirm check-in"}
          </button>
        </div>
      </form>
    </div>
  );
}

function SignOutButton({ pill }) {
  const { signOut } = useStaffSession();
  return (
    <button onClick={signOut} style={pill}>
      <LogOut size={18} /> Sign Out
    </button>
  );
}
