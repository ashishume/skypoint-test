import { Link } from "react-router-dom";
import { CheckCircle2, Circle } from "lucide-react";
import type { CandidateProfile } from "@/api/types";
import { Button } from "@/components/ui/button";

interface ProfileStrengthCardProps {
  profile?: CandidateProfile;
}

export function ProfileStrengthCard({ profile }: ProfileStrengthCardProps) {
  const hasResume = Boolean(profile?.resume_url);
  const hasSkills = Boolean(profile?.skills.length);
  const hasExperience = Boolean(profile?.work_experience.trim());
  const hasSalary = Boolean(profile?.salary_min || profile?.salary_max);
  const hasPreferences = Boolean(profile?.experience_years || profile?.preferred_roles.length);
  const strength = profile?.profile_strength ?? 0;

  return (
    <section className="self-start rounded-lg bg-[#1e293b] p-5 text-white shadow-md xl:sticky xl:top-24">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-bold">Profile Strength</h2>
        <span className="text-xl font-bold">{strength}%</span>
      </div>
      <div className="mb-6 h-2 overflow-hidden rounded-full bg-slate-700">
        <div className="h-full rounded-full bg-blue-200 transition-all" style={{ width: `${strength}%` }} />
      </div>
      <p className="mb-6 text-sm leading-6 text-slate-300">
        Complete your profile to improve job recommendations and help recruiters understand your fit.
      </p>
      <div className="mb-6 space-y-3 text-sm font-semibold">
        <ChecklistItem complete={hasResume} label="Upload resume" />
        <ChecklistItem complete={hasSkills} label="Add skills" />
        <ChecklistItem complete={hasExperience} label="Add work experience" />
        <ChecklistItem complete={hasSalary} label="Add salary range" />
        <ChecklistItem complete={hasPreferences} label="Add role preferences" />
      </div>
      <Button asChild className="w-full rounded-md bg-white text-[#091426] hover:bg-slate-100">
        <Link to="/candidate/profile">{strength >= 100 ? "Update Profile" : "Complete Profile"}</Link>
      </Button>
    </section>
  );
}

function ChecklistItem({ complete, label }: { complete: boolean; label: string }) {
  const Icon = complete ? CheckCircle2 : Circle;
  return (
    <div className="flex items-center gap-3">
      <Icon className={complete ? "h-4 w-4 text-green-400" : "h-4 w-4 text-slate-500"} />
      <span>{label}</span>
    </div>
  );
}
