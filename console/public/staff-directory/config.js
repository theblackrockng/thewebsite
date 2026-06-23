/**
 * Staff Directory — Configuration
 * Edit this file only. No other file needs to change.
 */
const DIRECTORY_CONFIG = {

  /* ── Brand ─────────────────────────────────── */
  brandName:    'BLACKROCK',             // Shown in nav, login panel, profile pages
  productName:  'Staff Directory',      // Shown in login subtitle and page titles
  logoFallback: '●',                    // Single character shown if logo.png fails to load

  /* ── Company contact (shown on public profile pages) ── */
  website:  'www.blackrockrestaurantng.com',
  email:    'hello@blackrockrestaurantng.com',
  address:  'Ajao Road, off Adeniyi Jones Road, Ikeja, Lagos',

  /* ── Admin login page ───────────────────────── */
  adminEmailPlaceholder: 'admin@blackrockrestaurantng.com',
  loginTagline: 'Every staff member, on record and ready to verify.',

  /* ── Supabase (same project as the admin console — src/lib/supabase.js) ── */
  supabaseUrl: 'https://jwklezuaqesptccsnesr.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3a2xlenVhcWVzcHRjY3NuZXNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwMzc4ODQsImV4cCI6MjA5NzYxMzg4NH0.e4HTxF9iy12D-WMVdpTziIuGC_fl5iQcrzaEDMyH2NU',

  /* ── Internal (do not change unless you know why) ── */
  _storageKey: 'directory_admin_registered',

};
