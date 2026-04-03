import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_EVENTS_URL, resolveConnectorConfig, resolveWorkspaceId } from "./config.js";

test("resolveConnectorConfig accepts explicit config", () => {
  const result = resolveConnectorConfig({
    connectionToken: "claw_link_secret",
    workspaceId: "clawmagotchi",
  });

  assert.equal(result.ok, true);
  if (!result.ok) {
    throw new Error("expected config to resolve");
  }

  assert.equal(result.config.workspaceId, "clawmagotchi");
  assert.equal(result.config.eventsUrl, DEFAULT_EVENTS_URL);
  assert.equal(result.config.source, "openclaw");
  assert.equal(result.config.detailLevel, "medium");
  assert.equal(result.config.eventsUrlSource, "plugin_config");
  assert.equal(result.config.connectionTokenSource, "plugin_config");
  assert.equal(result.config.connectionTokenPreview, "claw_link_se...cret");
  assert.equal(result.config.emitToolUsed, true);
  assert.equal(result.config.includeGitMetadata, false);
  assert.equal(result.config.flushOnShutdown, true);
  assert.equal(result.config.shutdownFlushTimeoutMs, 5_000);
});

test("resolveConnectorConfig accepts CLAWMAGOTCHI env vars by default", () => {
  const previousEventsUrl = process.env.CLAWMAGOTCHI_EVENTS_URL;
  const previousConnectionToken = process.env.CLAWMAGOTCHI_CONNECTION_TOKEN;

  process.env.CLAWMAGOTCHI_CONNECTION_TOKEN = "claw_link_secret";

  try {
    const result = resolveConnectorConfig(undefined);
    assert.equal(result.ok, true);
    if (!result.ok) {
      throw new Error("expected config to resolve from environment");
    }

    assert.equal(result.config.eventsUrl, DEFAULT_EVENTS_URL);
    assert.equal(result.config.connectionToken, "claw_link_secret");
    assert.equal(result.config.eventsUrlSource, "plugin_config");
    assert.equal(result.config.connectionTokenSource, "environment");
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

    assert.equal(result.errors.length, 1);
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

test("resolveConnectorConfig accepts explicit detail levels", () => {
  const result = resolveConnectorConfig({
    connectionToken: "claw_link_secret",
    detailLevel: "high",
  });

  assert.equal(result.ok, true);
  if (!result.ok) {
    throw new Error("expected config to resolve");
  }

  assert.equal(result.config.detailLevel, "high");
});

test("explicit config wins over environment variables", () => {
  const previousEventsUrl = process.env.CLAWMAGOTCHI_EVENTS_URL;
  const previousConnectionToken = process.env.CLAWMAGOTCHI_CONNECTION_TOKEN;

  process.env.CLAWMAGOTCHI_EVENTS_URL = "https://env.example/functions/v1/events";
  process.env.CLAWMAGOTCHI_CONNECTION_TOKEN = "claw_link_envsecret";

  try {
    const result = resolveConnectorConfig({
      connectionToken: "claw_link_configsecret",
    });
    assert.equal(result.ok, true);
    if (!result.ok) {
      throw new Error("expected explicit config to resolve");
    }

    assert.equal(result.config.eventsUrl, "https://env.example/functions/v1/events");
    assert.equal(result.config.connectionToken, "claw_link_configsecret");
    assert.equal(result.config.eventsUrlSource, "environment");
    assert.equal(result.config.connectionTokenSource, "plugin_config");
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

test("resolveConnectorConfig falls back to the built-in production events URL", () => {
  const previousEventsUrl = process.env.CLAWMAGOTCHI_EVENTS_URL;
  const previousConnectionToken = process.env.CLAWMAGOTCHI_CONNECTION_TOKEN;

  delete process.env.CLAWMAGOTCHI_EVENTS_URL;
  process.env.CLAWMAGOTCHI_CONNECTION_TOKEN = "claw_link_secret";

  try {
    const result = resolveConnectorConfig(undefined);
    assert.equal(result.ok, true);
    if (!result.ok) {
      throw new Error("expected config to resolve");
    }

    assert.equal(result.config.eventsUrl, DEFAULT_EVENTS_URL);
    assert.equal(result.config.eventsUrlSource, "plugin_config");
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
