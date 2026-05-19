import { Link } from "react-router-dom";
import { ChevronRight, Code2, Megaphone } from "lucide-react";
import type { Job } from "@/api/types";
import { AnimatedPanel } from "@/features/dashboard/animated-panel";
import { formatDate, jobTypeLabels } from "@/lib/format";
import { cn } from "@/lib/utils";

interface RecentJobsPanelProps {
  jobs: Job[];
}

export function RecentJobsPanel({ jobs }: RecentJobsPanelProps) {
  return (
    <AnimatedPanel delay={0.32} className="overflow-hidden">
      <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
        <h2 className="text-xl font-bold tracking-tight">Recently Posted Jobs</h2>
      </div>
      <div className="divide-y divide-slate-200">
        {jobs.slice(0, 3).map((job, index) => (
          <RecentJobRow key={job.id} job={job} index={index} />
        ))}
        {!jobs.length ? (
          <div className="px-5 py-8 text-sm font-medium text-slate-500">
            No job postings yet. Publish a role to start collecting applications.
          </div>
        ) : null}
      </div>
    </AnimatedPanel>
  );
}

function RecentJobRow({ job, index }: { job: Job; index: number }) {
  const Icon = index % 2 === 0 ? Code2 : Megaphone;

  return (
    <Link to={`/hr/jobs/${job.id}`} className="group flex items-center justify-between gap-4 px-4 py-4 transition-colors hover:bg-slate-50 sm:px-5">
      <div className="flex min-w-0 items-center gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-slate-100 text-blue-700">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-slate-900">{job.title}</h3>
          <p className="truncate text-sm font-medium text-slate-600">
            {jobTypeLabels[job.job_type]} • {job.location} • Posted {formatDate(job.created_at)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="hidden text-right sm:block">
          <p className="font-semibold text-slate-900">{job.status === "open" ? "Open" : "Closed"}</p>
          <p className={cn("text-sm font-bold", job.status === "open" ? "text-green-600" : "text-slate-500")}>
            {job.status === "open" ? "Accepting apps" : "No new apps"}
          </p>
        </div>
        <ChevronRight className="h-5 w-5 text-slate-500 transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}
