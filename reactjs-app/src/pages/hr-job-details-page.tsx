import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArchiveX, ArrowLeft, BriefcaseBusiness, IndianRupee, MapPin, Search, Send, UsersRound } from "lucide-react";
import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { applicationsApi, getApiError, jobsApi, messagesApi } from "@/api/client";
import type { ApplicationStatus, ApplicationWithCandidateProfile, PotentialCandidate } from "@/api/types";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { PaginationControls } from "@/components/common/pagination-controls";
import { JobStatusBadge } from "@/components/common/status-badge";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ApplicantsTable } from "@/features/jobs/applicants-table";
import { CandidateProfileDialog } from "@/features/candidates/candidate-profile-dialog";
import { MatchScore } from "@/features/jobs/match-score";
import { applicationStatusLabels, formatCurrencyRange, formatDate, jobTypeLabels } from "@/lib/format";
import { useDebouncedValue } from "@/lib/use-debounced-value";

const APPLICANTS_PAGE_SIZE = 8;
const POTENTIAL_CANDIDATES_PAGE_SIZE = 6;
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
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<ApplicationWithCandidateProfile | null>(null);
  const [candidateSearch, setCandidateSearch] = useState("");
  const [potentialCandidatesPage, setPotentialCandidatesPage] = useState(1);
  const debouncedCandidateSearch = useDebouncedValue(candidateSearch.trim(), 350);
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

  const potentialCandidatesQuery = useQuery({
    queryKey: ["jobs", validJobId, "potential-candidates", debouncedCandidateSearch, potentialCandidatesPage],
    queryFn: () =>
      jobsApi.potentialCandidates(validJobId!, {
        search: debouncedCandidateSearch || undefined,
        limit: POTENTIAL_CANDIDATES_PAGE_SIZE,
        offset: (potentialCandidatesPage - 1) * POTENTIAL_CANDIDATES_PAGE_SIZE,
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
  const closeMutation = useMutation({
    mutationFn: () => jobsApi.update(validJobId!, { status: "closed" }),
    onSuccess: () => {
      toast.success("Job closed");
      setIsCloseDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["jobs", validJobId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
    onError: (error) => toast.error(getApiError(error)),
  });

  const inviteMutation = useMutation({
    mutationFn: ({ candidateId, body }: { candidateId: number; body: string }) =>
      messagesApi.sendToCandidate({
        candidate_id: candidateId,
        job_id: validJobId!,
        body,
      }),
    onSuccess: () => {
      toast.success("Candidate contacted");
      queryClient.invalidateQueries({ queryKey: ["messages", "hr"] });
    },
    onError: (error) => toast.error(getApiError(error)),
  });

  function setApplicantsPage(page: number) {
    const next = new URLSearchParams(searchParams);
    if (page > 1) next.set("page", String(page));
    else next.delete("page");
    setSearchParams(next, { replace: true });
  }

  function updateCandidateSearch(value: string) {
    setCandidateSearch(value);
    setPotentialCandidatesPage(1);
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
          <div className="flex flex-wrap gap-2">
            {job.status === "open" ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCloseDialogOpen(true)}
                disabled={closeMutation.isPending}
              >
                <ArchiveX className="h-4 w-4" />
                Close job
              </Button>
            ) : null}
            <Button asChild variant="outline">
              <Link to="/hr/jobs">
                <ArrowLeft className="h-4 w-4" />
                Back to jobs
              </Link>
            </Button>
          </div>
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

        <section className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <div className="border-b px-6 py-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">Potential candidates</h2>
                <p className="mt-1 text-sm font-medium text-muted-foreground">
                  Ranked candidate profiles for this role. Search by candidate, skill, preferred role, or experience.
                </p>
              </div>
              <div className="relative w-full lg:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={candidateSearch}
                  onChange={(event) => updateCandidateSearch(event.target.value)}
                  placeholder="Search more candidates"
                  className="pl-9"
                />
              </div>
            </div>
          </div>
          <div className="space-y-4 p-6">
            {potentialCandidatesQuery.isLoading ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-72 rounded-lg" />
                ))}
              </div>
            ) : potentialCandidatesQuery.data?.items.length ? (
              <>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {potentialCandidatesQuery.data.items.map((candidate) => (
                    <PotentialCandidateCard
                      key={candidate.candidate.id}
                      candidate={candidate}
                      jobTitle={job.title}
                      isSending={inviteMutation.isPending}
                      onInvite={(body) =>
                        inviteMutation.mutate({ candidateId: candidate.candidate.id, body })
                      }
                    />
                  ))}
                </div>
                <PaginationControls
                  limit={potentialCandidatesQuery.data.limit}
                  offset={potentialCandidatesQuery.data.offset}
                  total={potentialCandidatesQuery.data.total}
                  onPageChange={setPotentialCandidatesPage}
                />
              </>
            ) : (
              <EmptyState
                icon={UsersRound}
                title="No matching candidates"
                description="Try searching by another skill, role, location, or experience keyword."
              />
            )}
          </div>
        </section>

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
              onViewCandidate={setSelectedApplication}
              onStatusChange={(application, status) =>
                statusMutation.mutate({ id: application.id, status })
              }
            />
          </CardContent>
        </Card>
      </section>
      <AlertDialog
        open={isCloseDialogOpen}
        title={`Close "${job.title}"?`}
        description="This job will stop accepting applications and will no longer appear in candidate search, recommendations, or active application lists."
        confirmLabel="Close job"
        onConfirm={() => closeMutation.mutate()}
        onCancel={() => setIsCloseDialogOpen(false)}
      />
      <CandidateProfileDialog
        application={selectedApplication}
        open={Boolean(selectedApplication)}
        onOpenChange={(open) => !open && setSelectedApplication(null)}
      />
    </>
  );
}

