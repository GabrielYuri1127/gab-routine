import { NextResponse } from "next/server";
import { z } from "zod";

import {
  deleteClassroomConnection,
  getClassroomConnection,
  listClassroomConnections
} from "@/lib/classroom/classroom-connections";
import { revokeClassroomToken } from "@/lib/classroom/google-classroom";
import { getSupabaseUserFromRequest } from "@/lib/supabase/server";

const deleteSchema = z.object({
  connectionId: z.string().uuid()
});

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getSupabaseUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ connections: [], error: "Login necessario." }, { status: 401 });
  }

  try {
    const connections = await listClassroomConnections(user.id);
    return NextResponse.json({ connections }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ connections: [], error: "Conexoes do Classroom indisponiveis." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  const user = await getSupabaseUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Login necessario." }, { status: 401 });
  }

  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Conexao invalida." }, { status: 400 });
  }

  try {
    const connection = await getClassroomConnection(user.id, parsed.data.connectionId);
    if (!connection) {
      return NextResponse.json({ error: "Conexao nao encontrada." }, { status: 404 });
    }

    await revokeClassroomToken(connection.refreshToken).catch(() => undefined);
    await deleteClassroomConnection(user.id, parsed.data.connectionId);
    return NextResponse.json({ removed: true });
  } catch {
    return NextResponse.json({ error: "Nao foi possivel remover a conta." }, { status: 500 });
  }
}
