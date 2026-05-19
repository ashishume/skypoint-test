import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LayoutGrid, List, Search, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { applicationsApi, getApiError } from "@/api/client";
import type { ApplicationStatus, ApplicationWithCandidateProfile } from "@/api/types";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { PaginationControls } from "@/components/common/pagination-controls";
import { ApplicationStatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
import { CandidateProfileDialog } from "@/features/candidates/candidate-profile-dialog";
import { MatchScore } from "@/features/jobs/match-score";
import { applicationStatusLabels, formatDate, jobTypeLabels } from "@/lib/format";
import { useDebouncedValue } from "@/lib/use-debounced-value";

const CANDIDATES_PAGE_SIZE = 9;
const applicationStatuses = Object.keys(applicationStatusLabels) as ApplicationStatus[];

export default function HrCandidatesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [selectedApplication, setSelectedApplication] = useState<ApplicationWithCandidateProfile | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [searchParams, setSearchParams] = useSearchParams();
  const debouncedSearch = useDebouncedValue(search.trim(), 350);
  const queryClient = useQueryClient();
  const routedApplicationId = Number(searchParams.get("applicationId"));

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  const candidatesQuery = useQuery({
    queryKey: ["applications", "hr-candidates", debouncedSearch, statusFilter, page],
    queryFn: () =>
      applicationsApi.hrList({
        search: debouncedSearch || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
        limit: CANDIDATES_PAGE_SIZE,
        offset: (page - 1) * CANDIDATES_PAGE_SIZE,
      }),
    placeholderData: (previous) => previous,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: ApplicationStatus }) =>
      applicationsApi.updateStatus(id, status),
    onSuccess: (_, variables) => {
      toast.success("Application status updated");
      setSelectedApplication((current) =>
        current?.id === variables.id ? { ...current, status: variables.status } : current
      );
      queryClient.invalidateQueries({ queryKey: ["applications", "hr-candidates"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => toast.error(getApiError(error)),
  });

  const applications = candidatesQuery.data?.items ?? [];

  useEffect(() => {
    if (!Number.isInteger(routedApplicationId) || routedApplicationId <= 0) return;
    const match = applications.find((application) => application.id === routedApplicationId);
    if (match) setSelectedApplication(match);
  }, [applications, routedApplicationId]);

  function openApplication(application: ApplicationWithCandidateProfile) {
    setSelectedApplication(application);
    const next = new URLSearchParams(searchParams);
    next.set("applicationId", String(application.id));
    setSearchParams(next, { replace: true });
  }

  function closeApplicationDialog() {
    setSelectedApplication(null);
    const next = new URLSearchParams(searchParams);
    next.delete("applicationId");
    setSearchParams(next, { replace: true });
  }

  return (
    <>
      <PageHeader
        eyebrow="Candidate tracking"
        title="Candidates"
        description="Review applicants across your job posts and shortlist with profile-fit scores."
      />
      <section className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative max-w-xl flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                if (routedApplicationId) closeApplicationDialog();
              }}
              placeholder="Search candidate, email, or job"
              className="pl-9"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value as ApplicationStatus | "all");
              if (routedApplicationId) closeApplicationDialog();
            }}
          >
            <SelectTrigger className="w-full lg:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {applicationStatuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {applicationStatusLabels[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="grid grid-cols-2 rounded-md border bg-white p-1">
            <Button
              type="button"
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
              Grid
            </Button>
            <Button
              type="button"
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
              List
            </Button>
          </div>
        </div>

        {candidatesQuery.isLoading ? (
          <div className="grid auto-rows-fr gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-96 rounded-lg" />
            ))}
          </div>
        ) : applications.length ? (
          <>
            {viewMode === "grid" ? (
              <div className="grid auto-rows-fr gap-4 md:grid-cols-2 xl:grid-cols-3">
                {applications.map((application) => (
                  <CandidateApplicationCard
                    key={application.id}
                    application={application}
                    isUpdating={statusMutation.isPending}
                    onOpen={() => openApplication(application)}
                    onStatusChange={(status) => statusMutation.mutate({ id: application.id, status })}
                  />
                ))}
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Candidate</TableHead>
                      <TableHead>Job</TableHead>
                      <TableHead>Match</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Applied</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applications.map((application) => (
                      <CandidateApplicationRow
                        key={application.id}
                        application={application}
                        isUpdating={statusMutation.isPending}
                        onOpen={() => openApplication(application)}
                        onStatusChange={(status) => statusMutation.mutate({ id: application.id, status })}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {candidatesQuery.data ? (
              <PaginationControls
                limit={candidatesQuery.data.limit}
                offset={candidatesQuery.data.offset}
                total={candidatesQuery.data.total}
                onPageChange={setPage}
              />
            ) : null}
          </>
        ) : (
          <EmptyState
            icon={UsersRound}
            title="No candidates found"
            description="Candidates who apply to your job posts will appear here."
          />
        )}
      </section>
      <CandidateProfileDialog
        application={selectedApplication}
        open={Boolean(selectedApplication)}
        onOpenChange={(open) => !open && closeApplicationDialog()}
      />
    </>
  );
}

function CandidateApplicationCard({
  application,
  isUpdating,
  onOpen,
  onStatusChange,
}: {
  application: ApplicationWithCandidateProfile;
  isUpdating: boolean;
  onOpen: () => void;
  onStatusChange: (status: ApplicationStatus) => void;
}) {
  const profile = application.candidate_profile;

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      className="flex h-full min-h-[390px] cursor-pointer flex-col rounded-lg transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
    >
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="leading-snug">{application.candidate.full_name}</CardTitle>
            <p className="mt-1 break-all text-xs font-medium text-muted-foreground">{application.candidate.email}</p>
          </div>
          <ApplicationStatusBadge status={application.status} />
        </div>
        <MatchScore score={application.match_score} reason={application.match_reason} />
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div>
          <h3 className="line-clamp-1 font-bold text-slate-900">{application.job.title}</h3>
          <p className="mt-1 text-sm font-medium text-slate-600">
            {application.job.location} · {jobTypeLabels[application.job.job_type]}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-500">Applied {formatDate(application.created_at)}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Experience</div>
            <div className="mt-1 font-bold text-slate-900">{profile.experience_years} yrs</div>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Profile</div>
            <div className="mt-1 font-bold text-slate-900">{profile.profile_strength}%</div>
          </div>
        </div>
        <div className="mt-auto">
          <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Matched skills</div>
          <div className="flex min-h-8 flex-wrap gap-2">
            {(application.matched_skills.length ? application.matched_skills : profile.skills.slice(0, 3)).map((skill) => (
              <span key={skill} className="rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">
                {skill}
              </span>
            ))}
            {!application.matched_skills.length && !profile.skills.length ? (
              <span className="text-sm font-medium text-muted-foreground">No skills added</span>
            ) : null}
          </div>
        </div>
      </CardContent>
      <CardFooter className="grid gap-2 sm:grid-cols-[1fr_auto]" onClick={(event) => event.stopPropagation()}>
        <Select value={application.status} onValueChange={(value) => onStatusChange(value as ApplicationStatus)}>
          <SelectTrigger disabled={isUpdating}>
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
        <Button type="button" variant="outline" onClick={onOpen}>
          View profile
        </Button>
      </CardFooter>
    </Card>
  );
}

