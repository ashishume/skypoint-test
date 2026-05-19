import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { applicationsApi, candidateProfileApi, getApiError, jobsApi } from "@/api/client";
import type { ApplicationWithJob, Job, JobRecommendation } from "@/api/types";
import { EmptyState } from "@/components/common/empty-state";
import { PaginationControls } from "@/components/common/pagination-controls";
import { PageHeader } from "@/components/common/page-header";
import { ApplicationStatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ApplicationForm } from "@/features/applications/application-form";
import { JobCard } from "@/features/jobs/job-card";
import {
  JobSearchFilters,
  salaryRangeFilters,
} from "@/features/jobs/job-search-filters";
import { ProfileStrengthCard } from "@/features/profile/profile-strength-card";
import { formatDate, jobTypeLabels } from "@/lib/format";
import { useDebouncedValue } from "@/lib/use-debounced-value";

const JOBS_PAGE_SIZE = 6;

export default function CandidateJobsPage() {
  const [draftKeyword, setDraftKeyword] = useState("");
  const [draftLocation, setDraftLocation] = useState("");
  const [draftSalaryRange, setDraftSalaryRange] = useState("any");
  const [filters, setFilters] = useState({ keyword: "", location: "", salaryRange: "any" });
  const [page, setPage] = useState(1);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const debouncedKeyword = useDebouncedValue(draftKeyword.trim(), 350);
  const debouncedLocation = useDebouncedValue(draftLocation.trim(), 350);
  const debouncedSalaryRange = useDebouncedValue(draftSalaryRange, 350);
  const isActiveSearchRoute = searchParams.get("searchMode") === "1";
  const hasActiveSearch = isActiveSearchRoute || Boolean(filters.keyword || filters.location || filters.salaryRange !== "any");

  useEffect(() => {
    setPage(1);
  }, [filters]);

  useEffect(() => {
    setFilters({
      keyword: debouncedKeyword,
      location: debouncedLocation,
      salaryRange: debouncedSalaryRange,
    });
  }, [debouncedKeyword, debouncedLocation, debouncedSalaryRange]);

  const salary = salaryRangeFilters[filters.salaryRange] ?? salaryRangeFilters.any;
  const jobsQuery = useQuery({
    queryKey: ["jobs", "candidate", filters, page],
    queryFn: () =>
      jobsApi.list({
        search: filters.keyword || undefined,
        location: filters.location || undefined,
        salary_min: salary.min,
        salary_max: salary.max,
        limit: JOBS_PAGE_SIZE,
        offset: (page - 1) * JOBS_PAGE_SIZE,
      }),
    enabled: hasActiveSearch,
    placeholderData: (previous) => previous,
  });
  const profileQuery = useQuery({
    queryKey: ["candidate", "profile"],
    queryFn: candidateProfileApi.get,
  });
  const recommendationsQuery = useQuery({
    queryKey: ["candidate", "recommendations"],
    queryFn: candidateProfileApi.recommendations,
  });
  const applicationsQuery = useQuery({
    queryKey: ["applications", "mine", "summary"],
    queryFn: () => applicationsApi.mine({ limit: 2 }),
  });

  const recommendations = useMemo(() => {
    const profile = profileQuery.data;
    if (
      !profile?.skills.length &&
      !profile?.work_experience.trim() &&
      !profile?.salary_min &&
      !profile?.salary_max &&
      !profile?.experience_years &&
      !profile?.preferred_roles.length
    ) {
      return [];
    }
    return recommendationsQuery.data ?? [];
  }, [profileQuery.data, recommendationsQuery.data]);

  const applyMutation = useMutation({
    mutationFn: (payload: { cover_letter: string; resume_url?: string }) =>
      applicationsApi.apply({ ...payload, job_id: selectedJob!.id }),
    onSuccess: () => {
      toast.success("Application submitted");
      setSelectedJob(null);
      queryClient.invalidateQueries({ queryKey: ["applications", "mine"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => toast.error(getApiError(error)),
  });

  function applyFilters() {
    setSearchParams({ searchMode: "1" }, { replace: true });
    setFilters({
      keyword: draftKeyword.trim(),
      location: draftLocation.trim(),
      salaryRange: draftSalaryRange,
    });
  }

  return (
    <>
      <PageHeader
        eyebrow="Candidate workspace"
        title="Good Morning, Alex"
        description="Here is what's happening with your job search today."
      />
      <section className="space-y-8 px-4 py-6 sm:px-6 lg:px-8">
        <JobSearchFilters
          keyword={draftKeyword}
          location={draftLocation}
          salaryRange={draftSalaryRange}
          onKeywordChange={setDraftKeyword}
          onLocationChange={setDraftLocation}
          onSalaryRangeChange={setDraftSalaryRange}
          onSearch={applyFilters}
        />

        {hasActiveSearch ? (
          <SearchResults
            isLoading={jobsQuery.isLoading}
            jobs={jobsQuery.data?.items ?? []}
            total={jobsQuery.data?.total}
            limit={jobsQuery.data?.limit}
            offset={jobsQuery.data?.offset}
            onPageChange={setPage}
            onApply={setSelectedJob}
          />
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-8">
              <ActiveApplications applications={applicationsQuery.data?.items ?? []} isLoading={applicationsQuery.isLoading} />
              <RecommendedJobs
                recommendations={recommendations}
                isLoading={recommendationsQuery.isLoading || profileQuery.isLoading}
                onApply={setSelectedJob}
              />
            </div>
            <ProfileStrengthCard profile={profileQuery.data} />
          </div>
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

function SearchResults({
  isLoading,
  jobs,
  total,
  limit,
  offset,
  onPageChange,
  onApply,
}: {
  isLoading: boolean;
  jobs: Job[];
  total?: number;
  limit?: number;
  offset?: number;
  onPageChange: (page: number) => void;
  onApply: (job: Job) => void;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Search Results</h2>
        {typeof total === "number" ? (
          <span className="text-sm font-semibold text-muted-foreground">{total} roles found</span>
        ) : null}
      </div>
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-72 rounded-lg" />
          ))}
        </div>
      ) : jobs.length ? (
        <>
          <motion.div layout className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {jobs.map((job) => (
              <motion.div key={job.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <JobCard
                  job={job}
                  href={`/candidate/jobs/${job.id}`}
                  actions={
                    <Button type="button" onClick={() => onApply(job)} className="w-full">
                      <Send className="h-4 w-4" />
                      Apply
                    </Button>
                  }
                />
              </motion.div>
            ))}
          </motion.div>
          {typeof total === "number" && typeof limit === "number" && typeof offset === "number" ? (
            <PaginationControls limit={limit} offset={offset} total={total} onPageChange={onPageChange} />
          ) : null}
        </>
      ) : (
        <EmptyState
          icon={Send}
          title="No roles found"
          description="Try a broader keyword, location, or salary range."
        />
      )}
    </section>
  );
}

function ActiveApplications({
  applications,
  isLoading,
}: {
  applications: ApplicationWithJob[];
  isLoading: boolean;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Active Applications</h2>
      </div>
      {isLoading ? (
        <Skeleton className="h-32 rounded-lg" />
      ) : applications.length ? (
        <div className="space-y-3">
          {applications.map((application) => (
            <Card key={application.id} className="rounded-lg">
              <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold">{application.job.title}</h3>
                    <ApplicationStatusBadge status={application.status} />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {application.job.location} • {jobTypeLabels[application.job.job_type]} • Applied {formatDate(application.created_at)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed bg-white p-6 text-sm font-medium text-muted-foreground">
          Applications you submit will appear here.
        </div>
      )}
    </section>
  );
}

function RecommendedJobs({
  recommendations,
  isLoading,
  onApply,
}: {
  recommendations: JobRecommendation[];
  isLoading: boolean;
  onApply: (job: Job) => void;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">Recommended for You</h2>
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-72 rounded-lg" />
          <Skeleton className="h-72 rounded-lg" />
        </div>
      ) : recommendations.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {recommendations.slice(0, 2).map((recommendation) => (
            <JobCard
              key={recommendation.job.id}
              job={recommendation.job}
              href={`/candidate/jobs/${recommendation.job.id}`}
              actions={
                <div className="w-full space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-blue-700">
                    <span>{recommendation.match_score}% match</span>
                    <span>{recommendation.reason}</span>
                  </div>
                  <Button type="button" variant="outline" onClick={() => onApply(recommendation.job)} className="w-full">
                    Quick Apply
                  </Button>
                </div>
              }
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed bg-white p-6 text-sm font-medium text-muted-foreground">
          Add skills and work experience to your profile to unlock tailored recommendations.
        </div>
      )}
    </section>
  );
}
