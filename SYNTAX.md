# Bockie Syntax Reference

Complete reference untuk syntax Bockie v3.0.0.

## Table of Contents

- [Variables & Types](#variables--types)
- [Operators](#operators)
- [String Interpolation](#string-interpolation)
- [Control Flow](#control-flow)
- [Functions](#functions)
- [Classes & OOP](#classes--oop)
- [Error Handling](#error-handling)
- [Match/Case](#matchcase)
- [Pipeline & Null Coalesce](#pipeline--null-coalesce)
- [Spread & Walrus](#spread--walrus)
- [Scoping: global & nonlocal](#scoping-global--nonlocal)
- [Imports](#imports)

---

## Variables & Types

```bockie
# Numbers
x = 42              # int
y = 3.14             # float
z = -10              # negative
big = 2 ** 53        # large

# Strings
name = "Bockie"
greeting = "Hello {name}!"
multi = """
multiline
string
"""

# Booleans (both styles work)
a = True             # Python style
b = true             # JS/C style
c = False
d = false

# None
n = None             # Python style
n2 = null            # JS style
n3 = none            # lowercase

# Lists
nums = [1, 2, 3]
mixed = [1, "two", true, None]
nested = [[1, 2], [3, 4]]

# Dicts
person = {"name": "Bockie", "age": 17}
empty_dict = {}

# Tuples
point = (10, 20)
rgb = (255, 128, 0)
```

### Multi-assignment

```bockie
a, b, c = 1, 2, 3
x, y = y, x          # swap
lo, hi = min_max(data)  # tuple unpacking
```

---

## Operators

### Arithmetic

| Operator | Description | Example |
|----------|-------------|---------|
| `+` | Add | `1 + 2` → `3` |
| `-` | Subtract | `5 - 3` → `2` |
| `*` | Multiply | `4 * 5` → `20` |
| `/` | Divide | `10 / 4` → `2.5` |
| `%` | True modulo | `-3 % 26` → `23` |
| `**` | Power | `2 ** 10` → `1024` |

### Comparison

| Operator | Description |
|----------|-------------|
| `==` | Equal |
| `!=` | Not equal |
| `<` | Less than |
| `>` | Greater than |
| `<=` | Less or equal |
| `>=` | Greater or equal |
| `in` | Membership test |
| `not in` | Not in |

```bockie
print(2 in [1, 2, 3])        # True
print(5 not in [1, 2, 3])    # True
print("ell" in "hello")      # True
print("x" in {"x": 1})       # True
```

### Logical

```bockie
if x > 0 and x < 10:     # AND
if x < 0 or x > 100:     # OR
if not is_empty:         # NOT
```

### Augmented Assignment

```bockie
x += 5      # x = x + 5
x -= 3      # x = x - 3
x *= 2      # x = x * 2
x /= 4      # x = x / 4
x %= 3      # x = x % 3 (true modulo)
```

---

## String Interpolation

Embed expressions directly in strings dengan `{}`:

```bockie
name = "Bockie"
age = 17
print("Halo {name}, umur {age} tahun")
print("Tahun depan: {age + 1}")
print("Nama: {str_upper(name)}")
print("Length: {len(name)}")
```

### Escaping Braces

```bockie
print("Literal: {{not interp}}")   # {not interp}
print("JSON: {'x': 10}")          # JSON string (auto-detected)
```

---

## Control Flow

### If / Elif / Else

```bockie
if x > 10:
    print("big")
elif x > 5:
    print("medium")
else:
    print("small")

# Single-line
if x > 0: print("positive")
```

### Unless (kebalikan if)

```bockie
unless x > 10:
    print("not big")
else:
    print("big")
```

### While

```bockie
while condition:
    do_something()
    if done:
        break
    if skip:
        continue
```

### Until (kebalikan while)

```bockie
until condition:
    do_something()
```

### For

```bockie
for i in range(10):
    print(i)

for i in range(0, 20, 2):
    print(i)  # 0, 2, 4, 6, 8, 10, 12, 14, 16, 18

for item in [1, 2, 3]:
    print(item)

for key, value in dict_items(d):
    print("{key} = {value}")

for i, item in enumerate(items):
    print("{i}: {item}")
```

### Repeat

```bockie
repeat 5 times i:
    print("Iteration {i}")

# Tanpa variable
repeat 3:
    print("Hello!")
```

---

## Functions

### Basic

```bockie
def add(a, b):
    return a + b

print(add(3, 4))  # 7
```

### Default Parameters

```bockie
def greet(name, greeting="Hello"):
    return "{greeting}, {name}!"

print(greet("Bockie"))           # Hello, Bockie!
print(greet("World", "Hi"))      # Hi, World!
```

### Lambda

```bockie
square = lambda x: x * x
add = lambda a, b: a + b

print(square(5))    # 25
print(add(1, 2))    # 3
```

### Single-line Function

```bockie
def double(x): return x * 2
def is_even(n): return n % 2 == 0
```

### Higher-order Functions

```bockie
nums = [1, 2, 3, 4, 5]
squared = map(lambda x: x * x, nums)
evens = filter(lambda x: x % 2 == 0, nums)
total = reduce(lambda a, b: a + b, nums)
```

### Keyword Arguments

```bockie
print(sorted([3, 1, 2], reverse=true))           # [3, 2, 1]
print(sorted(["bb", "a", "ccc"], key=lambda s: len(s)))  # ["a", "bb", "ccc"]
```

---

## Classes & OOP

### Basic Class

```bockie
class Animal:
    def __init__(self, name, sound):
        self.name = name
        self.sound = sound

    def __str__(self):
        return "{self.name} ({self.sound})"

    def speak(self):
        print("{self.name} says {self.sound}")

a = Animal("Cat", "Meow")
a.speak()       # Cat says Meow
print(a)        # Cat (Meow)
```

### Inheritance

```bockie
class Dog(Animal):
    def __init__(self, name):
        self.name = name
        self.sound = "Woof"

d = Dog("Rex")
d.speak()  # Rex says Woof
print(isinstance(d, "Dog"))    # True
print(isinstance(d, "Animal")) # True (walks parent chain)
```

### Builder Pattern

```bockie
class Builder:
    def __init__(self):
        self.val = 0

    def add(self, n):
        self.val += n
        return self   # return self for chaining

b = Builder()
b.add(5).add(10).add(20)
print(b.val)  # 35
```

---

## Error Handling

### Try / Except / Finally

```bockie
try:
    x = 10 / 0
except e:
    print("Error: {e}")
finally:
    print("Cleanup")

# Multiple handlers
try:
    risky_operation()
except e:
    print("Caught: {e}")
else:
    print("No error")
finally:
    print("Always runs")
```

### Raise

```bockie
def validate(age):
    if age < 0:
        raise "Age cannot be negative"
    return age

try:
    validate(-5)
except e:
    print(e)  # Age cannot be negative
```

---

## Match/Case

```bockie
match status:
    case 200:
        print("OK")
    case 404:
        print("Not Found")
    case 500:
        print("Server Error")
    default:
        print("Unknown: {status}")

# With strings
match command:
    case "start":
        start_engine()
    case "stop":
        stop_engine()
    default:
        print("Unknown command")
```

---

## Pipeline & Null Coalesce

### Pipeline `|>`

Chain function calls kayak shell pipe:

```bockie
def double(x): return x * 2
def add_one(x): return x + 1
def square(x): return x * x

result = 5 |> double |> add_one |> square
# = square(add_one(double(5)))
# = square(add_one(10))
# = square(11)
# = 121

# With arguments (left value prepended)
def add(a, b): return a + b
print(3 |> add(2))  # add(3, 2) = 5
```

### Null Coalesce `??`

```bockie
port = config["port"] ?? 3000
name = user_input ?? "anonymous"
value = maybe_none() ?? fallback() ?? "default"
```

---

## Spread & Walrus

### Spread `...`

```bockie
# In list
arr1 = [1, 2, 3]
arr2 = [0, ...arr1, 4]  # [0, 1, 2, 3, 4]

# In function call
def add(a, b, c): return a + b + c
nums = [1, 2, 3]
print(add(...nums))  # 6
```

### Walrus Operator `:=`

```bockie
if (n := get_value()) > 5:
    print("Big: {n}")

while (line := input()) != "quit":
    print("You said: {line}")
```

---

## Scoping: global & nonlocal

### `global` — modify global variable from function

```bockie
count = 0

def increment():
    global count
    count = count + 1

increment()
increment()
print(count)  # 2
```

### `nonlocal` — modify enclosing function's variable

```bockie
def make_counter():
    count = 0
    def inc():
        nonlocal count
        count = count + 1
        return count
    return inc

c = make_counter()
print(c())  # 1
print(c())  # 2
print(c())  # 3
```

---

## Imports

```bockie
import game
import fs
import os
import regex
import datetime
import process
import crypto
import http
import json

# Usage
canvas = game.canvas_create(640, 360)
content = fs_read("file.txt")
hash = sha256("hello")
```

---

## Slicing

```bockie
s = "hello world"
print(s[0:5])    # hello
print(s[:5])     # hello
print(s[6:])     # world
print(s[-5:])    # world
print(s[-1])     # d

nums = [1, 2, 3, 4, 5]
print(nums[1:3])  # [2, 3]
print(nums[:2])   # [1, 2]
print(nums[3:])   # [4, 5]
```
