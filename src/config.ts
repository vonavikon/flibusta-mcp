import os from "node:os";
import path from "node:path";

// Конфигурация из окружения: зеркало Flibusta и папка для скачиваний.
export type Config = {
  flibustaBase: string;
  flibustaFallbackBase?: string;
  downloadDir: string;
};

export function loadConfig(): Config {
  const downloadDir = process.env.FLIBUSTA_DOWNLOAD_DIR || path.join(os.homedir(), "Downloads");
  return {
    flibustaBase: process.env.FLIBUSTA_BASE || "https://flibusta.is",
    flibustaFallbackBase: process.env.FLIBUSTA_FALLBACK_BASE || undefined,
    downloadDir,
  };
}
