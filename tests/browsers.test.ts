import { describe, expect, it, vi } from "vitest";

import { Talona } from "../src/index.js";
import type { CreatedBrowser, Fetch } from "../src/index.js";

const createdBrowser: CreatedBrowser = {
  id: "browser_123",
  status: "ready",
  createdAt: "2026-08-15T12:00:00.000Z",
  expiresAt: "2026-08-15T12:10:00.000Z",
  metadata: { workflow: "test" },
  cdpUrl: "wss://api.talona.ai/cdp/browser_123?token=secret",
};

describe("browsers", () => {
  it("creates a browser with auth and an automatic idempotency key", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        json(createdBrowser, 201),
    );
    const talona = client(fetchMock);

    const browser = await talona.browsers.create({
      timeoutSeconds: 600,
      metadata: { workflow: "test" },
    });

    expect(browser).toEqual(createdBrowser);
    const [input, init] = fetchMock.mock.calls[0]!;
    const headers = new Headers(init?.headers);
    expect(String(input)).toBe("https://api.test/v1/browsers");
    expect(init?.method).toBe("POST");
    expect(headers.get("authorization")).toBe("Bearer talona_test");
    expect(headers.get("idempotency-key")).toMatch(/^[0-9a-f-]{36}$/);
    expect(headers.get("x-talona-client")).toBe("js/0.1.0");
    expect(JSON.parse(String(init?.body))).toEqual({
      timeoutSeconds: 600,
      metadata: { workflow: "test" },
    });
  });

  it("uses a caller-provided idempotency key", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        json(createdBrowser, 201),
    );
    const talona = client(fetchMock);

    await talona.browsers.create({}, { idempotencyKey: "job_123" });

    const headers = new Headers(fetchMock.mock.calls[0]![1]?.headers);
    expect(headers.get("idempotency-key")).toBe("job_123");
  });

  it("gets, lists, and stops browsers", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(createdBrowser))
      .mockResolvedValueOnce(json({ items: [createdBrowser] }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const talona = client(fetchMock);

    await expect(talona.browsers.get("browser/123")).resolves.toEqual(
      createdBrowser,
    );
    await expect(
      talona.browsers.list({ active: false, limit: 10 }),
    ).resolves.toEqual({ items: [createdBrowser] });
    await expect(talona.browsers.stop("browser/123")).resolves.toBeUndefined();

    expect(String(fetchMock.mock.calls[0]![0])).toMatch(
      /\/v1\/browsers\/browser%2F123$/,
    );
    expect(String(fetchMock.mock.calls[1]![0])).toMatch(
      /\/v1\/browsers\?active=false&limit=10$/,
    );
    expect(fetchMock.mock.calls[2]![1]?.method).toBe("DELETE");
  });

  it("validates browser parameters before sending a request", () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        json(createdBrowser),
    );
    const talona = client(fetchMock);

    expect(() => talona.browsers.create({ timeoutSeconds: 29 })).toThrow(
      "timeoutSeconds must be an integer between 30 and 86,400",
    );
    expect(() => talona.browsers.list({ limit: 201 })).toThrow(
      "limit must be an integer between 1 and 200",
    );
    expect(() => talona.browsers.get(" ")).toThrow(
      "browser id cannot be empty",
    );
    expect(() => talona.browsers.create({}, { idempotencyKey: "" })).toThrow(
      "idempotencyKey must contain 1–200 characters",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

function client(fetchMock: Fetch): Talona {
  return new Talona({
    apiKey: "talona_test",
    baseUrl: "https://api.test",
    fetch: fetchMock,
    maxRetries: 0,
  });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
