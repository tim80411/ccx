#!/usr/bin/env bun
import { Command } from "commander";
import { create, list, use, update, path, show, status, selectSetting, diff } from "./commands/setting";
import packageJson from "../package.json";

const program = new Command();

program
  .name("ccx")
  .description("Claude Code Context - CLI 工具")
  .version(packageJson.version);

/**
 * Wrapper for async command actions with consistent error handling
 */
function handleAction<T extends unknown[]>(
  fn: (...args: T) => Promise<string>
): (...args: T) => Promise<void> {
  return async (...args: T) => {
    try {
      const result = await fn(...args);
      console.log(result);
    } catch (error) {
      console.error((error as Error).message);
      process.exit(1);
    }
  };
}

/**
 * Wrapper for use command with interactive selection support
 */
function handleUseAction(
  fn: (name: string, options?: { force?: boolean }) => Promise<string>
): (name?: string, options?: { force?: boolean }) => Promise<void> {
  return async (name?: string, options?: { force?: boolean }) => {
    try {
      const selectedName = name ?? (await selectSetting());
      const result = await fn(selectedName, options);
      console.log(result);
    } catch (error) {
      console.error((error as Error).message);
      process.exit(1);
    }
  };
}

/**
 * Wrapper for diff command with Unix-style exit codes
 * Exit 0: files identical (no output)
 * Exit 1: files differ (output diff)
 * Exit 2: error occurred
 */
function handleDiffAction(
  fn: (arg1?: string, arg2?: string, options?: { semantic?: boolean }) => Promise<{ output: string; exitCode: number }>
): (arg1?: string, arg2?: string, options?: { semantic?: boolean }) => Promise<void> {
  return async (arg1?: string, arg2?: string, options?: { semantic?: boolean }) => {
    try {
      const { output, exitCode } = await fn(arg1, arg2, options);
      if (output) {
        console.log(output);
      }
      // Only force exit for non-zero codes; let 0 exit naturally
      if (exitCode !== 0) {
        process.exit(exitCode);
      }
    } catch (error) {
      console.error((error as Error).message);
      process.exit(2);
    }
  };
}

// setting 子命令群組
const setting = program.command("setting").description("管理 Claude Code 設定檔");

setting
  .command("create <name>")
  .description("建立新的 setting")
  .action(handleAction(create));

setting
  .command("list")
  .description("列出所有 settings")
  .action(handleAction(list));

setting
  .command("use [name]")
  .description("切換到指定的 setting（未指定名稱時互動選擇）")
  .option("-f, --force", "強制切換，跳過修改檢查")
  .action(handleUseAction(use));

setting
  .command("update [name]")
  .description("更新 setting（未指定名稱時更新當前 setting，需確認）")
  .action(handleAction(update));

setting
  .command("path")
  .description("顯示當前 setting 路徑")
  .option("--official", "顯示 Claude 官方設定檔路徑")
  .action(handleAction(path));

setting
  .command("show")
  .description("顯示當前 setting 內容")
  .option("--official", "顯示 Claude 官方設定檔內容")
  .option("--raw", "輸出非格式化的 JSON")
  .action(handleAction(show));

setting
  .command("status")
  .description("顯示當前使用中的 setting")
  .action(handleAction(status));

setting
  .command("diff [arg1] [arg2]")
  .description("比較設定檔差異")
  .option("--semantic", "顯示語意化差異（按 JSON key 分組）")
  .action(handleDiffAction(diff));

// Top-level aliases for setting commands
program
  .command("create <name>")
  .description("建立新的 setting (alias for setting create)")
  .action(handleAction(create));

program
  .command("list")
  .description("列出所有 settings (alias for setting list)")
  .action(handleAction(list));

program
  .command("use [name]")
  .description("切換到指定的 setting（未指定名稱時互動選擇）(alias for setting use)")
  .option("-f, --force", "強制切換，跳過修改檢查")
  .action(handleUseAction(use));

program
  .command("update [name]")
  .description("更新 setting（未指定名稱時更新當前 setting，需確認）(alias for setting update)")
  .action(handleAction(update));

program
  .command("path")
  .description("顯示當前 setting 路徑 (alias for setting path)")
  .option("--official", "顯示 Claude 官方設定檔路徑")
  .action(handleAction(path));

program
  .command("show")
  .description("顯示當前 setting 內容 (alias for setting show)")
  .option("--official", "顯示 Claude 官方設定檔內容")
  .option("--raw", "輸出非格式化的 JSON")
  .action(handleAction(show));

program
  .command("status")
  .description("顯示當前使用中的 setting (alias for setting status)")
  .action(handleAction(status));

program
  .command("diff [arg1] [arg2]")
  .description("比較設定檔差異 (alias for setting diff)")
  .option("--semantic", "顯示語意化差異（按 JSON key 分組）")
  .action(handleDiffAction(diff));

program.parse();
