import { NextResponse } from "next/server";
import { z } from "zod";

import {
  ADMIN_AUDIT_TABLE,
  ADMIN_GRANTS_TABLE,
  adminAuditFromRow,
  adminGrantFromRow,
  isAdminSchemaMissing,
  isGaviumAdmin
} from "@/lib/admin/access";
import { createSupabaseServiceClient, getSupabaseUserFromRequest } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const accessRequestSchema = z.object({
  canEdit: z.boolean().default(false),
  durationDays: z.number().int().min(1).max(30).default(7),
  enabled: z.boolean()
});

interface AdminGrantRpcRow {
  can_edit: boolean;
  expires_at: string;
  granted_at: string;
  revoked_at: string | null;
  updated_at: string;
  user_id: string;
}

export async function GET(request: Request) {
  const user = await getSupabaseUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "auth_required" }, { status: 401 });
  }

  try {
    const client = createSupabaseServiceClient();
    const [{ data: grantRow, error: grantError }, { data: auditRows, error: auditError }] = await Promise.all([
      client
        .from(ADMIN_GRANTS_TABLE)
        .select("user_id,can_edit,granted_at,expires_at,revoked_at,updated_at")
        .eq("user_id", user.id)
        .maybeSingle(),
      client
        .from(ADMIN_AUDIT_TABLE)
        .select("id,target_user_id,actor_label,action,summary,created_at")
        .eq("target_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10)
    ]);

    if (grantError) throw grantError;
    if (auditError) throw auditError;

    return NextResponse.json({
      authenticated: true,
      audit: (auditRows ?? []).map((row) => adminAuditFromRow(row)),
      grant: grantRow ? adminGrantFromRow(grantRow) : null,
      isAdmin: isGaviumAdmin(user),
      schemaReady: true
    });
  } catch (error) {
    if (isAdminSchemaMissing(error)) {
      return NextResponse.json({ authenticated: true, isAdmin: isGaviumAdmin(user), schemaReady: false });
    }

    return NextResponse.json({ error: "admin_access_unavailable" }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  const user = await getSupabaseUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "auth_required" }, { status: 401 });
  }

  const parsed = accessRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  try {
    const client = createSupabaseServiceClient();
    const now = new Date();
    const expiresAt = parsed.data.enabled
      ? new Date(now.getTime() + parsed.data.durationDays * 24 * 60 * 60 * 1_000)
      : now;
    const summary = parsed.data.enabled
      ? `Autorizou suporte administrativo por ${parsed.data.durationDays} dia(s)${parsed.data.canEdit ? " com edicao" : " somente para consulta"}.`
      : "Revogou o acesso administrativo.";
    const { data: grantRow, error: grantError } = await client
      .rpc("set_admin_access_grant", {
        p_can_edit: parsed.data.enabled && parsed.data.canEdit,
        p_changes: {
          canEdit: parsed.data.enabled && parsed.data.canEdit,
          durationDays: parsed.data.enabled ? parsed.data.durationDays : 0
        },
        p_enabled: parsed.data.enabled,
        p_expires_at: expiresAt.toISOString(),
        p_summary: summary,
        p_user_id: user.id
      })
      .single();

    if (grantError || !grantRow) {
      throw grantError ?? new Error("admin_grant_write_failed");
    }

    return NextResponse.json({ grant: adminGrantFromRow(grantRow as AdminGrantRpcRow), saved: true });
  } catch (error) {
    if (isAdminSchemaMissing(error)) {
      return NextResponse.json({ error: "admin_schema_missing" }, { status: 503 });
    }

    return NextResponse.json({ error: "admin_access_unavailable" }, { status: 503 });
  }
}
