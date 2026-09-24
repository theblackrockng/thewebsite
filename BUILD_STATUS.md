# BUILD STATUS — The BlackRock

_Last updated: 2026-09-24 (Home hero h1 font size reduced ~17%; sub-paragraph copy updated)_

---

## Pending SQL (run in Supabase before Call Waiter goes live)

```sql
CREATE TABLE waiter_calls (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  table_number     integer     NOT NULL,
  status           text        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending', 'acknowledged')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  acknowledged_at  timestamptz,
  acknowledged_by  uuid        REFERENCES staff_profiles(id)
);
CREATE INDEX waiter_calls_status_idx ON waiter_calls (status, created_at DESC);
CREATE INDEX waiter_calls_table_idx  ON waiter_calls (table_number, created_at DESC);
ALTER TABLE waiter_calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "waiter_calls_guest_insert" ON waiter_calls FOR INSERT TO anon
  WITH CHECK (table_number BETWEEN 1 AND 999);
CREATE POLICY "waiter_calls_staff_select" ON waiter_calls FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM staff_profiles sp WHERE sp.id = auth.uid() AND sp.role IN ('bar','front_desk','manager','super_admin') AND sp.active = true));
CREATE POLICY "waiter_calls_staff_update" ON waiter_calls FOR UPDATE TO authenticated
  USING (status = 'pending' AND EXISTS (SELECT 1 FROM staff_profiles sp WHERE sp.id = auth.uid() AND sp.role IN ('bar','front_desk','manager','super_admin') AND sp.active = true))
  WITH CHECK (status = 'acknowledged');
```

---

## 1. Summary

The BlackRock is a restaurant/rooftop-lounge in Ikeja, Lagos. The project is a monorepo containing two live web apps: a public-facing website (React / CRA, deployed on Vercel) and an internal admin console (React / Vite, separate Vercel project). Both connect to a single Supabase backend. As of today the core guest-facing stack is fully functional — public website, menu page, online ordering (feature-flagged), blog, gallery, reservations, contact, and a QR-code dine-in ordering flow. The admin console covers dashboard, reservations, enquiries, menu management, media library, blog editor, site content, user management, security log, orders (all / table / online tabs), gallery manager, website images, waiter app, tables & QR manager, and an analytics page gated to super_admin / permitted staff. The waiter app (at `/waiter`) lets authenticated staff log in via Supabase Auth, select a table, and place dine-in orders. 261 commits mark the build history. Known gaps are: the payment gateway is wired (Paystack/Flutterwave code exists) but not activated, the ContentHub appears in both the public site and the console creating dual entry points, several legacy Netlify config files remain, and the "Two Spaces" rooftop section is soft-hidden pending renovation.

---

## 2. Build History (oldest → newest)

