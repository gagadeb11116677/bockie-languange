# Changelog

All notable changes to Bockie are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/).

## [3.2.9] - 2026-09-21

### Changed
- Rewrote release notes across CHANGELOG, README, and BUILTINS.md to follow standard changelog conventions. Removed informal phrasings and prompt-style annotations.
- Standardized all source files to use a single-line `// Created by xobe` header.

### Added
- `juice_box_list(lines)` — render a multi-line box around a list of strings, with proper width auto-detection.
- `juice_kv_table(pairs)` — render a key/value table from a list of (key, value) tuples.
- `juice_log(label, value)` — emit a styled log line `<label>: <value>` with dim styling for the label.
- `dict_difference(d1, d2)` — return a dict containing entries in `d1` that are not in `d2`.
- `dict_intersection(d1, d2)` — return a dict containing entries whose keys exist in both `d1` and `d2`.

### Fixed
- `juice_clear_line()` now returns an empty string instead of the raw ANSI sequence when piped, preventing test output corruption in CI environments.
- `dict_entries_array()` now correctly returns a `BList` of 2-tuples instead of nested `BList`s.

---

## [3.2.8] - 2026-09-18

### Added — KoinaHash v2.1.2 methods
- `dict_bulk_insert(d, pairs)` — bulk insert from a list of (key, value) tuples in a single pass, pre-resizing the table once. Eliminates repeated rehash during bulk loading.
- `dict_merge(d1, d2)` — merge `d2` into `d1` in-place.
- `dict_keys_array(d)` / `dict_values_array(d)` / `dict_entries_array(d)` — return plain `BList` instances directly, bypassing generator overhead. Roughly 2–3× faster than the iterator-based `dict_keys` / `dict_values` / `dict_items` for hot loops.
- `dict_stats(d)` now exposes `version` and `adaptive_resize` fields.
- `koina_info()` now reports `resize_policy: "adaptive_power_of_2_at_load_factor_0.7"`.

### Changed — KoinaHash v2.1.2 internals
- Adaptive resize factor: for dicts above 1,000,000 entries, capacity grows by 1.5× instead of 2×. Reduces memory overhead by approximately 25% with a small trade-off of slightly more frequent resizes.
- `stats()` return shape now includes `version` and `adaptiveResize` for introspection.

### Added — `juice-pol` module
A new standard library module (`src/juice-pol.ts`) exposing 35+ terminal-UI and formatting helpers. Available globally without import.

- Color & style: `juice_color`, `juice_bold`, `juice_dim`, `juice_italic`, `juice_underline`, `juice_red`, `juice_green`, `juice_yellow`, `juice_blue`, `juice_cyan`, `juice_magenta`, `juice_rainbow`.
- Text formatting: `juice_center`, `juice_pad_left`, `juice_pad_right`, `juice_repeat`, `juice_truncate`.
- Box drawing: `juice_box`, `juice_box_title`, `juice_line`, `juice_divider`, `juice_header`.
- Alert boxes: `juice_success`, `juice_error`, `juice_warn`, `juice_info`.
- Tables & charts: `juice_table`, `juice_bar_chart`, `juice_menu`.
- Progress & spinner: `juice_progress`, `juice_spinner`.
- Input helpers: `juice_input`, `juice_confirm`, `juice_ask`, `juice_pause`.
- Formatters: `juice_format_money`, `juice_format_bytes`, `juice_format_time`, `juice_format_number`.
- Utility: `juice_banner`, `juice_step`, `juice_clear`, `juice_clear_line`, `juice_now`, `juice_date`, `juice_time`.

### Performance
- 10M dict insert + 10M lookup: 20.2s end-to-end (down from 22.8s in v3.2.7).
- 1M-entry bulk insert: 1 rehash (down from 20 with individual `set` calls).
- Memory for 10M entries at peak: ~880 MB (down from ~935 MB in v3.2.7) thanks to adaptive resize factor.

### Tests
- Added 44 new tests (11 for KoinaHash v2.1.2 methods, 33 for `juice-pol`). Total: 902 passing (292 standard + 610 deep), 0 failures.

---

## [3.2.7] - 2026-09-18

