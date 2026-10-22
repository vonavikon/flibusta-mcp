# flibusta-mcp

[![npm version](https://img.shields.io/npm/v/flibusta-mcp)](https://www.npmjs.com/package/flibusta-mcp)
[![GitHub](https://img.shields.io/badge/GitHub-vonavikon%2Fflibusta--mcp-181717?logo=github)](https://github.com/vonavikon/flibusta-mcp)

[RU](README.ru.md) · [EN](README.md) · **中文** · [Español](README.es.md) · [Français](README.fr.md)

用于从 [Flibusta](https://flibusta.is) 搜索和下载图书的 MCP 服务器。支持 Claude Code、Claude Desktop 和 Cursor。

服务器自身不含 LLM，也不需要 API 密钥。调用方的客户端解析请求，把结构化的 `title` 和 `author` 传给服务器。

## 功能

- `search_books` 按书名和作者搜索，返回排好序的列表：id、书名、作者、格式、大小、下载次数、简短介绍。
- `download_book` 按请求的格式把图书下载到下载文件夹并返回路径。`fb2/txt/rtf/html/doc` 格式从 Flibusta 发来时是 zip 压缩包，会自动解压；`epub/mobi/pdf` 则按原样保存。

排序是确定性的。书名完全一致的排在最前；匹配到多个版本时，更受欢迎的版本靠前。

## 安装

### Claude Code

已发布到 npm：

```bash
claude mcp add flibusta -- npx -y flibusta-mcp
```

也可以从克隆的仓库本地构建：

```bash
git clone https://github.com/vonavikon/flibusta-mcp.git
cd flibusta-mcp
npm install && npm run build
claude mcp add flibusta -- node "$PWD/dist/index.js"
```

### Claude Desktop

把服务器添加到 `claude_desktop_config.json`。macOS 上是 `~/Library/Application Support/Claude/claude_desktop_config.json`，Windows 上是 `%APPDATA%\Claude\claude_desktop_config.json`：

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

在 `~/.cursor/mcp.json` 中：

```json
{
  "mcpServers": {
    "flibusta": { "command": "npx", "args": ["-y", "flibusta-mcp"] }
  }
}
```

## 环境变量

| 变量 | 默认值 | 说明 |
|---|---|---|
| `FLIBUSTA_BASE` | `https://flibusta.is` | Flibusta 主镜像 |
| `FLIBUSTA_FALLBACK_BASE` | 未设置 | 主镜像无响应时使用的备用镜像 |
| `FLIBUSTA_DOWNLOAD_DIR` | `~/Downloads` | 下载图书的保存位置 |

在 Claude Desktop 中，这些变量在服务器配置的 `env` 字段里设置。

## 使用

服务器连接后，直接用自然语言向客户端提问：

> 找一下弗兰克·赫伯特的《沙丘》，下载 fb2 格式。

客户端会调用 `search_books`，选定合适的版本和格式，再由 `download_book` 把文件保存到下载文件夹并返回路径。

## 开发

```bash
npm install      # dependencies
npm test         # unit tests (vitest)
npm run build    # build into dist/
```

可以用 MCP Inspector 手动试用服务器：

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

源码结构：

- `src/flibusta.ts` 通过 OPDS 访问 Flibusta（`flibusta` 包），规范化响应并提取 id。
- `src/rank.ts` 负责确定性的排序。
- `src/download.ts` 下载图书并解开 zip 压缩包。
- `src/index.ts` 启动 MCP 服务器并注册工具。

## 法律说明

Flibusta 分发图书的条件，不同司法管辖区的定性不同。请在适用法律范围内自行承担风险使用。本服务器只是公开 OPDS 数据源上的瘦客户端，不存储任何数据。

## 许可证

MIT © vonavikon
