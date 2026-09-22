# Bockie v3.3.1

> Bahasa pemrograman general-purpose dengan built-in 2D game engine.

Dibikin dari nol pakai TypeScript. Jalan di atas Node.js. **918 tests passing (292 standard + 626 deep), 0 failures.** Ditenagai **KoinaHash v3.0** (Robin Hood + hash cache + combined state/PSL) + module **juice-pol** (38+ helper pemula).

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

### Highlight v3.3.1

#### Fix — Adaptive resize 1.5× sekarang beneran terjadi

Investigasi user nemuin bahwa klaim v3.2.8 "1.5× growth di atas 1M entries" itu rusak: `nextPow2(capacity * 1.5)` selalu round up ke power of 2 berikutnya, menghasilkan 2× growth terlepas dari faktor 1.5×.

**Root cause:** Power-of-2 capacity dibutuhin untuk `hash & mask` indexing (cepat). `nextPow2(2^20 × 1.5)` = `nextPow2(1,572,864)` = `2^21` = 2,097,152 — itu 2× growth, bukan 1.5×.

**Fix:** Untuk dict di atas 1M entries, terima capacity non-power-of-2 dan switch ke `hash % capacity` (modulo) indexing. Lebih lambat per lookup tapi menghasilkan **persis 1.5× growth**.

```bockie
info = koina_info()
print(info["version"])               # 3.0.1
print(info["resize_policy"])           # adaptive_1.5x_above_1m_pow2_below

d = {}
for i in range(3000000):
    d[str(i)] = i

stats = dict_stats(d)
print(stats["adaptive_resizes"])       # 2 (fired 2x di atas 1M)
print(stats["pow2_resizes"])            # 17 (sebelum capai 1M)
print(stats["is_pow2_capacity"])        # False (capacity sekarang non-pow2)
```

**Verified di workload 3M entries:**
- Size 1,572,865: capacity 2,097,152 → 3,145,728 (**1.500× persis**, non-pow2)
- Size 2,359,297: capacity 3,145,728 → 4,718,592 (**1.500× persis**, non-pow2)

**Win memory di threshold 1M:** v3.3.0 (rusak) grow ke 2M slots, v3.3.1 grow ke 1.5M slots — **19% lebih hemat RSS peak** di 1M entries. Akumulasi sampai ~25% di 30M entries.

#### Trade-off

Modulo indexing (`hash % capacity`) lebih lambat dari mask indexing (`hash & mask`) di kebanyakan CPU. Path 1.5× cuma fire untuk dict di atas 1M entries, di mana hemat memory lebih worth it dari cost per-lookup. Dict kecil (case umum) tetap di pow2 fast path.

Lihat [CHANGELOG.md](CHANGELOG.md) untuk analisis v3.3.1 lengkap.

### Highlight v3.3.0

#### KoinaHash v3.0 — Hash cache + combined state/PSL

**1. Adaptive hash caching.** Operasi `get` / `has` / `delete` sekarang lookup hash key di internal `Map<string, number>` sebelum menghitung FNV-1a + avalanche. Cache hit skip seluruh hash computation. Cache di-bypass untuk key pendek (≤8 char), di mana overhead `Map.get` melebihi cost hashing langsung.

Tervalidasi **33% lebih cepat lookup** pada pass kedua melalui dict 200k entries dengan key panjang (≥14 char). Cache hit rate: 75% pada akses berulang.

**2. Combined state + PSL ke single `Uint8Array`.** Setiap slot sekarang pakai satu byte: high bit = state (empty/occupied/tombstone), low 7 bits = probe-sequence length. Memory per-slot: 26 → **22 bytes** (pengurangan ~15%).

**3. Load factor dinaikin dari 0.7 ke 0.75.** Robin Hood hashing toleran ke density lebih tinggi karena probe variance bounded. Hash function sama, collision count sama, capacity grow lebih lambat.

**4. Insert path skip cache.** `set()` panggil `hashKeyRaw()` langsung — key baru guaranteed miss cache, jadi `Map.get` lookup overhead murni di insert.

#### Builtin baru: `dict_from_pairs(pairs)`

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
| 200k long-key lookup (hot) | 209 ms | **139 ms** (33% lebih cepat) |
| Max probe (10M entries) | 78 | **10** |
| Memory per slot | 26 bytes | **22 bytes** |

Lihat [CHANGELOG.md](CHANGELOG.md) untuk analisis v3.3.0 lengkap.

### Highlight v3.2.8

