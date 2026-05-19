import { useQuery } from "@tanstack/react-query";
import { BriefcaseBusiness, ClipboardCheck, Clock, UsersRound } from "lucide-react";
import { dashboardApi } from "@/api/client";
import { ApplicationStatusBadge } from "@/components/common/status-badge";
import { MetricCard } from "@/components/common/metric-card";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { applicationStatusLabels, compactNumber, formatDate } from "@/lib/format";

export default function HrDashboardPage() {
  const dashboardQuery = useQuery({
    queryKey: ["dashboard", "hr"],
    queryFn: dashboardApi.hr,
  });
  const stats = dashboardQuery.data;

  return (
    <>
      <PageHeader
        eyebrow="HR workspace"
        title="Hiring command center"
        description="Track role coverage, applicant volume, and recent candidate movement from one place."
      />
      <section className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {dashboardQuery.isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-36 rounded-lg" />
            ))}
          </div>
        ) : stats ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                icon={BriefcaseBusiness}
                title="Total jobs"
                value={compactNumber(stats.total_jobs)}
                detail={`${stats.jobs_by_status.open} open roles`}
              />
              <MetricCard
                icon={ClipboardCheck}
                title="Applications"
                value={compactNumber(stats.total_applications)}
                detail={`${stats.applications_by_status.shortlisted} shortlisted`}
              />
              <MetricCard
                icon={Clock}
                title="Pending review"
                value={stats.applications_by_status.pending}
                detail="Needs HR attention"
              />
              <MetricCard
                icon={UsersRound}
                title="Reviewed"
                value={stats.applications_by_status.reviewed}
                detail="Moved past first pass"
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
              <Card className="rounded-lg">
                <CardHeader>
                  <CardTitle>Status mix</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(stats.applications_by_status).map(([status, count]) => (
                    <div key={status} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>{applicationStatusLabels[status as keyof typeof applicationStatusLabels]}</span>
                        <span className="font-semibold">{count}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{
                            width: `${stats.total_applications ? (count / stats.total_applications) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="rounded-lg">
                <CardHeader>
                  <CardTitle>Recent applications</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Applied</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.recent_applications.map((application) => (
                        <TableRow key={application.id}>
                          <TableCell className="font-medium">{application.job.title}</TableCell>
                          <TableCell>
                            <ApplicationStatusBadge status={application.status} />
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(application.created_at)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {!stats.recent_applications.length ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground">
                            No recent applications.
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </>
        ) : null}
      </section>
    </>
  );
}
