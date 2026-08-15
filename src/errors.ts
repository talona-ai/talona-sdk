/** Base class for every error raised by the Talona SDK. */
export class TalonaError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "TalonaError";
  }
}

/** An HTTP error response from the Talona API. */
export class TalonaAPIError extends TalonaError {
  readonly status: number;
  readonly body: unknown;
  readonly headers: Headers;
  readonly requestId?: string;

  constructor(
    message: string,
    status: number,
    body: unknown,
    headers: Headers,
    requestId?: string,
  ) {
    super(message);
    this.name = "TalonaAPIError";
    this.status = status;
    this.body = body;
    this.headers = headers;
    if (requestId !== undefined) this.requestId = requestId;
  }
}

export class TalonaBadRequestError extends TalonaAPIError {
  override name = "TalonaBadRequestError";
}

export class TalonaAuthenticationError extends TalonaAPIError {
  override name = "TalonaAuthenticationError";
}

export class TalonaPermissionDeniedError extends TalonaAPIError {
  override name = "TalonaPermissionDeniedError";
}

export class TalonaNotFoundError extends TalonaAPIError {
  override name = "TalonaNotFoundError";
}

export class TalonaConflictError extends TalonaAPIError {
  override name = "TalonaConflictError";
}

export class TalonaRateLimitError extends TalonaAPIError {
  override name = "TalonaRateLimitError";
}

export class TalonaInternalServerError extends TalonaAPIError {
  override name = "TalonaInternalServerError";
}

/** A network failure before the API returned a response. */
export class TalonaConnectionError extends TalonaError {
  override name = "TalonaConnectionError";
}

/** A request that exceeded its per-attempt timeout. */
export class TalonaTimeoutError extends TalonaError {
  override name = "TalonaTimeoutError";
}

/** A request cancelled through its AbortSignal. */
export class TalonaAbortError extends TalonaError {
  override name = "TalonaAbortError";
}

type APIErrorConstructor = new (
  message: string,
  status: number,
  body: unknown,
  headers: Headers,
  requestId?: string,
) => TalonaAPIError;

export function createAPIError(
  status: number,
  body: unknown,
  headers: Headers,
): TalonaAPIError {
  const ErrorClass: APIErrorConstructor =
    status === 400
      ? TalonaBadRequestError
      : status === 401
        ? TalonaAuthenticationError
        : status === 403
          ? TalonaPermissionDeniedError
          : status === 404
            ? TalonaNotFoundError
            : status === 409
              ? TalonaConflictError
              : status === 429
                ? TalonaRateLimitError
                : status >= 500
                  ? TalonaInternalServerError
                  : TalonaAPIError;

  const requestId = headers.get("x-request-id") ?? headers.get("x-vercel-id");
  return new ErrorClass(
    errorMessage(body, status),
    status,
    body,
    headers,
    requestId ?? undefined,
  );
}

function errorMessage(body: unknown, status: number): string {
  if (typeof body === "object" && body !== null) {
    const value = body as Record<string, unknown>;
    if (typeof value.message === "string") return value.message;
    if (typeof value.error === "string") return value.error;
    if (typeof value.detail === "string") return value.detail;
    if (
      typeof value.error === "object" &&
      value.error !== null &&
      typeof (value.error as Record<string, unknown>).message === "string"
    ) {
      return (value.error as { message: string }).message;
    }
  }

  return `Talona API request failed with status ${status}`;
}
