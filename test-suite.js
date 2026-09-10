#!/usr/bin/env node
const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BOCKIE = 'node';
const BOCKIE_ARGS = ['dist/index.js'];
const TESTS_DIR = '/tmp/bockie-tests';
const CLI_DIR = '/home/z/my-project/bockie';

if (!fs.existsSync(TESTS_DIR)) fs.mkdirSync(TESTS_DIR, { recursive: true });

let passed = 0;
let failed = 0;
const failures = [];

function runTest(name, code, expected) {
  const testFile = path.join(TESTS_DIR, `test_${Date.now()}_${Math.random().toString(36).slice(2,8)}.bckie`);
  fs.writeFileSync(testFile, code);
  try {
    const result = spawnSync(BOCKIE, [...BOCKIE_ARGS, 'run', testFile], {
      encoding: 'utf-8',
      timeout: 10000,
      cwd: CLI_DIR,
    });
    const actual = (result.stdout || '').trim();
    const expectedStr = (typeof expected === 'function' ? expected(actual) : expected);
    if (actual === expectedStr) {
      passed++;
      // console.log(`  [PASS] ${name}`);
    } else {
      failed++;
      failures.push({
        name,
        code,
        expected: expectedStr,
        actual,
        stderr: result.stderr || ''
      });
      console.log(`  [FAIL] ${name}`);
      console.log(`         Expected: ${JSON.stringify(expectedStr).slice(0, 100)}`);
      console.log(`         Actual:   ${JSON.stringify(actual).slice(0, 100)}`);
      if (result.stderr) console.log(`         Stderr:   ${result.stderr.slice(0, 200)}`);
    }
  } catch (e) {
    failed++;
    failures.push({ name, code, error: e.message });
    console.log(`  [ERROR] ${name}: ${e.message}`);
  } finally {
    try { fs.unlinkSync(testFile); } catch (e) {}
  }
}

function runTestContains(name, code, expectedSubstring) {
  const testFile = path.join(TESTS_DIR, `test_${Date.now()}_${Math.random().toString(36).slice(2,8)}.bckie`);
  fs.writeFileSync(testFile, code);
  try {
    const result = spawnSync(BOCKIE, [...BOCKIE_ARGS, 'run', testFile], {
      encoding: 'utf-8',
      timeout: 10000,
      cwd: CLI_DIR,
    });
    const actual = (result.stdout || '').trim();
    if (actual.includes(expectedSubstring)) {
      passed++;
    } else {
      failed++;
      failures.push({ name, code, expectedSubstring, actual, stderr: result.stderr || '' });
      console.log(`  [FAIL] ${name}`);
      console.log(`         Expected to contain: ${JSON.stringify(expectedSubstring)}`);
      console.log(`         Actual: ${JSON.stringify(actual).slice(0, 200)}`);
      if (result.stderr) console.log(`         Stderr: ${result.stderr.slice(0, 200)}`);
    }
  } catch (e) {
    failed++;
    failures.push({ name, code, error: e.message });
    console.log(`  [ERROR] ${name}: ${e.message}`);
  } finally {
    try { fs.unlinkSync(testFile); } catch (e) {}
  }
}

function runTestError(name, code, expectedErrorSubstring) {
  const testFile = path.join(TESTS_DIR, `test_${Date.now()}_${Math.random().toString(36).slice(2,8)}.bckie`);
  fs.writeFileSync(testFile, code);
  try {
    const result = spawnSync(BOCKIE, [...BOCKIE_ARGS, 'run', testFile], {
      encoding: 'utf-8',
      timeout: 10000,
      cwd: CLI_DIR,
    });
    const output = (result.stdout || '') + (result.stderr || '');
    if (output.includes(expectedErrorSubstring)) {
      passed++;
    } else {
      failed++;
      failures.push({ name, code, expectedErrorSubstring, output });
      console.log(`  [FAIL] ${name}`);
      console.log(`         Expected error containing: ${JSON.stringify(expectedErrorSubstring)}`);
      console.log(`         Actual: ${JSON.stringify(output.slice(0, 200))}`);
    }
  } catch (e) {
    failed++;
    failures.push({ name, code, error: e.message });
    console.log(`  [ERROR] ${name}: ${e.message}`);
  } finally {
    try { fs.unlinkSync(testFile); } catch (e) {}
  }
}

