import { createClient, type SupabaseClient } from "@supabase/supabase-js";

interface SupabaseConfig {
  url: string;
  anonKey: string;
}

let browserClient: SupabaseClient | null = null;

export function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
}

export function isSupabaseConfigured() {
  return getSupabaseConfig() !== null;
}

export function createSupabaseBrowserClient() {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  browserClient ??= createClient(config.url, config.anonKey);
  return browserClient;
}
