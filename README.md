# Bockie v3.3.1

> A general-purpose programming language with a built-in 2D game engine.

Built from scratch in TypeScript. Runs on Node.js. **918 tests passing (292 standard + 626 deep), 0 failures.** Powered by **KoinaHash v3.0** (Robin Hood + hash cache + combined state/PSL) + **juice-pol** module (38+ beginner helpers).

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

### v3.3.1 Highlights

#### Fixed — Adaptive resize 1.5× now actually happens

User investigation found that the v3.2.8 claim "1.5× growth above 1M entries" was broken: `nextPow2(capacity * 1.5)` always rounded up to the next power of 2, producing 2× growth regardless of the 1.5× factor.

**Root cause:** Power-of-2 capacity is required for `hash & mask` indexing (fast). `nextPow2(2^20 × 1.5)` = `nextPow2(1,572,864)` = `2^21` = 2,097,152 — which is 2× growth, not 1.5×.

**Fix:** For dicts above 1M entries, accept non-power-of-2 capacities and switch to `hash % capacity` (modulo) indexing. Slower per lookup but produces **exactly 1.5× growth**.

```bockie
info = koina_info()
print(info["version"])               # 3.0.1
print(info["resize_policy"])           # adaptive_1.5x_above_1m_pow2_below

d = {}
for i in range(3000000):
    d[str(i)] = i

stats = dict_stats(d)
print(stats["adaptive_resizes"])       # 2 (fired twice above 1M)
print(stats["pow2_resizes"])            # 17 (before reaching 1M)
print(stats["is_pow2_capacity"])        # False (current capacity is non-pow2)
print(stats["version"])                  # 3.0.1
print(stats["algorithm"])                # robin_hood_v3_0_1
```

**Verified on 3M-entry workload:**
- Size 1,572,865: capacity 2,097,152 → 3,145,728 (**1.500× exactly**, non-pow2)
- Size 2,359,297: capacity 3,145,728 → 4,718,592 (**1.500× exactly**, non-pow2)

**Memory win at the 1M threshold:** v3.3.0 (broken) grew to 2M slots, v3.3.1 grows to 1.5M slots — **19% less peak RSS** at 1M entries. Savings compound to ~25% at 30M entries.

#### Trade-off

Modulo indexing (`hash % capacity`) is slower than mask indexing (`hash & mask`) on most CPUs. The 1.5× path only fires for dicts above 1M entries, where the memory savings outweigh the per-lookup cost. Small dicts (the common case) stay on the pow2 fast path.

See [CHANGELOG.md](CHANGELOG.md) for the full v3.3.1 writeup.

### v3.3.0 Highlights

#### KoinaHash v3.0 — Hash cache + combined state/PSL

**1. Adaptive hash caching.** `get` / `has` / `delete` now look up the key's hash in an internal `Map<string, number>` before computing FNV-1a + avalanche. Cache hits skip the entire hash computation. The cache is bypassed for short keys (≤8 chars), where `Map.get` overhead exceeds the cost of direct hashing.

Benchmarked **33% faster lookups** on the second pass through a 200k-entry dict with long (≥14 char) keys. Cache hit rate: 75% on repeated access.

**2. Combined state + PSL into single `Uint8Array`.** Each slot now uses one byte: high bit = state (empty/occupied/tombstone), low 7 bits = probe-sequence length. Per-slot memory: 26 → **22 bytes** (~15% reduction).

**3. Load factor raised from 0.7 to 0.75.** Robin Hood hashing tolerates higher density because probe variance is bounded. Same hash function, same collision count, capacity grows later.

**4. Insert path skips cache.** `set()` calls `hashKeyRaw()` directly — a new key is guaranteed to miss the cache, so the `Map.get` lookup is pure overhead on insert.

#### New builtin: `dict_from_pairs(pairs)`

```bockie
pairs = [("a", 1), ("b", 2), ("c", 3)]
d = dict_from_pairs(pairs)
print(d["a"], d["b"], d["c"])   # 1 2 3
```

#### Performance

| Workload | v3.2.8 | v3.3.0 |
|----------|--------|--------|
| 1M short-key insert | 818 ms | 925 ms |
| 1M short-key lookup | 527 ms | 562 ms |
| 200k long-key lookup (cold) | 209 ms | 209 ms |
| 200k long-key lookup (hot) | 209 ms | **139 ms** (33% faster) |
| Max probe (10M entries) | 78 | **10** |
| Memory per slot | 26 bytes | **22 bytes** |

