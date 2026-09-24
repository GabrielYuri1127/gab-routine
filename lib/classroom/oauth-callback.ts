export function getClassroomOAuthFailureQuery(error: string | null) {
  const normalizedError = error?.trim().toLowerCase();

  if (normalizedError === "access_denied") {
    return "classroom=access-denied";
  }

  if (normalizedError === "invalid_scope") {
    return "classroom=scope-error";
  }

  return "classroom=oauth-error";
}
