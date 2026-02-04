# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CCX (Claude Code Context) is a CLI tool for managing multiple Claude Code settings. It allows switching between different `~/.claude/settings.json` configurations for different contexts (work, personal, projects).

## Development Commands

```bash
# Run CLI directly (both forms work)
bun run src/index.ts setting <command> [args]
bun run src/index.ts <command> [args]  # top-level alias

# Run all tests
bun test

# Run single test file
bun test src/commands/setting.test.ts

# Install globally for development
bun link

# Run after linking (both forms work)
ccx setting <command> [args]
ccx <command> [args]  # top-level alias
```

## Development Process

Follow TDD (Test-Driven Development):
1. Write failing test first
2. Implement minimal code to pass
3. Refactor while keeping tests green

**Important**: Always write/update tests BEFORE implementing code changes.

## Architecture

```
src/
├── index.ts              # CLI entry point (Commander setup)
├── commands/
│   └── setting.ts        # Setting subcommand logic (create/list/use/update/status/path/show/diff)
├── utils/
│   ├── paths.ts          # Path constants and helpers
│   ├── fs.ts             # File system operations
│   ├── state.ts          # State management (current setting tracking)
│   ├── target.ts         # Setting target resolution (current/named/official)
│   ├── prompt.ts         # User confirmation prompts
│   └── diff.ts           # Diff utilities (unified and semantic diff generation)
└── types.ts              # TypeScript type definitions
```

## Key Paths

| Purpose | Path |
|---------|------|
| Claude official settings | `~/.claude/settings.json` |
| Stored settings | `~/.config/ccx/settings/<name>.json` |
| Auto-backup | `~/.config/ccx/settings/previous.json` |
| State file | `~/.config/ccx/state.json` |

## State Tracking

CCX tracks the currently active setting via `~/.config/ccx/state.json`. This enables:
- `ccx status` - show current active setting
- `ccx path` / `ccx show` - default to current setting (use `--official` for Claude's file)
- `ccx update` - default to current setting when no name specified

State is updated only after `ccx use <name>` command.

## Commands

| Command | Description |
|---------|-------------|
| `ccx create <name>` | Create new setting from current Claude config |
| `ccx list` | List all stored settings |
| `ccx use [name]` | Switch to setting (interactive if no name) |
| `ccx update [name]` | Update setting from current Claude config (defaults to current, requires confirmation) |
| `ccx status` | Show current active setting name |
| `ccx path [--official]` | Show setting path (default: current, --official: Claude's file) |
| `ccx show [--official] [--raw]` | Show setting content (default: current, --official: Claude's file) |
| `ccx diff [name1] [name2]` | Compare settings (no args: current vs official, 1 arg: named vs official, 2 args: named vs named) |

### Diff Command Details

The `diff` command follows Unix conventions:
- **Exit code 0**: Files are identical (no output)
- **Exit code 1**: Files differ (outputs diff)
- **Exit code 2**: Error occurred

Options:
- `--semantic`: Show semantic diff (grouped by added/removed/modified keys) instead of unified diff format

## Conventions

- Reserved name: `previous` (used for auto-backup on switch)
- Output format: `✓ <action>: <name>` for success
- Errors go to stderr with exit code 1
- Namespace structure: `ccx <namespace> <action>` (designed for future expansion: mcp, claude, setting)
- Error messages in Chinese, referencing full command path (e.g., `'ccx setting use <name>'`)
- **Documentation**: After completing features/changes, always update both `README.md` and `CLAUDE.md`

