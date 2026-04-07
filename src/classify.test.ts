import test from "node:test";
import assert from "node:assert/strict";
import { classifyTool, pickCompletionType } from "./classify.js";
import type { ActivityCategory } from "./types.js";

test("classifyTool marks browser-like tools as research", () => {
  const classified = classifyTool("browser_search");
  assert.equal(classified.category, "research");
  assert.deepEqual(classified.tags, ["research", "automation"]);
});

test("classifyTool marks shell tools as coding", () => {
  const classified = classifyTool("exec_command");
  assert.equal(classified.category, "coding");
  assert.equal(classified.focus, "execute");
  assert.deepEqual(classified.tags, ["coding", "project"]);
});

test("classifyTool marks patch tools as build-focused coding", () => {
  const classified = classifyTool("apply_patch");
  assert.equal(classified.category, "coding");
  assert.equal(classified.focus, "build");
});

test("pickCompletionType prefers coding over research", () => {
  const categories = new Set<ActivityCategory>(["research", "coding"]);
  assert.equal(pickCompletionType(categories), "coding_session_completed");
});
