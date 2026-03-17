import test from "node:test";
import assert from "node:assert/strict";
import { resolveConnectorConfig } from "./config.js";

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
});

test("resolveConnectorConfig reports missing required values", () => {
  const result = resolveConnectorConfig({});
  assert.equal(result.ok, false);
  if (result.ok) {
    throw new Error("expected config resolution to fail");
  }

  assert.equal(result.errors.length, 2);
});
