import type { HTTPClient } from "../core/http.js";
import type {
  AgentRun,
  AgentRunList,
  CreateAgentRunParams,
  ListAgentRunsParams,
  RequestOptions,
  RunAgentOptions,
} from "../types.js";

const terminal = new Set<AgentRun["status"]>([
  "succeeded",
  "failed",
  "cancelled",
  "timed_out",
]);

export class Agents {
  constructor(private readonly http: HTTPClient) {}

  /** Start one hosted Talona agent run. */
  create(
    params: CreateAgentRunParams,
    options: RequestOptions = {},
  ): Promise<AgentRun> {
    validateCreateParams(params);
    return this.http.request<AgentRun>("POST", "v1/agent-runs", {
      ...options,
      body: params,
    });
  }

  /** Retrieve the latest status and output for a run. */
  get(id: string, options: RequestOptions = {}): Promise<AgentRun> {
    return this.http.request<AgentRun>(
      "GET",
      `v1/agent-runs/${agentRunId(id)}`,
      { ...options, retryable: true },
    );
  }

  /** List recent agent runs. */
  list(
    params: ListAgentRunsParams = {},
    options: RequestOptions = {},
  ): Promise<AgentRunList> {
    if (
      params.limit !== undefined &&
      (!Number.isInteger(params.limit) ||
        params.limit < 1 ||
        params.limit > 100)
    ) {
      throw new TypeError("limit must be an integer between 1 and 100");
    }
    return this.http.request<AgentRunList>("GET", "v1/agent-runs", {
      ...options,
      query: { limit: params.limit },
      retryable: true,
    });
  }

  /** Cooperatively cancel a run and release its browser. */
  cancel(id: string, options: RequestOptions = {}): Promise<AgentRun> {
    return this.http.request<AgentRun>(
      "POST",
      `v1/agent-runs/${agentRunId(id)}/cancel`,
      { ...options, retryable: true },
    );
  }

  /** Start a run and poll until it reaches a terminal state. */
  async run(
    params: CreateAgentRunParams,
    options: RunAgentOptions = {},
  ): Promise<AgentRun> {
    const { pollIntervalMs = 1_000, ...requestOptions } = options;
    if (!Number.isInteger(pollIntervalMs) || pollIntervalMs < 100) {
      throw new TypeError("pollIntervalMs must be an integer of at least 100");
    }
    let run = await this.create(params, requestOptions);
    while (!terminal.has(run.status)) {
      await delay(pollIntervalMs, options.signal);
      run = await this.get(run.id, requestOptions);
    }
    return run;
  }
}

function agentRunId(id: string): string {
  if (id.trim().length === 0)
    throw new TypeError("agent run id cannot be empty");
  return encodeURIComponent(id);
}

function validateCreateParams(params: CreateAgentRunParams): void {
  if (typeof params.task !== "string" || params.task.trim().length === 0) {
    throw new TypeError("task cannot be empty");
  }
  if (params.task.length > 50_000) throw new TypeError("task is too long");
  if (
    params.timeoutSeconds !== undefined &&
    (!Number.isInteger(params.timeoutSeconds) ||
      params.timeoutSeconds < 30 ||
      params.timeoutSeconds > 900)
  ) {
    throw new TypeError("timeoutSeconds must be an integer between 30 and 900");
  }
  if (params.metadata && Object.keys(params.metadata).length > 20) {
    throw new TypeError("metadata can contain at most 20 entries");
  }
  for (const [key, value] of Object.entries(params.metadata ?? {})) {
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

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });
}
