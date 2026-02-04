#!/usr/bin/env bun
import { Command } from "commander";
import { create, list, use, update, path, show, selectSetting } from "./commands/setting";

const program = new Command();

program
  .name("ccx")
  .description("Claude Code Context - CLI 工具")
  .version(process.env.npm_package_version || "0.0.0");

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
  .command("update <name>")
  .description("更新指定的 setting（從當前 claude settings 覆蓋）")
  .action(handleAction(update));

setting
  .command("path")
  .description("顯示 Claude settings 檔案路徑")
  .action(handleAction(path));

setting
  .command("show")
  .description("顯示當前 Claude settings 內容")
  .option("--raw", "輸出非格式化的 JSON")
  .action(handleAction(show));

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
  .command("update <name>")
  .description("更新指定的 setting（從當前 claude settings 覆蓋）(alias for setting update)")
  .action(handleAction(update));

program
  .command("path")
  .description("顯示 Claude settings 檔案路徑 (alias for setting path)")
  .action(handleAction(path));

program
  .command("show")
  .description("顯示當前 Claude settings 內容 (alias for setting show)")
  .option("--raw", "輸出非格式化的 JSON")
  .action(handleAction(show));

program.parse();
