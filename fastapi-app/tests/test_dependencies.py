"""Tests for role-enforcement dependencies."""
import pytest

from app.core.exceptions import ForbiddenError
from app.dependencies import require_candidate, require_hr


class TestRequireHR:
    def test_allows_hr(self, hr_user):
        assert require_hr(hr_user) is hr_user

    def test_blocks_candidate(self, candidate_user):
        with pytest.raises(ForbiddenError) as exc:
            require_hr(candidate_user)
        assert exc.value.status_code == 403


class TestRequireCandidate:
    def test_allows_candidate(self, candidate_user):
        assert require_candidate(candidate_user) is candidate_user

    def test_blocks_hr(self, hr_user):
        with pytest.raises(ForbiddenError) as exc:
            require_candidate(hr_user)
        assert exc.value.status_code == 403