| Milestone | Key commits |
|-----------|-------------|
| Initial scaffold | `e8e3eca` Initial commit; series of auto-commits bootstrapping the repo |
| CRA frontend + Netlify | `6807ec5` netlify.toml; basic site pages (Home, Menu, About, Contact, Gallery, Blog) |
| Supabase wiring | `0d34c25` Reservations + Contact forms wired to Supabase |
| Brand & design pass | `e5ad4e2` Rubik Dirt font, navbar wordmark; `bae3929` video hero; `1bfbf2e` mobile optimisation |
| Content Hub | `9402935` Internal tool for social media team (public-facing + console dual entry) |
| Menu overhaul | `d166080` Dark theme PRD compliance, menu redesign, blog page; full official menu items added; soup/swallow picker; category image management |
| Gallery system | `163ff81` Gallery Manager console; Food/Drinks/Ambience/BTS tabs; media library name editing → gallery captions |
| Blog editor | `08c1aa8` Rich TipTap editor with font/colour/YouTube/scheduler; `4b504ed` TipTap peer dep fix |
| Media & Images | `da542df` Website Images console; `e03e0eb` Gallery Two Faces wired to Supabase |
| Hero video → image | `821b081` Ken Burns zoom animation; `8e2db9a` darker overlay, wider nav |
| Ordering system | `9052087` QR ordering, waiter mode, live kitchen/bar displays |
| Tables & QR manager | `81c3c5a` Console Tables page; branded QR generation (qr-code-styling) |
| Order flow fixes | `bbabb8f` direct QR confirm order + table orders tab; `da87089` online orders tab |
| QR redirect fix | `44114ab` OrderRoute bypass + correct table_number URL param |
| Waiter auth | `0a54d02` Supabase Auth login replaces PIN gate; role check against staff_profiles |
| Analytics | `a7c3005` Analytics page (period selector, bar chart, daily table); AnalyticsRoute guard; waiter role in UserManagement |
| Technical SEO | _pending commit_ robots.txt, sitemap.xml, per-page meta/OG/canonical via react-helmet-async, Restaurant JSON-LD, CSP fix for Google Fonts + Maps |
| Native Android apps scaffold | Capacitor project at `blackrock-apps/`; three config variants (kitchen/waiter/bar); kiosk MainActivity + BootReceiver for kitchen; build scripts |
| Native apps Chrome redirect fix | `allowNavigation` (both `blackrockrestaurantng.com` and `www.`) + `server.url` pointing at `www.` to skip 308 redirect; applied to all three configs in `7bd6bb9` + `931abcd`; Bar and Waiter APKs rebuilt Sep 21 |
| Native apps shared config base + build:all | `capacitor.config.base.json` holds all shared fields; per-app configs hold only appId, appName, server.url; build scripts use `jq -s '.[0] * .[1]'` to merge; `npm run build:all` builds all three and copies APKs to `APPs/` |
| FCM push notifications | _pending commit_ `api/_lib/fcm.js` Firebase Admin module; `api/register-device.js`; bar push on new drink orders (orders.js); waiter push on order ready (kitchen-status.js); push token registration in Waiter.jsx + BarDisplay.jsx; PinGate removed from BarDisplay |
| Front Desk order monitor | _pending commit_ `frontend/src/pages/FrontDeskDisplay.jsx` at `/front-desk-display` (StaffLoginGate for front_desk, manager, super_admin; tabs, stat cards, Realtime with 15s polling fallback, sound alert, wake lock, light/dark); confirm, complete and payment actions (see next row) |
| Front Desk actions on website endpoint | _pending commit_ `frontend/api/front-desk-orders.js` replaces the cross-origin console PATCH (which returned 401); `FrontDeskDisplay` calls `/api/front-desk-orders`; persistent fixed error banner with HTTP status; console origin removed from website CSP |
| Front Desk Completed Today | _pending commit_ `FrontDeskDisplay.jsx`: fourth tab and clickable Completed card, Lagos-time day boundary, completed orders removed from All/Table/Online and moved instantly on Mark Completed, count from a head query, list fetched only when the tab is open |
| Front Desk completed_at, Mark Paid on completed, stay signed in | _pending commit_ `front-desk-orders.js` sets `completed_at` on complete (retries without it if the column is missing); Mark Paid button on Completed Today; session refresh every 2 min, checked before each action and on tab visible, wake and online; one silent refresh and retry on 401; red "Signed out. Tap to sign in" screen with repeating alert; `StaffLoginGate` gets an optional `renderSignedOut` prop and no longer drops a signed-in screen when a profile refresh fails |
| Front Desk reservations view | _pending commit_ `frontend/api/front-desk-reservations.js` (GET list with `range` filter, PATCH confirm or cancel; roles front_desk, manager, super_admin; whitelisted transitions; Telegram notice on confirm and cancel, same content as the console) and `FrontDeskDisplay.jsx`: header now reads "Front Desk" with one large switch button (Reservations with pending badge, or Orders with new-orders badge); reservations view with stat cards, Today/Upcoming/Pending/Past 7 Days tabs, tap-to-call on touch devices, cancel confirmation dialog; both data sets poll in the background so badges and chimes work from either view |
| Merge endpoints under the Vercel Hobby function limit | _pending commit_ d176a00 deployed 13 functions and failed (limit 12). `api/front-desk.js` now serves both Front Desk endpoints (`?resource=orders` or `reservations`, each with its own roles, keys, rate-limit buckets and Telegram text); `telegram-setup` moved into `telegram-webhook.js` behind `?action=setup` (still Bearer `CRON_SECRET`, checked before update handling); `vercel.json` routes keep `/api/front-desk-orders`, `/api/front-desk-reservations` and `/api/telegram-setup` working; `FrontDeskDisplay` calls `/api/front-desk?resource=...`; 11 functions, one spare |
| Fix console session sign-out bug | `console/src/pages/Login.jsx`: removed two ephemeral `createClient()` calls (lines 64-68 and 99-100) that spawned competing auto-refresh timers sharing the same localStorage token. Both DB calls (`staff_profiles` select for 2FA check, `update` for `last_login_at`) now use the shared singleton from `lib/supabase`. Frontend/src has no duplicate clients. |
| Call Waiter feature | `frontend/api/call-waiter.js` (uses the last spare function slot; now at 12/12). Guest posts table number; validated against `tables` table; 2-min per-table server-side cooldown checked in `waiter_calls`; Telegram alert. `front-desk.js` extended with `?resource=waiter-calls` (GET pending calls, PATCH acknowledge; roles bar/front_desk/manager/super_admin). `Order.jsx` adds `CallWaiterBar`: fixed slim bar below Navbar, 5-second cancel-undo, 2-min localStorage cooldown with countdown, responsive top offset for navbar height. `BarDisplay.jsx` and `FrontDeskDisplay.jsx`: waiter calls strip with table number, time since called, Acknowledge button; 15-second poll; playAlert() on new calls, repeats every 15s while unacknowledged. SQL for `waiter_calls` table and RLS not yet run; see pending SQL below. |
| Console operations screen | _pending commit_ kitchen/bar/waiter/front_desk accounts get `OperationsScreen` (link to their website screen + sign out) instead of the console Layout; guard in `ProtectedRoute` and `AnalyticsRoute`; sidebar role labels for Kitchen, Bar, Front Desk; front_desk links to `/front-desk-display` |
| Hero tagline + sub-paragraph update | Hero `<h1>` changed to fine dining brand statement; sub-paragraph updated; h1 font sizes reduced further to text-2xl/3xl/5xl/6xl; hardcoded br tags removed for natural wrapping |