#### Hash cache introspection

```bockie
info = koina_info()
print(info["version"])                # 3.0.0
print(info["hash_function"])           # fnv1a_avalanche_cached
print(info["hash_cache_enabled"])       # True
print(info["memory_per_slot_bytes"])    # 22

d = {}
for i in range(1000):
    d["user_token_" + str(i)] = i
stats = dict_stats(d)
print(stats["hash_cache_hits"])        # 0
print(stats["hash_cache_misses"])      # 1000
print(stats["hash_cache_hit_rate"])    # 0.0

# After lookups, cache warms up
for i in range(1000):
    v = d["user_token_" + str(i)]
stats = dict_stats(d)
print(stats["hash_cache_hits"])        # 1000
print(stats["hash_cache_hit_rate"])    # 0.5
```

See [CHANGELOG.md](CHANGELOG.md) for the full v3.3.0 writeup.

### v3.2.8 Highlights

#### 🚀 KoinaHash v2.1.2 — Deep Optimizations

**1. Adaptive resize factor** — Dict besar (>1M entries) grow 1.5× instead of 2×. Hemat ~25% memory.

**2. `dict_bulk_insert(d, pairs)`** — Insert banyak entries sekaligus. 1M entries: 1 rehash instead of 20.

**3. `dict_merge(d1, d2)`** — Combine two dicts in-place.

**4. `dict_keys_array` / `dict_values_array` / `dict_entries_array`** — Return plain arrays, skip generator overhead. 2-3× faster for hot loops.

#### ✨ juice-pol Module — 35+ Beginner Helpers

Module baru dengan 35+ helper ramah pemula:

```bockie
# Color & style
print(juice_red("Error!"))
print(juice_green("OK!"))
print(juice_rainbow("Hello World!"))
print(juice_bold("Bold text"))

# Boxes & alerts
print(juice_box("Hello, World!"))
print(juice_success("Profile loaded!"))
print(juice_error("Failed to load!"))
print(juice_warn("Be careful!"))
print(juice_info("FYI"))

# Tables & charts
print(juice_table(["Name", "Score"], [["Alice", 95], ["Bob", 87]]))
print(juice_bar_chart(["Mon", "Tue", "Wed"], [3, 7, 5], 25))
print(juice_menu("Main Menu", ["New", "Load", "Exit"]))

# Progress & spinner
print(juice_progress(7, 10, 30))   # [██████████░░░░░░░░░░] 70.0% (7/10)
print(juice_spinner(0))              # ⠋

# Formatters
print(juice_format_money(1500000, "Rp", 0))   # Rp 1.500.000
print(juice_format_bytes(1073741824))           # 1.00 GB
print(juice_format_time(3661))                  # 01:01:01
print(juice_format_number(1234567.891, 2))     # 1.234.567,89

# Banners & headers
print(juice_banner("Welcome"))
print(juice_header("Section Title", 50))
print(juice_step(2, 5, "Building..."))

# Date/time
print(juice_now())    # 2026-09-18 12:34:56
print(juice_date())   # 2026-09-18
print(juice_time())    # 12:34:56
```

#### 📊 Performance Benchmarks

| Workload | v3.2.7 | v3.2.8 | Improvement |
|----------|--------|--------|-------------|
| 10M dict + 10M lookup | 22.8s | **20.2s** | **11% faster** |
| 1M bulk_insert vs 1M set() | N/A | 1 rehash vs 20 rehashes | **20× fewer rehashes** |
| dict_keys_array vs dict_keys | generator overhead | direct array | **2-3× faster** |
| Memory (10M with adaptive resize) | 935 MB | ~880 MB | **~6% less** |

See [CHANGELOG.md](CHANGELOG.md) for the full v3.2.8 writeup.

### v3.2.7 Highlights

#### 🚀 KoinaHash v3.0 — Robin Hood Hashing + KoinPooler


**Three architectural changes:**

1. **Robin Hood Hashing** — Each entry tracks its PSL (probe sequence length). On insert, if the new entry has a longer probe than an existing one, **swap them**. The "rich" entry (short probe) gives up its slot to the "poor" entry (long probe). Result: max probe across all entries stays low.

   - 10M entries: max probe **78 → 10** (7.8× lower)
   - 20M entries: max probe **84 → 10** (8.4× lower)
   - Bonus: lookup early-terminates when probe > existing PSL → faster misses

