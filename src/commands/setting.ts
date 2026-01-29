import select from "@inquirer/select";
import {
  getClaudeSettingsPath,
  getCcxSettingsDir,
  getSettingPath,
  getPreviousPath,
} from "../utils/paths";
import { ensureDir, copyFile, fileExists, listJsonFiles, readFile } from "../utils/fs";
import { computeFileHash, saveState, loadState } from "../utils/state";
import { confirmAction } from "../utils/prompt";

/**
 * 建立新的 setting
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
 * 列出所有 settings
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
 * 切換到指定的 setting
 * @param name setting 名稱
 * @param options.force 強制切換，跳過修改檢查
 * @returns 成功訊息
 */
export async function use(name: string, options?: { force?: boolean }): Promise<string> {
  if (name === "previous") {
    throw new Error("'previous' 是保留名稱，無法使用");
  }

  const settingPath = getSettingPath(name);
  const claudePath = getClaudeSettingsPath();
  const previousPath = getPreviousPath();

  if (!(await fileExists(settingPath))) {
    throw new Error(`Setting '${name}' 不存在`);
  }

  if (!options?.force && (await fileExists(claudePath))) {
    const state = await loadState();
    if (state) {
      const currentHash = await computeFileHash(claudePath);
      if (currentHash !== state.claudeSettingsHash) {
        const shouldContinue = await confirmAction(
          `當前設定 (${state.currentSettingName}) 已被修改，切換到 '${name}' 將會遺失這些變更。是否繼續？`
        );
        if (!shouldContinue) {
          throw new Error("已取消切換");
        }
      }
    }
  }

  // 備份當前設定到 previous.json
  if (await fileExists(claudePath)) {
    await ensureDir(getCcxSettingsDir());
    await copyFile(claudePath, previousPath);
  }

  await copyFile(settingPath, claudePath);

  const newHash = await computeFileHash(claudePath);
  await saveState({
    currentSettingName: name,
    claudeSettingsHash: newHash,
  });

  return `✓ use: ${name}`;
}

/**
 * 更新指定的 setting（從當前 claude settings 覆蓋）
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

  const state = await loadState();
  if (state?.currentSettingName === name) {
    const newHash = await computeFileHash(claudePath);
    await saveState({
      currentSettingName: name,
      claudeSettingsHash: newHash,
    });
  }

  return `✓ update: ${name}`;
}

/**
 * 取得 Claude settings 檔案路徑
 * @returns 路徑字串
 */
export async function path(): Promise<string> {
  return getClaudeSettingsPath();
}

/**
 * 顯示當前 Claude settings 內容
 * @param options.raw 是否輸出非格式化的 JSON
 * @returns JSON 字串
 */
export async function show(options?: { raw?: boolean }): Promise<string> {
  const claudePath = getClaudeSettingsPath();

  if (!(await fileExists(claudePath))) {
    throw new Error("Claude settings 檔案不存在");
  }

  const content = await readFile(claudePath);
  const parsed = JSON.parse(content);

  if (options?.raw) {
    return JSON.stringify(parsed);
  }

  return JSON.stringify(parsed, null, 2);
}

/**
 * 互動式選擇 setting
 * @returns 選擇的 setting 名稱
 */
export async function selectProfile(): Promise<string> {
  const settings = await listJsonFiles(getCcxSettingsDir());

  if (settings.length === 0) {
    throw new Error("尚無任何 setting，使用 'ccx setting create <name>' 建立");
  }

  return await select({
    message: "選擇要使用的 setting profile",
    choices: settings.map((s) => ({ name: s, value: s })),
  });
}