---

## 3. Architecture Map

### Frontend (public website) — `/frontend`

**Runtime:** React 19, React Router v7 (CRA / craco), Tailwind CSS  
**Deploy:** Vercel (`frontend/vercel.json`)  
**Cron:** daily at 07:00 UTC (`/api/scheduled-emails`)

| Route | Page | Notes |
|-------|------|-------|
| `/` | Home.jsx | Hero (Ken Burns image), marquee, food reel, Two Spaces section (soft-hidden) |
| `/menu` | Menu.jsx | Food/Drinks tabs, soup+swallow picker, dynamic hero image |
| `/order` | Order.jsx | QR dine-in ordering; feature-flagged except when `?table=N` present |
| `/order/confirmation` | OrderConfirmation.jsx | Post-checkout confirmation |
| `/checkout` | Checkout.jsx | Delivery/pickup checkout flow |
| `/reservations` | Reservations.jsx | Supabase reservations form |
| `/contact` | Contact.jsx | Supabase enquiries form |
| `/gallery` | Gallery.jsx | Food/Drinks/Ambience/BTS tabs; Supabase-sourced |
| `/blog` | Blog.jsx | Blog listing |
| `/blog/:slug` | BlogPost.jsx | Individual post |
| `/about` | About.jsx | Static about page |
| `/content-hub` | ContentHub.jsx | Social media internal tool (public entry point) |
| `/content-hub/:id` | ContentHubAsset.jsx | Asset detail |
| `/content-hub/guide` | ContentHubGuide.jsx | Guide page |
| `/content-hub/login` | ContentHubLogin.jsx | Auth for content hub |
| `/kitchen-display` | KitchenDisplay.jsx | Live kitchen order display (Supabase Realtime) |
| `/bar-display` | BarDisplay.jsx | Live bar order display (Supabase Realtime) |
| `/front-desk-display` | FrontDeskDisplay.jsx | Front desk screen with Orders and Reservations views (one switch button in the header); roles front_desk, manager, super_admin; orders via Realtime + 15s polling fallback and `/api/front-desk?resource=orders`; reservations via 15s polling and `/api/front-desk?resource=reservations` |
| `/waiter` | Waiter.jsx | Waiter app — Supabase Auth login, table select, place orders |

