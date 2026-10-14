import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted поднимает stub в hoisted-область, чтобы он был доступен
// фабрике vi.mock, которая исполняется раньше обычных импортов.
const stub = vi.hoisted(() => ({
  getAuthors: vi.fn(),
  getBooksByAuthorOpds: vi.fn(),
  getBooksByNameFromOpds: vi.fn(),
}));

vi.mock("flibusta", () => ({
  default: { default: function MockFlibustaAPI() { return stub; } },
}));

import { createFlibusta, extractId } from "../src/flibusta.js";
import { rankBooks } from "../src/rank.js";

// Сырой OPDS-ответ: описание = аннотация + блок «Формат: … Размер: …».
const RAW = {
  title: "Шерлок Холмс",
  author: [{ name: "Артур Конан Дойл" }],
  categories: ["Детектив"],
  description: "Классический детектив.<br/>Формат: fb2, epub<br/>Размер: 1.2 Mb<br/>Скачиваний: 1234",
  cover: "/i/100.jpg",
  downloads: [{ link: "/b/100/download" }, { link: "/b/100/epub" }],
};

describe("createFlibusta", () => {
  beforeEach(() => {
    stub.getAuthors.mockReset();
    stub.getBooksByAuthorOpds.mockReset();
    stub.getBooksByNameFromOpds.mockReset();
  });

  it("normalizes formats, meta and id on a title search", async () => {
    stub.getBooksByNameFromOpds.mockResolvedValue([RAW]);
    const f = createFlibusta({ base: "https://flibusta.is" });
    const out = await f.searchBooks({ title: "Шерлок" });
    expect(out).toHaveLength(1);
    const b = out[0];
    expect(b.title).toBe("Шерлок Холмс");
    expect(b.author).toBe("Артур Конан Дойл");
    expect(b.formats).toEqual(["fb2", "epub"]); // download → fb2
    expect(b.size).toBe("1.2 Mb");
    expect(b.downloadsCount).toBe("1234");
    expect(b.description).toBe("Классический детектив.");
    expect(b.coverUrl).toBe("https://flibusta.is/i/100.jpg");
    expect(extractId(b)).toBe(100);
  });

  it("resolves author id then fetches author books", async () => {
    stub.getAuthors.mockResolvedValue([{ id: 42 }]);
    stub.getBooksByAuthorOpds.mockResolvedValue([RAW]);
    const f = createFlibusta({ base: "https://flibusta.is" });
    const out = await f.searchBooks({ authors: ["Дойл"] });
    expect(stub.getAuthors).toHaveBeenCalledWith("Дойл");
    expect(stub.getBooksByAuthorOpds).toHaveBeenCalledWith(42);
    expect(out[0].author).toBe("Артур Конан Дойл");
  });

  it("dedups by title", async () => {
    stub.getBooksByNameFromOpds.mockResolvedValue([RAW, { ...RAW }]);
    const f = createFlibusta({ base: "https://flibusta.is" });
    const out = await f.searchBooks({ title: "Шерлок" });
    expect(out).toHaveLength(1);
  });

  it("normalizes numeric titles and dedups equivalent numeric and string titles", async () => {
    stub.getAuthors.mockResolvedValue([{ id: 42 }]);
    stub.getBooksByAuthorOpds.mockResolvedValue([
      { ...RAW, title: 1408 },
      { ...RAW, title: "1408" },
      { ...RAW, title: 1922 },
      { ...RAW, title: 0 },
    ]);
    const f = createFlibusta({ base: "https://flibusta.is" });
    const out = await f.searchBooks({ authors: ["Стивен Кинг"] });
    expect(out.map((b) => b.title)).toEqual(["1408", "1922", "0"]);
    expect(rankBooks(out, { authors: ["Стивен Кинг"] }, 5)).toEqual(out);
    expect(rankBooks(out, { title: "1922" }, 1)[0].title).toBe("1922");
  });

  it.each([null, undefined])("uses a fallback for missing title %s", async (title) => {
    stub.getBooksByNameFromOpds.mockResolvedValue([{ ...RAW, title }]);
    const f = createFlibusta({ base: "https://flibusta.is" });
    const out = await f.searchBooks({ title: "Книга" });
    expect(out[0].title).toBe("Без названия");
  });

  it("normalizes numeric titles from the fallback mirror", async () => {
    stub.getBooksByNameFromOpds.mockResolvedValueOnce([]).mockResolvedValueOnce([{ ...RAW, title: 1408 }]);
    const f = createFlibusta({ base: "https://flibusta.is", fallbackBase: "https://flibusta.local" });
    const out = await f.searchBooks({ title: "1408" });
    expect(out[0].title).toBe("1408");
  });

  it("falls back to fallbackBase when main returns nothing", async () => {
    stub.getBooksByNameFromOpds
      .mockResolvedValueOnce([]) // основное зеркало пусто
      .mockResolvedValueOnce([RAW]); // запасное — есть
    const f = createFlibusta({ base: "https://flibusta.is", fallbackBase: "https://flibusta.local" });
    const out = await f.searchBooks({ title: "Шерлок" });
    expect(out).toHaveLength(1);
  });

  it("downloadUrl builds absolute url from a relative link", () => {
    const f = createFlibusta({ base: "https://flibusta.is" });
    const book = {
      title: "X",
      downloads: [{ link: "/b/100/epub", format: "epub" }],
      formats: ["epub"],
    } as never;
    expect(f.downloadUrl(book, "epub")).toBe("https://flibusta.is/b/100/epub");
  });
});
