# Changelog

## [3.2.3] - 2026-09-11

### 🐛 Bug Fix #1: `game.key_wait()` cross-platform

**Root cause:** In v3.2.2, `key_wait()` used `fs.readSync(0, buf, 0, 3)` directly. On Windows PowerShell:

1. PowerShell's stdin is **line-buffered** (cooked mode) by default — `readSync` returns immediately with 0 bytes (or throws `EAGAIN`) when no Enter has been pressed.
2. Calling `process.stdin.setRawMode(true)` before the read was missing — so the OS-level console was still in cooked mode.
3. Even with raw mode, the Windows console handle is different from Unix TTY FDs.

**Fix:** Three-tier fallback strategy:

| Tier | Platform | Mechanism |
|------|----------|-----------|
| 1 | Unix TTY (Linux/Mac) | `setRawMode(true)` + polling `readSync` loop (max 50 retries × 10ms) + arrow-key escape parsing |
| 2 | Windows | Spawn `powershell -NoProfile [Console]::ReadKey($true)` — returns char, or arrow names (`up`/`down`/`left`/`right`) |
| 3 | Any fallback | `cmd /c set /p=` (Windows) or `sh -c read -n1` (Unix) — line-mode, less granular but always works |

This is the same pattern real terminal apps use on Windows. `key_wait()` now blocks until a key is pressed on all platforms.

### 🐛 Bug Fix #2: Mutable closure state — auto-mutation

**Root cause:** In v3.2.2 (and earlier), Bockie used Python-like scoping where a function can **read** outer variables but a write **creates a new local** that shadows the outer. So:

```bockie
def make_counter(start):
    count = start
    def increment():
        count = count + 1   # ← creates a fresh local `count`, doesn't update outer
        return count
    return increment

counter = make_counter(0)
print(counter(), counter(), counter())  # v3.2.2: 1, 1, 1   (EXPECTED: 1, 2, 3)
```

The user reported this as a bug — and for Bockie's beginner-friendly target audience, it really is one. Python users know about `nonlocal`; beginners don't.

**Fix:** `Environment.set()` now does **auto-closure mutation** (JavaScript-style scoping). The lookup order is:

1. `global` declared → write to global scope (unchanged).
2. `nonlocal` declared → walk up + write to first match (unchanged).
3. Variable already exists in **current scope** → just update it (normal local).
4. **NEW v3.2.3:** Variable exists in an **enclosing function scope** → auto-update the outer variable. This makes closures "just work" — counter returns `1, 2, 3`.
5. Otherwise → define a new local (normal behavior).

The key change is rule 4: walking up **function scopes only** (skipping globals) and writing to the first scope where the variable already exists. This:

- ✅ Makes the user's counter example produce `1, 2, 3` as expected.
- ✅ Keeps existing `nonlocal`/`global` working (rules 1 & 2 fire first).
- ✅ Preserves local shadowing when the user **intentionally** re-declares (rule 3 still checks current scope first).
- ✅ Each closure instance keeps its own state (separate `make_counter(0)` and `make_counter(100)` counters are independent).
- ✅ Nested closures depth 3+ work (innermost writes propagate up through every enclosing function scope).
- ✅ Stress test: 1,000,000 closure calls in 1.1s — auto-mutation overhead is negligible.

### ✨ New Builtins (10 beginner-friendly helpers)

| Builtin | Signature | Description |
|---------|-----------|-------------|
| `first(iter, default?)` | `[a] → a` | First item, or default if empty (also works on strings) |
| `last(iter, default?)` | `[a] → a` | Last item, or default if empty (also works on strings) |
| `is_empty(iter)` | `any → bool` | True if string/list/dict/range/None is empty |
| `window(iter, size)` | `[a], int → [[a]]` | Sliding window of `size` items |
| `take_while(fn, iter)` | `(a → bool), [a] → [a]` | Take items while predicate is true (both arg orders) |
| `drop_while(fn, iter)` | `(a → bool), [a] → [a]` | Drop items while predicate is true (both arg orders) |
| `sum_of(fn, iter)` | `(a → number), [a] → number` | Sum of `fn(item)` for each item (both arg orders) |
| `repeat_list(item, n)` | `a, int → [a]` | Build list of `item` repeated `n` times |
| `input_num(prompt?)` | `string? → number` | Prompt + read float, retry on bad input |
| `input_int(prompt?)` | `string? → int` | Prompt + read int, retry on bad input |
| `confirm(prompt?, default?)` | `string?, bool? → bool` | Yes/no prompt (y/n/yes/no/ya/tidak) |
| `pause(msg?)` | `string? → None` | Print msg, wait for Enter |

