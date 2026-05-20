import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { BriefcaseBusiness } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import type { ApplicationWithJobAndCandidate, DashboardStats, Job } from "@/api/types";
import { ActivityFeedPanel } from "@/features/dashboard/activity-feed-panel";
import { AnimatedPanel } from "@/features/dashboard/animated-panel";
import { CandidatePipelinePanel } from "@/features/dashboard/candidate-pipeline-panel";
import { DashboardHeader } from "@/features/dashboard/dashboard-header";
import { DashboardMetricCard } from "@/features/dashboard/dashboard-metric-card";
import { HiringVelocityPanel } from "@/features/dashboard/hiring-velocity-panel";
import { MetricGrid } from "@/features/dashboard/metric-grid";
import { PipelineCard } from "@/features/dashboard/pipeline-card";
import { RecentJobsPanel } from "@/features/dashboard/recent-jobs-panel";
import { TalentPoolCard } from "@/features/dashboard/talent-pool-card";

vi.mock("@/app/auth-context", () => ({
  useAuth: () => ({ user: { full_name: "HR Admin" } }),
}));

const job: Job = {
  id: 11,
  title: "Frontend Engineer",
  description: "Build interfaces.",
  skills: ["react"],
  location: "Remote",
  job_type: "full_time",
  salary_min: 100000,
  salary_max: 200000,
  status: "open",
  created_by_id: 1,
  applications_count: 1,
  created_at: "2026-05-20T00:00:00Z",
  updated_at: "2026-05-20T00:00:00Z",
};

const application: ApplicationWithJobAndCandidate = {
  id: 7,
  job_id: job.id,
  candidate_id: 2,
  cover_letter: "I am a strong fit.",
  resume_url: "https://example.com/resume.pdf",
  status: "reviewed",
  created_at: "2026-05-20T00:00:00Z",
  updated_at: "2026-05-20T00:00:00Z",
  job,
  candidate: {
    id: 2,
    email: "candidate@test.com",
    full_name: "Test Candidate",
    role: "candidate",
  },
};

const stats: DashboardStats = {
  total_jobs: 4,
  jobs_by_status: { open: 3, closed: 1 },
  total_applications: 8,
  applications_by_status: { pending: 2, reviewed: 3, shortlisted: 1, rejected: 2 },
  recent_applications: [application],
  hiring_velocity: {
    window_days: 30,
    total_applications: 8,
    average_weekly_applications: 2,
    peak_week_label: "Week 2",
    buckets: [
      { label: "Week 1", start_date: "2026-04-21", end_date: "2026-04-27", applications: 1 },
      { label: "Week 2", start_date: "2026-04-28", end_date: "2026-05-04", applications: 4 },
      { label: "Week 3", start_date: "2026-05-05", end_date: "2026-05-11", applications: 2 },
      { label: "Week 4", start_date: "2026-05-12", end_date: "2026-05-20", applications: 1 },
    ],
  },
};

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("dashboard components", () => {
  it("renders dashboard header and metric links", () => {
    renderWithRouter(
      <>
        <DashboardHeader />
        <MetricGrid stats={stats} />
        <DashboardMetricCard
          title="Custom"
          value={9}
          detail="No trend"
          icon={BriefcaseBusiness}
          delay={0}
          href="/hr/jobs"
        />
      </>
    );

    expect(screen.getByRole("heading", { name: /Welcome, HR/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Active Jobs/i })).toHaveAttribute("href", "/hr/jobs?status=open");
    expect(screen.getByRole("link", { name: /Custom/i })).toHaveAttribute("href", "/hr/jobs");
  });

  it("renders pipeline, activity, jobs, talent, and velocity panels", () => {
    renderWithRouter(
      <>
        <AnimatedPanel delay={0}>Panel content</AnimatedPanel>
        <CandidatePipelinePanel
          columns={[
            { key: "applied", label: "Applied", statuses: ["pending"], applications: [], count: 0 },
            { key: "interview", label: "Interview", statuses: ["reviewed"], applications: [application], count: 1 },
            {
              key: "offer",
              label: "Offer",
              statuses: ["shortlisted"],
              applications: [{ ...application, id: 8, status: "shortlisted" }],
              count: 1,
            },
          ]}
        />
        <PipelineCard application={{ ...application, id: 9, status: "pending" }} />
        <ActivityFeedPanel applications={[application]} />
        <ActivityFeedPanel applications={[]} />
        <RecentJobsPanel jobs={[job, { ...job, id: 12, status: "closed", title: "Closed Role" }]} />
        <RecentJobsPanel jobs={[]} />
        <TalentPoolCard totalTalentPool={3} />
        <TalentPoolCard totalTalentPool={0} />
        <HiringVelocityPanel velocity={stats.hiring_velocity} />
      </>
    );

    expect(screen.getByText("Panel content")).toBeInTheDocument();
    expect(screen.getByText("Candidate Pipeline")).toBeInTheDocument();
    expect(screen.getAllByText("Test Candidate").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Reviewed").length).toBeGreaterThan(0);
    expect(screen.getByText(/Candidate activity will appear/i)).toBeInTheDocument();
    expect(screen.getAllByText("Recently Posted Jobs")).toHaveLength(2);
    expect(screen.getByText(/No job postings yet/i)).toBeInTheDocument();
    expect(screen.getAllByText("Talent Pool Growth")).toHaveLength(2);
    expect(screen.getByText("Hiring Velocity")).toBeInTheDocument();
  });
});
