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

It only sends small metadata such as tool names, durations, and workspace ids.

Git metadata is privacy-safe by default:

- repo, branch, and changed-file count are not sent unless you explicitly enable `includeGitMetadata`

## Install

Runtime requirements:

- OpenClaw
- Node 22 or newer

Install through OpenClaw:

```bash
openclaw plugins install openclaw-clawmagotchi-connector
openclaw plugins enable openclaw-clawmagotchi-connector
```

If `openclaw plugins install openclaw-clawmagotchi-connector` reports a `plugins.allow` validation error, continue with the `enable` step above, then add the plugin id to `plugins.allow`, and restart the gateway. Some OpenClaw versions validate trust settings before the install record is fully written.

Then explicitly trust the plugin id in your OpenClaw config:

```json
{
  "plugins": {
    "allow": [
      "openclaw-clawmagotchi-connector"
    ]
  }
}
```

Without `plugins.allow`, OpenClaw may still discover and load the connector, but it will warn on restart that non-bundled plugins are not pinned to an explicit trusted list.

## Configure

By default, the connector reads these two environment variables:

- `CLAWMAGOTCHI_EVENTS_URL`
- `CLAWMAGOTCHI_CONNECTION_TOKEN`

This is the recommended setup, and it matches the Clawmagotchi iOS app's copy/share flow.

Example `.env`:

```dotenv
CLAWMAGOTCHI_CONNECTION_TOKEN="claw_link_..."
CLAWMAGOTCHI_EVENTS_URL="https://YOUR_PROJECT.supabase.co/functions/v1/events"
```

Then enable the plugin in your OpenClaw config:

```json
{
  "plugins": {
    "allow": [
      "openclaw-clawmagotchi-connector"
    ],
    "entries": {
      "openclaw-clawmagotchi-connector": {
        "enabled": true
      }
    }
  }
}
```

If you prefer, you can also set the sensitive values directly in plugin config:

```json
{
  "plugins": {
    "allow": [
      "openclaw-clawmagotchi-connector"
    ],
    "entries": {
      "openclaw-clawmagotchi-connector": {
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

When both are present, explicit plugin config wins over environment variables.

Optional config:

- `detailLevel` (`low`, `medium`, `high`; defaults to `medium`)
- `petId`
- `userId`
- `source`
- `timeoutMs`
- `retryCount`
- `maxQueueSize`
- `includeGitMetadata` (defaults to `false`)
- `flushOnShutdown` (defaults to `true`)
- `shutdownFlushTimeoutMs` (defaults to `5000`)
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

## Detail levels

The connector now supports a safe metadata detail dial:

- `low`: minimal product signal only
- `medium`: recommended default, with enough context to make the activity stream useful
- `high`: richer safe summaries such as tool lists, session counts, and prompt-length buckets

All levels still avoid:
- prompt text
- transcript text
- command output
- file contents
- raw diffs
- secrets

Examples:

- `low`
  - prompt events carry only a broad category
  - tool events carry tool name and category
  - completion events carry category and tool count
- `medium`
  - adds provider/channel, durations, session duration, category list, and unique tool count
- `high`
  - adds tool lists, success/failure tool counts, prompt-length bucket, tool call id, parameter-key count, and result kind

`includeGitMetadata` remains a separate opt-in and still defaults to `false`.

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
- Git metadata is opt-in. Leave `includeGitMetadata` unset unless you explicitly want repo context sent with completion events.
- Review plugin behavior before installing it in a production OpenClaw setup.

## Reliability notes

- The sender retries transient failures and keeps a bounded in-memory queue.
- On normal shutdown and common termination signals, the plugin attempts to flush queued events before exit.
- Abrupt process crashes can still drop in-flight events because the queue is not yet disk-backed.
