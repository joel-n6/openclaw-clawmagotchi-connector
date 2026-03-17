export type ConnectorEventType =
  | "prompt_sent"
  | "tool_used"
  | "task_completed"
  | "research_completed"
  | "coding_session_completed";

export type ConnectorOutcome = "success" | "failure" | "partial" | "info";

export type ConnectorEvent = {
  id: string;
  version: 1;
  timestamp: string;
  source: string;
  type: ConnectorEventType;
  userId?: string;
  petId?: string;
  workspaceId?: string;
  sessionId?: string;
  tags?: string[];
  outcome?: ConnectorOutcome;
  weight?: number;
  metadata?: Record<string, unknown>;
};

export type ConnectorConfig = {
  eventsUrl: string;
  connectionToken: string;
  workspaceId?: string;
  petId?: string;
  userId?: string;
  source: string;
  timeoutMs: number;
  retryCount: number;
  maxQueueSize: number;
  includeGitMetadata: boolean;
  flushOnShutdown: boolean;
  shutdownFlushTimeoutMs: number;
  emitPromptSent: boolean;
  emitToolUsed: boolean;
  emitTaskCompleted: boolean;
  emitResearchCompleted: boolean;
  emitCodingSessionCompleted: boolean;
};

export type SessionActivity = {
  sessionId: string;
  workspaceId?: string;
  promptSeen: boolean;
  channelId?: string;
  startedAt: number;
  toolCount: number;
  categories: Set<ActivityCategory>;
  tools: Set<string>;
};

export type ActivityCategory = "automation" | "coding" | "communication" | "organization" | "research";

export type ToolClassification = {
  category?: ActivityCategory;
  tags: string[];
};

export type GitContext = {
  repo?: string;
  branch?: string;
  filesChanged?: number;
};
