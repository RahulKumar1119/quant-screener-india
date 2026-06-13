/**
 * Authentication API client functions.
 *
 * Provides signup, signin, and getMe calls to the backend auth endpoints.
 * Handles error responses (409, 401, 422) with typed error messages.
 */

const BASE_URL = "https://z3d366wlgi.execute-api.ap-south-1.amazonaws.com";

export interface AuthUser {
  email: string;
  user_id: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface UserProfile {
  email: string;
  user_id: string;
  created_at: string;
}

export class AuthError extends Error {
  public readonly statusCode: number;
  public readonly detail: string;

  constructor(statusCode: number, detail: string) {
    super(detail);
    this.name = "AuthError";
    this.statusCode = statusCode;
    this.detail = detail;
  }
}

/**
 * Parse error response body from the auth endpoints.
 */
async function parseAuthError(response: Response): Promise<AuthError> {
  let detail = `Request failed with status ${response.status}`;
  try {
    const body = await response.json();
    if (body.detail) {
      detail = body.detail;
    }
  } catch {
    // Use default detail if body parsing fails
  }
  return new AuthError(response.status, detail);
}

/**
 * Register a new user account.
 *
 * POST /api/auth/signup
 *
 * @throws {AuthError} on 409 (email exists), 422 (validation error)
 */
export async function signup(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw await parseAuthError(response);
  }

  return response.json();
}

/**
 * Sign in with existing credentials.
 *
 * POST /api/auth/signin
 *
 * @throws {AuthError} on 401 (invalid credentials)
 */
export async function signin(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${BASE_URL}/api/auth/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw await parseAuthError(response);
  }

  return response.json();
}

/**
 * Get the current user profile using a JWT token.
 *
 * GET /api/auth/me
 *
 * @throws {AuthError} on 401 (invalid/expired token)
 */
export async function getMe(token: string): Promise<UserProfile> {
  const response = await fetch(`${BASE_URL}/api/auth/me`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw await parseAuthError(response);
  }

  return response.json();
}
