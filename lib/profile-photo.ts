const supportedDataImage = /^data:image\/(?:jpeg|png|webp);base64,/i;

export function normalizeProfilePhoto(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  const photo = value.trim();
  if (supportedDataImage.test(photo)) {
    return photo;
  }

  if (photo.startsWith("https://")) {
    return photo;
  }

  return "";
}

export function getProfileInitials(displayName: string) {
  const parts = displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  return parts.map((part) => part[0]?.toUpperCase()).join("") || "U";
}
