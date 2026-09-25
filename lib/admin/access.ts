import type { SupabaseClient, User } from "@supabase/supabase-js";

import type { AdminAccessGrant, AdminAuditEntry } from "@/types/admin";

export const ADMIN_GRANTS_TABLE = "admin_access_grants";
export const ADMIN_AUDIT_TABLE = "admin_audit_log";

interface AdminGrantRow {
  can_edit: boolean;
  expires_at: string;
  granted_at: string;
  revoked_at: string | null;
  updated_at: string;
  user_id: string;
}

interface AdminAuditRow {
  action: string;
  actor_label: string;
  created_at: string;
  id: string;
  summary: string;
  target_user_id: string;
}

export function isGaviumAdmin(user: User, env: NodeJS.ProcessEnv = process.env) {
  const role = typeof user.app_metadata?.role === "string" ? user.app_metadata.role.toLowerCase() : "";
  if (role === "admin" || role === "owner") {
    return true;
  }

  const email = user.email?.trim().toLowerCase();
  if (!email) {
    return false;
  }

  return getConfiguredAdminEmails(env).includes(email);
}

export function getConfiguredAdminEmails(env: NodeJS.ProcessEnv = process.env) {
  return (env.GAVIUM_ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export async function getActiveAdminGrant(client: SupabaseClient, userId: string, requireEdit = false) {
  const { data, error } = await client
    .from(ADMIN_GRANTS_TABLE)
    .select("user_id,can_edit,granted_at,expires_at,revoked_at,updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const grant = adminGrantFromRow(data as AdminGrantRow);
  if (grant.revokedAt || new Date(grant.expiresAt).getTime() <= Date.now() || (requireEdit && !grant.canEdit)) {
    return null;
  }

  return grant;
}

export function adminGrantFromRow(row: AdminGrantRow): AdminAccessGrant {
  return {
    canEdit: row.can_edit,
    expiresAt: row.expires_at,
    grantedAt: row.granted_at,
    revokedAt: row.revoked_at ?? undefined,
    updatedAt: row.updated_at,
    userId: row.user_id
  };
}

export function adminAuditFromRow(row: AdminAuditRow): AdminAuditEntry {
  return {
    action: row.action,
    actorLabel: row.actor_label,
    createdAt: row.created_at,
    id: row.id,
    summary: row.summary,
    targetUserId: row.target_user_id
  };
}

export function isAdminSchemaMissing(error: unknown) {
  const message = error instanceof Error ? error.message : JSON.stringify(error ?? "");
  return (
    message.includes(ADMIN_GRANTS_TABLE) ||
    message.includes(ADMIN_AUDIT_TABLE) ||
    message.includes("set_admin_access_grant") ||
    message.includes("apply_authorized_admin_routine_edit") ||
    message.includes("PGRST202") ||
    message.includes("PGRST205")
  );
}
