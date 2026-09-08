import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type BadgeTone = "neutral" | "mint" | "sky" | "gold" | "coral";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-slate-100 text-slate-700",
  mint: "bg-emerald-50 text-emerald-700",
  sky: "bg-sky-50 text-sky-700",
  gold: "bg-amber-50 text-amber-700",
  coral: "bg-red-50 text-red-700"
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn("inline-flex items-center rounded-md px-2 py-1 text-xs font-medium", tones[tone], className)}
      {...props}
    />
  );
}
