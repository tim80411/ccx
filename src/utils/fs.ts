import { mkdir, copyFile as fsCopyFile, readdir, access, readFile as fsReadFile } from "fs/promises";
import { join, basename } from "path";

/**
 * 確保目錄存在，若不存在則建立（包含巢狀目錄）
 * @param path 目錄路徑
 */
export async function ensureDir(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

/**
 * 複製檔案
 * @param src 來源檔案路徑
 * @param dest 目標檔案路徑
 */
export async function copyFile(src: string, dest: string): Promise<void> {
  await fsCopyFile(src, dest);
}

/**
 * 檢查檔案或目錄是否存在
 * @param path 路徑
 * @returns 存在則回傳 true
 */
export async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * 列出目錄中的 .json 檔案（排除 previous.json）
 * @param dir 目錄路徑
 * @returns 檔案名稱陣列（不含 .json 副檔名）
 */
export async function listJsonFiles(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir);
    return entries
      .filter((file) => file.endsWith(".json") && file !== "previous.json")
      .map((file) => basename(file, ".json"));
  } catch {
    return [];
  }
}

/**
 * 讀取檔案內容
 * @param path 檔案路徑
 * @returns 檔案內容字串
 */
export async function readFile(path: string): Promise<string> {
  return await fsReadFile(path, "utf-8");
}
