import { describe, expect, test } from "bun:test";
import { getByPath, setByPath, deleteByPath, flattenKeys } from "./dotpath";

describe("dotpath utilities", () => {
  describe("getByPath()", () => {
    test("取得 top-level key", () => {
      expect(getByPath({ model: "opus" }, "model")).toBe("opus");
    });

    test("取得 nested key", () => {
      expect(getByPath({ env: { MY_KEY: "val" } }, "env.MY_KEY")).toBe("val");
    });

    test("路徑不存在時回傳 undefined", () => {
      expect(getByPath({ env: {} }, "env.NOPE")).toBeUndefined();
    });

    test("中間路徑不存在時回傳 undefined", () => {
      expect(getByPath({}, "a.b.c")).toBeUndefined();
    });
  });

  describe("setByPath()", () => {
    test("設定 top-level key", () => {
      const result = setByPath({}, "model", "opus");
      expect(result).toEqual({ model: "opus" });
    });

    test("設定 nested key", () => {
      const result = setByPath({ env: {} }, "env.MY_KEY", "val");
      expect(result).toEqual({ env: { MY_KEY: "val" } });
    });

    test("中間路徑不存在時自動建立", () => {
      const result = setByPath({}, "env.MY_KEY", "val");
      expect(result).toEqual({ env: { MY_KEY: "val" } });
    });

    test("覆蓋已有值", () => {
      const result = setByPath({ model: "old" }, "model", "new");
      expect(result).toEqual({ model: "new" });
    });

    test("不修改原始物件", () => {
      const original = { model: "opus" };
      setByPath(original, "model", "new");
      expect(original.model).toBe("opus");
    });

    test("保留其他 key", () => {
      const result = setByPath({ a: 1, b: 2 }, "a", 10);
      expect(result).toEqual({ a: 10, b: 2 });
    });
  });

  describe("deleteByPath()", () => {
    test("刪除 top-level key", () => {
      const result = deleteByPath({ model: "opus", env: {} }, "model");
      expect(result).toEqual({ env: {} });
    });

    test("刪除 nested key", () => {
      const result = deleteByPath({ env: { A: "1", B: "2" } }, "env.A");
      expect(result).toEqual({ env: { B: "2" } });
    });

    test("路徑不存在時回傳原物件副本", () => {
      const original = { model: "opus" };
      const result = deleteByPath(original, "nonexist");
      expect(result).toEqual({ model: "opus" });
    });

    test("不修改原始物件", () => {
      const original = { model: "opus" };
      deleteByPath(original, "model");
      expect(original.model).toBe("opus");
    });
  });

  describe("flattenKeys()", () => {
    test("展平 top-level keys", () => {
      const result = flattenKeys({ model: "opus", env: {} });
      expect(result).toContain("model");
    });

    test("展平 nested keys", () => {
      const result = flattenKeys({ env: { A: "1", B: "2" } });
      expect(result).toContain("env.A");
      expect(result).toContain("env.B");
    });

    test("空物件回傳空陣列", () => {
      expect(flattenKeys({})).toEqual([]);
    });

    test("陣列視為葉節點", () => {
      const result = flattenKeys({ hooks: { Notification: [{ type: "cmd" }] } });
      expect(result).toContain("hooks.Notification");
      expect(result).not.toContain("hooks.Notification.0");
    });
  });
});
