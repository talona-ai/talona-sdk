import { describe, expect, it, vi } from "vitest";

import {
  Talona,
  TalonaAbortError,
  TalonaAuthenticationError,
  TalonaConnectionError,
  TalonaTimeoutError,
} from "../src/index.js";
import type { Fetch } from "../src/index.js";

const browser = {
  id: "browser_123",
  status: "ready",
  createdAt: "2026-08-15T12:00:00.000Z",
  expiresAt: "2026-08-15T12:10:00.000Z",
  metadata: {},
  cdpUrl: "wss://api.test/cdp/browser_123",
} as const;

describe("HTTP transport", () => {
  it("returns typed API errors with response context", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        json({ error: "invalid API key" }, 401, {
          "x-request-id": "req_123",
        }),
    );
    const talona = client(fetchMock, { maxRetries: 0 });

    const request = talona.browsers.list();
    await expect(request).rejects.toBeInstanceOf(TalonaAuthenticationError);
    await expect(request).rejects.toMatchObject({
      message: "invalid API key",
      status: 401,
      requestId: "req_123",
      body: { error: "invalid API key" },
    });
  });

  it("retries transient create failures with the same idempotency key", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        json({ error: "temporarily unavailable" }, 503, {
          "retry-after": "0",
        }),
      )
      .mockResolvedValueOnce(json(browser, 201));
    const talona = client(fetchMock, { maxRetries: 2 });

    await expect(talona.browsers.create()).resolves.toEqual(browser);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstKey = new Headers(fetchMock.mock.calls[0]![1]?.headers).get(
      "idempotency-key",
    );
    const secondKey = new Headers(fetchMock.mock.calls[1]![1]?.headers).get(
      "idempotency-key",
    );
    expect(firstKey).toBeTruthy();
    expect(secondKey).toBe(firstKey);
  });

  it("wraps network failures", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) => {
      throw new Error("socket closed");
    });
    const talona = client(fetchMock, { maxRetries: 0 });

    await expect(talona.browsers.list()).rejects.toBeInstanceOf(
      TalonaConnectionError,
    );
  });

  it("times out a hanging request", async () => {
    const fetchMock = vi.fn(
      (_input: URL | RequestInfo, init?: RequestInit): Promise<Response> =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    );
    const talona = client(fetchMock, { maxRetries: 0, timeoutMs: 5 });

    await expect(talona.browsers.list()).rejects.toBeInstanceOf(
      TalonaTimeoutError,
    );
  });

  it("honors caller cancellation", async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        json({ items: [] }),
    );
    const talona = client(fetchMock, { maxRetries: 0 });

    await expect(
      talona.browsers.list({}, { signal: controller.signal }),
    ).rejects.toBeInstanceOf(TalonaAbortError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

function client(
  fetchMock: Fetch,
  options: { maxRetries: number; timeoutMs?: number },
): Talona {
  return new Talona({
    apiKey: "talona_test",
    baseUrl: "https://api.test",
    fetch: fetchMock,
    maxRetries: options.maxRetries,
    ...(options.timeoutMs === undefined
      ? {}
      : { timeoutMs: options.timeoutMs }),
  });
}

function json(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}