**Frontend Contexts:** `AuthContext`, `CartContext`, `FeatureFlagContext`, `TableContext`

**Frontend API endpoints (`/frontend/api/`):**

| File | Method | Purpose |
|------|--------|---------|
| `call-waiter.js` | POST | Public; guest calls waiter for their table. Validates table, 10/hr/IP rate limit, 2-min per-table server-side cooldown, inserts into `waiter_calls`, sends Telegram. Uses the 12th (last) Vercel Hobby function slot. |
| `orders.js` | GET/POST | List orders / place new order; sends bar FCM push when order has drinks |
| `initiate-payment.js` | POST | Paystack/Flutterwave payment init (inactive) |
| `payment-webhook.js` | POST | Payment gateway webhook (inactive) |
| `kitchen-status.js` | PATCH | Update order status; sends waiter FCM push when status → ready |
| `front-desk.js` | PATCH, GET | One function, dispatched on `?resource=`. `waiter-calls` (GET pending calls; PATCH acknowledge by id; sets acknowledged_at and acknowledged_by; roles bar/front_desk/manager/super_admin; separate rate-limit buckets for reads and writes). `orders` (PATCH; front_desk / manager only): confirm (new only), complete (any active status), mark paid (also on completed orders) or proof received; sets `completed_at` on complete; whitelisted transitions, sets `confirmed_by` from the verified profile, Telegram notice on status changes. `reservations` (GET, PATCH; front_desk / manager / super_admin): GET lists reservations from 7 days ago onward (optional `range` = all, today, upcoming, pending, past; Lagos day boundary; only display fields returned, no email); PATCH `{id, status}` allows pending or rescheduled to confirmed, and pending, rescheduled or confirmed to cancelled, never backwards, never on past dates; Telegram notice on change; separate rate limit buckets for reads and writes. Old paths `/api/front-desk-orders` and `/api/front-desk-reservations` are aliased in `vercel.json` |
| `register-device.js` | POST | Upsert FCM token into push_tokens table |
| `send-confirmation.js` | POST | Zoho SMTP order confirmation email |
| `send-enquiry-reply.js` | POST | Zoho SMTP reply to enquiries |
| `scheduled-emails.js` | GET | Daily cron: pending reservation reminders |
| `telegram-webhook.js` | POST | Telegram bot incoming updates; `?action=setup` (Bearer `CRON_SECRET`) registers the webhook, reachable as `/api/telegram-setup` through a `vercel.json` alias |

---

### Console (admin) — `/console`

**Runtime:** React 19, React Router v7 (Vite)  
**Deploy:** Vercel (separate project, `console/vercel.json`)

