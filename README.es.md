# flibusta-mcp

[![npm version](https://img.shields.io/npm/v/flibusta-mcp)](https://www.npmjs.com/package/flibusta-mcp)
[![GitHub](https://img.shields.io/badge/GitHub-vonavikon%2Fflibusta--mcp-181717?logo=github)](https://github.com/vonavikon/flibusta-mcp)
[![VirusTotal](https://img.shields.io/badge/VirusTotal-0%2F75_clean-brightgreen)](https://www.virustotal.com/gui/file/ec2fc67df04b53aaa756de08e5cd71038e58f6d36dc1163811d953dc9bbcf7fe)

[RU](README.ru.md) · [EN](README.md) · [中文](README.zh.md) · **Español** · [Français](README.fr.md)

Servidor MCP para buscar y descargar libros de [Flibusta](https://flibusta.is). Funciona con Claude Code, Claude Desktop y Cursor.

El servidor no tiene ningún LLM propio y no necesita claves de API. El cliente que lo llama interpreta la petición y le pasa `title` y `author` ya estructurados.

## Qué hace

- `search_books` busca por título y autor y devuelve una lista ordenada: id, título, autor, formatos, tamaño, número de descargas y una descripción breve.
- `download_book` descarga el libro en el formato solicitado a la carpeta de descargas y devuelve la ruta. Los formatos `fb2/txt/rtf/html/doc` llegan de Flibusta en archivos zip y se descomprimen automáticamente; `epub/mobi/pdf` se guardan tal cual.

El orden es determinista. La coincidencia exacta del título va primero; si hay varias ediciones, la más popular queda por delante.

## Instalación

### Claude Code

Publicado en npm:

```bash
claude mcp add flibusta -- npx -y flibusta-mcp
```

O compila en local a partir de un clon:

```bash
git clone https://github.com/vonavikon/flibusta-mcp.git
cd flibusta-mcp
npm install && npm run build
claude mcp add flibusta -- node "$PWD/dist/index.js"
```

### Claude Desktop

Añade el servidor a `claude_desktop_config.json`. En macOS está en `~/Library/Application Support/Claude/claude_desktop_config.json`; en Windows, en `%APPDATA%\Claude\claude_desktop_config.json`:

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

En `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "flibusta": { "command": "npx", "args": ["-y", "flibusta-mcp"] }
  }
}
```

## Variables de entorno

| Variable | Valor por defecto | Descripción |
|---|---|---|
| `FLIBUSTA_BASE` | `https://flibusta.is` | Espejo principal de Flibusta |
| `FLIBUSTA_FALLBACK_BASE` | sin definir | Espejo de reserva para cuando el principal no responde |
| `FLIBUSTA_DOWNLOAD_DIR` | `~/Downloads` | Dónde se guardan los libros descargados |

Para Claude Desktop, las variables se establecen en el campo `env` de la configuración del servidor.

## Uso

Con el servidor conectado, pídeselo al cliente en lenguaje natural:

> Busca «Dune» de Frank Herbert y descárgalo en fb2.

El cliente llama a `search_books`, elige la edición y el formato adecuados, y `download_book` guarda el archivo en la carpeta de descargas y devuelve la ruta.

## Desarrollo

```bash
npm install      # dependencies
npm test         # unit tests (vitest)
npm run build    # build into dist/
```

Puedes probar el servidor manualmente con MCP Inspector:

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

Estructura del código fuente:

- `src/flibusta.ts` se comunica con Flibusta por OPDS (el paquete `flibusta`), normaliza la respuesta y extrae los id.
- `src/rank.ts` se encarga del orden determinista.
- `src/download.ts` descarga el libro y descomprime el zip.
- `src/index.ts` arranca el servidor MCP y registra las herramientas.

## Nota legal

Flibusta distribuye libros en condiciones que el derecho trata de forma distinta según la jurisdicción. Úsalo bajo tu propia responsabilidad y dentro de la ley aplicable. El servidor es un cliente ligero sobre un feed OPDS público y no almacena nada.

## Licencia

MIT © vonavikon
