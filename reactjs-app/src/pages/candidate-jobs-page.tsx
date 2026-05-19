import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Send } from "lucide-react";
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
import {
  JobSearchFilters,
  salaryRangeFilters,
} from "@/features/jobs/job-search-filters";
import { ProfileStrengthCard } from "@/features/profile/profile-strength-card";
import { formatDate, jobTypeLabels } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useAuth } from "@/app/auth-context";

const JOBS_PAGE_SIZE = 6;

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
                  <MatchMeta match={recommendation} />
                  <ApplyJobAction match={recommendation} onApply={onApply} />
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

function MatchMeta({ match }: { match: JobRecommendation }) {
  const tone = matchScoreTone(match.match_score);

  return (
    <div className={cn("rounded-lg border px-3 py-2", tone.container)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", tone.badge)}>
          {match.match_score}% match
        </span>
        <span className={cn("text-xs font-semibold", tone.text)}>{tone.label}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/70">
        <div
          className={cn("h-full rounded-full transition-all duration-500", tone.bar)}
          style={{ width: `${Math.max(6, Math.min(match.match_score, 100))}%` }}
        />
      </div>
      <p className="mt-2 line-clamp-2 text-xs font-semibold text-slate-600">{match.reason}</p>
    </div>
  );
}

function matchScoreTone(score: number) {
  if (score >= 85) {
    return {
      label: "Excellent fit",
      container: "border-emerald-200 bg-emerald-50",
      badge: "bg-emerald-600 text-white",
      bar: "bg-emerald-600",
      text: "text-emerald-800",
    };
  }
  if (score >= 70) {
    return {
      label: "Strong fit",
      container: "border-green-200 bg-green-50",
      badge: "bg-green-600 text-white",
      bar: "bg-green-600",
      text: "text-green-800",
    };
  }
  if (score >= 55) {
    return {
      label: "Good fit",
      container: "border-amber-200 bg-amber-50",
      badge: "bg-amber-500 text-white",
      bar: "bg-amber-500",
      text: "text-amber-800",
    };
  }
  if (score >= 40) {
    return {
      label: "Partial fit",
      container: "border-orange-200 bg-orange-50",
      badge: "bg-orange-500 text-white",
      bar: "bg-orange-500",
      text: "text-orange-800",
    };
  }
  return {
    label: "Low fit",
    container: "border-red-200 bg-red-50",
    badge: "bg-red-600 text-white",
    bar: "bg-red-600",
    text: "text-red-800",
  };
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
