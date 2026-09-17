import { NextResponse } from "next/server";

import { CLASSROOM_SCOPES, isClassroomConfigured } from "@/lib/classroom/google-classroom";
import { getSupabaseServerConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const configured = isClassroomConfigured();
  const cloudConfigured = Boolean(getSupabaseServerConfig()?.secretKey);

  return NextResponse.json({
    callbackPath: "/api/classroom/callback",
    configured,
    persistentConfigured: configured && cloudConfigured,
    scopes: CLASSROOM_SCOPES
  });
}
