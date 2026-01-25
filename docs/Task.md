# CCX 開發任務清單

## Phase 1: 專案初始化

- [ ] 1.1 執行 `bun init` 初始化專案
- [ ] 1.2 安裝 commander 依賴：`bun add commander`
- [ ] 1.3 建立目錄結構：`src/commands/`, `src/utils/`
- [ ] 1.4 建立 TypeScript 設定 `tsconfig.json`
- [ ] 1.5 設定 `package.json` 的 `bin` 欄位指向入口

## Phase 2: 核心功能實作

### 2.1 路徑工具 (`src/utils/paths.ts`)

- [ ] 2.1.1 實作 `getClaudeSettingsPath()` 回傳 `~/.claude/settings.json`
- [ ] 2.1.2 實作 `getCcxSettingsDir()` 回傳 `~/.config/ccx/settings/`
- [ ] 2.1.3 實作 `getSettingPath(name)` 回傳指定 setting 的完整路徑
- [ ] 2.1.4 實作 `getPreviousPath()` 回傳 `previous.json` 路徑

### 2.2 檔案操作工具 (`src/utils/fs.ts`)

- [ ] 2.2.1 實作 `ensureDir(path)` 確保目錄存在
- [ ] 2.2.2 實作 `copyFile(src, dest)` 複製檔案
- [ ] 2.2.3 實作 `fileExists(path)` 檢查檔案存在
- [ ] 2.2.4 實作 `listJsonFiles(dir)` 列出目錄下的 .json 檔案（排除 previous.json）

### 2.3 Setting 命令邏輯 (`src/commands/setting.ts`)

- [ ] 2.3.1 實作 `create(name)` 功能
  - 驗證名稱不是 `previous`
  - 驗證 setting 不存在
  - 驗證來源檔案存在
  - 複製檔案
  - 輸出成功訊息

- [ ] 2.3.2 實作 `list()` 功能
  - 讀取 settings 目錄
  - 格式化輸出
  - 處理空列表情況

- [ ] 2.3.3 實作 `use(name)` 功能
  - 驗證 setting 存在
  - 備份當前設定到 previous.json
  - 複製指定 setting 到 claude settings
  - 輸出成功訊息

- [ ] 2.3.4 實作 `update(name)` 功能
  - 驗證 setting 存在
  - 驗證來源檔案存在
  - 覆蓋指定 setting
  - 輸出成功訊息

## Phase 3: CLI 整合

- [ ] 3.1 建立 CLI 入口 `src/index.ts`
- [ ] 3.2 設定 Commander 程式名稱與版本
- [ ] 3.3 建立 `setting` 子命令群組
- [ ] 3.4 註冊 `setting create <name>` 命令
- [ ] 3.5 註冊 `setting list` 命令
- [ ] 3.6 註冊 `setting use <name>` 命令
- [ ] 3.7 註冊 `setting update <name>` 命令
- [ ] 3.8 實作全域錯誤處理（catch → stderr + exit 1）

## Phase 4: 測試與發布準備

### 4.1 手動測試

- [ ] 4.1.1 測試 `ccx setting create` 正常流程
- [ ] 4.1.2 測試 `ccx setting create` 重複名稱錯誤
- [ ] 4.1.3 測試 `ccx setting create previous` 保留名稱錯誤
- [ ] 4.1.4 測試 `ccx setting list` 有資料
- [ ] 4.1.5 測試 `ccx setting list` 空列表
- [ ] 4.1.6 測試 `ccx setting use` 正常流程
- [ ] 4.1.7 測試 `ccx setting use` 不存在錯誤
- [ ] 4.1.8 測試 `ccx setting update` 正常流程
- [ ] 4.1.9 測試 `ccx setting update` 不存在錯誤

### 4.2 發布準備

- [ ] 4.2.1 撰寫 README.md（安裝、使用方式）
- [ ] 4.2.2 執行 `bun link` 測試全域安裝
- [ ] 4.2.3 驗證 `ccx` 命令可正常執行
