import { HTTPClient } from "./core/http.js";
import { TalonaError } from "./errors.js";
import { Browsers } from "./resources/browsers.js";
import { Agents } from "./resources/agents.js";
import type { TalonaOptions } from "./types.js";

const DEFAULT_BASE_URL = "https://api.talona.ai";

/** The official TypeScript client for Talona. */
export class Talona {
  readonly agents: Agents;
  readonly browsers: Browsers;

  constructor(options: TalonaOptions = {}) {
    const apiKey = options.apiKey ?? readEnvironmentKey();
    if (apiKey === undefined || apiKey.trim().length === 0) {
      throw new TalonaError(
        "Missing Talona API key. Pass apiKey or set TALONA_API_KEY.",
      );
    }

    const timeoutMs = options.timeoutMs ?? 30_000;
    const maxRetries = options.maxRetries ?? 2;
    validateNonNegativeInteger("maxRetries", maxRetries);
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1) {
      throw new TypeError("timeoutMs must be a positive integer");
    }

    const customFetch = options.fetch ?? globalThis.fetch;
    if (typeof customFetch !== "function") {
      throw new TalonaError(
        "No Fetch implementation is available. Talona requires Node.js 20 or newer.",
      );
    }

    const http = new HTTPClient({
      apiKey: apiKey.trim(),
      baseUrl: normalizeBaseUrl(options.baseUrl ?? DEFAULT_BASE_URL),
      fetch: customFetch,
      maxRetries,
      timeoutMs,
    });
    this.agents = new Agents(http);
    this.browsers = new Browsers(http);
  }
}

function readEnvironmentKey(): string | undefined {
  return typeof process === "undefined"
    ? undefined
    : process.env.TALONA_API_KEY;
}

function normalizeBaseUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new TypeError("baseUrl must be a valid URL");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new TypeError("baseUrl must use http or https");
  }
  if (url.search.length > 0 || url.hash.length > 0) {
    throw new TypeError("baseUrl cannot include a query string or fragment");
  }

  return url.toString().replace(/\/+$/, "");
}

function validateNonNegativeInteger(name: string, value: number): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new TypeError(`${name} must be a non-negative integer`);
  }
}
