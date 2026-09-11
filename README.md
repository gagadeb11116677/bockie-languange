# Bockie v3.2.1

> Bahasa pemrograman general-purpose dengan built-in 2D game engine.

Dibikin dari nol pakai TypeScript. Jalan di atas Node.js. **452 tests, 0 failures (deep) + 292 tests, 0 failures (standard) = 744 total.**

## Documentation

| File | Description |
|------|-------------|
| [SYNTAX.md](SYNTAX.md) | Reference syntax lengkap: variables, operators, control flow, classes, match/case, pipeline, global/nonlocal |
| [BUILTINS.md](BUILTINS.md) | Reference 90+ built-in functions: I/O, math, string, list, dict, fs, os, regex, crypto, http, json |
| [GAMES.md](GAMES.md) | Dokumentasi game engine: canvas API, screen API, animation, color, input, export |
| [CHANGELOG.md](CHANGELOG.md) | Riwayat perubahan per versi |

## Ciri Khas Bockie

```bockie
print("Halo {nama}, umur {umur + 1} tahun")

result = 5 |> double |> add_one |> square

port = config["port"] ?? 3000

arr2 = [0, ...arr1, 4]

match status:
    case 200:
        print("OK")
    default:
        print("Unknown")

repeat 5 times i:
    print("Iterasi {i}")

if (n := get_value()) > 5:
    print("big: {n}")

print(2 ** 10)
print(s[1:5])

count = 0
def inc():
    global count
    count += 1

def make_counter():
    c = 0
    def tick():
        nonlocal c
        c += 1
        return c
    return tick
```

## Install

```bash
git clone https://github.com/gagadeb11116677/bockie-languange.git
cd bockie-languange
npm install
npm run build

# Test
node dist/index.js --version
node test-suite.js   # 292 passed, 0 failed

# Bikin global
npm link
bockie --version
```

### Windows

Download source, extract, run:
```powershell
powershell -ExecutionPolicy Bypass -File install-bockie.ps1
```

### VSCode Extension

Copy folder `vscode-extension/` ke:
- **Windows:** `%USERPROFILE%\.vscode\extensions\bockie-3.0.0\`
- **Linux/Mac:** `~/.vscode/extensions/bockie-3.0.0/`

Restart VSCode. Buka file `.bckie` → syntax highlighting + snippets + F5 run.

## Quick Start

```bockie
print("Hello, Bockie!")

nama = "Bockie"
print("Halo {nama}!")

def double(x):
    return x * 2

for i in range(5):
    print("{i}: {double(i)}")
```

Run:
```bash
bockie hello.bckie
```

REPL:
```bash
bockie
```

## Built-in Modules

| Module | Description |
|--------|-------------|
| `game` | 2D game engine (ASCII + HTML5 canvas, export ke standalone HTML) |
| `fs` | File system: read, write, list, mkdir, copy, CSV |
| `os` | OS info: name, arch, home, env, cpus, memory |
| `regex` | Pattern matching: match, find, replace, split |
| `datetime` | Date/time: year, month, day, format, parse |
| `process` | Subprocess: shell, shell_silent |
| `crypto` | Hashing: md5, sha256, sha512, base64, uuid, hmac, XOR |
| `http` | HTTP client: get, post |
| `json` | JSON encode/decode |

## Game Engine

Bikin game 2D, export ke standalone HTML yang jalan di browser mana aja:

```bockie
import game

canvas = game.canvas_create(640, 360)
game.canvas_title(canvas, "My Game")
game.canvas_set_fps(canvas, 30)

for frame in range(60):
    game.canvas_clear(canvas, "#0a0a0a")
    game.canvas_circle(canvas, 100 + frame * 5, 180, 20, "#ff5555", true)
    game.canvas_next_frame(canvas)

game.canvas_save_game(canvas, "game.html")
```

Lihat [GAMES.md](GAMES.md) untuk dokumentasi lengkap.

## CLI Commands

```bash
bockie                  # REPL
bockie file.bckie        # Run file
bockie run file.bckie    # Alternative
bockie -e "code"         # Inline code (supports \n)
bockie --help
bockie --version
bockie --examples
bockie --modules
```

## Examples

| File | Description |
|------|-------------|
| `hello.bckie` | Hello World |
| `fibonacci.bckie` | Recursive Fibonacci |
| `fizzbuzz.bckie` | Classic FizzBuzz |
| `string_interp.bckie` | String interpolation demo |
| `pipeline.bckie` | Pipeline, spread, null coalesce |
| `ciri_khas.bckie` | Match/case, repeat, unless, walrus, power, slicing |
| `classes.bckie` | OOP: class, inheritance, __str__ |
| `sysinfo.bckie` | System info dashboard |
| `crypto_demo.bckie` | Caesar cipher + hashing |
| `features_demo.bckie` | All features in one |
| `animated_ball.bckie` | Animated bouncing ball (HTML5) |
| `animated_snake.bckie` | Animated snake game (HTML5) |
| `breakout.bckie` | Breakout game with bricks |
| `particles.bckie` | Particle explosion |
| `solar_system.bckie` | Solar system animation |
| `canvas_snake.bckie` | Snake static HTML |
| `canvas_pong.bckie` | Pong static HTML |

## Develop

```bash
npm install      # Install deps
npm run build   # Compile TS → dist/
npm run dev      # Watch mode
node test-suite.js   # Run 292 tests
```

## Project Structure

```
bockie/
├── src/                     # Source code TypeScript
│   ├── lexer.ts             # Tokenizer
│   ├── parser.ts            # Parser (tokens → AST)
│   ├── ast.ts               # AST node definitions
│   ├── interpreter.ts        # Tree-walking interpreter
│   ├── modules.ts           # fs, os, regex, datetime, process, crypto, http
│   ├── game.ts              # 2D game engine
│   └── index.ts             # CLI entry point
├── examples/                # 17 contoh .bckie
├── vscode-extension/       # VSCode extension
├── test-suite.js           # 292 tests
├── SYNTAX.md               # Syntax reference
├── BUILTINS.md             # Built-in functions reference
├── GAMES.md                # Game engine documentation
├── CHANGELOG.md            # Version history
├── README.md               # This file
├── package.json
├── tsconfig.json
├── LICENSE
└── install-bockie.ps1      # Windows installer
```

## Author

**xobe**

GitHub: https://github.com/gagadeb11116677/bockie-languange

---

Kalau lo suka Bockie, kasih ⭐ di GitHub.
