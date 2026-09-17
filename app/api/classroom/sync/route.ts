import { NextResponse } from "next/server";
import { z } from "zod";

import { getClassroomConnection, markClassroomConnectionSynced } from "@/lib/classroom/classroom-connections";
import { fetchClassroomImport, refreshClassroomAccessToken } from "@/lib/classroom/google-classroom";
import { getSupabaseUserFromRequest } from "@/lib/supabase/server";

const syncSchema = z.object({
  connectionId: z.string().uuid()
});

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getSupabaseUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Login necessario." }, { status: 401 });
  }

  const parsed = syncSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Conexao invalida." }, { status: 400 });
  }

  try {
    const connection = await getClassroomConnection(user.id, parsed.data.connectionId);
    if (!connection) {
      return NextResponse.json({ error: "Conexao nao encontrada." }, { status: 404 });
    }

    const token = await refreshClassroomAccessToken(connection.refreshToken);
    const classroomImport = await fetchClassroomImport(token.access_token, connection.account);
    await markClassroomConnectionSynced(user.id, connection.connectionId, token.expires_in);

    return NextResponse.json({ import: classroomImport });
  } catch {
    return NextResponse.json(
      { error: "Nao foi possivel sincronizar. Reconecte esta conta se o acesso do Google tiver expirado." },
      { status: 502 }
    );
  }
}
