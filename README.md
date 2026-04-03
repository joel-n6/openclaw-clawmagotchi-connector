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

For production installs, persist the connector values into OpenClaw plugin config.

Recommended path:

```bash
openclaw plugins install openclaw-clawmagotchi-connector
openclaw plugins enable openclaw-clawmagotchi-connector
openclaw config set plugins.entries.openclaw-clawmagotchi-connector.config.connectionToken "claw_link_..."
openclaw gateway restart
```

What that does:

- enables the plugin
- writes the built-in Clawmagotchi production events URL into `plugins.entries.openclaw-clawmagotchi-connector.config`
- writes `connectionToken` into `plugins.entries.openclaw-clawmagotchi-connector.config`
- restarts the gateway

This is the most reliable setup for real users, especially on macOS where OpenClaw often runs as a LaunchAgent-managed service.

Optional persisted config:

```bash
openclaw config set plugins.entries.openclaw-clawmagotchi-connector.config.workspaceId "clawmagotchi"
openclaw config set plugins.entries.openclaw-clawmagotchi-connector.config.detailLevel "medium"
```

### Environment fallback

The connector can also read these environment variables:

- `CLAWMAGOTCHI_CONNECTION_TOKEN`
- `CLAWMAGOTCHI_EVENTS_URL` as an advanced override only

For ordinary users, the token is the only required setting. The production events URL is built into the connector. `CLAWMAGOTCHI_EVENTS_URL` remains available only for development or temporary backend override cases.

Example `.env`:

```dotenv
CLAWMAGOTCHI_CONNECTION_TOKEN="claw_link_..."
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

If you prefer to do the persisted setup manually, you can also set the sensitive values directly in plugin config:

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
          "connectionToken": "claw_link_...",
          "workspaceId": "clawmagotchi"
        }
      }
    }
  }
}
```

When both are present, explicit plugin config wins over environment variables.

Manual persisted setup via CLI:

```bash
openclaw config set plugins.entries.openclaw-clawmagotchi-connector.config.connectionToken "claw_link_..."
openclaw gateway restart
```

Advanced override for non-production backends only:

```bash
openclaw config set plugins.entries.openclaw-clawmagotchi-connector.config.eventsUrl "https://YOUR_PROJECT.supabase.co/functions/v1/events"
openclaw gateway restart
```

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

How to change it:

Set `detailLevel` in the plugin config:

```json
{
  "plugins": {
    "entries": {
      "openclaw-clawmagotchi-connector": {
        "enabled": true,
        "config": {
          "detailLevel": "medium"
        }
      }
    }
  }
}
```

Examples:

Use `low` if you want the smallest reasonable stream:

```json
{
  "plugins": {
    "entries": {
      "openclaw-clawmagotchi-connector": {
        "enabled": true,
        "config": {
          "detailLevel": "low"
        }
      }
    }
  }
}
```

Use `medium` for the recommended default:

```json
{
  "plugins": {
    "entries": {
      "openclaw-clawmagotchi-connector": {
        "enabled": true,
        "config": {
          "detailLevel": "medium"
        }
      }
    }
  }
}
```

Use `high` if you want richer safe summaries:

```json
{
  "plugins": {
    "entries": {
      "openclaw-clawmagotchi-connector": {
        "enabled": true,
        "config": {
          "detailLevel": "high"
        }
      }
    }
  }
}
```

If `detailLevel` is omitted, the connector uses `medium`.

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
