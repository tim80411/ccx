/**
 * 透過 dot-path 取得物件中的值
 * @param obj 目標物件
 * @param path dot-path（例如 "env.MY_KEY"）
 * @returns 對應的值，不存在時回傳 undefined
 */
export function getByPath(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split(".");
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

/**
 * 透過 dot-path 設定物件中的值（回傳新物件，不修改原物件）
 * @param obj 目標物件
 * @param path dot-path（例如 "env.MY_KEY"）
 * @param value 要設定的值
 * @returns 設定後的新物件
 */
export function setByPath(obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const keys = path.split(".");
  const result = structuredClone(obj);

  let current: Record<string, unknown> = result;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (typeof current[key] !== "object" || current[key] === null) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }

  current[keys[keys.length - 1]] = value;
  return result;
}

/**
 * 透過 dot-path 刪除物件中的 key（回傳新物件，不修改原物件）
 * @param obj 目標物件
 * @param path dot-path（例如 "env.MY_KEY"）
 * @returns 刪除後的新物件
 */
export function deleteByPath(obj: Record<string, unknown>, path: string): Record<string, unknown> {
  const keys = path.split(".");
  const result = structuredClone(obj);

  let current: Record<string, unknown> = result;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (typeof current[key] !== "object" || current[key] === null) {
      return result;
    }
    current = current[key] as Record<string, unknown>;
  }

  delete current[keys[keys.length - 1]];
  return result;
}

/**
 * 展平物件為 dot-path 陣列（陣列視為葉節點）
 * @param obj 目標物件
 * @returns dot-path 字串陣列
 */
export function flattenKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  const keys: string[] = [];

  for (const key of Object.keys(obj)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      keys.push(...flattenKeys(value as Record<string, unknown>, fullPath));
    } else {
      keys.push(fullPath);
    }
  }

  return keys;
}
