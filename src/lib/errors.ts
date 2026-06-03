/**
 * Domain errors that map cleanly onto HTTP status codes. The service layer
 * throws these; the API layer translates them into responses (see
 * `src/lib/api/respond.ts`).
 */

export class AppError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "AppError";
  }
}

/** 404 — the requested resource does not exist. */
export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super(message, 404);
    this.name = "NotFoundError";
  }
}

/** 400 — the request was understood but is semantically invalid. */
export class ValidationError extends AppError {
  constructor(message = "Invalid request") {
    super(message, 400);
    this.name = "ValidationError";
  }
}

/** 409 — the request conflicts with current state (e.g. duplicate name). */
export class ConflictError extends AppError {
  constructor(message = "Conflict") {
    super(message, 409);
    this.name = "ConflictError";
  }
}
