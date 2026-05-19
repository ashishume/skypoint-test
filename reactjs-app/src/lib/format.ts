import type { ApplicationStatus, JobStatus, JobType } from "@/api/types";

export const jobTypeLabels: Record<JobType, string> = {
  full_time: "Full time",
  part_time: "Part time",
  contract: "Contract",
  internship: "Internship",
};

export const jobStatusLabels: Record<JobStatus, string> = {
  open: "Open",
  closed: "Closed",
};

export const applicationStatusLabels: Record<ApplicationStatus, string> = {
  pending: "Pending",
  reviewed: "Reviewed",
  shortlisted: "Shortlisted",
  rejected: "Rejected",
};

export function formatCurrencyRange(min: number | null, max: number | null) {
  const formatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });

  if (min && max) return `${formatter.format(min)} - ${formatter.format(max)}`;
  if (min) return `From ${formatter.format(min)}`;
  if (max) return `Up to ${formatter.format(max)}`;
  return "Salary not disclosed";
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function compactNumber(value: number) {
  return new Intl.NumberFormat("en-IN", { notation: "compact" }).format(value);
}
