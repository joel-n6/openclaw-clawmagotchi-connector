import test from "node:test";
import assert from "node:assert/strict";
import { buildCompletionMetadata } from "./completion-metadata.js";

test("buildCompletionMetadata omits git fields by default", () => {
  const metadata = buildCompletionMetadata({
    category: "coding",
    durationSec: 12,
    toolCount: 3,
    includeGitMetadata: false,
    gitContext: {
      repo: "joel-n6/openclaw-clawmagotchi-connector",
      branch: "main",
      filesChanged: 4,
    },
  });

  assert.deepEqual(metadata, {
    category: "coding",
    durationSec: 12,
    toolCount: 3,
  });
});

test("buildCompletionMetadata includes git fields when explicitly enabled", () => {
  const metadata = buildCompletionMetadata({
    category: "coding",
    toolCount: 3,
    includeGitMetadata: true,
    gitContext: {
      repo: "joel-n6/openclaw-clawmagotchi-connector",
      branch: "main",
      filesChanged: 0,
    },
  });

  assert.deepEqual(metadata, {
    category: "coding",
    durationSec: undefined,
    toolCount: 3,
    repo: "joel-n6/openclaw-clawmagotchi-connector",
    branch: "main",
    filesChanged: 0,
  });
});
