import { describe, expect, test } from "bun:test";
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
    test("應回傳 ~/.claude/settings.json", () => {
      expect(getClaudeSettingsPath()).toBe(
        join(home, ".claude", "settings.json")
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
