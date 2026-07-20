# AGENTS.md

Guidance for coding agents working in this repository.

## What this is

Discord bot for a game-night group. Per-guild SQLite stores:

1. **Recommendations** (`R#`) — suggestions to try
2. **Games** (`G#`) — backlog / play history with status
3. **Notes** — dated notes on either a recommendation or a game

Slash commands are the structured UI. @mentions run an LLM agent that calls the same domain logic through in-process MCP tools.

## Stack

- **Runtime**: Bun (TypeScript, ESM, `bun:sqlite`)
- **Discord**: discord.js v14
- **LLM**: OpenAI-compatible chat API (`LLM_BASE_URL` / `LLM_MODEL`)
- **Agent tools**: `@modelcontextprotocol/sdk` (MCP server wired in-process for mentions)

No separate build step — Bun runs `src/**/*.ts` directly. Imports use `.ts` extensions.

## Commands

```bash
bun install
bun run start                 # local: src/index.ts
docker compose up --build -d  # production-style run
```

Copy `example.env` → `.env`. Never commit `.env` or `data/`.

## Architecture

Keep these layers separate:

| Layer | Path | Responsibility |
| --- | --- | --- |
| Entry | `src/index.ts` | Discord client, intents, lifecycle |
| Config | `src/config.ts` | Required/optional env |
| Domain | `src/domain/` | Shared types (e.g. game statuses) |
| DB | `src/db/` | Schema, migrations, `services.ts` (all mutations/queries) |
| Discord | `src/discord/` | Slash defs, formatting, interaction/mention handlers |
| MCP | `src/mcp/` | Tools that wrap `db/services` for the mention agent |
| LLM | `src/llm/` | Mention agent loop + OpenAI client |

**Business rules live in `src/db/services.ts`.** Discord handlers and MCP tools should call services, not duplicate SQL or validation.

When adding a capability:

1. Schema/migration in `src/db/` if needed
2. Service function(s) in `services.ts` (throw `ServiceError` with `not_found` | `duplicate` | `invalid`)
3. Slash command in `commands.ts` + handler in `handlers/interactions.ts` if user-facing
4. MCP tool in `mcp/server.ts` if the mention agent should do it
5. List/reply formatting in `formatList.ts` when Discord messages change

## Domain rules to preserve

- Data is always scoped by `guild_id`. Never cross guilds.
- Recommendations ≠ games. Promoting moves a recommendation onto the games list.
- Game statuses: `not_started`, `in_progress`, `in_rotation`, `shelved`, `finished`, `abandoned` — define once in `domain/gameStatus.ts` and reuse (Zod, Discord choices, services).
- User-facing ids are `R#` / `G#` (see `parseEntryId`). Keep that format consistent in replies and errors.
- For recommendations/notes, the Discord actor comes from context — do not invent a recommender/author.
- Mention replies are capped at Discord’s 2000-char limit.

## Conventions

- Prefer small, focused changes; match existing style (strict TS, `verbatimModuleSyntax`, named exports).
- Use `logInfo` / `logError` from `src/log.ts` for operational logs.
- Catch `ServiceError` at the Discord edge and map via `serviceErrorMessage`; let unexpected errors bubble to the top-level handlers.
- Slash commands re-register on every startup (`registerCommands.ts`). Use `DISCORD_GUILD_ID` for fast iteration.
- Docker persists DB at `/data/games.db` via compose volume `./data:/data`.

## Out of scope unless asked

- Force-pushing, amending shared history, or committing secrets
- Adding unrelated docs, refactors, or dependencies
- Exposing the MCP server as a network service (it is in-process for the mention agent only)
