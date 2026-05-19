import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, Eye, FileText, Plus, Search, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { applicationsApi, getApiError, jobsApi } from "@/api/client";
import type { ApplicationStatus, Job, JobPayload, JobStatus } from "@/api/types";
import { EmptyState } from "@/components/common/empty-state";
import { PaginationControls } from "@/components/common/pagination-controls";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ApplicantsTable } from "@/features/jobs/applicants-table";
import { JobForm } from "@/features/jobs/job-form";
import { JobCard } from "@/features/jobs/job-card";
import { applicationStatusLabels, jobStatusLabels } from "@/lib/format";
import { useDebouncedValue } from "@/lib/use-debounced-value";

const applicationStatuses = Object.keys(applicationStatusLabels) as ApplicationStatus[];
const jobStatuses = Object.keys(jobStatusLabels) as JobStatus[];
const JOBS_PAGE_SIZE = 9;
const APPLICANTS_PAGE_SIZE = 8;

function parsePositivePage(value: string | null) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function parseApplicationStatus(value: string | null): ApplicationStatus | undefined {
  return applicationStatuses.includes(value as ApplicationStatus) ? (value as ApplicationStatus) : undefined;
}

function parseJobStatus(value: string | null): JobStatus | undefined {
  return jobStatuses.includes(value as JobStatus) ? (value as JobStatus) : undefined;
}

