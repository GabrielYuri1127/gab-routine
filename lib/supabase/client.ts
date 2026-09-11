import { createClient, type SupabaseClient } from "@supabase/supabase-js";

interface SupabaseConfig {
  publishableKey: string;
  url: string;
}

let browserClient: SupabaseClient | null = null;

export function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !publishableKey) {
    return null;
  }

  return { publishableKey, url };
}

export function isSupabaseConfigured() {
  return getSupabaseConfig() !== null;
}

export function createSupabaseBrowserClient() {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  browserClient ??= createClient(config.url, config.publishableKey);
  return browserClient;
}
