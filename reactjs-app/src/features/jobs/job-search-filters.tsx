import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  salaryRange: string;
  onKeywordChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onSalaryRangeChange: (value: string) => void;
}

export function JobSearchFilters({
  keyword,
  location,
  salaryRange,
  onKeywordChange,
  onLocationChange,
  onSalaryRangeChange,
}: JobSearchFiltersProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_220px] lg:items-end">
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
