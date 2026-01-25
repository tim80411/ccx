import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, writeFile, mkdir } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { $ } from "bun";

describe("CLI 整合測試", () => {
  let tempDir: string;
  let claudeDir: string;
  let ccxDir: string;
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
    ccxDir = join(tempDir, ".config", "ccx", "settings");
    claudeSettingsPath = join(claudeDir, "settings.json");

    await mkdir(claudeDir, { recursive: true });
    await mkdir(ccxDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("setting create <name>", () => {
    test("應成功建立 setting", async () => {
      await writeFile(claudeSettingsPath, "{}");
      const result = await runCli("setting create work", {
        CCX_CLAUDE_SETTINGS: claudeSettingsPath,
        CCX_SETTINGS_DIR: ccxDir,
      });

      expect(result.stdout).toContain("✓ create: work");
      expect(result.exitCode).toBe(0);
    });

    test("錯誤時應輸出到 stderr 並 exit 1", async () => {
      const result = await runCli("setting create work", {
        CCX_CLAUDE_SETTINGS: claudeSettingsPath,
        CCX_SETTINGS_DIR: ccxDir,
      });

      expect(result.stderr).toContain("Claude settings");
      expect(result.exitCode).toBe(1);
    });
  });

  describe("setting list", () => {
    test("應列出所有 settings", async () => {
      await writeFile(join(ccxDir, "work.json"), "{}");
      await writeFile(join(ccxDir, "personal.json"), "{}");

      const result = await runCli("setting list", {
        CCX_SETTINGS_DIR: ccxDir,
      });

      expect(result.stdout).toContain("work");
      expect(result.stdout).toContain("personal");
      expect(result.exitCode).toBe(0);
    });
  });

  describe("setting use <name>", () => {
    test("應成功切換 setting", async () => {
      await writeFile(claudeSettingsPath, JSON.stringify({ current: true }));
      await writeFile(join(ccxDir, "work.json"), JSON.stringify({ work: true }));

      const result = await runCli("setting use work", {
        CCX_CLAUDE_SETTINGS: claudeSettingsPath,
        CCX_SETTINGS_DIR: ccxDir,
      });

      expect(result.stdout).toContain("✓ use: work");
      expect(result.exitCode).toBe(0);
    });

    test("setting 不存在時應錯誤處理", async () => {
      const result = await runCli("setting use nonexist", {
        CCX_CLAUDE_SETTINGS: claudeSettingsPath,
        CCX_SETTINGS_DIR: ccxDir,
      });

      expect(result.stderr).toContain("不存在");
      expect(result.exitCode).toBe(1);
    });
  });

  describe("setting update <name>", () => {
    test("應成功更新 setting", async () => {
      await writeFile(claudeSettingsPath, JSON.stringify({ updated: true }));
      await writeFile(join(ccxDir, "work.json"), "{}");

      const result = await runCli("setting update work", {
        CCX_CLAUDE_SETTINGS: claudeSettingsPath,
        CCX_SETTINGS_DIR: ccxDir,
      });

      expect(result.stdout).toContain("✓ update: work");
      expect(result.exitCode).toBe(0);
    });
  });
});
