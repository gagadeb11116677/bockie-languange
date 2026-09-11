# Bockie v3.2.4

> Bahasa pemrograman general-purpose dengan built-in 2D game engine.

Dibikin dari nol pakai TypeScript. Jalan di atas Node.js. **836 tests passing (292 standard + 544 deep), 0 failures.** Ditenagai **KoinaHash** — hash map custom buatan Bockie (5× lebih cepat, 3× lebih hemat RAM dari JS Map).

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

### Highlight v3.2.4

#### 🚀 Arsitektur Baru: KoinaHash — hash map custom buatan Bockie

Bockie v3.2.4 ngeluarin **KoinaHash**, hash map custom yang dibikin dari nol di `src/koina-hash.ts`. Semua instance `BDict` sekarang pakai KoinaHash, bukan JavaScript `Map` standar.

**Kenapa KoinaHash, bukan Map?**

- **5× lebih cepat** di workload dict-heavy (1M insertion: 95ms vs 480ms)
- **3× lebih hemat RAM** (5M entries: 95MB vs 280MB peak)
- **Open addressing + linear probing** — cache-friendly, gak ada pointer chase
- **FNV-1a 32-bit hash** — cepat untuk short ASCII string (kasus utama Bockie)
- **Power-of-2 sizing** — `hash & mask` bukan `hash % capacity`
- **Tombstone-based deletion** — O(1) delete, tanpa rehash
- **Insertion-order iteration** — sama kayak Map
- **Built-in statistics** — `dict_stats()` expose collisions, rehashes, tombstones, load factor

```bockie
# Liat statistik internal KoinaHash — ciri khas Bockie v3.2.4
info = koina_info()
print(info["name"])               # KoinaHash
print(info["hash_algorithm"])     # FNV-1a 32-bit
print(info["collision_strategy"]) # linear_probing

d = {}
for i in range(1000):
    d[str(i)] = i * 2

stats = dict_stats(d)
print(stats["size"])         # 1000
print(stats["capacity"])     # 2048
print(stats["load_factor"])  # 0.488
print(stats["collisions"])   # jumlah probe sequence
print(stats["rehashes"])      # berapa kali table di-resize
```

#### 🐛 Bug fix #3: `del d["key"]` sekarang jalan

Sebelumnya `del d["key"]`, `del lst[i]`, dan `del obj.attr` silently no-op (cuma `del identifier` yang di-handle). Sekarang semua 3 target type di-support:

```bockie
d = {"a": 1, "b": 2, "c": 3}
del d["b"]
print(len(d))   # 2 (sebelumnya: 3, bug)

lst = [10, 20, 30, 40]
del lst[1]
print(lst)      # [10, 30, 40]
```

Lihat [CHANGELOG.md](CHANGELOG.md) untuk analisis arsitektur KoinaHash lengkap + tabel benchmark.

### Highlight v3.2.3

#### 🐛 Bug fix #1: `game.key_wait()` sekarang jalan di Windows PowerShell

Di v3.2.2, `key_wait()` langsung balik `""` di Windows PowerShell karena `fs.readSync(0, ...)` gak nge-block tanpa raw mode. **Sudah difix di v3.2.3** pake three-tier fallback: Unix TTY raw-mode read (Tier 1) → Windows PowerShell `[Console]::ReadKey()` (Tier 2) → generic line-mode fallback (Tier 3).

```bockie
import game
print("Tekan tombol apa saja...")
key = game.key_wait()   # ← sekarang nge-block di Windows juga
print("Tombol: {key}")
```

#### 🐛 Bug fix #2: Mutable closure state — auto-mutation

Di v3.2.2, ini baliknya `1, 1, 1` bukannya `1, 2, 3`:

```bockie
def make_counter(start):
    count = start
    def increment():
        count = count + 1   # ← dulu bikin local baru, bukan update outer
        return count
    return increment

c = make_counter(0)
print(c(), c(), c())   # v3.2.2: 1, 1, 1   ✅ v3.2.3: 1, 2, 3
```

**Fix:** `Environment.set()` sekarang auto-mutate variable di enclosing function scope (gaya JavaScript) bukan bikin local shadow. Keyword `nonlocal`/`global` masih jalan buat kontrol eksplisit.

#### ✨ 12 builtin baru ramah pemula

```bockie
# Helper list
print(first([10, 20, 30]))              # 10  (atau default kalau kosong)
print(last("hello"))                     # "o"
print(is_empty([]))                      # True
print(window([1,2,3,4,5], 3))            # [[1,2,3], [2,3,4], [3,4,5]]

# Helper fungsional
print(take_while(lambda x: x < 3, [1,2,3,4]))   # [1, 2]
print(drop_while(lambda x: x < 3, [1,2,3,4]))   # [3, 4]
print(sum_of(lambda x: x*x, [1,2,3]))            # 14 (1+4+9)
print(repeat_list(0, 5))                          # [0, 0, 0, 0, 0]

# Helper input (validasi + retry, gak perlu try/except)
umur = input_int("Umur lo: ")
harga = input_num("Harga: ")
if confirm("Lanjut? "): print("ok")
pause("Tekan Enter...")
```

Analisis root-cause lengkap: [CHANGELOG.md](CHANGELOG.md).

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
