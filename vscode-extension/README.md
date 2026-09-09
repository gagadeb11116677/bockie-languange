# Bockie Language Support for VSCode

Provides syntax highlighting, snippets, and run commands for [Bockie](https://github.com/gagadeb11116677/bockie-languange) programming language.

## Features

- **Syntax Highlighting** — Keywords, strings, numbers, comments, operators
- **String Interpolation** — Special highlighting for `{expr}` inside strings
- **Snippets** — 30+ snippets for common Bockie patterns (def, class, match, repeat, etc)
- **Run Commands** — F5 to run current .bckie file
- **REPL** — Open Bockie REPL in integrated terminal
- **File Icons** — .bckie files show Bockie logo in explorer
- **Auto-indent** — Python-style 4-space indentation

## Installation

### From VSIX

```bash
code --install-extension bockie-1.0.0.vsix
```

### Manual

Copy this folder to:
- **Windows:** `%USERPROFILE%\.vscode\extensions\bockie-1.0.0\`
- **Mac/Linux:** `~/.vscode/extensions/bockie-1.0.0/`

Restart VSCode.

## Usage

### Run current file

Open a `.bckie` file and press:
- **F5** — Run current file
- **Ctrl+Shift+P** → "Bockie: Run Current File"

### Open REPL

**Ctrl+Shift+P** → "Bockie: Open REPL"

### Snippets

Type `def`, `class`, `if`, `for`, `match`, `repeat`, `try`, `lambda`, etc and press Tab.

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `bockie.executablePath` | `bockie` | Path to bockie executable |
| `bockie.runInTerminal` | `true` | Run in terminal (vs Output panel) |

## Requirements

Bockie must be installed and accessible via `bockie` command (or set `bockie.executablePath`).

Install Bockie: https://github.com/gagadeb11116677/bockie-languange

## License

MIT

## Author

**xobe**
