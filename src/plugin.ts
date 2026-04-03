import { classifyTool, pickCompletionType, pickPrimaryCategory } from "./classify.js";
import { resolveConnectorConfig, resolveWorkspaceId } from "./config.js";
import { inspectGitContext } from "./git-context.js";
import { buildCompletionMetadata, buildPromptMetadata, buildToolMetadata } from "./metadata.js";
import type {
  OpenClawPluginApi,
  PluginHookAgentContext,
  PluginHookAfterToolCallEvent,
  PluginHookToolContext,
} from "./openclaw-types.js";
import { createEventSender } from "./sender.js";
import type { ActivityCategory, ConnectorEventType, SessionActivity } from "./types.js";

const PLUGIN_ID = "openclaw-clawmagotchi-connector";

const CONFIG_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    eventsUrl: { type: "string" },
    connectionToken: { type: "string" },
    detailLevel: { type: "string", enum: ["low", "medium", "high"] },
    workspaceId: { type: "string" },
    petId: { type: "string" },
    userId: { type: "string" },
    source: { type: "string" },
    timeoutMs: { type: "integer" },
    retryCount: { type: "integer" },
    maxQueueSize: { type: "integer" },
    includeGitMetadata: { type: "boolean" },
    flushOnShutdown: { type: "boolean" },
    shutdownFlushTimeoutMs: { type: "integer" },
    emitPromptSent: { type: "boolean" },
    emitToolUsed: { type: "boolean" },
    emitTaskCompleted: { type: "boolean" },
    emitResearchCompleted: { type: "boolean" },
    emitCodingSessionCompleted: { type: "boolean" }
  }
} as const;

function shouldTrackTrigger(trigger: string | undefined): boolean {
  return trigger === undefined || trigger === "user";
}

function resolveSessionKey(params: {
  sessionId?: string;
  sessionKey?: string;
  runId?: string;
}): string | undefined {
  return params.sessionId ?? params.sessionKey ?? params.runId;
}

function ensureSession(
  sessions: Map<string, SessionActivity>,
  sessionId: string,
  workspaceId: string | undefined,
  channelId: string | undefined,
): SessionActivity {
  let session = sessions.get(sessionId);
  if (!session) {
      session = {
        sessionId,
        workspaceId,
        promptSeen: false,
        channelId,
        provider: undefined,
        startedAt: Date.now(),
        toolCount: 0,
        successfulToolCount: 0,
        failedToolCount: 0,
        categories: new Set<ActivityCategory>(),
        tools: new Set<string>(),
      };
    sessions.set(sessionId, session);
  }

  if (workspaceId && !session.workspaceId) {
    session.workspaceId = workspaceId;
  }
  if (channelId && !session.channelId) {
    session.channelId = channelId;
  }

  return session;
}

function buildCompletionTags(categories: Set<ActivityCategory>): string[] {
  return Array.from(categories);
}

function isLikelyManagedMacService(): boolean {
  return process.platform === "darwin" && Boolean(process.env.XPC_SERVICE_NAME?.trim());
}

function completionTypeEnabled(type: ConnectorEventType, flags: {
  emitTaskCompleted: boolean;
  emitResearchCompleted: boolean;
  emitCodingSessionCompleted: boolean;
}): boolean {
  switch (type) {
    case "task_completed":
      return flags.emitTaskCompleted;
    case "research_completed":
      return flags.emitResearchCompleted;
    case "coding_session_completed":
      return flags.emitCodingSessionCompleted;
    default:
      return true;
  }
}

function handleToolEvent(
  sessions: Map<string, SessionActivity>,
  ctx: PluginHookToolContext,
  event: PluginHookAfterToolCallEvent,
  workspaceId: string | undefined,
): SessionActivity | undefined {
  const sessionKey = resolveSessionKey(ctx);
  if (!sessionKey) {
    return undefined;
  }

  const session = ensureSession(sessions, sessionKey, workspaceId, undefined);
  if (!session.promptSeen) {
    return undefined;
  }

  const classification = classifyTool(event.toolName || ctx.toolName);
  session.toolCount += 1;
  session.tools.add(event.toolName || ctx.toolName);
  if (classification.category) {
    session.categories.add(classification.category);
  }

  return session;
}

