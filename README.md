# flibusta-mcp

[![npm version](https://img.shields.io/npm/v/flibusta-mcp)](https://www.npmjs.com/package/flibusta-mcp)
[![GitHub](https://img.shields.io/badge/GitHub-vonavikon%2Fflibusta--mcp-181717?logo=github)](https://github.com/vonavikon/flibusta-mcp)

English | [Русский](README.ru.md)

MCP server for searching and downloading books from [Flibusta](https://flibusta.is). Works with Claude Code, Claude Desktop and Cursor.

The server has no LLM of its own and needs no API keys. The calling client parses the request and passes structured `title` and `author` here.

## What it does

- `search_books` searches by title and author and returns a ranked list: id, title, author, formats, size, download count, short description.
- `download_book` downloads a book in the requested format into the downloads folder and returns the path. The `fb2/txt/rtf/html/doc` formats come from Flibusta in zip archives and are unpacked automatically, while `epub/mobi/pdf` are saved as is.

Ranking is deterministic. An exact title match comes first; if several editions match, the more popular one ranks higher.

## Install

### Claude Code

Published on npm:

```bash
claude mcp add flibusta -- npx -y flibusta-mcp
```

Or build locally from a clone:

```bash
git clone https://github.com/vonavikon/flibusta-mcp.git
cd flibusta-mcp
npm install && npm run build
claude mcp add flibusta -- node "$PWD/dist/index.js"
```

### Claude Desktop

Add the server to `claude_desktop_config.json`. On macOS it is `~/Library/Application Support/Claude/claude_desktop_config.json`, on Windows `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "flibusta": {
      "command": "npx",
      "args": ["-y", "flibusta-mcp"]
    }
  }
}
```

### Cursor

In `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "flibusta": { "command": "npx", "args": ["-y", "flibusta-mcp"] }
  }
}
```

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `FLIBUSTA_BASE` | `https://flibusta.is` | Main Flibusta mirror |
| `FLIBUSTA_FALLBACK_BASE` | not set | Backup mirror used when the main one does not respond |
| `FLIBUSTA_DOWNLOAD_DIR` | `~/Downloads` | Where downloaded books are saved |

For Claude Desktop, set the variables in the `env` field of the server config.

## Usage

Once the server is connected, ask the client in plain words:

> Find "Dune" by Frank Herbert and download it in fb2.

The client calls `search_books`, picks the right edition and format, and `download_book` saves the file to the downloads folder and returns the path.

## Development

```bash
npm install      # dependencies
npm test         # unit tests (vitest)
npm run build    # build into dist/
```

You can try the server manually with MCP Inspector:

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

Source layout:

- `src/flibusta.ts` talks to Flibusta over OPDS (the `flibusta` package), normalizes the response and extracts ids.
- `src/rank.ts` handles deterministic ranking.
- `src/download.ts` downloads a book and unpacks the zip wrapper.
- `src/index.ts` starts the MCP server and registers the tools.

## Legal note

Flibusta distributes books under terms that different jurisdictions treat differently. Use it at your own risk and within applicable law. The server is a thin client over a public OPDS feed, it stores nothing.

## License

MIT © vonavikon
