# CCX (Claude Code Context)

[English](./README.en.md)

CLI 工具，用於管理多組 Claude Code settings。可在不同情境（工作、個人、專案）之間快速切換 `~/.claude/settings.json` 設定。

## 安裝

### Homebrew (推薦)

```bash
brew tap tim80411/tap
brew install ccx
```

更新：

```bash
brew update
brew upgrade ccx
```

### 從原始碼安裝

```bash
git clone <repository-url>
cd ccx
bun install
bun link
```

## 使用方式

### 建立 Setting

從目前的 Claude Code 設定建立新的 setting：

```bash
ccx setting create <name>
# 例如: ccx setting create work
```

### 列出所有 Settings

```bash
ccx setting list
```

### 切換 Setting

切換到指定的 setting（會自動備份目前設定到 `previous`）：

```bash
ccx setting use <name>
# 例如: ccx setting use personal
```

未指定名稱時，會進入互動選擇模式：

```bash
ccx setting use
```

### 更新 Setting

用目前的 Claude Code 設定覆蓋指定的 setting：

```bash
ccx setting update <name>
# 例如: ccx setting update work
```

### 顯示設定路徑

```bash
ccx setting path
```

### 顯示當前設定內容

```bash
ccx setting show
ccx setting show --raw  # 輸出非格式化的 JSON
```

## 環境變數

| 變數 | 說明 |
|------|------|
| `CLAUDE_CONFIG_DIR` | 自訂 Claude 設定目錄路徑（預設為 `~/.claude`） |

## 檔案路徑

| 用途 | 路徑 |
|------|------|
| Claude Code 設定 | `~/.claude/settings.json` |
| 儲存的 Settings | `~/.config/ccx/settings/<name>.json` |
| 自動備份 | `~/.config/ccx/settings/previous.json` |

## 開發

```bash
# 執行測試
bun test

# 直接執行 CLI
bun run src/index.ts setting <command> [args]

# 全域安裝（開發用）
bun link
```

## 授權

MIT
