import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  throw new Error(
    "VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY precisam estar definidas (.env.local).",
  );
}

const isBrowser = typeof window !== "undefined";

export const supabase = createClient<Database>(url, publishableKey, {
  auth: {
    persistSession: isBrowser,
    autoRefreshToken: isBrowser,
    detectSessionInUrl: isBrowser,
  },
});

export const ATTACHMENTS_BUCKET = "attachments";
