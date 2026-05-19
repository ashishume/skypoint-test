import { Badge, type BadgeProps } from "@/components/ui/badge";
import type { ApplicationStatus, JobStatus } from "@/api/types";
import { applicationStatusLabels, jobStatusLabels } from "@/lib/format";

const applicationVariant: Record<ApplicationStatus, BadgeProps["variant"]> = {
  pending: "warning",
  reviewed: "info",
  shortlisted: "success",
  rejected: "destructive",
};

const jobVariant: Record<JobStatus, BadgeProps["variant"]> = {
  open: "success",
  closed: "muted",
};

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  return <Badge variant={applicationVariant[status]}>{applicationStatusLabels[status]}</Badge>;
}

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return <Badge variant={jobVariant[status]}>{jobStatusLabels[status]}</Badge>;
}