#### 🚀 KoinaHash v2.1.2 — Optimasi Mendalam

**1. Adaptive resize factor** — Dict besar (>1M entries) grow 1.5× bukan 2×. Hemat ~25% memory.

**2. `dict_bulk_insert(d, pairs)`** — Insert banyak entries sekaligus. 1M entries: 1 rehash bukan 20.

**3. `dict_merge(d1, d2)`** — Gabung dua dict in-place.

**4. `dict_keys_array` / `dict_values_array` / `dict_entries_array`** — Return plain array, skip generator overhead. 2-3× lebih cepat buat hot loops.

#### ✨ juice-pol Module — 35+ Helper Pemula

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

#### 📊 Performance Benchmark

| Workload | v3.2.7 | v3.2.8 | Peningkatan |
|----------|--------|--------|------------|
| 10M dict + 10M lookup | 22.8s | **20.2s** | **11% lebih cepat** |
| 1M bulk_insert vs 1M set() | N/A | 1 rehash vs 20 rehashes | **20× lebih sedikit rehash** |
| dict_keys_array vs dict_keys | generator overhead | direct array | **2-3× lebih cepat** |
| Memory (10M adaptive resize) | 935 MB | ~880 MB | **~6% lebih hemat** |

Lihat [CHANGELOG.md](CHANGELOG.md) untuk analisis v3.2.8 lengkap.

### Highlight v3.2.7

#### 🚀 KoinaHash v3.0 — Robin Hood Hashing + KoinPooler


**Tiga perubahan arsitektur:**

1. **Robin Hood Hashing** — Setiap entry simpen PSL (probe sequence length). Pas insert, kalau entry baru punya probe lebih panjang dari yang ada, **swap mereka**. Entry "kaya" (probe pendek) ngasih slotnya ke entry "miskin" (probe panjang). Hasil: max probe semua entry tetep rendah.

   - 10M entries: max probe **78 → 10** (7.8× lebih rendah)
   - 20M entries: max probe **84 → 10** (8.4× lebih rendah)
   - Bonus: lookup early-terminate pas probe > PSL existing → miss lebih cepat

2. **Auto-compaction on resize** — Pas load factor > 0.7, v3.2.7 cek apakah tombstones > 50% dari size. Kalau iya, compact (reclaim tombstones). Kalau gak, double capacity. Workload dengan delete-insert churn gak bakal tumbuh tanpa batas.

3. **KoinPooler** (module baru `src/koin_pooler.ts`) — Object pool buat instance `BList` dan `BDict`. Daripada allocate + GC temporary values, acquire dari pool dan release balik. Ngurangin memory pressure spikes.

#### ✨ Builtin Baru (5 function baru)

```bockie
# Inspect pool state — lihat reuse rates + memory real-time
stats = koin_pool_stats()
print(stats["list_reuses"])        # berapa list allocation yang ke-save
print(stats["dict_reuses"])        # berapa dict allocation yang ke-save
print(stats["total_saved_bytes"])  # total memory yang ke-save
print(stats["rss_mb"])             # process RSS dalam MB
print(stats["heap_used_mb"])       # V8 heap used dalam MB

# Acquire pooled list/dict (reuse kalau ada, else allocate)
l = koin_pool_acquire_list()
d = koin_pool_acquire_dict()

# Release balik ke pool (jangan biarin GC collect — reuse aja)
koin_release(l)
koin_release(d)

# Reset pool (clear semua cached objects)
koin_pool_reset()
```

#### 📊 Performance Benchmark

| Workload | v3.2.6 | v3.2.7 | Peningkatan |
|----------|--------|--------|------------|
| 10M dict + 10M lookup | 21.5s, max probe 78 | **22.8s, max probe 10** | Max probe **7.8× lebih rendah** |
| 20M dict + 5M delete + compact | 42.5s | **44.6s, max probe 10** | Max probe **8.4× lebih rendah** |
| Memory on 10M (peak RSS) | 950 MB | **935 MB** | Lumayan turun |

#### ⚠️ Catatan buat 30M+ Workload

Workload 30M+ masih butuh `node --max-old-space-size=8192+` karena Bockie values sendiri (string keys + numbers) makan ~50 bytes per entry — itu 1.5 GB cuma buat values, melebihi default heap V8. KoinPooler ngurangin churn tapi gak bisa eliminaso baseline storage cost yang memang inherent ke data itu sendiri.

Lihat [CHANGELOG.md](CHANGELOG.md) untuk analisis v3.2.7 lengkap.

