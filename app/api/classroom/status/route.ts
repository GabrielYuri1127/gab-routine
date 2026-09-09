import { NextResponse } from "next/server";

import { CLASSROOM_SCOPES, isClassroomConfigured } from "@/lib/classroom/google-classroom";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    callbackPath: "/api/classroom/callback",
    configured: isClassroomConfigured(),
    scopes: CLASSROOM_SCOPES
  });
}
