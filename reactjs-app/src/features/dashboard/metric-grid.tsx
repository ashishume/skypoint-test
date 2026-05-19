import { BadgeCheck, BriefcaseBusiness, CalendarDays, UserPlus } from "lucide-react";
import type { DashboardStats } from "@/api/types";
import { compactNumber } from "@/lib/format";
import { DashboardMetricCard } from "@/features/dashboard/dashboard-metric-card";

interface MetricGridProps {
  stats: DashboardStats;
}

export function MetricGrid({ stats }: MetricGridProps) {
  const scheduled = stats.applications_by_status.reviewed + stats.applications_by_status.shortlisted;
  const hireTarget = Math.max(10, stats.applications_by_status.shortlisted + 2);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <DashboardMetricCard
        delay={0.05}
        title="Active Jobs"
        value={compactNumber(stats.jobs_by_status.open)}
        detail={`${stats.jobs_by_status.closed} closed roles`}
        trend="+3 this week"
        icon={BriefcaseBusiness}
        href="/hr/jobs?status=open"
      />
      <DashboardMetricCard
        delay={0.1}
        title="New Apps"
        value={compactNumber(stats.total_applications)}
        detail={`${stats.applications_by_status.pending} pending review`}
        trend="12% vs last month"
        icon={UserPlus}
        href="/hr/jobs?applicationStatus=pending"
      />
      <DashboardMetricCard
        delay={0.15}
        title="Scheduled"
        value={scheduled}
        detail={`${stats.applications_by_status.reviewed} reviewed`}
        icon={CalendarDays}
        href="/hr/jobs?applicationStatus=reviewed"
      />
      <DashboardMetricCard
        delay={0.2}
        title="Hires (Mo)"
        value={stats.applications_by_status.shortlisted}
        detail={`Target: ${hireTarget}`}
        icon={BadgeCheck}
        accent
        href="/hr/jobs?applicationStatus=shortlisted"
      />
    </div>
  );
}
