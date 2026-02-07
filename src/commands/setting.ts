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
import { resolveSettingPath, resolveSettingName, SettingTarget } from "../utils/target";
import {
  areFilesIdentical,
  generateUnifiedDiff,
  generateSemanticDiff,
} from "../utils/diff";

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
 * 更新 setting（從當前 claude settings 覆蓋）
 * @param name setting 名稱（可選，預設為當前 setting）
 * @returns 成功訊息
 */
export async function update(name?: string): Promise<string> {
  if (name === "previous") {
    throw new Error("'previous' 是保留名稱，無法使用");
  }

  const target: SettingTarget = name
    ? { type: "named", name }
    : { type: "current" };

  const targetName = await resolveSettingName(target);
  if (!targetName) {
    throw new Error("無法解析目標 setting 名稱");
  }

  const settingPath = getSettingPath(targetName);
  const claudePath = getClaudeSettingsPath();

  if (!(await fileExists(settingPath))) {
    throw new Error(`Setting '${targetName}' 不存在`);
  }

  if (!(await fileExists(claudePath))) {
    throw new Error("Claude settings 檔案不存在");
  }

  // 若未指定名稱，使用當前 setting 時需確認
  if (!name) {
    const shouldContinue = await confirmAction(
      `確定要用當前 Claude settings 覆蓋 '${targetName}' 嗎？`
    );
    if (!shouldContinue) {
      throw new Error("已取消更新");
    }
  }

  await copyFile(claudePath, settingPath);

  const state = await loadState();
  if (state?.currentSettingName === targetName) {
    const newHash = await computeFileHash(claudePath);
    await saveState({
      currentSettingName: targetName,
      claudeSettingsHash: newHash,
    });
  }

  return `✓ update: ${targetName}`;
}

/**
 * 顯示設定檔路徑
 * @param options.official 是否顯示 Claude 官方路徑（預設顯示當前 setting 路徑）
 * @returns 路徑字串
 */
export async function path(options?: { official?: boolean }): Promise<string> {
  const target: SettingTarget = options?.official
    ? { type: "official" }
    : { type: "current" };
  return await resolveSettingPath(target);
}

/**
 * 顯示設定檔內容
 * @param options.official 是否顯示 Claude 官方內容（預設顯示當前 setting 內容）
 * @param options.raw 是否輸出非格式化的 JSON
 * @returns JSON 字串
 */
export async function show(options?: { official?: boolean; raw?: boolean; name?: string }): Promise<string> {
  const target: SettingTarget = options?.name
    ? { type: "named", name: options.name }
    : options?.official
      ? { type: "official" }
      : { type: "current" };

  const targetPath = await resolveSettingPath(target);

  if (!(await fileExists(targetPath))) {
    if (options?.name) {
      throw new Error(`Setting '${options.name}' 不存在`);
    }
    const fileType = options?.official ? "Claude settings" : "Setting";
    throw new Error(`${fileType} 檔案不存在`);
  }

  const content = await readFile(targetPath);
  const parsed = JSON.parse(content);

  if (options?.raw) {
    return JSON.stringify(parsed);
  }

  return JSON.stringify(parsed, null, 2);
}

/**
 * 顯示當前使用中的 setting 名稱
 * @returns 當前 setting 名稱
 */
export async function status(): Promise<string> {
  const name = await resolveSettingName({ type: "current" });
  return `✓ current: ${name}`;
}

/**
 * 互動式選擇 setting
 * @returns 選擇的 setting 名稱
 */
export async function selectSetting(): Promise<string> {
  const settings = await listJsonFiles(getCcxSettingsDir());

  if (settings.length === 0) {
    throw new Error("尚無任何 setting，使用 'ccx setting create <name>' 建立");
  }

  return await select({
    message: "選擇要使用的 setting",
    choices: settings.map((s) => ({ name: s, value: s })),
  });
}

/**
 * 比較兩個設定檔的差異
 * @param arg1 第一個參數（可選）
 * @param arg2 第二個參數（可選）
 * @param options.semantic 是否使用語意化差異格式
 * @returns 包含輸出和 exit code 的物件
 */
export async function diff(
  arg1?: string,
  arg2?: string,
  options?: { semantic?: boolean }
): Promise<{ output: string; exitCode: number }> {
  // 解析目標
  const { left, right } = resolveDiffTargets(arg1, arg2);

  const leftPath = await resolveSettingPath(left);
  const rightPath = await resolveSettingPath(right);

  // 驗證檔案存在
  if (left.type === "named" && !(await fileExists(leftPath))) {
    throw new Error(`Setting '${left.name}' 不存在`);
  }
  if (left.type === "current" && !(await fileExists(leftPath))) {
    throw new Error("Setting 檔案不存在");
  }

  if (right.type === "named" && !(await fileExists(rightPath))) {
    throw new Error(`Setting '${right.name}' 不存在`);
  }
  if (right.type === "official" && !(await fileExists(rightPath))) {
    throw new Error("Claude settings 檔案不存在");
  }

  // 檢查是否相同
  if (await areFilesIdentical(leftPath, rightPath)) {
    return { output: "", exitCode: 0 };
  }

  // 產生標籤
  const leftLabel = (await resolveSettingName(left)) ?? "official";
  const rightLabel = (await resolveSettingName(right)) ?? "official";

  // 產生差異輸出
  const output = options?.semantic
    ? await generateSemanticDiff(leftPath, leftLabel, rightPath, rightLabel)
    : await generateUnifiedDiff(leftPath, leftLabel, rightPath, rightLabel);

  return { output, exitCode: 1 };
}

/**
 * 解析 diff 指令的目標設定檔
 */
function resolveDiffTargets(
  arg1?: string,
  arg2?: string
): { left: SettingTarget; right: SettingTarget } {
  // ccx diff → current vs official
  if (!arg1 && !arg2) {
    return {
      left: { type: "current" },
      right: { type: "official" },
    };
  }

  // ccx diff <name> → named vs official
  if (arg1 && !arg2) {
    return {
      left: { type: "named", name: arg1 },
      right: { type: "official" },
    };
  }

  // ccx diff <name1> <name2> → named vs named
  return {
    left: { type: "named", name: arg1! },
    right: { type: "named", name: arg2! },
  };
}
