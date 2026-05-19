import { useQuery } from "@tanstack/react-query";
import { ClipboardList } from "lucide-react";
import { applicationsApi } from "@/api/client";
import { ApplicationStatusBadge } from "@/components/common/status-badge";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, jobTypeLabels } from "@/lib/format";

export default function CandidateApplicationsPage() {
  const applicationsQuery = useQuery({
    queryKey: ["applications", "mine"],
    queryFn: () => applicationsApi.mine(),
  });

  return (
    <>
      <PageHeader
        eyebrow="Application tracker"
        title="Your applications"
        description="Follow every application from submission through review."
      />
      <section className="space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        {applicationsQuery.isLoading ? (
          Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-36 rounded-lg" />)
        ) : applicationsQuery.data?.items.length ? (
          applicationsQuery.data.items.map((application) => (
            <Card key={application.id} className="rounded-lg">
              <CardContent className="grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold">{application.job.title}</h2>
                    <ApplicationStatusBadge status={application.status} />
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
          ))
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
