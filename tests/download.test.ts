import { describe, it, expect, vi } from "vitest";
import AdmZip from "adm-zip";
import { unwrapZip, WRAP_FORMATS, fetchBook } from "../src/download.js";

// flibusta отдаёт fb2 как zip с одним .fb2 внутри — собираем именно такой.
function makeZip(innerName: string, content: string): Buffer {
  const zip = new AdmZip();
  zip.addFile(innerName, Buffer.from(content, "utf8"));
  return zip.toBuffer();
}

describe("WRAP_FORMATS", () => {
  it("wraps fb2/txt/rtf/html/doc, leaves epub/mobi/pdf alone", () => {
    for (const f of ["fb2", "txt", "rtf", "html", "doc"]) expect(WRAP_FORMATS.has(f)).toBe(true);
    for (const f of ["epub", "mobi", "pdf"]) expect(WRAP_FORMATS.has(f)).toBe(false);
  });
});

describe("unwrapZip", () => {
  it("unwraps a single-file zip to its inner content", () => {
    const out = unwrapZip(makeZip("book.fb2", "<FictionBook>text</FictionBook>"));
    expect(out.toString("utf8")).toBe("<FictionBook>text</FictionBook>");
  });

  it("returns non-zip buffer untouched", () => {
    const plain = Buffer.from("not a zip");
    expect(unwrapZip(plain)).toBe(plain);
  });

  it("picks the largest inner file when several present", () => {
    const zip = new AdmZip();
    zip.addFile("small.txt", Buffer.from("x"));
    const big = "y".repeat(50);
    zip.addFile("big.fb2", Buffer.from(big));
    expect(unwrapZip(zip.toBuffer()).toString("utf8")).toBe(big);
  });
});

describe("fetchBook", () => {
  it("fetches and unwraps an fb2 zip served over http", async () => {
    const zip = makeZip("book.fb2", "CONTENT");
    const res = { ok: true, body: true, arrayBuffer: async () => zip } as unknown as Response;
    const mock = vi.spyOn(globalThis, "fetch").mockResolvedValue(res);
    const out = await fetchBook("https://flibusta.is/b/1/download", "fb2");
    expect(out.toString("utf8")).toBe("CONTENT");
    expect(mock).toHaveBeenCalledWith("https://flibusta.is/b/1/download");
    mock.mockRestore();
  });

  it("leaves epub bytes untouched (no unwrap)", async () => {
    const epub = Buffer.from([0x50, 0x4b, 0x03, 0x04, 1, 2, 3]); // PK.., но это epub-зип
    const res = { ok: true, body: true, arrayBuffer: async () => epub } as Response;
    const mock = vi.spyOn(globalThis, "fetch").mockResolvedValue(res);
    const out = await fetchBook("https://flibusta.is/b/1/epub", "epub");
    // epub не в WRAP_FORMATS — буфер проходит как есть
    expect(out.equals(epub)).toBe(true);
    mock.mockRestore();
  });

  it("throws on HTTP error", async () => {
    const res = { ok: false, status: 404, body: null } as unknown as Response;
    const mock = vi.spyOn(globalThis, "fetch").mockResolvedValue(res);
    await expect(fetchBook("https://flibusta.is/b/1/fb2", "fb2")).rejects.toThrow("404");
    mock.mockRestore();
  });
});
