import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

interface ClassroomOAuthState {
  expiresAt: number;
  nonce: string;
  userId: string;
}

export function createClassroomOAuthState(userId: string) {
  const payload: ClassroomOAuthState = {
    expiresAt: Date.now() + 10 * 60 * 1_000,
    nonce: randomUUID(),
    userId
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function verifyClassroomOAuthState(value: string): ClassroomOAuthState | null {
  const [encoded, signature] = value.split(".");
  if (!encoded || !signature) {
    return null;
  }

  const expected = Buffer.from(sign(encoded));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as Partial<ClassroomOAuthState>;
    if (!parsed.userId || !parsed.nonce || !parsed.expiresAt || parsed.expiresAt < Date.now()) {
      return null;
    }

    return parsed as ClassroomOAuthState;
  } catch {
    return null;
  }
}

function sign(value: string) {
  const secret = process.env.CLASSROOM_TOKEN_ENCRYPTION_KEY?.trim() || process.env.GOOGLE_CLASSROOM_CLIENT_SECRET?.trim();
  if (!secret) {
    throw new Error("Classroom OAuth state signing is not configured.");
  }

  return createHmac("sha256", secret).update(value).digest("base64url");
}
