import { Talona } from "@talona/sdk";

const talona = new Talona();
const run = await talona.agents.run({
  task: "Open example.com and report the page title",
  metadata: { example: "agent" },
});

if (run.status === "succeeded") console.log(run.output);
else console.error(run.status, run.error);
