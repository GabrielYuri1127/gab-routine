import { NextResponse } from "next/server";

import { ADMIN_GRANTS_TABLE, isAdminSchemaMissing, isGaviumAdmin } from "@/lib/admin/access";
import { createSupabaseServiceClient, getSupabaseUserFromRequest } from "@/lib/supabase/server";
import type { AdminUserSummary } from "@/types/admin";

export const dynamic = "force-dynamic";

interface SnapshotRow {
  data: unknown;
  updated_at: string;
  user_id: string;
}

export async function GET(request: Request) {
  const admin = await getSupabaseUserFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "auth_required" }, { status: 401 });
  }
  if (!isGaviumAdmin(admin)) {
    return NextResponse.json({ error: "admin_required" }, { status: 403 });
  }

  try {
    const client = createSupabaseServiceClient();
    const { data: grants, error: grantError } = await client
      .from(ADMIN_GRANTS_TABLE)
      .select("user_id,can_edit,expires_at")
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("expires_at", { ascending: true })
      .limit(100);

    if (grantError) throw grantError;

    const userIds = (grants ?? []).map((grant) => grant.user_id as string);
    if (!userIds.length) {
      return NextResponse.json({ users: [] });
    }

    const { data: snapshots, error: snapshotError } = await client
      .from("routine_snapshots")
      .select("user_id,data,updated_at")
      .in("user_id", userIds);
    if (snapshotError) throw snapshotError;

    const snapshotsByUser = new Map(
      (snapshots as SnapshotRow[] | null)?.map((snapshot) => [snapshot.user_id, snapshot]) ?? []
    );
    const users: AdminUserSummary[] = await Promise.all(
      (grants ?? []).map(async (grant) => {
        const userId = grant.user_id as string;
        const snapshot = snapshotsByUser.get(userId);
        const routine = readRoutineSummary(snapshot?.data);
        const { data: authData } = await client.auth.admin.getUserById(userId);

        return {
          canEdit: Boolean(grant.can_edit),
          displayName: routine.displayName,
          email: authData.user?.email,
          expiresAt: grant.expires_at as string,
          lastUpdatedAt: snapshot?.updated_at,
          reminders: routine.reminders,
          subjects: routine.subjects,
          tasks: routine.tasks,
          userId
        };
      })
    );

    return NextResponse.json({ users });
  } catch (error) {
    if (isAdminSchemaMissing(error)) {
      return NextResponse.json({ error: "admin_schema_missing" }, { status: 503 });
    }

    return NextResponse.json({ error: "admin_users_unavailable" }, { status: 503 });
  }
}

function readRoutineSummary(value: unknown) {
  if (!value || typeof value !== "object") {
    return { displayName: "Usuario", reminders: 0, subjects: 0, tasks: 0 };
  }

  const routine = value as Record<string, unknown>;
  const preference = routine.appPreference && typeof routine.appPreference === "object"
    ? (routine.appPreference as Record<string, unknown>)
    : {};

  return {
    displayName:
      typeof preference.displayName === "string" && preference.displayName.trim()
        ? preference.displayName.trim()
        : "Usuario",
    reminders: Array.isArray(routine.reminders) ? routine.reminders.length : 0,
    subjects: Array.isArray(routine.subjects) ? routine.subjects.length : 0,
    tasks: Array.isArray(routine.tasks) ? routine.tasks.length : 0
  };
}
