import { NextResponse } from "next/server";

import { getActiveAdminGrant, isAdminSchemaMissing, isGaviumAdmin } from "@/lib/admin/access";
import {
  AdminRoutineTargetNotFoundError,
  adminRoutineMutationSchema,
  applyAdminRoutineOperation
} from "@/lib/admin/routine-editor";
import { assignRoutineDataUser, normalizeRoutineData } from "@/features/data/routine-normalization";
import { createSupabaseServiceClient, getSupabaseUserFromRequest } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface SnapshotRow {
  data: unknown;
  updated_at: string;
  user_id: string;
}

interface AdminRoutineUpdateRow {
  data: unknown;
  updated_at: string;
}

interface RouteContext {
  params: Promise<{ userId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const access = await authorizeAdminRequest(request, context, false);
  if (access.response) return access.response;

  try {
    const { data: snapshot, error } = await access.client
      .from("routine_snapshots")
      .select("user_id,data,updated_at")
      .eq("user_id", access.userId)
      .maybeSingle();
    if (error) throw error;
    if (!snapshot) {
      return NextResponse.json({ error: "routine_not_found" }, { status: 404 });
    }

    const { data: authData } = await access.client.auth.admin.getUserById(access.userId);
    const routine = assignRoutineDataUser(normalizeRoutineData((snapshot as SnapshotRow).data, access.userId), access.userId);

    return NextResponse.json({
      data: routine,
      grant: access.grant,
      updatedAt: (snapshot as SnapshotRow).updated_at,
      user: {
        displayName: routine.appPreference.displayName || "Usuario",
        email: authData.user?.email,
        id: access.userId
      }
    });
  } catch (error) {
    if (isAdminSchemaMissing(error)) {
      return NextResponse.json({ error: "admin_schema_missing" }, { status: 503 });
    }

    return NextResponse.json({ error: "admin_user_unavailable" }, { status: 503 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const access = await authorizeAdminRequest(request, context, true);
  if (access.response) return access.response;

  const parsed = adminRoutineMutationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  try {
    const { data: snapshot, error } = await access.client
      .from("routine_snapshots")
      .select("user_id,data,updated_at")
      .eq("user_id", access.userId)
      .maybeSingle();
    if (error) throw error;
    if (!snapshot) {
      return NextResponse.json({ error: "routine_not_found" }, { status: 404 });
    }

    const row = snapshot as SnapshotRow;
    if (parsed.data.expectedUpdatedAt && parsed.data.expectedUpdatedAt !== row.updated_at) {
      return NextResponse.json({ error: "routine_changed" }, { status: 409 });
    }

    const current = assignRoutineDataUser(normalizeRoutineData(row.data, access.userId), access.userId);
    const edited = applyAdminRoutineOperation(current, parsed.data.operation);
    const nextData = assignRoutineDataUser(normalizeRoutineData(edited.data, access.userId), access.userId);
    const actorLabel = access.admin.email ?? "Administrador";
    const { data: updated, error: updateError } = await access.client
      .rpc("apply_authorized_admin_routine_edit", {
        p_action: `routine_${parsed.data.operation.type}_updated`,
        p_actor_label: actorLabel,
        p_actor_user_id: access.admin.id,
        p_changes: {
          fields: edited.fields,
          itemId: "id" in parsed.data.operation ? parsed.data.operation.id : undefined,
          type: parsed.data.operation.type
        },
        p_expected_updated_at: row.updated_at,
        p_next_data: nextData,
        p_summary: edited.summary,
        p_target_user_id: access.userId
      })
      .single();

    if (updateError || !updated) {
      const message = updateError?.message ?? "";
      if (message.includes("routine_snapshot_changed")) {
        return NextResponse.json({ error: "routine_changed" }, { status: 409 });
      }
      if (message.includes("admin_edit_not_authorized")) {
        return NextResponse.json({ error: "edit_not_authorized" }, { status: 403 });
      }
      throw updateError ?? new Error("admin_update_failed");
    }

    const updatedRow = updated as AdminRoutineUpdateRow;
    return NextResponse.json({ data: updatedRow.data, saved: true, updatedAt: updatedRow.updated_at });
  } catch (error) {
    if (error instanceof AdminRoutineTargetNotFoundError) {
      return NextResponse.json({ error: "target_not_found" }, { status: 404 });
    }
    if (isAdminSchemaMissing(error)) {
      return NextResponse.json({ error: "admin_schema_missing" }, { status: 503 });
    }

    return NextResponse.json({ error: "admin_update_failed" }, { status: 503 });
  }
}

async function authorizeAdminRequest(request: Request, context: RouteContext, requireEdit: boolean) {
  const admin = await getSupabaseUserFromRequest(request);
  const { userId } = await context.params;

  if (!admin) {
    return {
      admin: null,
      client: null,
      grant: null,
      response: NextResponse.json({ error: "auth_required" }, { status: 401 }),
      userId
    };
  }
  if (!isGaviumAdmin(admin)) {
    return {
      admin,
      client: null,
      grant: null,
      response: NextResponse.json({ error: "admin_required" }, { status: 403 }),
      userId
    };
  }

  try {
    const client = createSupabaseServiceClient();
    const grant = await getActiveAdminGrant(client, userId, requireEdit);
    if (!grant) {
      return {
        admin,
        client,
        grant: null,
        response: NextResponse.json({ error: requireEdit ? "edit_not_authorized" : "access_not_authorized" }, { status: 403 }),
        userId
      };
    }

    return { admin, client, grant, response: null, userId };
  } catch (error) {
    return {
      admin,
      client: null,
      grant: null,
      response: NextResponse.json(
        { error: isAdminSchemaMissing(error) ? "admin_schema_missing" : "admin_access_unavailable" },
        { status: 503 }
      ),
      userId
    };
  }
}
