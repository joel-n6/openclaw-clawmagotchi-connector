import { randomUUID } from "node:crypto";
import type { ConnectorConfig, ConnectorEvent } from "./types.js";
import type { PluginLogger } from "./openclaw-types.js";

type EventSender = {
  enqueue: (event: Omit<ConnectorEvent, "id" | "timestamp" | "version" | "source"> & { source?: string }) => void;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildEventId(): string {
  return `evt_${randomUUID()}`;
}

async function postEvent(
  config: ConnectorConfig,
  logger: PluginLogger,
  event: ConnectorEvent,
): Promise<void> {
  let attempt = 0;
  let lastError: string | undefined;

  while (attempt <= config.retryCount) {
    attempt += 1;

    try {
      const response = await fetch(config.eventsUrl, {
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(config.timeoutMs),
        headers: {
          Authorization: `Bearer ${config.connectionToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      });

      if (response.ok) {
        return;
      }

      const bodyText = await response.text().catch(() => "");
      lastError = `${response.status} ${response.statusText}${bodyText ? `: ${bodyText}` : ""}`;
      if (response.status < 500) {
        break;
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    if (attempt <= config.retryCount) {
      await sleep(250 * attempt);
    }
  }

  logger.warn(`clawmagotchi-connector: failed to deliver ${event.type}: ${lastError ?? "unknown error"}`);
}

export function createEventSender(config: ConnectorConfig, logger: PluginLogger): EventSender {
  const queue: ConnectorEvent[] = [];
  let draining = false;

  async function drain(): Promise<void> {
    if (draining) {
      return;
    }

    draining = true;
    try {
      while (queue.length > 0) {
        const next = queue.shift();
        if (!next) {
          continue;
        }
        await postEvent(config, logger, next);
      }
    } finally {
      draining = false;
    }
  }

  return {
    enqueue(event) {
      if (queue.length >= config.maxQueueSize) {
        logger.warn(
          `clawmagotchi-connector: queue is full (${config.maxQueueSize}); dropping ${event.type}.`,
        );
        return;
      }

      queue.push({
        ...event,
        id: buildEventId(),
        version: 1,
        source: event.source ?? config.source,
        timestamp: new Date().toISOString(),
      });

      void drain();
    },
  };
}
