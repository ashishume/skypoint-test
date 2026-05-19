import { BriefcaseBusiness, IndianRupee, MapPin } from "lucide-react";
import type { ReactNode } from "react";
import type { Job } from "@/api/types";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { JobStatusBadge } from "@/components/common/status-badge";
import { formatCurrencyRange, formatDate, jobTypeLabels } from "@/lib/format";

interface JobCardProps {
  job: Job;
  actions?: ReactNode;
}

export function JobCard({ job, actions }: JobCardProps) {
  return (
    <Card className="flex h-full flex-col overflow-hidden rounded-lg">
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
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <p className="line-clamp-4 text-sm leading-6 text-muted-foreground">{job.description}</p>
      </CardContent>
      {actions ? <CardFooter className="gap-2">{actions}</CardFooter> : null}
    </Card>
  );
}
