import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, writeFile, mkdir } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

describe("setting commands", () => {
  let tempDir: string;
  let claudeDir: string;
  let ccxDir: string;
  let claudeSettingsPath: string;
  let originalClaudeSettings: string | undefined;
  let originalSettingsDir: string | undefined;

  beforeEach(async () => {
    // 保存原始環境變數
    originalClaudeSettings = process.env.CCX_CLAUDE_SETTINGS;
    originalSettingsDir = process.env.CCX_SETTINGS_DIR;

    // 建立臨時目錄
    tempDir = await mkdtemp(join(tmpdir(), "ccx-test-"));
    claudeDir = join(tempDir, ".claude");
    ccxDir = join(tempDir, ".config", "ccx", "settings");
    claudeSettingsPath = join(claudeDir, "settings.json");

    await mkdir(claudeDir, { recursive: true });
    await mkdir(ccxDir, { recursive: true });

    // 設定環境變數指向測試目錄
    process.env.CCX_CLAUDE_SETTINGS = claudeSettingsPath;
    process.env.CCX_SETTINGS_DIR = ccxDir;
  });

  afterEach(async () => {
    // 還原環境變數
    if (originalClaudeSettings !== undefined) {
      process.env.CCX_CLAUDE_SETTINGS = originalClaudeSettings;
    } else {
      delete process.env.CCX_CLAUDE_SETTINGS;
    }
    if (originalSettingsDir !== undefined) {
      process.env.CCX_SETTINGS_DIR = originalSettingsDir;
    } else {
      delete process.env.CCX_SETTINGS_DIR;
    }

    await rm(tempDir, { recursive: true, force: true });
  });

  describe("create(name)", () => {
    test("名稱為 'previous' 時應拋出錯誤", async () => {
      const { create } = await import("./setting");
      await writeFile(claudeSettingsPath, "{}");
      await expect(create("previous")).rejects.toThrow(
        "'previous' 是保留名稱，無法使用"
      );
    });

    test("setting 已存在時應拋出錯誤", async () => {
      const { create } = await import("./setting");
      await writeFile(claudeSettingsPath, "{}");
      await writeFile(join(ccxDir, "work.json"), "{}");
      await expect(create("work")).rejects.toThrow("Setting 'work' 已存在");
    });

    test("來源檔案不存在時應拋出錯誤", async () => {
      const { create } = await import("./setting");
      await expect(create("work")).rejects.toThrow("Claude settings 檔案不存在");
    });

    test("正常情況應複製檔案並回傳成功訊息", async () => {
      const { create } = await import("./setting");
      const content = JSON.stringify({ test: "data" });
      await writeFile(claudeSettingsPath, content);

      const result = await create("work");

      expect(result).toBe("✓ create: work");
      const savedContent = await Bun.file(join(ccxDir, "work.json")).text();
      expect(savedContent).toBe(content);
    });
  });

  describe("list()", () => {
    test("有資料時應格式化輸出", async () => {
      const { list } = await import("./setting");
      await writeFile(join(ccxDir, "work.json"), "{}");
      await writeFile(join(ccxDir, "personal.json"), "{}");

      const result = await list();

      expect(result).toContain("work");
      expect(result).toContain("personal");
    });

    test("空列表時應顯示提示訊息", async () => {
      const { list } = await import("./setting");
      const result = await list();
      expect(result).toBe("尚無任何 setting，使用 'ccx setting create <name>' 建立");
    });
  });

  describe("use(name)", () => {
    test("setting 不存在時應拋出錯誤", async () => {
      const { use } = await import("./setting");
      await expect(use("nonexist")).rejects.toThrow("Setting 'nonexist' 不存在");
    });

    test("正常情況應備份到 previous.json", async () => {
      const { use } = await import("./setting");
      const currentContent = JSON.stringify({ current: true });
      const workContent = JSON.stringify({ work: true });

      await writeFile(claudeSettingsPath, currentContent);
      await writeFile(join(ccxDir, "work.json"), workContent);

      await use("work");

      const previousContent = await Bun.file(join(ccxDir, "previous.json")).text();
      expect(previousContent).toBe(currentContent);
    });

    test("正常情況應複製指定 setting 到 claude settings", async () => {
      const { use } = await import("./setting");
      const currentContent = JSON.stringify({ current: true });
      const workContent = JSON.stringify({ work: true });

      await writeFile(claudeSettingsPath, currentContent);
      await writeFile(join(ccxDir, "work.json"), workContent);

      const result = await use("work");

      expect(result).toBe("✓ use: work");
      const newContent = await Bun.file(claudeSettingsPath).text();
      expect(newContent).toBe(workContent);
    });
  });

  describe("update(name)", () => {
    test("setting 不存在時應拋出錯誤", async () => {
      const { update } = await import("./setting");
      await writeFile(claudeSettingsPath, "{}");
      await expect(update("nonexist")).rejects.toThrow("Setting 'nonexist' 不存在");
    });

    test("來源檔案不存在時應拋出錯誤", async () => {
      const { update } = await import("./setting");
      await writeFile(join(ccxDir, "work.json"), "{}");
      await expect(update("work")).rejects.toThrow("Claude settings 檔案不存在");
    });

    test("正常情況應覆蓋指定 setting", async () => {
      const { update } = await import("./setting");
      const newContent = JSON.stringify({ updated: true });
      await writeFile(claudeSettingsPath, newContent);
      await writeFile(join(ccxDir, "work.json"), "{}");

      const result = await update("work");

      expect(result).toBe("✓ update: work");
      const savedContent = await Bun.file(join(ccxDir, "work.json")).text();
      expect(savedContent).toBe(newContent);
    });
  });

  describe("path()", () => {
    test("應回傳 Claude settings 檔案路徑", async () => {
      const { path } = await import("./setting");
      const result = await path();
      expect(result).toBe(claudeSettingsPath);
    });
  });

  describe("show()", () => {
    test("應回傳格式化的 JSON 內容", async () => {
      const { show } = await import("./setting");
      const content = { key: "value", nested: { foo: "bar" } };
      await writeFile(claudeSettingsPath, JSON.stringify(content));

      const result = await show();

      expect(result).toBe(JSON.stringify(content, null, 2));
    });

    test("使用 raw 選項時應回傳非格式化的 JSON", async () => {
      const { show } = await import("./setting");
      const content = { key: "value", nested: { foo: "bar" } };
      await writeFile(claudeSettingsPath, JSON.stringify(content));

      const result = await show({ raw: true });

      expect(result).toBe(JSON.stringify(content));
    });

    test("檔案不存在時應拋出錯誤", async () => {
      const { show } = await import("./setting");
      await expect(show()).rejects.toThrow("Claude settings 檔案不存在");
    });
  });
});
