# CCX - Claude Code eXtension CLI

## 概述

CCX 是一個用於管理 Claude Code 設定檔的 CLI 工具，讓使用者可以在不同情境（工作、個人、專案）之間快速切換設定。

## 功能需求

### FR-1: Setting 管理

管理 `~/.claude/settings.json` 的多組預設設定。

#### FR-1.1: 建立 Setting

- **命令**: `ccx setting create <name>`
- **行為**: 複製當前 `~/.claude/settings.json` 到 `~/.config/ccx/settings/<name>.json`
- **輸出**: `✓ Created setting: <name>`
- **錯誤情況**:
  - 名稱已存在 → `Error: Setting '<name>' already exists`
  - 來源檔案不存在 → `Error: ~/.claude/settings.json not found`

#### FR-1.2: 列出 Settings

- **命令**: `ccx setting list`
- **行為**: 列出 `~/.config/ccx/settings/` 下所有已儲存的 settings
- **輸出格式**:
  ```
  Available settings:
    - work
    - personal
    - project-x
  ```
- **空列表**: `No settings found. Use 'ccx setting create <name>' to create one.`

#### FR-1.3: 切換 Setting

- **命令**: `ccx setting use <name>`
- **行為**:
  1. 備份當前 `~/.claude/settings.json` 到 `~/.config/ccx/settings/previous.json`
  2. 複製 `~/.config/ccx/settings/<name>.json` 到 `~/.claude/settings.json`
- **輸出**: `✓ Switched to setting: <name>`
- **錯誤情況**:
  - 名稱不存在 → `Error: Setting '<name>' not found`

#### FR-1.4: 更新 Setting

- **命令**: `ccx setting update <name>`
- **行為**: 用當前 `~/.claude/settings.json` 覆蓋 `~/.config/ccx/settings/<name>.json`
- **輸出**: `✓ Updated setting: <name>`
- **錯誤情況**:
  - 名稱不存在 → `Error: Setting '<name>' not found`
  - 來源檔案不存在 → `Error: ~/.claude/settings.json not found`

## 非功能需求

### NFR-1: 技術棧

- 執行環境: Bun
- 語言: TypeScript
- CLI 框架: Commander

### NFR-2: 檔案路徑

| 用途 | 路徑 |
|------|------|
| Claude Code 設定 | `~/.claude/settings.json` |
| CCX 設定儲存 | `~/.config/ccx/settings/` |
| 備份檔案 | `~/.config/ccx/settings/previous.json` |

### NFR-3: 錯誤處理

- 錯誤訊息輸出到 stderr
- 失敗時 exit code 為 1
- 成功時 exit code 為 0

### NFR-4: 保留名稱

以下名稱為系統保留，不可作為 setting 名稱：
- `previous` - 用於備份

## 未來擴展

此工具設計為可擴展的 namespace 架構，未來可支援：

- `ccx mcp` - 管理 MCP 設定
- `ccx claude` - 管理 CLAUDE.md
- `ccx profile` - 組合多個設定為一個 profile
