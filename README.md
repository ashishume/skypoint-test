# Job Recruitment Management System

A full-stack web application for managing job postings and candidate applications, built with FastAPI, React, and PostgreSQL — fully containerised with Docker Compose.

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
13. [Development Plan (Phases)](#development-plan-phases)
14. [Known Limitations](#known-limitations)

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

What works today:
- `docker compose up --build` brings up Postgres + FastAPI backend + React frontend.
- 14 endpoints across `/auth`, `/jobs`, `/applications`, `/hr/dashboard`, plus `/health`.
- Database schema for `users`, `job_postings`, `applications` is migrated on startup.
- Two seed users (HR + Candidate) are created on first boot.
- Jobs, applications, and dashboard counts come from API-created database records.
- Frontend includes login/register, protected routes, HR dashboard/jobs/applicants, and Candidate jobs/applications.
- Backend tests pass at >90% coverage; frontend Vitest coverage reports are configured.
- Frontend is served by Nginx in Docker with `/api` proxying to FastAPI.

---

## Production-Readiness Validation

Code review performed against typical production checklists. All items below were verified by audit (`grep`, route inspection, settings load, schema check):

### Security

| Item | Status | Notes |
|---|---|---|
| No hardcoded secrets in application code | ✅ | `grep` finds zero credential literals in `app/`. All loaded via `pydantic-settings` from env vars. |
| `SECRET_KEY` required from env (≥32 chars, fail-fast) | ✅ | `Field(..., min_length=32)` |
| Passwords hashed with bcrypt (configurable cost ≥4, default 12) | ✅ | `app/core/security.py` |
| Timing-safe authentication | ✅ | `consume_dummy_hash()` invoked on unknown-email path |
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

### Code quality / architecture

| Item | Status | Notes |
|---|---|---|
| Clean layered architecture (router → service → repository) | ✅ | Verified by `grep`: no DB calls in routers, no FastAPI imports in services/repos |
| Domain exceptions (no `HTTPException` in services/routers) | ✅ | Single handler in `main.py` maps `DomainError → HTTP` |
| DRY — utilities reused, no copy-paste | ✅ | `BaseRepository.paginate()`, `core/security.py`, shared `Annotated` DI aliases |
| Type hints throughout | ✅ | All public functions / methods annotated |
| Separation of concerns | ✅ | Schemas split by aggregate; routers contain HTTP plumbing only |
| No dead code (deleted modules removed cleanly) | ✅ | `grep` confirms no stale imports of removed `app.services.auth` |

### Scalability

| Item | Status | Notes |
|---|---|---|
| SQLAlchemy connection pool: pool_size, max_overflow, pool_pre_ping, pool_recycle | ✅ | Defaults: 10 / 20 / on / 1800s |
| Indexes on all foreign keys | ✅ | `created_by_id`, `job_id`, `candidate_id` |
| Indexes on every filter / sort column | ✅ | `email` (unique), `role`, `status`, `location`, `title`, plus composite `(role, is_active)`, `(status, created_at)`, `(candidate_id, status)` |
| `UNIQUE(job_id, candidate_id)` to enforce one-application-per-job | ✅ | Migration constraint + verified by smoke test (409 on duplicate) |
| Pagination on every list endpoint with bounded page size | ✅ | `Query(1≤limit≤100, 0≤offset)` |
| Single-roundtrip pagination (`COUNT(*)` on unpaginated subquery) | ✅ | `BaseRepository.paginate()` |
| N+1 avoidance via `joinedload` | ✅ | `ApplicationRepository.list_for_candidate / list_for_job / recent` |
| Multiple uvicorn workers (configurable via `UVICORN_WORKERS`) | ✅ | `entrypoint.sh` |

### Operational

| Item | Status | Notes |
|---|---|---|
| Single-command startup | ✅ | `docker compose up --build` |
| Database readiness wait + migrations via Alembic | ✅ | `entrypoint.sh` waits for Postgres, then runs `alembic upgrade head` before serving traffic |
| Idempotent seed (HR + Candidate users only) | ✅ | `entrypoint.sh` runs `python -m app.seed`; skips existing users on re-run |
| Healthcheck endpoint + Docker `HEALTHCHECK` | ✅ | Backend `GET /health`; frontend Nginx `/health` |
| Structured logging | ✅ | Module-level loggers; lifespan + DB errors logged |
| Graceful shutdown disposes engine | ✅ | `lifespan` finally block |
| Healthcheck-gated startup | ✅ | Postgres blocks backend; backend blocks frontend via `depends_on: condition: service_healthy` |
| Persistent DB volume | ✅ | Named volume `jobapp_postgres_data` |
| Env config externalised; `.env` gitignored; `.env.example` template provided | ✅ | Compose has development defaults; `.env` is only needed for overrides |

### Validation (input / output)

| Item | Status | Notes |
|---|---|---|
| Request body validation via Pydantic v2 | ✅ | Every endpoint |
| Email validation | ✅ | `EmailStr` |
| Salary range validation (`salary_max ≥ salary_min`) | ✅ | `model_validator` in `JobCreate/JobUpdate` |
| Cover letter length bounds (10–5000) | ✅ | `schemas/application.py` |
| `resume_url` is a valid URL | ✅ | `HttpUrl` type |
| Response models prevent password leakage | ✅ | `UserResponse` omits `hashed_password` |
| Enum validation (role, status, job_type) | ✅ | Pydantic + SQLAlchemy `Enum(validate_strings=True)` |

### Deliberately scoped out

- **External observability** (metrics, traces) — out of scope for this assessment.
- **Distributed rate-limit store** — the included limiter is in-memory; use Redis or another shared store for multi-instance production.
- **JWT refresh tokens** — out of scope; users re-login after access-token expiry.
- **Resume file uploads** — candidates provide `resume_url` links.

---

## Project Overview

This platform connects **HR managers** and **job candidates** through a centralised recruitment workflow:

- HR managers post and manage job openings, review incoming applications, and update applicant statuses (Pending → Reviewed → Shortlisted → Rejected).
- Candidates browse open positions, submit applications with cover letters, and track their application status in real time.

The application enforces strict role-based access control — every endpoint is protected by the authenticated user's role.

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
└─────────────────────┬─────────────────────────────────────┘
                      │ raises Domain* exceptions
┌─────────────────────▼─────────────────────────────────────┐
│ Services     app/services/                                │
│   Business rules + orchestration                          │
│   UserService · AuthService · JobService ·                │
│   ApplicationService                                      │
└─────────────────────┬─────────────────────────────────────┘
                      │
┌─────────────────────▼─────────────────────────────────────┐
│ Repositories app/repositories/                            │
│   Data access only                                        │
│   BaseRepository[T] (get / add / save / delete /          │
│                       paginate) +                         │
│   UserRepository · JobRepository · ApplicationRepository  │
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
- `app/dependencies.py` — typed `Annotated` aliases (`CurrentUser`, `HrUser`, `CandidateUser`, `JobServiceDep`, …) so routers stay declarative.

### Request flow (HR creates a job)

1. `POST /api/v1/jobs` with JSON body and `Authorization: Bearer <jwt>`.
2. `get_current_user` decodes the JWT (HS256 + `SECRET_KEY`), validates `type=access`, looks up the user via `UserRepository`, rejects inactive accounts.
3. `require_hr` checks the role.
4. `JobCreate` Pydantic schema validates the body (length bounds, enum, salary range).
5. Route delegates to `JobService.create(payload, hr_user)`.
6. Service constructs the ORM object and calls `JobRepository.add()` which commits.
7. Result is serialised back through `JobResponse`.

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
3. Runs `python -m app.seed` to create the assessment HR and Candidate users.
4. Starts Uvicorn.

Create a root `.env` only if you want to override the documented defaults.

---

## Environment Configuration

All secrets and tunables come from environment variables — no hardcoded values in application code.

### Files

| File | Tracked in git? | Purpose |
|---|---|---|
| `.env.example` (root) | Yes | Template documenting every variable |
| `fastapi-app/.env.example` | Yes | Backend-only template |
| `.env` (root) | **No** (gitignored) | Optional local overrides; Docker Compose also works without it |
| `fastapi-app/.env` | **No** (gitignored) | Loaded by pydantic-settings for local uvicorn runs |

### Flow

```
.env (root)
   │
   └─→ docker-compose variable substitution for any values you override.

docker-compose.yml
   │
   ├─→ db service       — uses `${VAR:-default}` values for POSTGRES_USER/PASSWORD/DB
   │
   └─→ backend service  — injects required app settings with `${VAR:-default}`;
                          DATABASE_URL always points at the `db` container's
                          hostname inside the Docker network.

fastapi-app/.env
   │
   └─→ pydantic-settings reads it when running uvicorn outside Docker.
```

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
| `SEED_DATA` | no (default `false`) | If `true`, auto-creates HR + Candidate users on startup |
| `SEED_HR_EMAIL` / `SEED_HR_PASSWORD` / `SEED_CANDIDATE_EMAIL` / `SEED_CANDIDATE_PASSWORD` | only if `SEED_DATA=true` | Seed credentials |

See `.env.example` for the full annotated list.

---

## API Reference

Base URL: `http://localhost:8000`. Interactive Swagger UI: `/api/v1/docs`.

All `/jobs`, `/applications`, and `/hr/*` endpoints require `Authorization: Bearer <jwt>`. Errors follow the shape `{"detail": "human-readable message"}`.

### Authentication

| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/api/v1/auth/register` | public | Register a user; HR needs `hr_invite_code` |
| POST | `/api/v1/auth/login` | public | Exchange credentials for a JWT |
| GET | `/api/v1/auth/me` | any | Return the authenticated user |

### Jobs

| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/api/v1/jobs` | HR | Create a job posting |
| GET | `/api/v1/jobs` | any | List jobs (candidates auto-filtered to `status=open`). Supports `?status`, `?location`, `?job_type`, `?search`, `?limit` (max 100), `?offset` |
| GET | `/api/v1/jobs/{job_id}` | any | Get one job (candidates get 404 on closed jobs) |
| PUT | `/api/v1/jobs/{job_id}` | HR | Partial update; validates `salary_max ≥ salary_min` |
| DELETE | `/api/v1/jobs/{job_id}` | HR | Delete; returns 204 |
| GET | `/api/v1/jobs/{job_id}/applications` | HR | Paginated applicants; supports `?status` |

### Applications

| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/api/v1/applications` | Candidate | Apply to a job. 400 if job closed, 409 on duplicate |
| GET | `/api/v1/applications/my` | Candidate | List own applications; supports `?status` |
| PATCH | `/api/v1/applications/{application_id}/status` | HR | Update status (`pending`/`reviewed`/`shortlisted`/`rejected`) |

### HR

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/api/v1/hr/dashboard` | HR | Aggregate job + application counts + 10 most recent applications |

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
| 400 | Business-rule violation (e.g. apply to closed job) |
| 401 | Missing / invalid / expired token |
| 403 | Authenticated but wrong role / missing invite code |
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

---

## Project Structure

```
skypoint-test/
├── .env.example                # Root env template (docker-compose vars)
├── .gitignore
├── docker-compose.yml          # db + backend + frontend orchestration
├── README.md
│
├── fastapi-app/
│   ├── .env.example
│   ├── .dockerignore
│   ├── Dockerfile              # Multi-stage, non-root user, curl healthcheck
│   ├── entrypoint.sh           # alembic upgrade head → uvicorn (N workers)
│   ├── alembic.ini
│   ├── alembic/
│   │   ├── env.py
│   │   ├── script.py.mako
│   │   └── versions/
│   │       └── 20260519_0001_initial_schema.py
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
│   │   │   └── application.py
│   │   │
│   │   ├── schemas/            # Pydantic request/response models
│   │   │   ├── user.py
│   │   │   ├── auth.py
│   │   │   ├── job.py
│   │   │   ├── application.py
│   │   │   └── dashboard.py
│   │   │
│   │   ├── repositories/       # Data access — no business logic
│   │   │   ├── base.py
│   │   │   ├── user_repository.py
│   │   │   ├── job_repository.py
│   │   │   └── application_repository.py
│   │   │
│   │   ├── services/           # Business logic — no FastAPI imports
│   │   │   ├── user_service.py
│   │   │   ├── auth_service.py
│   │   │   ├── job_service.py
│   │   │   └── application_service.py
│   │   │
│   │   └── routers/            # HTTP plumbing — no DB, no business logic
│   │       ├── auth.py
│   │       ├── jobs.py
│   │       ├── applications.py
│   │       └── hr.py
│   │
│   └── tests/                  # Backend unit/integration tests
│       ├── conftest.py
│       ├── test_auth_service.py
│       ├── test_auth_routes.py
│       ├── test_dependencies.py
│       └── test_seed.py
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
        ├── app/                # Query client, auth context, lazy router
        ├── components/
        │   ├── ui/             # shadcn-style primitives
        │   └── common/         # reusable app components
        ├── features/           # reusable forms/cards by domain
        ├── layouts/            # protected application shell
        ├── lib/                # utilities + formatters
        ├── pages/              # lazy-loaded route pages
        └── test/               # Vitest setup
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.12, FastAPI ≥0.115, SQLAlchemy 2, Alembic, Pydantic v2, pydantic-settings, python-jose (JWT), bcrypt |
| Database | PostgreSQL 16 |
| Frontend | React 18, Vite, TypeScript, React Router, TanStack Query, Axios, Tailwind CSS, shadcn-style Radix primitives, React Hook Form, Zod, Framer Motion, Lucide icons |
| Containerisation | Docker, Docker Compose v2, Nginx |
| Testing | pytest, pytest-cov, httpx, Vitest, Testing Library, jsdom, V8 coverage |

---

## Testing

### Backend

The backend test suite targets the current router → service → repository layering and covers auth, role guards, jobs, applications, dashboard aggregates, seeding, security headers, request IDs, and rate limiting.

```bash
cd fastapi-app
python -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python -m pytest
```

Latest local result: **84 passed**, **97.01% coverage**.

### Frontend

Frontend unit tests cover API client wrappers, defensive token storage, reusable common components, job/application forms, and job cards.

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
|---|---|
| Dashboard with stats | `/hr` | `GET /api/v1/hr/dashboard` |
| Post a new job | `/hr/jobs` → New job | `POST /api/v1/jobs` |
| Edit / close a job | `/hr/jobs` → Edit | `PUT /api/v1/jobs/{id}` |
| Delete a job | `/hr/jobs` → Delete | `DELETE /api/v1/jobs/{id}` |
| View applicants for a job | `/hr/jobs` → Applicants | `GET /api/v1/jobs/{id}/applications` |
| Update applicant status | Applicants dialog status dropdown | `PATCH /api/v1/applications/{id}/status` |

### Candidate (`user@test.com`)

Sign in at `http://localhost:5173/auth`, then use the Candidate navigation.

| Feature | UI path | Endpoint(s) |
|---|---|
| Browse open jobs | `/candidate/jobs` | `GET /api/v1/jobs` |
| Search jobs | `/candidate/jobs` search input | `GET /api/v1/jobs?search=…` |
| Apply to a job | `/candidate/jobs` → Apply | `POST /api/v1/applications` |
| Track my applications | `/candidate/applications` | `GET /api/v1/applications/my` |

---

## Development Plan (Phases)

### Phase 1 — Backend Foundation **(done)**

- Modular `app/` layout (models, schemas, services, routers, dependencies).
- SQLAlchemy 2 ORM models: `User`, `JobPosting`, `Application` with composite indexes and `UNIQUE(job_id, candidate_id)`.
- JWT auth with `type=access` claim, role-based access control, timing-safe authentication, strong password regex.
- Alembic migrations, idempotent startup seeding.
- Multi-stage Dockerfile (non-root user, healthcheck), `entrypoint.sh` (DB wait → migrations → seed → uvicorn), compose orchestration with healthchecks + named network/volume + development defaults.
- 69 tests at 95.14% coverage (subsequently invalidated by the Phase 2 refactor — rebuild in Phase 5).

### Phase 2 — Jobs + Applications APIs **(done)**

- **Layered architecture** introduced: routers (HTTP) → services (business logic) → repositories (data access).
- **Core layer** (`app/core/`): `exceptions.py` (`DomainError` hierarchy), `security.py` (bcrypt + JWT helpers moved out of services), `pagination.py` (shared `PaginationParams` dependency and generic `Page[T]`).
- **Repositories** (`app/repositories/`): `BaseRepository[T]` with shared CRUD + `paginate()`; domain repositories add specific queries (`get_by_email`, `list_jobs`, `status_counts`, etc.) — DRY enforced.
- **Services** (`app/services/`): `UserService`, `AuthService`, `JobService`, `ApplicationService` — raise domain exceptions only, never `HTTPException`.
- **Schemas** split per aggregate (`user.py`, `auth.py`, `job.py`, `application.py`, `dashboard.py`).
- **10 new endpoints** for jobs / applications / HR dashboard with role guards, pagination, search & filters.
- **Bug-class prevention**: `salary_max ≥ salary_min`, candidate visibility of closed jobs blocked, duplicate-application detection, can't-apply-to-closed-job rule.
- **N+1 avoidance** via `joinedload`; single-round-trip pagination via `COUNT(*)` on unpaginated subquery.
- Seed data now creates assessment users only; jobs/applications are created through the API/UI.
- **Refactored existing code**: old `app/services/auth.py` deleted, auth router slimmed to delegate to services, `dependencies.py` exposes typed `Annotated` aliases (`CurrentUser`, `HrUser`, `CandidateUser`, `JobServiceDep`, etc.) so routers stay declarative.

### Phase 3 — Frontend Foundation **(done)**

React Router v6, Axios + interceptors, TanStack Query, `AuthContext`, protected route guards, login + register pages.

### Phase 4 — Frontend Feature Pages **(done)**

HR dashboard, jobs management, application review. Candidate job board, job detail/apply, my applications.

### Phase 5 — Tests **(done)**

Backend tests rewritten for the new layering at >90% coverage. Frontend Vitest + Testing Library tests added with V8 coverage reports.

### Phase 6 — Docker hardening & Security **(done)**

Frontend Nginx multi-stage build + `/api` proxy, healthcheck-gated Compose startup, auth rate limiting, backend/frontend security headers, and request-ID middleware.

### Phase 7 — README polish & final review **(done)**

README updated with current architecture, run flow, test credentials, feature walkthrough, test commands, coverage results, and known limitations.

---

## Known Limitations

- Resume upload is not implemented — `resume_url` accepts a URL only.
- Email notifications are scoped out.
- No JWT refresh tokens — expiry requires re-login.
- Auth rate limiting is in-memory and per backend worker; use a shared store such as Redis for horizontally scaled deployments.
- Metrics/traces are not included.
