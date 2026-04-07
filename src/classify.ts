import type { ActivityCategory, ActivityFocus, ToolClassification } from "./types.js";

const BUILD_TOOL_MATCHERS = ["edit", "patch", "fs", "file", "write"];
const EXECUTE_TOOL_MATCHERS = ["bash", "exec", "shell"];
const SHIP_TOOL_MATCHERS = ["git"];
const RESEARCH_TOOL_MATCHERS = ["browser", "search", "fetch", "crawl", "scrape", "docs", "web"];
const ORGANIZATION_TOOL_MATCHERS = ["memory", "note", "todo", "calendar", "tasks", "organize"];

function categoryToTags(category: ActivityCategory | undefined): string[] {
  switch (category) {
    case "coding":
      return ["coding", "project"];
    case "research":
      return ["research", "automation"];
    case "organization":
      return ["organization"];
    case "communication":
      return ["communication"];
    case "automation":
      return ["automation"];
    case undefined:
      return [];
  }
}

function matchesAny(toolName: string, candidates: string[]): boolean {
  return candidates.some((candidate) => toolName.includes(candidate));
}

export function classifyTool(toolName: string): ToolClassification {
  const normalized = toolName.trim().toLowerCase();
  let category: ActivityCategory | undefined;
  let focus: ActivityFocus | undefined;

  if (matchesAny(normalized, BUILD_TOOL_MATCHERS)) {
    category = "coding";
    focus = "build";
  } else if (matchesAny(normalized, EXECUTE_TOOL_MATCHERS)) {
    category = "coding";
    focus = "execute";
  } else if (matchesAny(normalized, SHIP_TOOL_MATCHERS)) {
    category = "coding";
    focus = "ship";
  } else if (matchesAny(normalized, RESEARCH_TOOL_MATCHERS)) {
    category = "research";
    focus = "inspect";
  } else if (matchesAny(normalized, ORGANIZATION_TOOL_MATCHERS)) {
    category = "organization";
    focus = "organize";
  } else if (normalized.includes("message") || normalized.includes("chat")) {
    category = "communication";
    focus = "talk";
  } else if (normalized) {
    category = "automation";
    focus = "automate";
  }

  return {
    category,
    focus,
    tags: categoryToTags(category),
  };
}

export function pickCompletionType(categories: Set<ActivityCategory>): "task_completed" | "research_completed" | "coding_session_completed" {
  if (categories.has("coding")) {
    return "coding_session_completed";
  }
  if (categories.has("research")) {
    return "research_completed";
  }
  return "task_completed";
}

export function pickPrimaryCategory(categories: Set<ActivityCategory>): ActivityCategory | undefined {
  if (categories.has("coding")) {
    return "coding";
  }
  if (categories.has("research")) {
    return "research";
  }
  if (categories.has("organization")) {
    return "organization";
  }
  if (categories.has("communication")) {
    return "communication";
  }
  if (categories.has("automation")) {
    return "automation";
  }
  return undefined;
}
