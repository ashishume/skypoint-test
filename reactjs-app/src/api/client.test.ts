import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  api,
  applicationsApi,
  authApi,
  candidateProfileApi,
  dashboardApi,
  getApiError,
  isUnauthorized,
  jobsApi,
  messagesApi,
} from "@/api/client";

describe("api client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends credentials (cookies) with every request", () => {
    expect(api.defaults.withCredentials).toBe(true);
  });

  it("normalizes backend error payloads", () => {
    expect(
      getApiError({
        isAxiosError: true,
        response: { data: { detail: "Nope" }, status: 400 },
      })
    ).toBe("Nope");
    expect(
      getApiError({
        isAxiosError: true,
        response: { data: { detail: [{ msg: "Required" }] }, status: 422 },
      })
    ).toBe("Required");
    expect(getApiError(new Error("Boom"))).toBe("Boom");
    expect(
      getApiError({
        isAxiosError: true,
        response: { data: { message: "Saved error" }, status: 400 },
      })
    ).toBe("Saved error");
    expect(
      getApiError({
        isAxiosError: true,
        response: { data: {}, status: 401 },
      })
    ).toBe("Your session has expired. Please sign in again.");
    expect(
      getApiError({
        isAxiosError: true,
        response: { data: {}, status: 403 },
      })
    ).toBe("You do not have permission to perform this action.");
    expect(getApiError("unknown")).toBe("Something went wrong.");
    expect(isUnauthorized({ isAxiosError: true, response: { status: 401 } })).toBe(true);
    expect(isUnauthorized({ isAxiosError: true, response: { status: 403 } })).toBe(false);
  });

  it("wraps auth endpoints", async () => {
    const get = vi.spyOn(api, "get").mockResolvedValue({ data: { id: 1 } });
    const post = vi.spyOn(api, "post").mockResolvedValue({ data: { access_token: "token" } });

    await authApi.login({ email: "hr@test.com", password: "password" });
    await authApi.register({
      email: "new@test.com",
      full_name: "New HR",
      password: "password",
      role: "hr",
      hr_invite_code: "INVITE",
    });
    await authApi.me();
    await authApi.logout();

    expect(post).toHaveBeenCalledWith("/auth/login", { email: "hr@test.com", password: "password" });
    expect(post).toHaveBeenCalledWith("/auth/register", {
      email: "new@test.com",
      full_name: "New HR",
      password: "password",
      role: "hr",
      hr_invite_code: "INVITE",
    });
    expect(get).toHaveBeenCalledWith("/auth/me");
    expect(post).toHaveBeenCalledWith("/auth/logout");
  });

  it("wraps jobs endpoints", async () => {
    const get = vi.spyOn(api, "get").mockResolvedValue({ data: { items: [], total: 0 } });
    const post = vi.spyOn(api, "post").mockResolvedValue({ data: { id: 1 } });
    const put = vi.spyOn(api, "put").mockResolvedValue({ data: { id: 1 } });
    const remove = vi.spyOn(api, "delete").mockResolvedValue({});

    await jobsApi.list({ search: "api" });
    await jobsApi.get(1);
    await jobsApi.create({
      title: "Role",
      description: "A useful role description.",
      skills: ["react"],
      location: "Remote",
      job_type: "full_time",
    });
    await jobsApi.update(1, { status: "closed" });
    await jobsApi.remove(1);
    await jobsApi.applications(1, { status: "pending" });
    await jobsApi.potentialCandidates(1, { search: "react", limit: 5 });

    expect(get).toHaveBeenCalledWith("/jobs", { params: { search: "api" } });
    expect(get).toHaveBeenCalledWith("/jobs/1");
    expect(get).toHaveBeenCalledWith("/jobs/1/applications", { params: { status: "pending" } });
    expect(get).toHaveBeenCalledWith("/jobs/1/potential-candidates", { params: { search: "react", limit: 5 } });
    expect(post).toHaveBeenCalledWith("/jobs", expect.any(Object));
    expect(put).toHaveBeenCalledWith("/jobs/1", { status: "closed" });
    expect(remove).toHaveBeenCalledWith("/jobs/1");
  });

  it("wraps candidate profile endpoints", async () => {
    const get = vi.spyOn(api, "get").mockResolvedValue({ data: { items: [], total: 0 } });
    const put = vi.spyOn(api, "put").mockResolvedValue({ data: { id: 1 } });

    await candidateProfileApi.get();
    await candidateProfileApi.update({
      skills: ["react"],
      work_experience: "Built interfaces.",
      salary_min: 100000,
      salary_max: 180000,
      experience_years: 3,
      preferred_roles: ["frontend engineer"],
      resume_url: "https://example.com/resume.pdf",
    });
    await candidateProfileApi.recommendations();
    await candidateProfileApi.jobMatches({ search: "react", skill: "typescript" });

    expect(get).toHaveBeenCalledWith("/candidate/profile");
    expect(put).toHaveBeenCalledWith("/candidate/profile", expect.objectContaining({ skills: ["react"] }));
    expect(get).toHaveBeenCalledWith("/candidate/recommendations");
    expect(get).toHaveBeenCalledWith("/candidate/job-matches", {
      params: { search: "react", skill: "typescript" },
    });
  });

  it("wraps application and dashboard endpoints", async () => {
    const get = vi.spyOn(api, "get").mockResolvedValue({ data: { items: [], total: 0 } });
    const post = vi.spyOn(api, "post").mockResolvedValue({ data: { id: 1 } });
    const patch = vi.spyOn(api, "patch").mockResolvedValue({ data: { id: 1 } });

    await applicationsApi.apply({ job_id: 1, cover_letter: "I am a strong fit." });
    await applicationsApi.mine({ status: "reviewed", open_jobs_only: true });
    await applicationsApi.hrList({ status: "pending", search: "alex" });
    await applicationsApi.updateStatus(1, "shortlisted");
    await dashboardApi.hr();

    expect(post).toHaveBeenCalledWith("/applications", {
      job_id: 1,
      cover_letter: "I am a strong fit.",
    });
    expect(get).toHaveBeenCalledWith("/applications/my", {
      params: { status: "reviewed", open_jobs_only: true },
    });
    expect(get).toHaveBeenCalledWith("/applications/hr", {
      params: { status: "pending", search: "alex" },
    });
    expect(patch).toHaveBeenCalledWith("/applications/1/status", { status: "shortlisted" });
    expect(get).toHaveBeenCalledWith("/hr/dashboard");
  });

  it("wraps message endpoints", async () => {
    const get = vi.spyOn(api, "get").mockResolvedValue({ data: [] });
    const post = vi.spyOn(api, "post").mockResolvedValue({ data: { id: 1 } });

    await messagesApi.sendToCandidate({ candidate_id: 2, job_id: 3, body: "Hello" });
    await messagesApi.hrThreads();
    await messagesApi.hrReply(1, { body: "Following up" });
    await messagesApi.candidateThreads();
    await messagesApi.reply(1, { body: "Thanks" });

    expect(post).toHaveBeenCalledWith("/messages/hr", { candidate_id: 2, job_id: 3, body: "Hello" });
    expect(get).toHaveBeenCalledWith("/messages/hr");
    expect(post).toHaveBeenCalledWith("/messages/hr/1/reply", { body: "Following up" });
    expect(get).toHaveBeenCalledWith("/messages/candidate");
    expect(post).toHaveBeenCalledWith("/messages/candidate/1/reply", { body: "Thanks" });
  });
});
