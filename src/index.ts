#!/usr/bin/env bun
import { Command } from "commander";
import { create, list, use, update, path, show, selectSetting } from "./commands/setting";

const program = new Command();

program
  .name("ccx")
  .description("Claude Code Context - CLI 工具")
  .version(process.env.npm_package_version || "0.0.0");

// setting 子命令群組
const setting = program.command("setting").description("管理 Claude Code 設定檔");

setting
  .command("create <name>")
  .description("建立新的 setting")
  .action(async (name: string) => {
    try {
      const result = await create(name);
      console.log(result);
    } catch (error) {
      console.error((error as Error).message);
      process.exit(1);
    }
  });

setting
  .command("list")
  .description("列出所有 settings")
  .action(async () => {
    try {
      const result = await list();
      console.log(result);
    } catch (error) {
      console.error((error as Error).message);
      process.exit(1);
    }
  });

setting
  .command("use [name]")
  .description("切換到指定的 setting（未指定名稱時互動選擇）")
  .option("-f, --force", "強制切換，跳過修改檢查")
  .action(async (name?: string, options?: { force?: boolean }) => {
    try {
      const selectedName = name ?? (await selectSetting());
      const result = await use(selectedName, options);
      console.log(result);
    } catch (error) {
      console.error((error as Error).message);
      process.exit(1);
    }
  });

setting
  .command("update <name>")
  .description("更新指定的 setting（從當前 claude settings 覆蓋）")
  .action(async (name: string) => {
    try {
      const result = await update(name);
      console.log(result);
    } catch (error) {
      console.error((error as Error).message);
      process.exit(1);
    }
  });

setting
  .command("path")
  .description("顯示 Claude settings 檔案路徑")
  .action(async () => {
    try {
      const result = await path();
      console.log(result);
    } catch (error) {
      console.error((error as Error).message);
      process.exit(1);
    }
  });

setting
  .command("show")
  .description("顯示當前 Claude settings 內容")
  .option("--raw", "輸出非格式化的 JSON")
  .action(async (options: { raw?: boolean }) => {
    try {
      const result = await show(options);
      console.log(result);
    } catch (error) {
      console.error((error as Error).message);
      process.exit(1);
    }
  });

program.parse();
