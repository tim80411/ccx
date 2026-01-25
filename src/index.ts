#!/usr/bin/env bun
import { Command } from "commander";
import { create, list, use, update } from "./commands/setting";

const program = new Command();

program
  .name("ccx")
  .description("Claude Code eXtension - CLI 工具")
  .version("0.1.0");

// setting 子命令群組
const setting = program.command("setting").description("管理 Claude Code 設定檔");

setting
  .command("create <name>")
  .description("建立新的 setting profile")
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
  .description("列出所有 setting profiles")
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
  .command("use <name>")
  .description("切換到指定的 setting profile")
  .action(async (name: string) => {
    try {
      const result = await use(name);
      console.log(result);
    } catch (error) {
      console.error((error as Error).message);
      process.exit(1);
    }
  });

setting
  .command("update <name>")
  .description("更新指定的 setting profile（從當前 claude settings 覆蓋）")
  .action(async (name: string) => {
    try {
      const result = await update(name);
      console.log(result);
    } catch (error) {
      console.error((error as Error).message);
      process.exit(1);
    }
  });

program.parse();
