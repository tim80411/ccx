import { writeFile } from "fs/promises";
import { getClaudeSettingsPath } from "../utils/paths";
import { fileExists, readFile } from "../utils/fs";
import { getByPath, setByPath } from "../utils/dotpath";
import { confirmAction } from "../utils/prompt";

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
