"""Tests for the idempotent database seeding routine."""
from unittest.mock import patch

from app import seed as seed_module
from app.models.user import User, UserRole


def _patched_session(db):
    """Return a fake SessionLocal that yields the test session and tracks closes."""
    class _Wrapper:
        def __init__(self):
            self.closed = False

        def __call__(self):
            return self

        def query(self, *args, **kwargs):
            return db.query(*args, **kwargs)

        def execute(self, *args, **kwargs):
            return db.execute(*args, **kwargs)

        def add(self, obj):
            db.add(obj)

        def commit(self):
            db.commit()

        def rollback(self):
            db.rollback()

        def refresh(self, obj):
            db.refresh(obj)

        def close(self):
            self.closed = True

    return _Wrapper()


class TestSeedDatabase:
    def test_seed_disabled_does_nothing(self, db):
        with patch.object(seed_module.settings, "SEED_DATA", False):
            seed_module.seed_database()
        assert db.query(User).count() == 0

    def test_seed_creates_users(self, db):
        wrapper = _patched_session(db)
        with patch.object(seed_module.settings, "SEED_DATA", True), \
             patch.object(seed_module.settings, "SEED_HR_EMAIL", "seedhr@test.com"), \
             patch.object(seed_module.settings, "SEED_HR_PASSWORD", "SeedHr@123"), \
             patch.object(seed_module.settings, "SEED_HR_NAME", "Seed HR"), \
             patch.object(seed_module.settings, "SEED_CANDIDATE_EMAIL", "seeduser@test.com"), \
             patch.object(seed_module.settings, "SEED_CANDIDATE_PASSWORD", "SeedUser@123"), \
             patch.object(seed_module.settings, "SEED_CANDIDATE_NAME", "Seed Candidate"), \
             patch.object(seed_module, "SessionLocal", wrapper):
            seed_module.seed_database()

        users = db.query(User).all()
        emails = {u.email for u in users}
        assert "seedhr@test.com" in emails
        assert "seeduser@test.com" in emails
        roles = {u.email: u.role for u in users}
        assert roles["seedhr@test.com"] == UserRole.HR
        assert roles["seeduser@test.com"] == UserRole.CANDIDATE
        assert wrapper.closed is True

    def test_seed_is_idempotent(self, db):
        wrapper = _patched_session(db)
        with patch.object(seed_module.settings, "SEED_DATA", True), \
             patch.object(seed_module.settings, "SEED_HR_EMAIL", "seedhr@test.com"), \
             patch.object(seed_module.settings, "SEED_HR_PASSWORD", "SeedHr@123"), \
             patch.object(seed_module.settings, "SEED_CANDIDATE_EMAIL", "seeduser@test.com"), \
             patch.object(seed_module.settings, "SEED_CANDIDATE_PASSWORD", "SeedUser@123"), \
             patch.object(seed_module, "SessionLocal", wrapper):
            seed_module.seed_database()
            seed_module.seed_database()

        assert db.query(User).count() == 2

    def test_seed_skips_when_credentials_missing(self, db):
        wrapper = _patched_session(db)
        with patch.object(seed_module.settings, "SEED_DATA", True), \
             patch.object(seed_module.settings, "SEED_HR_EMAIL", None), \
             patch.object(seed_module.settings, "SEED_HR_PASSWORD", None), \
             patch.object(seed_module.settings, "SEED_CANDIDATE_EMAIL", None), \
             patch.object(seed_module.settings, "SEED_CANDIDATE_PASSWORD", None), \
             patch.object(seed_module, "SessionLocal", wrapper):
            seed_module.seed_database()

        assert db.query(User).count() == 0