console.log('Running Bockie comprehensive test suite...\n');

// ====== BASIC I/O ======
console.log('--- Basic I/O ---');
runTest('print string', 'print("hello")', 'hello');
runTest('print number', 'print(42)', '42');
runTest('print multiple', 'print("a", "b", "c")', 'a b c');
runTest('print None', 'print(None)', 'None');
runTest('print True', 'print(True)', 'True');
runTest('print False', 'print(False)', 'False');

// ====== ARITHMETIC ======
console.log('\n--- Arithmetic ---');
runTest('addition', 'print(1 + 2)', '3');
runTest('subtraction', 'print(10 - 3)', '7');
runTest('multiplication', 'print(4 * 5)', '20');
runTest('division', 'print(10 / 4)', '2.5');
runTest('modulo positive', 'print(7 % 3)', '1');
runTest('modulo negative dividend', 'print(-3 % 26)', '23');
runTest('modulo negative dividend 2', 'print(-1 % 5)', '4');
runTest('modulo negative divisor', 'print(7 % -3)', '-2');
runTest('power', 'print(2 ** 10)', '1024');
runTest('power negative', 'print(2 ** -1)', '0.5');
runTest('negative number', 'print(-5)', '-5');
runTest('negation', 'x = 5\nprint(-x)', '-5');
runTest('float arithmetic', 'print(0.1 + 0.2)', '0.30000000000000004');
runTest('integer division stays float', 'print(7 / 2)', '3.5');
runTest('augmented +=', 'x = 5\nx += 3\nprint(x)', '8');
runTest('augmented -=', 'x = 10\nx -= 4\nprint(x)', '6');
runTest('augmented *=', 'x = 3\nx *= 4\nprint(x)', '12');
runTest('augmented /=', 'x = 10\nx /= 2\nprint(x)', '5');
runTest('augmented %=', 'x = 10\nx %= 3\nprint(x)', '1');
runTest('augmented %= negative', 'x = -5\nx %= 3\nprint(x)', '1');

// ====== STRINGS ======
console.log('\n--- Strings ---');
runTest('string concat', 'print("hello" + " " + "world")', 'hello world');
runTest('string repeat', 'print("ab" * 3)', 'ababab');
runTest('string index', 'print("hello"[1])', 'e');
runTest('string negative index', 'print("hello"[-1])', 'o');
runTest('string slice', 'print("hello"[1:4])', 'ell');
runTest('string slice start', 'print("hello"[:3])', 'hel');
runTest('string slice end', 'print("hello"[2:])', 'llo');
runTest('string slice negative', 'print("hello"[-3:])', 'llo');
runTest('string length', 'print(len("hello"))', '5');
runTest('string upper', 'print(str_upper("hello"))', 'HELLO');
runTest('string lower', 'print(str_lower("WORLD"))', 'world');
runTest('string strip', 'print(str_strip("  hi  "))', 'hi');
runTest('string split', 'print(str_split("a,b,c", ","))', "['a', 'b', 'c']");
runTest('string join', 'print(str_join("-", ["a", "b", "c"]))', 'a-b-c');
runTest('string replace', 'print(str_replace("hello", "l", "r"))', 'herro');
runTest('string contains', 'print(str_contains("hello", "ell"))', 'True');
runTest('string starts', 'print(str_starts_with("hello", "he"))', 'True');
runTest('string ends', 'print(str_ends_with("hello", "lo"))', 'True');
runTest('string find', 'print(str_find("hello", "l"))', '2');
runTest('string count', 'print(str_count("hello", "l"))', '2');
runTest('string repeat method', 'print(str_repeat("ab", 3))', 'ababab');
runTest('escape newline', 'print("a\\nb")', 'a\nb');
runTest('escape tab', 'print("a\\tb")', 'a\tb');
runTest('escape quote', 'print("a\\"b")', 'a"b');

// ====== INTERPOLATION ======
console.log('\n--- String interpolation ---');
runTest('basic interp', 'x = "world"\nprint("hello {x}")', 'hello world');
runTest('expr interp', 'print("2+2={2+2}")', '2+2=4');
runTest('multi interp', 'a = 1\nb = 2\nprint("{a}+{b}={a+b}")', '1+2=3');
runTest('func call interp', 'print("len={len("hi")}")', 'len=2');
runTest('escaped brace', 'print("{{not interp}}")', '{not interp}');
runTest('string method interp', 'x = "hi"\nprint("{str_upper(x)}")', 'HI');

