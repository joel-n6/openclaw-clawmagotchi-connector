# openclaw-clawmagotchi-connector

Native OpenClaw plugin that emits safe, bounded activity events to the Clawmagotchi app backend.

This is an external installable OpenClaw plugin, not a contribution to OpenClaw itself.

## What it does

- emits `prompt_sent`
- emits `tool_used`
- emits `task_completed`
- emits `research_completed`
- emits `coding_session_completed`

The plugin is intentionally conservative:

- no prompt text
- no transcript text
- no command output
- no file contents
- no raw diffs
- no secrets

It only sends small metadata such as tool names, durations, workspace ids, and lightweight git context when available.

## Install

Runtime requirements:

- OpenClaw
- Node 22 or newer

Install through OpenClaw:

```bash
openclaw plugins install openclaw-clawmagotchi-connector
openclaw plugins enable clawmagotchi-connector
```

## Configure

Add plugin config in your OpenClaw config:

```json
{
  "plugins": {
    "entries": {
      "clawmagotchi-connector": {
        "enabled": true,
        "config": {
          "eventsUrl": "https://YOUR_PROJECT.supabase.co/functions/v1/events",
          "connectionToken": "claw_link_...",
          "workspaceId": "clawmagotchi"
        }
      }
    }
  }
}
```

You can also provide the two sensitive values with environment variables instead of config:

- `CLAWMAGOTCHI_EVENTS_URL`
- `CLAWMAGOTCHI_CONNECTION_TOKEN`

Optional config:

- `petId`
- `userId`
- `source`
- `timeoutMs`
- `retryCount`
- `maxQueueSize`
- `emitPromptSent`
- `emitToolUsed`
- `emitTaskCompleted`
- `emitResearchCompleted`
- `emitCodingSessionCompleted`

## Event mapping

First pass behavior:

- `before_model_resolve` -> `prompt_sent`
- `after_tool_call` -> `tool_used`
- `agent_end` -> one completion event for successful user-triggered runs

Completion type is inferred from the tools used during the run:

- coding-heavy tools -> `coding_session_completed`
- research-heavy tools -> `research_completed`
- everything else -> `task_completed`

## Development

Install local dev tooling:

```bash
pnpm install
```

Run checks:

```bash
pnpm check
pnpm test
```

## Security notes

- Treat the connection token as a write-scoped secret.
- Prefer environment variables if you do not want the token stored in config.
- Review plugin behavior before installing it in a production OpenClaw setup.
