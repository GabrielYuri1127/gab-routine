import { createClient, type SupabaseClient } from "@supabase/supabase-js";

interface SupabaseConfig {
  publishableKey: string;
  url: string;
}

let browserClient: SupabaseClient | null = null;

const REMEMBER_LOGIN_STORAGE_KEY = "gavium:remember-login";

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

export function getRememberLoginPreference() {
  if (typeof window === "undefined") {
    return true;
  }

  return window.localStorage.getItem(REMEMBER_LOGIN_STORAGE_KEY) !== "session";
}

export function setRememberLoginPreference(remember: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(REMEMBER_LOGIN_STORAGE_KEY, remember ? "persistent" : "session");

  const config = getSupabaseConfig();
  if (!config) {
    return;
  }

  const storageKey = getSupabaseAuthStorageKey(config.url);
  const storageToClear = remember ? window.sessionStorage : window.localStorage;
  storageToClear.removeItem(storageKey);
}

export function createSupabaseBrowserClient() {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  browserClient ??= createClient(config.url, config.publishableKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      storage: authStorage,
      storageKey: getSupabaseAuthStorageKey(config.url)
    }
  });
  return browserClient;
}

const authStorage = {
  getItem(key: string) {
    return getSelectedStorage()?.getItem(key) ?? null;
  },
  removeItem(key: string) {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  },
  setItem(key: string, value: string) {
    getSelectedStorage()?.setItem(key, value);
  }
};

function getSelectedStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return getRememberLoginPreference() ? window.localStorage : window.sessionStorage;
}

function getSupabaseAuthStorageKey(url: string) {
  try {
    const projectRef = new URL(url).hostname.split(".")[0];
    return `sb-${projectRef}-auth-token`;
  } catch {
    return "gavium:supabase-auth-token";
  }
}
