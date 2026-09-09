# Changelog

All notable changes to Bockie will be documented in this file.

## [1.0.0] - 2026-09-09

### Added

#### Ciri khas syntax
- **String interpolation**: `print("Halo {nama}")`
- **Pipeline operator**: `5 |> double |> add_one`
- **Null coalescing**: `x ?? "default"`
- **Spread operator**: `[0, ...arr, 4]`
- **Match/case**: Pattern matching seperti Rust/Elixir
- **Repeat loop**: `repeat N times i: ...`
- **Unless statement**: Kebalikan dari if
- **Until loop**: Kebalikan dari while (run until condition true)
- **Walrus operator**: `if (n := get_value()) > 5:`
- **Power operator**: `2 ** 10` = 1024
- **Slicing**: `s[1:5]`, `s[:3]`, `s[-2:]`
- **Triple-quoted strings**: `"""multiline"""`
- **`fn` keyword**: Alternatif `def`

#### Built-in modules
- **game**: 2D engine — ASCII screen + HTML5 canvas (export game ke standalone HTML!)
- **fs**: File operations — read, write, list, mkdir, copy, move, stat, CSV
- **os**: OS info — name, arch, home, env vars, cpus, memory
- **regex**: Pattern matching — match, find, find_all, replace, split, groups, extract
- **datetime**: Date/time — year, month, day, format, parse
- **process**: Subprocess — shell, shell_silent, kill
- **crypto**: Hashing — md5, sha1, sha256, sha512, base64, hmac, uuid, XOR cipher
- **http**: HTTP client — get, post, url_encode
- **json**: JSON encode/decode

#### Built-in functions (80+)
- I/O: print, input, print_color, print_err, read_line, ask, confirm
- Collections: len, range, list, dict, tuple, enumerate, zip, sorted, reversed, map, filter, reduce, any, all
- **New**: find, find_index, count, take, drop, chunk, interleave, flatten, unique, groupby, max_by, min_by, range_of
- Math: abs, min, max, sum, round, floor, ceil, sqrt, pow, sin, cos, tan, log, exp, pi, tau, e, sign, clamp
- Conversion: int, float, str, bool, type, isinstance, hex, bin, oct, chr, ord, format
- Format spec: `format(255, "02x")`, `format(3.14, ".2f")`, `format(1234, ",.2f")`
- String methods: upper, lower, strip, split, join, replace, contains, starts_with, ends_with, find, count, repeat, pad_left, pad_right, reverse
- List methods: append, pop, insert, remove, index, count, sort, reverse, clear, extend, copy
- Dict methods: keys, values, items, get, set, pop, contains, clear, copy, update
- File I/O: fs_read, fs_write, fs_append, fs_exists, fs_mkdir, fs_list, fs_copy, fs_move, fs_remove, fs_stat, fs_read_lines, fs_read_csv, fs_write_csv
- System: exit, argv
- Color output: color_red/green/yellow/blue/cyan/magenta/white, bold, dim, italic, underline
- UI: progress_bar, spinner, table_print

#### VSCode extension
- Syntax highlighting untuk semua Bockie features
- 30+ snippets (def, class, match, repeat, try, lambda, dll)
- Run file command (F5)
- REPL command
- File icons (.bckie files)
- Auto-indent (Python-style)

#### OOP
- Classes with `__init__`, `__str__`, `__iter__` methods
- Single inheritance
- Method binding via `self`
- `isinstance` (mendukung parent chain walk untuk string maupun class object)

#### Error handling
- `try`/`except`/`finally`
- Custom errors via `raise`

#### Tooling
- REPL interaktif
- CLI: `bockie <file>`, `bockie run <file>`, `bockie -e "code"`, `bockie --help/version/examples/modules`
- Install scripts Windows (PowerShell + Batch)
- Upload-to-GitHub scripts
- Cross-platform: Linux, Windows, Mac

### Fixed

#### Bug #1: `isinstance()` tidak menelusuri parent class saat argumen string
- **Severity**: Medium
- **Before**: `isinstance(d, "Animal")` return `False` meski `d` adalah instance dari `Dog` yang subclass `Animal`
- **After**: Walk `cls.base` chain dan bandingkan `cls.name` di tiap step
- **Test**:
  ```bockie
  class Animal: ...
  class Dog(Animal): ...
  d = Dog("Rex")
  isinstance(d, "Animal")  # True (fixed)
  ```

#### Bug #2: Operator `%` pakai JavaScript remainder, bukan Python modulo
- **Severity**: High
- **Before**: `-3 % 26` return `-3` (JavaScript remainder)
- **After**: `-3 % 26` return `23` (Python-style true modulo, selalu positif kalau divisor positif)
- **Effect**: Caesar cipher di `examples/crypto_demo.bckie` sekarang decrypt dengan benar
- **Test**:
  ```bockie
  print(-3 % 26)   # 23 (was -3)
  print(-1 % 5)    # 4 (was -1)
  print(-7 % 3)    # 2 (was -1)
  ```

### Documentation
- README lengkap dengan install guide, syntax reference, examples
- 10+ example programs (hello, fibonacci, fizzbuzz, classes, crypto, sysinfo, canvas_snake, dll)

## [Unreleased]

### Planned
- List comprehensions `[x*2 for x in nums if x > 0]`
- Decorators `@cache`, `@memoize`
- Async/await
- Generators (yield)
- Bockie-pm package manager
- Web playground (browser-based)
