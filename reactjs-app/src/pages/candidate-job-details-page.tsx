import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BriefcaseBusiness, IndianRupee, MapPin, Send } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { applicationsApi, getApiError, jobsApi } from "@/api/client";
import { PageHeader } from "@/components/common/page-header";
import { JobStatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ApplicationForm } from "@/features/applications/application-form";
import { formatCurrencyRange, formatDate, jobTypeLabels } from "@/lib/format";
import { useState } from "react";

export default function CandidateJobDetailsPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const jobId = Number(params.jobId);
  const validJobId = Number.isInteger(jobId) && jobId > 0 ? jobId : null;

  const jobQuery = useQuery({
    queryKey: ["jobs", validJobId],
    queryFn: () => jobsApi.get(validJobId!),
    enabled: Boolean(validJobId),
  });

  const applyMutation = useMutation({
    mutationFn: (payload: { cover_letter: string; resume_url?: string }) =>
      applicationsApi.apply({ ...payload, job_id: validJobId! }),
    onSuccess: () => {
      toast.success("Application submitted");
      setIsApplyOpen(false);
      queryClient.invalidateQueries({ queryKey: ["applications", "mine"] });
    },
    onError: (error) => toast.error(getApiError(error)),
  });

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
        description={`Posted ${formatDate(job.created_at)} • ${job.location}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to="/candidate/jobs">
                <ArrowLeft className="h-4 w-4" />
                Back to jobs
              </Link>
            </Button>
            <Button type="button" onClick={() => setIsApplyOpen(true)}>
              <Send className="h-4 w-4" />
              Apply
            </Button>
          </div>
        }
      />
      <section className="px-4 py-6 sm:px-6 lg:px-8">
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
      </section>
      <Dialog open={isApplyOpen} onOpenChange={setIsApplyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply for {job.title}</DialogTitle>
            <DialogDescription>Your cover letter and resume link will be shared with HR.</DialogDescription>
          </DialogHeader>
          <ApplicationForm isSubmitting={applyMutation.isPending} onSubmit={(values) => applyMutation.mutate(values)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
