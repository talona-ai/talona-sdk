/** A managed Talona browser's current lifecycle state. */
export type BrowserStatus =
  "pending" | "ready" | "busy" | "closing" | "closed" | "failed";

/** String metadata attached to a browser session. */
export type BrowserMetadata = Record<string, string>;

/** A browser session returned by the Talona API. */
export interface Browser {
  /** The browser session ID. */
  id: string;
  status: BrowserStatus;
  createdAt: string;
  expiresAt: string;
  closedAt?: string;
  connectionId?: string;
  metadata: BrowserMetadata;
  /** A short-lived CDP endpoint, present while the browser can be connected to. */
  cdpUrl?: string;
}

/** A newly created browser, including its CDP endpoint. */
export interface CreatedBrowser extends Browser {
  cdpUrl: string;
}

export interface CreateBrowserParams {
  /** Stop the browser automatically after this many seconds (30–86,400). */
  timeoutSeconds?: number;
  /** Associate the browser with an existing Talona connection. */
  connectionId?: string;
  /** Up to 20 string key/value pairs for your own bookkeeping. */
  metadata?: BrowserMetadata;
}

export interface ListBrowsersParams {
  /** Return only active or only inactive browsers. */
  active?: boolean;
  /** Maximum number of browsers to return (1–200). */
  limit?: number;
}

export interface BrowserList {
  items: Browser[];
}

export type AgentRunStatus =
  | "queued"
  | "running"
  | "waiting"
  | "succeeded"
  | "failed"
  | "cancelling"
  | "cancelled"
  | "timed_out";

export interface AgentRun {
  id: string;
  status: AgentRunStatus;
  task: string;
  output?: string;
  error?: string;
  /** Browser session used by the run, once one has been created. */
  sessionId?: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  expiresAt: string;
  metadata: Record<string, string>;
}

export interface CreateAgentRunParams {
  task: string;
  /** Maximum execution time in seconds (30–900). */
  timeoutSeconds?: number;
  metadata?: Record<string, string>;
}

export interface ListAgentRunsParams {
  limit?: number;
}

export interface AgentRunList {
  items: AgentRun[];
}

export interface RunAgentOptions extends RequestOptions {
  /** Delay between status checks. Defaults to one second. */
  pollIntervalMs?: number;
}

/** Options accepted by every API request. */
export interface RequestOptions {
  /** Abort the request and any pending retry. */
  signal?: AbortSignal;
  /** Per-attempt request timeout in milliseconds. */
  timeoutMs?: number;
  /** Number of retries after the initial request. */
  maxRetries?: number;
}

export interface CreateBrowserOptions extends RequestOptions {
  /**
   * Deduplicates repeated create calls. A UUID is generated automatically and
   * reused for retries when this is omitted.
   */
  idempotencyKey?: string;
}

/** A Fetch-compatible request function. */
export type Fetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export interface TalonaOptions {
  /** Defaults to the `TALONA_API_KEY` environment variable. */
  apiKey?: string;
  /** Defaults to `https://api.talona.ai`. */
  baseUrl?: string;
  /** Per-attempt timeout in milliseconds. Defaults to 30 seconds. */
  timeoutMs?: number;
  /** Number of retries after the initial request. Defaults to 2. */
  maxRetries?: number;
  /** Custom Fetch implementation, useful for testing or instrumentation. */
  fetch?: Fetch;
}
