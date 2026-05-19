import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
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
});
