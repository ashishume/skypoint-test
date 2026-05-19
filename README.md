# Job Recruitment Management System

A full-stack web application for managing job postings and candidate applications, built with FastAPI, React, and PostgreSQL — fully containerised with Docker Compose.

---

## Table of Contents

1. [Project Status](#project-status)
2. [Project Overview](#project-overview)
3. [Architecture](#architecture)
4. [How to Run](#how-to-run)
5. [Environment Configuration](#environment-configuration)
6. [API Reference (Phase 1)](#api-reference-phase-1)
7. [Test Credentials](#test-credentials)
8. [Project Structure](#project-structure)
9. [Tech Stack](#tech-stack)
10. [Testing](#testing)
11. [Feature Walkthrough (planned)](#feature-walkthrough-planned)
12. [Development Plan (Phases)](#development-plan-phases)
13. [Known Limitations](#known-limitations)

---

## Project Status

| Phase | Scope | Status |
|---|---|---|
| **1** | Backend foundation: schema, JWT auth, register/login/me, seed, Docker | **Done** |
| 2 | Backend: jobs + applications APIs, HR dashboard | Pending |
| 3 | Frontend: shell, routing, auth state | Pending |
| 4 | Frontend: HR + Candidate feature pages | Pending |
| 5 | Tests: frontend Vitest + expand backend tests | Pending (backend tests already at 95%) |
| 6 | Docker hardening (Nginx, rate limit, headers) | Pending |
| 7 | README polish, sample job seed, final review | In progress |

What works today:
- `docker compose up --build` brings up Postgres + FastAPI backend.
- Backend exposes `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `GET /api/v1/auth/me`, and `/health`.
- Database schema for `users`, `job_postings`, `applications` is migrated on startup.
- Two seed users (HR + Candidate) are created on first boot.
- Frontend is still the original placeholder UI — it does not yet talk to the new auth API.

---

## Project Overview

This platform connects **HR managers** and **job candidates** through a centralised recruitment workflow:

- HR managers post and manage job openings, review incoming applications, and update applicant statuses (Pending → Reviewed → Shortlisted → Rejected).
- Candidates browse open positions, submit applications with cover letters, and track their application status in real time.

The application enforces strict role-based access control — every endpoint and UI route is protected by the authenticated user's role.

---

## Architecture

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

Request flow for a protected backend endpoint:

1. Client sends `Authorization: Bearer <jwt>`.
2. FastAPI's `OAuth2PasswordBearer` extracts the token; `get_current_user` decodes it (HS256 + `SECRET_KEY`), validates the `type=access` claim, looks up the user, and rejects inactive accounts.
3. Role guards (`require_hr`, `require_candidate`) enforce per-route access.
4. SQLAlchemy session is opened per-request and closed on response.

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

The backend will be available at **http://localhost:8000** (Swagger docs at **http://localhost:8000/api/v1/docs**). On first boot the backend runs Alembic migrations and seeds the two test users.

No additional configuration is required — `docker-compose.yml` has development defaults baked in via `${VAR:-default}` substitution. Override anything by creating a `.env` file (see next section).

---

## Environment Configuration

All secrets and tunables come from environment variables — no hardcoded values in application code.

### Files

| File | Tracked in git? | Purpose |
|---|---|---|
| `.env.example` (root) | Yes | Template documenting every variable |
| `fastapi-app/.env.example` | Yes | Backend-only template |
| `.env` (root) | **No** (gitignored) | Local development values; loaded by `docker-compose` |
| `fastapi-app/.env` | **No** (gitignored) | Loaded by `pydantic-settings` when running uvicorn locally |

### Flow

```
.env (root)
   │
   ├─→ docker-compose variable substitution (${POSTGRES_USER}, ${BACKEND_PORT}, …)
   │
   ├─→ db service       — env_file: .env injects POSTGRES_USER/PASSWORD/DB
   │
   └─→ backend service  — env_file: .env injects ALL vars into the container;
                          DATABASE_URL is then overridden so it points at
                          the `db` container's hostname inside the Docker network.

fastapi-app/.env
   │
   └─→ pydantic-settings reads it when running `uvicorn app.main:app`
       outside Docker (e.g. for fast local iteration against a local Postgres).
```

### Key variables

| Variable | Required | Description |
|---|---|---|
| `SECRET_KEY` | yes (≥32 chars) | JWT signing key. Generate with `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `HR_INVITE_CODE` | yes (≥8 chars) | Code that must be supplied when registering an HR account |
| `DATABASE_URL` | yes | SQLAlchemy URL, e.g. `postgresql+psycopg2://user:pass@host:5432/db` |
| `ALGORITHM` | no (default `HS256`) | JWT algorithm; one of HS256 / HS384 / HS512 |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | no (default `30`) | Token lifetime |
| `BCRYPT_ROUNDS` | no (default `12`) | bcrypt cost factor |
| `DB_POOL_SIZE` / `DB_MAX_OVERFLOW` | no | SQLAlchemy connection pool sizing |
| `CORS_ORIGINS` | no | Comma-separated list of allowed frontend origins |
| `SEED_DATA` | no (default `false`) | Set to `true` to auto-create HR + Candidate users on startup |
| `SEED_HR_EMAIL`, `SEED_HR_PASSWORD`, `SEED_CANDIDATE_EMAIL`, `SEED_CANDIDATE_PASSWORD` | only if `SEED_DATA=true` | Seed user credentials |

See `.env.example` for the full annotated list.

---

## API Reference (Phase 1)

Base URL: `http://localhost:8000`. Interactive Swagger UI: `/api/v1/docs`.

### `POST /api/v1/auth/register`

Register a new user. Candidates need no extra step; HR registration requires the `HR_INVITE_CODE`.

**Request body**:
```json
{
  "email": "alice@example.com",
  "password": "Strong@Pass1",
  "full_name": "Alice Example",
  "role": "candidate",
  "hr_invite_code": "<required only when role=hr>"
}
```

**Password rules**: 8–128 chars, must contain one uppercase, one lowercase, one digit, one special character.

**Responses**:
- `201 Created` — returns `UserResponse`
- `403 Forbidden` — invalid/missing HR invite code when registering as HR
- `409 Conflict` — email already exists
- `422 Unprocessable Entity` — validation error

### `POST /api/v1/auth/login`

Exchange credentials for a JWT.

**Request body**:
```json
{ "email": "alice@example.com", "password": "Strong@Pass1" }
```

**Responses**:
- `200 OK`
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "expires_in": 1800,
    "user": { "id": 1, "email": "...", "full_name": "...", "role": "candidate", "is_active": true, "created_at": "..." }
  }
  ```
- `401 Unauthorized` — wrong password, unknown email, or inactive account (response timing is constant to prevent user enumeration)

### `GET /api/v1/auth/me`

Returns the currently authenticated user. Requires `Authorization: Bearer <token>`.

**Responses**:
- `200 OK` — returns `UserResponse`
- `401 Unauthorized` — missing / invalid / expired / non-access-type token, or token references a deleted/inactive user

### `GET /health`

Liveness probe used by the Docker healthcheck. Returns `{"status": "healthy", "service": "..."}`.

---

## Test Credentials

These accounts are seeded automatically when `SEED_DATA=true` (the default in `docker-compose.yml`).

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
│   ├── .env.example            # Backend env template
│   ├── .dockerignore
│   ├── Dockerfile              # Multi-stage, non-root user, curl healthcheck
│   ├── entrypoint.sh           # Runs `alembic upgrade head` then uvicorn
│   ├── alembic.ini
│   ├── alembic/
│   │   ├── env.py
│   │   ├── script.py.mako
│   │   └── versions/
│   │       └── 20260519_0001_initial_schema.py
│   ├── pytest.ini              # Coverage gate: --cov-fail-under=90
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py             # FastAPI factory, lifespan, exception handlers
│   │   ├── config.py           # pydantic-settings (env-driven, validated)
│   │   ├── database.py         # SQLAlchemy engine + pool + get_db dep
│   │   ├── dependencies.py     # get_current_user, require_hr, require_candidate
│   │   ├── seed.py             # Idempotent user seeding
│   │   ├── models/
│   │   │   ├── base.py         # DeclarativeBase + TimestampMixin
│   │   │   ├── user.py         # User + UserRole enum
│   │   │   ├── job.py          # JobPosting + JobType + JobStatus
│   │   │   └── application.py  # Application + ApplicationStatus
│   │   ├── schemas/
│   │   │   └── auth.py         # UserRegister, UserLogin, UserResponse, TokenResponse
│   │   ├── services/
│   │   │   └── auth.py         # bcrypt hashing, JWT, timing-safe authenticate_user
│   │   └── routers/
│   │       └── auth.py         # /register, /login, /me
│   └── tests/
│       ├── conftest.py         # SQLite in-memory + fixture user factory
│       ├── test_auth_service.py
│       ├── test_auth_routes.py
│       ├── test_dependencies.py
│       └── test_seed.py
│
└── reactjs-app/                # Frontend (still placeholder — Phase 3/4)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.12, FastAPI ≥0.115, SQLAlchemy 2, Alembic, Pydantic v2, pydantic-settings, python-jose (JWT), bcrypt |
| Database | PostgreSQL 16 |
| Frontend | React 18, Vite (currently placeholder; React Router + TanStack Query + Tailwind planned for Phase 3) |
| Containerisation | Docker, Docker Compose v2 |
| Testing | pytest, pytest-cov, httpx (async TestClient) |

---

## Testing

Backend tests use SQLite in-memory for speed; models use cross-database SQLAlchemy types so behaviour matches production PostgreSQL.

```bash
cd fastapi-app
python -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python -m pytest
```

Current state:

```
69 passed in 0.28s
Total coverage: 95.14%   (gate: ≥90%)

app/dependencies.py    100%
app/services/auth.py   100%
app/schemas/auth.py    100%
app/models/*           95–100%
app/routers/auth.py     92%
app/config.py           98%
app/main.py             90%
app/seed.py             88%
```

Coverage report HTML is written to `fastapi-app/htmlcov/`.

What's covered:
- **Password hashing**: bcrypt format, salting, success / wrong password / empty / invalid hash
- **JWT**: create + decode, extra claims, reserved-claim stripping, expired, malformed, wrong secret
- **`authenticate_user`**: success, case-insensitive email, wrong password, unknown email (dummy-hash path), inactive user
- **Register**: candidate happy path, HR invite-code flow (success + 2 failure cases), email normalization, full_name stripping, duplicate email (case-insensitive), invalid email, 6 weak-password cases (parametrised), missing fields, blank full name, invalid role
- **Login**: success, valid JWT in response, case-insensitive email, wrong password, unknown email, inactive user, missing fields, invalid email
- **/me**: success, no token, invalid token, missing Bearer prefix, wrong scheme, expired token, non-integer subject, nonexistent user, inactive user, wrong token type, missing subject claim
- **Role guards**: `require_hr` / `require_candidate` allow/block matrix
- **Seed**: disabled, creates users, idempotent, skipped when credentials missing

---

## Feature Walkthrough (planned)

> The endpoints below are part of Phase 2; the UI pages are part of Phases 3–4. Phase 1 only ships the auth endpoints.

### HR Manager (`admin@test.com`)

| Feature | How to access |
|---|---|
| Dashboard with stats | Lands here after login — shows total jobs, applications by status |
| Post a new job | HR → Jobs → "Post New Job" |
| Edit / close a job | HR → Jobs → click a job → Edit or toggle status |
| View applicants for a job | HR → Jobs → click a job → Applications tab |
| Update applicant status | Applications tab → status dropdown per applicant |

### Candidate (`user@test.com`)

| Feature | How to access |
|---|---|
| Browse open jobs | Job Board after login |
| Search / filter jobs | Search + filters on Job Board |
| Apply to a job | Job Detail page → "Apply Now" → cover letter form |
| Track my applications | My Applications page — status badges |

---

## Development Plan (Phases)

The application is built in seven independent phases. Each phase produces a working checkpoint and can be implemented separately.

### Phase 1 — Backend Foundation **(done)**

- `app/` modular structure (models, schemas, routers, services, dependencies)
- SQLAlchemy 2 ORM models: `User`, `JobPosting`, `Application` (all three tables created so Phase 2 can plug straight in)
- Indexes: unique on `users.email`, composite `(role, is_active)`, `(status, created_at)`, `(candidate_id, status)`, `UNIQUE (job_id, candidate_id)`
- JWT auth (HS256/384/512 configurable) with `type=access` claim enforcement
- bcrypt password hashing with configurable cost factor and **timing-safe `authenticate_user`** (dummy hash on unknown emails)
- Strong password validation (regex)
- Alembic migrations with initial schema
- Idempotent startup seeding (env-driven, no hardcoded credentials)
- Multi-stage Dockerfile with non-root user and `curl` healthcheck
- Entrypoint runs migrations before serving traffic
- Compose orchestration with healthchecks, named network, named volume, `env_file: .env`
- 69 tests at 95.14% coverage with a 90% gate enforced by `pytest.ini`

### Phase 2 — Jobs + Applications APIs

| Method | Path | Role | Description |
|---|---|---|---|
| `POST` | `/jobs` | HR | Create job posting |
| `GET` | `/jobs` | both | List jobs (candidates see only `status=open`) |
| `GET` | `/jobs/{id}` | both | Job detail |
| `PUT` | `/jobs/{id}` | HR | Update job |
| `DELETE` | `/jobs/{id}` | HR | Delete job |
| `GET` | `/jobs/{id}/applications` | HR | View applicants |
| `POST` | `/applications` | Candidate | Apply to a job |
| `GET` | `/applications/my` | Candidate | View own applications |
| `PATCH` | `/applications/{id}/status` | HR | Update application status |
| `GET` | `/hr/dashboard` | HR | Stats |

Access-control rules: candidates can never write to jobs (403); HR can never apply (403); duplicate applications → 409; applying to a closed job → 400.

### Phase 3 — Frontend Foundation

React Router routes, Axios client with auth header interceptor, `AuthContext`, protected route guards, login + register pages.

### Phase 4 — Frontend Feature Pages

HR dashboard, jobs management, application review. Candidate job board, job detail/apply, my applications.

### Phase 5 — Tests (frontend)

Vitest + Testing Library component tests; expand backend tests for Phase 2 endpoints.

### Phase 6 — Docker hardening & Security

Frontend Nginx multi-stage build + `/api` proxy, CORS tightened to frontend origin, rate limiting (`slowapi`) on auth endpoints, security headers, request logging middleware.

### Phase 7 — README polish & final review

Sample job seed data, final code review pass, screenshots.

---

## Known Limitations

- Frontend has not been built against the new backend yet — that's Phase 3/4.
- Resume upload is not implemented — `resume_url` will accept a text URL only.
- Email notifications are scoped out.
- No JWT refresh tokens — expiry requires re-login.
- No rate limiting yet — comes in Phase 6.
- Test suite is currently backend-only; frontend tests come in Phase 5.
