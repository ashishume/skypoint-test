import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import type { ApplicationWithJobAndCandidate } from "@/api/types";
import { applicationStatusLabels, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

interface PipelineCardProps {
  application: ApplicationWithJobAndCandidate;
  isHighlighted?: boolean;
}

export function PipelineCard({ application, isHighlighted }: PipelineCardProps) {
  const initials = application.candidate.full_name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Link
      to={`/hr/candidates?applicationId=${application.id}`}
      className="block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
    >
      <motion.article
        whileHover={{ y: -2, scale: 1.01 }}
        className={cn(
          "flex h-40 min-w-0 flex-col justify-between overflow-hidden rounded-lg border bg-slate-50 p-4 shadow-sm transition-colors",
          isHighlighted ? "border-blue-700 ring-2 ring-blue-700" : "border-slate-200 hover:border-blue-500"
        )}
      >
        <div className="flex min-w-0 items-start justify-between gap-3">
          <h3 className="line-clamp-1 min-w-0 font-semibold text-slate-900">{application.candidate.full_name}</h3>
          {application.status === "pending" ? (
            <span className="shrink-0 rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase text-[#0b1c30]">New</span>
          ) : null}
        </div>
        <p className="mt-2 line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-slate-600">{application.job.title}</p>
        <div className="mt-3 flex min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#091426] text-[11px] font-bold text-white">
              {initials}
            </span>
            <span className="line-clamp-2 text-sm font-semibold leading-5 text-slate-600">{formatDate(application.created_at)}</span>
          </div>
          {application.status === "reviewed" ? (
            <span className="shrink-0 rounded-md bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">
              {applicationStatusLabels[application.status]}
            </span>
          ) : null}
          {application.status === "shortlisted" ? (
            <div className="h-1.5 w-24 shrink-0 overflow-hidden rounded-md bg-slate-200">
              <div className="h-full w-3/4 rounded-md bg-green-500" />
            </div>
          ) : null}
        </div>
      </motion.article>
    </Link>
  );
}
