import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, writeFile, mkdir } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

describe("state utilities", () => {
  let tempDir: string;
  let ccxBaseDir: string;
  let ccxSettingsDir: string;
  let claudeSettingsPath: string;
  let originalClaudeSettings: string | undefined;
  let originalBaseDir: string | undefined;
  let originalSettingsDir: string | undefined;

  beforeEach(async () => {
    originalClaudeSettings = process.env.CCX_CLAUDE_SETTINGS;
    originalBaseDir = process.env.CCX_BASE_DIR;
    originalSettingsDir = process.env.CCX_SETTINGS_DIR;

    tempDir = await mkdtemp(join(tmpdir(), "ccx-state-test-"));
    const claudeDir = join(tempDir, ".claude");
    ccxBaseDir = join(tempDir, ".config", "ccx");
    ccxSettingsDir = join(ccxBaseDir, "settings");
    claudeSettingsPath = join(claudeDir, "settings.json");

    await mkdir(claudeDir, { recursive: true });
    await mkdir(ccxSettingsDir, { recursive: true });

    process.env.CCX_CLAUDE_SETTINGS = claudeSettingsPath;
    process.env.CCX_BASE_DIR = ccxBaseDir;
    process.env.CCX_SETTINGS_DIR = ccxSettingsDir;
  });

  afterEach(async () => {
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

  describe("computeFileHash()", () => {
    test("相同內容應產生相同的 hash", async () => {
      const { computeFileHash } = await import("./state");
      const content = JSON.stringify({ test: "data" });
      await writeFile(claudeSettingsPath, content);

      const hash1 = await computeFileHash(claudeSettingsPath);
      const hash2 = await computeFileHash(claudeSettingsPath);

      expect(hash1).toBe(hash2);
    });

    test("不同內容應產生不同的 hash", async () => {
      const { computeFileHash } = await import("./state");
      await writeFile(claudeSettingsPath, JSON.stringify({ test: "data1" }));
      const hash1 = await computeFileHash(claudeSettingsPath);

      await writeFile(claudeSettingsPath, JSON.stringify({ test: "data2" }));
      const hash2 = await computeFileHash(claudeSettingsPath);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe("loadState() and saveState()", () => {
    test("儲存後應能正確載入", async () => {
      const { loadState, saveState } = await import("./state");
      const state = { currentSettingName: "work", claudeSettingsHash: "abc123" };

      await saveState(state);
      const loaded = await loadState();

      expect(loaded).toEqual(state);
    });

    test("無狀態檔案時應回傳 null", async () => {
      const { loadState } = await import("./state");
      const result = await loadState();
      expect(result).toBeNull();
    });

    test("狀態檔案格式錯誤時應回傳 null", async () => {
      const { loadState, getStatePath } = await import("./state");
      await writeFile(getStatePath(), "invalid json");

      const result = await loadState();
      expect(result).toBeNull();
    });

    test("狀態檔案缺少必要欄位時應回傳 null", async () => {
      const { loadState, getStatePath } = await import("./state");
      await writeFile(getStatePath(), JSON.stringify({ currentSettingName: "work" }));

      const result = await loadState();
      expect(result).toBeNull();
    });
  });

  describe("hasSettingsChanged()", () => {
    test("settings.json 不存在時應回傳 false", async () => {
      const { hasSettingsChanged } = await import("./state");
      const result = await hasSettingsChanged();
      expect(result).toBe(false);
    });

    test("無狀態記錄時應回傳 false", async () => {
      const { hasSettingsChanged } = await import("./state");
      await writeFile(claudeSettingsPath, JSON.stringify({ test: "data" }));

      const result = await hasSettingsChanged();
      expect(result).toBe(false);
    });

    test("內容未修改時應回傳 false", async () => {
      const { hasSettingsChanged, saveState, computeFileHash } = await import("./state");
      const content = JSON.stringify({ test: "data" });
      await writeFile(claudeSettingsPath, content);
      const hash = await computeFileHash(claudeSettingsPath);
      await saveState({ currentSettingName: "work", claudeSettingsHash: hash });

      const result = await hasSettingsChanged();
      expect(result).toBe(false);
    });

    test("內容已修改時應回傳 true", async () => {
      const { hasSettingsChanged, saveState, computeFileHash } = await import("./state");
      const content = JSON.stringify({ test: "data" });
      await writeFile(claudeSettingsPath, content);
      const hash = await computeFileHash(claudeSettingsPath);
      await saveState({ currentSettingName: "work", claudeSettingsHash: hash });

      // 修改檔案
      await writeFile(claudeSettingsPath, JSON.stringify({ test: "modified" }));

      const result = await hasSettingsChanged();
      expect(result).toBe(true);
    });
  });
});
