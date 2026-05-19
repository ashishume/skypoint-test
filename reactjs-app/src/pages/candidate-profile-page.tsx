import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { candidateProfileApi, getApiError } from "@/api/client";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ProfileStrengthCard } from "@/features/profile/profile-strength-card";

export default function CandidateProfilePage() {
  const queryClient = useQueryClient();
  const profileQuery = useQuery({
    queryKey: ["candidate", "profile"],
    queryFn: candidateProfileApi.get,
  });
  const [resumeUrl, setResumeUrl] = useState("");
  const [skillsText, setSkillsText] = useState("");
  const [workExperience, setWorkExperience] = useState("");

  useEffect(() => {
    if (!profileQuery.data) return;
    setResumeUrl(profileQuery.data.resume_url ?? "");
    setSkillsText(profileQuery.data.skills.join(", "));
    setWorkExperience(profileQuery.data.work_experience);
  }, [profileQuery.data]);

  const skills = useMemo(
    () => skillsText.split(",").map((skill) => skill.trim()).filter(Boolean),
    [skillsText]
  );

  const updateMutation = useMutation({
    mutationFn: candidateProfileApi.update,
    onSuccess: () => {
      toast.success("Profile updated");
      queryClient.invalidateQueries({ queryKey: ["candidate"] });
    },
    onError: (error) => toast.error(getApiError(error)),
  });

  if (profileQuery.isLoading) {
    return (
      <section className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <Skeleton className="h-28 rounded-lg" />
        <Skeleton className="h-96 rounded-lg" />
      </section>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Candidate profile"
        title="Complete your profile"
        description="Add your resume, skills, and work experience so recommendations match your background."
      />
      <section className="grid gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
        <form
          className="space-y-5 rounded-lg border bg-white p-5 shadow-sm"
          onSubmit={(event) => {
            event.preventDefault();
            updateMutation.mutate({
              resume_url: resumeUrl || null,
              skills,
              work_experience: workExperience,
            });
          }}
        >
          <label className="space-y-2 text-sm font-semibold text-slate-700">
            <span>Resume URL</span>
            <Input
              value={resumeUrl}
              onChange={(event) => setResumeUrl(event.target.value)}
              placeholder="https://example.com/resume.pdf"
            />
          </label>
          <label className="space-y-2 text-sm font-semibold text-slate-700">
            <span>Skills</span>
            <Input
              value={skillsText}
              onChange={(event) => setSkillsText(event.target.value)}
              placeholder="React, Product Design, Python"
            />
            <p className="text-xs font-medium text-muted-foreground">Separate skills with commas.</p>
          </label>
          <label className="space-y-2 text-sm font-semibold text-slate-700">
            <span>Work experience</span>
            <Textarea
              value={workExperience}
              onChange={(event) => setWorkExperience(event.target.value)}
              placeholder="Describe your recent roles, tools, domains, and measurable impact."
              rows={9}
            />
          </label>
          <Button type="submit" disabled={updateMutation.isPending}>
            Save profile
          </Button>
        </form>
        <ProfileStrengthCard profile={profileQuery.data} />
      </section>
    </>
  );
}
