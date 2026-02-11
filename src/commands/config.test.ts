import { describe, expect, test, beforeEach, afterEach, mock } from "bun:test";
import { mkdtemp, rm, writeFile, mkdir, readFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

describe("config commands", () => {
  let tempDir: string;
  let claudeDir: string;
  let claudeSettingsPath: string;
  let originalClaudeSettings: string | undefined;

  beforeEach(async () => {
    originalClaudeSettings = process.env.CCX_CLAUDE_SETTINGS;

    tempDir = await mkdtemp(join(tmpdir(), "ccx-config-test-"));
    claudeDir = join(tempDir, ".claude");
    claudeSettingsPath = join(claudeDir, "settings.json");

    await mkdir(claudeDir, { recursive: true });

    process.env.CCX_CLAUDE_SETTINGS = claudeSettingsPath;
  });

  afterEach(async () => {
    if (originalClaudeSettings !== undefined) {
      process.env.CCX_CLAUDE_SETTINGS = originalClaudeSettings;
    } else {
      delete process.env.CCX_CLAUDE_SETTINGS;
    }
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("set()", () => {
    test("設定單一 key-value", async () => {
      const { set } = await import("./config");
      await writeFile(claudeSettingsPath, JSON.stringify({ model: "opus" }));

      const result = await set(["env.MY_KEY=myvalue"], { approve: true });

      expect(result).toContain("✓ set: env.MY_KEY");
      const content = JSON.parse(await readFile(claudeSettingsPath, "utf-8"));
      expect(content.env.MY_KEY).toBe("myvalue");
    });

    test("設定多筆 key-value", async () => {
      const { set } = await import("./config");
      await writeFile(claudeSettingsPath, JSON.stringify({}));

      const result = await set(["env.A=1", "env.B=2"], { approve: true });

      expect(result).toContain("env.A");
      expect(result).toContain("env.B");
      const content = JSON.parse(await readFile(claudeSettingsPath, "utf-8"));
      expect(content.env.A).toBe(1);
      expect(content.env.B).toBe(2);
    });

    test("值包含 = 時只 split 第一個", async () => {
      const { set } = await import("./config");
      await writeFile(claudeSettingsPath, JSON.stringify({}));

      const result = await set(["env.HEADER=a=b=c"], { approve: true });

      const content = JSON.parse(await readFile(claudeSettingsPath, "utf-8"));
      expect(content.env.HEADER).toBe("a=b=c");
    });

    test("布林值推斷: true", async () => {
      const { set } = await import("./config");
      await writeFile(claudeSettingsPath, JSON.stringify({}));

      await set(["enabledPlugins.foo=true"], { approve: true });

      const content = JSON.parse(await readFile(claudeSettingsPath, "utf-8"));
      expect(content.enabledPlugins.foo).toBe(true);
    });

    test("布林值推斷: false", async () => {
      const { set } = await import("./config");
      await writeFile(claudeSettingsPath, JSON.stringify({}));

      await set(["enabledPlugins.foo=false"], { approve: true });

      const content = JSON.parse(await readFile(claudeSettingsPath, "utf-8"));
      expect(content.enabledPlugins.foo).toBe(false);
    });

    test("數字推斷", async () => {
      const { set } = await import("./config");
      await writeFile(claudeSettingsPath, JSON.stringify({}));

      await set(["statusLine.padding=42"], { approve: true });

      const content = JSON.parse(await readFile(claudeSettingsPath, "utf-8"));
      expect(content.statusLine.padding).toBe(42);
    });

    test("Claude settings 不存在時應拋出錯誤", async () => {
      const { set } = await import("./config");
      await rm(claudeSettingsPath, { force: true });

      await expect(set(["env.A=1"], { approve: true })).rejects.toThrow(
        "Claude settings 檔案不存在"
      );
    });

    test("空的 entries 應拋出錯誤", async () => {
      const { set } = await import("./config");
      await writeFile(claudeSettingsPath, JSON.stringify({}));

      await expect(set([], { approve: true })).rejects.toThrow("請提供至少一組 key=value");
    });

    test("格式錯誤應拋出錯誤", async () => {
      const { set } = await import("./config");
      await writeFile(claudeSettingsPath, JSON.stringify({}));

      await expect(set(["noequals"], { approve: true })).rejects.toThrow("格式錯誤");
    });

    test("key 已存在且使用 --approve 時直接覆蓋", async () => {
      const { set } = await import("./config");
      await writeFile(claudeSettingsPath, JSON.stringify({ model: "opus" }));

      const result = await set(["model=sonnet"], { approve: true });

      expect(result).toContain("✓ set: model");
      const content = JSON.parse(await readFile(claudeSettingsPath, "utf-8"));
      expect(content.model).toBe("sonnet");
    });

    test("key 已存在且確認覆蓋時應成功", async () => {
      mock.module("@inquirer/confirm", () => ({
        default: async () => true,
      }));

      const { set } = await import("./config");
      await writeFile(claudeSettingsPath, JSON.stringify({ model: "opus" }));

      const result = await set(["model=sonnet"]);

      expect(result).toContain("✓ set: model");
      const content = JSON.parse(await readFile(claudeSettingsPath, "utf-8"));
      expect(content.model).toBe("sonnet");
    });

    test("key 已存在且取消覆蓋時應跳過該 key", async () => {
      mock.module("@inquirer/confirm", () => ({
        default: async () => false,
      }));

      const { set } = await import("./config");
      await writeFile(claudeSettingsPath, JSON.stringify({ model: "opus" }));

      const result = await set(["model=sonnet"]);

      expect(result).toContain("跳過");
      const content = JSON.parse(await readFile(claudeSettingsPath, "utf-8"));
      expect(content.model).toBe("opus");
    });

    test("保留原有的其他 key", async () => {
      const { set } = await import("./config");
      await writeFile(claudeSettingsPath, JSON.stringify({ model: "opus", env: { A: "1" } }));

      await set(["env.B=2"], { approve: true });

      const content = JSON.parse(await readFile(claudeSettingsPath, "utf-8"));
      expect(content.model).toBe("opus");
      expect(content.env.A).toBe("1");
      expect(content.env.B).toBe(2);
    });
  });

  describe("unset()", () => {
    test("刪除 top-level key", async () => {
      const { unset } = await import("./config");
      await writeFile(claudeSettingsPath, JSON.stringify({ model: "opus", env: {} }));

      const result = await unset("model");

      expect(result).toBe("✓ unset: model");
      const content = JSON.parse(await readFile(claudeSettingsPath, "utf-8"));
      expect(content.model).toBeUndefined();
      expect(content.env).toEqual({});
    });

    test("刪除 nested key", async () => {
      const { unset } = await import("./config");
      await writeFile(claudeSettingsPath, JSON.stringify({ env: { A: "1", B: "2" } }));

      const result = await unset("env.A");

      expect(result).toBe("✓ unset: env.A");
      const content = JSON.parse(await readFile(claudeSettingsPath, "utf-8"));
      expect(content.env.A).toBeUndefined();
      expect(content.env.B).toBe("2");
    });

    test("key 不存在時應拋出錯誤", async () => {
      const { unset } = await import("./config");
      await writeFile(claudeSettingsPath, JSON.stringify({ model: "opus" }));

      await expect(unset("nonexist")).rejects.toThrow("'nonexist' 不存在於 settings 中");
    });

    test("Claude settings 不存在時應拋出錯誤", async () => {
      const { unset } = await import("./config");
      await rm(claudeSettingsPath, { force: true });

      await expect(unset("model")).rejects.toThrow("Claude settings 檔案不存在");
    });

    test("無參數時互動選擇", async () => {
      mock.module("@inquirer/select", () => ({
        default: async () => "model",
      }));

      const { unset } = await import("./config");
      await writeFile(claudeSettingsPath, JSON.stringify({ model: "opus", env: { A: "1" } }));

      const result = await unset();

      expect(result).toBe("✓ unset: model");
      const content = JSON.parse(await readFile(claudeSettingsPath, "utf-8"));
      expect(content.model).toBeUndefined();
    });

    test("無參數且 settings 為空時應拋出錯誤", async () => {
      const { unset } = await import("./config");
      await writeFile(claudeSettingsPath, JSON.stringify({}));

      await expect(unset()).rejects.toThrow("settings 中沒有可刪除的 key");
    });
  });
});
