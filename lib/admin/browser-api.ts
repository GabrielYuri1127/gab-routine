import { getSupabaseAccessToken } from "@/lib/supabase/client";

export async function fetchAdminApi(input: string, init: RequestInit = {}) {
  let token = await getSupabaseAccessToken();
  if (!token) {
    return null;
  }

  const send = (accessToken: string) =>
    fetch(input, {
      ...init,
      headers: {
        ...Object.fromEntries(new Headers(init.headers).entries()),
        Authorization: `Bearer ${accessToken}`
      }
    });

  let response = await send(token);
  if (response.status === 401) {
    token = await getSupabaseAccessToken({ forceRefresh: true });
    if (token) {
      response = await send(token);
    }
  }

  return response;
}