// ====== LISTS ======
console.log('\n--- Lists ---');
runTest('list literal', 'print([1, 2, 3])', '[1, 2, 3]');
runTest('list index', 'print([10, 20, 30][1])', '20');
runTest('list negative index', 'print([10, 20, 30][-1])', '30');
runTest('list slice', 'print([1,2,3,4,5][1:3])', '[2, 3]');
runTest('list slice start', 'print([1,2,3,4,5][:2])', '[1, 2]');
runTest('list slice end', 'print([1,2,3,4,5][2:])', '[3, 4, 5]');
runTest('list append', 'x = [1,2]\nlist_append(x, 3)\nprint(x)', '[1, 2, 3]');
runTest('list pop', 'x = [1,2,3]\nprint(list_pop(x))', '3');
runTest('list insert', 'x = [1,3]\nlist_insert(x, 1, 2)\nprint(x)', '[1, 2, 3]');
runTest('list remove', 'x = [1,2,3]\nlist_remove(x, 2)\nprint(x)', '[1, 3]');
runTest('list index method', 'x = [1,2,3]\nprint(list_index(x, 2))', '1');
runTest('list count method', 'x = [1,1,2]\nprint(list_count(x, 1))', '2');
runTest('list sort', 'x = [3,1,2]\nlist_sort(x)\nprint(x)', '[1, 2, 3]');
runTest('list reverse', 'x = [1,2,3]\nlist_reverse(x)\nprint(x)', '[3, 2, 1]');
runTest('list extend', 'x = [1,2]\nlist_extend(x, [3,4])\nprint(x)', '[1, 2, 3, 4]');
runTest('list copy', 'x = [1,2]\ny = list_copy(x)\nlist_append(y, 3)\nprint(x)', '[1, 2]');
runTest('list len', 'print(len([1,2,3]))', '3');
runTest('list sum', 'print(sum([1,2,3,4]))', '10');
runTest('list min', 'print(min([3,1,2]))', '1');
runTest('list max', 'print(max([3,1,2]))', '3');
runTest('list concat', 'print([1,2] + [3,4])', '[1, 2, 3, 4]');
runTest('list repeat', 'print([0] * 3)', '[0, 0, 0]');
runTest('list in', 'print(2 in [1,2,3])', 'True');
runTest('list not in', 'print(5 in [1,2,3])', 'False');

// ====== DICTS ======
console.log('\n--- Dicts ---');
runTest('dict literal', 'print({"a": 1, "b": 2})', "{'a': 1, 'b': 2}");
runTest('dict access', 'print({"a": 1}["a"])', '1');
runTest('dict get', 'print(dict_get({"a": 1}, "a"))', '1');
runTest('dict get default', 'print(dict_get({"a": 1}, "b", 99))', '99');
runTest('dict set', 'd = {}\ndict_set(d, "x", 1)\nprint(d["x"])', '1');
runTest('dict keys', 'print(dict_keys({"a": 1, "b": 2}))', "['a', 'b']");
runTest('dict values', 'print(dict_values({"a": 1, "b": 2}))', '[1, 2]');
runTest('dict contains', 'print(dict_contains({"a": 1}, "a"))', 'True');
runTest('dict not contains', 'print(dict_contains({"a": 1}, "b"))', 'False');
runTest('dict len', 'print(len({"a": 1, "b": 2}))', '2');
runTest('dict null coalesce', 'd = {"a": 1}\nprint(d["b"] ?? "default")', 'default');

// ====== TUPLES ======
console.log('\n--- Tuples ---');
runTest('tuple literal', 'print((1, 2, 3))', '(1, 2, 3)');
runTest('tuple index', 'print((10, 20)[1])', '20');
runTest('tuple unpack', 'a, b = (1, 2)\nprint(a, b)', '1 2');
runTest('tuple swap', 'a = 1\nb = 2\na, b = b, a\nprint(a, b)', '2 1');
runTest('tuple multi assign', 'a, b, c = 1, 2, 3\nprint(a + b + c)', '6');

