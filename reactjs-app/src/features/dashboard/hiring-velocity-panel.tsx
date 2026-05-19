import { motion } from "framer-motion";
import type { HiringVelocity } from "@/api/types";
import { AnimatedPanel } from "@/features/dashboard/animated-panel";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

interface HiringVelocityPanelProps {
  velocity: HiringVelocity;
}

export function HiringVelocityPanel({ velocity }: HiringVelocityPanelProps) {
  const peak = Math.max(...velocity.buckets.map((bucket) => bucket.applications), 1);

  return (
    <AnimatedPanel delay={0.52} className="p-5">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">Hiring Velocity</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            {velocity.total_applications} applications in the last {velocity.window_days} days
          </p>
        </div>
        <span className="shrink-0 text-sm font-bold text-blue-700">Avg {velocity.average_weekly_applications}/wk</span>
      </div>
      <div className="flex h-36 items-end justify-between gap-3">
        {velocity.buckets.map((bucket, index) => (
          <div key={bucket.label} className="flex h-full w-full flex-col items-center justify-end gap-2">
            <span className="text-xs font-bold text-slate-700">{bucket.applications}</span>
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${Math.max(12, (bucket.applications / peak) * 100)}%` }}
              transition={{ duration: 0.55, delay: 0.6 + index * 0.04, ease: "easeOut" }}
              className={cn(
                "w-full rounded-t bg-slate-200 transition-colors hover:bg-blue-700",
                bucket.label === velocity.peak_week_label && "bg-blue-700"
              )}
              title={`${bucket.applications} applications, ${formatDate(bucket.start_date)} - ${formatDate(bucket.end_date)}`}
            />
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-between text-xs font-medium text-slate-600">
        {velocity.buckets.map((bucket) => (
          <span key={bucket.label}>{bucket.label.replace("Week ", "WK ")}</span>
        ))}
      </div>
      <div className="mt-5 rounded-md bg-slate-50 p-3 text-sm font-medium text-slate-600">
        Peak intake: <span className="font-bold text-slate-900">{velocity.peak_week_label}</span>. Use this to spot
        when sourcing campaigns are generating the most candidate flow.
      </div>
    </AnimatedPanel>
  );
}
