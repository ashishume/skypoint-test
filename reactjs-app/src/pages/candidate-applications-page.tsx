import { useQuery } from "@tanstack/react-query";
import { ClipboardList } from "lucide-react";
import { useState } from "react";
import { applicationsApi } from "@/api/client";
import { ApplicationStatusBadge } from "@/components/common/status-badge";
import { EmptyState } from "@/components/common/empty-state";
import { PaginationControls } from "@/components/common/pagination-controls";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, jobTypeLabels } from "@/lib/format";
import type { ApplicationWithJob } from "@/api/types";

const APPLICATIONS_PAGE_SIZE = 8;

export default function CandidateApplicationsPage() {
  const [page, setPage] = useState(1);
  const applicationsQuery = useQuery({
    queryKey: ["applications", "mine", "all-jobs", page],
    queryFn: () =>
      applicationsApi.mine({
        limit: APPLICATIONS_PAGE_SIZE,
        offset: (page - 1) * APPLICATIONS_PAGE_SIZE,
      }),
    placeholderData: (previous) => previous,
  });
  const applications = applicationsQuery.data?.items ?? [];
  const activeApplications = applications.filter((application) => application.job.status === "open");
  const archivedApplications = applications.filter((application) => application.job.status === "closed");

  return (
    <>
      <PageHeader
        eyebrow="Application tracker"
        title="Your applications"
        description="Follow applications for roles that are still active."
      />
      <section className="space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        {applicationsQuery.isLoading ? (
          Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-36 rounded-lg" />)
        ) : applicationsQuery.data && applications.length ? (
          <>
            <ApplicationSection title="Active applications" applications={activeApplications} />
            <ApplicationSection title="Archived applications" applications={archivedApplications} archived />
            <PaginationControls
              limit={applicationsQuery.data.limit}
              offset={applicationsQuery.data.offset}
              total={applicationsQuery.data.total}
              onPageChange={setPage}
            />
          </>
        ) : (
          <EmptyState
            icon={ClipboardList}
            title="No applications yet"
            description="Apply to an open role and it will appear here with live status updates."
          />
        )}
      </section>
    </>
  );
}

function ApplicationSection({
  title,
  applications,
  archived = false,
}: {
  title: string;
  applications: ApplicationWithJob[];
  archived?: boolean;
}) {
  if (!applications.length) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold tracking-tight text-slate-900">{title}</h2>
      {applications.map((application) => (
        <Card key={application.id} className={archived ? "rounded-lg border-slate-200 bg-slate-50" : "rounded-lg"}>
          <CardContent className="grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-semibold">{application.job.title}</h3>
                <ApplicationStatusBadge status={application.status} />
                {archived ? (
                  <span className="rounded-md bg-slate-200 px-2 py-1 text-xs font-bold text-slate-700">
                    Closed role
                  </span>
                ) : null}
              </div>
              <p className="text-sm text-muted-foreground">
                {application.job.location} · {jobTypeLabels[application.job.job_type]} · Applied{" "}
                {formatDate(application.created_at)}
              </p>
              <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                {application.cover_letter}
              </p>
            </div>
            {application.resume_url ? (
              <a
                href={application.resume_url}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-primary hover:underline"
              >
                View resume
              </a>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
