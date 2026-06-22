import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://jwklezuaqesptccsnesr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3a2xlenVhcWVzcHRjY3NuZXNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwMzc4ODQsImV4cCI6MjA5NzYxMzg4NH0.e4HTxF9iy12D-WMVdpTziIuGC_fl5iQcrzaEDMyH2NU";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
