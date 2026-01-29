# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CCX (Claude Code Context) is a CLI tool for managing multiple Claude Code settings. It allows switching between different `~/.claude/settings.json` configurations for different contexts (work, personal, projects).

## Development Commands

```bash
# Run CLI directly
bun run src/index.ts setting <command> [args]

# Run all tests
bun test

# Run single test file
bun test src/commands/setting.test.ts

# Install globally for development
bun link

# Run after linking
ccx setting <command> [args]
```

## Development Process

Follow TDD (Test-Driven Development):
1. Write failing test first
2. Implement minimal code to pass
3. Refactor while keeping tests green

## Architecture

```
src/
├── index.ts              # CLI entry point (Commander setup)
├── commands/
│   └── setting.ts        # Setting subcommand logic (create/list/use/update)
├── utils/
│   ├── paths.ts          # Path constants and helpers
│   └── fs.ts             # File system operations
└── types.ts              # TypeScript type definitions
```

## Key Paths

| Purpose | Path |
|---------|------|
| Source settings | `~/.claude/settings.json` |
| Stored settings | `~/.config/ccx/settings/<name>.json` |
| Auto-backup | `~/.config/ccx/settings/previous.json` |

## Conventions

- Reserved name: `previous` (used for auto-backup on switch)
- Output format: `✓ <action>: <name>` for success
- Errors go to stderr with exit code 1
- Namespace structure: `ccx <namespace> <action>` (designed for future expansion: mcp, claude, setting)