### Changed — KoinaHash v3.0
- **Robin Hood hashing** replaces linear probing. Each slot now stores a probe-sequence-length (PSL) byte. On insertion, if the incoming entry has a longer probe distance than the existing one, the two are swapped. This minimizes probe variance across the table.
- Max probe depth on 10M sequential-key inserts dropped from 78 to 10 (7.8× reduction). Same workload at 20M entries: 84 → 10.
- Lookup now supports early termination: if the current probe distance exceeds the stored PSL, the key is guaranteed absent. Faster misses.
- Auto-compaction on resize: when load factor exceeds 0.7 and tombstones exceed 50% of live entries, the table is compacted in-place instead of doubling capacity. Prevents unbounded growth under delete-insert churn workloads.

### Added — KoinPooler module
New module `src/koin_pooler.ts` provides an object pool for `BList` and `BDict` instances. Reduces GC pressure for workloads that allocate and discard many temporary collections.

- `koin_pool_stats()` — pool state and process RSS / V8 heap usage.
- `koin_pool_acquire_list()` / `koin_pool_acquire_dict()` — acquire from pool or allocate.
- `koin_release(v)` — return a list or dict to the pool.
- `koin_pool_reset()` — drain the pool.

`koina_info()` now exposes `pooler_enabled`, `probe_sequence: "robin_hood_swap"`, and `deletion_strategy: "tombstone_with_autocompact"`.

### Tests
- Added 12 new tests. Total: 858 passing (292 standard + 566 deep), 0 failures.

---

## [3.2.6] - 2026-09-18

### Fixed
- High collision count on sequential string keys. FNV-1a 32-bit alone had poor bit distribution in the low-order bits for keys like `"0"`, `"1"`, ..., `"9999999"`. Added a MurmurHash3-style avalanche finalizer after FNV-1a. Collisions on 10M sequential keys dropped from 26,991,963 to 7,382,190 (3.65× reduction).
- Memory layout for insertion-order tracking. Replaced the doubly-linked-list approach (`_next` + `_prev` = 8 bytes/slot) with a single insertion-order array (`_order: Uint32Array` = 4 bytes/slot). Per-slot memory reduced from 29 to 25 bytes (~14% overall reduction).

### Added
- `dict_compact(d)` — rebuild the hash table in-place, dropping all tombstones.
- `dict_reserve(d, n)` — pre-allocate capacity for `n` entries. Eliminates rehash overhead during bulk insertion. The 10M-entry benchmark went from 20 rehashes to 1.
- `dict_stats(d)` now exposes `max_probe`, `compactions`, `hash_function`, `memory_per_slot_bytes`, `algorithm`, and `deletion_strategy`.
- `koina_info()` now exposes `probe_sequence`, `memory_layout`, and `memory_per_slot_bytes`.

### Performance
- 10M dict insert + 10M lookup: 21.5s end-to-end, 7.4M collisions, 1 rehash (with `dict_reserve`).
- 20M dict + 5M delete + compact: 42.5s end-to-end (previously OOM-crashed).

### Notes
- Workloads at 30M+ entries require `node --max-old-space-size=8192` or higher, because Bockie values themselves (string keys + numbers) consume ~50 bytes each — 1.5 GB just for 30M values. This is a V8 runtime limit, not a KoinaHash limit. Always use `dict_reserve(d, N)` upfront to eliminate rehash overhead.

### Tests
- Added 10 new tests. Total: 846 passing (292 standard + 554 deep), 0 failures.

---

## [3.2.5] - 2026-09-11

### Changed
- Stripped verbose multi-paragraph comment blocks from `interpreter.ts`, `koina-hash.ts`, and `game.ts`. All source files now use a single-line `// Created by xobe` header.
- Rewrote `src/koina-hash.ts` from ~350 lines to ~260 lines. Same algorithm (open addressing + linear probing + tombstones), but cleaner structure.

### Added — KoinaHash v2.0
- `stats()` now exposes `maxProbe` and `robinSwaps` counters for runtime introspection.
- `koina_info()` now exposes `hash_function`, `probe_sequence`, `memory_layout`, and `memory_per_slot_bytes`.

### Performance
- 5M dict insert + 5M lookup: 9.4s end-to-end (down from 16.8s in v3.2.4).
- 5M insert + 2.5M delete + 2.5M lookup + 1M map+dict access: 18.3s end-to-end.

### Tests
- Updated 2 existing tests for new strategy names. Total: 836 passing (292 standard + 544 deep), 0 failures.

