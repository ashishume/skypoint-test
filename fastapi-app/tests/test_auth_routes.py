"""Integration tests for /api/v1/auth/* endpoints."""
from datetime import datetime, timedelta, timezone

import pytest
from jose import jwt

from app.config import settings
from app.core.security import create_access_token, decode_access_token

REGISTER = "/api/v1/auth/register"
LOGIN = "/api/v1/auth/login"
ME = "/api/v1/auth/me"


class TestRegister:
    def test_register_candidate_success(self, client):
        res = client.post(REGISTER, json={
            "email": "new@test.com",
            "password": "ValidPass@1",
            "full_name": "New User",
            "role": "candidate",
        })
        assert res.status_code == 201
        data = res.json()
        assert data["email"] == "new@test.com"
        assert data["full_name"] == "New User"
        assert data["role"] == "candidate"
        assert data["is_active"] is True
        assert "id" in data
        assert "hashed_password" not in data
        assert "password" not in data

    def test_register_normalizes_email_to_lowercase(self, client):
        res = client.post(REGISTER, json={
            "email": "MixedCase@Test.com",
            "password": "ValidPass@1",
            "full_name": "Mixed Case",
        })
        assert res.status_code == 201
        assert res.json()["email"] == "mixedcase@test.com"

    def test_register_defaults_to_candidate_role(self, client):
        res = client.post(REGISTER, json={
            "email": "default@test.com",
            "password": "ValidPass@1",
            "full_name": "Default User",
        })
        assert res.status_code == 201
        assert res.json()["role"] == "candidate"

    def test_register_strips_full_name(self, client):
        res = client.post(REGISTER, json={
            "email": "strip@test.com",
            "password": "ValidPass@1",
            "full_name": "  Padded Name  ",
        })
        assert res.status_code == 201
        assert res.json()["full_name"] == "Padded Name"

    def test_register_hr_with_valid_invite_code(self, client):
        res = client.post(REGISTER, json={
            "email": "newhr@test.com",
            "password": "ValidPass@1",
            "full_name": "New HR",
            "role": "hr",
            "hr_invite_code": settings.HR_INVITE_CODE,
        })
        assert res.status_code == 201
        assert res.json()["role"] == "hr"

    def test_register_hr_without_invite_code_forbidden(self, client):
        res = client.post(REGISTER, json={
            "email": "badhr@test.com",
            "password": "ValidPass@1",
            "full_name": "Bad HR",
            "role": "hr",
        })
        assert res.status_code == 403
        assert "invite" in res.json()["detail"].lower()

    def test_register_hr_with_wrong_invite_code_forbidden(self, client):
        res = client.post(REGISTER, json={
            "email": "badhr@test.com",
            "password": "ValidPass@1",
            "full_name": "Bad HR",
            "role": "hr",
            "hr_invite_code": "totally-wrong",
        })
        assert res.status_code == 403

    def test_register_duplicate_email_conflict(self, client, candidate_user):
        res = client.post(REGISTER, json={
            "email": "candidate@test.com",
            "password": "ValidPass@1",
            "full_name": "Duplicate",
        })
        assert res.status_code == 409

    def test_register_duplicate_email_case_insensitive(self, client, candidate_user):
        res = client.post(REGISTER, json={
            "email": "CANDIDATE@TEST.COM",
            "password": "ValidPass@1",
            "full_name": "Duplicate",
        })
        assert res.status_code == 409

    def test_register_invalid_email_format(self, client):
        res = client.post(REGISTER, json={
            "email": "not-an-email",
            "password": "ValidPass@1",
            "full_name": "Bad Email",
        })
        assert res.status_code == 422

    @pytest.mark.parametrize("password", [
        "Ab@1",            # too short (<8)
        "alllowercase@1",  # no uppercase
        "ALLUPPERCASE@1",  # no lowercase
        "NoDigits@Pass",   # no digit
        "NoSpecial1Pass",  # no special char
        "a" * 129,         # too long (>128)
    ])
    def test_register_weak_password_rejected(self, client, password):
        res = client.post(REGISTER, json={
            "email": "weak@test.com",
            "password": password,
            "full_name": "Weak Password User",
        })
        assert res.status_code == 422

    def test_register_missing_password(self, client):
        res = client.post(REGISTER, json={
            "email": "missing@test.com",
            "full_name": "Missing Pwd",
        })
        assert res.status_code == 422

    def test_register_missing_email(self, client):
        res = client.post(REGISTER, json={
            "password": "ValidPass@1",
            "full_name": "Missing Email",
        })
        assert res.status_code == 422

    def test_register_missing_full_name(self, client):
        res = client.post(REGISTER, json={
            "email": "no-name@test.com",
            "password": "ValidPass@1",
        })
        assert res.status_code == 422

    def test_register_blank_full_name(self, client):
        res = client.post(REGISTER, json={
            "email": "blank@test.com",
            "password": "ValidPass@1",
            "full_name": "   ",
        })
        assert res.status_code == 422

    def test_register_invalid_role(self, client):
        res = client.post(REGISTER, json={
            "email": "badrole@test.com",
            "password": "ValidPass@1",
            "full_name": "Bad Role",
            "role": "admin",
        })
        assert res.status_code == 422


