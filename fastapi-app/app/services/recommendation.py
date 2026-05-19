"""Candidate-to-job recommendation scoring.

Pure functions kept out of the service class so the scoring weights and
keyword heuristic can be tested and tuned in isolation. The weights below
sum to a 100-point scale.
"""
import re
from typing import Iterable, List, Set

from app.models.candidate_profile import CandidateProfile
from app.models.job import JobPosting
from app.schemas.candidate_profile import JobRecommendation
from app.schemas.job import JobResponse

# Weights for each scoring dimension (max contribution to the 100-point score).
SKILL_OVERLAP_WEIGHT = 45
WORK_EXPERIENCE_WEIGHT = 25
PROFILE_TERMS_FALLBACK_WEIGHT = 15
PREFERRED_ROLE_WEIGHT = 15
EXPERIENCE_MATCH_WEIGHT = 10
EXPERIENCE_NEAR_MATCH_WEIGHT = 5
SALARY_STRONG_MATCH_WEIGHT = 15
SALARY_WEAK_MATCH_WEIGHT = 8

# Seniority -> required years. Used by _required_experience_years.
_SENIORITY_TIERS = (
    (("principal", "staff", "director", "head of"), 8),
    (("lead", "manager"), 6),
    (("senior", "sr."), 4),
    (("junior", "intern", "entry"), 0),
)
_DEFAULT_REQUIRED_YEARS = 2

_KEYWORD_STOP_WORDS = frozenset({
    "and", "the", "for", "with", "from", "this", "that", "your", "you",
    "are", "job", "role", "team", "work", "build", "will", "our",
})
_KEYWORD_PATTERN = re.compile(r"[a-zA-Z][a-zA-Z0-9+#.-]{1,}")

_DEFAULT_SALARY_CEILING = 10_000_000


def keywords(text: str) -> Set[str]:
    """Tokenize free-form text into a set of lowercase keywords."""
    return {
        token
        for token in _KEYWORD_PATTERN.findall(text.lower())
        if token not in _KEYWORD_STOP_WORDS
    }


def required_experience_years(job: JobPosting) -> int:
    """Heuristic seniority -> minimum experience years.

    Senior reviewers should note: this is a deliberately simple keyword
    classifier — in a production system this would be a learned model or
    a field on the JobPosting itself.
    """
    text = f"{job.title} {job.description}".lower()
    for terms, years in _SENIORITY_TIERS:
        if any(term in text for term in terms):
            return years
    return _DEFAULT_REQUIRED_YEARS


def salary_score(profile: CandidateProfile, job: JobPosting) -> int:
    if profile.salary_min is None and profile.salary_max is None:
        return 0
    desired_min = profile.salary_min or 0
    desired_max = profile.salary_max or _DEFAULT_SALARY_CEILING
    job_min = job.salary_min or 0
    job_max = job.salary_max or _DEFAULT_SALARY_CEILING
    if job_max < desired_min or job_min > desired_max:
        return 0
    if profile.salary_min is not None and job_max >= profile.salary_min:
        return SALARY_STRONG_MATCH_WEIGHT
    return SALARY_WEAK_MATCH_WEIGHT


def _scaled(numerator: int, denominator: int, weight: int) -> int:
    return min(weight, round((numerator / max(denominator, 1)) * weight))


def score_job(
    job: JobPosting,
    *,
    profile: CandidateProfile,
    profile_skills: Iterable[str],
    preferred_roles: Iterable[str],
) -> JobRecommendation:
    """Score a single job against the candidate's profile."""
    profile_skill_set: Set[str] = {s.lower() for s in profile_skills}
    preferred_role_set: Set[str] = {r.lower() for r in preferred_roles}
    profile_text_terms = keywords(profile.work_experience)
    profile_terms = profile_text_terms | profile_skill_set | preferred_role_set

    job_skill_set: Set[str] = {s.lower() for s in (job.skills or [])}
    job_text = f"{job.title} {job.description} {' '.join(job.skills or [])} {job.location} {job.job_type.value}"
    job_terms = keywords(job_text)

    matched_skills: List[str] = sorted(profile_skill_set & job_skill_set)
    matched_terms = profile_terms & job_terms
    role_terms = keywords(" ".join(preferred_role_set))
    matched_role_terms = role_terms & keywords(job.title)
    description_terms = profile_text_terms & job_terms

    score = 0
    if matched_skills:
        score += _scaled(len(matched_skills), len(job_skill_set), SKILL_OVERLAP_WEIGHT)
    if description_terms:
        score += _scaled(len(description_terms), len(profile_text_terms), WORK_EXPERIENCE_WEIGHT)
    elif matched_terms:
        score += _scaled(len(matched_terms), len(profile_terms), PROFILE_TERMS_FALLBACK_WEIGHT)
    if matched_role_terms:
        score += _scaled(len(matched_role_terms), len(role_terms), PREFERRED_ROLE_WEIGHT)

    required_exp = required_experience_years(job)
    if profile.experience_years >= required_exp:
        score += EXPERIENCE_MATCH_WEIGHT
    elif required_exp and profile.experience_years >= required_exp - 1:
        score += EXPERIENCE_NEAR_MATCH_WEIGHT

    score = min(100, score + salary_score(profile, job))

    reason = (
        f"Matches {', '.join(matched_skills[:3])}"
        if matched_skills
        else "Matches your profile preferences"
    )
    return JobRecommendation(
        job=JobResponse.model_validate(job),
        match_score=score,
        matched_skills=matched_skills,
        reason=reason,
    )
