import { mkdir, copyFile as fsCopyFile, readdir, access, readFile as fsReadFile, symlink as fsSymlink, lstat, readlink as fsReadlink, unlink } from "fs/promises";
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

/**
 * 建立符號連結
 * @param target 目標檔案路徑（實際內容位置）
 * @param linkPath 連結路徑（將會指向 target）
 */
export async function createSymlink(target: string, linkPath: string): Promise<void> {
  await fsSymlink(target, linkPath);
}

/**
 * 檢查路徑是否為符號連結
 * @param path 路徑
 * @returns 是符號連結則回傳 true
 */
export async function isSymlink(path: string): Promise<boolean> {
  try {
    const stats = await lstat(path);
    return stats.isSymbolicLink();
  } catch {
    return false;
  }
}

/**
 * 讀取符號連結指向的目標路徑
 * @param path 連結路徑
 * @returns 目標路徑字串
 */
export async function readSymlink(path: string): Promise<string> {
  return await fsReadlink(path);
}

/**
 * 刪除檔案或符號連結
 * @param path 路徑
 */
export async function removeFile(path: string): Promise<void> {
  await unlink(path);
}
