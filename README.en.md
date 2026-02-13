# CCX (Claude Code Context)

[繁體中文](./README.md)

A CLI tool for managing multiple Claude Code settings. Quickly switch between different `~/.claude/settings.json` configurations for different contexts (work, personal, projects).

Uses symlinks so that `~/.claude/settings.json` points directly to the stored setting file — edits in either location affect both.

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

Switch to a specific setting via symlink (automatically backs up current settings as `previous`):

```bash
ccx setting use <name>
# e.g. ccx setting use personal
```

When no name is provided, an interactive selection prompt appears:

```bash
ccx setting use
```

### Check Current Setting

Display the currently active setting name:

```bash
ccx setting status
```

### Show Settings Path

Show the current setting's file path:

```bash
ccx setting path
```

Show Claude's official settings file path:

```bash
ccx setting path --official
```

### Show Settings Content

Show the current setting's content:

```bash
ccx setting show
ccx setting show --raw  # Output unformatted JSON
```

Show Claude's official settings content:

```bash
ccx setting show --official
```

### Set Key-Value

Directly set key-value pairs in Claude's official `settings.json` using dot-path notation:

```bash
ccx set env.MY_KEY=myvalue
ccx set env.A=1 env.B=2          # Set multiple at once
ccx set enabledPlugins.foo=true   # Auto-infers boolean values
ccx set model=sonnet --approve    # Skip overwrite confirmation
```

If a key already exists, you'll be prompted to confirm overwrite (showing current value). Use `--approve` to skip all confirmations.

### Delete Key

Delete a key from Claude's official `settings.json` using dot-path notation:

```bash
ccx unset env.MY_KEY              # Delete by exact path
ccx unset                          # Interactive selection
```

### Compare Settings

Compare two settings:

```bash
ccx setting diff <name1> <name2>
# e.g. ccx setting diff work personal
```

Use semantic output (grouped by added/removed/modified):

```bash
ccx setting diff work personal --semantic
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `CLAUDE_CONFIG_DIR` | Custom Claude config directory path (defaults to `~/.claude`) |

## File Paths

| Purpose | Path |
|---------|------|
| Claude Code settings | `~/.claude/settings.json` (symlink) |
| Stored settings | `~/.config/ccx/settings/<name>.json` |
| Setting backup | `~/.config/ccx/settings/<name>.json.bak` |
| Switch backup | `~/.config/ccx/settings/previous.json` |
| State tracking | `~/.config/ccx/state.json` |

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
