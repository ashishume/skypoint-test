import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CandidateMessagesPage from "@/pages/candidate-messages-page";
import type { MessageThread } from "@/api/types";

const mocks = vi.hoisted(() => ({
  candidateThreads: vi.fn(),
  reply: vi.fn(),
}));

vi.mock("@/app/auth-context", () => ({
  useAuth: () => ({
    user: {
      id: 2,
      email: "user@test.com",
      full_name: "Test Candidate",
      role: "candidate",
      is_active: true,
      created_at: "2026-05-20T00:00:00Z",
      updated_at: "2026-05-20T00:00:00Z",
    },
  }),
}));

vi.mock("@/api/client", () => ({
  getApiError: (error: unknown) => (error instanceof Error ? error.message : "Something went wrong."),
  messagesApi: {
    candidateThreads: mocks.candidateThreads,
    reply: mocks.reply,
  },
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CandidateMessagesPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function makeThread(messages: MessageThread["messages"]): MessageThread {
  return {
    id: 7,
    job: {
      id: 3,
      title: "Senior Product Designer",
      description: "Design hiring workflows.",
      skills: ["product strategy"],
      location: "Remote",
      job_type: "full_time",
      salary_min: 130000,
      salary_max: 180000,
      status: "open",
      created_by_id: 1,
      applications_count: 1,
      created_at: "2026-05-20T00:00:00Z",
      updated_at: "2026-05-20T00:00:00Z",
    },
    candidate: {
      id: 2,
      email: "user@test.com",
      full_name: "Test Candidate",
      role: "candidate",
    },
    hr: {
      id: 1,
      email: "admin@test.com",
      full_name: "HR Admin",
      role: "hr",
    },
    messages,
    created_at: "2026-05-20T00:00:00Z",
    updated_at: "2026-05-20T00:00:00Z",
  };
}

describe("CandidateMessagesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends a reply and renders the saved message from the backend response", async () => {
    const user = userEvent.setup();
    let serverThread = makeThread([
      {
        id: 1,
        thread_id: 7,
        sender_id: 1,
        sender: {
          id: 1,
          email: "admin@test.com",
          full_name: "HR Admin",
          role: "hr",
        },
        body: "Thanks for applying. Your portfolio is a strong match.",
        created_at: "2026-05-20T00:00:00Z",
      },
    ]);
    mocks.candidateThreads.mockImplementation(async () => [serverThread]);
    mocks.reply.mockImplementation(async (_threadId: number, payload: { body: string }) => {
      serverThread = makeThread([
        ...serverThread.messages,
        {
          id: 2,
          thread_id: 7,
          sender_id: 2,
          sender: {
            id: 2,
            email: "user@test.com",
            full_name: "Test Candidate",
            role: "candidate",
          },
          body: payload.body,
          created_at: "2026-05-20T00:01:00Z",
        },
      ]);
      return serverThread;
    });

    renderPage();

    expect(await screen.findByText("Senior Product Designer")).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText("Write a reply to the recruiter"), "Happy to discuss tomorrow.");
    await user.click(screen.getByRole("button", { name: /reply/i }));

    await waitFor(() => {
      expect(mocks.reply).toHaveBeenCalledWith(7, { body: "Happy to discuss tomorrow." });
    });
    expect(await screen.findByText("Happy to discuss tomorrow.")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Write a reply to the recruiter")).toHaveValue("");
  });
});