class TestLogin:
    def test_login_success(self, client, candidate_user):
        res = client.post(LOGIN, json={
            "email": "candidate@test.com",
            "password": "Candidate@123",
        })
        assert res.status_code == 200
        data = res.json()
        assert data["token_type"] == "bearer"
        assert data["expires_in"] == settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        assert data["user"]["email"] == "candidate@test.com"
        assert data["user"]["role"] == "candidate"
        assert "access_token" in data

    def test_login_returns_valid_jwt(self, client, candidate_user):
        res = client.post(LOGIN, json={
            "email": "candidate@test.com",
            "password": "Candidate@123",
        })
        token = res.json()["access_token"]
        payload = decode_access_token(token)
        assert payload["sub"] == str(candidate_user.id)
        assert payload["role"] == "candidate"
        assert payload["type"] == "access"

    def test_login_email_case_insensitive(self, client, candidate_user):
        res = client.post(LOGIN, json={
            "email": "CANDIDATE@TEST.COM",
            "password": "Candidate@123",
        })
        assert res.status_code == 200

    def test_login_wrong_password(self, client, candidate_user):
        res = client.post(LOGIN, json={
            "email": "candidate@test.com",
            "password": "Wrong@1234",
        })
        assert res.status_code == 401
        assert res.headers.get("WWW-Authenticate") == "Bearer"

    def test_login_unknown_email(self, client):
        res = client.post(LOGIN, json={
            "email": "nobody@test.com",
            "password": "AnyPass@1",
        })
        assert res.status_code == 401

    def test_login_inactive_user(self, client, inactive_user):
        res = client.post(LOGIN, json={
            "email": "inactive@test.com",
            "password": "Inactive@123",
        })
        assert res.status_code == 401

    def test_login_missing_email(self, client):
        res = client.post(LOGIN, json={"password": "AnyPass@1"})
        assert res.status_code == 422

    def test_login_missing_password(self, client):
        res = client.post(LOGIN, json={"email": "x@test.com"})
        assert res.status_code == 422

    def test_login_invalid_email_format(self, client):
        res = client.post(LOGIN, json={"email": "not-email", "password": "Any@1234"})
        assert res.status_code == 422


class TestMe:
    def test_me_success(self, client, candidate_user, candidate_token):
        res = client.get(ME, headers={"Authorization": f"Bearer {candidate_token}"})
        assert res.status_code == 200
        data = res.json()
        assert data["email"] == "candidate@test.com"
        assert data["role"] == "candidate"
        assert data["id"] == candidate_user.id

    def test_me_no_token(self, client):
        res = client.get(ME)
        assert res.status_code == 401

    def test_me_invalid_token(self, client):
        res = client.get(ME, headers={"Authorization": "Bearer not.a.real.jwt"})
        assert res.status_code == 401

    def test_me_missing_bearer_prefix(self, client, candidate_token):
        res = client.get(ME, headers={"Authorization": candidate_token})
        assert res.status_code == 401

    def test_me_wrong_scheme(self, client, candidate_token):
        res = client.get(ME, headers={"Authorization": f"Basic {candidate_token}"})
        assert res.status_code == 401

    def test_me_expired_token(self, client, candidate_user):
        token = create_access_token(subject=candidate_user.id, expires_minutes=-5)
        res = client.get(ME, headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 401

    def test_me_token_with_non_integer_subject(self, client):
        token = create_access_token(subject="abc")
        res = client.get(ME, headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 401

    def test_me_token_for_nonexistent_user(self, client):
        token = create_access_token(subject=999999)
        res = client.get(ME, headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 401

    def test_me_token_for_inactive_user(self, client, inactive_user):
        token = create_access_token(subject=inactive_user.id)
        res = client.get(ME, headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 401

    def test_me_token_wrong_type(self, client, candidate_user):
        bad = jwt.encode(
            {
                "sub": str(candidate_user.id),
                "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
                "type": "refresh",
            },
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM,
        )
        res = client.get(ME, headers={"Authorization": f"Bearer {bad}"})
        assert res.status_code == 401

    def test_me_token_missing_subject(self, client, candidate_user):
        bad = jwt.encode(
            {
                "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
                "type": "access",
            },
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM,
        )
        res = client.get(ME, headers={"Authorization": f"Bearer {bad}"})
        assert res.status_code == 401


class TestHealth:
    def test_health_endpoint(self, client):
        res = client.get("/health")
        assert res.status_code == 200
        body = res.json()
        assert body["status"] == "healthy"
        assert "service" in body
