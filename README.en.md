# CCX (Claude Code Context)

[繁體中文](./README.md)

A CLI tool for managing multiple Claude Code settings. Quickly switch between different `~/.claude/settings.json` configurations for different contexts (work, personal, projects).

## Installation

### Homebrew (Recommended)

```bash
brew tap tim80411/tap
brew install ccx
```

To update:

```bash
brew update
brew upgrade ccx
```

### From Source

```bash
git clone <repository-url>
cd ccx
bun install
bun link
```

## Usage

### Create a Setting

Create a new setting from your current Claude Code settings:

```bash
ccx setting create <name>
# e.g. ccx setting create work
```

### List All Settings

```bash
ccx setting list
```

### Switch Setting

Switch to a specific setting (automatically backs up current settings as `previous`):

```bash
ccx setting use <name>
# e.g. ccx setting use personal
```

When no name is provided, an interactive selection prompt appears:

```bash
ccx setting use
```

### Update a Setting

Overwrite a setting with your current Claude Code settings:

```bash
ccx setting update <name>
# e.g. ccx setting update work
```

### Show Settings Path

```bash
ccx setting path
```

### Show Current Settings

```bash
ccx setting show
ccx setting show --raw  # Output unformatted JSON
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `CLAUDE_CONFIG_DIR` | Custom Claude config directory path (defaults to `~/.claude`) |

## File Paths

| Purpose | Path |
|---------|------|
| Claude Code settings | `~/.claude/settings.json` |
| Stored settings | `~/.config/ccx/settings/<name>.json` |
| Auto-backup | `~/.config/ccx/settings/previous.json` |

## Development

```bash
# Run tests
bun test

# Run CLI directly
bun run src/index.ts setting <command> [args]

# Install globally for development
bun link
```

## License

MIT
