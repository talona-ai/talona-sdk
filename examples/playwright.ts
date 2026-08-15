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
  await talona.browsers.stop(browser.id);
}
