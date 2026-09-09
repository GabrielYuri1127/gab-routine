import { NextRequest, NextResponse } from "next/server";

import { buildIntegrationStatus } from "@/lib/integrations/status";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return NextResponse.json(buildIntegrationStatus(process.env, request.url));
}
