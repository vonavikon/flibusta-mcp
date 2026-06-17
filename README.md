# flibusta-mcp

[![npm version](https://img.shields.io/npm/v/flibusta-mcp)](https://www.npmjs.com/package/flibusta-mcp)
[![GitHub](https://img.shields.io/badge/GitHub-vonavikon%2Fflibusta--mcp-181717?logo=github)](https://github.com/vonavikon/flibusta-mcp)

MCP-сервер для поиска и скачивания книг с [Flibusta](https://flibusta.is). Подключается к Claude Code, Claude Desktop и Cursor.

У сервера нет собственного LLM и нет API-ключей. Поисковый запрос разбирает вызвавший клиент, а сюда передаёт уже структурированные `title` и `author`.

## Что умеет

- `search_books` ищет по названию и автору и отдаёт ранжированный список: id, название, автор, форматы, размер, число скачиваний, краткое описание.
- `download_book` скачивает книгу в нужном формате в папку загрузок и возвращает путь. Форматы `fb2/txt/rtf/html/doc` приходят от Flibusta в zip-обёртке и распаковываются сами, а `epub/mobi/pdf` сохраняются как есть.

Ранжирование детерминированное. Точное совпадение названия идёт первым; если таких несколько, выше оказывается более популярное издание.

## Установка

### Claude Code

Опубликован в npm:

```bash
claude mcp add flibusta -- npx -y flibusta-mcp
```

Локальная сборка из клона:

```bash
git clone https://github.com/vonavikon/flibusta-mcp.git
cd flibusta-mcp
npm install && npm run build
claude mcp add flibusta -- node "$PWD/dist/index.js"
```

### Claude Desktop

Добавьте сервер в `claude_desktop_config.json`. На macOS это `~/Library/Application Support/Claude/claude_desktop_config.json`, на Windows — `%APPDATA%\Claude\claude_desktop_config.json`:

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

В `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "flibusta": { "command": "npx", "args": ["-y", "flibusta-mcp"] }
  }
}
```

## Переменные окружения

| Переменная | По умолчанию | Описание |
|---|---|---|
| `FLIBUSTA_BASE` | `https://flibusta.is` | Основное зеркало Flibusta |
| `FLIBUSTA_FALLBACK_BASE` | — | Запасное зеркало на случай, если основное не отвечает |
| `FLIBUSTA_DOWNLOAD_DIR` | `~/Downloads` | Куда складывать скачанные книги |

Для Claude Desktop переменные задаются в поле `env` конфигурации сервера.

## Использование

Когда сервер подключён, задайте клиенту обычный запрос:

> Найди «Дюну» Фрэнка Герберта и скачай в fb2.

Клиент вызовет `search_books`, выберет нужное издание и формат, а `download_book` положит файл в папку загрузок и вернёт путь.

## Разработка

```bash
npm install      # зависимости
npm test         # unit-тесты (vitest)
npm run build    # сборка в dist/
```

Проверить сервер вручную можно через MCP Inspector:

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

Структура исходников:

- `src/flibusta.ts` обращается к Flibusta через OPDS (пакет `flibusta`), нормализует ответ и достаёт id.
- `src/rank.ts` отвечает за детерминированное ранжирование.
- `src/download.ts` скачивает книгу и распаковывает zip-обёртку.
- `src/index.ts` поднимает MCP-сервер и регистрирует инструменты.

## Правовой момент

Flibusta раздаёт книги на условиях, которые в разных юрисдикциях оценивают по-разному. Пользуйтесь на свой риск и в рамках применимого законодательства. Сервер здесь — тонкий клиент над публичным OPDS-интерфейсом, он ничего не хранит.

## Лицензия

MIT © vonavikon