// ====== CONTROL FLOW ======
console.log('\n--- Control flow ---');
runTest('if true', 'if True:\n    print("yes")', 'yes');
runTest('if false', 'if False:\n    print("yes")\nelse:\n    print("no")', 'no');
runTest('elif', 'x = 2\nif x == 1:\n    print("one")\nelif x == 2:\n    print("two")\nelse:\n    print("other")', 'two');
runTest('single line if', 'if True: print("ok")', 'ok');
runTest('while loop', 'i = 0\nwhile i < 3:\n    print(i)\n    i += 1', '0\n1\n2');
runTest('while break', 'i = 0\nwhile True:\n    if i >= 3:\n        break\n    print(i)\n    i += 1', '0\n1\n2');
runTest('while continue', 'i = 0\nwhile i < 5:\n    i += 1\n    if i == 3:\n        continue\n    print(i)', '1\n2\n4\n5');
runTest('for range', 'for i in range(3):\n    print(i)', '0\n1\n2');
runTest('for range step', 'for i in range(0, 10, 2):\n    print(i)', '0\n2\n4\n6\n8');
runTest('for range negative', 'for i in range(3, 0, -1):\n    print(i)', '3\n2\n1');
runTest('for list', 'for x in [10, 20, 30]:\n    print(x)', '10\n20\n30');
runTest('for dict', 'd = {"a": 1, "b": 2}\nfor k in dict_keys(d):\n    print(k)', 'a\nb');
runTest('for enumerate', 'for i, x in enumerate(["a", "b"]):\n    print(i, x)', '0 a\n1 b');
runTest('for zip', 'for a, b in zip([1,2], [3,4]):\n    print(a, b)', '1 3\n2 4');

// ====== FUNCTIONS ======
console.log('\n--- Functions ---');
runTest('simple function', 'def f():\n    return 42\nprint(f())', '42');
runTest('function args', 'def add(a, b):\n    return a + b\nprint(add(3, 4))', '7');
runTest('function default', 'def f(a, b=10):\n    return a + b\nprint(f(5))', '15');
runTest('function default override', 'def f(a, b=10):\n    return a + b\nprint(f(5, 20))', '25');
runTest('lambda', 'f = lambda x: x * 2\nprint(f(5))', '10');
runTest('lambda multi args', 'f = lambda a, b: a + b\nprint(f(1, 2))', '3');
runTest('recursion', 'def fact(n):\n    if n <= 1:\n        return 1\n    return n * fact(n - 1)\nprint(fact(5))', '120');
runTest('closure', 'def outer():\n    x = 10\n    def inner():\n        return x\n    return inner()\nprint(outer())', '10');
runTest('map', 'print(map(lambda x: x * 2, [1, 2, 3]))', '[2, 4, 6]');
runTest('filter', 'print(filter(lambda x: x > 2, [1, 2, 3, 4]))', '[3, 4]');
runTest('reduce', 'print(reduce(lambda a, b: a + b, [1, 2, 3, 4]))', '10');

// ====== CLASSES ======
console.log('\n--- Classes ---');
runTest('class basic', 'class Foo:\n    def __init__(self, x):\n        self.x = x\nf = Foo(5)\nprint(f.x)', '5');
runTest('class method', 'class Foo:\n    def get_x(self):\n        return 42\nf = Foo()\nprint(f.get_x())', '42');
runTest('class __str__', 'class Foo:\n    def __str__(self):\n        return "FOO"\nf = Foo()\nprint(f)', 'FOO');
runTest('class inheritance', 'class A:\n    def f(self):\n        return 1\nclass B(A):\n    pass\nb = B()\nprint(b.f())', '1');
runTest('class override', 'class A:\n    def f(self):\n        return 1\nclass B(A):\n    def f(self):\n        return 2\nb = B()\nprint(b.f())', '2');
runTest('isinstance same class', 'class A:\n    pass\na = A()\nprint(isinstance(a, "A"))', 'True');
runTest('isinstance parent class', 'class A:\n    pass\nclass B(A):\n    pass\nb = B()\nprint(isinstance(b, "A"))', 'True');
runTest('isinstance wrong class', 'class A:\n    pass\nclass B:\n    pass\nb = B()\nprint(isinstance(b, "A"))', 'False');

// ====== MATCH/CASE ======
console.log('\n--- Match/Case ---');
runTest('match basic', 'match 2:\n    case 1:\n        print("one")\n    case 2:\n        print("two")', 'two');
runTest('match default', 'match 99:\n    case 1:\n        print("one")\n    default:\n        print("other")', 'other');
runTest('match string', 'match "hi":\n    case "hi":\n        print("hello")\n    default:\n        print("?")', 'hello');

