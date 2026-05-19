import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ApplicationForm } from "@/features/applications/application-form";

describe("ApplicationForm", () => {
  it("validates and submits application data", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<ApplicationForm onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "Submit application" }));
    expect(await screen.findByText(/cover letter must be/i)).toBeInTheDocument();

    await user.type(
      screen.getByPlaceholderText(/tell the hiring team/i),
      "I am excited to apply and can contribute immediately."
    );
    await user.type(screen.getByPlaceholderText(/https:\/\/example.com\/resume.pdf/i), "https://example.com/resume.pdf");
    await user.click(screen.getByRole("button", { name: "Submit application" }));

    expect(onSubmit).toHaveBeenCalledWith({
      cover_letter: "I am excited to apply and can contribute immediately.",
      resume_url: "https://example.com/resume.pdf",
    });
  });
});
