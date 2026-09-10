import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

interface SupabaseServerConfig {
  anonKey: string;
  serviceRoleKey?: string;
  url: string;
}

export function getSupabaseServerConfig(env: NodeJS.ProcessEnv = process.env): SupabaseServerConfig | null {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    return null;
  }

  return {
    anonKey,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
    url
  };
}

export function createSupabaseServiceClient(env: NodeJS.ProcessEnv = process.env): SupabaseClient {
  const config = getSupabaseServerConfig(env);

  if (!config?.serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  }

  return createClient(config.url, config.serviceRoleKey, {
    auth: {
      persistSession: false
    }
  });
}

export async function getSupabaseUserFromRequest(request: Request): Promise<User | null> {
  const config = getSupabaseServerConfig();
  const token = getBearerToken(request);

  if (!config || !token) {
    return null;
  }

  const client = createClient(config.url, config.anonKey, {
    auth: {
      persistSession: false
    }
  });
  const { data, error } = await client.auth.getUser(token);

  if (error || !data.user) {
    return null;
  }

  return data.user;
}

export function getBearerToken(request: Request) {
  const header = request.headers.get("authorization");
  if (!header?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return header.slice("bearer ".length).trim() || null;
}