function CandidateApplicationRow({
  application,
  isUpdating,
  onOpen,
  onStatusChange,
}: {
  application: ApplicationWithCandidateProfile;
  isUpdating: boolean;
  onOpen: () => void;
  onStatusChange: (status: ApplicationStatus) => void;
}) {
  const profile = application.candidate_profile;

  return (
    <TableRow className="cursor-pointer" onClick={onOpen}>
      <TableCell>
        <div className="min-w-56">
          <div className="font-bold text-slate-900">{application.candidate.full_name}</div>
          <div className="mt-1 break-all text-xs font-medium text-muted-foreground">{application.candidate.email}</div>
          <div className="mt-2 flex gap-2 text-xs font-bold text-slate-500">
            <span>{profile.experience_years} yrs exp</span>
            <span>·</span>
            <span>{profile.profile_strength}% profile</span>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="min-w-56">
          <div className="font-bold text-slate-900">{application.job.title}</div>
          <div className="mt-1 text-sm font-medium text-muted-foreground">
            {application.job.location} · {jobTypeLabels[application.job.job_type]}
          </div>
        </div>
      </TableCell>
      <TableCell className="min-w-56">
        <MatchScore score={application.match_score} reason={application.match_reason} compact />
      </TableCell>
      <TableCell onClick={(event) => event.stopPropagation()}>
        <div className="flex min-w-40 flex-col gap-2">
          <ApplicationStatusBadge status={application.status} />
          <Select value={application.status} onValueChange={(value) => onStatusChange(value as ApplicationStatus)}>
            <SelectTrigger className="h-8" disabled={isUpdating}>
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
      <TableCell className="font-medium text-muted-foreground">{formatDate(application.created_at)}</TableCell>
      <TableCell onClick={(event) => event.stopPropagation()}>
        <div className="flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={onOpen}>
            View profile
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
