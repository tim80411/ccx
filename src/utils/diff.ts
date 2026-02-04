import chalk from "chalk";
import { createTwoFilesPatch } from "diff";
import { readFile } from "./fs";

/**
 * 檢查兩個 JSON 檔案是否語意相同
 * @param leftPath 左側檔案路徑
 * @param rightPath 右側檔案路徑
 * @returns 語意相同則回傳 true
 */
export async function areFilesIdentical(
  leftPath: string,
  rightPath: string
): Promise<boolean> {
  const leftContent = await readFile(leftPath);
  const rightContent = await readFile(rightPath);

  // 比較正規化後的 JSON（忽略格式差異）
  const leftNormalized = JSON.stringify(JSON.parse(leftContent));
  const rightNormalized = JSON.stringify(JSON.parse(rightContent));

  return leftNormalized === rightNormalized;
}

/**
 * 產生 unified diff 格式的差異輸出（類似 git diff）
 * @param leftPath 左側檔案路徑
 * @param leftLabel 左側標籤
 * @param rightPath 右側檔案路徑
 * @param rightLabel 右側標籤
 * @returns 彩色的 unified diff 輸出
 */
export async function generateUnifiedDiff(
  leftPath: string,
  leftLabel: string,
  rightPath: string,
  rightLabel: string
): Promise<string> {
  const leftContent = await readFile(leftPath);
  const rightContent = await readFile(rightPath);

  // 正規化 JSON 格式以進行語意比較
  const leftFormatted = JSON.stringify(JSON.parse(leftContent), null, 2);
  const rightFormatted = JSON.stringify(JSON.parse(rightContent), null, 2);

  if (leftFormatted === rightFormatted) {
    return "";
  }

  const patch = createTwoFilesPatch(
    leftLabel,
    rightLabel,
    leftFormatted,
    rightFormatted,
    "",
    "",
    { context: 3 }
  );

  // 加上顏色
  return colorizeUnifiedDiff(patch);
}

/**
 * 對 unified diff 輸出套用顏色
 */
function colorizeUnifiedDiff(patch: string): string {
  return patch
    .split("\n")
    .map((line) => {
      if (line.startsWith("---") || line.startsWith("+++")) {
        return chalk.bold(line);
      }
      if (line.startsWith("-")) {
        return chalk.red(line);
      }
      if (line.startsWith("+")) {
        return chalk.green(line);
      }
      if (line.startsWith("@@")) {
        return chalk.cyan(line);
      }
      return line;
    })
    .join("\n");
}

interface DiffChange {
  type: "added" | "removed" | "modified";
  path: string;
  oldValue?: unknown;
  newValue?: unknown;
}

/**
 * 產生語意化差異輸出（按 JSON key 分組）
 * @param leftPath 左側檔案路徑
 * @param leftLabel 左側標籤（未使用，保持 API 一致性）
 * @param rightPath 右側檔案路徑
 * @param rightLabel 右側標籤（未使用，保持 API 一致性）
 * @returns 彩色的語意化差異輸出
 */
export async function generateSemanticDiff(
  leftPath: string,
  _leftLabel: string,
  rightPath: string,
  _rightLabel: string
): Promise<string> {
  const leftContent = await readFile(leftPath);
  const rightContent = await readFile(rightPath);

  const leftObj = JSON.parse(leftContent);
  const rightObj = JSON.parse(rightContent);

  const changes = computeChanges(leftObj, rightObj, "");

  if (changes.length === 0) {
    return "";
  }

  return formatSemanticChanges(changes);
}

/**
 * 遞迴比較兩個物件，找出所有差異
 */
function computeChanges(
  left: unknown,
  right: unknown,
  path: string
): DiffChange[] {
  const changes: DiffChange[] = [];

  // 處理 null/undefined
  if (left === null || left === undefined) {
    if (right !== null && right !== undefined) {
      changes.push({ type: "added", path: path || "(root)", newValue: right });
    }
    return changes;
  }

  if (right === null || right === undefined) {
    changes.push({ type: "removed", path: path || "(root)", oldValue: left });
    return changes;
  }

  // 處理不同型別
  if (typeof left !== typeof right) {
    changes.push({
      type: "modified",
      path: path || "(root)",
      oldValue: left,
      newValue: right,
    });
    return changes;
  }

  // 處理陣列
  if (Array.isArray(left) && Array.isArray(right)) {
    if (JSON.stringify(left) !== JSON.stringify(right)) {
      changes.push({
        type: "modified",
        path: path || "(root)",
        oldValue: left,
        newValue: right,
      });
    }
    return changes;
  }

  // 處理物件
  if (typeof left === "object" && typeof right === "object") {
    const leftObj = left as Record<string, unknown>;
    const rightObj = right as Record<string, unknown>;
    const allKeys = new Set([...Object.keys(leftObj), ...Object.keys(rightObj)]);

    for (const key of allKeys) {
      const newPath = path ? `${path}.${key}` : key;

      if (!(key in leftObj)) {
        changes.push({ type: "added", path: newPath, newValue: rightObj[key] });
      } else if (!(key in rightObj)) {
        changes.push({ type: "removed", path: newPath, oldValue: leftObj[key] });
      } else {
        changes.push(...computeChanges(leftObj[key], rightObj[key], newPath));
      }
    }

    return changes;
  }

  // 處理原始型別
  if (left !== right) {
    changes.push({
      type: "modified",
      path: path || "(root)",
      oldValue: left,
      newValue: right,
    });
  }

  return changes;
}

/**
 * 格式化語意差異輸出
 */
function formatSemanticChanges(changes: DiffChange[]): string {
  const added = changes.filter((c) => c.type === "added");
  const removed = changes.filter((c) => c.type === "removed");
  const modified = changes.filter((c) => c.type === "modified");

  const sections: string[] = [];

  if (added.length > 0) {
    sections.push(
      chalk.green.bold("Added:") +
        "\n" +
        added
          .map((c) => chalk.green(`  + ${c.path} = ${formatValue(c.newValue)}`))
          .join("\n")
    );
  }

  if (removed.length > 0) {
    sections.push(
      chalk.red.bold("Removed:") +
        "\n" +
        removed
          .map((c) => chalk.red(`  - ${c.path} = ${formatValue(c.oldValue)}`))
          .join("\n")
    );
  }

  if (modified.length > 0) {
    sections.push(
      chalk.yellow.bold("Modified:") +
        "\n" +
        modified
          .map(
            (c) =>
              chalk.yellow(`  ~ ${c.path}: `) +
              chalk.red(formatValue(c.oldValue)) +
              chalk.yellow(" → ") +
              chalk.green(formatValue(c.newValue))
          )
          .join("\n")
    );
  }

  return sections.join("\n\n");
}

/**
 * 格式化值為簡潔的字串表示
 */
function formatValue(value: unknown): string {
  if (typeof value === "string") {
    return `"${value}"`;
  }
  if (Array.isArray(value)) {
    if (value.length <= 3) {
      return JSON.stringify(value);
    }
    return `[${value.length} items]`;
  }
  if (typeof value === "object" && value !== null) {
    const keys = Object.keys(value);
    if (keys.length <= 2) {
      return JSON.stringify(value);
    }
    return `{${keys.length} keys}`;
  }
  return String(value);
}
