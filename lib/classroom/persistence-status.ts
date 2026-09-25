export function classifyClassroomPersistenceError(error: { code?: string; message?: string } | null | undefined) {
  const code = error?.code?.toUpperCase() ?? "";
  const message = error?.message?.toLowerCase() ?? "";
  if (
    code === "42P01" ||
    code === "PGRST205" ||
    (message.includes("classroom_connections") && message.includes("not found"))
  ) {
    return "schema_missing" as const;
  }

  return "unavailable" as const;
}