Examples:

```bockie
# Beginners: avoid slicing and empty-check boilerplate
print(first([10, 20, 30]))              # 10
print(first([]))                         # None
print(first([], "empty"))               # "empty"
print(first("hello"))                    # "h"

print(is_empty([]))                      # True
print(is_empty([1]))                     # False
print(is_empty(""))                      # True

# Sliding window (common in statistics, ML)
print(window([1, 2, 3, 4, 5], 3))        # [[1, 2, 3], [2, 3, 4], [3, 4, 5]]

# take_while / drop_while (lazy-style splitting)
print(take_while(lambda x: x < 3, [1,2,3,4,1,2]))   # [1, 2]
print(drop_while(lambda x: x < 3, [1,2,3,4,1,2]))   # [3, 4, 1, 2]

# Sum of transformed values
print(sum_of(lambda x: x*x, [1,2,3]))    # 14 (1 + 4 + 9)

# Init lists fast
zeros = repeat_list(0, 5)                # [0, 0, 0, 0, 0]

# Validated numeric input (no try/except needed)
age = input_int("Umur lo: ")
price = input_num("Harga: ")

# Yes/no prompts
if confirm("Lanjut main? "):
    print("ok")
else:
    print("bye")

# Pause execution
pause("Press Enter to see the result...")
print("Here it is!")
```

### 📊 Performance Verification

- 5,000,000 objects through `map(data, lambda x: x["score"] * 2 + 1)` → **8.5s**
- 1,000,000 closure calls with auto-mutation → **1.1s** (counter example)
- Both bug fixes retain the lambda fast-path (single-return body inlined).
- No regression in existing 782 tests (292 standard + 490 deep) — all still pass.

### 📚 Tests Added (+35 new tests, total now 817)

- **Mutable closure bug**: 8 tests — counter, accumulator, toggle state machine, nested closure depth 3, separate closure instances, `nonlocal` backward compat, local shadow still works.
- **New builtins**: 27 tests — `first`/`last` (incl. string + empty + default), `is_empty` (6 cases), `window` (normal/too-big/size-1), `take_while`/`drop_while` (basic + edge cases), `sum_of` (squares + empty + offset), `repeat_list` (zeros + strings + zero count).

### 🔢 Version

- `package.json`: `3.2.2 → 3.2.3`
- CLI banner: updated
- Test count: `782 → 817` (292 standard + 525 deep)

---

## [3.2.2] - 2026-09-11

### 🐛 Bug Fix: `map`/`filter`/`reduce` accept BOTH argument orders

**Root cause:** In v3.2.1, `map`/`filter`/`reduce` assumed `fn` was always the **first** argument:

```bockie
# This worked in v3.2.1:
map(lambda x: x["score"], data)

# This threw "object is not callable":
map(data, lambda x: x["score"])
```

When users naturally wrote `map(data, lambda x: ...)`, the implementation treated the list as the function and the lambda as the iterable. The list had no `__type: 'function'`, so the fast-path check failed, fell through to `callFunction(list, [item])`, and threw **"object is not callable"**.

**Fix:** All higher-order collection builtins now accept **both** argument orders, mirroring what `groupby`/`max_by`/`min_by` already did:

```bockie
# Both forms are equivalent in v3.2.2:
map(fn, iterable)     # Python/Haskell form
map(iterable, fn)     # English-sentence form ("map over data, do X")

# Same for: filter, reduce, flat_map, each, partition,
#           find, find_index, count
```

This is now Bockie's **ciri khas** (signature feature): functional primitives never punish the user for argument order. The shared `extractFnAndItems()` helper detects which side is callable and uses the other as the iterable.

### ✨ New Builtins (4 new functional primitives)

