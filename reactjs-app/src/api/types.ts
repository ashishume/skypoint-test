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
  skills: string[];
  location: string;
  job_type: JobType;
  salary_min: number | null;
  salary_max: number | null;
  status: JobStatus;
  created_by_id: number;
  applications_count: number;
  created_at: string;
  updated_at: string;
}

export interface JobPayload {
  title: string;
  description: string;
  skills: string[];
  location: string;
  job_type: JobType;
  salary_min?: number | null;
  salary_max?: number | null;
  status?: JobStatus;
}

export interface CandidateProfile {
  id: number;
  candidate_id: number;
  resume_url: string | null;
  skills: string[];
  work_experience: string;
  salary_min: number | null;
  salary_max: number | null;
  experience_years: number;
  preferred_roles: string[];
  profile_strength: number;
  created_at: string;
  updated_at: string;
}

export interface CandidateProfilePayload {
  resume_url?: string | null;
  skills: string[];
  work_experience: string;
  salary_min?: number | null;
  salary_max?: number | null;
  experience_years: number;
  preferred_roles: string[];
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

export interface ApplicationWithJobAndCandidate extends ApplicationWithJob {
  candidate: PublicUser;
}

export interface HiringVelocityBucket {
  label: string;
  start_date: string;
  end_date: string;
  applications: number;
}

export interface HiringVelocity {
  window_days: number;
  total_applications: number;
  average_weekly_applications: number;
  peak_week_label: string;
  buckets: HiringVelocityBucket[];
}

export interface DashboardStats {
  total_jobs: number;
  jobs_by_status: Record<JobStatus, number>;
  total_applications: number;
  applications_by_status: Record<ApplicationStatus, number>;
  recent_applications: ApplicationWithJobAndCandidate[];
  hiring_velocity: HiringVelocity;
}

export interface JobRecommendation {
  job: Job;
  match_score: number;
  matched_skills: string[];
  reason: string;
  has_applied: boolean;
  application_status: ApplicationStatus | null;
}

export interface ApiErrorPayload {
  detail?: string | Array<{ msg: string; loc?: Array<string | number> }>;
  message?: string;
}
