import * as FlibustaNS from "flibusta";

// Пакет flibusta собран webpack как CommonJS/UMD. При ESM-импорте его default
// оборачивается в namespace-объект, конструктор лежит в .default.default.
/* eslint-disable @typescript-eslint/no-explicit-any */
const FlibustaAPI: any = (FlibustaNS as any).default?.default ?? (FlibustaNS as any).default;

export type FlibustaBook = {
  title: string;
  author?: string;
  category?: string;
  description?: string;
  coverUrl?: string;
  downloads: { link: string; format: string }[];
  formats: string[];
  // Извлекаются из хвоста описания («Перевод: … Размер: … Скачиваний: …»).
  size?: string;
  downloadsCount?: string;
  series?: string;
  translator?: string;
  language?: string;
};

// Запрос приходит из аргументов tool'а: вызывающий AI уже разобрал автора и
// название до вызова.
export type SearchQuery = { title?: string; authors?: string[] };

type Deps = { base: string; fallbackBase?: string };

const FORMAT_RE = /\/b\/\d+\/([a-z0-9]+)/i;
const ID_RE = /\/b\/(\d+)\//i;

// Метки хвоста описания у flibusta. Капителлизированы и фиксированы —
// поэтому матчим регистрочувствительно, чтобы не цеплять слова из аннотации.
const META_LABELS = ["Перевод", "Формат", "Язык", "Размер", "Скачиваний", "Серия", "Год издания"];
type BookMeta = Pick<FlibustaBook, "size" | "downloadsCount" | "series" | "translator" | "language">;

function parseDescription(desc: string | undefined): { annotation?: string; meta: BookMeta } {
  if (!desc) return { meta: {} };
  const text = desc.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const start = text.search(new RegExp(`(?:${META_LABELS.join("|")}):`));
  const metaText = start >= 0 ? text.slice(start) : "";
  const annotation = start >= 0 ? text.slice(0, start).trim() : text;
  const labelAlt = META_LABELS.join("|");
  const take = (label: string): string | undefined => {
    const m = metaText.match(new RegExp(`${label}:\\s*(.+?)(?=\\s+(?:${labelAlt}):|$)`));
    return m ? m[1].trim() : undefined;
  };
  return {
    annotation: annotation || undefined,
    meta: {
      size: take("Размер"),
      downloadsCount: take("Скачиваний"),
      series: take("Серия"),
      translator: take("Перевод"),
      language: take("Язык"),
    },
  };
}

function normalize(raw: any, base: string): FlibustaBook {
  const downloads: { link: string; format: string }[] = (raw.downloads ?? [])
    .filter((d: any) => d?.link)
    .map((d: any) => {
      const m = String(d.link).match(FORMAT_RE);
      // /b/ID/download — дефолтный формат flibusta (fb2 в zip). Нормализуем к fb2.
      const fmt = m ? m[1] : "";
      return { link: String(d.link), format: fmt === "download" ? "fb2" : fmt };
    });
  const formats = Array.from(new Set(downloads.map((d) => d.format)))
    .filter((f) => f && f !== "unknown");
  const { annotation, meta } = parseDescription(raw.description);
  return {
    title: raw.title ?? "Без названия",
    author: raw.author?.[0]?.name,
    category: raw.categories?.[0],
    description: annotation,
    coverUrl: raw.cover ? base + raw.cover : undefined,
    downloads,
    formats,
    ...meta,
  };
}

// Числовой id книги из download-ссылки /b/{id}/{format}. Нужен для download_book.
export function extractId(book: FlibustaBook): number {
  const link = book.downloads[0]?.link ?? "";
  const m = link.match(ID_RE);
  return m ? Number(m[1]) : 0;
}

export function createFlibusta(deps: Deps) {
  const makeClient = (base: string) => new FlibustaAPI(base);

  return {
    async searchBooks(q: SearchQuery): Promise<FlibustaBook[]> {
      const client = makeClient(deps.base);
      const out: FlibustaBook[] = [];

      // По автору: сначала найти id, потом книги автора
      if (q.authors?.length) {
        for (const a of q.authors) {
          try {
            const authors = await (client as any).getAuthors(a);
            const id = authors?.[0]?.id;
            if (id) {
              const list = await (client as any).getBooksByAuthorOpds(id);
              if (Array.isArray(list)) out.push(...list.map((r: any) => normalize(r, deps.base)));
            }
          } catch { /* автор не найден — пропускаем */ }
        }
      }

      // По названию
      if (q.title) {
        try {
          const list = await (client as any).getBooksByNameFromOpds(q.title);
          if (Array.isArray(list)) out.push(...list.map((r: any) => normalize(r, deps.base)));
        } catch { /* зеркало упало — fallback ниже */ }
      }

      const seen = new Set<string>();
      const deduped = out.filter((b) => {
        if (seen.has(b.title)) return false;
        seen.add(b.title);
        return true;
      });

      if (deduped.length) return deduped;

      // Fallback на запасное зеркало, если основное пусто
      const fbBase = deps.fallbackBase;
      if (fbBase && q.title) {
        const fb = makeClient(fbBase);
        try {
          const list = await (fb as any).getBooksByNameFromOpds(q.title);
          if (Array.isArray(list)) return list.map((r: any) => normalize(r, fbBase));
        } catch { /* оба зеркала недоступны */ }
      }
      return [];
    },

    downloadUrl(book: FlibustaBook, format: string): string {
      const d = book.downloads.find((x) => x.format === format);
      const link = d?.link ?? book.downloads[0]?.link;
      if (!link) throw new Error(`нет ссылки скачивания для ${book.title}`);
      return link.startsWith("http") ? link : deps.base + link;
    },
  };
}

export type Flibusta = ReturnType<typeof createFlibusta>;
