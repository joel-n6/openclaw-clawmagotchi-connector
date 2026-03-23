import test from "node:test";
import assert from "node:assert/strict";
import { resolveConnectorConfig, resolveWorkspaceId } from "./config.js";

test("resolveConnectorConfig accepts explicit config", () => {
  const result = resolveConnectorConfig({
    eventsUrl: "https://example.supabase.co/functions/v1/events",
    connectionToken: "claw_link_secret",
    workspaceId: "clawmagotchi",
  });

  assert.equal(result.ok, true);
  if (!result.ok) {
    throw new Error("expected config to resolve");
  }

  assert.equal(result.config.workspaceId, "clawmagotchi");
  assert.equal(result.config.source, "openclaw");
  assert.equal(result.config.emitToolUsed, true);
  assert.equal(result.config.includeGitMetadata, false);
  assert.equal(result.config.flushOnShutdown, true);
  assert.equal(result.config.shutdownFlushTimeoutMs, 5_000);
});

test("resolveConnectorConfig reports missing required values", () => {
  const previousEventsUrl = process.env.CLAWMAGOTCHI_EVENTS_URL;
  const previousConnectionToken = process.env.CLAWMAGOTCHI_CONNECTION_TOKEN;

  delete process.env.CLAWMAGOTCHI_EVENTS_URL;
  delete process.env.CLAWMAGOTCHI_CONNECTION_TOKEN;

  try {
    const result = resolveConnectorConfig({});
    assert.equal(result.ok, false);
    if (result.ok) {
      throw new Error("expected config resolution to fail");
    }

    assert.equal(result.errors.length, 2);
  } finally {
    if (previousEventsUrl === undefined) {
      delete process.env.CLAWMAGOTCHI_EVENTS_URL;
    } else {
      process.env.CLAWMAGOTCHI_EVENTS_URL = previousEventsUrl;
    }

    if (previousConnectionToken === undefined) {
      delete process.env.CLAWMAGOTCHI_CONNECTION_TOKEN;
    } else {
      process.env.CLAWMAGOTCHI_CONNECTION_TOKEN = previousConnectionToken;
    }
  }
});

test("resolveWorkspaceId falls back to the workspace directory name", () => {
  assert.equal(resolveWorkspaceId(undefined, "/tmp/workspaces/clawmagotchi"), "clawmagotchi");
});