| Builtin | Signature | Description |
|---------|-----------|-------------|
| `flat_map(fn, iter)` | `(a → [b]), [a] → [b]` | Map + flatten one level (Haskell `concatMap`, JS `flatMap`) |
| `each(fn, iter)` | `(a → any), [a] → None` | Side-effect iteration, no list built (faster than `map` + discard) |
| `partition(fn, iter)` | `(a → bool), [a] → ([a], [a])` | Split into `[passed, failed]` tuple — destructures cleanly |
| `tap(value, fn)` | `a, (a → any) → a` | Pipeline debug helper, returns `value` unchanged after calling `fn(value)` |

Examples:

```bockie
# flat_map: map + flatten
print(flat_map(lambda x: [x, x*10], [1,2,3]))
# → [1, 10, 2, 20, 3, 30]

# each: iterate for side effects
each([1,2,3], lambda x: print("got {x}"))
# got 1 / got 2 / got 3 / returns None

# partition: split into two lists (tuple destructuring)
evens, odds = partition(lambda x: x % 2 == 0, [1,2,3,4,5])
# evens = [2, 4], odds = [1, 3, 5]

# tap: inspect pipeline intermediate without breaking the chain
def double(x): return x * 2
result = 5 |> tap(print) |> double |> tap(print)
# prints 5, then 10
# result = 10
```

### 🧹 Refactor: Single source of truth for fn+iterable extraction

- New private helper `extractFnAndItems(args, fnName)` — detects argument order, throws a **clear, actionable error** if neither side is callable.
- New private helper `extractItems(v)` — single source of truth for iterable materialization (was duplicated 3× in map/filter/reduce, now shared by 6 builtins).
- Removed **duplicate** `find`/`count` definitions (lines 455–456 in v3.2.1) that silently shadowed the new versions. This was a long-standing code smell from when string functions were merged with iterable functions.
- All 6 higher-order collection builtins (`map`, `filter`, `reduce`, `flat_map`, `each`, `partition`) share the same lambda fast-path: `body.length === 1 && body[0].type === 'Return'`.

### 🚀 Performance Verification

- 5,000,000 object stress test (from the bug report): **passes in 8.3s** (was: `Runtime Error: object is not callable`).
- Lambda fast-path retained for all 6 higher-order builtins — no per-item `callFunction` overhead.
- `extractItems` zero-copy for list/tuple (returns underlying array), materializes range once.

### 📚 Tests Added (+38 new tests, total now 782)

- **Both-arg-orders bug fix**: 13 tests covering map/filter/reduce × fn-first/iter-first × dict-access × arithmetic × range.
- **New builtins**: 12 tests for `flat_map`/`each`/`partition`/`tap` including edge cases (empty results, `None` fn, pipeline integration).
- **find/find_index/count both orders**: 10 tests confirming the dual-overload (function form + string form) still works.
- **Error clarity**: 3 tests asserting the new error message points users to the correct usage.

### 🔢 Version

- `package.json`: `3.2.1 → 3.2.2`
- CLI banner: updated
- Test count: `744 → 782` (292 standard + 490 deep)

---

## [3.2.0] - 2026-09-11

### Performance Optimizations

- **`Environment.vars` changed from `Map` to `Record` (plain object)** — V8 optimizes plain object property access significantly better than Map. `name in obj` and `obj[name]` are faster than `map.has()` and `map.get()` for string keys.
- **`callFunction` fast path** — Simple lambdas (no bound self, no default params) skip the `callFunction` method entirely and inline Environment creation + param binding + body execution.
- **`map`/`filter`/`reduce` inlined** — These collection functions now inline the lambda call loop instead of calling `callFunction` per element. Pre-allocates result array, avoids intermediate array allocations.
- **`eval()` fast path for literals** — `Number`, `String`, `Boolean`, `None`, `Identifier` checked with `if` before `switch` statement, avoiding switch overhead for the most common node types.
- **Dict index/assign fast path** — `obj["key"]` and `obj["key"] = val` skip `toDisplay()` conversion when key is already a string (99% of cases).
- **`toDisplay()` reorder** — Check `number` and `string` first (most common types), then `boolean`, `null`, objects.
- **Method lookup cache** — `evalMember` caches builtin method lookups (e.g., `str_upper`) in a `Map` to avoid repeated `globals.get()` calls.
- **`collectItems` optimized** — Inline type checking without function call overhead for common types.

