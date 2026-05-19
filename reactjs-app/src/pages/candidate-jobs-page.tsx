import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Search, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { applicationsApi, getApiError, jobsApi } from "@/api/client";
import type { Job } from "@/api/types";
import { EmptyState } from "@/components/common/empty-state";
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
import { Skeleton } from "@/components/ui/skeleton";
import { ApplicationForm } from "@/features/applications/application-form";
import { JobCard } from "@/features/jobs/job-card";

export default function CandidateJobsPage() {
  const [search, setSearch] = useState("");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const queryClient = useQueryClient();
  const jobsQuery = useQuery({
    queryKey: ["jobs", "candidate", search],
    queryFn: () => jobsApi.list({ search: search || undefined, limit: 50 }),
  });
  const applyMutation = useMutation({
    mutationFn: (payload: { cover_letter: string; resume_url?: string }) =>
      applicationsApi.apply({ ...payload, job_id: selectedJob!.id }),
    onSuccess: () => {
      toast.success("Application submitted");
      setSelectedJob(null);
      queryClient.invalidateQueries({ queryKey: ["applications", "mine"] });
    },
    onError: (error) => toast.error(getApiError(error)),
  });

  return (
    <>
      <PageHeader
        eyebrow="Candidate workspace"
        title="Explore open roles"
        description="Browse active openings and submit a focused application when you find a strong match."
      />
      <section className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="relative max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by title, location, or description"
            className="pl-9"
          />
        </div>
        {jobsQuery.isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-72 rounded-lg" />
            ))}
          </div>
        ) : jobsQuery.data?.items.length ? (
          <motion.div layout className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {jobsQuery.data.items.map((job) => (
              <motion.div key={job.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <JobCard
                  job={job}
                  actions={
                    <Button type="button" onClick={() => setSelectedJob(job)} className="w-full">
                      <Send className="h-4 w-4" />
                      Apply
                    </Button>
                  }
                />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <EmptyState
            icon={Search}
            title="No roles found"
            description="Try a broader keyword or check back after HR publishes new openings."
          />
        )}
      </section>
      <Dialog open={Boolean(selectedJob)} onOpenChange={(open) => !open && setSelectedJob(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply for {selectedJob?.title}</DialogTitle>
            <DialogDescription>Your cover letter and resume link will be shared with HR.</DialogDescription>
          </DialogHeader>
          <ApplicationForm isSubmitting={applyMutation.isPending} onSubmit={(values) => applyMutation.mutate(values)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
