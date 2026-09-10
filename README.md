# Bockie v3.0.0

> Bahasa pemrograman general-purpose dengan built-in 2D game engine. Ciri khas: string interpolation, pipeline operator, match/case, dan lebih.

Dibikin dari nol pakai TypeScript. Jalan di atas Node.js. 245 tests, 0 failures.

## Ciri khas Bockie

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

print(2 ** 10)  # 1024
print(s[1:5])   # slicing
```

## Install

### Cara 1: Build dari source (recommended)

Butuh Node.js 14+ dari https://nodejs.org/

```bash
git clone https://github.com/gagadeb11116677/bockie-languange.git
cd bockie-languange
npm install
npm run build

# Test
node dist/index.js --version
node dist/index.js run examples/hello.bckie
```

Bikin `bockie` command global:
```bash
npm link
bockie --version
```

### Cara 2: Windows installer (auto)

1. Download source zip / clone repo
2. Double-click `install-bockie.bat` (atau run `install-bockie.ps1` di PowerShell)

Script otomatis:
- Copy source ke `C:\Users\NamaLo\bockie`
- `npm install` + `npm run build`
- Tambah ke PATH
- Install VSCode extension
- Test: `bockie --version`

### Cara 3: Bikin binary standalone (opsional)

Butuh Bun dari https://bun.sh

```bash
bun build src/index.ts --compile --outfile bockie           # Linux
bun build src/index.ts --compile --target=bun-windows-x64 --outfile bockie.exe  # Windows
bun build src/index.ts --compile --target=bun-darwin-x64 --outfile bockie-mac   # Mac
```

Binary standalone ga butuh Node.js di laptop user.

## VSCode Extension

Syntax highlighting + snippets untuk file `.bckie`.

### Install manual

**Linux/Mac:**
```bash
mkdir -p ~/.vscode/extensions/bockie-1.0.0
cp -r vscode-extension/* ~/.vscode/extensions/bockie-1.0.0/
```

**Windows (PowerShell):**
```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.vscode\extensions\bockie-1.0.0"
Copy-Item -Path vscode-extension\* -Destination "$env:USERPROFILE\.vscode\extensions\bockie-1.0.0" -Recurse
```

Restart VSCode. Buka file `.bckie` → syntax highlighting aktif.

Fitur:
- Keywords (`def`, `class`, `if`, `match`, `case`, dll) — warna biru
- Strings + interpolation `{expr}` — warna oranye/hijau
- Numbers, comments — warna hijau/abu-abu
- Snippets: `def`, `class`, `match`, `repeat`, dll
- Auto-indent (4 spaces, Python-style)

## Quick start

Bikin `hello.bckie`:
```bockie
print("Hello, Bockie!")
nama = "Bockie"
print("Halo {nama}!")

for i in range(5):
    print("Iterasi {i}")
```

Run:
```bash
bockie hello.bckie
```

REPL:
```bash
bockie
```

## Ciri khas syntax (lengkap)

| Fitur | Syntax | Contoh |
|-------|--------|--------|
| String interpolation | `"{expr}"` | `print("Halo {nama}")` |
| Pipeline | `a \|> b` | `5 \|> double \|> add_one` |
| Null coalescing | `a ?? b` | `x ?? "default"` |
| Spread | `...arr` | `[0, ...arr, 4]` |
| Match/case | `match x:` | Pattern matching |
| Repeat | `repeat N times i:` | Loop N kali dengan index |
| Unless | `unless cond:` | Kebalikan if |
| Until | `until cond:` | Kebalikan while |
| Walrus | `:=` | `if (n := f()) > 5:` |
| Power | `**` | `2 ** 10` = 1024 |
| Slicing | `s[1:5]` | `s[:5]`, `s[-2:]` |
| Triple-string | `"""..."""` | Multiline string |
| Lambda | `lambda x: x*2` | Anonymous function |

## Built-in modules (general-purpose)

```bockie
import fs
import os
import regex
import datetime
import process
import crypto
import http
import json
import game
```

### fs — File system
```bockie
fs_write("data.txt", "Hello Bockie!")
content = fs_read("data.txt")
lines = fs_read_lines("data.txt")
files = fs_list(".")
for f in files:
    print("  {f['name']} - {f['size']} bytes")

fs_mkdir("output")
fs_copy("src.txt", "dst.txt")
fs_remove("temp.txt")
exists = fs_exists("data.txt")
```

### os — OS info
```bockie
print("OS: {os_name()}")           # linux/win32/darwin
print("Arch: {os_arch()}")         # x64/arm64
print("Home: {os_home()}")
print("CPUs: {os_cpu_count()}")
print("Free mem: {os_freemem()}")

home = os_env("HOME")               # get env var
os_setenv("BOCKIE_MODE", "debug")
```

### regex — Regular expressions
```bockie
text = "Hello World 123"
if regex_match("\\d+", text):
    print("Has digits")

numbers = regex_find_all("\\d+", text)  # ["123"]
cleaned = regex_replace("[^a-zA-Z]", " ", text)
parts = regex_split("\\s+", text)
```

### datetime — Date/time
```bockie
print("Year: {date_year()}")
print("Month: {date_month()}")
print("Now: {date_format('YYYY-MM-DD HH:SS')}")
ts = date_parse("2026-09-09")
```

### process — Subprocess
```bockie
output = shell("echo hello")           # capture stdout
result = shell_silent("ls -la")
if result["success"]:
    print("Output: {result['stdout']}")
else:
    print("Error: {result['stderr']}")
```

### crypto — Hashing & encoding
```bockie
print("MD5:    {md5('hello')}")
print("SHA256: {sha256('hello')}")
print("SHA512: {sha512('hello')}")

encoded = base64_encode("Hello!")
decoded = base64_decode(encoded)

print("UUID: {uuid()}")
print("HMAC: {hmac_sha256('key', 'message')}")
```

### http — HTTP client
```bockie
response = http_get("https://httpbin.org/json")
print("Response: {response}")

result = http_post("https://api.example.com", json_dumps({"name": "Bockie"}))
```

### json — JSON encode/decode
```bockie
data = {"name": "Bockie", "version": "1.0.0", "tags": ["lang", "game"]}
json_str = json_dumps(data)
parsed = json_loads(json_str)
print("Name: {parsed['name']}")
```

### game — 2D engine (ASCII + HTML5 canvas)

```bockie
import game

canvas = game.canvas_create(640, 360)
game.canvas_title(canvas, "Bouncing Ball")
game.canvas_bg(canvas, "#0a0a0a")

game.canvas_circle(canvas, 320, 180, 30, "#ff5555", True)
game.canvas_text(canvas, 20, 20, "Hello!", "#ffaa00", 24)

# Save ke standalone HTML - bisa di-share ke siapapun
game.canvas_save_html(canvas, "game.html")
# Atau langsung buka di browser
game.canvas_play(canvas)
```

Game ASCII juga support:
```bockie
screen = game.screen_create(40, 15)
game.screen_draw_text(screen, 5, 5, "Hello ASCII", 2)
game.screen_render(screen)
```

## 80+ built-in functions

| Category | Functions |
|----------|-----------|
| I/O | `print`, `input`, `print_color`, `print_err`, `read_line`, `ask`, `confirm` |
| Collections | `len`, `range`, `list`, `dict`, `tuple`, `enumerate`, `zip`, `sorted`, `reversed`, `map`, `filter`, `reduce`, `any`, `all` |
| Math | `abs`, `min`, `max`, `sum`, `round`, `floor`, `ceil`, `sqrt`, `pow`, `sin`, `cos`, `tan`, `atan2`, `log`, `exp`, `pi`, `tau`, `e`, `sign`, `clamp` |
| Random | `random`, `randint`, `choice`, `shuffle`, `sample` |
| Time | `time`, `now`, `now_ms`, `sleep`, `clock` |
| Conversion | `int`, `float`, `str`, `bool`, `type`, `isinstance`, `hex`, `bin`, `oct`, `chr`, `ord`, `format` |
| String | `upper`, `lower`, `strip`, `split`, `join`, `replace`, `contains`, `starts_with`, `ends_with`, `find`, `count`, `repeat`, `pad_left`, `pad_right`, `reverse` |
| List | `append`, `pop`, `insert`, `remove`, `index`, `count`, `sort`, `reverse`, `clear`, `extend`, `copy` |
| Dict | `keys`, `values`, `items`, `get`, `set`, `pop`, `contains`, `clear`, `copy`, `update` |
| File | `fs_read`, `fs_write`, `fs_append`, `fs_exists`, `fs_mkdir`, `fs_list`, `fs_copy`, `fs_move`, `fs_remove`, `fs_stat`, `fs_read_lines`, `fs_read_csv` |
| OS | `os_name`, `os_arch`, `os_home`, `os_env`, `os_cpus`, `os_cpu_count`, `os_freemem`, `os_totalmem`, `os_uptime`, `os_pid` |
| Regex | `regex_match`, `regex_find`, `regex_find_all`, `regex_replace`, `regex_split`, `regex_groups` |
| Date | `date_year`, `date_month`, `date_day`, `date_hour`, `date_minute`, `date_second`, `date_format`, `date_parse` |
| Process | `shell`, `shell_silent`, `process_kill`, `process_exit`, `process_pid`, `process_args` |
| Crypto | `md5`, `sha1`, `sha256`, `sha512`, `base64_encode`, `base64_decode`, `url_encode`, `url_decode`, `uuid`, `random_bytes`, `hmac_sha256` |
| HTTP | `http_get`, `http_post`, `http_url_encode` |
| JSON | `json_dumps`, `json_loads`, `json_pretty` |
| System | `exit`, `argv` |
| Color | `color_red`, `color_green`, `color_yellow`, `color_blue`, `color_cyan`, `bold`, `progress_bar` |
| Game | `screen_*`, `canvas_*`, `term_*`, `key_*`, `beep` |

## CLI commands

```bash
bockie                  # REPL
bockie file.bckie       # run file
bockie run file.bckie   # alternative
bockie -e "code"        # inline
bockie --help
bockie --version
bockie --examples
bockie --modules
```

## Examples

| File | Apa |
|------|-----|
| `hello.bckie` | Hello World |
| `string_interp.bckie` | String interpolation `{}` |
| `pipeline.bckie` | Pipeline `|>`, spread `...`, null coalescing `??` |
| `ciri_khas.bckie` | Match/case, repeat, unless, until, walrus, power, slicing |
| `classes.bckie` | OOP: class, inheritance, __str__ |
| `fibonacci.bckie` | Recursive Fibonacci |
| `fizzbuzz.bckie` | Classic FizzBuzz |
| `sysinfo.bckie` | System info (OS, memory, CPUs, env vars) |
| `crypto_demo.bckie` | Caesar cipher + hashing (md5/sha256/base64) |
| `canvas_snake.bckie` | Snake game HTML5 + export to standalone HTML |

Run any example:
```bash
bockie run examples/canvas_snake.bckie
# Output: snake_game.html (buka di browser!)
```

## Project structure

```
bockie/
├── src/
│   ├── lexer.ts          # Tokenizer
│   ├── parser.ts         # Parser (tokens → AST)
│   ├── ast.ts            # AST node definitions
│   ├── interpreter.ts    # Tree-walking interpreter
│   ├── modules.ts        # fs, os, regex, datetime, process, crypto, http, json
│   ├── game.ts           # 2D game engine (ASCII + HTML5 canvas)
│   └── index.ts          # CLI entry point
├── examples/             # 9+ contoh .bckie
├── vscode-extension/     # VSCode extension
│   ├── package.json
│   ├── language-configuration.json
│   ├── snippets.json
│   └── syntaxes/bockie.tmLanguage.json
├── install-bockie.ps1    # Windows installer (PowerShell)
├── install-bockie.bat    # Windows installer (Batch)
├── upload-to-github.ps1 # Script upload ke GitHub
├── upload-to-github.bat
├── package.json
├── tsconfig.json
├── LICENSE
└── README.md
```

## Develop

```bash
npm install      # install deps
npm run build    # compile TS → dist/
npm run dev      # watch mode
npm run test     # test build
```

Untuk bikin binary standalone (butuh Bun dari https://bun.sh):
```bash
bun build src/index.ts --compile --outfile bockie
```

## Author

**xobe**

GitHub: https://github.com/gagadeb11116677/bockie-languange

---

Kalau lo suka Bockie, kasih ⭐ di GitHub.