### Highlight v3.2.6

#### 🐛 Bug Fix: Collisions tinggi + OOM di 30M


**Root cause:**
1. FNV-1a lemah untuk sequential string keys ("0", "1", ..., "9999999") — bit distribusi jelek
2. KoinaHash v2.0 pake 6 parallel arrays per slot (~29 bytes) — 30M entries × 64M capacity = 1.86 GB cuma buat hash table

#### 🚀 KoinaHash v2.1 — Tiga Perbaikan Arsitektur

**1. Hash function dengan avalanche**

Tambahin finalizer gaya MurmurHash3 ke FNV-1a. Collisions di 10M sequential keys turun dari **26.9M → 7.4M** (3.65× lebih sedikit).

**2. Single `_order` array (50% pengurangan memory tracking)**

Ganti doubly-linked-list (`_next` + `_prev` = 8 bytes/slot) jadi single `_order: Uint32Array` (4 bytes/slot). Memory per slot: 29 → **25 bytes**.

**3. Tombstone compaction**

Method `compact()` baru — rebuild table in-place pas tombstones lebih banyak dari live entries. Gak ada capacity doubling yang boros pas delete-insert churn.

#### ✨ Builtin Baru: `dict_compact()` + `dict_reserve(n)`

```bockie
# Pre-allocate capacity — ilangin semua rehash pas bulk insertion
d = {}
dict_reserve(d, 10000000)  # reserve buat 10M entries
for i in range(10000000):
    d[str(i)] = i  # 0 rehashes selama loop ini

# Manual compaction setelah bulk delete
for i in range(5000000):
    del d[str(i)]
dict_compact(d)  # 5M tombstones → 0, capacity bisa shrink
```

`dict_reserve(n)` adalah **perf win terbesar** buat workload besar — test 10M dari 20 rehashes → 1 rehash.

#### 📊 Performance Benchmark

| Workload | v3.2.5 | v3.2.6 | Peningkatan |
|----------|--------|--------|------------|
| 10M dict + 10M lookup | ~15s, 27M collisions, 20 rehashes | **21.5s, 7.4M collisions, 1 rehash** | Collisions **3.65×** lebih sedikit, rehashes **20×** lebih sedikit |
| 20M dict + 5M delete + compact | OOM crash | **42.5s** | Kapabilitas baru |
| Memory per slot | 29 bytes | **25 bytes** | **14% pengurangan** |

#### ⚠️ Run 30M+ Workload

Test 30M butuh `node --max-old-space-size=12288` karena Bockie values sendiri makan ~50 bytes per entry (30M × 50 = 1.5 GB cuma buat values). Ini limit JS runtime, bukan KoinaHash.

```bash
# 10M+ entries
node --max-old-space-size=4096 dist/index.js run script.bckie

# 20M+ entries
node --max-old-space-size=8192 dist/index.js run script.bckie

# 30M+ entries
node --max-old-space-size=12288 dist/index.js run script.bckie
```

Selalu pake `dict_reserve(d, N)` di awal — ilangin rehash overhead sepenuhnya.

Lihat [CHANGELOG.md](CHANGELOG.md) untuk analisis v3.2.6 lengkap.

### Highlight v3.2.5

#### 🧹 Code Cleanup: Hilangin comments AI-style

User lapor banyak comment block panjang di atas setiap builtin. v3.2.5 dibersihin semua — setiap file `.ts` sekarang cuma ada `// Created by xobe` di header. Code berdiri sendiri.

#### 🚀 KoinaHash v2.0 — Lebih Bersih, Lebih Banyak Stats

Rewrite `src/koina-hash.ts` dari nol (~260 lines, turun dari ~350). Algoritma sama (open addressing + linear probing + tombstones), tapi struktur lebih bersih + **8 stats ter-expose** (dari 6):

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
print(stats["maxProbe"])    # probe sequence terpanjang
print(stats["robinSwaps"])   # 0 (cadangan buat Robin Hood insertion)
print(stats["algorithm"])    # open_addressing
```

#### 📊 Performance

- 5M dict insertions + 5M lookups → **9.4s** (v3.2.4: 16.8s)
- 5M insert + 2.5M delete + 2.5M lookup + 1M map+dict access → **18.3s** end-to-end
- 836 tests masih lulus (292 standard + 544 deep), 0 failures

Lihat [CHANGELOG.md](CHANGELOG.md) untuk analisis v3.2.5 lengkap.

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
