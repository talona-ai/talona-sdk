# Browser API guide

Talona browsers are managed browser sessions that your agent or automation framework controls over the Chrome DevTools Protocol (CDP).

## Lifecycle

1. Create a browser with `talona.browsers.create()`.
2. Connect Playwright, Puppeteer, or another CDP client to `cdpUrl`.
3. Run your automation.
4. Disconnect the CDP client.
5. Stop the managed browser with `talona.browsers.stop(id)`.

Disconnecting Playwright or Puppeteer does not stop the Talona browser. Billing continues until `stop` succeeds or `timeoutSeconds` expires, so put `stop` in a `finally` block.

```ts
const browser = await talona.browsers.create({ timeoutSeconds: 600 });

try {
  // Connect to browser.cdpUrl and run your work.
} finally {
  await talona.browsers.stop(browser.id);
}
```

## Create a browser

```ts
const browser = await talona.browsers.create({
  timeoutSeconds: 600,
  metadata: {
    customerId: "cus_123",
    workflow: "checkout",
  },
});
```

`timeoutSeconds` must be between 30 seconds and 24 hours. Metadata supports up to 20 string key/value pairs.

Every create request gets a generated idempotency key. If your application needs to retry the same logical operation across processes, provide a stable key:

```ts
const browser = await talona.browsers.create(
  { timeoutSeconds: 600 },
  { idempotencyKey: "job_123:create-browser" },
);
```

## Reconnect to a browser

```ts
const browser = await talona.browsers.get("browser_id");

if (browser.cdpUrl) {
  // The browser is currently connectable.
}
```

The API returns `cdpUrl` only while the browser can accept a connection. Treat CDP endpoints as short-lived credentials and do not log or persist them unnecessarily.

## List browsers

```ts
const { items } = await talona.browsers.list({
  active: true,
  limit: 50,
});
```

## Stop a browser

```ts
await talona.browsers.stop("browser_id");
```

A successful stop returns no value. Stop calls are safely retryable.

## Timeouts, retries, and cancellation

The SDK uses a 30-second per-attempt HTTP timeout and retries safe transient failures twice. It retries network failures, timeouts, and HTTP 408, 409, 429, and 5xx responses. Create requests are safe to retry because the SDK reuses their idempotency key.

```ts
const controller = new AbortController();

const browser = await talona.browsers.create(
  { timeoutSeconds: 600 },
  { signal: controller.signal, timeoutMs: 10_000, maxRetries: 1 },
);
```

The HTTP timeout controls how long the SDK waits for each API attempt. It does not change the managed browser's `timeoutSeconds` lifecycle limit.

## Custom Fetch

For instrumentation or tests, supply a Fetch-compatible function:

```ts
const talona = new Talona({
  fetch: instrumentedFetch,
});
```
