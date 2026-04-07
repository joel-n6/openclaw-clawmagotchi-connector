import type {
  ActivityCategory,
  ConnectorConfig,
  GitContext,
  ToolClassification,
} from "./types.js";
import type {
  PluginHookAfterToolCallEvent,
  PluginHookAgentContext,
  PluginHookBeforeModelResolveEvent,
} from "./openclaw-types.js";

function humanizeIdentifier(value: string): string {
  return value
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function bucketPromptLength(length: number): string {
  if (length <= 40) return "short";
  if (length <= 160) return "medium";
  return "long";
}

function resultKind(result: unknown): string {
  if (result === undefined) return "none";
  if (result === null) return "null";
  if (Array.isArray(result)) return "array";
  return typeof result;
}

function collectPresentValues<T>(values: Array<T | undefined>): T[] {
  return values.filter((value): value is T => value !== undefined);
}

export function buildPromptMetadata(
  detailLevel: ConnectorConfig["detailLevel"],
  event: PluginHookBeforeModelResolveEvent,
  ctx: PluginHookAgentContext,
): Record<string, unknown> {
  const base = {
    category: "communication",
    focus: "talk",
  };

  switch (detailLevel) {
    case "low":
      return base;
    case "high":
      return {
        ...base,
        channel: ctx.channelId,
        trigger: ctx.trigger ?? "user",
        provider: ctx.messageProvider,
        promptLengthBucket: bucketPromptLength(event.prompt.length),
      };
    case "medium":
    default:
      return {
        ...base,
        channel: ctx.channelId,
        trigger: ctx.trigger ?? "user",
        provider: ctx.messageProvider,
      };
  }
}

export function buildToolMetadata(params: {
  detailLevel: ConnectorConfig["detailLevel"];
  event: PluginHookAfterToolCallEvent;
  toolName: string;
  classification: ToolClassification;
}): Record<string, unknown> {
  const base = {
    tool: params.toolName,
    toolDisplayName: humanizeIdentifier(params.toolName),
    count: 1,
    category: params.classification.category ?? "automation",
    focus: params.classification.focus ?? "automate",
  };

  switch (params.detailLevel) {
    case "low":
      return base;
    case "high":
      return {
        ...base,
        durationSec:
          typeof params.event.durationMs === "number"
            ? Math.max(0, Math.round(params.event.durationMs / 100) / 10)
            : undefined,
        success: !params.event.error,
        toolCallId: params.event.toolCallId,
        paramKeyCount: Object.keys(params.event.params ?? {}).length,
        resultKind: resultKind(params.event.result),
      };
    case "medium":
    default:
      return {
        ...base,
        durationSec:
          typeof params.event.durationMs === "number"
            ? Math.max(0, Math.round(params.event.durationMs / 100) / 10)
            : undefined,
        success: !params.event.error,
      };
  }
}

export function buildCompletionMetadata(params: {
  detailLevel: ConnectorConfig["detailLevel"];
  category: string;
  durationSec?: number;
  sessionDurationSec: number;
  toolCount: number;
  includeGitMetadata: boolean;
  gitContext?: GitContext;
  categories: Set<ActivityCategory>;
  tools: Set<string>;
  successfulToolCount: number;
  failedToolCount: number;
  provider?: string;
  channelId?: string;
}): Record<string, unknown> {
  const toolHighlights = Array.from(params.tools)
    .slice(0, 3)
    .map((toolName) => humanizeIdentifier(toolName));
  const metadata: Record<string, unknown> = {
    category: params.category,
    focus: params.category,
    toolCount: params.toolCount,
  };

  if (params.detailLevel !== "low") {
    metadata.durationSec = params.durationSec;
    metadata.sessionDurationSec = params.sessionDurationSec;
    metadata.uniqueToolCount = params.tools.size;
    metadata.categories = Array.from(params.categories);
    metadata.provider = params.provider;
    metadata.channel = params.channelId;
    metadata.toolHighlights = toolHighlights;
  }

  if (params.detailLevel === "high") {
    metadata.tools = Array.from(params.tools).slice(0, 8);
    metadata.successfulToolCount = params.successfulToolCount;
    metadata.failedToolCount = params.failedToolCount;
  }

  if (!params.includeGitMetadata || !params.gitContext) {
    return metadata;
  }

  const gitValues = collectPresentValues([
    params.gitContext.repo,
    params.gitContext.branch,
    typeof params.gitContext.filesChanged === "number" ? String(params.gitContext.filesChanged) : undefined,
  ]);

  if (gitValues.length === 0) {
    return metadata;
  }

  if (params.gitContext.repo) {
    metadata.repo = params.gitContext.repo;
  }
  if (params.gitContext.branch) {
    metadata.branch = params.gitContext.branch;
  }
  if (typeof params.gitContext.filesChanged === "number") {
    metadata.filesChanged = params.gitContext.filesChanged;
  }

  return metadata;
}
