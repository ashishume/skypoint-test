import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { ApplicationStatus, ApplicationWithCandidateProfile, CandidateProfile, Job } from "@/api/types";
import { PaginationControls } from "@/components/common/pagination-controls";
import { CandidateProfileDialog } from "@/features/candidates/candidate-profile-dialog";
import { ApplicantsTable } from "@/features/jobs/applicants-table";
import { JobSearchFilters, salaryRangeFilters } from "@/features/jobs/job-search-filters";
import { MatchScore, matchScoreTone } from "@/features/jobs/match-score";
import { ProfileStrengthCard } from "@/features/profile/profile-strength-card";

const mocks = vi.hoisted(() => ({
  sendToCandidate: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@/api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/client")>();
  return {
    ...actual,
    getApiError: (error: unknown) => (error instanceof Error ? error.message : "Something went wrong."),
    messagesApi: {
      ...actual.messagesApi,
      sendToCandidate: mocks.sendToCandidate,
    },
  };
});

vi.mock("sonner", () => ({
  toast: {
    error: mocks.toastError,
    success: mocks.toastSuccess,
  },
}));

const job: Job = {
  id: 4,
  title: "React Engineer",
  description: "Build product UI.",
  skills: ["react", "typescript"],
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

const profile: CandidateProfile = {
  id: 2,
  candidate_id: 3,
  resume_url: "https://example.com/profile.pdf",
  skills: ["react", "typescript"],
  work_experience: "Built React apps.",
  salary_min: 120000,
  salary_max: 180000,
  experience_years: 4,
  preferred_roles: ["frontend engineer"],
  profile_strength: 100,
  created_at: "2026-05-20T00:00:00Z",
  updated_at: "2026-05-20T00:00:00Z",
};

const application: ApplicationWithCandidateProfile = {
  id: 9,
  job_id: job.id,
  candidate_id: 3,
  cover_letter: "I have built similar React workflows.",
  resume_url: "https://example.com/resume.pdf",
  status: "pending",
  created_at: "2026-05-20T00:00:00Z",
  updated_at: "2026-05-20T00:00:00Z",
  job,
  candidate: {
    id: 3,
    email: "candidate@test.com",
    full_name: "Test Candidate",
    role: "candidate",
  },
  candidate_profile: profile,
  match_score: 92,
  matched_skills: ["react"],
  match_reason: "Strong skill overlap",
};

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe("jobs and profile components", () => {
  it("renders pagination controls and fires page changes", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    const { rerender } = render(<PaginationControls limit={10} offset={10} total={25} onPageChange={onPageChange} />);

    await user.click(screen.getByRole("button", { name: /Previous/i }));
    await user.click(screen.getByRole("button", { name: /Next/i }));

    expect(onPageChange).toHaveBeenNthCalledWith(1, 1);
    expect(onPageChange).toHaveBeenNthCalledWith(2, 3);

    rerender(<PaginationControls limit={10} offset={0} total={5} onPageChange={onPageChange} />);
    expect(screen.queryByText(/Showing/i)).not.toBeInTheDocument();
  });

  it("renders applicants table states and callbacks", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    const onStatusChange = vi.fn();
    const onViewCandidate = vi.fn();
    const { rerender } = renderWithProviders(
      <ApplicantsTable
        page={{ items: [application], total: 12, limit: 10, offset: 0 }}
        isLoading={false}
        onPageChange={onPageChange}
        onStatusChange={onStatusChange}
        onViewCandidate={onViewCandidate}
      />
    );

    await user.click(screen.getByRole("button", { name: /View profile/i }));
    await user.click(screen.getByRole("button", { name: /Next/i }));

    expect(onViewCandidate).toHaveBeenCalledWith(application);
    expect(onPageChange).toHaveBeenCalledWith(2);
    expect(screen.getByText("candidate@test.com")).toBeInTheDocument();

    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <ApplicantsTable
            page={{ items: [], total: 0, limit: 10, offset: 0 }}
            isLoading={false}
            onPageChange={onPageChange}
            onStatusChange={onStatusChange}
          />
        </MemoryRouter>
      </QueryClientProvider>
    );
    expect(screen.getByText(/No applications for this role yet/i)).toBeInTheDocument();
  });

  it("renders job search filters and forwards text changes", async () => {
    const user = userEvent.setup();
    const onKeywordChange = vi.fn();
    const onLocationChange = vi.fn();
    const onSkillChange = vi.fn();
    const onJobTypeChange = vi.fn();
    const onSalaryRangeChange = vi.fn();

    render(
      <JobSearchFilters
        keyword=""
        location=""
        skill=""
        jobType="all"
        salaryRange="any"
        onKeywordChange={onKeywordChange}
        onLocationChange={onLocationChange}
        onSkillChange={onSkillChange}
        onJobTypeChange={onJobTypeChange}
        onSalaryRangeChange={onSalaryRangeChange}
      />
    );

    await user.type(screen.getByPlaceholderText("Design, engineering, product..."), "react");
    await user.type(screen.getByPlaceholderText("Remote, London..."), "remote");
    await user.type(screen.getByPlaceholderText("React, SQL..."), "sql");

    expect(onKeywordChange).toHaveBeenCalled();
    expect(onLocationChange).toHaveBeenCalled();
    expect(onSkillChange).toHaveBeenCalled();
    expect(salaryRangeFilters["2000000+"].min).toBe(2_000_000);
    expect(screen.getByText("All types")).toBeInTheDocument();
  });

  it("covers match score tones and profile strength states", () => {
    expect(matchScoreTone(95).label).toBe("Excellent fit");
    expect(matchScoreTone(75).label).toBe("Strong fit");
    expect(matchScoreTone(60).label).toBe("Good fit");
    expect(matchScoreTone(45).label).toBe("Partial fit");
    expect(matchScoreTone(20).label).toBe("Low fit");

    renderWithProviders(
      <>
        <MatchScore score={92} reason="Strong skill overlap" />
        <MatchScore score={20} reason="Low overlap" compact />
        <ProfileStrengthCard profile={profile} />
        <ProfileStrengthCard />
      </>
    );

    expect(screen.getByText("92% match")).toBeInTheDocument();
    expect(screen.getByText("Strong skill overlap")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByText("0%")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Update Profile" })).toHaveAttribute("href", "/candidate/profile");
    expect(screen.getByRole("link", { name: "Complete Profile" })).toHaveAttribute("href", "/candidate/profile");
  });

  it("opens candidate profile dialog and sends a recruiter message", async () => {
    const user = userEvent.setup();
    mocks.sendToCandidate.mockResolvedValue({ id: 1 });

    renderWithProviders(
      <CandidateProfileDialog application={application} open onOpenChange={vi.fn()} />
    );

    expect(screen.getAllByRole("heading", { name: "Test Candidate" }).length).toBeGreaterThan(0);
    expect(screen.getByText("frontend engineer")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Contact candidate/i }));
    expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled();

    await user.type(screen.getByPlaceholderText("Write your message"), "Can we schedule a call?");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => {
      expect(mocks.sendToCandidate).toHaveBeenCalledWith({
        candidate_id: 3,
        job_id: 4,
        body: "Can we schedule a call?",
      });
    });
  });

  it("renders nothing when profile dialog has no application", () => {
    const { container } = renderWithProviders(
      <CandidateProfileDialog application={null} open onOpenChange={vi.fn()} />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
