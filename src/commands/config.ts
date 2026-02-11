import { writeFile } from "fs/promises";
import { getClaudeSettingsPath } from "../utils/paths";
import { fileExists, readFile } from "../utils/fs";
import { getByPath, setByPath, deleteByPath, flattenKeys } from "../utils/dotpath";
import { confirmAction } from "../utils/prompt";
import select from "@inquirer/select";

/**
 * 解析值的型別（布林、數字、字串）
 */
function parseValue(raw: string): unknown {
  if (raw === "true") return true;
  if (raw === "false") return false;
  const num = Number(raw);
  if (!Number.isNaN(num) && raw.trim() !== "") return num;
  return raw;
}

/**
 * 解析 key=value 字串（只 split 第一個 =）
 */
function parseEntry(entry: string): { key: string; value: unknown } {
  const eqIndex = entry.indexOf("=");
  if (eqIndex === -1) {
    throw new Error(`格式錯誤: '${entry}'，請使用 key=value 格式`);
  }
  const key = entry.slice(0, eqIndex);
  const rawValue = entry.slice(eqIndex + 1);
  return { key, value: parseValue(rawValue) };
}

/**
 * 格式化值為顯示用字串
 */
function formatValue(value: unknown): string {
  if (typeof value === "string") return `"${value}"`;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/**
 * 設定 Claude settings.json 中的 key-value
 * @param entries key=value 字串陣列
 * @param options.approve 跳過所有確認
 * @returns 成功訊息
 */
export async function set(
  entries: string[],
  options?: { approve?: boolean }
): Promise<string> {
  if (entries.length === 0) {
    throw new Error("請提供至少一組 key=value");
  }

  const claudePath = getClaudeSettingsPath();
  if (!(await fileExists(claudePath))) {
    throw new Error("Claude settings 檔案不存在");
  }

  const parsed = entries.map(parseEntry);

  const content = await readFile(claudePath);
  let obj = JSON.parse(content) as Record<string, unknown>;

  const results: string[] = [];

  for (const { key, value } of parsed) {
    const existing = getByPath(obj, key);

    if (existing !== undefined && !options?.approve) {
      const shouldOverwrite = await confirmAction(
        `${key} 已存在，目前值為 ${formatValue(existing)}，是否覆蓋？`
      );
      if (!shouldOverwrite) {
        results.push(`  跳過: ${key}`);
        continue;
      }
    }

    obj = setByPath(obj, key, value);
    results.push(`✓ set: ${key} = ${formatValue(value)}`);
  }

  await writeFile(claudePath, JSON.stringify(obj, null, 2), "utf-8");

  return results.join("\n");
}

/**
 * 刪除 Claude settings.json 中的 key
 * @param key dot-path（可選，未指定時互動選擇）
 * @returns 成功訊息
 */
export async function unset(key?: string): Promise<string> {
  const claudePath = getClaudeSettingsPath();
  if (!(await fileExists(claudePath))) {
    throw new Error("Claude settings 檔案不存在");
  }

  const content = await readFile(claudePath);
  const obj = JSON.parse(content) as Record<string, unknown>;

  const targetKey = key ?? (await selectKey(obj));

  if (getByPath(obj, targetKey) === undefined) {
    throw new Error(`'${targetKey}' 不存在於 settings 中`);
  }

  const result = deleteByPath(obj, targetKey);
  await writeFile(claudePath, JSON.stringify(result, null, 2), "utf-8");

  return `✓ unset: ${targetKey}`;
}

/**
 * 互動式選擇要刪除的 key
 */
async function selectKey(obj: Record<string, unknown>): Promise<string> {
  const keys = flattenKeys(obj);

  if (keys.length === 0) {
    throw new Error("settings 中沒有可刪除的 key");
  }

  return await select({
    message: "選擇要刪除的 key",
    choices: keys.map((k) => ({ name: k, value: k })),
  });
}
