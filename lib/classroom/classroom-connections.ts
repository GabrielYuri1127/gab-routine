import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { ClassroomAccount, ClassroomConnectionSummary } from "@/types/classroom";
import type { ClassroomTokenResponse } from "./google-classroom";

const CONNECTIONS_TABLE = "classroom_connections";

interface ClassroomConnectionRow {
  connected_at: string;
  created_at: string;
  email: string | null;
  google_account_id: string;
  hosted_domain: string | null;
  id: string;
  last_synced_at: string | null;
  name: string | null;
  picture: string | null;
  refresh_token_encrypted: string;
  scope: string | null;
  token_expires_at: string | null;
  updated_at: string;
  user_id: string;
}

export async function saveClassroomConnection(
  userId: string,
  account: ClassroomAccount,
  token: ClassroomTokenResponse
): Promise<ClassroomConnectionSummary> {
  const client = createSupabaseServiceClient();
  const { data: existing } = await client
    .from(CONNECTIONS_TABLE)
    .select("refresh_token_encrypted")
    .eq("user_id", userId)
    .eq("google_account_id", account.id)
    .maybeSingle();
  const encryptedRefreshToken = token.refresh_token
    ? encryptToken(token.refresh_token)
    : (existing as Pick<ClassroomConnectionRow, "refresh_token_encrypted"> | null)?.refresh_token_encrypted;

  if (!encryptedRefreshToken) {
    throw new Error("Google did not return an offline refresh token.");
  }

  const now = new Date().toISOString();
  const { data, error } = await client
    .from(CONNECTIONS_TABLE)
    .upsert(
      {
        connected_at: account.connectedAt || now,
        email: account.email ?? null,
        google_account_id: account.id,
        hosted_domain: account.hostedDomain ?? null,
        last_synced_at: now,
        name: account.name ?? null,
        picture: account.picture ?? null,
        refresh_token_encrypted: encryptedRefreshToken,
        scope: token.scope ?? null,
        token_expires_at: token.expires_in ? new Date(Date.now() + token.expires_in * 1_000).toISOString() : null,
        updated_at: now,
        user_id: userId
      },
      { onConflict: "user_id,google_account_id" }
    )
    .select("*")
    .single();

  if (error || !data) {
    throw new Error("Could not save the Classroom connection.");
  }

  return rowToSummary(data as ClassroomConnectionRow);
}

export async function listClassroomConnections(userId: string): Promise<ClassroomConnectionSummary[]> {
  const client = createSupabaseServiceClient();
  const { data, error } = await client
    .from(CONNECTIONS_TABLE)
    .select("id,google_account_id,email,name,picture,hosted_domain,connected_at,last_synced_at")
    .eq("user_id", userId)
    .order("connected_at", { ascending: false });

  if (error) {
    throw new Error("Could not list Classroom connections.");
  }

  return (data ?? []).map((row) => rowToSummary(row as ClassroomConnectionRow));
}

export async function getClassroomConnection(userId: string, connectionId: string) {
  const client = createSupabaseServiceClient();
  const { data, error } = await client
    .from(CONNECTIONS_TABLE)
    .select("*")
    .eq("id", connectionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const row = data as ClassroomConnectionRow;
  return {
    account: rowToAccount(row),
    connectionId: row.id,
    refreshToken: decryptToken(row.refresh_token_encrypted)
  };
}

export async function markClassroomConnectionSynced(userId: string, connectionId: string, expiresIn?: number) {
  const client = createSupabaseServiceClient();
  const now = new Date().toISOString();
  await client
    .from(CONNECTIONS_TABLE)
    .update({
      last_synced_at: now,
      token_expires_at: expiresIn ? new Date(Date.now() + expiresIn * 1_000).toISOString() : null,
      updated_at: now
    })
    .eq("id", connectionId)
    .eq("user_id", userId);
}

export async function deleteClassroomConnection(userId: string, connectionId: string) {
  const client = createSupabaseServiceClient();
  const { error } = await client.from(CONNECTIONS_TABLE).delete().eq("id", connectionId).eq("user_id", userId);

  if (error) {
    throw new Error("Could not remove the Classroom connection.");
  }
}

function rowToSummary(row: ClassroomConnectionRow): ClassroomConnectionSummary {
  return {
    ...rowToAccount(row),
    connectionId: row.id,
    lastSyncedAt: row.last_synced_at ?? undefined
  };
}

function rowToAccount(row: ClassroomConnectionRow): ClassroomAccount {
  return {
    connectedAt: row.connected_at,
    email: row.email ?? undefined,
    hostedDomain: row.hosted_domain ?? undefined,
    id: row.google_account_id,
    name: row.name ?? undefined,
    picture: row.picture ?? undefined
  };
}

function encryptToken(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

function decryptToken(value: string) {
  const [version, rawIv, rawTag, rawEncrypted] = value.split(".");
  if (version !== "v1" || !rawIv || !rawTag || !rawEncrypted) {
    throw new Error("Invalid Classroom token payload.");
  }

  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(rawIv, "base64url"));
  decipher.setAuthTag(Buffer.from(rawTag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(rawEncrypted, "base64url")), decipher.final()]).toString("utf8");
}

function getEncryptionKey() {
  const secret = process.env.CLASSROOM_TOKEN_ENCRYPTION_KEY?.trim() || process.env.GOOGLE_CLASSROOM_CLIENT_SECRET?.trim();
  if (!secret) {
    throw new Error("Classroom token encryption is not configured.");
  }

  return createHash("sha256").update(secret).digest();
}
