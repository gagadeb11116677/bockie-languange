# Bockie Built-in Functions Reference

Complete reference untuk semua 90+ built-in functions di Bockie v3.0.0.

## Table of Contents

- [I/O](#io)
- [Collections](#collections)
- [Math](#math)
- [Random](#random)
- [Time](#time)
- [Type Conversion](#type-conversion)
- [String Functions](#string-functions)
- [List Methods](#list-methods)
- [Dict Methods](#dict-methods)
- [File System](#file-system)
- [OS](#os)
- [Regex](#regex)
- [Datetime](#datetime)
- [Process](#process)
- [Crypto](#crypto)
- [HTTP](#http)
- [JSON](#json)
- [Color & UI](#color--ui)
- [Game Module](#game-module)

---

## I/O

| Function | Signature | Description |
|----------|-----------|-------------|
| `print` | `print(...args)` | Print values ke stdout |
| `input` | `input(prompt?)` | Read line dari stdin |
| `print_color` | `print_color(code, ...args)` | Print dengan ANSI color (0-7) |
| `print_err` | `print_err(...args)` | Print ke stderr |
| `read_line` | `read_line()` | Read line tanpa prompt |
| `ask` | `ask(question, default?)` | Prompt dengan default value |
| `confirm` | `confirm(question)` | Yes/No prompt, return bool |

```bockie
print("Hello", "World")
name = input("Nama: ")
age = ask("Umur", "18")
if confirm("Lanjut?"):
    print("OK")
```

---

## Collections

| Function | Signature | Description |
|----------|-----------|-------------|
| `len` | `len(x)` | Length of string/list/dict |
| `range` | `range(end)` / `range(start, end, step?)` | Create range |
| `list` | `list(iterable)` | Convert to list |
| `dict` | `dict(pairs?)` | Create dict |
| `tuple` | `tuple(iterable)` | Convert to tuple |
| `enumerate` | `enumerate(iterable)` | Return [(index, item), ...] |
| `zip` | `zip(*iterables)` | Zip multiple iterables |
| `sorted` | `sorted(iterable, reverse?, key?)` | Sort dengan optional keyword args |
| `reversed` | `reversed(iterable)` | Reverse |
| `map` | `map(fn, iterable)` **or** `map(iterable, fn)` | Apply fn to each — **both orders OK (v3.2.2)** |
| `filter` | `filter(fn, iterable)` **or** `filter(iterable, fn)` | Filter by fn — **both orders OK (v3.2.2)** |
| `reduce` | `reduce(fn, iterable, init?)` **or** `reduce(iterable, fn, init?)` | Reduce — **both orders OK (v3.2.2)** |
| `flat_map` | `flat_map(fn, iterable)` **or** `flat_map(iterable, fn)` | Map + flatten one level (v3.2.2) |
| `each` | `each(fn, iterable)` **or** `each(iterable, fn)` | Side-effect iteration, returns None (v3.2.2) |
| `partition` | `partition(fn, iterable)` **or** `partition(iterable, fn)` | Returns `[pass, fail]` tuple (v3.2.2) |
| `tap` | `tap(value, fn)` | Calls fn(value), returns value unchanged — pipeline debug (v3.2.2) |
| `any` | `any(iterable)` | True kalau ada yang truthy |
| `all` | `all(iterable)` | True kalau semua truthy |
| `find` | `find(fn, iterable)` **or** `find(iterable, fn)` | First item where fn returns true — **both orders OK (v3.2.2)**. Also: `find(str, substr)` returns index. |
| `find_index` | `find_index(fn, iterable)` **or** `find_index(iterable, fn)` | Index of first match, -1 if not found (v3.2.2) |
| `count` | `count(fn, iterable)` **or** `count(iterable, fn)` | Count items where fn returns true (v3.2.2). Also: `count(str, substr)` counts occurrences. |
| `take` | `take(iterable, n)` | First n items |
| `drop` | `drop(iterable, n)` | All items except first n |
| `chunk` | `chunk(iterable, size)` | Split into chunks |
| `interleave` | `interleave(*iterables)` | Interleave multiple lists |
| `flatten` | `flatten(iterable)` | Flatten one level |
| `unique` | `unique(iterable)` | Remove duplicates |
| `first` | `first(iter, default?)` | First item, or default if empty (v3.2.3) — also works on strings |
| `last` | `last(iter, default?)` | Last item, or default if empty (v3.2.3) — also works on strings |
| `is_empty` | `is_empty(iter)` | True if list/string/dict/range/None is empty (v3.2.3) |
| `window` | `window(iter, size)` | Sliding window of `size` items (v3.2.3) |
| `take_while` | `take_while(fn, iter)` **or** `take_while(iter, fn)` | Take while predicate true (v3.2.3) |
| `drop_while` | `drop_while(fn, iter)` **or** `drop_while(iter, fn)` | Drop while predicate true (v3.2.3) |
| `sum_of` | `sum_of(fn, iter)` **or** `sum_of(iter, fn)` | Sum of `fn(item)` for each item (v3.2.3) |
| `repeat_list` | `repeat_list(item, n)` | Build list of `item` repeated `n` times (v3.2.3) |
| `input_num` | `input_num(prompt?)` | Read float from user, retry on bad input (v3.2.3) |
| `input_int` | `input_int(prompt?)` | Read int from user, retry on bad input (v3.2.3) |
| `confirm` | `confirm(prompt?, default?)` | Yes/no prompt → bool (v3.2.3) |
| `pause` | `pause(msg?)` | Print msg, wait for Enter (v3.2.3) |
| `groupby` | `groupby(fn, iterable)` **or** `groupby(iterable, fn)` | Group by key function |
| `max_by` | `max_by(fn, iterable)` **or** `max_by(iterable, fn)` | Max by key function |
| `min_by` | `min_by(fn, iterable)` **or** `min_by(iterable, fn)` | Min by key function |
| `range_of` | `range_of(iterable)` | (min, max) tuple |

> **v3.2.2 Ciri Khas — Both argument orders:**
> All higher-order collection builtins (`map`, `filter`, `reduce`, `flat_map`, `each`,
> `partition`, `find`, `find_index`, `count`, `groupby`, `max_by`, `min_by`) accept the
> function and the iterable in **either** order. `map(data, fn)` and `map(fn, data)` are
> fully equivalent — pick whichever reads more naturally for your use case.

```bockie
nums = [3, 1, 4, 1, 5, 9, 2, 6]
print(sorted(nums))                    # [1, 1, 2, 3, 4, 5, 6, 9]
print(sorted(nums, reverse=true))      # [9, 6, 5, 4, 3, 2, 1, 1]
print(sorted(nums, key=lambda x: -x))  # [9, 6, 5, 4, 3, 2, 1, 1]
print(take(nums, 3))                   # [3, 1, 4]
print(chunk(nums, 3))                  # [[3, 1, 4], [1, 5, 9], [2, 6]]
print(groupby(lambda x: x % 2, nums))  # {1: [3, 1, 5, 9, 1], 0: [4, 2, 6]}

# v3.2.2 — both arg orders work:
print(map(lambda x: x * 2, nums))   # Python/Haskell form
print(map(nums, lambda x: x * 2))   # English-sentence form (also valid)

# v3.2.2 — new builtins:
print(flat_map(lambda x: [x, x * 10], [1, 2, 3]))   # [1, 10, 2, 20, 3, 30]
each([1, 2, 3], lambda x: print("got {x}"))         # got 1 / got 2 / got 3 (returns None)
evens, odds = partition(lambda x: x % 2 == 0, nums) # evens=[4,2,6], odds=[3,1,1,5,9,1]

# v3.2.2 — tap for pipeline debugging:
def double(x): return x * 2
result = 5 |> tap(print) |> double |> tap(print)   # prints 5, then 10
print(result)                                       # 10
```

---

## Math

| Function | Description |
|----------|-------------|
| `abs(x)` | Absolute value |
| `min(...)` | Minimum |
| `max(...)` | Maximum |
| `sum(iterable, start?)` | Sum |
| `round(x, digits?)` | Round |
| `floor(x)` | Floor |
| `ceil(x)` | Ceiling |
| `sqrt(x)` | Square root |
| `pow(base, exp)` | Power |
| `sin(x)` / `cos(x)` / `tan(x)` | Trigonometry |
| `atan2(y, x)` | Arc tangent |
| `log(x)` / `log(base, x)` | Logarithm |
| `exp(x)` | Exponential |
| `sign(x)` | -1, 0, or 1 |
| `clamp(v, lo, hi)` | Clamp value |
| `pi()` | 3.14159... |
| `tau()` | 6.28318... |
| `e()` | 2.71828... |
| `hex(n)` | Hex string |
| `bin(n)` | Binary string |
| `oct(n)` | Octal string |
| `chr(n)` | Char from code |
| `ord(c)` | Code from char |
| `format(n, spec)` | Format: `"02x"`, `".2f"`, `",.2f"`, `"08b"` |

```bockie
print(format(255, "02x"))      # ff
print(format(3.14159, ".2f"))  # 3.14
print(format(1234567, ",.2f")) # 1,234,567.00
print(clamp(15, 0, 10))        # 10
```

---

## Statistics

| Function | Description |
|----------|-------------|
| `mean(iterable)` | Average |
| `median(iterable)` | Median |
| `variance(iterable)` | Variance |
| `std_dev(iterable)` | Standard deviation |
| `product(iterable)` | Product of all elements |
| `deep_copy(obj)` | Deep copy list/dict |

---

## Random

| Function | Description |
|----------|-------------|
| `random()` | 0.0 - 1.0 |
| `randint(lo, hi)` | Random integer inclusive |
| `choice(iterable)` | Random element |
| `shuffle(list)` | Shuffle in-place |
| `sample(iterable, k)` | k random unique elements |

---

## Time

| Function | Description |
|----------|-------------|
| `time()` / `now()` | Unix timestamp (seconds) |
| `now_ms()` | Unix timestamp (milliseconds) |
| `sleep(seconds)` | Sleep |
| `clock()` | Current time |

---

## Type Conversion

| Function | Description |
|----------|-------------|
| `int(x)` | Convert to int |
| `float(x)` | Convert to float |
| `str(x)` | Convert to string |
| `bool(x)` | Convert to bool |
| `type(x)` | Type name string |
| `isinstance(x, type)` | Type check (supports parent chain) |

---

## String Functions

### Direct Functions

| Function | Description |
|----------|-------------|
| `str_upper(s)` / `to_uppercase(s)` | Uppercase |
| `str_lower(s)` / `to_lowercase(s)` | Lowercase |
| `str_strip(s)` / `trim(s)` | Strip whitespace |
| `str_split(s, sep?)` / `split_str(s, sep)` | Split |
| `str_join(sep, list)` / `join_str(sep, list)` | Join |
| `str_replace(s, old, new)` / `replace_all(s, old, new)` | Replace all |
| `str_contains(s, sub)` / `string_contains(s, sub)` | Contains |
| `str_starts_with(s, prefix)` / `starts_with(s, prefix)` | Starts with |
| `str_ends_with(s, suffix)` / `ends_with(s, suffix)` | Ends with |
| `str_find(s, sub)` | Index of first occurrence |
| `str_count(s, sub)` | Count occurrences |
| `str_repeat(s, n)` / `repeat_str(s, n)` | Repeat |
| `str_pad_left(s, n, char?)` / `pad_left(s, n, char?)` | Pad left |
| `str_pad_right(s, n, char?)` / `pad_right(s, n, char?)` | Pad right |
| `str_reverse(s)` / `reverse_str(s)` | Reverse |
| `capitalize(s)` | Capitalize first letter |
| `title_case(s)` | Title case |
| `to_camel_case(s)` | camelCase |
| `to_snake_case(s)` | snake_case |
| `to_kebab_case(s)` | kebab-case |

### String Checks

| Function | Description |
|----------|-------------|
| `is_digit(s)` | All digits? |
| `is_alpha(s)` | All letters? |
| `is_alnum(s)` | Alphanumeric? |
| `is_space(s)` | All whitespace? |
| `is_upper(s)` | All uppercase? |
| `is_lower(s)` | All lowercase? |

### Method-style (dot notation)

```bockie
s = "Hello World"
print(s.upper())       # HELLO WORLD
print(s.lower())       # hello world
print(s.strip())
print(s.split(" "))
print(s.replace("o", "0"))
print(s.contains("World"))  # True
print(s.starts_with("Hello"))  # True
```

---

## List Methods

### Direct Functions

| Function | Description |
|----------|-------------|
| `list_append(list, item)` | Add to end |
| `list_pop(list, idx?)` | Remove & return last/idx |
| `list_insert(list, idx, item)` | Insert at index |
| `list_remove(list, item)` | Remove first match |
| `list_index(list, item)` | Find index |
| `list_count(list, item)` | Count occurrences |
| `list_sort(list)` | Sort in-place |
| `list_reverse(list)` | Reverse in-place |
| `list_clear(list)` | Clear |
| `list_extend(list, other)` | Extend |
| `list_copy(list)` | Shallow copy |

### Method-style (dot notation)

```bockie
nums = [3, 1, 2]
nums.append(4)
nums.sort()
print(nums)  # [1, 2, 3, 4]
print(nums.pop())  # 4
```

---

## Dict Methods

| Function | Description |
|----------|-------------|
| `dict_keys(d)` | List of keys |
| `dict_values(d)` | List of values |
| `dict_items(d)` | List of (key, value) tuples |
| `dict_get(d, key, default?)` | Get with default |
| `dict_set(d, key, value)` | Set |
| `dict_pop(d, key, default?)` | Remove & return |
| `dict_contains(d, key)` | Has key? |
| `dict_clear(d)` | Clear |
| `dict_copy(d)` | Shallow copy |
| `dict_update(d, other)` | Update from other |

---

## File System

| Function | Description |
|----------|-------------|
| `fs_read(path)` | Read file as string |
| `fs_write(path, content)` | Write file |
| `fs_append(path, content)` | Append to file |
| `fs_exists(path)` | Check if exists |
| `fs_mkdir(path)` | Create directory |
| `fs_rmdir(path)` | Remove directory |
| `fs_remove(path)` | Remove file |
| `fs_list(path)` | List directory |
| `fs_copy(src, dst)` | Copy file |
| `fs_move(src, dst)` | Move/rename |
| `fs_stat(path)` | File info |
| `fs_pwd()` | Current directory |
| `fs_chdir(path)` | Change directory |
| `fs_join(*paths)` | Join paths |
| `fs_ext(path)` | Get extension |
| `fs_basename(path)` | Get filename |
| `fs_dirname(path)` | Get directory |
| `fs_absolute(path)` | Absolute path |
| `fs_read_lines(path)` | Read lines as list |
| `fs_write_lines(path, lines)` | Write lines |
| `fs_read_csv(path, delim?)` | Read CSV |
| `fs_write_csv(path, rows, delim?)` | Write CSV |

---

## OS

| Function | Description |
|----------|-------------|
| `os_name()` | linux/win32/darwin |
| `os_arch()` | x64/arm64 |
| `os_home()` | Home directory |
| `os_tmpdir()` | Temp directory |
| `os_hostname()` | Hostname |
| `os_cpu_count()` | CPU cores |
| `os_totalmem()` | Total memory |
| `os_freemem()` | Free memory |
| `os_uptime()` | Uptime seconds |
| `os_env(key?)` | Get env var(s) |
| `os_setenv(key, val)` | Set env var |
| `os_cwd()` | Current dir |
| `os_pid()` | Process ID |

---

## Regex

| Function | Description |
|----------|-------------|
| `regex_match(pattern, text, flags?)` | Match test |
| `regex_find(pattern, text, flags?)` | First match |
| `regex_find_all(pattern, text, flags?)` | All matches |
| `regex_replace(pattern, replacement, text, flags?)` | Replace all |
| `regex_split(pattern, text, flags?)` | Split |
| `regex_groups(pattern, text, flags?)` | Capture groups |
| `regex_test(pattern, text, flags?)` | Test (alias of match) |
| `regex_extract(pattern, text, flags?)` | Extract capture groups |

---

## Datetime

| Function | Description |
|----------|-------------|
| `now()` / `time()` | Unix timestamp |
| `date_year(ts?)` | Year |
| `date_month(ts?)` | Month (1-12) |
| `date_day(ts?)` | Day |
| `date_hour(ts?)` | Hour |
| `date_minute(ts?)` | Minute |
| `date_second(ts?)` | Second |
| `date_weekday(ts?)` | Day of week (0=Sunday) |
| `date_format(fmt, ts?)` | Format: YYYY-MM-DD HH:SS |
| `date_parse(str)` | Parse date string |

---

## Process

| Function | Description |
|----------|-------------|
| `shell(cmd)` | Run shell command, return stdout |
| `shell_silent(cmd)` | Run without output, return result dict |
| `process_kill(pid)` | Kill process |
| `process_exit(code?)` | Exit |
| `process_pid()` | Get PID |
| `process_args()` | Get CLI args |

---

## Crypto

| Function | Description |
|----------|-------------|
| `md5(text)` | MD5 hash |
| `sha1(text)` | SHA1 hash |
| `sha256(text)` | SHA256 hash |
| `sha512(text)` | SHA512 hash |
| `base64_encode(text)` | Base64 encode |
| `base64_decode(text)` | Base64 decode |
| `url_encode(text)` | URL encode |
| `url_decode(text)` | URL decode |
| `uuid()` | Random UUID |
| `random_bytes(n)` | Random hex bytes |
| `hmac_sha256(key, msg)` | HMAC-SHA256 |
| `crypto_encrypt_xor(text, key)` | XOR encrypt (base64) |
| `crypto_decrypt_xor(text, key)` | XOR decrypt |

---

## HTTP

| Function | Description |
|----------|-------------|
| `http_get(url)` | GET request |
| `http_post(url, data)` | POST request (JSON) |
| `http_url_encode(params)` | URL encode params |
| `http_status_text(code)` | Status code text |

---

## JSON

| Function | Description |
|----------|-------------|
| `json_dumps(obj, indent?)` | Encode to JSON string |
| `json_loads(str)` | Decode JSON string |
| `json_pretty(obj)` | Pretty print JSON |

---

## Color & UI

| Function | Description |
|----------|-------------|
| `color_red(text)` | Red text |
| `color_green(text)` | Green text |
| `color_yellow(text)` | Yellow text |
| `color_blue(text)` | Blue text |
| `color_cyan(text)` | Cyan text |
| `color_magenta(text)` | Magenta text |
| `color_white(text)` | White text |
| `color_bg_red(text)` | Red background |
| `color_bg_green(text)` | Green background |
| `color_bg_yellow(text)` | Yellow background |
| `color_bg_blue(text)` | Blue background |
| `bold(text)` | Bold |
| `dim(text)` | Dim |
| `italic(text)` | Italic |
| `underline(text)` | Underline |
| `progress_bar(cur, total, width?, label?)` | Progress bar |
| `spinner(frame, msg?)` | Spinner animation |
| `table_print(data)` | Print table |

---

## Game Module

Game functions diakses via `import game` lalu pakai `game.function_name()`. Lihat [GAMES.md](GAMES.md) untuk dokumentasi lengkap.
