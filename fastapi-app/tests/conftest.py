"""Pytest fixtures.

Environment variables required by Settings are set BEFORE any app modules
are imported, so tests don't depend on a real .env file. SQLite in-memory is
used for speed; models use cross-database SQLAlchemy types so behavior matches
production PostgreSQL.
"""
import os

os.environ.setdefault("SECRET_KEY", "test-secret-key-that-is-at-least-32-chars-long")
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("HR_INVITE_CODE", "test-hr-invite-code")
os.environ.setdefault("CORS_ORIGINS", "http://test")
os.environ.setdefault("SEED_DATA", "false")
os.environ.setdefault("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
os.environ.setdefault("BCRYPT_ROUNDS", "4")
os.environ["RATE_LIMIT_AUTH_MAX_REQUESTS"] = "10000"
os.environ["RATE_LIMIT_AUTH_WINDOW_SECONDS"] = "60"
os.environ["RATE_LIMIT_STORE"] = "memory"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import get_db
from app.main import app
from app.models.base import Base
from app.models.user import User, UserRole
from app.core.security import hash_password

_test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
_TestSession = sessionmaker(bind=_test_engine, autoflush=False, autocommit=False, expire_on_commit=False)


@pytest.fixture(autouse=True)
def _reset_schema():
    Base.metadata.create_all(bind=_test_engine)
    yield
    Base.metadata.drop_all(bind=_test_engine)


@pytest.fixture()
def db() -> Session:
    session = _TestSession()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client(db: Session) -> TestClient:
    def _override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def _create_user(db: Session, *, email: str, password: str, full_name: str,
                 role: UserRole, is_active: bool = True) -> User:
    user = User(
        email=email.lower(),
        hashed_password=hash_password(password),
        full_name=full_name,
        role=role,
        is_active=is_active,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture()
def candidate_user(db: Session) -> User:
    return _create_user(
        db,
        email="candidate@test.com",
        password="Candidate@123",
        full_name="Test Candidate",
        role=UserRole.CANDIDATE,
    )


@pytest.fixture()
def hr_user(db: Session) -> User:
    return _create_user(
        db,
        email="hr@test.com",
        password="HrUser@123",
        full_name="Test HR",
        role=UserRole.HR,
    )


@pytest.fixture()
def inactive_user(db: Session) -> User:
    return _create_user(
        db,
        email="inactive@test.com",
        password="Inactive@123",
        full_name="Inactive User",
        role=UserRole.CANDIDATE,
        is_active=False,
    )


@pytest.fixture()
def candidate_token(client: TestClient, candidate_user: User) -> str:
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "candidate@test.com", "password": "Candidate@123"},
    )
    assert res.status_code == 200, res.text
    return res.json()["access_token"]


@pytest.fixture()
def hr_token(client: TestClient, hr_user: User) -> str:
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "hr@test.com", "password": "HrUser@123"},
    )
    assert res.status_code == 200, res.text
    return res.json()["access_token"]