| Route | Page | Access |
|-------|------|--------|
| `/` | Dashboard.jsx | All authenticated staff |
| `/reservations` | Reservations.jsx | `reservations` permission |
| `/enquiries` | Enquiries.jsx | `enquiries` permission |
| `/menu` | MenuManagement.jsx | `menu` permission |
| `/media` | MediaLibrary.jsx | `media` permission |
| `/content` | SiteContent.jsx | `content` permission |
| `/users` | UserManagement.jsx | `users` permission |
| `/orders` | Orders.jsx | All staff (All / Table / Online tabs) |
| `/tables` | Tables.jsx | All staff |
| `/gallery` | GalleryManager.jsx | All staff |
| `/images` | SiteImages.jsx | All staff |
| `/blog` | BlogManagement.jsx | All staff |
| `/blog/:id` | BlogEditor.jsx | All staff |
| `/content-hub` | ContentHub.jsx | All staff |
| `/content-hub/asset/:id` | AssetDetail.jsx | All staff |
| `/settings` | Settings.jsx | `settings` permission |
| `/security` | SecurityLog.jsx | All staff |
| `/analytics` | Analytics.jsx | `super_admin` or `permissions.analytics = true` |
| `/profile` | StaffProfile.jsx | Self |
| `/profile/:userId` | StaffProfile.jsx | Self or super_admin |
| `/console-internal-br2026` | FeatureControl.jsx | `super_admin` only |
| `/login` | Login.jsx | Public |
| `/reset-password` | ResetPassword.jsx | Public (invite/recovery hash) |
| `/welcome` | Welcome.jsx | Public |

Accounts with role `kitchen`, `bar`, `waiter` or `front_desk` never see the console Layout: every route above resolves to `OperationsScreen` for them (`ProtectedRoute` / `AnalyticsRoute` in `App.jsx`; `SuperAdminRoute` redirects to `/`). `WEBSITE_ORIGIN` in `App.jsx` sets the website link target.

**Console Contexts:** `AuthContext`, `StaffContext`

**Console API endpoints (`/console/api/`):**

| File | Method | Purpose |
|------|--------|---------|
| `orders.js` | GET/PATCH | List orders (date range, limit 500); update status/payment |
| `order-items.js` | POST | Fetch items for a specific order |
| `tables.js` | GET/POST/PATCH/DELETE | Table CRUD |
| `invite.js` | POST | Supabase admin invite new staff user |
| `delete-staff.js` | POST | Supabase admin delete staff user |
| `send-email.js` | POST | Zoho SMTP general email sender |
| `send-otp.js` | POST | OTP generation + Zoho SMTP delivery |
| `verify-otp.js` | POST | OTP verification |
| `log-security-event.js` | POST | Write to security_logs table |
| `telegram-invite.js` | POST | Send Telegram invite message |

---

### Database (Supabase)

Key tables (inferred from code and API usage):

| Table | Purpose |
|-------|---------|
| `staff_profiles` | Console users — id, email, full_name, role, permissions (JSON), active, avatar_url, phone, bio |
| `orders` | All orders — order_number, order_type, order_source, table_number, status, payment_status, total, guest_name, guest_phone, placed_by, confirmed_by, waiter_name, created_at |
| `order_items` | Line items — order_id, name, price, qty, menu_type |
| `tables` | Restaurant tables — id, table_number (int), qr_slug (text), active, created_at |
| `reservations` | Guest bookings |
| `enquiries` | Contact form submissions |
| `menu_items` | Food and drinks menu |
| `menu_categories` | Category groupings with images |
| `blog_posts` | Blog content with TipTap JSON |
| `media_files` | Uploaded images with names, tags, sections |
| `site_content` | Key–value store for editable copy/settings |
| `feature_flags` | `ordering_enabled`, `analytics` flags |
| `security_logs` | Audit trail of security events |
| `content_hub_assets` | Social media asset library |
| `gallery_items` | Gallery section image assignments |
| `push_tokens` | FCM device tokens — role ('waiter'|'bar'), staff_id (nullable), fcm_token; used for native app push notifications |
| `waiter_calls` | Guest waiter requests — id, table_number, status (pending/acknowledged), created_at, acknowledged_at, acknowledged_by. **Table does not exist yet** — SQL in the previous session's plan message must be run in Supabase before the feature is live. |

---

### External Integrations

