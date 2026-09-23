import { UserRound } from "lucide-react";

import { getProfileInitials, normalizeProfilePhoto } from "@/lib/profile-photo";
import { cn } from "@/lib/utils";

const sizeClasses = {
  sm: "h-9 w-9 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-20 w-20 text-xl"
};

export function ProfileAvatar({
  className,
  displayName,
  photo,
  size = "md"
}: {
  className?: string;
  displayName: string;
  photo?: string;
  size?: keyof typeof sizeClasses;
}) {
  const safePhoto = normalizeProfilePhoto(photo);
  const label = displayName.trim() || "Usuario";

  return (
    <span
      aria-label={`Foto de perfil de ${label}`}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-slate-100 font-semibold text-slate-600",
        sizeClasses[size],
        className
      )}
      role="img"
    >
      {safePhoto ? (
        <img alt="" className="h-full w-full object-cover" src={safePhoto} />
      ) : (
        <span aria-hidden>{getProfileInitials(label)}</span>
      )}
    </span>
  );
}
