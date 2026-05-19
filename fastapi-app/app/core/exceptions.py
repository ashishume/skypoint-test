"""Domain exceptions raised by services and repositories.

Services and repositories raise these — never `HTTPException`. A single
exception handler in `app.main` translates each to the correct HTTP response.
Keeping HTTP concerns out of the service layer makes services reusable
(e.g. from background workers, CLI scripts) and easier to test.
"""


class DomainError(Exception):
    """Base class for application errors that map to HTTP responses."""

    status_code: int = 500
    default_message: str = "An unexpected error occurred."

    def __init__(self, message: str | None = None) -> None:
        self.message = message or self.default_message
        super().__init__(self.message)


class NotFoundError(DomainError):
    status_code = 404
    default_message = "Resource not found."


class ConflictError(DomainError):
    status_code = 409
    default_message = "Resource already exists."


class ForbiddenError(DomainError):
    status_code = 403
    default_message = "You do not have permission to perform this action."


class UnauthorizedError(DomainError):
    status_code = 401
    default_message = "Authentication required."


class BadRequestError(DomainError):
    status_code = 400
    default_message = "Bad request."
