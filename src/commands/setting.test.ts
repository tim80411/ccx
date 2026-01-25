import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, writeFile, mkdir } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { ensureDir, copyFile, fileExists } from "../utils/fs";

describe("setting commands", () => {
  let tempDir: string;
  let claudeDir: string;
  let ccxDir: string;
  let claudeSettingsPath: string;

  // 動態建立 setting 模組函數，使用傳入的路徑
  const createSettingFunctions = (claudePath: string, ccxSettingsDir: string) => {
    const getSettingPath = (name: string) => join(ccxSettingsDir, `${name}.json`);
    const getPreviousPath = () => join(ccxSettingsDir, "previous.json");

    return {
      async create(name: string): Promise<string> {
        if (name === "previous") {
          throw new Error("'previous' 是保留名稱，無法使用");
        }

        if (!(await fileExists(claudePath))) {
          throw new Error("Claude settings 檔案不存在");
        }

        const settingPath = getSettingPath(name);
        if (await fileExists(settingPath)) {
          throw new Error(`Setting '${name}' 已存在`);
        }

        await ensureDir(ccxSettingsDir);
        await copyFile(claudePath, settingPath);

        return `✓ create: ${name}`;
      },

      async list(): Promise<string> {
        const { listJsonFiles } = await import("../utils/fs");
        const settings = await listJsonFiles(ccxSettingsDir);

        if (settings.length === 0) {
          return "尚無任何 setting，使用 'ccx setting create <name>' 建立";
        }

        return settings.map((s) => `  - ${s}`).join("\n");
      },

      async use(name: string): Promise<string> {
        const settingPath = getSettingPath(name);

        if (!(await fileExists(settingPath))) {
          throw new Error(`Setting '${name}' 不存在`);
        }

        // 備份當前設定到 previous.json
        if (await fileExists(claudePath)) {
          await ensureDir(ccxSettingsDir);
          await copyFile(claudePath, getPreviousPath());
        }

        // 複製指定 setting 到 claude settings
        await copyFile(settingPath, claudePath);

        return `✓ use: ${name}`;
      },

      async update(name: string): Promise<string> {
        const settingPath = getSettingPath(name);

        if (!(await fileExists(settingPath))) {
          throw new Error(`Setting '${name}' 不存在`);
        }

        if (!(await fileExists(claudePath))) {
          throw new Error("Claude settings 檔案不存在");
        }

        await copyFile(claudePath, settingPath);

        return `✓ update: ${name}`;
      },
    };
  };

  let settingFunctions: ReturnType<typeof createSettingFunctions>;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "ccx-test-"));
    claudeDir = join(tempDir, ".claude");
    ccxDir = join(tempDir, ".config", "ccx", "settings");
    claudeSettingsPath = join(claudeDir, "settings.json");

    await mkdir(claudeDir, { recursive: true });
    await mkdir(ccxDir, { recursive: true });

    settingFunctions = createSettingFunctions(claudeSettingsPath, ccxDir);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("create(name)", () => {
    test("名稱為 'previous' 時應拋出錯誤", async () => {
      await writeFile(claudeSettingsPath, "{}");
      await expect(settingFunctions.create("previous")).rejects.toThrow(
        "'previous' 是保留名稱，無法使用"
      );
    });

    test("setting 已存在時應拋出錯誤", async () => {
      await writeFile(claudeSettingsPath, "{}");
      await writeFile(join(ccxDir, "work.json"), "{}");
      await expect(settingFunctions.create("work")).rejects.toThrow(
        "Setting 'work' 已存在"
      );
    });

    test("來源檔案不存在時應拋出錯誤", async () => {
      await expect(settingFunctions.create("work")).rejects.toThrow(
        "Claude settings 檔案不存在"
      );
    });

    test("正常情況應複製檔案並回傳成功訊息", async () => {
      const content = JSON.stringify({ test: "data" });
      await writeFile(claudeSettingsPath, content);

      const result = await settingFunctions.create("work");

      expect(result).toBe("✓ create: work");
      const savedContent = await Bun.file(join(ccxDir, "work.json")).text();
      expect(savedContent).toBe(content);
    });
  });

  describe("list()", () => {
    test("有資料時應格式化輸出", async () => {
      await writeFile(join(ccxDir, "work.json"), "{}");
      await writeFile(join(ccxDir, "personal.json"), "{}");

      const result = await settingFunctions.list();

      expect(result).toContain("work");
      expect(result).toContain("personal");
    });

    test("空列表時應顯示提示訊息", async () => {
      const result = await settingFunctions.list();
      expect(result).toBe("尚無任何 setting，使用 'ccx setting create <name>' 建立");
    });
  });

  describe("use(name)", () => {
    test("setting 不存在時應拋出錯誤", async () => {
      await expect(settingFunctions.use("nonexist")).rejects.toThrow(
        "Setting 'nonexist' 不存在"
      );
    });

    test("正常情況應備份到 previous.json", async () => {
      const currentContent = JSON.stringify({ current: true });
      const workContent = JSON.stringify({ work: true });

      await writeFile(claudeSettingsPath, currentContent);
      await writeFile(join(ccxDir, "work.json"), workContent);

      await settingFunctions.use("work");

      const previousContent = await Bun.file(join(ccxDir, "previous.json")).text();
      expect(previousContent).toBe(currentContent);
    });

    test("正常情況應複製指定 setting 到 claude settings", async () => {
      const currentContent = JSON.stringify({ current: true });
      const workContent = JSON.stringify({ work: true });

      await writeFile(claudeSettingsPath, currentContent);
      await writeFile(join(ccxDir, "work.json"), workContent);

      const result = await settingFunctions.use("work");

      expect(result).toBe("✓ use: work");
      const newContent = await Bun.file(claudeSettingsPath).text();
      expect(newContent).toBe(workContent);
    });
  });

  describe("update(name)", () => {
    test("setting 不存在時應拋出錯誤", async () => {
      await writeFile(claudeSettingsPath, "{}");
      await expect(settingFunctions.update("nonexist")).rejects.toThrow(
        "Setting 'nonexist' 不存在"
      );
    });

    test("來源檔案不存在時應拋出錯誤", async () => {
      await writeFile(join(ccxDir, "work.json"), "{}");
      await expect(settingFunctions.update("work")).rejects.toThrow(
        "Claude settings 檔案不存在"
      );
    });

    test("正常情況應覆蓋指定 setting", async () => {
      const newContent = JSON.stringify({ updated: true });
      await writeFile(claudeSettingsPath, newContent);
      await writeFile(join(ccxDir, "work.json"), "{}");

      const result = await settingFunctions.update("work");

      expect(result).toBe("✓ update: work");
      const savedContent = await Bun.file(join(ccxDir, "work.json")).text();
      expect(savedContent).toBe(newContent);
    });
  });
});
