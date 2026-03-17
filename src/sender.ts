import { randomUUID } from "node:crypto";
import type { ConnectorConfig, ConnectorEvent } from "./types.js";
import type { PluginLogger } from "./openclaw-types.js";

type EventSender = {
  enqueue: (event: Omit<ConnectorEvent, "id" | "timestamp" | "version" | "source"> & { source?: string }) => void;
  flush: (timeoutMs?: number, reason?: string) => Promise<boolean>;
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

  logger.warn(`openclaw-clawmagotchi-connector: failed to deliver ${event.type}: ${lastError ?? "unknown error"}`);
}

type SenderOptions = {
  installShutdownHandlers?: boolean;
};

function waitForTimeout(timeoutMs: number): Promise<false> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), timeoutMs);
    timer.unref?.();
  });
}

export function createEventSender(
  config: ConnectorConfig,
  logger: PluginLogger,
  options: SenderOptions = {},
): EventSender {
  const queue: ConnectorEvent[] = [];
  let drainPromise: Promise<void> | undefined;
  const installShutdownHandlers = options.installShutdownHandlers ?? true;

  function drain(): Promise<void> {
    if (drainPromise) {
      return drainPromise;
    }

    drainPromise = (async () => {
      while (queue.length > 0) {
        const next = queue.shift();
        if (!next) {
          continue;
        }
        await postEvent(config, logger, next);
      }
    })().finally(() => {
      drainPromise = undefined;
    });

    return drainPromise;
  }

  async function flush(
    timeoutMs = config.shutdownFlushTimeoutMs,
    reason = "manual",
  ): Promise<boolean> {
    if (queue.length === 0 && !drainPromise) {
      return true;
    }

    const drained = await Promise.race([
      drain().then(() => true),
      waitForTimeout(timeoutMs),
    ]);

    if (!drained) {
      logger.warn(
        `openclaw-clawmagotchi-connector: timed out flushing queued events during ${reason}; ${queue.length} event(s) remain.`,
      );
    }

    return drained;
  }

  if (installShutdownHandlers && config.flushOnShutdown) {
    type ShutdownSignal = "SIGINT" | "SIGTERM";

    let shutdownStarted = false;

    const flushForSignal = (signal: ShutdownSignal) => {
      if (shutdownStarted) {
        return;
      }

      shutdownStarted = true;
      process.off(signal, onSignalHandlers[signal]);
      void flush(config.shutdownFlushTimeoutMs, signal).finally(() => {
        process.kill(process.pid, signal);
      });
    };

    const onBeforeExit = () => {
      if (shutdownStarted) {
        return;
      }

      shutdownStarted = true;
      void flush(config.shutdownFlushTimeoutMs, "beforeExit");
    };

    const onSignalHandlers: Record<ShutdownSignal, () => void> = {
      SIGINT: () => {
        flushForSignal("SIGINT");
      },
      SIGTERM: () => {
        flushForSignal("SIGTERM");
      },
    };

    process.once("beforeExit", onBeforeExit);
    process.once("SIGINT", onSignalHandlers.SIGINT);
    process.once("SIGTERM", onSignalHandlers.SIGTERM);
  }

  return {
    enqueue(event) {
      if (queue.length >= config.maxQueueSize) {
        logger.warn(
          `openclaw-clawmagotchi-connector: queue is full (${config.maxQueueSize}); dropping ${event.type}.`,
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
    flush,
  };
}
