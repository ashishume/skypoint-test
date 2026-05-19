import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { JobForm } from "@/features/jobs/job-form";

describe("JobForm", () => {
  it("validates and submits a job payload", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<JobForm submitLabel="Publish job" onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "Publish job" }));
    expect(await screen.findByText(/title must be/i)).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("Job title"), "Platform Engineer");
    await user.type(screen.getByPlaceholderText("Location"), "Remote");
    await user.type(screen.getByPlaceholderText("Minimum salary"), "100000");
    await user.type(screen.getByPlaceholderText("Maximum salary"), "200000");
    await user.type(
      screen.getByPlaceholderText(/describe the role/i),
      "Build deployment systems for the hiring platform."
    );
    await user.click(screen.getByRole("button", { name: "Publish job" }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: "Platform Engineer",
      description: "Build deployment systems for the hiring platform.",
      location: "Remote",
      job_type: "full_time",
      salary_min: 100000,
      salary_max: 200000,
      status: "open",
    });
  });
});
