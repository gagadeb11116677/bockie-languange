# Bockie v3.2.2

> Bahasa pemrograman general-purpose dengan built-in 2D game engine.

Dibikin dari nol pakai TypeScript. Jalan di atas Node.js. **782 tests passing (292 standard + 490 deep), 0 failures.**

---

## 🌐 Bahasa / Language

- 🇮🇩 **Bahasa Indonesia** — kamu di sini
- 🇬🇧 **English** — lihat [README.md](README.md)

---

## Apa itu Bockie?

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

Di v3.2.1, manggil `map(data, lambda x: x["score"])` (iterable dulu) nge-throw `Runtime Error: object is not callable`. Implementasinya ngasumsiin function selalu di argumen pertama. **Sudah difix di v3.2.2** — semua higher-order collection builtin sekarang nerima kedua urutan argumen.

**Root cause lengkap** (dari [CHANGELOG.md](CHANGELOG.md)):

Di v3.2.1, `map`/`filter`/`reduce` ngasumsiin `fn` selalu argumen pertama:

```bockie
# Ini jalan di v3.2.1:
map(lambda x: x["score"], data)

# Ini error "object is not callable":
map(data, lambda x: x["score"])
```

Waktu user nulis `map(data, lambda x: ...)`, implementasi nge-treat list sebagai function dan lambda sebagai iterable. List ga punya `__type: 'function'`, jadi fast-path check gagal, jatuh ke `callFunction(list, [item])`, dan throw **"object is not callable"**.

**Fix:** Semua higher-order collection builtin sekarang nerima **kedua** urutan argumen, sama kayak yang udah `groupby`/`max_by`/`min_by` lakuin sebelumnya:

```bockie
# Kedua bentuk equivalen di v3.2.2:
map(fn, iterable)     # bentuk Python/Haskell
map(iterable, fn)     # bentuk gaya bahasa Inggris ("map over data, do X")

# Sama juga untuk: filter, reduce, flat_map, each, partition,
#                  find, find_index, count
```

Ini sekarang **ciri khas Bockie**: functional primitives ga pernah nyiksa user soal urutan argumen.

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
├── README.id.md            # Bahasa Indonesia (file ini)
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

Kalau lo suka Bockie, kasih ⭐ di GitHub.
