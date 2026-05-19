import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { candidateProfileApi, getApiError, jobsApi } from "@/api/client";
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
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [experienceYears, setExperienceYears] = useState("0");
  const [preferredRoles, setPreferredRoles] = useState<string[]>([]);
  const jobsQuery = useQuery({
    queryKey: ["jobs", "candidate", "profile-role-options"],
    queryFn: () => jobsApi.list({ limit: 100 }),
  });

  useEffect(() => {
    if (!profileQuery.data) return;
    setResumeUrl(profileQuery.data.resume_url ?? "");
    setSkillsText(profileQuery.data.skills.join(", "));
    setWorkExperience(profileQuery.data.work_experience);
    setSalaryMin(profileQuery.data.salary_min?.toString() ?? "");
    setSalaryMax(profileQuery.data.salary_max?.toString() ?? "");
    setExperienceYears(profileQuery.data.experience_years.toString());
    setPreferredRoles(profileQuery.data.preferred_roles);
  }, [profileQuery.data]);

  const skills = useMemo(
    () => skillsText.split(",").map((skill) => skill.trim()).filter(Boolean),
    [skillsText]
  );
  const roleOptions = useMemo(() => {
    const fromJobs = jobsQuery.data?.items.map((job) => job.title) ?? [];
    return Array.from(new Set([...preferredRoles, ...fromJobs])).sort((a, b) => a.localeCompare(b));
  }, [jobsQuery.data?.items, preferredRoles]);

  function togglePreferredRole(role: string) {
    setPreferredRoles((current) =>
      current.includes(role) ? current.filter((item) => item !== role) : [...current, role]
    );
  }

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
        description="Add your resume, skills, work experience, salary range, and preferred roles so recommendations match your goals."
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
              salary_min: salaryMin ? Number(salaryMin) : null,
              salary_max: salaryMax ? Number(salaryMax) : null,
              experience_years: Number(experienceYears) || 0,
              preferred_roles: preferredRoles,
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
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="space-y-2 text-sm font-semibold text-slate-700">
              <span>Minimum salary</span>
              <Input
                type="number"
                min={0}
                value={salaryMin}
                onChange={(event) => setSalaryMin(event.target.value)}
                placeholder="1200000"
              />
            </label>
            <label className="space-y-2 text-sm font-semibold text-slate-700">
              <span>Maximum salary</span>
              <Input
                type="number"
                min={0}
                value={salaryMax}
                onChange={(event) => setSalaryMax(event.target.value)}
                placeholder="2400000"
              />
            </label>
            <label className="space-y-2 text-sm font-semibold text-slate-700">
              <span>Total experience years</span>
              <Input
                type="number"
                min={0}
                max={60}
                value={experienceYears}
                onChange={(event) => setExperienceYears(event.target.value)}
                placeholder="5"
              />
            </label>
          </div>
          <label className="space-y-2 text-sm font-semibold text-slate-700">
            <span>Work experience</span>
            <Textarea
              value={workExperience}
              onChange={(event) => setWorkExperience(event.target.value)}
              placeholder="Describe your recent roles, tools, domains, and measurable impact."
              rows={9}
            />
          </label>
          <div className="space-y-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-700">Preferred roles</h2>
              <p className="text-xs font-medium text-muted-foreground">
                Choose from currently posted roles. These improve recommendation ranking.
              </p>
            </div>
            <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border bg-slate-50 p-3">
              {roleOptions.length ? (
                roleOptions.map((role) => (
                  <label key={role} className="flex cursor-pointer items-center gap-3 rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                    <input
                      type="checkbox"
                      checked={preferredRoles.includes(role)}
                      onChange={() => togglePreferredRole(role)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-700"
                    />
                    <span>{role}</span>
                  </label>
                ))
              ) : (
                <p className="text-sm font-medium text-muted-foreground">No open job roles available yet.</p>
              )}
            </div>
          </div>
          <Button type="submit" disabled={updateMutation.isPending}>
            Save profile
          </Button>
        </form>
        <ProfileStrengthCard profile={profileQuery.data} />
      </section>
    </>
  );
}
