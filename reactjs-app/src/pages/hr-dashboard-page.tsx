import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { dashboardApi, jobsApi } from "@/api/client";
import type { ApplicationStatus } from "@/api/types";
import { Skeleton } from "@/components/ui/skeleton";
import { ActivityFeedPanel } from "@/features/dashboard/activity-feed-panel";
import { CandidatePipelinePanel } from "@/features/dashboard/candidate-pipeline-panel";
import { DashboardHeader } from "@/features/dashboard/dashboard-header";
import { HiringVelocityPanel } from "@/features/dashboard/hiring-velocity-panel";
import { MetricGrid } from "@/features/dashboard/metric-grid";
import { RecentJobsPanel } from "@/features/dashboard/recent-jobs-panel";
import { TalentPoolCard } from "@/features/dashboard/talent-pool-card";

const statusColumns: Array<{
  key: string;
  label: string;
  statuses: ApplicationStatus[];
}> = [
  { key: "applied", label: "Applied", statuses: ["pending"] },
  { key: "interview", label: "Interview", statuses: ["reviewed"] },
  { key: "offer", label: "Offer", statuses: ["shortlisted"] },
];

export default function HrDashboardPage() {
  const dashboardQuery = useQuery({
    queryKey: ["dashboard", "hr"],
    queryFn: dashboardApi.hr,
  });
  const jobsQuery = useQuery({
    queryKey: ["jobs", "hr", "dashboard-recent"],
    queryFn: () => jobsApi.list({ limit: 5 }),
  });
  const stats = dashboardQuery.data;
  const recentApplications = stats?.recent_applications ?? [];
  const recentJobs = jobsQuery.data?.items ?? [];

  const groupedApplications = useMemo(() => {
    return statusColumns.map((column) => ({
      ...column,
      applications: recentApplications.filter((application) => column.statuses.includes(application.status)),
      count: column.statuses.reduce((sum, status) => sum + (stats?.applications_by_status[status] ?? 0), 0),
    }));
  }, [recentApplications, stats]);

  if (dashboardQuery.isLoading) {
    return (
      <section className="space-y-6 px-4 py-7 sm:px-6 lg:px-8">
        <Skeleton className="h-24 rounded-lg" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-36 rounded-lg" />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(340px,1fr)]">
          <Skeleton className="h-96 rounded-lg" />
          <Skeleton className="h-96 rounded-lg" />
        </div>
      </section>
    );
  }

  if (!stats) return null;

  const totalTalentPool = Math.max(stats.total_applications, recentApplications.length);

  return (
    <section className="space-y-6 px-4 py-7 sm:px-6 lg:px-8">
      <DashboardHeader />
      <MetricGrid stats={stats} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(340px,1fr)]">
        <div className="space-y-4">
          <CandidatePipelinePanel columns={groupedApplications} />
          <RecentJobsPanel jobs={recentJobs} />
        </div>

        <div className="space-y-4">
          <ActivityFeedPanel applications={recentApplications} />
          <TalentPoolCard totalTalentPool={totalTalentPool} />
          <HiringVelocityPanel velocity={stats.hiring_velocity} />
        </div>
      </div>
    </section>
  );
}
