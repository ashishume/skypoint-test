import type { ApplicationStatus, ApplicationWithCandidate, Page } from "@/api/types";
import { PaginationControls } from "@/components/common/pagination-controls";
import { ApplicationStatusBadge } from "@/components/common/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { applicationStatusLabels, formatDate } from "@/lib/format";

const applicationStatuses = Object.keys(applicationStatusLabels) as ApplicationStatus[];

interface ApplicantsTableProps {
  page?: Page<ApplicationWithCandidate>;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onStatusChange: (application: ApplicationWithCandidate, status: ApplicationStatus) => void;
}

export function ApplicantsTable({
  page,
  isLoading,
  onPageChange,
  onStatusChange,
}: ApplicantsTableProps) {
  if (isLoading) return <Skeleton className="h-72 rounded-lg" />;
  const applications = page?.items ?? [];

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Candidate</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Applied</TableHead>
            <TableHead>Resume</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {applications.map((application) => (
            <TableRow key={application.id}>
              <TableCell>
                <div className="font-medium">{application.candidate.full_name}</div>
                <div className="text-xs text-muted-foreground">{application.candidate.email}</div>
              </TableCell>
              <TableCell>
                <div className="flex min-w-40 flex-col gap-2">
                  <ApplicationStatusBadge status={application.status} />
                  <Select
                    value={application.status}
                    onValueChange={(value) => onStatusChange(application, value as ApplicationStatus)}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {applicationStatuses.map((status) => (
                        <SelectItem key={status} value={status}>
                          {applicationStatusLabels[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{formatDate(application.created_at)}</TableCell>
              <TableCell>
                {application.resume_url ? (
                  <a
                    href={application.resume_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Open
                  </a>
                ) : (
                  <span className="text-sm text-muted-foreground">Not provided</span>
                )}
              </TableCell>
            </TableRow>
          ))}
          {!applications.length ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                No applications for this role yet.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
      {page ? (
        <PaginationControls
          limit={page.limit}
          offset={page.offset}
          total={page.total}
          onPageChange={onPageChange}
        />
      ) : null}
    </div>
  );
}
