import { createHash } from "crypto";
import { writeFile } from "fs/promises";
import { getCcxBaseDir, getStatePath as getStatePathFromPaths, getClaudeSettingsPath } from "./paths";
import { fileExists, readFile, ensureDir } from "./fs";

/**
 * 狀態資料結構
 * - currentSettingName: 當前使用中的 setting 名稱
 * - claudeSettingsHash: 最後一次切換後 ~/.claude/settings.json 的 MD5 hash
 */
export interface SettingState {
  currentSettingName: string;
  claudeSettingsHash: string;
}

/**
 * 取得狀態檔案路徑
 * @returns ~/.config/ccx/state.json
 */
export function getStatePath(): string {
  return getStatePathFromPaths();
}

/**
 * 計算檔案的 MD5 hash
 * @param filePath 檔案路徑
 * @returns Hex 格式的 hash 字串
 */
export async function computeFileHash(filePath: string): Promise<string> {
  const content = await readFile(filePath);
  return createHash("md5").update(content).digest("hex");
}

/**
 * 載入當前狀態
 * @returns 狀態物件，若不存在或無效則回傳 null
 */
export async function loadState(): Promise<SettingState | null> {
  const statePath = getStatePath();

  if (!(await fileExists(statePath))) {
    return null;
  }

  try {
    const content = await readFile(statePath);
    const state = JSON.parse(content);
    // 支援新舊欄位名稱
    const currentSettingName = state.currentSettingName || state.activeProfile;
    const claudeSettingsHash = state.claudeSettingsHash || state.settingsHash;
    if (currentSettingName && claudeSettingsHash) {
      return { currentSettingName, claudeSettingsHash };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 儲存狀態
 * @param state 狀態物件
 */
export async function saveState(state: SettingState): Promise<void> {
  const statePath = getStatePath();
  await ensureDir(getCcxBaseDir());
  await writeFile(statePath, JSON.stringify(state, null, 2), "utf-8");
}

/**
 * 檢查 settings.json 是否已被修改
 * @returns true 表示已修改，false 表示未修改或無法判斷
 */
export async function hasSettingsChanged(): Promise<boolean> {
  const claudePath = getClaudeSettingsPath();

  // 如果 settings.json 不存在，視為未修改
  if (!(await fileExists(claudePath))) {
    return false;
  }

  const state = await loadState();

  // 如果沒有記錄的狀態，無法判斷是否修改
  if (!state) {
    return false;
  }

  const currentHash = await computeFileHash(claudePath);
  return currentHash !== state.claudeSettingsHash;
}
