# flibusta-mcp

MCP-сервер для поиска и скачивания книг с [Flibusta](https://flibusta.is) через любой AI-клиент с поддержкой MCP: Claude Code, Claude Desktop, Cursor и другие.

У MCP-сервера нет своего LLM и ключей API: запрос разбирает вызывающий AI и передаёт в инструмент уже структурированные `title`/`author`. Секретов нет.

## Возможности

- **search_books** — поиск по названию и/или автору. Возвращает ранжированный список: id, название, автор, доступные форматы, размер, число скачиваний, краткое описание.
- **download_book** — скачивает книгу в выбранном формате в папку загрузок и возвращает путь. Форматы `fb2/txt/rtf/html/doc` приходят от Flibusta в zip-обёртке и распаковываются автоматически; `epub/mobi/pdf` сохраняются как есть.

Ранжирование детерминированное: точное совпадение названия сверху, при равенстве — более популярное издание.

## Установка

### Claude Code

Опубликовано в npm:

```bash
claude mcp add flibusta -- npx -y flibusta-mcp
```

Локальная сборка (из клона репозитория):

```bash
git clone https://github.com/vonavikon/flibusta-mcp.git
cd flibusta-mcp
npm install && npm run build
claude mcp add flibusta -- node "$PWD/dist/index.js"
```

### Claude Desktop

Добавьте сервер в `claude_desktop_config.json` (macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`, Windows: `%APPDATA%\Claude\claude_desktop_config.json`):

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
| `FLIBUSTA_FALLBACK_BASE` | — | Запасное зеркало, если основное не отвечает |
| `FLIBUSTA_DOWNLOAD_DIR` | `~/Downloads` | Куда сохранять скачанные книги |

Для Claude Desktop переменные задаются в поле `env` конфигурации сервера.

## Использование

После подключения просто попросите свой AI:

> Найди «Дюну» Фрэнка Герберта и скачай в fb2.

AI вызовет `search_books`, выберет нужное издание и формат, затем `download_book` положит файл в папку загрузок и сообщит путь.

## Разработка

```bash
npm install      # зависимости
npm test         # unit-тесты (vitest)
npm run build    # сборка в dist/
```

Smoke-тест сервера вручную:

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

Структура:

- `src/flibusta.ts` — доступ к Flibusta через OPDS (пакет `flibusta`), нормализация ответа, извлечение id.
- `src/rank.ts` — детерминированное ранжирование.
- `src/download.ts` — скачивание и распаковка zip-обёртки.
- `src/index.ts` — MCP-сервер, регистрация инструментов.

## Правовой момент

Flibusta раздаёт книги в условиях, которые по-разному оцениваются в разных юрисдикциях. Используйте на свой риск и в рамках применимого законодательства. Этот сервер — тонкий клиент над публичным OPDS-интерфейсом Flibusta и не хранит контент.

## Лицензия

MIT © Konstantin Ivanov