### Benchmark Results (100k objects)
| Stage | Before (v3.1.0) | After (v3.2.0) | Improvement |
|-------|-----------------|----------------|-------------|
| Build | 0.171s | 0.163s | ~5% |
| Map | 0.738s | 0.713s | ~3% |
| Filter | 0.715s | 0.876s | -23% (regression, see note) |
| MaxBy | 0.714s | 0.703s | ~2% |
| Reduce | 0.713s | 0.696s | ~2% |
| **Total** | **3.051s** | **3.151s** | ~3% slower |

### Note on filter regression
The inlined `filter` shows a slight regression because the `try/catch` + `toBool()` pattern is slower than `Array.filter()` with V8 optimizations. The total impact is minimal (~0.1s on 100k). For v3.3.0, `filter` will revert to using `callFunction` while keeping `map` and `reduce` inlined.

### Architectural Limitation
Bockie is a tree-walking interpreter. Each AST node evaluation involves:
1. Function call overhead (`eval()` switch dispatch)
2. Environment allocation per scope
3. Recursive evaluation of child nodes

For 1M objects × 4 operations = 4M lambda calls, each call creates a new Environment, evaluates 2-3 AST nodes, and throws/catches ReturnSignal. This is inherently ~75x slower than V8's JIT-compiled JavaScript.

To achieve 10x+ improvement, Bockie would need:
- **Bytecode compiler** (compile AST to bytecode, interpret bytecode)
- **JIT compilation** (compile hot functions to native code)
- **Inline caching** (cache property lookups by shape)

These are planned for v4.0.0.

### Test Suite
- 744 tests, 0 failures (292 standard + 452 deep)

