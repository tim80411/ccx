import { getClaudeSettingsPath, getSettingPath } from "./paths";
import { loadState, SettingState } from "./state";

/**
 * 設定檔目標類型
 */
export type SettingTarget =
  | { type: "current" }              // 使用當前追蹤的 setting
  | { type: "named"; name: string }  // 使用指定名稱的 setting
  | { type: "official" };            // 使用 Claude 官方檔案

/**
 * 取得當前追蹤狀態，若無則拋出錯誤
 * @returns 當前狀態物件
 * @throws 若無追蹤狀態
 */
async function requireCurrentState(): Promise<SettingState> {
  const state = await loadState();
  if (!state) {
    throw new Error("目前無追蹤中的 setting，請先使用 'ccx setting use <name>' 切換");
  }
  return state;
}

/**
 * 解析目標設定檔路徑
 * @param target 目標類型
 * @returns 設定檔路徑
 * @throws 若 type 為 current 但無追蹤狀態
 */
export async function resolveSettingPath(target: SettingTarget): Promise<string> {
  switch (target.type) {
    case "official":
      return getClaudeSettingsPath();
    case "named":
      return getSettingPath(target.name);
    case "current": {
      const state = await requireCurrentState();
      return getSettingPath(state.currentSettingName);
    }
  }
}

/**
 * 解析目標設定檔名稱
 * @param target 目標類型
 * @returns 設定檔名稱（official 回傳 null）
 * @throws 若 type 為 current 但無追蹤狀態
 */
export async function resolveSettingName(target: SettingTarget): Promise<string | null> {
  switch (target.type) {
    case "official":
      return null;
    case "named":
      return target.name;
    case "current": {
      const state = await requireCurrentState();
      return state.currentSettingName;
    }
  }
}
