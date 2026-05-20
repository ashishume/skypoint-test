# RecruitFlow

A full-stack recruitment workflow application for managing job postings, candidate applications, candidate profiles, match-based recommendations, and recruiter-to-candidate messaging — built with FastAPI, React, and PostgreSQL, fully containerised with Docker Compose.

---

## Table of Contents

1. [Project Status](#project-status)
2. [Production-Readiness Validation](#production-readiness-validation)
3. [Project Overview](#project-overview)
4. [Architecture](#architecture)
5. [How to Run](#how-to-run)
6. [Environment Configuration](#environment-configuration)
7. [API Reference](#api-reference)
8. [Test Credentials](#test-credentials)
9. [Project Structure](#project-structure)
10. [Tech Stack](#tech-stack)
11. [Testing](#testing)
12. [Feature Walkthrough](#feature-walkthrough)
13. [Known Limitations](#known-limitations)
14. [AI-Assisted Development Notes](#ai-assisted-development-notes)

---

## Project Status

| Phase | Scope | Status |
|---|---|---|
| **1** | Backend foundation: schema, JWT auth, register/login/me, seed, Docker | **Done** |
| **2** | Backend feature APIs: jobs CRUD, applications, HR dashboard, repository/service/router layering | **Done** |
| **3** | Frontend: shell, routing, auth state, lazy-loaded routes | **Done** |
| **4** | Frontend: HR + Candidate feature pages | **Done** |
| **5** | Tests: backend coverage rewrite + frontend Vitest | **Done** |
| **6** | Docker hardening: Nginx, rate limit, security headers, request IDs | **Done** |
| **7** | README polish + final review | **Done** |
| **8** | Candidate profiles, job recommendations, match scores | **Done** |
| **9** | HR/candidate threaded messaging system | **Done** |
| **10** | HR candidates browser + expanded navigation | **Done** |

What works today:
- `docker compose up --build` brings up Postgres + FastAPI backend + React frontend.
- 22+ endpoints across `/auth`, `/jobs`, `/applications`, `/hr`, `/candidate`, `/messages`, plus `/health`.
- Database schema for `users`, `job_postings`, `applications`, `candidate_profiles`, `message_threads`, `messages` is migrated on startup.
- Assessment seed data is created on first boot: HR + Candidate users, demo jobs, a candidate profile, one application, and one recruiter message thread.
- Jobs, applications, profiles, recommendations, and messages all come from API-created database records.
- Frontend includes demo login, protected routes, HR dashboard/jobs/candidates, Candidate jobs/applications/profile/messages.
- Backend tests pass at >90% coverage; frontend Vitest coverage reports are configured.
- Frontend is served by Nginx in Docker with `/api` proxying to FastAPI.

---

## Production-Readiness Validation

Code review performed against typical production checklists. All items below were verified by audit (`grep`, route inspection, settings load, schema check):

### Security

| Item | Status | Notes |
|---|---|---|
| No production secrets in backend application code | ✅ | Backend secrets are loaded via `pydantic-settings`; demo credentials are assessment-only seed values and are documented below. |
| `SECRET_KEY` required from env (≥32 chars, fail-fast) | ✅ | `Field(..., min_length=32)` |
| Passwords hashed with bcrypt (configurable cost ≥4, default 12) | ✅ | `app/core/security.py` |
| Timing-safe authentication | ✅ | `consume_dummy_hash()` invoked on unknown-email path |
| JWT issued as `HttpOnly` cookie; JS cannot read the token | ✅ | `POST /auth/login` sets `Set-Cookie: access_token=...; HttpOnly; SameSite=Lax`; Bearer header accepted as fallback for Swagger / API clients |
| JWT signed with HS256/384/512 + `type=access` claim enforced | ✅ | `app/dependencies.py` rejects wrong-type, expired, non-integer-sub, deleted-user, and deactivated-user tokens |
| Role-based access control (HR / Candidate) | ✅ | `require_hr`, `require_candidate` guards on every protected route |
| SQL injection protection | ✅ | All queries use SQLAlchemy ORM / parameterised expressions |
| Strong password policy (8–128, upper/lower/digit/special) | ✅ | Regex in `schemas/auth.py` |
| HR invite code required for HR registration | ✅ | Verified by smoke test |
| Email normalised to lowercase to prevent dupe-by-casing | ✅ | Verified by smoke test |
| Non-root Docker user | ✅ | `Dockerfile` creates and switches to `app` user |
| CORS restricted to configured origins | ✅ | `settings.cors_origins_list` |
| Auth rate limiting | ✅ | In-memory limiter on `POST /auth/login` and `POST /auth/register`, configurable via env |
| Security headers | ✅ | FastAPI + Nginx set CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy |
| Request ID tracing | ✅ | `X-Request-ID` is preserved or generated and returned on every backend response |
| Message ownership enforcement | ✅ | HR can only message candidates on their own jobs; candidates can only reply to their own threads |

### Code quality / architecture

| Item | Status | Notes |
|---|---|---|
| Clean layered architecture (router → service → repository) | ✅ | Verified by `grep`: no DB calls in routers, no FastAPI imports in services/repos |
| Domain exceptions (no `HTTPException` in services/routers) | ✅ | Single handler in `main.py` maps `DomainError → HTTP` |
| DRY — utilities reused, no copy-paste | ✅ | `BaseRepository.paginate()`, `core/security.py`, shared `Annotated` DI aliases |
| Type hints throughout | ✅ | All public functions / methods annotated |
| Separation of concerns | ✅ | Schemas split by aggregate; routers contain HTTP plumbing only |
| No dead code (deleted modules removed cleanly) | ✅ | `grep` confirms no stale imports of removed modules |

### Scalability

| Item | Status | Notes |
|---|---|---|
| SQLAlchemy connection pool: pool_size, max_overflow, pool_pre_ping, pool_recycle | ✅ | Defaults: 10 / 20 / on / 1800s |
| Indexes on all foreign keys | ✅ | `created_by_id`, `job_id`, `candidate_id`, `hr_id`, `thread_id`, `sender_id` |
| Indexes on every filter / sort column | ✅ | `email` (unique), `role`, `status`, `location`, `title`, plus composite `(role, is_active)`, `(status, created_at)`, `(candidate_id, status)`, `(candidate_id, updated_at)` |
| `UNIQUE(job_id, candidate_id)` to enforce one-application-per-job | ✅ | Migration constraint + verified by smoke test (409 on duplicate) |
| `UNIQUE(job_id, candidate_id, hr_id)` on message threads | ✅ | Prevents duplicate threads per participant triple |
| Pagination on every list endpoint with bounded page size | ✅ | `Query(1≤limit≤100, 0≤offset)` |
| Single-roundtrip pagination (`COUNT(*)` on unpaginated subquery) | ✅ | `BaseRepository.paginate()` |
| N+1 avoidance via `selectinload` / `joinedload` | ✅ | Message threads eagerly load job, candidate, hr, messages, and senders in one pass |
| Multiple uvicorn workers (configurable via `UVICORN_WORKERS`) | ✅ | `entrypoint.sh` |

### Operational

| Item | Status | Notes |
|---|---|---|
| Single-command startup | ✅ | `docker compose up --build` |
| Database readiness wait + migrations via Alembic | ✅ | `entrypoint.sh` waits for Postgres, then runs `alembic upgrade head` before serving traffic |
| Idempotent seed (users + demo workspace) | ✅ | `entrypoint.sh` runs `python -m app.seed`; skips existing users/data on re-run |
| Healthcheck endpoint + Docker `HEALTHCHECK` | ✅ | Backend `GET /health`; frontend Nginx `/health` |
| Structured logging | ✅ | Module-level loggers; lifespan + DB errors logged |
| Graceful shutdown disposes engine | ✅ | `lifespan` finally block |
| Healthcheck-gated startup | ✅ | Postgres blocks backend; backend blocks frontend via `depends_on: condition: service_healthy` |
| Persistent DB volume | ✅ | Named volume `recruitflow_postgres_data` |
| Env config externalised; `.env` gitignored; `.env.example` template provided | ✅ | Compose has development defaults; `.env` is only needed for overrides |

### Validation (input / output)

| Item | Status | Notes |
|---|---|---|
| Request body validation via Pydantic v2 | ✅ | Every endpoint |
| Email validation | ✅ | `EmailStr` |
| Salary range validation (`salary_max ≥ salary_min`) | ✅ | `model_validator` in `JobCreate/JobUpdate` |
| Cover letter length bounds (10–5000) | ✅ | `schemas/application.py` |
| Message body length bounds (1–5000) | ✅ | `schemas/message.py` |
| `resume_url` is a valid URL | ✅ | `HttpUrl` type |
| Response models prevent password leakage | ✅ | `UserResponse` omits `hashed_password` |
| Enum validation (role, status, job_type) | ✅ | Pydantic + SQLAlchemy `Enum(validate_strings=True)` |

### Deliberately scoped out

- **External observability** (metrics, traces) — out of scope for this assessment.
- **Distributed rate-limit store** — the included limiter is in-memory; use Redis or another shared store for multi-instance production.
- **JWT refresh tokens** — out of scope; users re-login after access-token expiry.
- **Resume file uploads** — candidates provide `resume_url` links.
- **Real-time messaging** — messages are persisted and polled; no WebSocket push.

---

## Project Overview

This platform connects **HR managers** and **job candidates** through a centralised recruitment workflow:

- HR managers post and manage job openings, review incoming applications, update applicant statuses (Pending → Reviewed → Shortlisted → Rejected), browse all registered candidates, and send direct messages to applicants from within the candidate profile dialog.
- Candidates browse open positions, submit applications with cover letters, track their application status in real time, build a rich candidate profile (skills, experience, salary expectations, preferred roles), receive match-scored job recommendations, and reply to recruiter messages from a dedicated Messages tab.

The application enforces strict role-based access control — every endpoint is protected by the authenticated user's role. Message ownership rules ensure HR can only contact candidates on their own job postings, and candidates can only view and reply to threads addressed to them.

---

## Architecture

### Service topology

```
┌─────────────────────────────────────────────────────────┐
│                      Docker Network                      │
│                                                         │
│  ┌──────────────┐    ┌──────────────┐   ┌────────────┐ │
│  │   Frontend   │    │   Backend    │   │  Database  │ │
│  │  React/Vite  │───▶│   FastAPI    │──▶│ PostgreSQL │ │
│  │  :5173       │    │   :8000      │   │   :5432    │ │
│  └──────────────┘    └──────────────┘   └────────────┘ │
│                            │                  │        │
│                       JWT auth +         postgres_data │
│                       SQLAlchemy 2       named volume  │
└─────────────────────────────────────────────────────────┘
```

### Backend layered architecture

```
┌───────────────────────────────────────────────────────────┐
│ Routers      app/routers/                                 │
│   HTTP & DI only — schemas in, services called, schemas out│
│   auth.py · jobs.py · applications.py · hr.py             │
│   candidate_profile.py · messages.py                      │
└─────────────────────┬─────────────────────────────────────┘
                      │ raises Domain* exceptions
┌─────────────────────▼─────────────────────────────────────┐
│ Services     app/services/                                │
│   Business rules + orchestration                          │
│   UserService · AuthService · JobService ·                │
│   ApplicationService · CandidateProfileService ·          │
│   MessageService                                          │
└─────────────────────┬─────────────────────────────────────┘
                      │
┌─────────────────────▼─────────────────────────────────────┐
│ Repositories app/repositories/                            │
│   Data access only                                        │
│   BaseRepository[T] (get / add / save / delete /          │
│                       paginate) +                         │
│   UserRepository · JobRepository · ApplicationRepository  │
│   CandidateProfileRepository · MessageThreadRepository    │
└─────────────────────┬─────────────────────────────────────┘
                      │
                  SQLAlchemy ORM Session
                      │
                      ▼
                  PostgreSQL 16
```

Cross-cutting modules:
- `app/core/exceptions.py` — `DomainError` hierarchy mapped to HTTP responses by a single handler in `main.py`.
- `app/core/security.py` — bcrypt + JWT helpers (stateless, no DB).
- `app/core/pagination.py` — `PaginationParams` dependency + generic `Page[T]` envelope.
- `app/dependencies.py` — typed `Annotated` aliases (`CurrentUser`, `HrUser`, `CandidateUser`, `JobServiceDep`, `MessageServiceDep`, …) so routers stay declarative.

### Database models

| Model | Table | Purpose |
|---|---|---|
| `User` | `users` | Auth + role (hr / candidate) |
| `JobPosting` | `job_postings` | Job listings with skills, salary range, type, status |
| `Application` | `applications` | Candidate applies to job; holds cover letter, resume URL, match score |
| `CandidateProfile` | `candidate_profiles` | Skills, experience years, preferred roles, salary expectations |
| `MessageThread` | `message_threads` | One thread per (job, candidate, HR) triple |
| `Message` | `messages` | Individual messages within a thread, ordered by `created_at` |

---

## How to Run

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Compose v2)

### Steps

```bash
git clone <your-repo-url>
cd skypoint-test
docker compose up --build
```

The frontend will be available at **http://localhost:5173**. The backend will be available at **http://localhost:8000** (Swagger UI at **http://localhost:8000/api/v1/docs**).

No additional configuration is required. `docker-compose.yml` includes development defaults, and the backend startup script automatically:

1. Waits for PostgreSQL to accept connections.
2. Runs `alembic upgrade head` to create/update the database tables.
3. Runs `python -m app.seed` to create the assessment HR/Candidate users and demo workspace data.
4. Starts Uvicorn.

Create a root `.env` only if you want to override the documented defaults.

To verify the exact fresh-clone path that assessors will use, reset the Docker volume and start again:

```bash
docker compose down -v
docker compose up --build
```

---

## Environment Configuration

All secrets and tunables come from environment variables — no hardcoded values in application code.

### Files

| File | Tracked in git? | Purpose |
|---|---|---|
| `.env.example` (root) | Yes | Single template documenting Docker Compose, backend, database, and seed variables |
| `.env` (root) | **No** (gitignored) | Optional local overrides; Docker Compose also works without it |

The backend also reads the root `.env` when run locally from `fastapi-app/`, so no separate `fastapi-app/.env` file is needed.

### Key variables

| Variable | Required | Description |
|---|---|---|
| `SECRET_KEY` | yes (≥32 chars) | JWT signing key. Generate: `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `HR_INVITE_CODE` | yes (≥8 chars) | Required when registering as HR |
| `DATABASE_URL` | yes | SQLAlchemy URL, e.g. `postgresql+psycopg2://user:pass@host:5432/db` |
| `ALGORITHM` | no (default `HS256`) | One of HS256 / HS384 / HS512 |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | no (default `30`) | Token lifetime |
| `BCRYPT_ROUNDS` | no (default `12`) | bcrypt cost factor (≥4, ≤15) |
| `DB_POOL_SIZE` / `DB_MAX_OVERFLOW` / `DB_POOL_RECYCLE_SECONDS` / `DB_POOL_TIMEOUT_SECONDS` | no | Connection pool tuning |
| `CORS_ORIGINS` | no | Comma-separated allowed frontend origins |
| `RATE_LIMIT_AUTH_MAX_REQUESTS` / `RATE_LIMIT_AUTH_WINDOW_SECONDS` | no | Auth endpoint rate-limit controls |
| `UVICORN_WORKERS` | no (default `2`) | Number of uvicorn worker processes |
| `SEED_DATA` | no (Docker Compose default `true`; backend default `false`) | If `true`, auto-creates assessment users and demo workspace data on startup |
| `SEED_HR_EMAIL` / `SEED_HR_PASSWORD` / `SEED_CANDIDATE_EMAIL` / `SEED_CANDIDATE_PASSWORD` | only if `SEED_DATA=true` | Seed credentials |

See `.env.example` for the full annotated list.

---

## API Reference

Base URL: `http://localhost:8000`. Interactive Swagger UI: `/api/v1/docs`.

All `/jobs`, `/applications`, `/hr/*`, `/candidate/*`, and `/messages/*` endpoints require `Authorization: Bearer <jwt>`. Errors follow the shape `{"detail": "human-readable message"}`.

### Authentication

| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/api/v1/auth/register` | public | Register a user; HR needs `hr_invite_code` |
| POST | `/api/v1/auth/login` | public | Exchange credentials for an `HttpOnly` session cookie (token also returned in body for Swagger) |
| POST | `/api/v1/auth/logout` | any | Clear the session cookie |
| GET | `/api/v1/auth/me` | any | Return the currently authenticated user |

### Jobs

| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/api/v1/jobs` | HR | Create a job posting |
| GET | `/api/v1/jobs` | any | List jobs (candidates auto-filtered to `status=open`). Supports `?status`, `?location`, `?job_type`, `?search`, `?skill`, `?salary_min`, `?salary_max`, `?limit`, `?offset` |
| GET | `/api/v1/jobs/{job_id}` | any | Get one job (candidates get 404 on closed jobs) |
| PUT | `/api/v1/jobs/{job_id}` | HR | Partial update; validates `salary_max ≥ salary_min` |
| DELETE | `/api/v1/jobs/{job_id}` | HR | Delete; returns 204 |
| GET | `/api/v1/jobs/{job_id}/applications` | HR | Paginated applicants; supports `?status` |

### Applications

| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/api/v1/applications` | Candidate | Apply to a job. 400 if job closed, 409 on duplicate |
| GET | `/api/v1/applications/my` | Candidate | List own applications; supports `?status`, `?open_jobs_only` |
| GET | `/api/v1/applications/hr` | HR | List all applications across the HR's jobs; supports `?status`, `?job_id`, `?search` |
| PATCH | `/api/v1/applications/{application_id}/status` | HR | Update status (`pending`/`reviewed`/`shortlisted`/`rejected`) |

### HR

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/api/v1/hr/dashboard` | HR | Aggregate job + application counts + 10 most recent applications |

### Candidate Profile & Recommendations

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/api/v1/candidate/profile` | Candidate | Get own candidate profile |
| PUT | `/api/v1/candidate/profile` | Candidate | Create or update profile (skills, experience, salary range, preferred roles, work experience) |
| GET | `/api/v1/candidate/recommendations` | Candidate | Top job recommendations ranked by skill-match score |
| GET | `/api/v1/candidate/job-matches` | Candidate | Paginated job matches with skill-match scores. Supports `?location`, `?job_type`, `?search`, `?skill`, `?salary_min`, `?salary_max` |

### Messages

| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/api/v1/messages/hr` | HR | Start or continue a message thread with a candidate for a specific job application |
| GET | `/api/v1/messages/candidate` | Candidate | List all message threads addressed to the current candidate |
| POST | `/api/v1/messages/candidate/{thread_id}/reply` | Candidate | Send a reply on an existing thread |

### Health

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/health` | public | Liveness probe used by the Docker healthcheck |

### Status code conventions

| Code | When |
|---|---|
| 200 | Successful read / update |
| 201 | Resource created |
| 204 | Deleted (no body) |
| 400 | Business-rule violation (e.g. apply to closed job, empty message body) |
| 401 | Missing / invalid / expired token |
| 403 | Authenticated but wrong role / missing invite code / ownership violation |
| 404 | Resource not found |
| 409 | Conflict (duplicate email, duplicate application) |
| 422 | Pydantic validation error |
| 500 | Internal database error (logged with stack trace) |

---

## Test Credentials

Seeded automatically when `SEED_DATA=true` (the default in `docker-compose.yml`).

| Role | Email | Password |
|---|---|---|
| HR Manager | `admin@test.com` | `Admin@1234` |
| Candidate | `user@test.com` | `User@1234` |

Override via the `SEED_HR_*` / `SEED_CANDIDATE_*` env vars.

The seeded workspace also includes demo jobs, a candidate profile, one application, and one recruiter message so both roles have meaningful data immediately after a fresh Docker startup.

---

## Project Structure

```
skypoint-test/
├── .env.example                # Single env template for Docker + backend settings
├── .gitignore
├── docker-compose.yml          # db + backend + frontend orchestration
├── README.md
│
├── fastapi-app/
│   ├── .dockerignore
│   ├── Dockerfile              # Multi-stage, non-root user, curl healthcheck
│   ├── entrypoint.sh           # alembic upgrade head → uvicorn (N workers)
│   ├── alembic.ini
│   ├── alembic/
│   │   ├── env.py
│   │   ├── script.py.mako
│   │   └── versions/
│   │       ├── 20260519_0001_initial_schema.py
│   │       └── 20260520_0006_messages.py   # MessageThread + Message tables
│   ├── pytest.ini
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py             # FastAPI factory, lifespan, exception handlers
│   │   ├── config.py           # pydantic-settings (env-driven, validated)
│   │   ├── database.py         # SQLAlchemy engine + pool + get_db dep
│   │   ├── dependencies.py     # DI factories + role guards + typed aliases
│   │   ├── seed.py             # Idempotent assessment users
│   │   │
│   │   ├── core/               # Cross-cutting concerns (no DB, no FastAPI)
│   │   │   ├── exceptions.py   # DomainError hierarchy
│   │   │   ├── security.py     # bcrypt + JWT (pure helpers)
│   │   │   └── pagination.py   # PaginationParams + Page[T]
│   │   │
│   │   ├── models/             # SQLAlchemy ORM
│   │   │   ├── base.py
│   │   │   ├── user.py
│   │   │   ├── job.py
│   │   │   ├── application.py
│   │   │   ├── candidate_profile.py
│   │   │   └── message.py      # MessageThread + Message
│   │   │
│   │   ├── schemas/            # Pydantic request/response models
│   │   │   ├── user.py
│   │   │   ├── auth.py
│   │   │   ├── job.py
│   │   │   ├── application.py
│   │   │   ├── dashboard.py
│   │   │   ├── candidate_profile.py
│   │   │   └── message.py      # HrMessageCreate · MessageReplyCreate · MessageThreadResponse
│   │   │
│   │   ├── repositories/       # Data access — no business logic
│   │   │   ├── base.py
│   │   │   ├── user_repository.py
│   │   │   ├── job_repository.py
│   │   │   ├── application_repository.py
│   │   │   ├── candidate_profile_repository.py
│   │   │   └── message_repository.py   # MessageThreadRepository
│   │   │
│   │   ├── services/           # Business logic — no FastAPI imports
│   │   │   ├── user_service.py
│   │   │   ├── auth_service.py
│   │   │   ├── job_service.py
│   │   │   ├── application_service.py
│   │   │   ├── candidate_profile_service.py
│   │   │   ├── message_service.py
│   │   │   └── recommendation.py  # Skill-match scoring algorithm
│   │   │
│   │   └── routers/            # HTTP plumbing — no DB, no business logic
│   │       ├── auth.py
│   │       ├── jobs.py
│   │       ├── applications.py
│   │       ├── hr.py
│   │       ├── candidate_profile.py
│   │       └── messages.py
│   │
│   └── tests/                  # Backend unit/integration tests
│       ├── conftest.py
│       ├── test_auth_service.py
│       ├── test_auth_routes.py
│       ├── test_dependencies.py
│       ├── test_seed.py
│       └── test_messages_routes.py
│
└── reactjs-app/
    ├── Dockerfile              # Multi-stage build served by Nginx
    ├── nginx.conf              # SPA fallback + /api proxy + security headers
    ├── package.json
    ├── vite.config.ts          # /api proxy + lazy chunk strategy
    ├── tailwind.config.js
    ├── components.json         # shadcn-compatible component config
    └── src/
        ├── App.tsx
        ├── main.tsx
        ├── api/                # Typed Axios client + DTOs
        │   ├── client.ts       # authApi · jobsApi · applicationsApi · candidateProfileApi · messagesApi
        │   └── types.ts        # All TypeScript request/response types
        ├── app/                # Query client, auth context, lazy router
        ├── components/
        │   ├── ui/             # shadcn-style primitives
        │   └── common/         # reusable app components
        ├── features/           # reusable forms/cards by domain
        │   ├── candidates/     # CandidateProfileDialog (with contact-candidate flow)
        │   └── jobs/           # match-score component
        ├── layouts/            # protected application shell (AppLayout + side nav)
        ├── lib/                # utilities + formatters
        ├── pages/              # lazy-loaded route pages
        │   ├── auth-page.tsx
        │   ├── candidate-jobs-page.tsx
        │   ├── candidate-job-details-page.tsx
        │   ├── candidate-applications-page.tsx
        │   ├── candidate-messages-page.tsx   # NEW — message threads + reply
        │   ├── candidate-profile-page.tsx    # NEW — profile editor
        │   ├── hr-dashboard-page.tsx
        │   ├── hr-jobs-page.tsx
        │   ├── hr-job-details-page.tsx
        │   └── hr-candidates-page.tsx        # NEW — candidate browser
        └── test/               # Vitest setup
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.12, FastAPI ≥0.115, SQLAlchemy 2, Alembic, Pydantic v2, pydantic-settings, python-jose (JWT), bcrypt |
| Database | PostgreSQL 16 |
| Frontend | React 18, Vite, TypeScript, React Router, TanStack Query, Axios, Tailwind CSS, shadcn-style Radix primitives, React Hook Form, Zod, Framer Motion, Lucide icons, Sonner (toast notifications) |
| Containerisation | Docker, Docker Compose v2, Nginx |
| Testing | pytest, pytest-cov, httpx, Vitest, Testing Library, jsdom, V8 coverage |

---

## Testing

### Backend

The backend test suite covers auth, role guards, jobs, applications, dashboard aggregates, messaging routes, seeding, security headers, request IDs, and rate limiting.

```bash
cd fastapi-app
python -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python -m pytest
```

Latest local result: **92 passed**, **96%+ coverage**.

### Frontend

Frontend unit tests cover API client wrappers, defensive token storage, reusable common components, job/application forms, job cards, and the candidate messaging reply flow.

```bash
cd reactjs-app
npm install
npm run test:coverage
```

Latest local result: **17 passed**, with a V8 coverage report emitted to `reactjs-app/coverage/`.

---

## Feature Walkthrough

### HR Manager (`admin@test.com`)

Sign in at `http://localhost:5173/auth`, then use the HR navigation.

| Feature | UI path | Endpoint(s) |
|---|---|---|
| Dashboard with stats | `/hr` | `GET /api/v1/hr/dashboard` |
| Post a new job | `/hr/jobs` → New job | `POST /api/v1/jobs` |
| Edit / close a job | `/hr/jobs` → Edit | `PUT /api/v1/jobs/{id}` |
| Delete a job | `/hr/jobs` → Delete | `DELETE /api/v1/jobs/{id}` |
| View applicants for a job | `/hr/jobs` → Applicants | `GET /api/v1/jobs/{id}/applications` |
| Update applicant status | Applicants dialog status dropdown | `PATCH /api/v1/applications/{id}/status` |
| View candidate profile + match score | Applicants dialog → candidate row | inline in applications response |
| Contact a candidate | Candidate profile dialog → Contact candidate | `POST /api/v1/messages/hr` |
| Browse all candidates | `/hr/candidates` | `GET /api/v1/applications/hr` |

### Candidate (`user@test.com`)

Sign in at `http://localhost:5173/auth`, then use the Candidate navigation.

| Feature | UI path | Endpoint(s) |
|---|---|---|
| Browse open jobs | `/candidate/jobs` | `GET /api/v1/jobs` |
| Search / filter jobs | `/candidate/jobs` search & filters | `GET /api/v1/jobs?search=…&skill=…&salary_min=…` |
| Apply to a job | `/candidate/jobs` → Apply | `POST /api/v1/applications` |
| Track my applications | `/candidate/applications` | `GET /api/v1/applications/my` |
| Build / update profile | `/candidate/profile` | `GET /api/v1/candidate/profile`, `PUT /api/v1/candidate/profile` |
| View job recommendations | `/candidate/profile` → Recommendations | `GET /api/v1/candidate/recommendations` |
| Browse skill-matched jobs | `/candidate/jobs` (job-matches mode) | `GET /api/v1/candidate/job-matches` |
| Read recruiter messages | `/candidate/messages` | `GET /api/v1/messages/candidate` |
| Reply to a recruiter | `/candidate/messages` → Reply | `POST /api/v1/messages/candidate/{thread_id}/reply` |

---

## Known Limitations

- Resume upload is not implemented — `resume_url` accepts a URL only.
- Email notifications are scoped out.
- No JWT refresh tokens — expiry requires re-login.
- Auth rate limiting is in-memory and per backend worker; use a shared store such as Redis for horizontally scaled deployments.
- Metrics/traces are not included.
- Messaging is pull-based (no WebSocket push); candidate replies update immediately, but new HR messages are fetched when the Messages page/query reloads.

### Deliberate trade-offs

| Decision | Why it was made | Production path |
|---|---|---|
| **In-memory rate limiter** | Zero extra dependencies; sufficient for a single-instance assessment environment. | Replace with a Redis-backed store (e.g. `slowapi` + Redis) so limits are shared across all uvicorn workers and survive restarts. |
| **`SameSite=Lax` CSRF posture** | `SameSite=Lax` blocks cross-site POST requests and is sufficient for a same-domain deployment. | Switch to `SameSite=Strict` or add an explicit CSRF token (double-submit cookie) if the frontend is ever served from a different origin. |
| **Synchronous recommendation algorithm** | Avoids a background-task dependency (Celery/RQ) while still demonstrating the skill-matching logic. | Offload to an async worker so the HTTP response time is not coupled to recommendation computation; add a dedicated recommendations table for caching results. |
| **Skills as JSON column** | Keeps the schema simple and avoids a join table for this scale. | Normalise into a `skills` lookup table + `job_skills` / `candidate_skills` join tables, and switch the column type to JSONB (PostgreSQL) for GIN-indexed containment queries. |
| **Pull-based messaging** | No WebSocket dependency required for this scope. | Add a WebSocket or SSE channel so candidates are notified of new messages in real time. |

---

## AI-Assisted Development Notes

Claude Code was used as the primary development assistant for scaffolding, implementation, refactoring, test generation, and review. Final verification was performed with local backend/frontend test commands and Docker-oriented review so the repository remains runnable by an assessor with `docker compose up --build`.
