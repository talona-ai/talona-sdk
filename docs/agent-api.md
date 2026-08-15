# Agent API

Talona Agent Runs execute complete web tasks with Talona's hosted agent and browser stack.

## Run a task

```ts
const run = await talona.agents.run({
  task: "Open example.com and report the page title",
  timeoutSeconds: 15 * 60,
});

console.log(run.status, run.output);
```

`run()` is the convenient create-and-poll helper. A successful request ends with `status: "succeeded"`; failures, cancellations, and timeouts are returned as terminal run resources rather than thrown as transport errors.

## Manage the lifecycle yourself

```ts
const run = await talona.agents.create({
  task: "Research the three leading options and compare them",
  metadata: { jobId: "job_123" },
});

const current = await talona.agents.get(run.id);
const recent = await talona.agents.list({ limit: 20 });

if (shouldStop) await talona.agents.cancel(run.id);
```

Run statuses are `queued`, `running`, `waiting`, `succeeded`, `failed`, `cancelling`, `cancelled`, and `timed_out`.

`waiting` means the agent needs human input that the current early-access API does not yet accept. Cancel the run or complete the task in Talona Chat.

## Timeouts and cleanup

Every run has a hard timeout between 30 seconds and 15 minutes. Talona releases the associated browser on success, failure, cancellation, or timeout. API usage is charged to the API credit wallet.
