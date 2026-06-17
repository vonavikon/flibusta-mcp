import type { FlibustaBook } from "./flibusta.js";

export const norm = (s: string): string =>
  s.toLowerCase().replace(/[«»"'!.,?;:()\[\]]/g, " ").replace(/\s+/g, " ").trim();

// Детерминированная релевантность. Оцениваем по тому, что уже разделено: название
// (title) и авторы (authors) — их передаёт вызывающий AI. Точное совпадение
// названия решает однозначно; флексии автора не подтягивают посторонние книги.
export function relevance(pt: string, authors: string[], book: FlibustaBook): number {
  const title = norm(book.title);
  const author = norm(book.author ?? "");
  let score = 0;
  if (pt) {
    if (title === pt) score += 1000;
    else if (title.includes(pt)) score += 600;
    else if (pt.includes(title)) score += 400;
    else score += pt.split(" ").filter(Boolean).filter((t) => title.includes(t)).length * 15;
  }
  for (const a of authors) {
    const an = norm(a);
    if (!an) continue;
    if (author.includes(an)) score += 30;
    else score += an.split(" ").filter(Boolean).filter((t) => author.includes(t)).length * 8;
  }
  return score;
}

// Ранжирование: выше — точное совпадение названия, при равенстве — популярное
// издание (больше скачиваний).
export function rankBooks(
  books: FlibustaBook[],
  q: { title?: string; authors?: string[] },
  topN: number,
): FlibustaBook[] {
  const pt = norm(q.title ?? "");
  const authors = q.authors ?? [];
  const dl = (b: FlibustaBook): number =>
    parseInt(String(b.downloadsCount ?? "").replace(/\D/g, "")) || 0;
  return [...books]
    .map((b) => ({ b, s: relevance(pt, authors, b) }))
    .sort((a, z) => z.s - a.s || dl(z.b) - dl(a.b))
    .slice(0, topN)
    .map((x) => x.b);
}