export function createPlugin() {
  return {
    id: PLUGIN_ID,
    name: "Clawmagotchi Connector",
    description: "Emit safe Clawmagotchi activity events from OpenClaw lifecycle hooks.",
    configSchema: CONFIG_SCHEMA,
    register(api: OpenClawPluginApi) {
      const configResult = resolveConnectorConfig(api.pluginConfig, undefined);
      if (!configResult.ok) {
        for (const error of configResult.errors) {
          api.logger.warn(`${PLUGIN_ID}: ${error}`);
        }
        return;
      }

      const sender = createEventSender(configResult.config, api.logger);
      const sessions = new Map<string, SessionActivity>();

      api.logger.info(
        `${PLUGIN_ID}: config loaded (eventsUrl=${configResult.config.eventsUrlSource}, token=${configResult.config.connectionTokenSource}:${configResult.config.connectionTokenPreview})`,
      );

      if (
        isLikelyManagedMacService() &&
        (configResult.config.eventsUrlSource === "environment" ||
          configResult.config.connectionTokenSource === "environment")
      ) {
        api.logger.warn(
          `${PLUGIN_ID}: running under a managed macOS service with env-backed config. For production reliability, persist eventsUrl and connectionToken under plugins.entries.${PLUGIN_ID}.config and restart the gateway.`,
        );
      }

      api.on("before_model_resolve", (_event, ctx: PluginHookAgentContext) => {
        if (!shouldTrackTrigger(ctx.trigger)) {
          return;
        }

        const sessionKey = resolveSessionKey(ctx);
        if (!sessionKey) {
          return;
        }

        const session = ensureSession(
          sessions,
          sessionKey,
          resolveWorkspaceId(configResult.config.workspaceId, ctx.workspaceDir),
          ctx.channelId,
        );
        session.promptSeen = true;
        session.provider = ctx.messageProvider ?? session.provider;

        if (!configResult.config.emitPromptSent) {
          return;
        }

        sender.enqueue({
          type: "prompt_sent",
          userId: configResult.config.userId,
          petId: configResult.config.petId,
          workspaceId: session.workspaceId,
          sessionId: session.sessionId,
          outcome: "info",
          weight: 1,
          tags: ctx.channelId ? ["communication"] : [],
          metadata: buildPromptMetadata(configResult.config.detailLevel, _event, ctx),
        });
      });

      api.on("after_tool_call", (event, ctx) => {
        const session = handleToolEvent(sessions, ctx, event, configResult.config.workspaceId);
        if (!session || !configResult.config.emitToolUsed) {
          return;
        }

        const classification = classifyTool(event.toolName || ctx.toolName);
        if (event.error) {
          session.failedToolCount += 1;
        } else {
          session.successfulToolCount += 1;
        }
        sender.enqueue({
          type: "tool_used",
          userId: configResult.config.userId,
          petId: configResult.config.petId,
          workspaceId: session.workspaceId,
          sessionId: session.sessionId,
          outcome: event.error ? "failure" : "success",
          weight: event.error ? 0.5 : 1,
          tags: classification.tags,
          metadata: buildToolMetadata({
            detailLevel: configResult.config.detailLevel,
            event,
            toolName: event.toolName || ctx.toolName,
            classification,
          }),
        });
      });

      api.on("agent_end", async (event, ctx) => {
        const sessionKey = resolveSessionKey(ctx);
        if (!sessionKey) {
          return;
        }

        const session = sessions.get(sessionKey);
        sessions.delete(sessionKey);

        if (!session?.promptSeen || !event.success) {
          return;
        }

        const completionType = pickCompletionType(session.categories);
        if (
          !completionTypeEnabled(completionType, {
            emitTaskCompleted: configResult.config.emitTaskCompleted,
            emitResearchCompleted: configResult.config.emitResearchCompleted,
            emitCodingSessionCompleted: configResult.config.emitCodingSessionCompleted,
          })
        ) {
          return;
        }

        const gitContext = configResult.config.includeGitMetadata
          ? await inspectGitContext(ctx.workspaceDir)
          : undefined;
        const primaryCategory = pickPrimaryCategory(session.categories) ?? "general";

        sender.enqueue({
          type: completionType,
          userId: configResult.config.userId,
          petId: configResult.config.petId,
          workspaceId: session.workspaceId,
          sessionId: session.sessionId,
          outcome: "success",
          weight: completionType === "task_completed" ? 1 : 2,
          tags: buildCompletionTags(session.categories),
          metadata: buildCompletionMetadata({
            detailLevel: configResult.config.detailLevel,
            category: primaryCategory,
            durationSec:
              typeof event.durationMs === "number" ? Math.max(1, Math.round(event.durationMs / 1000)) : undefined,
            sessionDurationSec: Math.max(1, Math.round((Date.now() - session.startedAt) / 1000)),
            toolCount: session.toolCount,
            includeGitMetadata: configResult.config.includeGitMetadata,
            gitContext,
            categories: session.categories,
            tools: session.tools,
            successfulToolCount: session.successfulToolCount,
            failedToolCount: session.failedToolCount,
            provider: session.provider,
            channelId: session.channelId,
          }),
        });
      });

      api.logger.info(`${PLUGIN_ID}: plugin loaded`);
    },
  };
}
