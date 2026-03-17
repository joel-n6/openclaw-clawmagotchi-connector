import path from "node:path";
import type { ConnectorConfig } from "./types.js";

const DEFAULT_TIMEOUT_MS = 5_000;
const DEFAULT_RETRY_COUNT = 2;
const DEFAULT_MAX_QUEUE_SIZE = 64;
const DEFAULT_SHUTDOWN_FLUSH_TIMEOUT_MS = 5_000;

type ResolveConfigResult =
  | { ok: true; config: ConnectorConfig }
  | { ok: false; errors: string[] };

function normalizeString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeInteger(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, value));
}

export function resolveWorkspaceId(
  explicitWorkspaceId: string | undefined,
  workspaceDir?: string,
): string | undefined {
  if (explicitWorkspaceId) {
    return explicitWorkspaceId;
  }
  if (!workspaceDir) {
    return undefined;
  }
  const basename = path.basename(workspaceDir).trim();
  return basename || undefined;
}

export function resolveConnectorConfig(
  rawConfig: Record<string, unknown> | undefined,
  workspaceDir?: string,
): ResolveConfigResult {
  const eventsUrl =
    normalizeString(rawConfig?.eventsUrl) ?? normalizeString(process.env.CLAWMAGOTCHI_EVENTS_URL);
  const connectionToken =
    normalizeString(rawConfig?.connectionToken) ??
    normalizeString(process.env.CLAWMAGOTCHI_CONNECTION_TOKEN);

  const errors: string[] = [];
  if (!eventsUrl) {
    errors.push(
      "Missing events URL. Set plugins.entries.openclaw-clawmagotchi-connector.config.eventsUrl or CLAWMAGOTCHI_EVENTS_URL.",
    );
  }
  if (!connectionToken) {
    errors.push(
      "Missing connection token. Set plugins.entries.openclaw-clawmagotchi-connector.config.connectionToken or CLAWMAGOTCHI_CONNECTION_TOKEN.",
    );
  }

  if (errors.length > 0 || !eventsUrl || !connectionToken) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    config: {
      eventsUrl,
      connectionToken,
      workspaceId: resolveWorkspaceId(normalizeString(rawConfig?.workspaceId), workspaceDir),
      petId: normalizeString(rawConfig?.petId) ?? "default",
      userId: normalizeString(rawConfig?.userId),
      source: normalizeString(rawConfig?.source) ?? "openclaw",
      timeoutMs: normalizeInteger(rawConfig?.timeoutMs, DEFAULT_TIMEOUT_MS, 1_000, 30_000),
      retryCount: normalizeInteger(rawConfig?.retryCount, DEFAULT_RETRY_COUNT, 0, 5),
      maxQueueSize: normalizeInteger(rawConfig?.maxQueueSize, DEFAULT_MAX_QUEUE_SIZE, 1, 500),
      includeGitMetadata: normalizeBoolean(rawConfig?.includeGitMetadata, false),
      flushOnShutdown: normalizeBoolean(rawConfig?.flushOnShutdown, true),
      shutdownFlushTimeoutMs: normalizeInteger(
        rawConfig?.shutdownFlushTimeoutMs,
        DEFAULT_SHUTDOWN_FLUSH_TIMEOUT_MS,
        250,
        30_000,
      ),
      emitPromptSent: normalizeBoolean(rawConfig?.emitPromptSent, true),
      emitToolUsed: normalizeBoolean(rawConfig?.emitToolUsed, true),
      emitTaskCompleted: normalizeBoolean(rawConfig?.emitTaskCompleted, true),
      emitResearchCompleted: normalizeBoolean(rawConfig?.emitResearchCompleted, true),
      emitCodingSessionCompleted: normalizeBoolean(rawConfig?.emitCodingSessionCompleted, true),
    },
  };
}