| Service | Used for | Status |
|---------|----------|--------|
| Supabase | Database, Auth, Storage, Realtime | Active |
| Zoho Mail SMTP | Order confirmations, enquiry replies, OTPs, scheduled reminders | Active |
| Telegram Bot API | Order notifications, staff alerts | Active |
| Paystack / Flutterwave | Online payment | Code present, not activated |
| Firebase FCM | Native push notifications (Waiter + Bar apps) | Code complete; requires `FIREBASE_SERVICE_ACCOUNT` env var in Vercel + `push_tokens` table in Supabase |

---

## 4. Gaps Against Plan/Spec

1. **Payment gateway not activated.** `initiate-payment.js` and `payment-webhook.js` exist; checkout flow has payment UI; but no live Paystack/Flutterwave keys are wired and payment is never triggered in the order flow.
2. **Blog post URLs missing from sitemap.** Individual `/blog/:slug` routes are not in `sitemap.xml` because they are dynamically generated from Supabase. A build-time script is needed to include them.
3. **Social link previews per-route not possible without prerendering.** `react-helmet-async` handles per-page meta for Googlebot (which runs JS) but Twitter/LinkedIn/WhatsApp crawlers read raw HTML and will always see the static fallback OG tags in `index.html`.
4. **ContentHub dual entry point.** The content hub lives at both `/content-hub` on the public website (with its own login) and `/content-hub` inside the console (behind Supabase Auth). Two separate auth systems for the same tool.
3. **Rooftop / Two Spaces section soft-hidden.** The "Two Spaces" section on the homepage references the rooftop but is hidden (`hidden` class) pending renovation. No spec decision recorded on when/how to reactivate.
4. **No customer accounts.** Orders are placed as guests. There is no loyalty, repeat-order, or saved-address flow.
5. **Analytics export.** The analytics page shows data in-browser but there is no CSV/PDF export.
6. **Push notifications require env + DB setup.** FCM code is complete (fcm.js, register-device.js, push_tokens table). To activate: (a) add `FIREBASE_SERVICE_ACCOUNT` JSON env var to Vercel frontend project, (b) run the push_tokens SQL migration in Supabase (see Part 4 below).
7. **Waiter name on orders.** `waiter_name` is stored on orders but the waiter app currently sets it from the authenticated staff profile. No explicit assignment of waiter-to-table in the database (only in UI state).
8. **Netlify legacy files.** `frontend/netlify.toml` and root-level `netlify.toml` artifacts remain. The site deploys on Vercel; these files do nothing but add noise.
9. **Console operations access not enforced by database policies.** Keeping kitchen/bar/waiter/front_desk accounts out of the console is a UI gate only (`OperationsScreen`). Console pages read and write Supabase tables directly with the anon client, so those accounts could still reach data through the API unless RLS policies restrict them. Live RLS policies are not in the repo (only `staff_profiles` in `supabase/migrations/003`) and need reviewing in Supabase.
10. **`orders.completed_at` column not created yet.** The Front Desk screen and the orders side of `front-desk.js` are written to use `orders.completed_at` (set server-side when front desk completes an order) but fall back to the placed date until the SQL (add column, backfill with `created_at`, rollback) is run in Supabase. Orders completed from the console do not set it, so the Completed Today tab falls back to the placed date for those and labels them "Placed". Reload the Front Desk screen after running the SQL (it re-checks for the column every 10 minutes).

---

## 5. Known Issues, Stubs, and Inconsistencies

