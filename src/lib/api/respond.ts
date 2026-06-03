import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "@/lib/errors";

/**
 * Centralised JSON responders for the API route handlers. Keeps status codes
 * and error shapes consistent across every endpoint.
 */

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

/**
 * Translate any thrown value into a JSON error response:
 *   ZodError      -> 400 with field-level details
 *   AppError      -> its own status (404 / 400 / 409)
 *   anything else -> 500 (logged)
 */
export function fail(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  if (error instanceof AppError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error("Unhandled API error:", error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
