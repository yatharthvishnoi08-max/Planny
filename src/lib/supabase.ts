import { createClient, SupabaseClient } from "@supabase/supabase-js";

// These are deployment settings, not user settings. Supabase publishable keys are
// intentionally safe to ship in clients; authorization is enforced by Auth + RLS.
const DEPLOYMENT_URL = String(import.meta.env.VITE_SUPABASE_URL || "").trim();
const DEPLOYMENT_KEY = String(
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    "",
).trim();
const FALLBACK_URL = "https://unconfigured-planny.supabase.co";
const FALLBACK_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiJ9.unconfigured";

export function isRealSupabaseConfigured(): boolean {
  return (
    /^https:\/\/.+\.supabase\.co$/i.test(DEPLOYMENT_URL) &&
    DEPLOYMENT_KEY.length > 20 &&
    !DEPLOYMENT_KEY.startsWith("sb_secret_")
  );
}

export const supabase: SupabaseClient = createClient(
  DEPLOYMENT_URL || FALLBACK_URL,
  DEPLOYMENT_KEY || FALLBACK_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  },
);
