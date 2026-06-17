import AdmZip from "adm-zip";

// flibusta заворачивает эти форматы в zip: /b/ID/fb2 отдаёт application/zip с
// одним .fb2 внутри. Распаковываем внутренний файл, иначе читалка получает zip
// под именем .fb2 и файл не открывается. epub/mobi/pdf НЕ трогаем: epub сам по
// себе zip (вскрывать нельзя), pdf и mobi приходят готовым файлом.
export const WRAP_FORMATS = new Set(["fb2", "txt", "rtf", "html", "doc"]);

export function unwrapZip(buf: Buffer): Buffer {
  if (!(buf[0] === 0x50 && buf[1] === 0x4b)) return buf; // PK — не zip
  try {
    const datas = new AdmZip(buf)
      .getEntries()
      .filter((e) => !e.entryName.endsWith("/"))
      .map((e) => e.getData());
    if (!datas.length) return buf;
    // flibusta: один внутренний файл. Если несколько — крупнейший, это сама книга.
    datas.sort((a, b) => b.length - a.length);
    return datas[0];
  } catch {
    return buf; // битый zip — лучше отдать как есть, чем уронить скачивание
  }
}

// Скачать файл по URL и распаковать zip-обёртку для форматов из WRAP_FORMATS.
// Возвращает готовый буфер (код вызова пишет его в папку загрузок).
export async function fetchBook(url: string, format: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok || !res.body) {
    throw new Error(`скачивание не удалось: ${res.status} для ${url}`);
  }
  let buf: Buffer = Buffer.from(await res.arrayBuffer());
  if (WRAP_FORMATS.has(format)) buf = unwrapZip(buf);
  return buf;
}
