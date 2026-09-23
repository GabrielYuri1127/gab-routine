import { NextResponse } from "next/server";

import { CLASSROOM_SCOPES, isClassroomConfigured } from "@/lib/classroom/google-classroom";
import { probeClassroomOAuthClient, type ClassroomOAuthStatus } from "@/lib/classroom/oauth-diagnostics";
import { getSupabaseServerConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

let cachedOAuthStatus: { expiresAt: number; status: ClassroomOAuthStatus } | null = null;

export async function GET(request: Request) {
  const credentialsConfigured = isClassroomConfigured();
  const oauthStatus = await getOAuthStatus(request.url);
  const configured = credentialsConfigured && !["invalid_client", "not_configured", "redirect_mismatch"].includes(oauthStatus);
  const cloudConfigured = Boolean(getSupabaseServerConfig()?.secretKey);

  return NextResponse.json({
    callbackPath: "/api/classroom/callback",
    configured,
    oauthStatus,
    persistentConfigured: configured && cloudConfigured,
    scopes: CLASSROOM_SCOPES
  });
}

async function getOAuthStatus(requestUrl: string) {
  const now = Date.now();
  if (cachedOAuthStatus && cachedOAuthStatus.expiresAt > now) {
    return cachedOAuthStatus.status;
  }

  const status = await probeClassroomOAuthClient(requestUrl);
  cachedOAuthStatus = { expiresAt: now + 5 * 60 * 1_000, status };
  return status;
}
