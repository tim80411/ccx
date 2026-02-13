import { describe, expect, test, beforeEach, afterEach, mock } from "bun:test";
import { mkdtemp, rm, writeFile, mkdir, lstat, readlink, symlink } from "fs/promises";
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

    test("來源是損壞的符號連結時應拋出明確錯誤", async () => {
      const { create } = await import("./setting");
      const deletedTarget = join(ccxSettingsDir, "deleted.json");
      await writeFile(deletedTarget, "{}");
      await symlink(deletedTarget, claudeSettingsPath);
      await rm(deletedTarget);

      await expect(create("work")).rejects.toThrow("符號連結已損壞");
    });

    test("來源是符號連結時應複製實際內容", async () => {
      const { create } = await import("./setting");
      const personalContent = JSON.stringify({ personal: true });

      // 建立一個已存在的 setting 並建立符號連結
      await writeFile(join(ccxSettingsDir, "personal.json"), personalContent);
      await symlink(join(ccxSettingsDir, "personal.json"), claudeSettingsPath);

      const result = await create("work");

      expect(result).toBe("✓ create: work");
      const workContent = await Bun.file(join(ccxSettingsDir, "work.json")).text();
      expect(workContent).toBe(personalContent);
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

    test("正常情況應建立符號連結指向目標 setting", async () => {
      const { use } = await import("./setting");
      const currentContent = JSON.stringify({ current: true });
      const workContent = JSON.stringify({ work: true });

      await writeFile(claudeSettingsPath, currentContent);
      await writeFile(join(ccxSettingsDir, "work.json"), workContent);

      const result = await use("work");

      expect(result).toBe("✓ use: work");
      // 驗證是符號連結
      const stats = await lstat(claudeSettingsPath);
      expect(stats.isSymbolicLink()).toBe(true);
      // 驗證連結指向正確目標
      const target = await readlink(claudeSettingsPath);
      expect(target).toBe(join(ccxSettingsDir, "work.json"));
      // 透過連結讀取應得到目標內容
      const newContent = await Bun.file(claudeSettingsPath).text();
      expect(newContent).toBe(workContent);
    });

    test("應建立 .bak 備份檔", async () => {
      const { use } = await import("./setting");
      const workContent = JSON.stringify({ work: true });

      await writeFile(claudeSettingsPath, "{}");
      await writeFile(join(ccxSettingsDir, "work.json"), workContent);

      await use("work");

      const bakContent = await Bun.file(join(ccxSettingsDir, "work.json.bak")).text();
      expect(bakContent).toBe(workContent);
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

    test("已經是當前 setting 時應回傳已在使用中訊息", async () => {
      const { use } = await import("./setting");
      const { saveState, computeFileHash } = await import("../utils/state");
      const workContent = JSON.stringify({ work: true });

      await writeFile(join(ccxSettingsDir, "work.json"), workContent);
      // 建立符號連結
      await symlink(join(ccxSettingsDir, "work.json"), claudeSettingsPath);
      const hash = await computeFileHash(claudeSettingsPath);
      await saveState({ currentSettingName: "work", claudeSettingsHash: hash });

      const result = await use("work");
      expect(result).toContain("已在使用中");
    });

    test("使用 --force 時應跳過修改檢查", async () => {
      const { use } = await import("./setting");
      const { saveState } = await import("../utils/state");
      const currentContent = JSON.stringify({ current: true });
      const workContent = JSON.stringify({ work: true });

      await writeFile(claudeSettingsPath, currentContent);
      await writeFile(join(ccxSettingsDir, "work.json"), workContent);

      // 設定一個不匹配的 hash（模擬檔案被修改）
      await saveState({ currentSettingName: "current", claudeSettingsHash: "old-hash" });

      // 使用 --force 應該跳過確認
      const result = await use("work", { force: true });
      expect(result).toBe("✓ use: work");
    });

    test("名稱為 'previous' 時應拋出錯誤", async () => {
      const { use } = await import("./setting");
      await writeFile(join(ccxSettingsDir, "previous.json"), "{}");
      await expect(use("previous")).rejects.toThrow("'previous' 是保留名稱，無法使用");
    });

    test("從一般檔案切換時應先移除一般檔案再建立連結（遷移）", async () => {
      const { use } = await import("./setting");
      const workContent = JSON.stringify({ work: true });

      // 一般檔案（舊版 CCX）
      await writeFile(claudeSettingsPath, JSON.stringify({ old: true }));
      await writeFile(join(ccxSettingsDir, "work.json"), workContent);

      await use("work");

      // 驗證是符號連結
      const stats = await lstat(claudeSettingsPath);
      expect(stats.isSymbolicLink()).toBe(true);
    });

    test("損壞的符號連結也應能正常切換", async () => {
      const { use } = await import("./setting");
      const workContent = JSON.stringify({ work: true });

      // 建立損壞的連結
      const deletedTarget = join(ccxSettingsDir, "deleted.json");
      await writeFile(deletedTarget, "{}");
      await symlink(deletedTarget, claudeSettingsPath);
      await rm(deletedTarget); // 損壞連結

      await writeFile(join(ccxSettingsDir, "work.json"), workContent);

      const result = await use("work", { force: true });
      expect(result).toBe("✓ use: work");

      // 驗證新連結正確
      const stats = await lstat(claudeSettingsPath);
      expect(stats.isSymbolicLink()).toBe(true);
      const target = await readlink(claudeSettingsPath);
      expect(target).toBe(join(ccxSettingsDir, "work.json"));
    });

    test("從一個 setting 切換到另一個 setting", async () => {
      const { use } = await import("./setting");
      const workContent = JSON.stringify({ work: true });
      const personalContent = JSON.stringify({ personal: true });

      await writeFile(join(ccxSettingsDir, "work.json"), workContent);
      await writeFile(join(ccxSettingsDir, "personal.json"), personalContent);
      await writeFile(claudeSettingsPath, "{}");

      // 先切換到 work
      await use("work");
      expect((await lstat(claudeSettingsPath)).isSymbolicLink()).toBe(true);

      // 再切換到 personal
      const result = await use("personal");
      expect(result).toBe("✓ use: personal");

      // 驗證連結已更新
      const target = await readlink(claudeSettingsPath);
      expect(target).toBe(join(ccxSettingsDir, "personal.json"));

      // 驗證 previous.json 備份了 work 的內容
      const previousContent = await Bun.file(join(ccxSettingsDir, "previous.json")).text();
      expect(previousContent).toBe(workContent);
    });
  });

  describe("path()", () => {
    test("無狀態時應拋出錯誤", async () => {
      const { path } = await import("./setting");
      await expect(path()).rejects.toThrow(
        "目前無追蹤中的 setting，請先使用 'ccx setting use <name>' 切換"
      );
    });

    test("有狀態時應回傳當前 setting 路徑", async () => {
      const { saveState } = await import("../utils/state");
      await saveState({ currentSettingName: "work", claudeSettingsHash: "abc123" });

      const { path } = await import("./setting");
      const result = await path();

      expect(result).toBe(join(ccxSettingsDir, "work.json"));
    });

    test("使用 --official 時應回傳 Claude settings 檔案路徑", async () => {
      const { path } = await import("./setting");
      const result = await path({ official: true });
      expect(result).toBe(claudeSettingsPath);
    });
  });

  describe("show()", () => {
    test("指定名稱時應回傳該 setting 的格式化 JSON 內容", async () => {
      const { show } = await import("./setting");
      const content = { key: "value", nested: { foo: "bar" } };

      await writeFile(join(ccxSettingsDir, "work.json"), JSON.stringify(content));

      const result = await show("work");

      expect(result).toBe(JSON.stringify(content, null, 2));
    });

    test("指定名稱但 setting 不存在時應拋出錯誤", async () => {
      const { show } = await import("./setting");
      await expect(show("nonexist")).rejects.toThrow("Setting 'nonexist' 不存在");
    });

    test("指定名稱時可搭配 raw 選項", async () => {
      const { show } = await import("./setting");
      const content = { key: "value" };

      await writeFile(join(ccxSettingsDir, "work.json"), JSON.stringify(content));

      const result = await show("work", { raw: true });

      expect(result).toBe(JSON.stringify(content));
    });

    test("無名稱且無狀態時應拋出錯誤", async () => {
      const { show } = await import("./setting");
      await expect(show()).rejects.toThrow(
        "目前無追蹤中的 setting，請先使用 'ccx setting use <name>' 切換"
      );
    });

    test("有狀態時應回傳當前 setting 的格式化 JSON 內容", async () => {
      const { saveState } = await import("../utils/state");
      const content = { key: "value", nested: { foo: "bar" } };

      await writeFile(join(ccxSettingsDir, "work.json"), JSON.stringify(content));
      await saveState({ currentSettingName: "work", claudeSettingsHash: "abc123" });

      const { show } = await import("./setting");
      const result = await show();

      expect(result).toBe(JSON.stringify(content, null, 2));
    });

    test("使用 raw 選項時應回傳非格式化的 JSON", async () => {
      const { saveState } = await import("../utils/state");
      const content = { key: "value", nested: { foo: "bar" } };

      await writeFile(join(ccxSettingsDir, "work.json"), JSON.stringify(content));
      await saveState({ currentSettingName: "work", claudeSettingsHash: "abc123" });

      const { show } = await import("./setting");
      const result = await show(undefined, { raw: true });

      expect(result).toBe(JSON.stringify(content));
    });

    test("使用 --official 時應回傳 Claude settings 的格式化 JSON 內容", async () => {
      const { show } = await import("./setting");
      const content = { official: true, data: "test" };
      await writeFile(claudeSettingsPath, JSON.stringify(content));

      const result = await show(undefined, { official: true });

      expect(result).toBe(JSON.stringify(content, null, 2));
    });

    test("使用 --official 且檔案不存在時應拋出錯誤", async () => {
      const { show } = await import("./setting");
      await expect(show(undefined, { official: true })).rejects.toThrow("Claude settings 檔案不存在");
    });

    test("當前 setting 檔案不存在時應拋出錯誤", async () => {
      const { saveState } = await import("../utils/state");
      await saveState({ currentSettingName: "nonexist", claudeSettingsHash: "abc123" });

      const { show } = await import("./setting");
      await expect(show()).rejects.toThrow("Setting 檔案不存在");
    });
  });

  describe("status()", () => {
    test("無狀態時應拋出錯誤", async () => {
      const { status } = await import("./setting");
      await expect(status()).rejects.toThrow(
        "目前無追蹤中的 setting，請先使用 'ccx setting use <name>' 切換"
      );
    });

    test("有狀態時應回傳當前 setting 名稱", async () => {
      const { saveState } = await import("../utils/state");
      await saveState({ currentSettingName: "personal", claudeSettingsHash: "def456" });

      const { status } = await import("./setting");
      const result = await status();

      expect(result).toBe("✓ current: personal");
    });
  });

  describe("selectSetting()", () => {
    test("無 setting 時應拋出錯誤", async () => {
      const { selectSetting } = await import("./setting");
      await expect(selectSetting()).rejects.toThrow(
        "尚無任何 setting，使用 'ccx setting create <name>' 建立"
      );
    });

    test("有 setting 時應呼叫 select 並回傳選擇的名稱", async () => {
      // Mock @inquirer/select to return "work"
      mock.module("@inquirer/select", () => ({
        default: async () => "work",
      }));

      await writeFile(join(ccxSettingsDir, "work.json"), "{}");
      await writeFile(join(ccxSettingsDir, "personal.json"), "{}");

      const { selectSetting } = await import("./setting");
      const result = await selectSetting();

      expect(result).toBe("work");
    });
  });

  describe("diff()", () => {
    test("兩個參數時比對兩個 named settings", async () => {
      const { diff } = await import("./setting");

      const workContent = JSON.stringify({ key: "work" });
      const personalContent = JSON.stringify({ key: "personal" });

      await writeFile(join(ccxSettingsDir, "work.json"), workContent);
      await writeFile(join(ccxSettingsDir, "personal.json"), personalContent);

      const result = await diff("work", "personal");

      expect(result.exitCode).toBe(1);
      expect(result.output).toContain("work");
      expect(result.output).toContain("personal");
    });

    test("檔案相同時回傳 exitCode 0 且無輸出", async () => {
      const { diff } = await import("./setting");

      const content = JSON.stringify({ key: "same" });

      await writeFile(join(ccxSettingsDir, "work.json"), content);
      await writeFile(join(ccxSettingsDir, "personal.json"), content);

      const result = await diff("work", "personal");

      expect(result.exitCode).toBe(0);
      expect(result.output).toBe("");
    });

    test("使用 --semantic 時應顯示語意化差異", async () => {
      const { diff } = await import("./setting");

      const workContent = JSON.stringify({ added: "new", same: "value" });
      const personalContent = JSON.stringify({ same: "value" });

      await writeFile(join(ccxSettingsDir, "work.json"), workContent);
      await writeFile(join(ccxSettingsDir, "personal.json"), personalContent);

      const result = await diff("work", "personal", { semantic: true });

      expect(result.exitCode).toBe(1);
      expect(result.output).toContain("Removed");
      expect(result.output).toContain("added");
    });

    test("第一個 setting 不存在時應拋出錯誤", async () => {
      const { diff } = await import("./setting");
      await writeFile(join(ccxSettingsDir, "personal.json"), "{}");
      await expect(diff("nonexist", "personal")).rejects.toThrow("Setting 'nonexist' 不存在");
    });

    test("第二個 setting 不存在時應拋出錯誤", async () => {
      const { diff } = await import("./setting");
      await writeFile(join(ccxSettingsDir, "work.json"), "{}");
      await expect(diff("work", "nonexist")).rejects.toThrow("Setting 'nonexist' 不存在");
    });
  });
});
