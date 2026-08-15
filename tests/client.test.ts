import { afterEach, describe, expect, it, vi } from "vitest";

import { Talona, TalonaError } from "../src/index.js";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("Talona", () => {
  it("reads the API key from the environment", async () => {
    vi.stubEnv("TALONA_API_KEY", "talona_test");
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        json({ items: [] }),
    );
    const talona = new Talona({ fetch: fetchMock });

    await talona.browsers.list();

    const [input, init] = fetchMock.mock.calls[0]!;
    expect(String(input)).toBe("https://api.talona.ai/v1/browsers");
    expect(new Headers(init?.headers).get("authorization")).toBe(
      "Bearer talona_test",
    );
  });

  it("requires an API key", () => {
    vi.stubEnv("TALONA_API_KEY", "");
    expect(() => new Talona()).toThrow(TalonaError);
    expect(() => new Talona()).toThrow("Missing Talona API key");
  });

  it("supports a custom base URL with a path", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        json({ items: [] }),
    );
    const talona = new Talona({
      apiKey: "talona_test",
      baseUrl: "http://localhost:3000/api/",
      fetch: fetchMock,
    });

    await talona.browsers.list();

    expect(String(fetchMock.mock.calls[0]![0])).toBe(
      "http://localhost:3000/api/v1/browsers",
    );
  });

  it("validates client configuration", () => {
    expect(
      () => new Talona({ apiKey: "key", baseUrl: "file:///tmp/api" }),
    ).toThrow("baseUrl must use http or https");
    expect(() => new Talona({ apiKey: "key", timeoutMs: 0 })).toThrow(
      "timeoutMs must be a positive integer",
    );
    expect(() => new Talona({ apiKey: "key", maxRetries: -1 })).toThrow(
      "maxRetries must be a non-negative integer",
    );
  });
});

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
  });
}
