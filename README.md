# RecruitFlow

RecruitFlow is a full-stack job portal for HR teams and candidates. HR users can manage job postings, review applications, update candidate status, and message applicants. Candidate users can browse jobs, apply, maintain a profile, view recommendations, track applications, and reply to recruiter messages.

The project is built for the assessment requirement: frontend UI, backend API, PostgreSQL database, Docker Compose orchestration, authentication, two user roles, validation, tests, and documentation.

## Architecture

```text
Browser
  |
  v
React + Vite frontend served by Nginx
http://localhost:5173
  |
  | /api proxy inside Docker network
  v
FastAPI backend
http://localhost:8000
  |                         |
  | SQLAlchemy + Alembic    | auth rate-limit counters
  v                         v
PostgreSQL 16              Redis 7
volume: recruitflow_postgres_data
volume: recruitflow_redis_data
```

Backend code follows a layered structure:

```text
routers -> services -> repositories -> SQLAlchemy models -> PostgreSQL
```

Key backend concerns:

- Routers handle HTTP, dependency injection, and response models.
- Services contain business rules and role/ownership checks.
- Repositories contain database access only.
- Alembic runs migrations automatically on backend startup.
- Seed data is idempotent and is created automatically for assessment use.

## How to Run

Prerequisite: Docker Desktop with Docker Compose v2.

```bash
git clone <your-repo-url>
cd skypoint-test
docker compose up --build
```

Open:

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:8000/health`
- API docs: `http://localhost:8000/api/v1/docs`

No manual environment setup is required for assessment. Docker Compose includes development defaults and starts:

- `db`: PostgreSQL 16
- `redis`: Redis 7 for shared auth rate limiting
- `backend`: FastAPI API
- `frontend`: React app served by Nginx

To reset all persisted local data:

```bash
docker compose down -v
docker compose up --build
```

## Test Credentials

These users are seeded automatically when the stack starts.

| Role | Email | Password |
|---|---|---|
| HR | `admin@test.com` | `Admin@1234` |
| Candidate | `user@test.com` | `User@1234` |

The seed also creates demo jobs, a candidate profile, one application, and a starter message thread so both roles have data immediately.

## Feature Walkthrough

### HR

Login with the HR credentials and use the HR navigation.

| Feature | Path |
|---|---|
| Dashboard with job/application metrics | `/hr` |
| Create, edit, close, and delete jobs | `/hr/jobs` |
| Search and filter HR-owned jobs | `/hr/jobs` |
| View applicants for a job | `/hr/jobs` |
| Update applicant status | applicant table/status dropdown |
| View candidate profile and match score | applicant profile dialog |
| Message candidates who applied to HR-owned jobs | candidate profile dialog or `/hr/messages` |
| View and reply to candidate messages | `/hr/messages` |
| Browse/search applications across HR-owned jobs | `/hr/candidates` |

Important ownership rule: HR users only see and manage jobs, applications, dashboard data, and message threads connected to their own jobs.

### Candidate

Login with the Candidate credentials and use the Candidate navigation.

| Feature | Path |
|---|---|
| Browse open jobs | `/candidate/jobs` |
| Search/filter jobs by title, location, skill, type, and salary | `/candidate/jobs` |
| Apply to open jobs | job detail/apply flow |
| Track active applications | `/candidate/applications` |
| View closed-job applications in archived form | `/candidate/applications` |
| Create/update candidate profile | `/candidate/profile` |
| View match-based job recommendations | `/candidate/profile` and `/candidate/jobs` |
| Read recruiter messages | `/candidate/messages` |
| Reply to recruiter messages | `/candidate/messages` |

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TypeScript, React Router, TanStack Query, Axios, Tailwind CSS, Radix/shadcn-style UI primitives, React Hook Form, Zod, Vitest |
| Backend | Python 3.12, FastAPI, SQLAlchemy 2, Alembic, Pydantic v2, python-jose JWT, bcrypt, pytest |
| Database | PostgreSQL 16 |
| Cache / Rate Limiting | Redis 7 |
| DevOps | Docker, Docker Compose, Nginx |

## Testing

Backend:

```bash
cd fastapi-app
python -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python -m pytest
```

Latest verified result:

- `98 passed`
- `95.96%` backend coverage

Frontend:

```bash
cd reactjs-app
npm install
npm run test:coverage
```

Latest verified result:

- `31 passed`
- Statements: `98.46%`
- Branches: `90.84%`
- Functions: `92.22%`
- Lines: `98.46%`

Frontend production build:

```bash
cd reactjs-app
npm install
npm run build
```

Latest verified result: build passed.

## Security and Code Quality Notes

- JWT authentication with HTTP-only session cookie support.
- Role-based access control for HR and Candidate users.
- HR ownership isolation for jobs, applications, dashboard data, and message threads.
- Passwords are hashed with bcrypt.
- HR registration requires an invite code.
- Auth rate limiting is backed by Redis in Docker, so counters are shared across backend workers.
- Backend validation uses Pydantic schemas.
- Frontend form validation uses Zod and React Hook Form.
- Configuration is environment-driven; no real secrets are committed.
- Database migrations run through Alembic.
- PostgreSQL and Redis data persist through named Docker volumes.
- Backend uses router/service/repository separation.
- Tests cover auth, role guards, jobs, applications, dashboard, messaging, seed data, frontend API integration, forms, filters, and key UI workflows.

## Known Limitations

- Resume upload is URL-based only; file upload/storage is not included.
- Messaging is persisted and reply-based, but not real-time WebSocket messaging.
- Email notifications are not included.
- JWT refresh tokens are not included; users re-login after token expiry.
- Distributed abuse protection is limited to auth endpoints; broader API rate limiting could be added for production traffic.

## Claude Code Usage

Claude Code was used as the primary development assistant for implementation, review, test generation, debugging, and documentation cleanup. Final verification was performed with local backend/frontend test commands and Docker-oriented review.
