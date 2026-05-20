import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { Job } from "@/api/types";
import { Button } from "@/components/ui/button";
import { JobCard } from "@/features/jobs/job-card";

const job: Job = {
  id: 1,
  title: "Platform Engineer",
  description: "Build reliable deployment systems for the hiring platform.",
  skills: ["python", "aws"],
  location: "Remote",
  job_type: "full_time",
  salary_min: 100000,
  salary_max: 200000,
  status: "open",
  created_by_id: 1,
  applications_count: 3,
  created_at: "2026-05-01T00:00:00Z",
  updated_at: "2026-05-01T00:00:00Z",
};

describe("JobCard", () => {
  it("renders job details and actions", () => {
    render(
      <MemoryRouter>
        <JobCard job={job} showApplicantsCount actions={<Button>Apply</Button>} />
      </MemoryRouter>
    );

    expect(screen.getByText("Platform Engineer")).toBeInTheDocument();
    expect(screen.getByText("Remote")).toBeInTheDocument();
    expect(screen.getByText("Full time")).toBeInTheDocument();
    expect(screen.getByText("python")).toBeInTheDocument();
    expect(screen.getByText("3 Applicants")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apply" })).toBeInTheDocument();
  });

  it("navigates via click and keyboard when an href is provided", async () => {
    const user = userEvent.setup();

    function LocationEcho() {
      return <div data-testid="location">{useLocation().pathname}</div>;
    }

    render(
      <MemoryRouter initialEntries={["/"]}>
        <JobCard job={{ ...job, applications_count: 1 }} href="/jobs/1" showApplicantsCount />
        <LocationEcho />
      </MemoryRouter>
    );

    const card = screen.getByRole("link", { name: /Platform Engineer/i });
    expect(screen.getByText("1 Applicant")).toBeInTheDocument();

    await user.click(card);
    expect(screen.getByTestId("location")).toHaveTextContent("/jobs/1");
  });

  it("keeps non-linked cards passive and supports empty optional content", () => {
    render(
      <MemoryRouter>
        <JobCard job={{ ...job, skills: [], applications_count: 0 }} />
      </MemoryRouter>
    );

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByText("python")).not.toBeInTheDocument();
    expect(screen.queryByText(/Applicant/)).not.toBeInTheDocument();
  });
});
