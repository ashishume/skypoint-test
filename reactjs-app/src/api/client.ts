import axios, { AxiosError } from "axios";
import type {
  ApiErrorPayload,
  Application,
  ApplicationStatus,
  ApplicationWithCandidateProfile,
  ApplicationWithJob,
  DashboardStats,
  Job,
  CandidateProfile,
  CandidateProfilePayload,
  JobRecommendation,
  JobPayload,
  JobStatus,
  JobType,
  MessageThread,
  Page,
  TokenResponse,
  User,
  UserRole,
} from "@/api/types";

const TOKEN_KEY = "jobapp_access_token";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api/v1",
  timeout: 10_000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const tokenStorage = {
  get: () => {
    try {
      return window.localStorage?.getItem(TOKEN_KEY) ?? null;
    } catch {
      return null;
    }
  },
  set: (token: string) => {
    try {
      window.localStorage?.setItem(TOKEN_KEY, token);
    } catch {
      // Browsers with disabled storage still allow the UI to render; the
      // session simply will not persist after reload.
    }
  },
  clear: () => {
    try {
      window.localStorage?.removeItem(TOKEN_KEY);
    } catch {
      // No-op when storage is disabled.
    }
  },
};

export function getApiError(error: unknown): string {
  if (axios.isAxiosError<ApiErrorPayload>(error)) {
    const payload = error.response?.data;
    if (Array.isArray(payload?.detail)) {
      return payload.detail.map((item) => item.msg).join(" ");
    }
    if (payload?.detail) return payload.detail;
    if (payload?.message) return payload.message;
    if (error.response?.status === 401) return "Your session has expired. Please sign in again.";
    if (error.response?.status === 403) return "You do not have permission to perform this action.";
  }
  return error instanceof Error ? error.message : "Something went wrong.";
}

export function isUnauthorized(error: unknown): boolean {
  return axios.isAxiosError(error) && (error as AxiosError).response?.status === 401;
}

export const authApi = {
  login: async (payload: { email: string; password: string }) => {
    const { data } = await api.post<TokenResponse>("/auth/login", payload);
    return data;
  },
  register: async (payload: {
    email: string;
    full_name: string;
    password: string;
    role: UserRole;
    hr_invite_code?: string;
  }) => {
    const { data } = await api.post<User>("/auth/register", payload);
    return data;
  },
  me: async () => {
    const { data } = await api.get<User>("/auth/me");
    return data;
  },
};

export const jobsApi = {
  list: async (params: {
    limit?: number;
    offset?: number;
    status?: JobStatus;
    location?: string;
    job_type?: JobType;
    search?: string;
    skill?: string;
    salary_min?: number;
    salary_max?: number;
  } = {}) => {
    const { data } = await api.get<Page<Job>>("/jobs", { params });
    return data;
  },
  get: async (id: number) => {
    const { data } = await api.get<Job>(`/jobs/${id}`);
    return data;
  },
  create: async (payload: JobPayload) => {
    const { data } = await api.post<Job>("/jobs", payload);
    return data;
  },
  update: async (id: number, payload: Partial<JobPayload>) => {
    const { data } = await api.put<Job>(`/jobs/${id}`, payload);
    return data;
  },
  remove: async (id: number) => {
    await api.delete(`/jobs/${id}`);
  },
  applications: async (
    jobId: number,
    params: { status?: ApplicationStatus; limit?: number; offset?: number } = {}
  ) => {
    const { data } = await api.get<Page<ApplicationWithCandidateProfile>>(
      `/jobs/${jobId}/applications`,
      { params }
    );
    return data;
  },
};

export const applicationsApi = {
  apply: async (payload: { job_id: number; cover_letter: string; resume_url?: string }) => {
    const { data } = await api.post<Application>("/applications", payload);
    return data;
  },
  mine: async (params: {
    status?: ApplicationStatus;
    limit?: number;
    offset?: number;
    open_jobs_only?: boolean;
  } = {}) => {
    const { data } = await api.get<Page<ApplicationWithJob>>("/applications/my", { params });
    return data;
  },
  hrList: async (params: {
    status?: ApplicationStatus;
    job_id?: number;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}) => {
    const { data } = await api.get<Page<ApplicationWithCandidateProfile>>("/applications/hr", { params });
    return data;
  },
  updateStatus: async (id: number, status: ApplicationStatus) => {
    const { data } = await api.patch<Application>(`/applications/${id}/status`, { status });
    return data;
  },
};

export const dashboardApi = {
  hr: async () => {
    const { data } = await api.get<DashboardStats>("/hr/dashboard");
    return data;
  },
};

export const candidateProfileApi = {
  get: async () => {
    const { data } = await api.get<CandidateProfile>("/candidate/profile");
    return data;
  },
  update: async (payload: CandidateProfilePayload) => {
    const { data } = await api.put<CandidateProfile>("/candidate/profile", payload);
    return data;
  },
  recommendations: async () => {
    const { data } = await api.get<JobRecommendation[]>("/candidate/recommendations");
    return data;
  },
  jobMatches: async (params: {
    limit?: number;
    offset?: number;
    location?: string;
    job_type?: JobType;
    search?: string;
    skill?: string;
    salary_min?: number;
    salary_max?: number;
  } = {}) => {
    const { data } = await api.get<Page<JobRecommendation>>("/candidate/job-matches", { params });
    return data;
  },
};

export const messagesApi = {
  sendToCandidate: async (payload: { candidate_id: number; job_id: number; body: string }) => {
    const { data } = await api.post<MessageThread>("/messages/hr", payload);
    return data;
  },
  candidateThreads: async () => {
    const { data } = await api.get<MessageThread[]>("/messages/candidate");
    return data;
  },
  reply: async (threadId: number, payload: { body: string }) => {
    const { data } = await api.post<MessageThread>(`/messages/candidate/${threadId}/reply`, payload);
    return data;
  },
};
