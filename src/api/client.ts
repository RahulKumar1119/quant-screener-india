import type { TickerResponse, AllTickersResponse, ErrorResponse } from "../types/index";

const BASE_URL = "";

/**
 * Custom error class for API errors with typed ErrorResponse data.
 */
export class ApiError extends Error {
  public readonly detail: string;
  public readonly retryAfter?: number;
  public readonly statusCode: number;

  constructor(response: ErrorResponse, statusCode: number) {
    super(response.detail);
    this.name = "ApiError";
    this.detail = response.detail;
    this.retryAfter = response.retry_after;
    this.statusCode = statusCode;
  }
}

/**
 * Parse an HTTP error response into a typed ErrorResponse, extracting
 * retry_after from both the JSON body and the Retry-After header.
 */
async function parseErrorResponse(
  response: Response
): Promise<ErrorResponse> {
  let detail = `Request failed with status ${response.status}`;
  let retry_after: number | undefined;

  try {
    const body = await response.json();
    if (body.detail) {
      detail = body.detail;
    }
    if (body.retry_after !== undefined) {
      retry_after = body.retry_after;
    }
  } catch {
    // If body isn't valid JSON, use the default detail message
  }

  // Also check the Retry-After header (takes precedence if present)
  const retryAfterHeader = response.headers.get("Retry-After");
  if (retryAfterHeader) {
    const parsed = Number(retryAfterHeader);
    if (!Number.isNaN(parsed)) {
      retry_after = parsed;
    }
  }

  return { detail, retry_after };
}

/**
 * Fetch data for a single ticker from the backend.
 *
 * GET /api/screener/{ticker}
 *
 * @throws {ApiError} on 404, 429, 503, or other HTTP errors
 * @throws {Error} on network failure or timeout
 */
export async function fetchTickerData(ticker: string): Promise<TickerResponse> {
  let response: Response;

  try {
    response = await fetch(`${BASE_URL}/api/screener/${encodeURIComponent(ticker)}`);
  } catch (error: unknown) {
    if (error instanceof TypeError) {
      throw new Error(
        `Network error: Unable to reach the server. Please check your connection and try again.`
      );
    }
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(
        `Request timed out while fetching data for ticker "${ticker}". Please try again.`
      );
    }
    throw new Error(
      `Network error: Failed to fetch data for ticker "${ticker}". ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  if (!response.ok) {
    const errorResponse = await parseErrorResponse(response);
    throw new ApiError(errorResponse, response.status);
  }

  const data: TickerResponse = await response.json();
  return data;
}

/**
 * Fetch summary data for all tickers (Nifty 500 constituents).
 *
 * GET /api/screener/all
 *
 * @throws {ApiError} on 429, 503, or other HTTP errors
 * @throws {Error} on network failure or timeout
 */
export async function fetchAllTickers(): Promise<AllTickersResponse> {
  let response: Response;

  try {
    response = await fetch(`${BASE_URL}/api/screener/all`);
  } catch (error: unknown) {
    if (error instanceof TypeError) {
      throw new Error(
        `Network error: Unable to reach the server. Please check your connection and try again.`
      );
    }
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(
        `Request timed out while fetching all tickers. Please try again.`
      );
    }
    throw new Error(
      `Network error: Failed to fetch all tickers. ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  if (!response.ok) {
    const errorResponse = await parseErrorResponse(response);
    throw new ApiError(errorResponse, response.status);
  }

  const data: AllTickersResponse = await response.json();
  return data;
}
