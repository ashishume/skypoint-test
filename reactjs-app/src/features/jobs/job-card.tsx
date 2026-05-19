import { BriefcaseBusiness, IndianRupee, MapPin, UsersRound } from "lucide-react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import type { Job } from "@/api/types";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { JobStatusBadge } from "@/components/common/status-badge";
import { formatCurrencyRange, formatDate, jobTypeLabels } from "@/lib/format";
import { cn } from "@/lib/utils";

interface JobCardProps {
  job: Job;
  actions?: ReactNode;
  href?: string;
  showApplicantsCount?: boolean;
}

export function JobCard({ job, actions, href, showApplicantsCount = false }: JobCardProps) {
  const navigate = useNavigate();

  function openDetails() {
    if (href) navigate(href);
  }

  return (
    <Card
      role={href ? "link" : undefined}
      tabIndex={href ? 0 : undefined}
      onClick={openDetails}
      onKeyDown={(event) => {
        if (!href) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openDetails();
        }
      }}
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-lg transition-all",
        href && "cursor-pointer hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
      )}
    >
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="leading-snug">{job.title}</CardTitle>
            <p className="text-xs text-muted-foreground">Posted {formatDate(job.created_at)}</p>
          </div>
          <JobStatusBadge status={job.status} />
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1">
            <MapPin className="h-3.5 w-3.5" />
            {job.location}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1">
            <BriefcaseBusiness className="h-3.5 w-3.5" />
            {jobTypeLabels[job.job_type]}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1">
            <IndianRupee className="h-3.5 w-3.5" />
            {formatCurrencyRange(job.salary_min, job.salary_max)}
          </span>
          {showApplicantsCount ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 font-bold text-blue-700">
              <UsersRound className="h-3.5 w-3.5" />
              {job.applications_count} {job.applications_count === 1 ? "Applicant" : "Applicants"}
            </span>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="space-y-4">
          <p className="line-clamp-4 text-sm leading-6 text-muted-foreground">{job.description}</p>
          {job.skills.length ? (
            <div className="flex flex-wrap gap-2">
              {job.skills.slice(0, 6).map((skill) => (
                <span key={skill} className="rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">
                  {skill}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </CardContent>
      {actions ? (
        <CardFooter className="gap-2" onClick={(event) => event.stopPropagation()}>
          {actions}
        </CardFooter>
      ) : null}
    </Card>
  );
}
