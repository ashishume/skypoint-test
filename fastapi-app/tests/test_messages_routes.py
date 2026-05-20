"""Integration tests for HR/candidate message endpoints."""
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.application import Application, ApplicationStatus
from app.models.job import JobPosting, JobStatus, JobType
from app.models.user import User, UserRole

MESSAGES = "/api/v1/messages"


def auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def create_job(db: Session, hr_user: User, *, title: str = "Backend Engineer") -> JobPosting:
    job = JobPosting(
        title=title,
        description="Build reliable APIs for hiring teams.",
        skills=["python", "fastapi"],
        location="Remote",
        job_type=JobType.FULL_TIME,
        salary_min=100000,
        salary_max=200000,
        status=JobStatus.OPEN,
        created_by_id=hr_user.id,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def create_application(db: Session, job: JobPosting, candidate_user: User) -> Application:
    application = Application(
        job_id=job.id,
        candidate_id=candidate_user.id,
        cover_letter="I am interested in this role and can contribute immediately.",
        resume_url="https://example.com/resume.pdf",
        status=ApplicationStatus.PENDING,
    )
    db.add(application)
    db.commit()
    db.refresh(application)
    return application


def create_candidate(db: Session, *, email: str = "other-candidate@test.com") -> User:
    user = User(
        email=email,
        hashed_password=hash_password("Candidate@123"),
        full_name="Other Candidate",
        role=UserRole.CANDIDATE,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def login(client: TestClient, *, email: str, password: str) -> str:
    response = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


class TestMessagesRoutes:
    def test_hr_can_message_applied_candidate_and_candidate_can_reply(
        self,
        client: TestClient,
        db: Session,
        hr_user: User,
        candidate_user: User,
        hr_token: str,
        candidate_token: str,
    ):
        job = create_job(db, hr_user, title="Python API Engineer")
        create_application(db, job, candidate_user)

        send_response = client.post(
            f"{MESSAGES}/hr",
            json={
                "candidate_id": candidate_user.id,
                "job_id": job.id,
                "body": "Hi, we would like to schedule a technical discussion.",
            },
            headers=auth_header(hr_token),
        )
        list_response = client.get(f"{MESSAGES}/candidate", headers=auth_header(candidate_token))

        assert send_response.status_code == 201
        sent_thread = send_response.json()
        assert sent_thread["job"]["title"] == "Python API Engineer"
        assert sent_thread["candidate"]["email"] == candidate_user.email
        assert sent_thread["hr"]["email"] == hr_user.email
        assert sent_thread["messages"][0]["body"] == "Hi, we would like to schedule a technical discussion."

        assert list_response.status_code == 200
        threads = list_response.json()
        assert len(threads) == 1
        assert threads[0]["id"] == sent_thread["id"]
        assert threads[0]["job"]["id"] == job.id

        reply_response = client.post(
            f"{MESSAGES}/candidate/{sent_thread['id']}/reply",
            json={"body": "Thanks, I am available tomorrow afternoon."},
            headers=auth_header(candidate_token),
        )

        assert reply_response.status_code == 200
        replied_thread = reply_response.json()
        assert [message["body"] for message in replied_thread["messages"]] == [
            "Hi, we would like to schedule a technical discussion.",
            "Thanks, I am available tomorrow afternoon.",
        ]

        hr_threads_response = client.get(f"{MESSAGES}/hr", headers=auth_header(hr_token))
        hr_reply_response = client.post(
            f"{MESSAGES}/hr/{sent_thread['id']}/reply",
            json={"body": "Great, I sent an invite."},
            headers=auth_header(hr_token),
        )

        assert hr_threads_response.status_code == 200
        assert hr_threads_response.json()[0]["id"] == sent_thread["id"]
        assert hr_reply_response.status_code == 200
        assert [message["body"] for message in hr_reply_response.json()["messages"]] == [
            "Hi, we would like to schedule a technical discussion.",
            "Thanks, I am available tomorrow afternoon.",
            "Great, I sent an invite.",
        ]

    def test_hr_cannot_message_candidate_without_application(
        self,
        client: TestClient,
        db: Session,
        hr_user: User,
        candidate_user: User,
        hr_token: str,
    ):
        job = create_job(db, hr_user)

        response = client.post(
            f"{MESSAGES}/hr",
            json={"candidate_id": candidate_user.id, "job_id": job.id, "body": "Checking in."},
            headers=auth_header(hr_token),
        )

        assert response.status_code == 400

    def test_candidate_cannot_reply_to_another_candidates_thread(
        self,
        client: TestClient,
        db: Session,
        hr_user: User,
        candidate_user: User,
        hr_token: str,
    ):
        job = create_job(db, hr_user)
        create_application(db, job, candidate_user)
        other_candidate = create_candidate(db)
        other_token = login(client, email=other_candidate.email, password="Candidate@123")
        send_response = client.post(
            f"{MESSAGES}/hr",
            json={"candidate_id": candidate_user.id, "job_id": job.id, "body": "Hello."},
            headers=auth_header(hr_token),
        )
        assert send_response.status_code == 201

        response = client.post(
            f"{MESSAGES}/candidate/{send_response.json()['id']}/reply",
            json={"body": "This is not my thread."},
            headers=auth_header(other_token),
        )

        assert response.status_code == 403

    def test_hr_cannot_view_or_reply_to_another_hr_thread(
        self,
        client: TestClient,
        db: Session,
        hr_user: User,
        candidate_user: User,
        hr_token: str,
    ):
        job = create_job(db, hr_user)
        create_application(db, job, candidate_user)
        other_hr = User(
            email="other-message-hr@test.com",
            hashed_password=hash_password("OtherHr@123"),
            full_name="Other HR",
            role=UserRole.HR,
        )
        db.add(other_hr)
        db.commit()
        db.refresh(other_hr)
        other_token = login(client, email=other_hr.email, password="OtherHr@123")
        send_response = client.post(
            f"{MESSAGES}/hr",
            json={"candidate_id": candidate_user.id, "job_id": job.id, "body": "Hello."},
            headers=auth_header(hr_token),
        )
        assert send_response.status_code == 201

        list_response = client.get(f"{MESSAGES}/hr", headers=auth_header(other_token))
        reply_response = client.post(
            f"{MESSAGES}/hr/{send_response.json()['id']}/reply",
            json={"body": "This is not my thread."},
            headers=auth_header(other_token),
        )

        assert list_response.status_code == 200
        assert list_response.json() == []
        assert reply_response.status_code == 403
