import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BriefcaseBusiness } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { ApplicationStatusBadge, JobStatusBadge } from "@/components/common/status-badge";

describe("common components", () => {
  it("renders status badges with human-readable labels", () => {
    render(
      <>
        <ApplicationStatusBadge status="shortlisted" />
        <JobStatusBadge status="closed" />
      </>
    );

    expect(screen.getByText("Shortlisted")).toBeInTheDocument();
    expect(screen.getByText("Closed")).toBeInTheDocument();
  });

  it("fires empty-state actions", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();

    render(
      <EmptyState
        icon={BriefcaseBusiness}
        title="No jobs"
        description="Create a job first."
        actionLabel="Create job"
        onAction={onAction}
      />
    );

    await user.click(screen.getByRole("button", { name: "Create job" }));

    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("renders page headers with optional actions", () => {
    render(
      <PageHeader
        eyebrow="Workspace"
        title="Jobs"
        description="Manage open roles."
        actions={<button type="button">New job</button>}
      />
    );

    expect(screen.getByText("Workspace")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Jobs" })).toBeInTheDocument();
    expect(screen.getByText("Manage open roles.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New job" })).toBeInTheDocument();
  });
});
