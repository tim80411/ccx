import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, writeFile, mkdir } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { $ } from "bun";

describe("CLI 整合測試", () => {
  let tempDir: string;
  let claudeDir: string;
  let ccxBaseDir: string;
  let ccxSettingsDir: string;
  let claudeSettingsPath: string;

  const runCli = async (args: string, env: Record<string, string> = {}) => {
    const cliPath = join(import.meta.dir, "index.ts");
    const result = await $`bun ${cliPath} ${args.split(" ")}`
      .env({ ...process.env, ...env })
      .nothrow()
      .quiet();
    return {
      stdout: result.stdout.toString().trim(),
      stderr: result.stderr.toString().trim(),
      exitCode: result.exitCode,
    };
  };

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "ccx-cli-test-"));
    claudeDir = join(tempDir, ".claude");
    ccxBaseDir = join(tempDir, ".config", "ccx");
    ccxSettingsDir = join(ccxBaseDir, "settings");
    claudeSettingsPath = join(claudeDir, "settings.json");

    await mkdir(claudeDir, { recursive: true });
    await mkdir(ccxSettingsDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("setting create <name>", () => {
    test("應成功建立 setting", async () => {
      await writeFile(claudeSettingsPath, "{}");
      const result = await runCli("setting create work", {
        CCX_CLAUDE_SETTINGS: claudeSettingsPath,
        CCX_BASE_DIR: ccxBaseDir,
        CCX_SETTINGS_DIR: ccxSettingsDir,
      });

      expect(result.stdout).toContain("✓ create: work");
      expect(result.exitCode).toBe(0);
    });

    test("錯誤時應輸出到 stderr 並 exit 1", async () => {
      const result = await runCli("setting create work", {
        CCX_CLAUDE_SETTINGS: claudeSettingsPath,
        CCX_BASE_DIR: ccxBaseDir,
        CCX_SETTINGS_DIR: ccxSettingsDir,
      });

      expect(result.stderr).toContain("Claude settings");
      expect(result.exitCode).toBe(1);
    });
  });

  describe("setting list", () => {
    test("應列出所有 settings", async () => {
      await writeFile(join(ccxSettingsDir, "work.json"), "{}");
      await writeFile(join(ccxSettingsDir, "personal.json"), "{}");

      const result = await runCli("setting list", {
        CCX_SETTINGS_DIR: ccxSettingsDir,
      });

      expect(result.stdout).toContain("work");
      expect(result.stdout).toContain("personal");
      expect(result.exitCode).toBe(0);
    });
  });

  describe("setting use <name>", () => {
    test("應成功切換 setting", async () => {
      await writeFile(claudeSettingsPath, JSON.stringify({ current: true }));
      await writeFile(join(ccxSettingsDir, "work.json"), JSON.stringify({ work: true }));

      // 使用 --force 跳過修改檢查（因為沒有狀態檔案時不會觸發，但為了安全起見）
      const result = await runCli("setting use work --force", {
        CCX_CLAUDE_SETTINGS: claudeSettingsPath,
        CCX_BASE_DIR: ccxBaseDir,
        CCX_SETTINGS_DIR: ccxSettingsDir,
      });

      expect(result.stdout).toContain("✓ use: work");
      expect(result.exitCode).toBe(0);
    });

    test("setting 不存在時應錯誤處理", async () => {
      const result = await runCli("setting use nonexist", {
        CCX_CLAUDE_SETTINGS: claudeSettingsPath,
        CCX_BASE_DIR: ccxBaseDir,
        CCX_SETTINGS_DIR: ccxSettingsDir,
      });

      expect(result.stderr).toContain("不存在");
      expect(result.exitCode).toBe(1);
    });
  });

});