function PotentialCandidateCard({
  candidate,
  jobTitle,
  isSending,
  onInvite,
}: {
  candidate: PotentialCandidate;
  jobTitle: string;
  isSending: boolean;
  onInvite: (body: string) => void;
}) {
  const profile = candidate.candidate_profile;
  const visibleSkills = candidate.matched_skills.length ? candidate.matched_skills : profile.skills.slice(0, 4);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [messageBody, setMessageBody] = useState(
    `Hi ${candidate.candidate.full_name}, your profile looks like a strong match for ${jobTitle}. Would you be open to discussing this role?`
  );

  function sendInvite() {
    const body = messageBody.trim();
    if (!body) return;
    onInvite(body);
    setIsContactOpen(false);
  }

  return (
    <article className="flex min-h-[320px] flex-col rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="line-clamp-1 font-bold text-slate-900">{candidate.candidate.full_name}</h3>
          <p className="mt-1 break-all text-xs font-medium text-muted-foreground">{candidate.candidate.email}</p>
        </div>
        {candidate.has_applied ? (
          <span className="shrink-0 rounded-md bg-green-50 px-2 py-1 text-xs font-bold text-green-700">
            Applied
          </span>
        ) : (
          <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
            Profile
          </span>
        )}
      </div>

      <div className="mt-4">
        <MatchScore score={candidate.match_score} reason={candidate.match_reason} compact />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-md bg-slate-50 p-3">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Experience</div>
          <div className="mt-1 font-bold text-slate-900">{profile.experience_years} yrs</div>
        </div>
        <div className="rounded-md bg-slate-50 p-3">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Expected</div>
          <div className="mt-1 text-sm font-bold text-slate-900">
            {formatCurrencyRange(profile.salary_min, profile.salary_max)}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Relevant skills</div>
        <div className="flex min-h-8 flex-wrap gap-2">
          {visibleSkills.map((skill) => (
            <span key={skill} className="rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">
              {skill}
            </span>
          ))}
          {!visibleSkills.length ? (
            <span className="text-sm font-medium text-muted-foreground">No skills added</span>
          ) : null}
        </div>
      </div>

      {profile.preferred_roles.length ? (
        <p className="mt-3 line-clamp-2 text-sm font-medium text-slate-600">
          Interested in {profile.preferred_roles.slice(0, 2).join(", ")}
        </p>
      ) : null}

      <div className="mt-auto flex flex-wrap gap-2 pt-4">
        <Button type="button" size="sm" onClick={() => setIsContactOpen(true)}>
          <Send className="h-4 w-4" />
          Contact
        </Button>
        {profile.resume_url ? (
          <Button asChild variant="outline" size="sm">
            <a href={profile.resume_url} target="_blank" rel="noreferrer">
              View resume
            </a>
          </Button>
        ) : null}
        {candidate.application_id ? (
          <Button asChild size="sm">
            <Link to={`/hr/candidates?applicationId=${candidate.application_id}`}>
              View application
            </Link>
          </Button>
        ) : null}
      </div>
      <Dialog open={isContactOpen} onOpenChange={setIsContactOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact {candidate.candidate.full_name}</DialogTitle>
            <DialogDescription>
              Send an outreach message about {jobTitle}. The candidate will see it in their Messages tab.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={messageBody}
            onChange={(event) => setMessageBody(event.target.value)}
            placeholder="Write a message to this candidate"
            className="min-h-36 resize-none"
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsContactOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={sendInvite} disabled={isSending || !messageBody.trim()}>
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
}
