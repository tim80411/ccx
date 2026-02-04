import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, writeFile, mkdir } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

describe("target", () => {
  let tempDir: string;
  let ccxBaseDir: string;
  let ccxSettingsDir: string;
  let statePath: string;
  let originalBaseDir: string | undefined;
  let originalSettingsDir: string | undefined;

  beforeEach(async () => {
    originalBaseDir = process.env.CCX_BASE_DIR;
    originalSettingsDir = process.env.CCX_SETTINGS_DIR;

    tempDir = await mkdtemp(join(tmpdir(), "ccx-test-"));
    ccxBaseDir = join(tempDir, ".config", "ccx");
    ccxSettingsDir = join(ccxBaseDir, "settings");
    statePath = join(ccxBaseDir, "state.json");

    await mkdir(ccxSettingsDir, { recursive: true });

    process.env.CCX_BASE_DIR = ccxBaseDir;
    process.env.CCX_SETTINGS_DIR = ccxSettingsDir;
  });

  afterEach(async () => {
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

  describe("resolveSettingPath()", () => {
    test("type=official 應回傳 Claude 官方路徑", async () => {
      const { resolveSettingPath } = await import("./target");
      const result = await resolveSettingPath({ type: "official" });
      expect(result).toContain(".claude");
      expect(result).toContain("settings.json");
    });

    test("type=named 應回傳指定 setting 路徑", async () => {
      const { resolveSettingPath } = await import("./target");
      const result = await resolveSettingPath({ type: "named", name: "work" });
      expect(result).toBe(join(ccxSettingsDir, "work.json"));
    });

    test("type=current 無狀態時應拋出錯誤", async () => {
      const { resolveSettingPath } = await import("./target");
      await expect(resolveSettingPath({ type: "current" })).rejects.toThrow(
        "目前無追蹤中的 setting，請先使用 'ccx setting use <name>' 切換"
      );
    });

    test("type=current 有狀態時應回傳當前 setting 路徑", async () => {
      const state = { currentSettingName: "personal", claudeSettingsHash: "abc123" };
      await writeFile(statePath, JSON.stringify(state));

      const { resolveSettingPath } = await import("./target");
      const result = await resolveSettingPath({ type: "current" });

      expect(result).toBe(join(ccxSettingsDir, "personal.json"));
    });
  });

  describe("resolveSettingName()", () => {
    test("type=official 應回傳 null", async () => {
      const { resolveSettingName } = await import("./target");
      const result = await resolveSettingName({ type: "official" });
      expect(result).toBeNull();
    });

    test("type=named 應回傳指定名稱", async () => {
      const { resolveSettingName } = await import("./target");
      const result = await resolveSettingName({ type: "named", name: "work" });
      expect(result).toBe("work");
    });

    test("type=current 無狀態時應拋出錯誤", async () => {
      const { resolveSettingName } = await import("./target");
      await expect(resolveSettingName({ type: "current" })).rejects.toThrow(
        "目前無追蹤中的 setting，請先使用 'ccx setting use <name>' 切換"
      );
    });

    test("type=current 有狀態時應回傳當前 setting 名稱", async () => {
      const state = { currentSettingName: "personal", claudeSettingsHash: "def456" };
      await writeFile(statePath, JSON.stringify(state));

      const { resolveSettingName } = await import("./target");
      const result = await resolveSettingName({ type: "current" });

      expect(result).toBe("personal");
    });
  });
});
