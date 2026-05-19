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
      to={`/hr/jobs/${application.job.id}?applicationStatus=${application.status}`}
      className="block rounded-md outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
    >
      <motion.article
        whileHover={{ y: -2, scale: 1.01 }}
        className={cn(
          "rounded-md border bg-slate-50 p-4 shadow-sm transition-colors",
          isHighlighted ? "border-blue-700 ring-1 ring-blue-700" : "border-slate-200 hover:border-blue-500"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold text-slate-900">{application.candidate.full_name}</h3>
          {application.status === "pending" ? (
            <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase text-[#0b1c30]">New</span>
          ) : null}
        </div>
        <p className="mt-2 text-sm font-semibold text-slate-600">{application.job.title}</p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-[#091426] text-[11px] font-bold text-white">
              {initials}
            </span>
            <span className="text-sm font-semibold text-slate-600">{formatDate(application.created_at)}</span>
          </div>
          {application.status === "reviewed" ? (
            <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">
              {applicationStatusLabels[application.status]}
            </span>
          ) : null}
          {application.status === "shortlisted" ? (
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full w-3/4 rounded-full bg-green-500" />
            </div>
          ) : null}
        </div>
      </motion.article>
    </Link>
  );
}
