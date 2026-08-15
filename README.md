# Talona TypeScript SDK

The official TypeScript SDK for [Talona](https://talona.ai). Run Talona's hosted browser agent or connect your own agent to a managed browser over CDP.

> **Early access:** The Agent API, Browser API, and this SDK are under active development. Pin an exact SDK version before deploying to production.

## Install

```sh
npm install @talona/sdk
```

Node.js 20 or newer is required.

## Quickstart

Create an API key in the Talona developer dashboard and store it on your server:

```sh
TALONA_API_KEY=talona_your_api_key
```

```ts
import { Talona } from "@talona/sdk";

const talona = new Talona();
const run = await talona.agents.run({
  task: "Open example.com and report the page title",
});

console.log(run.output);
```

`agents.run()` starts the task and polls until it finishes. For queues or your own polling loop, use `agents.create()`, `agents.get()`, and `agents.cancel()`. See the [Agent API guide](./docs/agent-api.md).

## Bring your own agent

```ts
import { Talona } from "@talona/sdk";

const talona = new Talona();
const browser = await talona.browsers.create({
  timeoutSeconds: 15 * 60,
  metadata: { workflow: "research" },
});

try {
  console.log(browser.cdpUrl);
} finally {
  // Billing runs until the browser stops or its timeout expires.
  await talona.browsers.stop(browser.id);
}
```

The SDK reads `TALONA_API_KEY` automatically. You can also pass `apiKey` directly to `new Talona({ apiKey })`.

## Connect with Playwright

Install Playwright in your application:

```sh
npm install playwright-core
```

```ts
import { chromium } from "playwright-core";
import { Talona } from "@talona/sdk";

const talona = new Talona();
const browser = await talona.browsers.create({ timeoutSeconds: 10 * 60 });

try {
  const remote = await chromium.connectOverCDP(browser.cdpUrl);
  const context = remote.contexts()[0] ?? (await remote.newContext());
  const page = context.pages()[0] ?? (await context.newPage());

  await page.goto("https://example.com");
  console.log(await page.title());
  await remote.close();
} finally {
  // Closing the CDP client only disconnects it. Stop the Talona browser too.
  await talona.browsers.stop(browser.id);
}
```

See the complete [Playwright example](./examples/playwright.ts) and [Browser API guide](./docs/browser-api.md).

## Browser API

```ts
const browser = await talona.browsers.create({
  timeoutSeconds: 600,
  metadata: { customerId: "cus_123" },
});

const current = await talona.browsers.get(browser.id);
const active = await talona.browsers.list({ active: true, limit: 20 });
await talona.browsers.stop(browser.id);
```

Every method accepts request options as its final argument:

```ts
const browser = await talona.browsers.create(
  { timeoutSeconds: 600 },
  {
    timeoutMs: 20_000,
    maxRetries: 3,
    signal: abortController.signal,
    idempotencyKey: "your-stable-operation-id",
  },
);
```

Create requests receive an idempotency key automatically. The SDK retries safe failures twice by default and respects `Retry-After` responses. Configure defaults on the client:

```ts
const talona = new Talona({
  apiKey: process.env.TALONA_API_KEY,
  timeoutMs: 30_000,
  maxRetries: 2,
});
```

## Error handling

All SDK errors inherit from `TalonaError`. HTTP errors are typed and include the status, response body, headers, and request ID when the API provides one.

```ts
import { Talona, TalonaNotFoundError, TalonaRateLimitError } from "@talona/sdk";

const talona = new Talona();

try {
  await talona.browsers.get("browser_id");
} catch (error) {
  if (error instanceof TalonaNotFoundError) {
    console.log("That browser no longer exists.");
  } else if (error instanceof TalonaRateLimitError) {
    console.log("Request ID:", error.requestId);
  } else {
    throw error;
  }
}
```

## Security

API keys are secrets. Use this SDK only in trusted server-side code; never expose a Talona API key in a browser bundle or public repository. See [SECURITY.md](./SECURITY.md) to report a vulnerability privately.

## Contributing

Issues and pull requests are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for the local workflow.

## License

[MIT](./LICENSE)
