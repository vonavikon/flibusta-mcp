import { describe, it, expect } from "vitest";
import { norm, relevance, rankBooks } from "../src/rank.js";
import type { FlibustaBook } from "../src/flibusta.js";

const book = (over: Partial<FlibustaBook> = {}): FlibustaBook => ({
  title: "Шерлок Холмс",
  author: "Артур Конан Дойл",
  downloads: [{ link: "/b/100/fb2", format: "fb2" }],
  formats: ["fb2"],
  downloadsCount: "10",
  ...over,
});

describe("norm", () => {
  it("lowercases and strips punctuation/quotes", () => {
    expect(norm("Hello, «World»!")).toBe("hello world");
  });
});

describe("relevance", () => {
  const pt = norm("Шерлок Холмс");

  it("exact title scores higher than partial match", () => {
    const exact = book({ title: "Шерлок Холмс" });
    const partial = book({ title: "Шерлок Холмс и другие истории" });
    expect(relevance(pt, [], exact)).toBeGreaterThan(relevance(pt, [], partial));
  });

  it("author overlap adds score", () => {
    const base = relevance(pt, [], book());
    const withAuthor = relevance(pt, ["Дойл"], book());
    expect(withAuthor).toBeGreaterThan(base);
  });
});

describe("rankBooks", () => {
  it("puts exact title first, irrelevant last", () => {
    const books = [
      book({ title: "Шерлок Холмс (сборник)", downloadsCount: "999" }),
      book({ title: "Шерлок Холмс", downloadsCount: "10" }),
      book({ title: "Собака Баскервилей", downloadsCount: "5" }),
    ];
    const ranked = rankBooks(books, { title: "Шерлок Холмс" }, 3);
    expect(ranked[0].title).toBe("Шерлок Холмс");
    expect(ranked.at(-1)!.title).toBe("Собака Баскервилей");
  });

  it("respects topN", () => {
    const books = Array.from({ length: 7 }, (_, i) =>
      book({ title: `Книга ${i}`, downloadsCount: String(i) }),
    );
    expect(rankBooks(books, { title: "Книга" }, 3)).toHaveLength(3);
  });
});
