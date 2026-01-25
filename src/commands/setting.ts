import {
  getClaudeSettingsPath,
  getCcxSettingsDir,
  getSettingPath,
  getPreviousPath,
} from "../utils/paths";
import { ensureDir, copyFile, fileExists, listJsonFiles } from "../utils/fs";

/**
 * 建立新的 setting profile
 * @param name setting 名稱
 * @returns 成功訊息
 */
export async function create(name: string): Promise<string> {
  if (name === "previous") {
    throw new Error("'previous' 是保留名稱，無法使用");
  }

  const claudePath = getClaudeSettingsPath();
  const settingPath = getSettingPath(name);

  if (!(await fileExists(claudePath))) {
    throw new Error("Claude settings 檔案不存在");
  }

  if (await fileExists(settingPath)) {
    throw new Error(`Setting '${name}' 已存在`);
  }

  await ensureDir(getCcxSettingsDir());
  await copyFile(claudePath, settingPath);

  return `✓ create: ${name}`;
}

/**
 * 列出所有 setting profiles
 * @returns 格式化的列表或提示訊息
 */
export async function list(): Promise<string> {
  const settings = await listJsonFiles(getCcxSettingsDir());

  if (settings.length === 0) {
    return "尚無任何 setting，使用 'ccx setting create <name>' 建立";
  }

  return settings.map((s) => `  - ${s}`).join("\n");
}

/**
 * 切換到指定的 setting profile
 * @param name setting 名稱
 * @returns 成功訊息
 */
export async function use(name: string): Promise<string> {
  const settingPath = getSettingPath(name);
  const claudePath = getClaudeSettingsPath();
  const previousPath = getPreviousPath();

  if (!(await fileExists(settingPath))) {
    throw new Error(`Setting '${name}' 不存在`);
  }

  // 備份當前設定到 previous.json
  if (await fileExists(claudePath)) {
    await ensureDir(getCcxSettingsDir());
    await copyFile(claudePath, previousPath);
  }

  // 複製指定 setting 到 claude settings
  await copyFile(settingPath, claudePath);

  return `✓ use: ${name}`;
}

/**
 * 更新指定的 setting profile（從當前 claude settings 覆蓋）
 * @param name setting 名稱
 * @returns 成功訊息
 */
export async function update(name: string): Promise<string> {
  const settingPath = getSettingPath(name);
  const claudePath = getClaudeSettingsPath();

  if (!(await fileExists(settingPath))) {
    throw new Error(`Setting '${name}' 不存在`);
  }

  if (!(await fileExists(claudePath))) {
    throw new Error("Claude settings 檔案不存在");
  }

  await copyFile(claudePath, settingPath);

  return `✓ update: ${name}`;
}
