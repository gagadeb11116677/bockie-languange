# Bockie v3.2.3

> A general-purpose programming language with a built-in 2D game engine.

Built from scratch in TypeScript. Runs on Node.js. **817 tests passing (292 standard + 525 deep), 0 failures.**

---

## 🌐 Language / Bahasa

- 🇬🇧 **English** — you are here
- 🇮🇩 **Bahasa Indonesia** — see [README.id.md](README.id.md) or scroll to [Indonesian version](#-bahasa-indonesia) below

---

## 🇬🇧 English

### What is Bockie?

Bockie is a small but complete programming language designed to be **friendly to write** and **fast enough to do real work**. It has first-class functions, classes, pattern matching, pipelines, an interactive REPL, a standard library of 100+ builtins, and a 2D game engine that can export standalone HTML.

### Ciri Khas (Signature Features)

```bockie
# String interpolation
print("Hello {name}, age {age + 1}")

# Pipeline operator
result = 5 |> double |> add_one |> square

# Null coalescing
port = config["port"] ?? 3000

# Spread in list literals
arr2 = [0, ...arr1, 4]

# Match/case
match status:
    case 200:
        print("OK")
    default:
        print("Unknown")

# Repeat loop with index
repeat 5 times i:
    print("Iteration {i}")

# Walrus assignment inside expressions
if (n := get_value()) > 5:
    print("big: {n}")

# Power operator
print(2 ** 10)

# Slicing
print(s[1:5])

# Global / nonlocal for closures
count = 0
def inc():
    global count
    count += 1

# Higher-order builtins accept BOTH argument orders (v3.2.2 ciri khas)
data = [{"score": 10}, {"score": 20}, {"score": 30}]
print(map(data, lambda x: x["score"]))   # [10, 20, 30]  ← iterable-first
print(map(lambda x: x["score"], data))   # [10, 20, 30]  ← function-first (Python style)
```

### v3.2.2 Highlights

#### 🐛 Bug fix: `map`/`filter`/`reduce` "object is not callable"

In v3.2.1, calling `map(data, lambda x: x["score"])` (iterable-first) threw `Runtime Error: object is not callable`. The implementation assumed the function always came first. **Fixed in v3.2.2** — all higher-order collection builtins now accept both argument orders. See [CHANGELOG.md](CHANGELOG.md) for full root-cause analysis.

#### ✨ New builtins

| Builtin | What it does |
|---------|--------------|
| `flat_map(fn, iter)` | Map + flatten one level (Haskell `concatMap`) |
| `each(fn, iter)` | Iterate for side effects, returns None (faster than `map` + discard) |
| `partition(fn, iter)` | Split into `[passed, failed]` tuple |
| `tap(value, fn)` | Pipeline debug helper — call `fn(value)`, return `value` unchanged |

```bockie
print(flat_map(lambda x: [x, x*10], [1,2,3]))   # [1, 10, 2, 20, 3, 30]
each([1,2,3], lambda x: print("got {x}"))        # got 1 / got 2 / got 3 (returns None)
evens, odds = partition(lambda x: x%2==0, [1,2,3,4,5])
# evens = [2, 4], odds = [1, 3, 5]
result = 5 |> tap(print) |> double |> tap(print)   # prints 5, then 10
```

### Install

```bash
git clone https://github.com/gagadeb11116677/bockie-languange.git
cd bockie-languange
npm install
npm run build

# Verify
node dist/index.js --version
node test-suite.js   # 292 passed, 0 failed
node deep-test.js    # 490 passed, 0 failed
```

#### Windows

```powershell
powershell -ExecutionPolicy Bypass -File install-bockie.ps1
```

#### VSCode Extension

Copy `vscode-extension/` to:
- **Windows:** `%USERPROFILE%\.vscode\extensions\bockie-3.0.0\`
- **Linux/Mac:** `~/.vscode/extensions/bockie-3.0.0\`

Restart VSCode. Open a `.bckie` file → syntax highlighting + snippets + F5 run.

### v3.2.3 Highlights

#### 🐛 Bug fix #1: `game.key_wait()` now works on Windows PowerShell

In v3.2.2, `key_wait()` returned `""` immediately on Windows PowerShell because `fs.readSync(0, ...)` doesn't block without raw mode. **Fixed in v3.2.3** with a three-tier fallback: Unix TTY raw-mode read (Tier 1) → Windows PowerShell `[Console]::ReadKey()` (Tier 2) → generic line-mode fallback (Tier 3).

```bockie
import game
print("Tekan tombol apa saja...")
key = game.key_wait()   # ← now blocks on Windows too
print("Tombol: {key}")
```

#### 🐛 Bug fix #2: Mutable closure state — auto-mutation

In v3.2.2, this returned `1, 1, 1` instead of `1, 2, 3`:

```bockie
def make_counter(start):
    count = start
    def increment():
        count = count + 1   # ← was creating a fresh local, not updating outer
        return count
    return increment

c = make_counter(0)
print(c(), c(), c())   # v3.2.2: 1, 1, 1   ✅ v3.2.3: 1, 2, 3
```

**Fixed:** `Environment.set()` now auto-mutates outer function-scope variables (JavaScript-style) instead of creating shadowing locals. `nonlocal`/`global` keywords still work for explicit control.

#### ✨ 12 new beginner-friendly builtins

```bockie
# List helpers
print(first([10, 20, 30]))              # 10  (or default if empty)
print(last("hello"))                     # "o"
print(is_empty([]))                      # True
print(window([1,2,3,4,5], 3))            # [[1,2,3], [2,3,4], [3,4,5]]

# Functional helpers
print(take_while(lambda x: x < 3, [1,2,3,4]))   # [1, 2]
print(drop_while(lambda x: x < 3, [1,2,3,4]))   # [3, 4]
print(sum_of(lambda x: x*x, [1,2,3]))            # 14 (1+4+9)
print(repeat_list(0, 5))                          # [0, 0, 0, 0, 0]

# Input helpers (validate + retry, no try/except needed)
age = input_int("Umur lo: ")
price = input_num("Harga: ")
if confirm("Lanjut? "): print("ok")
pause("Press Enter...")
```

Full root-cause analysis: [CHANGELOG.md](CHANGELOG.md).

### Quick Start

```bockie
print("Hello, Bockie!")

name = "Bockie"
print("Hello {name}!")

def double(x):
    return x * 2

for i in range(5):
    print("{i}: {double(i)}")
```

Run a file:
```bash
bockie hello.bckie
```

REPL:
```bash
bockie
```

### CLI Commands

```bash
bockie                  # REPL
bockie file.bckie       # Run file
bockie run file.bckie   # Alternative
bockie -e "code"        # Inline code (supports \n)
bockie --help
bockie --version
bockie --examples
bockie --modules
```

### Documentation

| File | Description |
|------|-------------|
| [SYNTAX.md](SYNTAX.md) | Full syntax reference: variables, operators, control flow, classes, match/case, pipeline, global/nonlocal |
| [BUILTINS.md](BUILTINS.md) | Reference for 100+ built-in functions: I/O, math, string, list, dict, fs, os, regex, crypto, http, json |
| [GAMES.md](GAMES.md) | Game engine docs: canvas API, screen API, animation, color, input, export |
| [CHANGELOG.md](CHANGELOG.md) | Version history |

### Built-in Modules

| Module | Description |
|--------|-------------|
| `game` | 2D game engine (ASCII + HTML5 canvas, export to standalone HTML) |
| `fs` | File system: read, write, list, mkdir, copy, CSV |
| `os` | OS info: name, arch, home, env, cpus, memory |
| `regex` | Pattern matching: match, find, replace, split |
| `datetime` | Date/time: year, month, day, format, parse |
| `process` | Subprocess: shell, shell_silent |
| `crypto` | Hashing: md5, sha256, sha512, base64, uuid, hmac, XOR |
| `http` | HTTP client: get, post |
| `json` | JSON encode/decode |

### Game Engine

Build 2D games, export to standalone HTML that runs in any browser:

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

See [GAMES.md](GAMES.md) for full documentation.

### Examples

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

### Develop

```bash
npm install      # Install deps
npm run build   # Compile TS → dist/
npm run dev      # Watch mode
node test-suite.js   # Run 292 tests
node deep-test.js    # Run 490 deep tests
```

### Project Structure

```
bockie/
├── src/                     # TypeScript source
│   ├── lexer.ts             # Tokenizer
│   ├── parser.ts            # Parser (tokens → AST)
│   ├── ast.ts               # AST node definitions
│   ├── interpreter.ts        # Tree-walking interpreter
│   ├── modules.ts           # fs, os, regex, datetime, process, crypto, http
│   ├── game.ts              # 2D game engine
│   └── index.ts             # CLI entry point
├── examples/                # 16 example .bckie files
├── vscode-extension/       # VSCode extension
├── test-suite.js           # 292 standard tests
├── deep-test.js            # 490 deep tests
├── SYNTAX.md               # Syntax reference
├── BUILTINS.md             # Built-in functions reference
├── GAMES.md                # Game engine documentation
├── CHANGELOG.md            # Version history
├── README.md               # English (this file)
├── README.id.md            # Bahasa Indonesia
├── package.json
├── tsconfig.json
├── LICENSE
└── install-bockie.ps1      # Windows installer
```

---

## 🇮🇩 Bahasa Indonesia

### Apa itu Bockie?

Bockie adalah bahasa pemrograman kecil tapi lengkap yang dirancang **mudah ditulis** dan **cukup cepat untuk pekerjaan nyata**. Punya first-class functions, classes, pattern matching, pipeline, REPL interaktif, standard library 100+ builtins, dan game engine 2D yang bisa export HTML standalone.

### Ciri Khas

```bockie
# String interpolation
print("Halo {nama}, umur {umur + 1}")

# Pipeline operator
hasil = 5 |> double |> add_one |> square

# Null coalescing
port = config["port"] ?? 3000

# Spread di list literal
arr2 = [0, ...arr1, 4]

# Match/case
match status:
    case 200:
        print("OK")
    default:
        print("Unknown")

# Repeat loop dengan index
repeat 5 times i:
    print("Iterasi {i}")

# Walrus assignment di dalam ekspresi
if (n := get_value()) > 5:
    print("gede: {n}")

# Power operator
print(2 ** 10)

# Slicing
print(s[1:5])

# Global / nonlocal untuk closures
count = 0
def inc():
    global count
    count += 1

# Higher-order builtins terima KEDUA urutan argumen (ciri khas v3.2.2)
data = [{"score": 10}, {"score": 20}, {"score": 30}]
print(map(data, lambda x: x["score"]))   # [10, 20, 30]  ← iterable dulu
print(map(lambda x: x["score"], data))   # [10, 20, 30]  ← function dulu (gaya Python)
```

### Highlight v3.2.2

#### 🐛 Bug fix: `map`/`filter`/`reduce` "object is not callable"

Di v3.2.1, manggil `map(data, lambda x: x["score"])` (iterable dulu) nge-throw `Runtime Error: object is not callable`. Implementasinya ngasumsiin function selalu di argumen pertama. **Sudah difix di v3.2.2** — semua higher-order collection builtin sekarang nerima kedua urutan argumen. Lihat [CHANGELOG.md](CHANGELOG.md) untuk analisis root-cause lengkap.

#### ✨ Builtin baru

| Builtin | Apa fungsinya |
|---------|---------------|
| `flat_map(fn, iter)` | Map + flatten satu level (Haskell `concatMap`) |
| `each(fn, iter)` | Iterasi untuk side effect, return None (lebih cepat dari `map` + discard) |
| `partition(fn, iter)` | Pecah jadi tuple `[passed, failed]` |
| `tap(value, fn)` | Pipeline debug helper — panggil `fn(value)`, return `value` tanpa diubah |

```bockie
print(flat_map(lambda x: [x, x*10], [1,2,3]))   # [1, 10, 2, 20, 3, 30]
each([1,2,3], lambda x: print("dapat {x}"))     # dapat 1 / dapat 2 / dapat 3 (return None)
genap, ganjil = partition(lambda x: x%2==0, [1,2,3,4,5])
# genap = [2, 4], ganjil = [1, 3, 5]
hasil = 5 |> tap(print) |> double |> tap(print)   # print 5, lalu 10
```

### Install

```bash
git clone https://github.com/gagadeb11116677/bockie-languange.git
cd bockie-languange
npm install
npm run build

# Verifikasi
node dist/index.js --version
node test-suite.js   # 292 passed, 0 failed
node deep-test.js    # 490 passed, 0 failed
```

#### Windows

```powershell
powershell -ExecutionPolicy Bypass -File install-bockie.ps1
```

#### VSCode Extension

Copy folder `vscode-extension/` ke:
- **Windows:** `%USERPROFILE%\.vscode\extensions\bockie-3.0.0\`
- **Linux/Mac:** `~/.vscode/extensions/bockie-3.0.0\`

Restart VSCode. Buka file `.bckie` → syntax highlighting + snippets + F5 run.

### Quick Start

```bockie
print("Halo, Bockie!")

nama = "Bockie"
print("Halo {nama}!")

def double(x):
    return x * 2

for i in range(5):
    print("{i}: {double(i)}")
```

Run file:
```bash
bockie hello.bckie
```

REPL:
```bash
bockie
```

### CLI Commands

```bash
bockie                  # REPL
bockie file.bckie       # Run file
bockie run file.bckie   # Alternatif
bockie -e "code"        # Inline code (mendukung \n)
bockie --help
bockie --version
bockie --examples
bockie --modules
```

### Dokumentasi

| File | Deskripsi |
|------|-----------|
| [SYNTAX.md](SYNTAX.md) | Reference syntax lengkap: variables, operators, control flow, classes, match/case, pipeline, global/nonlocal |
| [BUILTINS.md](BUILTINS.md) | Reference 100+ built-in functions: I/O, math, string, list, dict, fs, os, regex, crypto, http, json |
| [GAMES.md](GAMES.md) | Dokumentasi game engine: canvas API, screen API, animation, color, input, export |
| [CHANGELOG.md](CHANGELOG.md) | Riwayat perubahan per versi |

### Built-in Modules

| Module | Deskripsi |
|--------|-----------|
| `game` | 2D game engine (ASCII + HTML5 canvas, export ke standalone HTML) |
| `fs` | File system: read, write, list, mkdir, copy, CSV |
| `os` | OS info: name, arch, home, env, cpus, memory |
| `regex` | Pattern matching: match, find, replace, split |
| `datetime` | Date/time: year, month, day, format, parse |
| `process` | Subprocess: shell, shell_silent |
| `crypto` | Hashing: md5, sha256, sha512, base64, uuid, hmac, XOR |
| `http` | HTTP client: get, post |
| `json` | JSON encode/decode |

### Game Engine

Bikin game 2D, export ke standalone HTML yang jalan di browser mana aja:

```bockie
import game

canvas = game.canvas_create(640, 360)
game.canvas_title(canvas, "Game Saya")
game.canvas_set_fps(canvas, 30)

for frame in range(60):
    game.canvas_clear(canvas, "#0a0a0a")
    game.canvas_circle(canvas, 100 + frame * 5, 180, 20, "#ff5555", true)
    game.canvas_next_frame(canvas)

game.canvas_save_game(canvas, "game.html")
```

Lihat [GAMES.md](GAMES.md) untuk dokumentasi lengkap.

### Contoh

| File | Deskripsi |
|------|-----------|
| `hello.bckie` | Hello World |
| `fibonacci.bckie` | Recursive Fibonacci |
| `fizzbuzz.bckie` | Classic FizzBuzz |
| `string_interp.bckie` | Demo string interpolation |
| `pipeline.bckie` | Pipeline, spread, null coalesce |
| `ciri_khas.bckie` | Match/case, repeat, unless, walrus, power, slicing |
| `classes.bckie` | OOP: class, inheritance, __str__ |
| `sysinfo.bckie` | Dashboard system info |
| `crypto_demo.bckie` | Caesar cipher + hashing |
| `features_demo.bckie` | Semua fitur dalam satu file |
| `animated_ball.bckie` | Bola bouncing animated (HTML5) |
| `animated_snake.bckie` | Game snake animated (HTML5) |
| `breakout.bckie` | Game breakout dengan bricks |
| `particles.bckie` | Ledakan partikel |
| `solar_system.bckie` | Animasi tata surya |
| `canvas_snake.bckie` | Snake static HTML |

### Develop

```bash
npm install      # Install deps
npm run build   # Compile TS → dist/
npm run dev      # Watch mode
node test-suite.js   # Run 292 tests
node deep-test.js    # Run 490 deep tests
```

### Struktur Project

```
bockie/
├── src/                     # Source TypeScript
│   ├── lexer.ts             # Tokenizer
│   ├── parser.ts            # Parser (tokens → AST)
│   ├── ast.ts               # Definisi AST node
│   ├── interpreter.ts        # Tree-walking interpreter
│   ├── modules.ts           # fs, os, regex, datetime, process, crypto, http
│   ├── game.ts              # 2D game engine
│   └── index.ts             # CLI entry point
├── examples/                # 16 contoh .bckie
├── vscode-extension/       # VSCode extension
├── test-suite.js           # 292 standard tests
├── deep-test.js            # 490 deep tests
├── SYNTAX.md               # Reference syntax
├── BUILTINS.md             # Reference built-in functions
├── GAMES.md                # Dokumentasi game engine
├── CHANGELOG.md            # Riwayat versi
├── README.md               # English
├── README.id.md            # Bahasa Indonesia
├── package.json
├── tsconfig.json
├── LICENSE
└── install-bockie.ps1      # Installer Windows
```

---

## Author

**xobe**

GitHub: https://github.com/gagadeb11116677/bockie-languange

---

If you like Bockie, give it a ⭐ on GitHub.