// ====== REPEAT/UNLESS/UNTIL ======
console.log('\n--- Repeat/Unless/Until ---');
runTest('repeat times', 'repeat 3 times i:\n    print(i)', '0\n1\n2');
runTest('repeat without var', 'repeat 2:\n    print("hi")', 'hi\nhi');
runTest('unless true', 'x = 5\nunless x > 10:\n    print("small")', 'small');
runTest('unless false', 'x = 20\nunless x > 10:\n    print("small")\nelse:\n    print("big")', 'big');
runTest('until loop', 'i = 0\nuntil i >= 3:\n    print(i)\n    i += 1', '0\n1\n2');

// ====== PIPELINE / NULL COALESCE / SPREAD / WALRUS ======
console.log('\n--- Pipeline / Null coalesce / Spread / Walrus ---');
runTest('pipeline', 'def double(x):\n    return x * 2\nprint(5 |> double)', '10');
runTest('pipeline chain', 'def double(x):\n    return x * 2\ndef add_one(x):\n    return x + 1\nprint(5 |> double |> add_one)', '11');
runTest('pipeline with call', 'def f(x, y):\n    return x + y\nprint(3 |> f(2))', '5');
runTest('null coalesce None', 'x = None\nprint(x ?? "default")', 'default');
runTest('null coalesce value', 'x = "hi"\nprint(x ?? "default")', 'hi');
runTest('null coalesce dict missing', 'd = {"a": 1}\nprint(d["b"] ?? 99)', '99');
runTest('spread in list', 'a = [1, 2]\nprint([0, ...a, 3])', '[0, 1, 2, 3]');
runTest('spread in call', 'def add(a, b, c):\n    return a + b + c\nnums = [1, 2, 3]\nprint(add(...nums))', '6');
runTest('walrus operator', 'if (n := 5) > 3:\n    print(n)', '5');

// ====== TRY/EXCEPT ======
console.log('\n--- Try/Except ---');
runTest('try except', 'try:\n    x = 1 / 0\nexcept e:\n    print("caught: " + e)', 'caught: division by zero');
runTest('try finally', 'try:\n    print("try")\nfinally:\n    print("finally")', 'try\nfinally');
runTest('try except finally', 'try:\n    print("try")\nexcept e:\n    print("except")\nfinally:\n    print("finally")', 'try\nfinally');
runTest('raise', 'def f():\n    raise "custom error"\ntry:\n    f()\nexcept e:\n    print(e)', 'custom error');

// ====== TYPE CONVERSION ======
console.log('\n--- Type conversion ---');
runTest('int from string', 'print(int("42"))', '42');
runTest('int from float', 'print(int(3.7))', '3');
runTest('int from bool', 'print(int(True))', '1');
runTest('float from string', 'print(float("3.14"))', '3.14');
runTest('str from number', 'print(str(42))', '42');
runTest('bool from number', 'print(bool(0))', 'False');
runTest('bool from number 2', 'print(bool(1))', 'True');
runTest('bool from string', 'print(bool("hi"))', 'True');
runTest('bool from empty string', 'print(bool(""))', 'False');
runTest('type function', 'print(type(42))', 'int');
runTest('type string', 'print(type("hi"))', 'str');
runTest('type list', 'print(type([]))', 'list');
runTest('type dict', 'print(type({}))', 'dict');

// ====== MATH ======
console.log('\n--- Math ---');
runTest('abs', 'print(abs(-5))', '5');
runTest('round', 'print(round(3.14159, 2))', '3.14');
runTest('floor', 'print(floor(3.7))', '3');
runTest('ceil', 'print(ceil(3.2))', '4');
runTest('sqrt', 'print(sqrt(16))', '4');
runTest('pow', 'print(pow(2, 8))', '256');
runTest('min multi', 'print(min(5, 2, 8))', '2');
runTest('max multi', 'print(max(5, 2, 8))', '8');
runTest('sign positive', 'print(sign(5))', '1');
runTest('sign negative', 'print(sign(-5))', '-1');
runTest('sign zero', 'print(sign(0))', '0');
runTest('clamp', 'print(clamp(15, 0, 10))', '10');
runTest('pi', 'print(pi())', String(Math.PI));
runTest('format hex', 'print(format(255, "02x"))', 'ff');
runTest('format binary', 'print(format(10, "08b"))', '00001010');
runTest('format float', 'print(format(3.14159, ".2f"))', '3.14');

