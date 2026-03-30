import test from "node:test";
import assert from "node:assert/strict";
import { buildCompletionMetadata } from "./metadata.js";

test("buildCompletionMetadata omits git fields by default", () => {
  const metadata = buildCompletionMetadata({
    detailLevel: "medium",
    category: "coding",
    durationSec: 12,
    sessionDurationSec: 15,
    toolCount: 3,
    includeGitMetadata: false,
    categories: new Set(["coding"]),
    tools: new Set(["bash", "apply_patch"]),
    successfulToolCount: 3,
    failedToolCount: 0,
    gitContext: {
      repo: "joel-n6/openclaw-clawmagotchi-connector",
      branch: "main",
      filesChanged: 4,
    },
  });

  assert.deepEqual(metadata, {
    category: "coding",
    durationSec: 12,
    sessionDurationSec: 15,
    toolCount: 3,
    uniqueToolCount: 2,
    categories: ["coding"],
    provider: undefined,
    channel: undefined,
  });
});

test("buildCompletionMetadata includes git fields when explicitly enabled", () => {
  const metadata = buildCompletionMetadata({
    detailLevel: "high",
    category: "coding",
    toolCount: 3,
    sessionDurationSec: 18,
    includeGitMetadata: true,
    categories: new Set(["coding"]),
    tools: new Set(["bash", "apply_patch"]),
    successfulToolCount: 2,
    failedToolCount: 1,
    gitContext: {
      repo: "joel-n6/openclaw-clawmagotchi-connector",
      branch: "main",
      filesChanged: 0,
    },
  });

  assert.deepEqual(metadata, {
    category: "coding",
    durationSec: undefined,
    sessionDurationSec: 18,
    toolCount: 3,
    uniqueToolCount: 2,
    categories: ["coding"],
    provider: undefined,
    channel: undefined,
    tools: ["bash", "apply_patch"],
    successfulToolCount: 2,
    failedToolCount: 1,
    repo: "joel-n6/openclaw-clawmagotchi-connector",
    branch: "main",
    filesChanged: 0,
  });
});
