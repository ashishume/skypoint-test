"""Integration tests for jobs, applications, and HR dashboard endpoints."""
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.application import Application, ApplicationStatus
from app.models.job import JobPosting, JobStatus, JobType
from app.models.user import User

JOBS = "/api/v1/jobs"
APPLICATIONS = "/api/v1/applications"
MY_APPLICATIONS = "/api/v1/applications/my"
HR_DASHBOARD = "/api/v1/hr/dashboard"
CANDIDATE_PROFILE = "/api/v1/candidate/profile"
CANDIDATE_RECOMMENDATIONS = "/api/v1/candidate/recommendations"
CANDIDATE_JOB_MATCHES = "/api/v1/candidate/job-matches"


def auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def job_payload(**overrides):
    payload = {
        "title": "Backend Engineer",
        "description": "Build reliable APIs for hiring teams.",
        "skills": ["python", "fastapi", "postgresql"],
        "location": "Remote",
        "job_type": "full_time",
        "salary_min": 100000,
        "salary_max": 200000,
        "status": "open",
    }
    payload.update(overrides)
    return payload


def create_job(
    db: Session,
    hr_user: User,
    *,
    title: str = "Backend Engineer",
    status: JobStatus = JobStatus.OPEN,
    job_type: JobType = JobType.FULL_TIME,
    location: str = "Remote",
    skills: list[str] | None = None,
) -> JobPosting:
    job = JobPosting(
        title=title,
        description="Build reliable APIs for hiring teams.",
        skills=list(skills or ["python", "fastapi"]),
        location=location,
        job_type=job_type,
        salary_min=100000,
        salary_max=200000,
        status=status,
        created_by_id=hr_user.id,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def create_application(
    db: Session,
    job: JobPosting,
    candidate_user: User,
    *,
    status: ApplicationStatus = ApplicationStatus.PENDING,
) -> Application:
    application = Application(
        job_id=job.id,
        candidate_id=candidate_user.id,
        cover_letter="I am interested in this role and can contribute immediately.",
        resume_url="https://example.com/resume.pdf",
        status=status,
    )
    db.add(application)
    db.commit()
    db.refresh(application)
    return application


class TestJobRoutes:
    def test_hr_can_create_job(self, client: TestClient, hr_token: str):
        response = client.post(JOBS, json=job_payload(), headers=auth_header(hr_token))

        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "Backend Engineer"
        assert data["skills"] == ["python", "fastapi", "postgresql"]
        assert data["status"] == "open"
        assert data["job_type"] == "full_time"
        assert data["applications_count"] == 0

    def test_candidate_cannot_create_job(self, client: TestClient, candidate_token: str):
        response = client.post(JOBS, json=job_payload(), headers=auth_header(candidate_token))

        assert response.status_code == 403

    def test_create_job_validates_salary_range(self, client: TestClient, hr_token: str):
        response = client.post(
            JOBS,
            json=job_payload(salary_min=300000, salary_max=200000),
            headers=auth_header(hr_token),
        )

        assert response.status_code == 422

    def test_list_jobs_filters_for_candidate(
        self,
        client: TestClient,
        db: Session,
        hr_user: User,
        candidate_token: str,
    ):
        create_job(db, hr_user, title="Open API Engineer", status=JobStatus.OPEN)
        create_job(db, hr_user, title="Closed API Engineer", status=JobStatus.CLOSED)

        response = client.get(JOBS, headers=auth_header(candidate_token))

        assert response.status_code == 200
        body = response.json()
        assert body["total"] == 1
        assert body["items"][0]["title"] == "Open API Engineer"

    def test_hr_job_list_includes_applicant_counts(
        self,
        client: TestClient,
        db: Session,
        hr_user: User,
        candidate_user: User,
        hr_token: str,
    ):
        job = create_job(db, hr_user, title="Applicant Count Engineer")
        create_application(db, job, candidate_user)

        response = client.get(JOBS, headers=auth_header(hr_token))

        assert response.status_code == 200
        listed_job = next(item for item in response.json()["items"] if item["id"] == job.id)
        assert listed_job["applications_count"] == 1

    def test_hr_can_search_and_filter_jobs(
        self,
        client: TestClient,
        db: Session,
        hr_user: User,
        hr_token: str,
    ):
        create_job(db, hr_user, title="Backend Engineer", location="Remote")
        create_job(db, hr_user, title="Design Lead", location="Bangalore", job_type=JobType.CONTRACT)
        create_job(
            db,
            hr_user,
            title="Frontend Developer",
            location="Pune",
            skills=["backend", "typescript"],
        )

        response = client.get(
            JOBS,
            params={"search": "Backend", "location": "remote", "job_type": "full_time"},
            headers=auth_header(hr_token),
        )
        # Free-text search scans title/description/location and exact skill tokens.
        broad_response = client.get(
            JOBS,
            params={"search": "backend"},
            headers=auth_header(hr_token),
        )
        # Dedicated skill filter uses JSON-token matching: it matches
        # Frontend Developer (skill=backend) and Backend Engineer (default
        # seeded skills don't include backend) — only the Frontend Developer.
        skill_response = client.get(
            JOBS,
            params={"skill": "backend"},
            headers=auth_header(hr_token),
        )

        assert response.status_code == 200
        body = response.json()
        assert body["total"] == 1
        assert body["items"][0]["title"] == "Backend Engineer"
        assert broad_response.status_code == 200
        assert broad_response.json()["total"] == 2
        assert skill_response.status_code == 200
        assert skill_response.json()["total"] == 1
        assert skill_response.json()["items"][0]["title"] == "Frontend Developer"

    def test_skill_filter_uses_token_match_not_substring(
        self,
        client: TestClient,
        db: Session,
        hr_user: User,
        hr_token: str,
    ):
        # Regression: substring-based skill matching used to falsely match
        # "go" against "django" / "mongo". The new JSON-token-aware filter
        # must not.
        create_job(db, hr_user, title="Go Backend", skills=["go", "kubernetes"])
        create_job(db, hr_user, title="Django Backend", skills=["django", "python"])
        create_job(db, hr_user, title="Mongo Engineer", skills=["mongo", "python"])

        response = client.get(JOBS, params={"skill": "go"}, headers=auth_header(hr_token))

        assert response.status_code == 200
        body = response.json()
        assert body["total"] == 1
        assert body["items"][0]["title"] == "Go Backend"

    def test_candidate_cannot_view_closed_job(
        self,
        client: TestClient,
        db: Session,
        hr_user: User,
        candidate_token: str,
    ):
        job = create_job(db, hr_user, status=JobStatus.CLOSED)

        response = client.get(f"{JOBS}/{job.id}", headers=auth_header(candidate_token))

        assert response.status_code == 404

    def test_hr_can_update_and_delete_job(
        self,
        client: TestClient,
        db: Session,
        hr_user: User,
        hr_token: str,
    ):
        job = create_job(db, hr_user)

        update = client.put(
            f"{JOBS}/{job.id}",
            json={"title": "Platform Engineer", "status": "closed"},
            headers=auth_header(hr_token),
        )
        delete = client.delete(f"{JOBS}/{job.id}", headers=auth_header(hr_token))
        missing = client.get(f"{JOBS}/{job.id}", headers=auth_header(hr_token))

        assert update.status_code == 200
        assert update.json()["title"] == "Platform Engineer"
        assert update.json()["status"] == "closed"
        assert delete.status_code == 204
        assert missing.status_code == 404


class TestApplicationRoutes:
    def test_candidate_can_apply_and_list_own_applications(
        self,
        client: TestClient,
        db: Session,
        hr_user: User,
        candidate_token: str,
    ):
        job = create_job(db, hr_user)

        apply_response = client.post(
            APPLICATIONS,
            json={
                "job_id": job.id,
                "cover_letter": "I am excited to apply for this role.",
                "resume_url": "https://example.com/resume.pdf",
            },
            headers=auth_header(candidate_token),
        )
        list_response = client.get(MY_APPLICATIONS, headers=auth_header(candidate_token))

        assert apply_response.status_code == 201
        assert apply_response.json()["status"] == "pending"
        assert list_response.status_code == 200
        assert list_response.json()["total"] == 1
        assert list_response.json()["items"][0]["job"]["id"] == job.id

    def test_candidate_can_hide_applications_for_closed_jobs(
        self,
        client: TestClient,
        db: Session,
        hr_user: User,
        candidate_user: User,
        candidate_token: str,
    ):
        open_job = create_job(db, hr_user, title="Open Role")
        closed_job = create_job(db, hr_user, title="Closed Role", status=JobStatus.CLOSED)
        create_application(db, open_job, candidate_user)
        create_application(db, closed_job, candidate_user)

        all_response = client.get(MY_APPLICATIONS, headers=auth_header(candidate_token))
        active_response = client.get(
            MY_APPLICATIONS,
            params={"open_jobs_only": True},
            headers=auth_header(candidate_token),
        )

        assert all_response.status_code == 200
        assert all_response.json()["total"] == 2
        assert active_response.status_code == 200
        assert active_response.json()["total"] == 1
        assert active_response.json()["items"][0]["job"]["title"] == "Open Role"

    def test_apply_rejects_duplicate_and_closed_jobs(
        self,
        client: TestClient,
        db: Session,
        hr_user: User,
        candidate_token: str,
    ):
        open_job = create_job(db, hr_user)
        closed_job = create_job(db, hr_user, title="Closed", status=JobStatus.CLOSED)
        payload = {"job_id": open_job.id, "cover_letter": "This is a strong match for my skills."}

        first = client.post(APPLICATIONS, json=payload, headers=auth_header(candidate_token))
        duplicate = client.post(APPLICATIONS, json=payload, headers=auth_header(candidate_token))
        closed = client.post(
            APPLICATIONS,
            json={"job_id": closed_job.id, "cover_letter": "This is a strong match for my skills."},
            headers=auth_header(candidate_token),
        )

        assert first.status_code == 201
        assert duplicate.status_code == 409
        assert closed.status_code == 400

    def test_hr_can_view_applicants_and_update_status(
        self,
        client: TestClient,
        db: Session,
        hr_user: User,
        candidate_user: User,
        hr_token: str,
    ):
        job = create_job(db, hr_user)
        application = create_application(db, job, candidate_user)

        list_response = client.get(f"{JOBS}/{job.id}/applications", headers=auth_header(hr_token))
        update_response = client.patch(
            f"{APPLICATIONS}/{application.id}/status",
            json={"status": "shortlisted"},
            headers=auth_header(hr_token),
        )

        assert list_response.status_code == 200
        assert list_response.json()["total"] == 1
        assert list_response.json()["items"][0]["candidate"]["email"] == candidate_user.email
        assert update_response.status_code == 200
        assert update_response.json()["status"] == "shortlisted"

    def test_candidate_cannot_list_job_applications_or_update_status(
        self,
        client: TestClient,
        db: Session,
        hr_user: User,
        candidate_user: User,
        candidate_token: str,
    ):
        job = create_job(db, hr_user)
        application = create_application(db, job, candidate_user)

        list_response = client.get(f"{JOBS}/{job.id}/applications", headers=auth_header(candidate_token))
        update_response = client.patch(
            f"{APPLICATIONS}/{application.id}/status",
            json={"status": "reviewed"},
            headers=auth_header(candidate_token),
        )

        assert list_response.status_code == 403
        assert update_response.status_code == 403

    def test_hr_dashboard_returns_aggregate_counts(
        self,
        client: TestClient,
        db: Session,
        hr_user: User,
        candidate_user: User,
        hr_token: str,
    ):
        open_job = create_job(db, hr_user, status=JobStatus.OPEN)
        closed_job = create_job(db, hr_user, title="Closed", status=JobStatus.CLOSED)
        create_application(db, open_job, candidate_user, status=ApplicationStatus.REVIEWED)
        create_application(db, closed_job, candidate_user, status=ApplicationStatus.REJECTED)

        response = client.get(HR_DASHBOARD, headers=auth_header(hr_token))

        assert response.status_code == 200
        body = response.json()
        assert body["total_jobs"] == 2
        assert body["jobs_by_status"] == {"open": 1, "closed": 1}
        assert body["total_applications"] == 2
        assert body["applications_by_status"]["reviewed"] == 1
        assert body["applications_by_status"]["rejected"] == 1
        assert body["recent_applications"][0]["candidate"]["email"] == candidate_user.email
        assert body["hiring_velocity"]["window_days"] == 30
        assert body["hiring_velocity"]["total_applications"] == 2
        assert body["hiring_velocity"]["average_weekly_applications"] == 0.5
        assert len(body["hiring_velocity"]["buckets"]) == 4
        assert sum(bucket["applications"] for bucket in body["hiring_velocity"]["buckets"]) == 2

    def test_candidate_profile_drives_recommendations(
        self,
        client: TestClient,
        db: Session,
        hr_user: User,
        candidate_user: User,
        candidate_token: str,
    ):
        react_job = create_job(db, hr_user, title="React Product Engineer", location="Remote", skills=["react", "product"])
        create_job(db, hr_user, title="Payroll Analyst", location="Remote", skills=["payroll", "excel"])

        update_response = client.put(
            CANDIDATE_PROFILE,
            json={
                "resume_url": "https://example.com/resume.pdf",
                "skills": ["React", "Product", "React"],
                "work_experience": "Built React product dashboards for hiring teams.",
                "salary_min": 100000,
                "salary_max": 200000,
                "experience_years": 5,
                "preferred_roles": ["React Product Engineer"],
            },
            headers=auth_header(candidate_token),
        )
        recommendations_response = client.get(
            CANDIDATE_RECOMMENDATIONS,
            headers=auth_header(candidate_token),
        )
        create_application(db, react_job, candidate_user)
        matches_response = client.get(
            CANDIDATE_JOB_MATCHES,
            params={"search": "react", "limit": 5},
            headers=auth_header(candidate_token),
        )

        assert update_response.status_code == 200
        assert update_response.json()["skills"] == ["react", "product"]
        assert update_response.json()["salary_min"] == 100000
        assert update_response.json()["experience_years"] == 5
        assert update_response.json()["preferred_roles"] == ["react product engineer"]
        assert update_response.json()["profile_strength"] == 100
        assert recommendations_response.status_code == 200
        recommendations = recommendations_response.json()
        assert recommendations[0]["job"]["title"] == "React Product Engineer"
        assert "react" in recommendations[0]["matched_skills"]
        assert recommendations[0]["match_score"] > 0
        assert recommendations[0]["has_applied"] is False
        assert matches_response.status_code == 200
        matches = matches_response.json()
        assert matches["total"] == 1
        assert matches["items"][0]["job"]["title"] == "React Product Engineer"
        assert matches["items"][0]["match_score"] > 0
        assert matches["items"][0]["has_applied"] is True
        assert matches["items"][0]["application_status"] == "pending"