- **`auto-commit` commits (18 of them).** Early commits were made by an automated process with no useful message. These pollute `git log` readability.
- **ENV var naming inconsistency.** Frontend uses `REACT_APP_` prefix (CRA convention); console uses `VITE_` prefix. Both sets are needed and must be set independently in each Vercel project.
- **`VITE_SUPABASE_SERVICE_KEY` exposed client-side in console.** The service role key bypasses RLS. It is used client-side in the console for admin operations. This works because the console is access-controlled via Supabase Auth, but it is a security concern if the console URL were ever compromised.
- **Google Fonts and Maps iframes were blocked by CSP.** Fixed: `vercel.json` CSP now includes `font-src gstatic.com`, `style-src googleapis.com`, `frame-src maps.google.com`, and `wss://*.supabase.co` for Realtime.
- **`DELETE /api/tables` uses query param.** The tables DELETE handler reads `req.query.id`. Vercel Functions don't support `DELETE` with a body by default, so this is the correct pattern, but it differs from REST convention.
- **`/console-internal-br2026` security by obscurity.** The feature control route is hidden by URL path; it is also gated by `super_admin` role, but the path is visible in the compiled JS bundle.
- **Blog editor TipTap version pinned to 3.30.2** to work around peer dependency conflicts. Future upgrades need care.
- **`OrderRoute` flag bypass via `?table=` param** is intentional (QR dine-in bypasses the feature flag) but undocumented — someone could visit `/order?table=1` even when ordering is disabled.
- **Front Desk monitor read access is unverified.** `FrontDeskDisplay` reads `orders` and `order_items` and subscribes to Realtime with the staff session, like the kitchen display. The live RLS policies for those tables are not in the repo, so whether `front_desk` can read them needs checking in Supabase. If not, the page loads empty.
- **Front Desk reservations read through the website endpoint, not Realtime.** The `reservations` RLS policies are not in the repo, so the screen polls `/api/front-desk?resource=reservations` every 15 seconds (service role) instead of subscribing. A new booking can take up to 15 seconds to show and chime.
- **Confirm and Cancel on the Front Desk send no guest email.** This matches the console, which only sends Telegram on Confirm and Cancel (guest emails are the booking email, the daily reminder cron and the manual Send Email). Confirming does not email the guest.
- **Front Desk reservations has no Seated, No show, Reschedule or manual add.** The console has no seated or no-show status and the brief excluded editing and manual add. Pre-selected meals and guest email are not shown on the Front Desk card.
- **Vercel Hobby allows 12 serverless functions; the website uses 11.** Every non-underscore file in `frontend/api` is one function, so a new endpoint should join an existing file behind a query param and a `vercel.json` route alias, not add a file. The alias routes in `vercel.json` (`/api/front-desk-orders`, `/api/front-desk-reservations`, `/api/telegram-setup`) are verified only against stubbed handlers; confirm them on a preview deploy before relying on them (the old paths matter for Front Desk tabs left open on an old bundle).
- **Kitchen/Bar displays** at `/kitchen-display` and `/bar-display` are public routes with no auth. Anyone who knows the URL can see live orders.
- **`supabase.auth.admin` calls in console API** require `SUPABASE_SERVICE_ROLE_KEY`. If that var is missing from the Vercel project, invite and delete-staff silently fail.

---

## 6. Recommended Next Steps

### Safe to build now

- **Remove Netlify legacy files** (`frontend/netlify.toml`, root `netlify.toml`) — no risk, just cleanup.
- **Add basic auth to `/kitchen` and `/bar`** — a simple PIN or Supabase session check; currently fully public.
- **Analytics CSV export** — add a "Download CSV" button to the analytics page; all data is already in state.
- **Waiter-to-table assignment in DB** — add a `current_waiter` column to `tables` and update it when a waiter selects a table; surface it in the Tables console view.
- **ContentHub console cleanup** — decide whether the console `/content-hub` should replace the public one or coexist; if replace, remove the public route and the separate ContentHubLogin.

### Needs a decision first

- **Activate payments** — requires deciding on gateway (Paystack vs Flutterwave), obtaining live keys, and designing the payment UX (full checkout vs table bill). Do not activate without testing the webhook in a staging environment.
- **Rooftop / Two Spaces reactivation** — needs confirmation that renovation is complete and new photography is available before unhiding the section.
- **Customer accounts / loyalty** — would require a new `customers` table, guest auth flow, and order history UI. Significant scope; needs PRD sign-off.
- **ContentHub consolidation** — merging to a single auth system requires migrating existing ContentHub users or deprecating the public login.
- **Service role key exposure** — options: (a) accept current risk (console is auth-gated), (b) proxy sensitive admin calls through a Vercel Function using the service key server-side only. Needs a security decision.
