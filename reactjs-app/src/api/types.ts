export type UserRole = "hr" | "candidate";
export type JobStatus = "open" | "closed";
export type JobType = "full_time" | "part_time" | "contract" | "internship";
export type ApplicationStatus = "pending" | "reviewed" | "shortlisted" | "rejected";

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PublicUser {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
}

export interface TokenResponse {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
  user: User;
}

export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface Job {
  id: number;
  title: string;
  description: string;
  location: string;
  job_type: JobType;
  salary_min: number | null;
  salary_max: number | null;
  status: JobStatus;
  created_by_id: number;
  created_at: string;
  updated_at: string;
}

export interface JobPayload {
  title: string;
  description: string;
  location: string;
  job_type: JobType;
  salary_min?: number | null;
  salary_max?: number | null;
  status?: JobStatus;
}

export interface Application {
  id: number;
  job_id: number;
  candidate_id: number;
  cover_letter: string;
  resume_url: string | null;
  status: ApplicationStatus;
  created_at: string;
  updated_at: string;
}

export interface ApplicationWithJob extends Application {
  job: Job;
}

export interface ApplicationWithCandidate extends Application {
  candidate: PublicUser;
}

export interface DashboardStats {
  total_jobs: number;
  jobs_by_status: Record<JobStatus, number>;
  total_applications: number;
  applications_by_status: Record<ApplicationStatus, number>;
  recent_applications: ApplicationWithJob[];
}

export interface ApiErrorPayload {
  detail?: string | Array<{ msg: string; loc?: Array<string | number> }>;
  message?: string;
}
