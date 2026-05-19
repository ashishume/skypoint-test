import { useMutation } from "@tanstack/react-query";
import { Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { getApiError, messagesApi } from "@/api/client";
import type { ApplicationWithCandidateProfile } from "@/api/types";
import { ApplicationStatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { MatchScore } from "@/features/jobs/match-score";
import { formatCurrencyRange, formatDate, jobTypeLabels } from "@/lib/format";

interface CandidateProfileDialogProps {
  application: ApplicationWithCandidateProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CandidateProfileDialog({
  application,
  open,
  onOpenChange,
}: CandidateProfileDialogProps) {
  const [contactOpen, setContactOpen] = useState(false);
  const [messageBody, setMessageBody] = useState("");
  const contactMutation = useMutation({
    mutationFn: (payload: { candidate_id: number; job_id: number; body: string }) =>
      messagesApi.sendToCandidate(payload),
    onSuccess: () => {
      toast.success("Message sent to candidate");
      setMessageBody("");
      setContactOpen(false);
    },
    onError: (error) => toast.error(getApiError(error)),
  });

  if (!application) return null;
  const selectedApplication = application;
  const profile = selectedApplication.candidate_profile;

  function sendMessage() {
    const body = messageBody.trim();
    if (!body) {
      toast.error("Write a message before sending.");
      return;
    }
    contactMutation.mutate({
      candidate_id: selectedApplication.candidate.id,
      job_id: selectedApplication.job.id,
      body,
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setContactOpen(false);
          setMessageBody("");
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{selectedApplication.candidate.full_name}</DialogTitle>
          <DialogDescription>
            Applied for {selectedApplication.job.title} on {formatDate(selectedApplication.created_at)}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
          <div className="space-y-5">
            <section className="rounded-lg border bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-900">{selectedApplication.job.title}</h3>
                  <p className="mt-1 text-sm font-medium text-slate-600">
                    {selectedApplication.job.location} · {jobTypeLabels[selectedApplication.job.job_type]} ·{" "}
                    {formatCurrencyRange(selectedApplication.job.salary_min, selectedApplication.job.salary_max)}
                  </p>
                </div>
                <ApplicationStatusBadge status={selectedApplication.status} />
              </div>
              <div className="mt-4">
                <MatchScore score={selectedApplication.match_score} reason={selectedApplication.match_reason} />
              </div>
            </section>

            <section className="rounded-lg border bg-white p-4">
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Profile</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <ProfileStat label="Experience" value={`${profile.experience_years} yrs`} />
                <ProfileStat label="Profile strength" value={`${profile.profile_strength}%`} />
                <ProfileStat
                  label="Expected salary"
                  value={formatCurrencyRange(profile.salary_min, profile.salary_max)}
                />
              </div>
              {profile.skills.length ? (
                <div className="mt-5">
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((skill) => (
                      <span key={skill} className="rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              {profile.preferred_roles.length ? (
                <div className="mt-5">
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Preferred roles</h4>
                  <div className="flex flex-wrap gap-2">
                    {profile.preferred_roles.map((role) => (
                      <span key={role} className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="mt-5">
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Work experience</h4>
                <p className="max-h-44 overflow-auto whitespace-pre-line rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                  {profile.work_experience || "No work experience added yet."}
                </p>
              </div>
            </section>
          </div>

          <aside className="space-y-4">
            <div className="rounded-lg border bg-slate-50 p-4">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-[#091426] text-lg font-bold text-white">
                {initialsOf(selectedApplication.candidate.full_name)}
              </div>
              <h3 className="mt-4 font-bold text-slate-900">{selectedApplication.candidate.full_name}</h3>
              <p className="break-all text-sm font-medium text-slate-600">{selectedApplication.candidate.email}</p>
              {selectedApplication.resume_url || profile.resume_url ? (
                <Button asChild className="mt-4 w-full" variant="outline">
                  <a href={selectedApplication.resume_url || profile.resume_url || undefined} target="_blank" rel="noreferrer">
                    View resume
                  </a>
                </Button>
              ) : null}
              <Button type="button" className="mt-3 w-full" onClick={() => setContactOpen(true)}>
                <Mail className="h-4 w-4" />
                Contact candidate
              </Button>
            </div>
            <div className="rounded-lg border bg-white p-4">
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Cover letter</h3>
              <p className="mt-3 max-h-56 overflow-auto whitespace-pre-line text-sm leading-6 text-slate-700">
                {selectedApplication.cover_letter}
              </p>
            </div>
          </aside>
        </div>
      </DialogContent>
      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Contact {selectedApplication.candidate.full_name}</DialogTitle>
            <DialogDescription>
              Send a message about {selectedApplication.job.title}. The candidate will see this in their Messages tab.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={messageBody}
            onChange={(event) => setMessageBody(event.target.value)}
            placeholder="Write your message"
            className="min-h-40 resize-none"
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setContactOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={sendMessage}
              disabled={contactMutation.isPending || !messageBody.trim()}
            >
              Send message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

function ProfileStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 font-bold text-slate-900">{value}</div>
    </div>
  );
}

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
