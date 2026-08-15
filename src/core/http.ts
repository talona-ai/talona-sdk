import {
  TalonaAbortError,
  TalonaAPIError,
  TalonaConnectionError,
  TalonaTimeoutError,
  createAPIError,
} from "../errors.js";
import type { Fetch, RequestOptions } from "../types.js";

const CLIENT_VERSION = "0.1.0";

interface HTTPClientOptions {
  apiKey: string;
  baseUrl: string;
  timeoutMs: number;
  maxRetries: number;
  fetch: Fetch;
}

interface InternalRequestOptions extends RequestOptions {
  body?: unknown;
  headers?: Record<string, string>;
  query?: Record<string, boolean | number | string | undefined>;
  retryable?: boolean;
}

export class HTTPClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultTimeoutMs: number;
  private readonly defaultMaxRetries: number;
  private readonly fetch: Fetch;

  constructor(options: HTTPClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl;
    this.defaultTimeoutMs = options.timeoutMs;
    this.defaultMaxRetries = options.maxRetries;
    this.fetch = options.fetch;
  }

  async request<T>(
    method: "DELETE" | "GET" | "POST",
    path: string,
    options: InternalRequestOptions = {},
  ): Promise<T> {
    const timeoutMs = options.timeoutMs ?? this.defaultTimeoutMs;
    const maxRetries = options.maxRetries ?? this.defaultMaxRetries;
    validateRequestNumber("timeoutMs", timeoutMs, 1);
    validateRequestNumber("maxRetries", maxRetries, 0);

    const url = new URL(path, `${this.baseUrl}/`);
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }

    const headers = new Headers({
      Accept: "application/json",
      Authorization: `Bearer ${this.apiKey}`,
      "X-Talona-Client": `js/${CLIENT_VERSION}`,
      ...options.headers,
    });
    let body: string | undefined;
    if (options.body !== undefined) {
      headers.set("Content-Type", "application/json");
      body = JSON.stringify(options.body);
    }

    for (let attempt = 0; ; attempt += 1) {
      try {
        const { response, text } = await this.fetchOnce(url, {
          headers,
          method,
          timeoutMs,
          ...(body === undefined ? {} : { body }),
          ...(options.signal === undefined ? {} : { signal: options.signal }),
        });

        if (response.ok) return parseSuccess<T>(response, text);

        if (
          options.retryable === true &&
          attempt < maxRetries &&
          shouldRetryStatus(response.status)
        ) {
          const delayMs = retryDelayMs(response.headers, attempt);
          await wait(delayMs, options.signal);
          continue;
        }

        throw responseError(response, text);
      } catch (error) {
        if (
          error instanceof TalonaAPIError ||
          error instanceof TalonaAbortError
        ) {
          throw error;
        }

        const retryableFailure =
          error instanceof TalonaConnectionError ||
          error instanceof TalonaTimeoutError;
        if (
          options.retryable === true &&
          retryableFailure &&
          attempt < maxRetries
        ) {
          await wait(retryDelayMs(undefined, attempt), options.signal);
          continue;
        }

        throw error;
      }
    }
  }

  private async fetchOnce(
    url: URL,
    options: {
      body?: string;
      headers: Headers;
      method: string;
      signal?: AbortSignal;
      timeoutMs: number;
    },
  ): Promise<{ response: Response; text: string }> {
    if (signalIsAborted(options.signal)) {
      throw new TalonaAbortError("Talona API request was aborted");
    }

    const controller = new AbortController();
    let timedOut = false;
    const onAbort = () => controller.abort(options.signal?.reason);
    options.signal?.addEventListener("abort", onAbort, { once: true });
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, options.timeoutMs);

    try {
      const response = await this.fetch(url, {
        headers: options.headers,
        method: options.method,
        signal: controller.signal,
        ...(options.body === undefined ? {} : { body: options.body }),
      });
      return { response, text: await response.text() };
    } catch (error) {
      if (signalIsAborted(options.signal)) {
        throw new TalonaAbortError("Talona API request was aborted", {
          cause: error,
        });
      }
      if (timedOut) {
        throw new TalonaTimeoutError(
          `Talona API request timed out after ${options.timeoutMs}ms`,
          { cause: error },
        );
      }
      throw new TalonaConnectionError("Could not connect to the Talona API", {
        cause: error,
      });
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", onAbort);
    }
  }
}

function parseSuccess<T>(response: Response, text: string): T {
  if (response.status === 204) return undefined as T;
  if (text.length === 0) return undefined as T;

  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new TalonaConnectionError(
      "Talona API returned an invalid JSON response",
      { cause: error },
    );
  }
}

function responseError(response: Response, text: string): TalonaAPIError {
  let body: unknown = text;
  if (text.length > 0) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      // Keep non-JSON API responses available to the caller as text.
    }
  }
  return createAPIError(response.status, body, new Headers(response.headers));
}

function shouldRetryStatus(status: number): boolean {
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

function retryDelayMs(headers: Headers | undefined, attempt: number): number {
  const retryAfter = headers?.get("retry-after");
  if (retryAfter !== undefined && retryAfter !== null) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1_000;

    const date = Date.parse(retryAfter);
    if (!Number.isNaN(date)) return Math.max(0, date - Date.now());
  }

  const base = Math.min(250 * 2 ** attempt, 4_000);
  return base * (0.75 + Math.random() * 0.5);
}

async function wait(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted === true) {
    throw new TalonaAbortError("Talona API request was aborted");
  }
  if (ms <= 0) return;

  await new Promise<void>((resolve, reject) => {
    const cleanup = () => signal?.removeEventListener("abort", onAbort);
    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      cleanup();
      reject(new TalonaAbortError("Talona API request was aborted"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function validateRequestNumber(
  name: string,
  value: number,
  minimum: number,
): void {
  if (!Number.isInteger(value) || value < minimum) {
    throw new TypeError(
      `${name} must be an integer greater than or equal to ${minimum}`,
    );
  }
}

function signalIsAborted(signal: AbortSignal | undefined): boolean {
  return signal?.aborted === true;
}
