import { cn } from "@/lib/utils";

interface ProgressProps {
  value: number;
  tone?: "mint" | "gold" | "coral" | "sky";
  className?: string;
}

const tones = {
  mint: "bg-mint",
  gold: "bg-gold",
  coral: "bg-coral",
  sky: "bg-sky"
};

export function Progress({ value, tone = "mint", className }: ProgressProps) {
  const normalized = Math.min(100, Math.max(0, value));

  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-slate-100", className)}>
      <div className={cn("h-full rounded-full transition-all", tones[tone])} style={{ width: `${normalized}%` }} />
    </div>
  );
}