2. **Auto-compaction on resize** — When load factor exceeds 0.7, v3.2.7 checks if tombstones > 50% of size. If yes, compact (reclaim tombstones). If no, double capacity. Workloads with delete-insert churn no longer grow unboundedly.

3. **KoinPooler** (new module `src/koin_pooler.ts`) — Object pool for `BList` and `BDict` instances. Instead of allocating + GC'ing temporary values, acquire from pool and release back. Reduces memory pressure spikes.

#### ✨ New Builtins (5 new functions)

```bockie
# Inspect pool state — see reuse rates + memory in real time
stats = koin_pool_stats()
print(stats["list_reuses"])        # how many list allocations saved
print(stats["dict_reuses"])        # how many dict allocations saved
print(stats["total_saved_bytes"])  # cumulative memory saved
print(stats["rss_mb"])             # process RSS in MB
print(stats["heap_used_mb"])       # V8 heap used in MB

# Acquire pooled list/dict (reuse if available, else allocate)
l = koin_pool_acquire_list()
d = koin_pool_acquire_dict()

# Release back to pool (don't let GC collect — reuse instead)
koin_release(l)
koin_release(d)

# Reset pool (clear all cached objects)
koin_pool_reset()
```

#### 📊 Performance Benchmarks

| Workload | v3.2.6 | v3.2.7 | Improvement |
|----------|--------|--------|-------------|
| 10M dict + 10M lookup | 21.5s, max probe 78 | **22.8s, max probe 10** | Max probe **7.8× lower** |
| 20M dict + 5M delete + compact | 42.5s | **44.6s, max probe 10** | Max probe **8.4× lower** |
| Memory on 10M (peak RSS) | 950 MB | **935 MB** | Slight reduction |

#### ⚠️ Note on 30M+ Workloads

Workloads at 30M+ still require `node --max-old-space-size=8192+` because the Bockie values themselves (string keys + numbers) consume ~50 bytes each — that's 1.5 GB just for values, beyond V8's default heap. KoinPooler reduces churn but cannot eliminate the baseline storage cost which is inherent to the data itself.

See [CHANGELOG.md](CHANGELOG.md) for the full v3.2.7 writeup with root-cause analysis.

### v3.2.6 Highlights

#### 🐛 Bug Fix: High collisions + OOM at 30M

**User-reported:** 10M dict had 26.9M collisions (2.7× per entry), 30M test OOM-crashed.

**Root causes:**
1. FNV-1a has poor bit distribution for sequential string keys ("0", "1", ..., "9999999")
2. KoinaHash v2.0 used 6 parallel arrays per slot (~29 bytes) — 30M entries × 64M capacity = 1.86 GB just for hash table

#### 🚀 KoinaHash v2.1 — Three Architectural Improvements

**1. Avalanche-mixed hash function**

Added MurmurHash3-style finalizer to FNV-1a. Collisions on 10M sequential keys dropped from **26.9M → 7.4M** (3.65× reduction).

**2. Single `_order` array (50% tracking memory reduction)**

Replaced doubly-linked-list (`_next` + `_prev` = 8 bytes/slot) with single `_order: Uint32Array` (4 bytes/slot). Per-slot memory: 29 → **25 bytes**.

**3. Tombstone compaction**

New `compact()` method rebuilds the table in-place when tombstones outnumber live entries. No more wasteful capacity doubling on delete-insert churn workloads.

#### ✨ New Builtins: `dict_compact()` + `dict_reserve(n)`

```bockie
# Pre-allocate capacity — eliminates all rehashes during bulk insertion
d = {}
dict_reserve(d, 10000000)  # reserve for 10M entries
for i in range(10000000):
    d[str(i)] = i  # 0 rehashes during this loop

# Manual compaction after bulk deletes
for i in range(5000000):
    del d[str(i)]
dict_compact(d)  # 5M tombstones → 0, capacity may shrink
```

`dict_reserve(n)` is the **single biggest perf win** for large workloads — 10M test went from 20 rehashes → 1 rehash.

#### 📊 Performance Benchmarks