// ====== NEW COLLECTION FUNCTIONS ======
console.log('\n--- New collection functions ---');
runTest('find', 'print(find(lambda x: x > 3, [1, 2, 3, 4, 5]))', '4');
runTest('find not found', 'print(find(lambda x: x > 10, [1, 2, 3]))', 'None');
runTest('find_index', 'print(find_index(lambda x: x > 3, [1, 2, 3, 4, 5]))', '3');
runTest('find_index not found', 'print(find_index(lambda x: x > 10, [1, 2, 3]))', '-1');
runTest('count func', 'print(count(lambda x: x % 2 == 0, [1, 2, 3, 4, 5, 6]))', '3');
runTest('take', 'print(take([1, 2, 3, 4, 5], 3))', '[1, 2, 3]');
runTest('drop', 'print(drop([1, 2, 3, 4, 5], 2))', '[3, 4, 5]');
runTest('chunk', 'print(chunk([1, 2, 3, 4, 5], 2))', '[[1, 2], [3, 4], [5]]');
runTest('flatten', 'print(flatten([[1, 2], [3, 4], [5]]))', '[1, 2, 3, 4, 5]');
runTest('unique', 'print(unique([1, 1, 2, 3, 3, 4]))', '[1, 2, 3, 4]');
runTest('interleave', 'print(interleave([1, 3], [2, 4]))', '[1, 2, 3, 4]');
runTest('any', 'print(any([False, True, False]))', 'True');
runTest('all', 'print(all([True, True, False]))', 'False');
runTest('sorted', 'print(sorted([3, 1, 2]))', '[1, 2, 3]');
runTest('reversed', 'print(reversed([1, 2, 3]))', '[3, 2, 1]');

// ====== JSON ======
console.log('\n--- JSON ---');
runTest('json dumps', 'print(json_dumps({"a": 1, "b": 2}))', '{"a":1,"b":2}');
runTest('json loads', 'd = json_loads(\'{"x": 10, "y": 20}\')\nprint(d["x"])', '10');
runTest('json round trip', 'd = {"a": 1, "b": [1, 2, 3]}\ns = json_dumps(d)\nd2 = json_loads(s)\nprint(d2["b"])', '[1, 2, 3]');
runTest('json pretty', 'd = {"a": 1}\nprint(len(json_pretty(d)) > 10)', 'True');

// ====== ERROR HANDLING ======
console.log('\n--- Error handling ---');
runTestError('division by zero', 'print(1 / 0)', 'division by zero');
runTestError('modulo by zero', 'print(5 % 0)', 'modulo by zero');
runTestError('undefined variable', 'print(x)', 'not defined');
runTestError('index out of range', 'print([1, 2][5])', 'out of range');
runTestError('key error', 'd = {"a": 1}\nprint(d["z"])', '');

// ====== FS MODULE ======
console.log('\n--- FS module ---');
runTest('fs write read', 'fs_write("/tmp/bockie_test.txt", "hello")\nprint(fs_read("/tmp/bockie_test.txt"))', 'hello');
runTest('fs exists', 'fs_write("/tmp/bockie_test.txt", "x")\nprint(fs_exists("/tmp/bockie_test.txt"))', 'True');
runTest('fs not exists', 'print(fs_exists("/tmp/nonexistent_xyz.bckie"))', 'False');
runTest('fs append', 'fs_write("/tmp/bockie_test.txt", "a")\nfs_append("/tmp/bockie_test.txt", "b")\nprint(fs_read("/tmp/bockie_test.txt"))', 'ab');
runTest('fs join', 'print(fs_join("a", "b", "c"))', 'a/b/c');
runTest('fs ext', 'print(fs_ext("file.txt"))', '.txt');
runTest('fs basename', 'print(fs_basename("/path/to/file.txt"))', 'file.txt');
runTest('fs read lines', 'fs_write("/tmp/bockie_lines.txt", "a\\nb\\nc")\nprint(len(fs_read_lines("/tmp/bockie_lines.txt")))', '3');

