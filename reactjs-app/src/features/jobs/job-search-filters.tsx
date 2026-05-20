import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { JobType } from "@/api/types";
import { jobTypeLabels } from "@/lib/format";

export interface SalaryRangeFilter {
  label: string;
  min?: number;
  max?: number;
}

export const salaryRangeFilters: Record<string, SalaryRangeFilter> = {
  any: { label: "Any salary" },
  "0-1000000": { label: "Up to ₹10L", max: 1_000_000 },
  "1000000-2000000": { label: "₹10L - ₹20L", min: 1_000_000, max: 2_000_000 },
  "2000000+": { label: "₹20L+", min: 2_000_000 },
};

interface JobSearchFiltersProps {
  keyword: string;
  location: string;
  skill: string;
  jobType: JobType | "all";
  salaryRange: string;
  onKeywordChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onSkillChange: (value: string) => void;
  onJobTypeChange: (value: JobType | "all") => void;
  onSalaryRangeChange: (value: string) => void;
}

const jobTypes = Object.keys(jobTypeLabels) as JobType[];

export function JobSearchFilters({
  keyword,
  location,
  skill,
  jobType,
  salaryRange,
  onKeywordChange,
  onLocationChange,
  onSkillChange,
  onJobTypeChange,
  onSalaryRangeChange,
}: JobSearchFiltersProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_180px_160px_180px_180px] xl:items-end">
        <label className="space-y-1 text-sm font-semibold text-slate-600">
          <span>Search role</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={keyword}
              onChange={(event) => onKeywordChange(event.target.value)}
              placeholder="Design, engineering, product..."
              className="pl-9"
            />
          </div>
        </label>
        <label className="space-y-1 text-sm font-semibold text-slate-600">
          <span>Location</span>
          <Input
            value={location}
            onChange={(event) => onLocationChange(event.target.value)}
            placeholder="Remote, London..."
          />
        </label>
        <label className="space-y-1 text-sm font-semibold text-slate-600">
          <span>Skill</span>
          <Input
            value={skill}
            onChange={(event) => onSkillChange(event.target.value)}
            placeholder="React, SQL..."
          />
        </label>
        <label className="space-y-1 text-sm font-semibold text-slate-600">
          <span>Job type</span>
          <Select value={jobType} onValueChange={(value) => onJobTypeChange(value as JobType | "all")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {jobTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {jobTypeLabels[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="space-y-1 text-sm font-semibold text-slate-600">
          <span>Salary range</span>
          <Select value={salaryRange} onValueChange={onSalaryRangeChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(salaryRangeFilters).map(([value, range]) => (
                <SelectItem key={value} value={value}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      </div>
    </div>
  );
}
