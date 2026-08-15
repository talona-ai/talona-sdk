import { describe, expect, it, vi } from "vitest";

import { Talona } from "../src/index.js";
import type { AgentRun, Fetch } from "../src/index.js";

const run: AgentRun = {
  id: "00000000-0000-4000-8000-000000000001",
  status: "running",
  task: "Find the title",
  createdAt: "2026-08-15T12:00:00.000Z",
  startedAt: "2026-08-15T12:00:01.000Z",
  expiresAt: "2026-08-15T12:15:00.000Z",
  metadata: { job: "test" },
};

describe("agents", () => {
  it("creates, gets, lists, and cancels runs", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(run, 202))
      .mockResolvedValueOnce(json(run))
      .mockResolvedValueOnce(json({ items: [run] }))
      .mockResolvedValueOnce(json({ ...run, status: "cancelled" }));
    const talona = client(fetchMock);

    await talona.agents.create({
      task: run.task,
      timeoutSeconds: 900,
      metadata: run.metadata,
    });
    await talona.agents.get(run.id);
    await talona.agents.list({ limit: 10 });
    await talona.agents.cancel(run.id);

    expect(String(fetchMock.mock.calls[0]![0])).toBe(
      "https://api.test/v1/agent-runs",
    );
    expect(fetchMock.mock.calls[0]![1]?.method).toBe("POST");
    expect(String(fetchMock.mock.calls[2]![0])).toMatch(/\?limit=10$/);
    expect(String(fetchMock.mock.calls[3]![0])).toMatch(/\/cancel$/);
  });

  it("offers one-call create-and-poll", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(run, 202))
      .mockResolvedValueOnce(
        json({ ...run, status: "succeeded", output: "Example Domain" }),
      );
    const talona = client(fetchMock);

    const completed = await talona.agents.run(
      { task: run.task },
      { pollIntervalMs: 100 },
    );

    expect(completed.status).toBe("succeeded");
    expect(completed.output).toBe("Example Domain");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("validates agent parameters before a request", () => {
    const fetchMock = vi.fn(async () => json(run));
    const talona = client(fetchMock);

    expect(() => talona.agents.create({ task: "" })).toThrow(
      "task cannot be empty",
    );
    expect(() =>
      talona.agents.create({ task: "test", timeoutSeconds: 901 }),
    ).toThrow("timeoutSeconds must be an integer between 30 and 900");
    expect(() => talona.agents.list({ limit: 101 })).toThrow(
      "limit must be an integer between 1 and 100",
    );
    expect(() => talona.agents.get(" ")).toThrow(
      "agent run id cannot be empty",
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