export default function HrJobsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [applicationsJob, setApplicationsJob] = useState<Job | null>(null);
  const [page, setPage] = useState(() => parsePositivePage(searchParams.get("page")));
  const [applicationsPage, setApplicationsPage] = useState(1);
  const queryClient = useQueryClient();
  const debouncedSearch = useDebouncedValue(search.trim(), 350);
  const applicationStatusFilter = parseApplicationStatus(searchParams.get("applicationStatus"));
  const jobStatusFilter = parseJobStatus(searchParams.get("status"));
  const shouldOpenCreateDialog = searchParams.get("create") === "1";
  const routeJobId = Number(searchParams.get("jobId"));
  const routedJobId = Number.isInteger(routeJobId) && routeJobId > 0 ? routeJobId : null;

  useEffect(() => {
    if (shouldOpenCreateDialog) setIsCreateOpen(true);
  }, [shouldOpenCreateDialog]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, jobStatusFilter]);

  useEffect(() => {
    setApplicationsPage(1);
  }, [applicationsJob?.id, applicationStatusFilter]);

  const jobsQuery = useQuery({
    queryKey: ["jobs", "hr", debouncedSearch, jobStatusFilter, page],
    queryFn: () =>
      jobsApi.list({
        search: debouncedSearch || undefined,
        status: jobStatusFilter,
        limit: JOBS_PAGE_SIZE,
        offset: (page - 1) * JOBS_PAGE_SIZE,
      }),
    placeholderData: (previous) => previous,
  });
  const routedJobQuery = useQuery({
    queryKey: ["jobs", routedJobId],
    queryFn: () => jobsApi.get(routedJobId!),
    enabled: Boolean(routedJobId),
  });

  useEffect(() => {
    if (routedJobQuery.data) setApplicationsJob(routedJobQuery.data);
  }, [routedJobQuery.data]);

  const applicationsQuery = useQuery({
    queryKey: ["jobs", applicationsJob?.id, "applications", applicationStatusFilter, applicationsPage],
    queryFn: () =>
      jobsApi.applications(applicationsJob!.id, {
        status: applicationStatusFilter,
        limit: APPLICANTS_PAGE_SIZE,
        offset: (applicationsPage - 1) * APPLICANTS_PAGE_SIZE,
      }),
    enabled: Boolean(applicationsJob),
    placeholderData: (previous) => previous,
  });

  const createMutation = useMutation({
    mutationFn: jobsApi.create,
    onSuccess: () => {
      toast.success("Job published");
      closeCreateDialog();
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => toast.error(getApiError(error)),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: JobPayload }) => jobsApi.update(id, payload),
    onSuccess: () => {
      toast.success("Job updated");
      setEditingJob(null);
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => toast.error(getApiError(error)),
  });
  const deleteMutation = useMutation({
    mutationFn: jobsApi.remove,
    onSuccess: () => {
      toast.success("Job removed");
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => toast.error(getApiError(error)),
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: ApplicationStatus }) =>
      applicationsApi.updateStatus(id, status),
    onSuccess: () => {
      toast.success("Application status updated");
      queryClient.invalidateQueries({ queryKey: ["jobs", applicationsJob?.id, "applications"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => toast.error(getApiError(error)),
  });

  function confirmDelete(job: Job) {
    if (window.confirm(`Delete "${job.title}"? Applications for this role will also be removed.`)) {
      deleteMutation.mutate(job.id);
    }
  }

  function updateParams(updates: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    setSearchParams(next, { replace: true });
  }

  function closeApplicantsDialog() {
    setApplicationsJob(null);
    updateParams({ jobId: null });
  }

  function openCreateDialog() {
    setIsCreateOpen(true);
    updateParams({ create: "1" });
  }

  function closeCreateDialog() {
    setIsCreateOpen(false);
    updateParams({ create: null });
  }

  const activeFilterLabel = useMemo(() => {
    if (applicationStatusFilter) {
      return `${applicationStatusLabels[applicationStatusFilter]} applicants`;
    }
    if (jobStatusFilter) {
      return `${jobStatusLabels[jobStatusFilter]} jobs`;
    }
    return null;
  }, [applicationStatusFilter, jobStatusFilter]);

  return (
    <>
      <PageHeader
        eyebrow="Role management"
        title="Jobs and applicants"
        description="Publish roles, keep job status accurate, and move applications through the review funnel."
        actions={
          <Button type="button" onClick={openCreateDialog}>
            <Plus className="h-4 w-4" />
            New job
          </Button>
        }
      />
      <section className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative max-w-xl flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search jobs"
              className="pl-9"
            />
          </div>
          <Select
            value={jobStatusFilter ?? "all"}
            onValueChange={(value) => updateParams({ status: value === "all" ? null : value, page: null })}
          >
            <SelectTrigger className="w-full lg:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All jobs</SelectItem>
              {jobStatuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {jobStatusLabels[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {activeFilterLabel ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm">
            <span className="font-semibold text-blue-900">Showing {activeFilterLabel}</span>
            {applicationStatusFilter && !applicationsJob ? (
              <span className="text-blue-800">Open a job&apos;s Applicants panel to view this filtered applicant list.</span>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => updateParams({ status: null, applicationStatus: null, jobId: null, page: null })}
              className="text-blue-900 hover:bg-blue-100"
            >
              <X className="h-4 w-4" />
              Clear
            </Button>
          </div>
        ) : null}
        {jobsQuery.isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-80 rounded-lg" />
            ))}
          </div>
        ) : jobsQuery.data?.items.length ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {jobsQuery.data.items.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  showApplicantsCount
                  actions={
                    <div className="grid w-full grid-cols-2 gap-2">
                      <Button type="button" variant="outline" asChild>
                        <Link to={`/hr/jobs/${job.id}`}>
                          <Eye className="h-4 w-4" />
                          Details
                        </Link>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setApplicationsJob(job);
                          updateParams({ jobId: String(job.id) });
                        }}
                      >
                        <FileText className="h-4 w-4" />
                        Applicants
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setEditingJob(job)}>
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => confirmDelete(job)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  }
                />
              ))}
            </div>
            <PaginationControls
              limit={jobsQuery.data.limit}
              offset={jobsQuery.data.offset}
              total={jobsQuery.data.total}
              onPageChange={setPage}
            />
          </>
        ) : (
          <EmptyState
            icon={Plus}
            title="No jobs yet"
            description="Create your first job posting to start collecting candidate applications."
            actionLabel="Create job"
            onAction={openCreateDialog}
          />
        )}
      </section>

      <Dialog open={isCreateOpen} onOpenChange={(open) => (open ? openCreateDialog() : closeCreateDialog())}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create job</DialogTitle>
            <DialogDescription>Publish a new role for candidates to discover.</DialogDescription>
          </DialogHeader>
          <JobForm
            submitLabel="Publish job"
            isSubmitting={createMutation.isPending}
            onSubmit={(payload) => createMutation.mutate(payload)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingJob)} onOpenChange={(open) => !open && setEditingJob(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit job</DialogTitle>
            <DialogDescription>Update the role details shown to candidates.</DialogDescription>
          </DialogHeader>
          {editingJob ? (
            <JobForm
              job={editingJob}
              submitLabel="Save changes"
              isSubmitting={updateMutation.isPending}
              onSubmit={(payload) => updateMutation.mutate({ id: editingJob.id, payload })}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(applicationsJob)} onOpenChange={(open) => !open && closeApplicantsDialog()}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Applicants for {applicationsJob?.title}</DialogTitle>
            <DialogDescription>
              Review each candidate and update their application status.
              {applicationStatusFilter ? ` Filtered to ${applicationStatusLabels[applicationStatusFilter]}.` : ""}
            </DialogDescription>
          </DialogHeader>
          <ApplicantsTable
            page={applicationsQuery.data}
            isLoading={applicationsQuery.isLoading}
            onPageChange={setApplicationsPage}
            onStatusChange={(application, status) =>
              statusMutation.mutate({ id: application.id, status })
            }
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
