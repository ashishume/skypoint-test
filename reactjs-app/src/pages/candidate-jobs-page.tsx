import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { applicationsApi, candidateProfileApi, getApiError } from "@/api/client";
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
import { MatchScore } from "@/features/jobs/match-score";
import {
  JobSearchFilters,
  salaryRangeFilters,
} from "@/features/jobs/job-search-filters";
import { ProfileStrengthCard } from "@/features/profile/profile-strength-card";
import { formatDate, jobTypeLabels } from "@/lib/format";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useAuth } from "@/app/auth-context";

const JOBS_PAGE_SIZE = 6;
const RECOMMENDATIONS_PER_PAGE = 2;

export default function CandidateJobsPage() {
  const { user } = useAuth();
  const firstName = user?.full_name?.split(" ")[0] ?? "there";
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
    if (debouncedKeyword || debouncedLocation || debouncedSalaryRange !== "any") {
      setSearchParams({ searchMode: "1" }, { replace: true });
    }
  }, [debouncedKeyword, debouncedLocation, debouncedSalaryRange]);

  const salary = salaryRangeFilters[filters.salaryRange] ?? salaryRangeFilters.any;
  const matchesQuery = useQuery({
    queryKey: ["candidate", "job-matches", filters, page],
    queryFn: () =>
      candidateProfileApi.jobMatches({
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
    queryFn: () => applicationsApi.mine({ limit: 2, open_jobs_only: true }),
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
    onSuccess: async () => {
      toast.success("Application submitted");
      setSelectedJob(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["applications"], refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: ["candidate", "job-matches"], refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: ["candidate", "recommendations"], refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: ["jobs"], refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
    },
    onError: (error) => toast.error(getApiError(error)),
  });

  return (
    <>
      <PageHeader
        eyebrow="Candidate workspace"
        title={`Good Morning, ${firstName}`}
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
        />

        {hasActiveSearch ? (
          <SearchResults
            isLoading={matchesQuery.isLoading}
            matches={matchesQuery.data?.items ?? []}
            total={matchesQuery.data?.total}
            limit={matchesQuery.data?.limit}
            offset={matchesQuery.data?.offset}
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
  matches,
  total,
  limit,
  offset,
  onPageChange,
  onApply,
}: {
  isLoading: boolean;
  matches: JobRecommendation[];
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
      ) : matches.length ? (
        <>
          <motion.div layout className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {matches.map((match) => (
              <motion.div key={match.job.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <JobCard
                  job={match.job}
                  href={`/candidate/jobs/${match.job.id}`}
                  actions={
                    <div className="w-full space-y-3">
                      <MatchMeta match={match} />
                      <ApplyJobAction match={match} onApply={onApply} />
                    </div>
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
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(recommendations.length / RECOMMENDATIONS_PER_PAGE));
  const visibleRecommendations = recommendations.slice(
    page * RECOMMENDATIONS_PER_PAGE,
    page * RECOMMENDATIONS_PER_PAGE + RECOMMENDATIONS_PER_PAGE
  );
  const canSlide = recommendations.length > RECOMMENDATIONS_PER_PAGE;

  useEffect(() => {
    if (page > pageCount - 1) setPage(0);
  }, [page, pageCount]);

  function previousPage() {
    setPage((current) => (current === 0 ? pageCount - 1 : current - 1));
  }

  function nextPage() {
    setPage((current) => (current + 1) % pageCount);
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-bold tracking-tight">Recommended for You</h2>
        {canSlide ? (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={previousPage}
              aria-label="Show previous recommendations"
              className="h-10 w-10 rounded-full bg-white shadow-sm"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={nextPage}
              aria-label="Show next recommendations"
              className="h-10 w-10 rounded-full bg-white shadow-sm"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        ) : null}
      </div>
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-72 rounded-lg" />
          <Skeleton className="h-72 rounded-lg" />
        </div>
      ) : recommendations.length ? (
        <motion.div
          key={page}
          initial={{ opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="grid gap-4 md:grid-cols-2"
        >
          {visibleRecommendations.map((recommendation) => (
            <JobCard
              key={recommendation.job.id}
              job={recommendation.job}
              href={`/candidate/jobs/${recommendation.job.id}`}
              actions={
                <div className="w-full space-y-3">
                  <MatchMeta match={recommendation} />
                  <ApplyJobAction match={recommendation} onApply={onApply} />
                </div>
              }
            />
          ))}
        </motion.div>
      ) : (
        <div className="rounded-lg border border-dashed bg-white p-6 text-sm font-medium text-muted-foreground">
          Add skills and work experience to your profile to unlock tailored recommendations.
        </div>
      )}
    </section>
  );
}

function MatchMeta({ match }: { match: JobRecommendation }) {
  return <MatchScore score={match.match_score} reason={match.reason} />;
}

function ApplyJobAction({
  match,
  onApply,
}: {
  match: JobRecommendation;
  onApply: (job: Job) => void;
}) {
  if (match.has_applied && match.application_status) {
    return (
      <Button type="button" variant="outline" className="w-full" disabled>
        <ApplicationStatusBadge status={match.application_status} />
      </Button>
    );
  }

  return (
    <Button type="button" variant="outline" onClick={() => onApply(match.job)} className="w-full">
      <Send className="h-4 w-4" />
      Quick Apply
    </Button>
  );
}
