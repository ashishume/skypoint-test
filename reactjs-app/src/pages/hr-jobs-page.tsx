import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, FileText, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { applicationsApi, getApiError, jobsApi } from "@/api/client";
import type { ApplicationStatus, ApplicationWithCandidate, Job, JobPayload } from "@/api/types";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { ApplicationStatusBadge } from "@/components/common/status-badge";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { JobForm } from "@/features/jobs/job-form";
import { JobCard } from "@/features/jobs/job-card";
import { applicationStatusLabels, formatDate } from "@/lib/format";

const applicationStatuses = Object.keys(applicationStatusLabels) as ApplicationStatus[];

export default function HrJobsPage() {
  const [search, setSearch] = useState("");
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [applicationsJob, setApplicationsJob] = useState<Job | null>(null);
  const queryClient = useQueryClient();

  const jobsQuery = useQuery({
    queryKey: ["jobs", "hr", search],
    queryFn: () => jobsApi.list({ search: search || undefined, limit: 100 }),
  });
  const applicationsQuery = useQuery({
    queryKey: ["jobs", applicationsJob?.id, "applications"],
    queryFn: () => jobsApi.applications(applicationsJob!.id),
    enabled: Boolean(applicationsJob),
  });

  const createMutation = useMutation({
    mutationFn: jobsApi.create,
    onSuccess: () => {
      toast.success("Job published");
      setIsCreateOpen(false);
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

  return (
    <>
      <PageHeader
        eyebrow="Role management"
        title="Jobs and applicants"
        description="Publish roles, keep job status accurate, and move applications through the review funnel."
        actions={
          <Button type="button" onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New job
          </Button>
        }
      />
      <section className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="relative max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search jobs"
            className="pl-9"
          />
        </div>
        {jobsQuery.isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-80 rounded-lg" />
            ))}
          </div>
        ) : jobsQuery.data?.items.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {jobsQuery.data.items.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                actions={
                  <div className="grid w-full grid-cols-2 gap-2">
                    <Button type="button" variant="outline" onClick={() => setApplicationsJob(job)}>
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
                      className="col-span-2"
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
        ) : (
          <EmptyState
            icon={Plus}
            title="No jobs yet"
            description="Create your first job posting to start collecting candidate applications."
            actionLabel="Create job"
            onAction={() => setIsCreateOpen(true)}
          />
        )}
      </section>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
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

      <Dialog open={Boolean(applicationsJob)} onOpenChange={(open) => !open && setApplicationsJob(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Applicants for {applicationsJob?.title}</DialogTitle>
            <DialogDescription>Review each candidate and update their application status.</DialogDescription>
          </DialogHeader>
          <ApplicantsTable
            applications={applicationsQuery.data?.items ?? []}
            isLoading={applicationsQuery.isLoading}
            onStatusChange={(application, status) =>
              statusMutation.mutate({ id: application.id, status })
            }
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function ApplicantsTable({
  applications,
  isLoading,
  onStatusChange,
}: {
  applications: ApplicationWithCandidate[];
  isLoading: boolean;
  onStatusChange: (application: ApplicationWithCandidate, status: ApplicationStatus) => void;
}) {
  if (isLoading) return <Skeleton className="h-72 rounded-lg" />;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Candidate</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Applied</TableHead>
          <TableHead>Resume</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {applications.map((application) => (
          <TableRow key={application.id}>
            <TableCell>
              <div className="font-medium">{application.candidate.full_name}</div>
              <div className="text-xs text-muted-foreground">{application.candidate.email}</div>
            </TableCell>
            <TableCell>
              <div className="flex min-w-40 flex-col gap-2">
                <ApplicationStatusBadge status={application.status} />
                <Select
                  value={application.status}
                  onValueChange={(value) => onStatusChange(application, value as ApplicationStatus)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {applicationStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {applicationStatusLabels[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TableCell>
            <TableCell className="text-muted-foreground">{formatDate(application.created_at)}</TableCell>
            <TableCell>
              {application.resume_url ? (
                <a
                  href={application.resume_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Open
                </a>
              ) : (
                <span className="text-sm text-muted-foreground">Not provided</span>
              )}
            </TableCell>
          </TableRow>
        ))}
        {!applications.length ? (
          <TableRow>
            <TableCell colSpan={4} className="text-center text-muted-foreground">
              No applications for this role yet.
            </TableCell>
          </TableRow>
        ) : null}
      </TableBody>
    </Table>
  );
}
