import { cn } from "@/lib/utils";

export function matchScoreTone(score: number) {
  if (score >= 85) {
    return {
      label: "Excellent fit",
      container: "border-emerald-200 bg-emerald-50",
      badge: "bg-emerald-600 text-white",
      bar: "bg-emerald-600",
      text: "text-emerald-800",
    };
  }
  if (score >= 70) {
    return {
      label: "Strong fit",
      container: "border-green-200 bg-green-50",
      badge: "bg-green-600 text-white",
      bar: "bg-green-600",
      text: "text-green-800",
    };
  }
  if (score >= 55) {
    return {
      label: "Good fit",
      container: "border-amber-200 bg-amber-50",
      badge: "bg-amber-500 text-white",
      bar: "bg-amber-500",
      text: "text-amber-800",
    };
  }
  if (score >= 40) {
    return {
      label: "Partial fit",
      container: "border-orange-200 bg-orange-50",
      badge: "bg-orange-500 text-white",
      bar: "bg-orange-500",
      text: "text-orange-800",
    };
  }
  return {
    label: "Low fit",
    container: "border-red-200 bg-red-50",
    badge: "bg-red-600 text-white",
    bar: "bg-red-600",
    text: "text-red-800",
  };
}

interface MatchScoreProps {
  score: number;
  reason: string;
  compact?: boolean;
}

export function MatchScore({ score, reason, compact = false }: MatchScoreProps) {
  const tone = matchScoreTone(score);

  return (
    <div className={cn("rounded-lg border px-3 py-2", tone.container)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", tone.badge)}>
          {score}% match
        </span>
        <span className={cn("text-xs font-semibold", tone.text)}>{tone.label}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/70">
        <div
          className={cn("h-full rounded-full transition-all duration-500", tone.bar)}
          style={{ width: `${Math.max(6, Math.min(score, 100))}%` }}
        />
      </div>
      {!compact ? <p className="mt-2 line-clamp-2 text-xs font-semibold text-slate-600">{reason}</p> : null}
    </div>
  );
}