| Workload | v3.2.5 | v3.2.6 | Improvement |
|----------|--------|--------|-------------|
| 10M dict + 10M lookup | ~15s, 27M collisions, 20 rehashes | **21.5s, 7.4M collisions, 1 rehash** | Collisions **3.65×** less, rehashes **20×** less |
| 20M dict + 5M delete + compact | OOM crash | **42.5s** | New capability |
| Memory per slot | 29 bytes | **25 bytes** | **14% reduction** |

#### ⚠️ Running 30M+ Workloads

The 30M test requires `node --max-old-space-size=12288` because Bockie values themselves consume ~50 bytes each (30M × 50 = 1.5 GB just for values). This is a JS runtime limit, not KoinaHash.

```bash
# 10M+ entries
node --max-old-space-size=4096 dist/index.js run script.bckie

# 20M+ entries
node --max-old-space-size=8192 dist/index.js run script.bckie

# 30M+ entries
node --max-old-space-size=12288 dist/index.js run script.bckie
```

Always use `dict_reserve(d, N)` upfront — eliminates rehash overhead entirely.

See [CHANGELOG.md](CHANGELOG.md) for the full v3.2.6 writeup with root-cause analysis.

### v3.2.5 Highlights

#### 🧹 Code Cleanup: No more AI-style comments


#### 🚀 KoinaHash v2.0 — Cleaner, More Stats

Rewrote `src/koina-hash.ts` from scratch (~260 lines, down from ~350). Same algorithm (open addressing + linear probing + tombstones), but cleaner structure and **8 stats exposed** (was 6):

```bockie
info = koina_info()
print(info["name"])                # KoinaHash
print(info["version"])             # 2.0.0
print(info["hash_function"])       # FNV-1a 32-bit
print(info["collision_strategy"])  # open_addressing
print(info["deletion_strategy"])   # tombstone
print(info["resize_policy"])        # power_of_2_at_load_factor_0.75
print(info["probe_sequence"])      # linear
print(info["memory_layout"])       # parallel_arrays

d = {}
for i in range(1000):
    d[str(i)] = i * 2
stats = dict_stats(d)
print(stats["maxProbe"])    # longest probe sequence seen
print(stats["robinSwaps"])   # 0 (reserved for future Robin Hood insertion)
print(stats["algorithm"])    # open_addressing
```

#### 📊 Performance

- 5M dict insertions + 5M lookups → **9.4s** (was 16.8s in v3.2.4)
- 5M insert + 2.5M delete + 2.5M lookup + 1M map+dict access → **18.3s** end-to-end
- 836 tests still pass (292 standard + 544 deep), 0 failures

See [CHANGELOG.md](CHANGELOG.md) for the full v3.2.5 writeup.

### v3.2.4 Highlights

#### 🚀 New Architecture: KoinaHash — Bockie's custom hash map

Bockie v3.2.4 introduces **KoinaHash**, a custom hash map built from scratch in `src/koina-hash.ts`. All `BDict` instances now use KoinaHash instead of JavaScript's `Map`.

**Why KoinaHash instead of Map?**

- **5× faster** on dict-heavy workloads (1M insertions: 95ms vs 480ms)
- **3× less RAM** (5M entries: 95MB vs 280MB peak)
- **Open addressing + linear probing** — cache-friendly, no pointer chasing
- **FNV-1a 32-bit hash** — fast for short ASCII strings (Bockie's main use case)
- **Power-of-2 sizing** — `hash & mask` instead of `hash % capacity`
- **Tombstone-based deletion** — O(1) delete, no rehash
- **Insertion-order iteration** — matches Map behavior
- **Built-in statistics** — `dict_stats()` exposes collisions, rehashes, tombstones, load factor

```bockie
# Inspect KoinaHash internal stats — ciri khas Bockie v3.2.4
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
print(stats["collisions"])   # number of probe sequences
print(stats["rehashes"])      # how many times table was resized
```

#### 🐛 Bug fix #3: `del d["key"]` now works

Previously `del d["key"]`, `del lst[i]`, and `del obj.attr` were silently no-op (only `del identifier` was handled). Now all three target types are supported:

```bockie
d = {"a": 1, "b": 2, "c": 3}
del d["b"]
print(len(d))   # 2 (was: 3, bug)

lst = [10, 20, 30, 40]
del lst[1]
print(lst)      # [10, 30, 40]
```

See [CHANGELOG.md](CHANGELOG.md) for the full KoinaHash architecture writeup + benchmark tables.

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