// ====== OS MODULE ======
console.log('\n--- OS module ---');
runTestContains('os name', 'print(os_name())', '');
runTestContains('os arch', 'print(os_arch())', '');
runTestContains('os home', 'print(os_home())', '');
runTestContains('os cpu count', 'print(os_cpu_count())', '');
runTestContains('os pid', 'print(os_pid())', '');

// ====== CRYPTO MODULE ======
console.log('\n--- Crypto module ---');
runTest('md5', 'print(md5("hello"))', '5d41402abc4b2a76b9719d911017c592');
runTest('sha256', 'print(sha256("hello"))', '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
runTest('base64 encode', 'print(base64_encode("hello"))', 'aGVsbG8=');
runTest('base64 decode', 'print(base64_decode("aGVsbG8="))', 'hello');
runTest('url encode', 'print(url_encode("hello world"))', 'hello%20world');
runTest('url decode', 'print(url_decode("hello%20world"))', 'hello world');
runTestContains('uuid', 'print(uuid())', '-');
runTest('hmac', 'print(len(hmac_sha256("key", "msg")))', '64');

// ====== REGEX MODULE ======
console.log('\n--- Regex module ---');
runTest('regex match', 'print(regex_match("\\d+", "abc123"))', 'True');
runTest('regex no match', 'print(regex_match("\\d+", "abc"))', 'False');
runTest('regex find all', 'print(regex_find_all("\\d+", "a1b2c3"))', "['1', '2', '3']");
runTest('regex replace', 'print(regex_replace("\\d+", "#", "a1b2"))', 'a#b#');
runTest('regex split', 'print(regex_split("\\s+", "a b  c"))', "['a', 'b', 'c']");

// ====== DATETIME MODULE ======
console.log('\n--- Datetime module ---');
runTestContains('date year', 'print(date_year())', '20');
runTestContains('date month', 'print(date_month())', '');
runTestContains('date format', 'print(date_format("YYYY"))', '20');

// ====== GAME MODULE ======
console.log('\n--- Game module ---');
runTest('canvas create', 'import game\nc = game.canvas_create(640, 360)\nprint(game.canvas_width(c))', '640');
runTest('canvas height', 'import game\nc = game.canvas_create(640, 360)\nprint(game.canvas_height(c))', '360');
runTest('screen create', 'import game\ns = game.screen_create(40, 15)\nprint(game.screen_width(s))', '40');
runTestContains('canvas save html', 'import game\nc = game.canvas_create(100, 100)\ngame.canvas_save_html(c, "/tmp/bockie_game.html")\nprint(fs_exists("/tmp/bockie_game.html"))', 'True');

// ====== EDGE CASES ======
console.log('\n--- Edge cases ---');
runTest('empty list', 'print([])', '[]');
runTest('empty dict', 'print({})', '{}');
runTest('nested list', 'print([[1, 2], [3, 4]])', '[[1, 2], [3, 4]]');
runTest('nested dict', 'print({"a": {"b": 1}})', "{'a': {'b': 1}}");
runTest('negative zero', 'print(-0)', '0');
runTest('string to int error', 'try:\n    int("abc")\nexcept e:\n    print("error")', 'error');
runTest('chained comparison', 'x = 5\nif x > 0 and x < 10:\n    print("in range")', 'in range');
runTest('pass statement', 'if True:\n    pass\nprint("done")', 'done');
runTest('multiple assignment', 'a = b = 5\nprint(a, b)', '5 5');

// ====== GLOBAL STATEMENT ======
console.log('\n--- Global statement ---');
runTest('global basic', 'count = 0\ndef inc():\n    global count\n    count = count + 1\ninc()\ninc()\nprint(count)', '2');
runTest('global with return', 'x = 0\ndef tick():\n    global x\n    x = x + 1\n    return x\nprint(tick())\nprint(tick())\nprint(tick())', '1\n2\n3');
runTest('global accumulator', 'total = 0\ndef add(n):\n    global total\n    total = total + n\nadd(5)\nadd(10)\nadd(20)\nprint(total)', '35');
runTest('global aug assign', 'c = 0\ndef f():\n    global c\n    c += 1\nf()\nf()\nf()\nf()\nprint(c)', '4');
runTest('global multiple vars', 'a = 0\nb = 0\ndef f():\n    global a\n    global b\n    a = 10\n    b = 20\nf()\nprint(a, b)', '10 20');
runTest('global string', 'msg = "hi"\ndef f():\n    global msg\n    msg = "world"\nf()\nprint(msg)', 'world');
runTest('local does not leak', 'x = 10\ndef f():\n    x = 99\nf()\nprint(x)', '10');
runTest('local shadow then global', 'x = 1\ndef f():\n    x = 2\n    global y\n    y = 3\nf()\nprint(x, y)', '1 3');

// ====== MORE EDGE CASES ======
console.log('\n--- More edge cases ---');
runTest('single line def', 'def f(x): return x * 2\nprint(f(5))', '10');
runTest('single line class', 'class Foo: pass\nf = Foo()\nprint(type(f))', 'Foo');
runTest('single line if', 'if true: print("yes")', 'yes');
runTest('nested single line', 'def f(x):\n    if x > 0: return "pos"\n    return "neg"\nprint(f(5))\nprint(f(-1))', 'pos\nneg');
runTest('string mul negative', 'print("a" * -1)', '');
runTest('string mul zero', 'print("a" * 0)', '');
runTest('list mul negative', 'print([1] * -1)', '[]');
runTest('list mul zero', 'print([1] * 0)', '[]');
runTest('empty string length', 'print(len(""))', '0');
runTest('deeply nested', 'd = {"a": {"b": {"c": 42}}}\nprint(d["a"]["b"]["c"])', '42');

// ====== SUMMARY ======
console.log('\n' + '='.repeat(50));
console.log(`RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log('='.repeat(50));

if (failed > 0) {
  console.log('\nFAILED TESTS:');
  for (const f of failures) {
    console.log(`\n  ${f.name}`);
    console.log(`  Code: ${f.code}`);
    if (f.expected) console.log(`  Expected: ${JSON.stringify(f.expected).slice(0, 150)}`);
    if (f.actual !== undefined) console.log(`  Actual:   ${JSON.stringify(f.actual).slice(0, 150)}`);
    if (f.stderr) console.log(`  Stderr:   ${f.stderr.slice(0, 150)}`);
  }
}

process.exit(failed > 0 ? 1 : 0);

// ====== GLOBAL STATEMENT ======
console.log('\n--- Global statement ---');
runTest('global basic', 'count = 0\ndef inc():\n    global count\n    count = count + 1\ninc()\ninc()\nprint(count)', '2');
runTest('global with return', 'x = 0\ndef tick():\n    global x\n    x = x + 1\n    return x\nprint(tick())\nprint(tick())\nprint(tick())', '1\n2\n3');
runTest('global accumulator', 'total = 0\ndef add(n):\n    global total\n    total = total + n\nadd(5)\nadd(10)\nadd(20)\nprint(total)', '35');
runTest('global aug assign', 'c = 0\ndef f():\n    global c\n    c += 1\nf()\nf()\nf()\nf()\nprint(c)', '4');
runTest('global multiple vars', 'a = 0\nb = 0\ndef f():\n    global a\n    global b\n    a = 10\n    b = 20\nf()\nprint(a, b)', '10 20');
runTest('global string', 'msg = "hi"\ndef f():\n    global msg\n    msg = "world"\nf()\nprint(msg)', 'world');
runTest('local does not leak', 'x = 10\ndef f():\n    x = 99\nf()\nprint(x)', '10');
runTest('local shadow then global', 'x = 1\ndef f():\n    x = 2\n    global y\n    y = 3\nf()\nprint(x, y)', '1 3');

// ====== MORE EDGE CASES ======
console.log('\n--- More edge cases ---');
runTest('single line def', 'def f(x): return x * 2\nprint(f(5))', '10');
runTest('single line class', 'class Foo: pass\nf = Foo()\nprint(type(f))', 'Foo');
runTest('single line if', 'if true: print("yes")', 'yes');
runTest('nested single line', 'def f(x):\n    if x > 0: return "pos"\n    return "neg"\nprint(f(5))\nprint(f(-1))', 'pos\nneg');
runTest('string mul negative', 'print("a" * -1)', '');
runTest('string mul zero', 'print("a" * 0)', '');
runTest('list mul negative', 'print([1] * -1)', '[]');
runTest('list mul zero', 'print([1] * 0)', '[]');
runTest('empty string length', 'print(len(""))', '0');
runTest('deeply nested', 'd = {"a": {"b": {"c": 42}}}\nprint(d["a"]["b"]["c"])', '42');
