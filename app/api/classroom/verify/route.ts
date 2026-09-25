import { NextResponse } from "next/server";

import { getClassroomConnection, listClassroomConnections } from "@/lib/classroom/classroom-connections";
import {
  isClassroomReauthorizationRequired,
  refreshClassroomAccessToken,
  verifyClassroomAccess
} from "@/lib/classroom/google-classroom";
import { getSupabaseUserFromRequest } from "@/lib/supabase/server";
import type { ClassroomConnectionVerification } from "@/types/classroom";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getSupabaseUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Login necessario.", verifications: [] }, { status: 401 });
  }

  try {
    const connections = await listClassroomConnections(user.id);
    const verifications = await Promise.all(
      connections.map(async (summary): Promise<ClassroomConnectionVerification> => {
        try {
          const connection = await getClassroomConnection(user.id, summary.connectionId);
          if (!connection) {
            throw new Error("Connection not found.");
          }

          const token = await refreshClassroomAccessToken(connection.refreshToken);
          const verification = await verifyClassroomAccess(token.access_token, token.scope ?? connection.scope);
          return {
            ...verification,
            connectionId: summary.connectionId,
            detail: verification.activeCourses
              ? `Conexao ativa: ${verification.activeCourses} turma(s) ativa(s) acessivel(is) e leitura de atividades confirmada.`
              : "Conexao ativa e permissoes confirmadas. Esta conta nao possui turmas ativas agora.",
            status: "ready"
          };
        } catch (error) {
          const reconnect = isClassroomReauthorizationRequired(error);
          return {
            activeCourses: 0,
            checkedAt: new Date().toISOString(),
            connectionId: summary.connectionId,
            courseworkReadable: false,
            coursesReadable: false,
            detail: reconnect
              ? "O Google revogou ou expirou esta autorizacao. Reconecte esta conta uma vez."
              : "A conta continua salva, mas o Google nao respondeu agora. O Gavium tentara novamente.",
            status: reconnect ? "reconnect" : "unavailable"
          };
        }
      })
    );

    return NextResponse.json({ verifications }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(
      { error: "Nao foi possivel verificar as conexoes do Classroom.", verifications: [] },
      { status: 503 }
    );
  }
}