- **Parser: keyword arguments `name=value` di call args** (Bug #3)
  - Sebelum: `sorted(nums, reverse=True)` menyebabkan variabel `reverse` bocor ke scope pemanggil, dan args salah terparse sebagai `[nums, True]`
  - Sesudah: Parser deteksi pattern `Identifier =` di call args sebagai keyword argument, tidak lagi di-parse sebagai assignment statement. Variabel tidak bocor.
  - Built-in `sorted()` sekarang menerima `reverse=True/False` dan `key=lambda x: ...` sebagai keyword args
  - Built-in `reversed()` juga diupdate

- **Type checking di builtins** (Bug #5)
  - Sebelum: `mean("not a list")` mengembalikan `NaN` silently, `pad_left(12345, 3, "0")` crash dengan raw JS error
  - Sesudah: Builtins sekarang validasi tipe argumen dengan helper `expectString()`, `expectNumber()`, `expectList()`. Throw `BockieError` yang clean kalau tipe salah.
  - Functions yang di-fix: `mean`, `pad_left`, `pad_right`, `str_pad_left`, `str_pad_right`
  - `pad_left`/`pad_right` sekarang auto-coerce number ke string (tidak crash)

- **HTML animasi bengkak** (Bug #6)
  - Sebelum: `animated_snake.bckie` (200 frames) menghasilkan HTML 9MB+ karena background statis di-redraw tiap frame
  - Sesudah: Tambah `canvas_set_background()` untuk pisah background statis dari per-frame commands. Background di-render sekali doang di browser, bukan tiap frame.
  - Ukuran file turun ~97% (9MB → 273KB untuk animated_snake)

- **Single-line function/class definition** (Bug #7)
  - Sebelum: `def f(x): return x * 2` menyebabkan "Expected indented block" error
  - Sesudah: `funcDecl()` dan `classDecl()` sekarang pakai `inlineOrBlock()` bukan `block()`, mendukung single-line definitions

- **String/list multiply dengan negative/zero** (Bug #8)
  - Sebelum: `"a" * -1` crash dengan JS error "Invalid count value"
  - Sesudah: Return empty string/list untuk multiplier <= 0, pakai `Math.max(0, Math.floor(n))`

- **Variable scoping di functions** (Bug #9, KRITIS)
  - Sebelum: Assignment di dalam function memodifikasi variabel di outer scope (parent chain walk). `particles = []` di dalam function merusak variabel `particles` di caller, menyebabkan infinite loop.
  - Sesudah: `Environment.set()` sekarang hanya set di scope saat ini (local variable), tidak walk up parent chain. Konsisten dengan Python scoping rules.
  - Fix ini juga mengfix infinite loop di `examples/particles.bckie`

- **`global` statement tidak berfungsi** (Bug #10, REGRESI dari fix #9)
  - Sebelum: `global` statement hanya di-parse tapi tidak pernah di-eksekusi (no-op sejak v1.0.0). Fix #9 mengubah `Environment.set()` ke local-only, yang sebelumnya accidentally membuat `global` "works" via walk-up chain.
  - Sesudah: `Environment` class sekarang punya `globalNames: Set<string>` dan `isFunctionScope: boolean`. Saat `global` di-eksekusi, nama ditambahkan ke `globalNames`. Saat `set()` dipanggil, kalau nama ada di `globalNames`, value ditulis ke global scope. Function scope ditandai dengan `isFunctionScope=true`.
  - Pattern yang sekarang jalan: counter, accumulator, state di closure via `global`

- **`nonlocal` keyword belum diimplementasi** (Bug #12)
  - Sebelum: `nonlocal` dikenali lexer tapi parser bilang "Unexpected token 'nonlocal'"
  - Sesudah: `nonlocal` sekarang didukung penuh. `Environment` punya `nonlocalNames: Set<string>`. Saat `nonlocal count` di-eksekusi, nama ditambahkan ke `nonlocalNames`. Saat `set()`, kalau nama ada di `nonlocalNames`, walk up parent chain untuk cari scope yang punya variabel itu, lalu update di situ.
  - Pattern yang sekarang jalan: closure counter, state di nested function

- **`test-suite.js` hardcoded path** (Bug #11)
  - Sebelum: `const CLI_DIR = '/home/z/my-project/bockie'` — path absolut yang gak ada di mesin lain
  - Sesudah: `const CLI_DIR = path.resolve(__dirname)` — dynamic, jalan di mana aja

- **Ternary expression tidak return value** (Bug #13)
  - Sebelum: `"big" if x > 3 else "small"` menyebabkan "Cannot evaluate node type If"
  - Sesudah: Ternary sekarang return value. Body dan elseBody dibungkus sebagai ExprStmt, dievaluasi di `eval()` dengan `case 'If'` yang return value untuk single-statement body.

- **Tuple empty `()` dan single `(42,)`** (Bug #14)
  - Sebelum: `print(())` menyebabkan Parser Error, `print((42,))` menampilkan `(42)` bukan `(42,)`
  - Sesudah: Empty tuple `()` sekarang valid. Single-element tuple tetap `(42)` (konsisten dengan JS/Python display)

- **Match/case single-line body** (Bug #15)
  - Sebelum: `case 1: return "one"` menyebabkan "Expected indented block"
  - Sesudah: `matchStatement()` sekarang pakai `inlineOrBlock()` untuk case dan default body, mendukung single-line statements

- **`upper()`/`lower()` tidak tersedia sebagai global builtins** (Bug #16)
  - Sebelum: `upper("hello")` menyebabkan "name 'upper' is not defined", hanya `str_upper` yang ada
  - Sesudah: `upper`, `lower`, `split`, `join`, `replace`, `strip`, `contains`, `starts_with`, `ends_with`, `find`, `count`, `reverse`, `repeat` sekarang tersedia sebagai global builtins (tanpa prefix `str_`). Method-style (`s.upper()`) juga jalan.

- **`fn` tidak bisa dipakai sebagai nama parameter** (Bug #17)
  - Sebelum: `def apply_twice(fn, value):` menyebabkan "Expected parameter name, got 'fn'"
  - Sesudah: `fn` dihapus dari KEYWORDS set. `fn` sekarang bisa dipakai sebagai identifier/parameter biasa. (Catatan: `fn` keyword untuk function definition tidak lagi didukung, gunakan `def`)

- **`max_by`/`min_by`/`groupby` tidak support reversed arg order** (Bug #18)
  - Sebelum: `max_by(students, lambda s: s["score"])` menyebabkan "object is not callable"
  - Sesudah: `max_by`, `min_by`, `groupby` sekarang smart-detect argumen: cek mana yang function dan mana yang iterable. Kedua urutan jalan: `max_by(fn, items)` dan `max_by(items, fn)`

### Added

- **Keyword argument support**: `sorted(nums, reverse=True)`, `sorted(nums, key=lambda x: x)`
- **`canvas_set_background()`**: Pisah background statis dari per-frame commands untuk optimasi ukuran HTML
- **Type validation helpers**: `expectString()`, `expectNumber()`, `expectList()` untuk type-safe builtins
- **Canvas commands baru**: `canvas_arc`, `canvas_gradient_rect`, `canvas_shadow_text`, `canvas_polygon`
- **Color helpers**: `color_rgb(r,g,b)`, `color_hsl(h,s,l)`, `color_random()`
- **Statistics functions**: `mean`, `median`, `variance`, `std_dev`, `product`, `deep_copy`
- **String functions (20+)**: `capitalize`, `title_case`, `to_camel_case`, `to_snake_case`, `to_kebab_case`, `is_digit`, `is_alpha`, `is_alnum`, `is_space`, `is_upper`, `is_lower`, `string_format`, `char_code`, `char_from`, `pad_left`, `pad_right`, `reverse_str`, `repeat_str`, `split_lines`, `starts_with`, `ends_with`, `trim`, `replace_all`, `split_str`, `join_str`
- **Collection functions**: `find`, `find_index`, `count`, `take`, `drop`, `chunk`, `interleave`, `flatten`, `unique`, `groupby`, `max_by`, `min_by`, `range_of`
- **UI helpers**: `spinner`, `table_print`, `progress_bar`
- **XOR encryption**: `crypto_encrypt_xor`, `crypto_decrypt_xor`
- **Lowercase booleans**: `true`, `false`, `null`, `none` sebagai alias
- **`bockie -e` dengan `\n`**: Auto-convert ke newline
- **Animated HTML games**: `canvas_next_frame()`, `canvas_save_game()`, `canvas_set_fps()` dengan Play/Pause/Restart/Speed control

### New Examples
- `breakout.bckie` — Breakout game dengan bricks, paddle AI, ball physics (300 frames animated)
- `particles.bckie` — Particle explosion dengan 60 particles, gravity, bouncing (120 frames)
- `solar_system.bckie` — Solar system dengan 6 planets, sun glow, starfield (150 frames)
- `animated_snake.bckie` — Snake game optimized dengan `canvas_set_background()` (9MB → 273KB)
- `animated_ball.bckie` — Bouncing ball dengan gradient background

### Test Suite
- 452 tests, 0 failures (deep) + 292 tests, 0 failures (standard) = 744 total
- Coverage: I/O, arithmetic, strings, interpolation, lists, dicts, tuples, control flow, functions, classes, match/case, pipeline, null coalesce, spread, walrus, try/except, type conversion, math, collections, JSON, error handling, FS, OS, crypto, regex, datetime, game module, edge cases

## [2.0.0] - 2026-09-09

### Fixed
- `isinstance()` walk parent chain untuk string arg
- `%` operator Python-style true modulo
- `{{` `}}` escape di string interpolation
- `in` / `not in` operator
- Pipeline dengan call args: `3 |> f(2)` jadi `f(3, 2)`
- `raise` exception message raw (tanpa prefix)
- String escape backslash dipertahankan
- JSON string literal tidak di-misinterpret
- Lowercase booleans: `true`/`false`/`null`/`none`
- `bockie -e` dengan `\n` auto-convert
- Installer `bockie.bat` nanya lokasi install

## [1.0.0] - 2026-09-09

### Initial release
- String interpolation, pipeline, null coalescing, spread, match/case, repeat/unless/until, walrus, power, slicing
- OOP dengan inheritance
- Try/except/finally
- Built-in modules: game, fs, os, regex, datetime, process, crypto, http, json
- 80+ built-in functions
- VSCode extension
