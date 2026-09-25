import { NextResponse } from "next/server";

import { getClassroomPersistenceStatus } from "@/lib/classroom/classroom-connections";
import { CLASSROOM_SCOPES, isClassroomConfigured } from "@/lib/classroom/google-classroom";
import {
  getClassroomOAuthClientHint,
  probeClassroomOAuthClient,
  type ClassroomOAuthStatus
} from "@/lib/classroom/oauth-diagnostics";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

let cachedOAuthStatus: { expiresAt: number; status: ClassroomOAuthStatus } | null = null;

export async function GET(request: Request) {
  const credentialsConfigured = isClassroomConfigured();
  const oauthStatus = await getOAuthStatus(request.url);
  const configured = credentialsConfigured && oauthStatus === "ready";
  const persistenceStatus = await getClassroomPersistenceStatus();

  return NextResponse.json({
    callbackPath: "/api/classroom/callback",
    clientIdHint: getClassroomOAuthClientHint(),
    configured,
    oauthStatus,
    persistenceStatus,
    persistentConfigured: configured && persistenceStatus === "ready",
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
