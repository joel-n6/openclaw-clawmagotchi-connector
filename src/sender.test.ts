import test from "node:test";
import assert from "node:assert/strict";
import { createEventSender } from "./sender.js";
import type { ConnectorConfig } from "./types.js";

const baseConfig: ConnectorConfig = {
  eventsUrl: "https://example.supabase.co/functions/v1/events",
  connectionToken: "claw_link_secret",
  workspaceId: "clawmagotchi",
  petId: "default",
  userId: undefined,
  source: "openclaw",
  timeoutMs: 1_000,
  retryCount: 0,
  maxQueueSize: 16,
  includeGitMetadata: false,
  flushOnShutdown: true,
  shutdownFlushTimeoutMs: 50,
  emitPromptSent: true,
  emitToolUsed: true,
  emitTaskCompleted: true,
  emitResearchCompleted: true,
  emitCodingSessionCompleted: true,
};

const logger = {
  debug: (_message: string) => {},
  info: (_message: string) => {},
  warn: (_message: string) => {},
  error: (_message: string) => {},
};

test("sender flush drains queued events", async () => {
  const originalFetch = globalThis.fetch;
  const delivered: string[] = [];

  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    delivered.push(String(init?.body));
    return new Response(null, { status: 200 });
  }) as typeof fetch;

  try {
    const sender = createEventSender(baseConfig, logger, { installShutdownHandlers: false });

    sender.enqueue({
      type: "prompt_sent",
      workspaceId: "clawmagotchi",
      sessionId: "session-1",
    });

    const flushed = await sender.flush(250, "test");
    assert.equal(flushed, true);
    assert.equal(delivered.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("sender flush reports timeout when delivery is still in flight", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (() => new Promise<Response>(() => {})) as typeof fetch;

  try {
    const sender = createEventSender(baseConfig, logger, { installShutdownHandlers: false });

    sender.enqueue({
      type: "tool_used",
      workspaceId: "clawmagotchi",
      sessionId: "session-2",
    });

    const flushed = await sender.flush(10, "test-timeout");
    assert.equal(flushed, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
