#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";
import { loadConfig } from "./config.js";
import { createFlibusta, extractId, type FlibustaBook } from "./flibusta.js";
import { fetchBook } from "./download.js";
import { rankBooks } from "./rank.js";

const cfg = loadConfig();
const flibusta = createFlibusta({ base: cfg.flibustaBase, fallbackBase: cfg.flibustaFallbackBase });

const server = new McpServer({ name: "flibusta-mcp", version: "0.1.0" });

function clip(s: string | undefined, n: number): string {
  if (!s) return "";
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

// Описание в одну строку через «·», без пустых полей.
function metaLine(b: FlibustaBook): string {
  return [b.formats.join("/"), b.size, b.downloadsCount && `${b.downloadsCount} скачиваний`]
    .filter(Boolean)
    .join(" · ");
}

function fmtBook(i: number, b: FlibustaBook): string {
  const id = extractId(b);
  const head = `${i + 1}. [id ${id}] ${b.title}${b.author ? " — " + b.author : ""}`;
  const meta = metaLine(b);
  const desc = clip(b.description, 200);
  return [head, meta && "   " + meta, desc && "   " + desc].filter(Boolean).join("\n");
}

server.tool(
  "search_books",
  "Искать книги на Flibusta по названию и/или автору. Возвращает ранжированный список: id, название, автор, доступные форматы, размер, число скачиваний. id и формат понадобятся для download_book.",
  {
    title: z.string().optional().describe("Название книги или его часть"),
    author: z.string().optional().describe("Автор (имя или фамилия)"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(20)
      .optional()
      .describe("Сколько результатов вернуть (по умолчанию 5)"),
  },
  async ({ title, author, limit }) => {
    if (!title && !author) {
      return { content: [{ type: "text" as const, text: "Укажите хотя бы title или author." }] };
    }
    const topN = limit ?? 5;
    const authors = author ? [author] : [];
    const raw = await flibusta.searchBooks({ title, authors });
    if (!raw.length) {
      return {
        content: [
          { type: "text" as const, text: "Ничего не найдено. Попробуйте уточнить или изменить запрос." },
        ],
      };
    }
    const books = rankBooks(raw, { title, authors }, topN);
    const text = books.map((b, i) => fmtBook(i, b)).join("\n\n");
    return { content: [{ type: "text" as const, text }] };
  },
);

server.tool(
  "download_book",
  "Скачать книгу с Flibusta в заданном формате. Файл сохраняется в папку загрузок (FLIBUSTA_DOWNLOAD_DIR, по умолчанию ~/Downloads), возвращается абсолютный путь. id берётся из результата search_books; format — один из доступных форматов (например fb2, epub, mobi, pdf).",
  {
    id: z.number().int().positive().describe("Числовой id книги из результата search_books"),
    format: z.string().describe("Формат: fb2, epub, mobi, pdf, txt, rtf, html"),
    title: z.string().optional().describe("Название книги — для понятного имени файла (из search_books)"),
  },
  async ({ id, format, title }) => {
    const fmt = format.toLowerCase().trim();
    try {
      // fb2 у flibusta — дефолтный формат, отдаётся по /b/{id}/download (в zip);
      // остальные — по /b/{id}/{format}. Это совпадает с реальными OPDS-ссылками.
      const token = fmt === "fb2" ? "download" : fmt;
      const url = `${cfg.flibustaBase}/b/${id}/${token}`;
      const buf = await fetchBook(url, fmt);

      const base = (title ?? String(id))
        .replace(/[\\/:*?"<>|]/g, "_")
        .replace(/\s+/g, " ")
        .trim();
      const filename = `${base || String(id)}.${fmt}`;
      await fs.mkdir(cfg.downloadDir, { recursive: true });
      const target = path.join(cfg.downloadDir, filename);
      await fs.writeFile(target, buf);

      return { content: [{ type: "text" as const, text: `Сохранено: ${target}` }] };
    } catch (e) {
      return {
        isError: true,
        content: [
          {
            type: "text" as const,
            text: `Не удалось скачать книгу id ${id} в формате ${fmt}: ${(e as Error).message}`,
          },
        ],
      };
    }
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((e) => {
  console.error("flibusta-mcp fatal:", (e as Error).message);
  process.exit(1);
});
