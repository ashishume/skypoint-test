"""Unit tests for the auth service layer (password hashing + JWT + login)."""
from datetime import datetime, timedelta, timezone

import pytest
from jose import jwt
from jose.exceptions import ExpiredSignatureError, JWTError

from app.config import settings
from app.services.auth import (
    authenticate_user,
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


class TestPasswordHashing:
    def test_hash_password_uses_bcrypt_format(self):
        h = hash_password("Strong@Pass1")
        assert h.startswith("$2b$")

    def test_hash_password_is_salted(self):
        assert hash_password("same") != hash_password("same")

    def test_verify_password_success(self):
        h = hash_password("Strong@Pass1")
        assert verify_password("Strong@Pass1", h) is True

    def test_verify_password_failure(self):
        h = hash_password("Strong@Pass1")
        assert verify_password("Wrong@Pass1", h) is False

    def test_verify_password_empty_password(self):
        h = hash_password("Strong@Pass1")
        assert verify_password("", h) is False

    def test_verify_password_empty_hash(self):
        assert verify_password("anything", "") is False

    def test_verify_password_invalid_hash(self):
        assert verify_password("anything", "not-a-bcrypt-hash") is False


class TestJWT:
    def test_create_and_decode_token(self):
        token = create_access_token(subject=42)
        payload = decode_access_token(token)
        assert payload["sub"] == "42"
        assert payload["type"] == "access"
        assert "exp" in payload
        assert "iat" in payload

    def test_create_token_accepts_string_subject(self):
        token = create_access_token(subject="abc")
        assert decode_access_token(token)["sub"] == "abc"

    def test_create_token_with_extra_claims(self):
        token = create_access_token(subject=1, extra_claims={"role": "hr"})
        assert decode_access_token(token)["role"] == "hr"

    def test_create_token_drops_reserved_extra_claims(self):
        token = create_access_function = create_access_token(
            subject=1,
            extra_claims={"sub": "hijacked", "type": "refresh", "extra": "kept"},
        )
        payload = decode_access_token(token)
        assert payload["sub"] == "1"
        assert payload["type"] == "access"
        assert payload["extra"] == "kept"

    def test_expired_token_raises(self):
        token = create_access_token(subject=1, expires_minutes=-1)
        with pytest.raises(ExpiredSignatureError):
            decode_access_token(token)

    def test_malformed_token_raises(self):
        with pytest.raises(JWTError):
            decode_access_token("not.a.jwt")

    def test_wrong_secret_raises(self):
        token = jwt.encode(
            {
                "sub": "1",
                "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
            },
            "different-secret-that-is-long-enough-32ch",
            algorithm=settings.ALGORITHM,
        )
        with pytest.raises(JWTError):
            decode_access_token(token)


class TestAuthenticateUser:
    def test_success(self, db, candidate_user):
        u = authenticate_user(db, "candidate@test.com", "Candidate@123")
        assert u is not None and u.id == candidate_user.id

    def test_email_is_case_insensitive(self, db, candidate_user):
        assert authenticate_user(db, "CANDIDATE@TEST.COM", "Candidate@123") is not None

    def test_wrong_password(self, db, candidate_user):
        assert authenticate_user(db, "candidate@test.com", "Wrong@123") is None

    def test_unknown_email_runs_dummy_hash(self, db):
        # Returns None but must not raise; dummy hash equalizes timing.
        assert authenticate_user(db, "nobody@test.com", "Whatever@1") is None

    def test_inactive_user_blocked(self, db, inactive_user):
        assert authenticate_user(db, "inactive@test.com", "Inactive@123") is None
