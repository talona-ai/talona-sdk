import { randomUUID } from "node:crypto";

import type { HTTPClient } from "../core/http.js";
import type {
  Browser,
  BrowserList,
  CreateBrowserOptions,
  CreateBrowserParams,
  CreatedBrowser,
  ListBrowsersParams,
  RequestOptions,
} from "../types.js";

export class Browsers {
  constructor(private readonly http: HTTPClient) {}

  /** Create a managed browser and receive its CDP endpoint. */
  create(
    params: CreateBrowserParams = {},
    options: CreateBrowserOptions = {},
  ): Promise<CreatedBrowser> {
    validateCreateParams(params);
    const { idempotencyKey = randomUUID(), ...requestOptions } = options;
    if (idempotencyKey.length < 1 || idempotencyKey.length > 200) {
      throw new TypeError("idempotencyKey must contain 1–200 characters");
    }

    return this.http.request<CreatedBrowser>("POST", "v1/browsers", {
      ...requestOptions,
      body: params,
      headers: { "Idempotency-Key": idempotencyKey },
      retryable: true,
    });
  }

  /** Retrieve one browser and a CDP endpoint when it is connectable. */
  get(id: string, options: RequestOptions = {}): Promise<Browser> {
    return this.http.request<Browser>("GET", `v1/browsers/${browserId(id)}`, {
      ...options,
      retryable: true,
    });
  }

  /** List browser sessions. */
  list(
    params: ListBrowsersParams = {},
    options: RequestOptions = {},
  ): Promise<BrowserList> {
    if (
      params.limit !== undefined &&
      (!Number.isInteger(params.limit) ||
        params.limit < 1 ||
        params.limit > 200)
    ) {
      throw new TypeError("limit must be an integer between 1 and 200");
    }

    return this.http.request<BrowserList>("GET", "v1/browsers", {
      ...options,
      query: { active: params.active, limit: params.limit },
      retryable: true,
    });
  }

  /** Stop a browser. Billing ends when this request succeeds. */
  stop(id: string, options: RequestOptions = {}): Promise<void> {
    return this.http.request<void>("DELETE", `v1/browsers/${browserId(id)}`, {
      ...options,
      retryable: true,
    });
  }
}

function browserId(id: string): string {
  if (id.trim().length === 0) throw new TypeError("browser id cannot be empty");
  return encodeURIComponent(id);
}

function validateCreateParams(params: CreateBrowserParams): void {
  if (
    params.timeoutSeconds !== undefined &&
    (!Number.isInteger(params.timeoutSeconds) ||
      params.timeoutSeconds < 30 ||
      params.timeoutSeconds > 86_400)
  ) {
    throw new TypeError(
      "timeoutSeconds must be an integer between 30 and 86,400",
    );
  }

  if (
    params.connectionId !== undefined &&
    params.connectionId.trim().length === 0
  ) {
    throw new TypeError("connectionId cannot be empty");
  }

  if (params.metadata === undefined) return;
  if (
    typeof params.metadata !== "object" ||
    params.metadata === null ||
    Array.isArray(params.metadata)
  ) {
    throw new TypeError("metadata must be an object of string key/value pairs");
  }

  const entries = Object.entries(params.metadata);
  if (entries.length > 20)
    throw new TypeError("metadata can contain at most 20 entries");
  for (const [key, value] of entries) {
    if (key.length < 1 || key.length > 64) {
      throw new TypeError("metadata keys must contain 1–64 characters");
    }
    if (typeof value !== "string" || value.length > 500) {
      throw new TypeError(
        "metadata values must be strings of at most 500 characters",
      );
    }
  }
}
