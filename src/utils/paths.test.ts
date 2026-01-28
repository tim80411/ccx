import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { homedir } from "os";
import { join } from "path";
import {
  getClaudeSettingsPath,
  getCcxSettingsDir,
  getSettingPath,
  getPreviousPath,
} from "./paths";

describe("paths", () => {
  const home = homedir();

  describe("getClaudeSettingsPath", () => {
    let originalCcxClaudeSettings: string | undefined;
    let originalClaudeConfigDir: string | undefined;

    beforeEach(() => {
      originalCcxClaudeSettings = process.env.CCX_CLAUDE_SETTINGS;
      originalClaudeConfigDir = process.env.CLAUDE_CONFIG_DIR;
      delete process.env.CCX_CLAUDE_SETTINGS;
      delete process.env.CLAUDE_CONFIG_DIR;
    });

    afterEach(() => {
      if (originalCcxClaudeSettings !== undefined) {
        process.env.CCX_CLAUDE_SETTINGS = originalCcxClaudeSettings;
      } else {
        delete process.env.CCX_CLAUDE_SETTINGS;
      }
      if (originalClaudeConfigDir !== undefined) {
        process.env.CLAUDE_CONFIG_DIR = originalClaudeConfigDir;
      } else {
        delete process.env.CLAUDE_CONFIG_DIR;
      }
    });

    test("應回傳 ~/.claude/settings.json（預設）", () => {
      expect(getClaudeSettingsPath()).toBe(
        join(home, ".claude", "settings.json")
      );
    });

    test("CCX_CLAUDE_SETTINGS 應有最高優先權", () => {
      process.env.CCX_CLAUDE_SETTINGS = "/custom/path/settings.json";
      process.env.CLAUDE_CONFIG_DIR = "/other/dir";
      expect(getClaudeSettingsPath()).toBe("/custom/path/settings.json");
    });

    test("CLAUDE_CONFIG_DIR 應優先於預設路徑", () => {
      process.env.CLAUDE_CONFIG_DIR = "/custom/claude-config";
      expect(getClaudeSettingsPath()).toBe(
        join("/custom/claude-config", "settings.json")
      );
    });
  });

  describe("getCcxSettingsDir", () => {
    test("應回傳 ~/.config/ccx/settings/", () => {
      expect(getCcxSettingsDir()).toBe(join(home, ".config", "ccx", "settings"));
    });
  });

  describe("getSettingPath", () => {
    test("應回傳指定 setting 的完整路徑", () => {
      expect(getSettingPath("work")).toBe(
        join(home, ".config", "ccx", "settings", "work.json")
      );
    });

    test("應處理各種名稱", () => {
      expect(getSettingPath("personal")).toBe(
        join(home, ".config", "ccx", "settings", "personal.json")
      );
      expect(getSettingPath("my-project")).toBe(
        join(home, ".config", "ccx", "settings", "my-project.json")
      );
    });
  });

  describe("getPreviousPath", () => {
    test("應回傳 previous.json 路徑", () => {
      expect(getPreviousPath()).toBe(
        join(home, ".config", "ccx", "settings", "previous.json")
      );
    });
  });
});
