import select from "@inquirer/select";
import {
  getClaudeSettingsPath,
  getCcxSettingsDir,
  getSettingPath,
  getPreviousPath,
} from "../utils/paths";
import { writeFile } from "fs/promises";
import { dirname } from "path";
import { ensureDir, fileExists, listJsonFiles, readFile, createSymlink, isSymlink, readSymlink, removeFile } from "../utils/fs";
import { computeFileHash, saveState, loadState } from "../utils/state";
import { resolveSettingPath, resolveSettingName, type SettingTarget } from "../utils/target";
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
    if (await isSymlink(claudePath)) {
      throw new Error("Claude settings 的符號連結已損壞，請先使用 'ccx use <name>' 重新建立連結");
    }
    throw new Error("Claude settings 檔案不存在");
  }

  if (await fileExists(settingPath)) {
    throw new Error(`Setting '${name}' 已存在`);
  }

  await ensureDir(getCcxSettingsDir());
  // 讀取實際內容（自動跟隨符號連結）
  const content = await readFile(claudePath);
  await writeFile(settingPath, content, "utf-8");

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

  // 檢查是否已經在使用此 setting（符號連結指向相同目標）
  if (!options?.force && (await isSymlink(claudePath))) {
    const currentTarget = await readSymlink(claudePath);
    if (currentTarget === settingPath) {
      const state = await loadState();
      if (state?.currentSettingName === name) {
        // 更新 hash（檔案可能被編輯過）
        const newHash = await computeFileHash(settingPath);
        await saveState({ currentSettingName: name, claudeSettingsHash: newHash });
        return `✓ use: ${name} (已在使用中)`;
      }
    }
  }

  // 備份當前設定到 previous.json（讀取實際內容，不是連結本身）
  if (await fileExists(claudePath)) {
    await ensureDir(getCcxSettingsDir());
    const content = await readFile(claudePath);
    await writeFile(previousPath, content, "utf-8");
  }

  // 移除現有檔案或符號連結（包含損壞的連結）
  if ((await fileExists(claudePath)) || (await isSymlink(claudePath))) {
    await removeFile(claudePath);
  }

  // 確保父目錄存在
  await ensureDir(dirname(claudePath));

  // 建立符號連結：claudePath → settingPath
  await createSymlink(settingPath, claudePath);

  // 建立 .bak 備份
  await ensureDir(getCcxSettingsDir());
  const settingContent = await readFile(settingPath);
  await writeFile(`${settingPath}.bak`, settingContent, "utf-8");

  // 更新狀態
  const newHash = await computeFileHash(settingPath);
  await saveState({
    currentSettingName: name,
    claudeSettingsHash: newHash,
  });

  return `✓ use: ${name}`;
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
 * @param name setting 名稱（可選）
 * @param options.official 是否顯示 Claude 官方內容（預設顯示當前 setting 內容）
 * @param options.raw 是否輸出非格式化的 JSON
 * @returns JSON 字串
 */
export async function show(name?: string, options?: { official?: boolean; raw?: boolean }): Promise<string> {
  // 決定目標：--official > name > current
  let target: SettingTarget;
  if (options?.official) {
    target = { type: "official" };
  } else if (name) {
    target = { type: "named", name };
  } else {
    target = { type: "current" };
  }

  const targetPath = await resolveSettingPath(target);

  if (!(await fileExists(targetPath))) {
    if (options?.official) {
      throw new Error("Claude settings 檔案不存在");
    } else if (name) {
      throw new Error(`Setting '${name}' 不存在`);
    } else {
      throw new Error("Setting 檔案不存在");
    }
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
 * 比較兩個 named settings 的差異
 * @param name1 第一個 setting 名稱
 * @param name2 第二個 setting 名稱
 * @param options.semantic 是否使用語意化差異格式
 * @returns 包含輸出和 exit code 的物件
 */
export async function diff(
  name1: string,
  name2: string,
  options?: { semantic?: boolean }
): Promise<{ output: string; exitCode: number }> {
  const leftPath = getSettingPath(name1);
  const rightPath = getSettingPath(name2);

  // 驗證檔案存在
  if (!(await fileExists(leftPath))) {
    throw new Error(`Setting '${name1}' 不存在`);
  }
  if (!(await fileExists(rightPath))) {
    throw new Error(`Setting '${name2}' 不存在`);
  }

  // 檢查是否相同
  if (await areFilesIdentical(leftPath, rightPath)) {
    return { output: "", exitCode: 0 };
  }

  // 產生差異輸出
  const output = options?.semantic
    ? await generateSemanticDiff(leftPath, name1, rightPath, name2)
    : await generateUnifiedDiff(leftPath, name1, rightPath, name2);

  return { output, exitCode: 1 };
}
