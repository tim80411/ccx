import { homedir } from "os";
import { join } from "path";

/**
 * 取得 Claude Code 設定檔路徑
 * @returns ~/.claude/settings.json
 */
export function getClaudeSettingsPath(): string {
  return join(homedir(), ".claude", "settings.json");
}

/**
 * 取得 CCX 設定檔目錄
 * @returns ~/.config/ccx/settings/
 */
export function getCcxSettingsDir(): string {
  return join(homedir(), ".config", "ccx", "settings");
}

/**
 * 取得指定 setting 的完整路徑
 * @param name setting 名稱
 * @returns ~/.config/ccx/settings/<name>.json
 */
export function getSettingPath(name: string): string {
  return join(getCcxSettingsDir(), `${name}.json`);
}

/**
 * 取得 previous.json 備份路徑
 * @returns ~/.config/ccx/settings/previous.json
 */
export function getPreviousPath(): string {
  return join(getCcxSettingsDir(), "previous.json");
}
