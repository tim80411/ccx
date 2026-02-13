# CCX (Claude Code Context)

[English](./README.en.md)

CLI 工具，用於管理多組 Claude Code settings。可在不同情境（工作、個人、專案）之間快速切換 `~/.claude/settings.json` 設定。

透過符號連結（symlink）機制，`~/.claude/settings.json` 會直接指向儲存的 setting 檔案，編輯任一路徑都會同步更新。

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

切換到指定的 setting（建立符號連結，會自動備份目前設定到 `previous`）：

```bash
ccx setting use <name>
# 例如: ccx setting use personal
```

未指定名稱時，會進入互動選擇模式：

```bash
ccx setting use
```

### 查看當前 Setting

顯示目前使用中的 setting 名稱：

```bash
ccx setting status
```

### 顯示設定路徑

顯示當前 setting 的檔案路徑：

```bash
ccx setting path
```

顯示 Claude 官方設定檔路徑：

```bash
ccx setting path --official
```

### 顯示設定內容

顯示指定 setting 的內容：

```bash
ccx setting show <name>
# 例如: ccx setting show work
ccx setting show work --raw  # 輸出非格式化的 JSON
```

未指定名稱時，會進入互動選擇模式：

```bash
ccx setting show
```

顯示 Claude 官方設定檔內容：

```bash
ccx setting show --official
```

### 設定 Key-Value

直接設定 Claude 官方 `settings.json` 中的 key-value（使用 dot-path 格式）：

```bash
ccx set env.MY_KEY=myvalue
ccx set env.A=1 env.B=2          # 一次設定多筆
ccx set enabledPlugins.foo=true   # 自動推斷布林值
ccx set model=sonnet --approve    # 跳過覆蓋確認
```

若 key 已存在，會提示是否覆蓋（顯示目前值）。使用 `--approve` 跳過所有確認。

### 刪除 Key

刪除 Claude 官方 `settings.json` 中的 key（使用 dot-path 格式）：

```bash
ccx unset env.MY_KEY              # 精確刪除
ccx unset                          # 互動選擇要刪除的 key
```

### 比較設定差異

比較兩個 setting：

```bash
ccx setting diff <name1> <name2>
# 例如: ccx setting diff work personal
```

使用語意化輸出（依 added/removed/modified 分組）：

```bash
ccx setting diff work personal --semantic
```

## 環境變數

| 變數 | 說明 |
|------|------|
| `CLAUDE_CONFIG_DIR` | 自訂 Claude 設定目錄路徑（預設為 `~/.claude`） |

## 檔案路徑

| 用途 | 路徑 |
|------|------|
| Claude Code 設定 | `~/.claude/settings.json`（符號連結） |
| 儲存的 Settings | `~/.config/ccx/settings/<name>.json` |
| Setting 備份 | `~/.config/ccx/settings/<name>.json.bak` |
| 切換前備份 | `~/.config/ccx/settings/previous.json` |
| 狀態追蹤 | `~/.config/ccx/state.json` |

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
