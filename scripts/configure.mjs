#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const PLUGIN_ID = "openclaw-clawmagotchi-connector";
const DEFAULT_EVENTS_URL = "https://uelzhzlvcuvsbxozpyov.supabase.co/functions/v1/events";

function parseArgs(argv) {
  const parsed = {
    eventsUrl: DEFAULT_EVENTS_URL,
    connectionToken: undefined,
    workspaceId: undefined,
    detailLevel: undefined,
    restart: true,
    enable: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case "--connection-token":
        parsed.connectionToken = argv[++index];
        break;
      case "--events-url":
        parsed.eventsUrl = argv[++index];
        break;
      case "--workspace-id":
        parsed.workspaceId = argv[++index];
        break;
      case "--detail-level":
        parsed.detailLevel = argv[++index];
        break;
      case "--no-restart":
        parsed.restart = false;
        break;
      case "--no-enable":
        parsed.enable = false;
        break;
      case "-h":
      case "--help":
        printHelp(0);
        break;
      default:
        console.error(`Unknown argument: ${arg}`);
        printHelp(1);
    }
  }

  if (!parsed.connectionToken) {
    console.error("Missing required --connection-token.");
    printHelp(1);
  }

  return parsed;
}

function printHelp(exitCode) {
  console.log(
    [
      "Configure the Clawmagotchi OpenClaw connector with persisted plugin config.",
      "",
      "Usage:",
      "  node scripts/configure.mjs --connection-token <token> [options]",
      "",
      "Options:",
      `  --events-url <url>     Override the built-in Clawmagotchi backend URL`,
      "  --workspace-id <id>   Persist a workspace id override",
      "  --detail-level <lvl>  Persist low, medium, or high detail level",
      "  --no-enable           Skip `openclaw plugins enable`",
      "  --no-restart          Skip gateway restart",
      "  -h, --help            Show this help",
    ].join("\n"),
  );
  process.exit(exitCode);
}

function runOpenClaw(args) {
  const result = spawnSync("openclaw", args, {
    stdio: "inherit",
  });

  if (result.error) {
    console.error(`Failed to run openclaw ${args.join(" ")}: ${result.error.message}`);
    process.exit(1);
  }

  if (typeof result.status === "number" && result.status !== 0) {
    process.exit(result.status);
  }
}

function tokenPreview(token) {
  if (token.length <= 12) {
    return token;
  }

  return `${token.slice(0, 12)}...${token.slice(-4)}`;
}

const options = parseArgs(process.argv.slice(2));

if (options.enable) {
  runOpenClaw(["plugins", "enable", PLUGIN_ID]);
}

runOpenClaw([
  "config",
  "set",
  `plugins.entries.${PLUGIN_ID}.config.eventsUrl`,
  options.eventsUrl,
]);
runOpenClaw([
  "config",
  "set",
  `plugins.entries.${PLUGIN_ID}.config.connectionToken`,
  options.connectionToken,
]);

if (options.workspaceId) {
  runOpenClaw([
    "config",
    "set",
    `plugins.entries.${PLUGIN_ID}.config.workspaceId`,
    options.workspaceId,
  ]);
}

if (options.detailLevel) {
  runOpenClaw([
    "config",
    "set",
    `plugins.entries.${PLUGIN_ID}.config.detailLevel`,
    options.detailLevel,
  ]);
}

if (options.restart) {
  runOpenClaw(["gateway", "restart"]);
}

console.log(
  [
    `Configured ${PLUGIN_ID}.`,
    `eventsUrl persisted to plugin config (${options.eventsUrl}).`,
    `token persisted to plugin config (${tokenPreview(options.connectionToken)}).`,
    options.restart ? "Gateway restarted." : "Remember to restart the gateway before testing.",
  ].join(" "),
);
