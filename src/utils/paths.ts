import { homedir } from "os";
import { join } from "path";

/**
 * 取得 Claude Code 設定檔路徑
 * @returns ~/.claude/settings.json（可用 CCX_CLAUDE_SETTINGS 環境變數覆蓋）
 */
export function getClaudeSettingsPath(): string {
  if (process.env.CCX_CLAUDE_SETTINGS) {
    return process.env.CCX_CLAUDE_SETTINGS;
  }
  if (process.env.CLAUDE_CONFIG_DIR) {
    return join(process.env.CLAUDE_CONFIG_DIR, "settings.json");
  }
  return join(homedir(), ".claude", "settings.json");
}

/**
 * 取得 CCX 設定檔目錄
 * @returns ~/.config/ccx/settings/（可用 CCX_SETTINGS_DIR 環境變數覆蓋）
 */
export function getCcxSettingsDir(): string {
  return process.env.CCX_SETTINGS_DIR || join(homedir(), ".config", "ccx", "settings");
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
