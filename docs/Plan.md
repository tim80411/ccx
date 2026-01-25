# CCX 開發計劃

## 階段概覽

| 階段 | 目標 | 預估時間 |
|------|------|----------|
| Phase 1 | 專案初始化 | 15 min |
| Phase 2 | 核心功能實作 | 45 min |
| Phase 3 | CLI 整合 | 20 min |
| Phase 4 | 測試與發布準備 | 20 min |

---

## Phase 1: 專案初始化

### 目標
建立專案基礎架構，確保開發環境可運作。

### 任務
1. 初始化 Bun 專案 (`bun init`)
2. 安裝依賴 (`commander`)
3. 設定 TypeScript 配置
4. 建立目錄結構
5. 設定 package.json 的 bin 入口

### 產出
```
ccx/
├── src/
│   ├── index.ts
│   ├── commands/
│   ├── utils/
│   └── types.ts
├── package.json
└── tsconfig.json
```

---

## Phase 2: 核心功能實作

### 目標
實作所有 setting 管理的核心邏輯。

### 任務
1. 實作路徑工具 (`src/utils/paths.ts`)
   - `getClaudeSettingsPath()` → `~/.claude/settings.json`
   - `getCcxSettingsDir()` → `~/.config/ccx/settings/`
   - `getSettingPath(name)` → `~/.config/ccx/settings/<name>.json`

2. 實作檔案操作工具 (`src/utils/fs.ts`)
   - `ensureDir(path)` - 確保目錄存在
   - `copyFile(src, dest)` - 複製檔案
   - `fileExists(path)` - 檢查檔案是否存在
   - `listFiles(dir)` - 列出目錄下的檔案

3. 實作 setting 命令 (`src/commands/setting.ts`)
   - `create(name)` - 建立新 setting
   - `list()` - 列出所有 settings
   - `use(name)` - 切換 setting
   - `update(name)` - 更新 setting

### 產出
可獨立測試的核心模組。

---

## Phase 3: CLI 整合

### 目標
使用 Commander 建立完整的 CLI 介面。

### 任務
1. 設定 Commander 主程式
2. 註冊 `setting` 子命令群組
3. 連接各命令到核心功能
4. 實作錯誤處理與輸出格式

### 產出
可執行的 CLI：`bun run src/index.ts setting create test`

---

## Phase 4: 測試與發布準備

### 目標
確保品質並準備發布。

### 任務
1. 手動測試所有命令的正常流程
2. 測試錯誤情況處理
3. 撰寫 README.md
4. 設定全域安裝 (`bun link`)

### 產出
可全域使用的 `ccx` 命令。

---

## 驗收標準

完成後應能執行：

```bash
# 從當前設定建立 work profile
ccx setting create work

# 列出所有 settings
ccx setting list

# 修改 settings.json 後更新 work
ccx setting update work

# 建立 personal profile
ccx setting create personal

# 切換到 personal（自動備份當前到 previous）
ccx setting use personal

# 切換回 work
ccx setting use work
```
