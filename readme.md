# Game Night Bot

Discord bot that tracks game recommendations and a group backlog/play history. Slash commands handle structured edits; @mentions go through an LLM agent that can update the same data via MCP tools.

Data is stored per Discord server in SQLite.

## Features

- **Recommendations** — games people suggest the group should try (`R#` ids)
- **Games** — owned/backlog/play history (`G#` ids) with status tracking
- **Notes** — dated notes on a recommendation or game
- **Mention agent** — paste a list or natural-language instructions after @mentioning the bot; it adds/updates entries via tools

### Game statuses

`not_started` · `in_progress` · `in_rotation` · `shelved` · `finished` · `abandoned`

## Discord slash commands

| Command | Description |
| --- | --- |
| `/suggest` | Add a recommendation (optional link) |
| `/add` | Add a game to the games list (optional link and status) |
| `/show-list` | Show recommendations and/or games with `R#` / `G#` ids (optional filter) |
| `/update-status` | Set a game’s status by `G#` id |
| `/notes` | List or add notes for `R#` / `G#` |
| `/remove` | Remove a recommendation or game by id |

Slash commands register on startup. Set `DISCORD_GUILD_ID` for fast guild-scoped registration during development; omit it for global commands.

## Requirements

- [Bun](https://bun.sh/) 1.x
- A Discord bot token with intents: **Guilds**, **Guild Messages**, **Message Content**
- An OpenAI-compatible LLM endpoint (local or remote) for @mention handling

## Setup

```bash
cp example.env .env
# Edit .env with your Discord token and LLM settings
bun install
```

### Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `DISCORD_TOKEN` | yes | Bot token |
| `DISCORD_GUILD_ID` | no | Guild for slash command registration (faster updates) |
| `LLM_BASE_URL` | yes | OpenAI-compatible API base URL (e.g. `http://localhost:1234/v1`) |
| `LLM_MODEL` | yes | Model name |
| `LLM_API_KEY` | no | API key if the LLM endpoint requires one |
| `LLM_SYSTEM_PROMPT` | no | Override the default agent system prompt |
| `DATABASE_PATH` | no | SQLite path (default `./data/games.db`) |

## Development

```bash
bun install
bun run start
```

This runs `src/index.ts` directly with Bun. The SQLite file is created/migrated on first start under `DATABASE_PATH` (default `./data/games.db`).

## Docker

Build and run with Compose (uses `.env` and persists the DB in `./data`):

```bash
docker compose up --build -d
```

Or build/run the image manually:

```bash
docker build -t game-night-bot .
docker run --env-file .env \
  -e DATABASE_PATH=/data/games.db \
  -v "$(pwd)/data:/data" \
  game-night-bot
```

When the bot runs in Docker and the LLM is on the host, set `LLM_BASE_URL` to something like `http://host.docker.internal:11434/v1` (Ollama) or `:1234/v1` (LM Studio). Compose maps `host.docker.internal` via `extra_hosts` (required on Linux). If the host LLM only binds to `127.0.0.1`, the container still cannot reach it — bind it on all interfaces (e.g. `OLLAMA_HOST=0.0.0.0:11434`) or use `network_mode: host`.

Stop / remove:

```bash
docker compose down
```

## Project layout

```fs
src/
  index.ts              # Discord client entrypoint
  config.ts             # Env loading
  discord/              # Slash commands, formatting, handlers
  db/                   # SQLite client, schema, migrations, services
  domain/               # Shared types (game statuses)
  llm/                  # Mention agent + OpenAI-compatible client
  mcp/                  # MCP tools used by the mention agent
```
