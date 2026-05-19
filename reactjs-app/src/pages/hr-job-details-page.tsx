import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BriefcaseBusiness, IndianRupee, MapPin } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { applicationsApi, getApiError, jobsApi } from "@/api/client";
import type { ApplicationStatus } from "@/api/types";
import { PageHeader } from "@/components/common/page-header";
import { JobStatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApplicantsTable } from "@/features/jobs/applicants-table";
import { applicationStatusLabels, formatCurrencyRange, formatDate, jobTypeLabels } from "@/lib/format";

const APPLICANTS_PAGE_SIZE = 8;
const applicationStatuses = Object.keys(applicationStatusLabels) as ApplicationStatus[];

function parseApplicationStatus(value: string | null): ApplicationStatus | undefined {
  return applicationStatuses.includes(value as ApplicationStatus) ? (value as ApplicationStatus) : undefined;
}

function parsePositivePage(value: string | null) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export default function HrJobDetailsPage() {
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const jobId = Number(params.jobId);
  const validJobId = Number.isInteger(jobId) && jobId > 0 ? jobId : null;
  const applicationStatusFilter = parseApplicationStatus(searchParams.get("applicationStatus"));
  const applicantsPage = parsePositivePage(searchParams.get("page"));

  const jobQuery = useQuery({
    queryKey: ["jobs", validJobId],
    queryFn: () => jobsApi.get(validJobId!),
    enabled: Boolean(validJobId),
  });

  const applicationsQuery = useQuery({
    queryKey: ["jobs", validJobId, "applications", applicationStatusFilter, applicantsPage],
    queryFn: () =>
      jobsApi.applications(validJobId!, {
        status: applicationStatusFilter,
        limit: APPLICANTS_PAGE_SIZE,
        offset: (applicantsPage - 1) * APPLICANTS_PAGE_SIZE,
      }),
    enabled: Boolean(validJobId),
    placeholderData: (previous) => previous,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: ApplicationStatus }) =>
      applicationsApi.updateStatus(id, status),
    onSuccess: () => {
      toast.success("Application status updated");
      queryClient.invalidateQueries({ queryKey: ["jobs", validJobId, "applications"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => toast.error(getApiError(error)),
  });

  function setApplicantsPage(page: number) {
    const next = new URLSearchParams(searchParams);
    if (page > 1) next.set("page", String(page));
    else next.delete("page");
    setSearchParams(next, { replace: true });
  }

  if (!validJobId) {
    return (
      <section className="px-4 py-6 sm:px-6 lg:px-8">
        <Card className="rounded-lg">
          <CardContent className="p-6 text-sm font-medium text-muted-foreground">
            This job link is invalid.
          </CardContent>
        </Card>
      </section>
    );
  }

  if (jobQuery.isLoading) {
    return (
      <section className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-72 rounded-lg" />
      </section>
    );
  }

  if (!jobQuery.data) {
    return (
      <section className="px-4 py-6 sm:px-6 lg:px-8">
        <Card className="rounded-lg">
          <CardContent className="p-6 text-sm font-medium text-muted-foreground">
            Job not found.
          </CardContent>
        </Card>
      </section>
    );
  }

  const job = jobQuery.data;

  return (
    <>
      <PageHeader
        eyebrow="Job details"
        title={job.title}
        description={`Posted ${formatDate(job.created_at)} • ${job.status === "open" ? "Accepting applications" : "Closed to new applications"}`}
        actions={
          <Button asChild variant="outline">
            <Link to="/hr/jobs">
              <ArrowLeft className="h-4 w-4" />
              Back to jobs
            </Link>
          </Button>
        }
      />
      <section className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <Card className="rounded-lg">
          <CardHeader className="border-b">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <CardTitle className="text-2xl">{job.title}</CardTitle>
                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1">
                    <MapPin className="h-4 w-4" />
                    {job.location}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1">
                    <BriefcaseBusiness className="h-4 w-4" />
                    {jobTypeLabels[job.job_type]}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1">
                    <IndianRupee className="h-4 w-4" />
                    {formatCurrencyRange(job.salary_min, job.salary_max)}
                  </span>
                </div>
              </div>
              <JobStatusBadge status={job.status} />
            </div>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div>
              <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">Description</h2>
              <p className="whitespace-pre-line text-sm leading-6 text-slate-700">{job.description}</p>
            </div>
            {job.skills.length ? (
              <div>
                <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((skill) => (
                    <span key={skill} className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader className="border-b">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Applicants</CardTitle>
                <p className="mt-1 text-sm font-medium text-muted-foreground">
                  {applicationStatusFilter
                    ? `Showing ${applicationStatusLabels[applicationStatusFilter].toLowerCase()} applications.`
                    : "Review candidates for this role."}
                </p>
              </div>
              {applicationStatusFilter ? (
                <Button asChild variant="ghost">
                  <Link to={`/hr/jobs/${job.id}`}>Clear filter</Link>
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <ApplicantsTable
              page={applicationsQuery.data}
              isLoading={applicationsQuery.isLoading}
              onPageChange={setApplicantsPage}
              onStatusChange={(application, status) =>
                statusMutation.mutate({ id: application.id, status })
              }
            />
          </CardContent>
        </Card>
      </section>
    </>
  );
}