---

## [3.2.4] - 2026-09-11

### Added — KoinaHash v1
- Introduced `KoinaHash`, a custom hash map built from scratch in `src/koina-hash.ts`. All `BDict.entries` fields now use `KoinaHash<BValue>` instead of JavaScript's `Map`.
- Architecture: open addressing + linear probing, FNV-1a 32-bit hash, power-of-2 sizing, tombstone-based deletion, insertion-order iteration via doubly-linked list.
- Per-slot memory: ~29 bytes (down from ~50–80 bytes per `Map` entry object).
- `dict_stats(d)` — returns size, capacity, tombstones, load_factor, collisions, rehashes.
- `koina_info()` — returns engine metadata (name, version, hash_algorithm, collision_strategy, deletion_strategy, resize_policy, iteration_order).

### Fixed
- `del d["key"]`, `del lst[i]`, and `del obj.attr` now actually delete the entry. Previously only `del identifier` was handled; `Index` and `Member` targets were silently no-op.

### Refactor
- `BDict.entries` type changed from `Map<string, BValue>` to `KoinaHash<BValue>`. API is Map-compatible (`has` / `get` / `set` / `delete` / `clear` / `forEach` / `entries` / `keys` / `values` / `size`), so all existing call sites work without changes.
- Updated 9 allocation sites in `interpreter.ts` and 5 in `modules.ts`.

### Performance
- 5M dict insertions + 5M lookups: 16.8s end-to-end.
- Memory for 5M entries: ~95 MB (vs ~280 MB with `Map`).

### Tests
- Added 19 new tests. Total: 836 passing (292 standard + 544 deep), 0 failures.

---

## [3.2.3] - 2026-09-11

### Fixed
- `game.key_wait()` returned an empty string immediately on Windows PowerShell. Root cause: `fs.readSync(0, ...)` does not block in PowerShell's cooked-mode stdin. Replaced with a three-tier fallback: Unix TTY raw-mode read (Tier 1), Windows PowerShell `[Console]::ReadKey($true)` (Tier 2), and generic line-mode `readline` via `spawnSync` (Tier 3).
- Mutable closure state. Previously, assigning to a captured variable inside a nested function created a shadowing local instead of mutating the outer binding. The classic counter example returned `1, 1, 1` instead of `1, 2, 3`. `Environment.set()` now auto-mutates the enclosing function-scope binding (JavaScript-style) when no `global`/`nonlocal` declaration is present. Explicit `nonlocal`/`global` still take precedence.

### Added — Beginner-friendly builtins
- `first(iter, default?)` — first item, or default if empty. Also works on strings.
- `last(iter, default?)` — last item, or default if empty. Also works on strings.
- `is_empty(iter)` — true for empty list/string/dict/range/None.
- `window(iter, size)` — sliding window of `size` items.
- `take_while(fn, iter)` / `drop_while(fn, iter)` — accept both argument orders.
- `sum_of(fn, iter)` — sum of `fn(item)` for each item.
- `repeat_list(item, n)` — build a list of `item` repeated `n` times.
- `input_num(prompt?)` / `input_int(prompt?)` — validated numeric input with retry.
- `confirm(prompt?, default?)` — yes/no prompt.
- `pause(msg?)` — wait for Enter.

### Tests
- Added 35 new tests. Total: 817 passing (292 standard + 525 deep), 0 failures.

---

## [3.2.2] - 2026-09-11

### Fixed
- `map` / `filter` / `reduce` "object is not callable" when called as `map(data, lambda x: ...)` (iterable-first argument order). All higher-order collection builtins now accept both argument orders via a shared `extractFnAndItems()` helper: `map(fn, iterable)` and `map(iterable, fn)` are equivalent. Same for `filter`, `reduce`, `flat_map`, `each`, `partition`, `find`, `find_index`, `count`, `groupby`, `max_by`, `min_by`.

### Added
- `flat_map(fn, iter)` — map + flatten one level (Haskell `concatMap`).
- `each(fn, iter)` — side-effect iteration, returns `None`. Faster than `map` + discard for void loops.
- `partition(fn, iter)` — split into `[passed, failed]` tuple.
- `tap(value, fn)` — pipeline debug helper. Calls `fn(value)`, returns `value` unchanged.

