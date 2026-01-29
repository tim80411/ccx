import { describe, expect, test, beforeEach, afterEach, mock } from "bun:test";
import { mkdtemp, rm, writeFile, mkdir } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

describe("setting commands", () => {
  let tempDir: string;
  let claudeDir: string;
  let ccxBaseDir: string;
  let ccxSettingsDir: string;
  let claudeSettingsPath: string;
  let originalClaudeSettings: string | undefined;
  let originalBaseDir: string | undefined;
  let originalSettingsDir: string | undefined;

  beforeEach(async () => {
    // 保存原始環境變數
    originalClaudeSettings = process.env.CCX_CLAUDE_SETTINGS;
    originalBaseDir = process.env.CCX_BASE_DIR;
    originalSettingsDir = process.env.CCX_SETTINGS_DIR;

    // 建立臨時目錄
    tempDir = await mkdtemp(join(tmpdir(), "ccx-test-"));
    claudeDir = join(tempDir, ".claude");
    ccxBaseDir = join(tempDir, ".config", "ccx");
    ccxSettingsDir = join(ccxBaseDir, "settings");
    claudeSettingsPath = join(claudeDir, "settings.json");

    await mkdir(claudeDir, { recursive: true });
    await mkdir(ccxSettingsDir, { recursive: true });

    // 設定環境變數指向測試目錄
    process.env.CCX_CLAUDE_SETTINGS = claudeSettingsPath;
    process.env.CCX_BASE_DIR = ccxBaseDir;
    process.env.CCX_SETTINGS_DIR = ccxSettingsDir;
  });

  afterEach(async () => {
    // 還原環境變數
    if (originalClaudeSettings !== undefined) {
      process.env.CCX_CLAUDE_SETTINGS = originalClaudeSettings;
    } else {
      delete process.env.CCX_CLAUDE_SETTINGS;
    }
    if (originalBaseDir !== undefined) {
      process.env.CCX_BASE_DIR = originalBaseDir;
    } else {
      delete process.env.CCX_BASE_DIR;
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
      await writeFile(join(ccxSettingsDir, "work.json"), "{}");
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
      const savedContent = await Bun.file(join(ccxSettingsDir, "work.json")).text();
      expect(savedContent).toBe(content);
    });
  });

  describe("list()", () => {
    test("有資料時應格式化輸出", async () => {
      const { list } = await import("./setting");
      await writeFile(join(ccxSettingsDir, "work.json"), "{}");
      await writeFile(join(ccxSettingsDir, "personal.json"), "{}");

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
      await writeFile(join(ccxSettingsDir, "work.json"), workContent);

      await use("work");

      const previousContent = await Bun.file(join(ccxSettingsDir, "previous.json")).text();
      expect(previousContent).toBe(currentContent);
    });

    test("正常情況應複製指定 setting 到 claude settings", async () => {
      const { use } = await import("./setting");
      const currentContent = JSON.stringify({ current: true });
      const workContent = JSON.stringify({ work: true });

      await writeFile(claudeSettingsPath, currentContent);
      await writeFile(join(ccxSettingsDir, "work.json"), workContent);

      const result = await use("work");

      expect(result).toBe("✓ use: work");
      const newContent = await Bun.file(claudeSettingsPath).text();
      expect(newContent).toBe(workContent);
    });

    test("切換後應儲存狀態", async () => {
      const { use } = await import("./setting");
      const { loadState } = await import("../utils/state");
      const currentContent = JSON.stringify({ current: true });
      const workContent = JSON.stringify({ work: true });

      await writeFile(claudeSettingsPath, currentContent);
      await writeFile(join(ccxSettingsDir, "work.json"), workContent);

      await use("work");

      const state = await loadState();
      expect(state).not.toBeNull();
      expect(state?.currentSettingName).toBe("work");
      expect(state?.claudeSettingsHash).toBeDefined();
    });

    test("設定未修改時不應提示確認", async () => {
      const { use } = await import("./setting");
      const { saveState, computeFileHash } = await import("../utils/state");
      const currentContent = JSON.stringify({ current: true });
      const workContent = JSON.stringify({ work: true });

      await writeFile(claudeSettingsPath, currentContent);
      await writeFile(join(ccxSettingsDir, "work.json"), workContent);

      // 設定狀態為當前內容的 hash（模擬上次切換後的狀態）
      const hash = await computeFileHash(claudeSettingsPath);
      await saveState({ activeProfile: "current", settingsHash: hash });

      // 不應該需要確認，應直接切換成功
      const result = await use("work");
      expect(result).toBe("✓ use: work");
    });

    test("使用 --force 時應跳過修改檢查", async () => {
      const { use } = await import("./setting");
      const { saveState } = await import("../utils/state");
      const currentContent = JSON.stringify({ current: true });
      const workContent = JSON.stringify({ work: true });

      await writeFile(claudeSettingsPath, currentContent);
      await writeFile(join(ccxSettingsDir, "work.json"), workContent);

      // 設定一個不匹配的 hash（模擬檔案被修改）
      await saveState({ activeProfile: "current", settingsHash: "old-hash" });

      // 使用 --force 應該跳過確認
      const result = await use("work", { force: true });
      expect(result).toBe("✓ use: work");
    });

    test("名稱為 'previous' 時應拋出錯誤", async () => {
      const { use } = await import("./setting");
      await writeFile(join(ccxSettingsDir, "previous.json"), "{}");
      await expect(use("previous")).rejects.toThrow("'previous' 是保留名稱，無法使用");
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
      await writeFile(join(ccxSettingsDir, "work.json"), "{}");
      await expect(update("work")).rejects.toThrow("Claude settings 檔案不存在");
    });

    test("正常情況應覆蓋指定 setting", async () => {
      const { update } = await import("./setting");
      const newContent = JSON.stringify({ updated: true });
      await writeFile(claudeSettingsPath, newContent);
      await writeFile(join(ccxSettingsDir, "work.json"), "{}");

      const result = await update("work");

      expect(result).toBe("✓ update: work");
      const savedContent = await Bun.file(join(ccxSettingsDir, "work.json")).text();
      expect(savedContent).toBe(newContent);
    });

    test("更新當前使用中的 profile 時應同步更新狀態", async () => {
      const { update } = await import("./setting");
      const { saveState, loadState, computeFileHash } = await import("../utils/state");

      const originalContent = JSON.stringify({ original: true });
      await writeFile(claudeSettingsPath, originalContent);
      await writeFile(join(ccxSettingsDir, "work.json"), "{}");

      // 設定當前使用的是 work profile
      const originalHash = await computeFileHash(claudeSettingsPath);
      await saveState({ activeProfile: "work", settingsHash: "old-hash" });

      // 修改 settings.json 並執行 update
      const modifiedContent = JSON.stringify({ modified: true });
      await writeFile(claudeSettingsPath, modifiedContent);
      await update("work");

      // 狀態應該已更新為新的 hash
      const state = await loadState();
      expect(state?.currentSettingName).toBe("work");
      expect(state?.claudeSettingsHash).not.toBe("old-hash");
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

  describe("selectProfile()", () => {
    test("無 profile 時應拋出錯誤", async () => {
      const { selectProfile } = await import("./setting");
      await expect(selectProfile()).rejects.toThrow(
        "尚無任何 setting，使用 'ccx setting create <name>' 建立"
      );
    });

    test("有 profile 時應呼叫 select 並回傳選擇的名稱", async () => {
      // Mock @inquirer/select to return "work"
      mock.module("@inquirer/select", () => ({
        default: async () => "work",
      }));

      await writeFile(join(ccxSettingsDir, "work.json"), "{}");
      await writeFile(join(ccxSettingsDir, "personal.json"), "{}");

      const { selectProfile } = await import("./setting");
      const result = await selectProfile();

      expect(result).toBe("work");
    });
  });
});
