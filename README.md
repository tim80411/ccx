# CCX (Claude Code Context)

CLI 工具，用於管理多個 Claude Code 設定檔 profiles。可在不同情境（工作、個人、專案）之間快速切換 `~/.claude/settings.json` 設定。

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

### 建立 Setting Profile

從目前的 Claude Code 設定建立新的 profile：

```bash
ccx setting create <name>
# 例如: ccx setting create work
```

### 列出所有 Profiles

```bash
ccx setting list
```

### 切換 Profile

切換到指定的 profile（會自動備份目前設定到 `previous`）：

```bash
ccx setting use <name>
# 例如: ccx setting use personal
```

### 更新 Profile

用目前的 Claude Code 設定覆蓋指定的 profile：

```bash
ccx setting update <name>
# 例如: ccx setting update work
```

## 檔案路徑

| 用途 | 路徑 |
|------|------|
| Claude Code 設定 | `~/.claude/settings.json` |
| 儲存的 Profiles | `~/.config/ccx/settings/<name>.json` |
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
