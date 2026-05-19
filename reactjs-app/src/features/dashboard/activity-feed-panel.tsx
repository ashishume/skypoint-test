import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { ApplicationWithJobAndCandidate } from "@/api/types";
import { AnimatedPanel } from "@/features/dashboard/animated-panel";
import { applicationStatusLabels, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ActivityFeedPanelProps {
  applications: ApplicationWithJobAndCandidate[];
}

export function ActivityFeedPanel({ applications }: ActivityFeedPanelProps) {
  const colors = ["bg-blue-700", "bg-green-500", "bg-orange-400", "bg-slate-400"];
  const activity = applications.slice(0, 4);

  return (
    <AnimatedPanel delay={0.38} className="overflow-hidden">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">Recent Activity</h2>
      </div>
      <div className="relative space-y-6 p-5">
        <div className="absolute bottom-8 left-[31px] top-8 w-px bg-slate-200" />
        {activity.map((application, index) => (
          <motion.div
            key={application.id}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.45 + index * 0.06 }}
            className="relative flex gap-4"
          >
            <span className={cn("z-10 mt-1 h-4 w-4 rounded-full ring-4 ring-white", colors[index % colors.length])} />
            <div className="flex-1">
              <p className="text-sm leading-6 text-slate-900">
                <span className="font-bold">{application.candidate.full_name}</span> moved to{" "}
                <span className="font-bold">{applicationStatusLabels[application.status]}</span> for {application.job.title}.
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-600">{formatDate(application.updated_at)}</p>
            </div>
          </motion.div>
        ))}
        {!activity.length ? (
          <div className="flex items-center gap-3 rounded-md bg-slate-50 p-4 text-sm font-medium text-slate-500">
            <Sparkles className="h-4 w-4 text-blue-700" />
            Candidate activity will appear here once applications start moving.
          </div>
        ) : null}
      </div>
    </AnimatedPanel>
  );
}
