import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, applicationsApi, dashboardApi, getApiError, jobsApi, tokenStorage } from "@/api/client";

function installLocalStorage() {
  const store = new Map<string, string>();
  const storage = {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(() => {
      store.clear();
    }),
  };
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: storage,
  });
  return storage;
}

describe("tokenStorage", () => {
  beforeEach(() => {
    installLocalStorage();
  });

  it("persists and clears the auth token", () => {
    tokenStorage.set("abc123");
    expect(tokenStorage.get()).toBe("abc123");

    tokenStorage.clear();
    expect(tokenStorage.get()).toBeNull();
  });

  it("does not throw when localStorage is unavailable", () => {
    const storage = installLocalStorage();
    storage.getItem.mockImplementation(() => {
      throw new Error("disabled");
    });

    expect(tokenStorage.get()).toBeNull();
    expect(() => tokenStorage.set("abc123")).not.toThrow();
    expect(() => tokenStorage.clear()).not.toThrow();
  });
});

describe("api client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    installLocalStorage();
  });

  it("adds bearer token to outgoing requests", async () => {
    tokenStorage.set("token-value");

    const handlers = api.interceptors.request.handlers as unknown as Array<{
      fulfilled?: (config: { headers: Record<string, string> }) => { headers: Record<string, string> };
    }>;
    const config = await handlers[0].fulfilled?.({
      headers: {},
    });

    expect(config?.headers.Authorization).toBe("Bearer token-value");
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
  });

  it("wraps jobs endpoints", async () => {
    const get = vi.spyOn(api, "get").mockResolvedValue({ data: { items: [], total: 0 } });
    const post = vi.spyOn(api, "post").mockResolvedValue({ data: { id: 1 } });
    const put = vi.spyOn(api, "put").mockResolvedValue({ data: { id: 1 } });
    const remove = vi.spyOn(api, "delete").mockResolvedValue({});

    await jobsApi.list({ search: "api" });
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

    expect(get).toHaveBeenCalledWith("/jobs", { params: { search: "api" } });
    expect(get).toHaveBeenCalledWith("/jobs/1/applications", { params: { status: "pending" } });
    expect(post).toHaveBeenCalledWith("/jobs", expect.any(Object));
    expect(put).toHaveBeenCalledWith("/jobs/1", { status: "closed" });
    expect(remove).toHaveBeenCalledWith("/jobs/1");
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
});
