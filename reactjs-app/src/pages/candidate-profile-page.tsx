import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { candidateProfileApi, getApiError, jobsApi } from "@/api/client";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ProfileStrengthCard } from "@/features/profile/profile-strength-card";

const profileSchema = z
  .object({
    resume_url: z.string().url("Must be a valid URL").or(z.literal("")).optional(),
    skillsText: z.string(),
    work_experience: z.string(),
    salary_min: z.coerce.number().int().min(0).nullable(),
    salary_max: z.coerce.number().int().min(0).nullable(),
    experience_years: z.coerce.number().int().min(0).max(60),
    preferred_roles: z.array(z.string()),
  })
  .refine(
    (data) =>
      data.salary_min == null ||
      data.salary_max == null ||
      data.salary_max >= data.salary_min,
    { message: "Maximum salary must be ≥ minimum salary", path: ["salary_max"] }
  );

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function CandidateProfilePage() {
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ["candidate", "profile"],
    queryFn: candidateProfileApi.get,
  });

  const jobsQuery = useQuery({
    queryKey: ["jobs", "candidate", "profile-role-options"],
    queryFn: () => jobsApi.list({ limit: 100 }),
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      resume_url: "",
      skillsText: "",
      work_experience: "",
      salary_min: null,
      salary_max: null,
      experience_years: 0,
      preferred_roles: [],
    },
  });

  useEffect(() => {
    if (!profileQuery.data) return;
    reset({
      resume_url: profileQuery.data.resume_url ?? "",
      skillsText: profileQuery.data.skills.join(", "),
      work_experience: profileQuery.data.work_experience,
      salary_min: profileQuery.data.salary_min ?? null,
      salary_max: profileQuery.data.salary_max ?? null,
      experience_years: profileQuery.data.experience_years,
      preferred_roles: profileQuery.data.preferred_roles,
    });
  }, [profileQuery.data, reset]);

  const preferredRoles = watch("preferred_roles");
  const skillsText = watch("skillsText");

  const roleOptions = useMemo(() => {
    const fromJobs = jobsQuery.data?.items.map((job) => job.title) ?? [];
    return Array.from(new Set([...preferredRoles, ...fromJobs])).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [jobsQuery.data?.items, preferredRoles]);

  function togglePreferredRole(role: string) {
    const current = preferredRoles;
    setValue(
      "preferred_roles",
      current.includes(role) ? current.filter((r) => r !== role) : [...current, role],
      { shouldValidate: true }
    );
  }

  const updateMutation = useMutation({
    mutationFn: candidateProfileApi.update,
    onSuccess: async () => {
      toast.success("Profile updated");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["candidate"], refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: ["candidate", "job-matches"], refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: ["candidate", "recommendations"], refetchType: "all" }),
      ]);
    },
    onError: (error) => toast.error(getApiError(error)),
  });

  function onSubmit(values: ProfileFormValues) {
    const skills = values.skillsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    updateMutation.mutate({
      resume_url: values.resume_url || null,
      skills,
      work_experience: values.work_experience,
      salary_min: values.salary_min,
      salary_max: values.salary_max,
      experience_years: values.experience_years ?? 0,
      preferred_roles: values.preferred_roles,
    });
  }

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
          onSubmit={handleSubmit(onSubmit)}
        >
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Resume URL</label>
            <Input
              {...register("resume_url")}
              placeholder="https://example.com/resume.pdf"
            />
            {errors.resume_url && (
              <p className="text-xs text-destructive">{errors.resume_url.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Skills</label>
            <Input
              {...register("skillsText")}
              placeholder="React, Product Design, Python"
            />
            <p className="text-xs font-medium text-muted-foreground">Separate skills with commas.</p>
            {skillsText && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {skillsText
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700"
                    >
                      {skill}
                    </span>
                  ))}
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Minimum salary</label>
              <Input
                type="number"
                min={0}
                {...register("salary_min")}
                placeholder="1200000"
              />
              {errors.salary_min && (
                <p className="text-xs text-destructive">{errors.salary_min.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Maximum salary</label>
              <Input
                type="number"
                min={0}
                {...register("salary_max")}
                placeholder="2400000"
              />
              {errors.salary_max && (
                <p className="text-xs text-destructive">{errors.salary_max.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Total experience years</label>
              <Input
                type="number"
                min={0}
                max={60}
                {...register("experience_years")}
                placeholder="5"
              />
              {errors.experience_years && (
                <p className="text-xs text-destructive">{errors.experience_years.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Work experience</label>
            <Textarea
              {...register("work_experience")}
              placeholder="Describe your recent roles, tools, domains, and measurable impact."
              rows={9}
            />
          </div>

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
                  <label
                    key={role}
                    className="flex cursor-pointer items-center gap-3 rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm"
                  >
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
                <p className="text-sm font-medium text-muted-foreground">
                  No open job roles available yet.
                </p>
              )}
            </div>
          </div>

          <Button type="submit" disabled={isSubmitting || updateMutation.isPending}>
            Save profile
          </Button>
        </form>
        <ProfileStrengthCard profile={profileQuery.data} />
      </section>
    </>
  );
}
