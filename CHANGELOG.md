# Changelog

## [3.0.0] - 2026-09-10

### Fixed

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
- 245 tests, 0 failures
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