### Refactor
- New `extractFnAndItems()` helper deduplicates argument-order detection. Throws a clear, actionable error if neither side is callable.
- New `extractItems()` helper — single source of truth for iterable materialization. Zero-copy for list/tuple, materializes range once.
- Removed duplicate `find` / `count` definitions that silently shadowed the new versions.
- All 6 higher-order collection builtins share the same lambda fast-path: `body.length === 1 && body[0].type === 'Return'`.

### Performance
- 5,000,000-object stress test: 3.7s end-to-end (previously: Runtime Error).

### Tests
- Added 38 new tests. Total: 782 passing (292 standard + 490 deep), 0 failures.

---

## [3.2.0] - 2026-09-11

### Changed — Performance
- `Environment.vars` changed from `Map` to `Record` (plain object). V8 optimizes plain-object property access significantly better than `Map` for string keys.
- `callFunction` fast path: simple lambdas (no bound `self`, no default params) skip the `callFunction` method entirely and inline Environment creation + param binding + body execution.
- `map` / `filter` / `reduce` inlined: these collection functions now inline the lambda call loop instead of calling `callFunction` per element. Pre-allocates result arrays, avoids intermediate array allocations.
- `eval()` fast path for literals: `Number`, `String`, `Boolean`, `None`, `Identifier` checked with `if` before `switch`, avoiding switch overhead for the most common node types.
- Dict index/assign fast path: `obj["key"]` and `obj["key"] = val` skip `toDisplay()` conversion when the key is already a string.
- `toDisplay()` reorder: check `number` and `string` first, then `boolean`, `null`, objects.
- Method lookup cache: `evalMember` caches builtin method lookups in a `Map` to avoid repeated `globals.get()` calls.
- `collectItems` optimized: inline type checking without function call overhead for common types.

### Fixed
- Parser: keyword arguments `name=value` in call arguments. Previously, `sorted(nums, reverse=True)` leaked the variable `reverse` into the caller's scope and parsed args as `[nums, True]`. The parser now detects `Identifier =` in call args as a keyword argument. The builtin `sorted()` accepts `reverse=True/False` and `key=lambda x: ...` as keyword args.

### Performance — 100k-object benchmark
| Stage | Before (v3.1.0) | After (v3.2.0) | Improvement |
|-------|-----------------|----------------|-------------|
| Build | 0.171s | 0.163s | ~5% |
| Map | 0.738s | 0.713s | ~3% |
| Filter | 0.715s | 0.876s | -23% (regression) |
| MaxBy | 0.714s | 0.703s | ~2% |
| Reduce | 0.713s | 0.696s | ~2% |
| Total | 3.051s | 3.151s | ~3% slower |

### Notes
- The inlined `filter` showed a slight regression because the `try/catch` + `toBool()` pattern is slower than `Array.filter()` with V8 optimizations. The total impact is minimal (~0.1s on 100k). For v3.3.0, `filter` will revert to using `callFunction` while keeping `map` and `reduce` inlined.
- Bockie is a tree-walking interpreter. Each AST node evaluation involves function-call overhead, environment allocation per scope, and recursive evaluation of child nodes. For 1M objects × 4 operations = 4M lambda calls, each call creates a new Environment, evaluates 2–3 AST nodes, and throws/catches `ReturnSignal`. This is inherently ~75× slower than V8's JIT-compiled JavaScript. Achieving 10×+ improvement would require a bytecode compiler, JIT compilation, or inline caching — all planned for v4.0.0.

### Tests
- 744 tests, 0 failures (292 standard + 452 deep).

---

## [1.0.0] - 2026-09-09

### Added — Initial release
- General-purpose programming language with built-in 2D game engine.
- String interpolation: `print("Halo {nama}")`.
- Pipeline operator: `5 |> double |> add_one`.
- Null coalescing: `x ?? default`.
- Spread operator: `[0, ...arr, 4]`.
- Match/case, repeat/unless, walrus `:=`.
- Power operator: `2 ** 10`.
- Slicing: `s[1:5]`.
- OOP with inheritance.
- Try/except/finally.
- Built-in modules: `game`, `fs`, `os`, `regex`, `datetime`, `process`, `crypto`, `http`, `json`.
- 80+ built-in functions.
- VSCode extension with syntax highlighting, snippets, and F5 run support.
