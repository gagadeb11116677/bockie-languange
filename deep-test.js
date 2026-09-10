#!/usr/bin/env node
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const BOCKIE = 'node';
const BOCKIE_ARGS = ['dist/index.js'];
const TESTS_DIR = path.join(os.tmpdir(), 'bockie-deep-tests');
const CLI_DIR = path.resolve(__dirname);

if (!fs.existsSync(TESTS_DIR)) fs.mkdirSync(TESTS_DIR, { recursive: true });

let passed = 0;
let failed = 0;
const failures = [];

function run(name, code, expected) {
  const f = path.join(TESTS_DIR, `t_${Date.now()}_${Math.random().toString(36).slice(2,6)}.bckie`);
  fs.writeFileSync(f, code);
  try {
    const r = spawnSync(BOCKIE, [...BOCKIE_ARGS, 'run', f], { encoding:'utf-8', timeout:15000, cwd:CLI_DIR });
    const actual = (r.stdout||'').trim();
    const exp = typeof expected==='function'?expected(actual):expected;
    if (actual===exp) { passed++; }
    else { failed++; failures.push({name,code,expected:exp,actual,stderr:r.stderr||''});
      console.log(`[FAIL] ${name}`);
      console.log(`  Exp: ${JSON.stringify(exp).slice(0,120)}`);
      console.log(`  Got: ${JSON.stringify(actual).slice(0,120)}`);
      if(r.stderr) console.log(`  Err: ${r.stderr.slice(0,150)}`);
    }
  } catch(e) { failed++; failures.push({name,code,error:e.message}); console.log(`[ERR] ${name}: ${e.message}`); }
  finally { try{fs.unlinkSync(f)}catch(e){} }
}

function runContains(name, code, sub) {
  const f = path.join(TESTS_DIR, `t_${Date.now()}_${Math.random().toString(36).slice(2,6)}.bckie`);
  fs.writeFileSync(f, code);
  try {
    const r = spawnSync(BOCKIE, [...BOCKIE_ARGS, 'run', f], { encoding:'utf-8', timeout:15000, cwd:CLI_DIR });
    const out = (r.stdout||'')+(r.stderr||'');
    if (out.includes(sub)) { passed++; } else { failed++; failures.push({name,code,sub,out});
      console.log(`[FAIL] ${name}`); console.log(`  Want: ${sub}`); console.log(`  Got: ${out.slice(0,150)}`); }
  } catch(e) { failed++; failures.push({name,code,error:e.message}); console.log(`[ERR] ${name}`); }
  finally { try{fs.unlinkSync(f)}catch(e){} }
}

function runError(name, code, errSub) {
  const f = path.join(TESTS_DIR, `t_${Date.now()}_${Math.random().toString(36).slice(2,6)}.bckie`);
  fs.writeFileSync(f, code);
  try {
    const r = spawnSync(BOCKIE, [...BOCKIE_ARGS, 'run', f], { encoding:'utf-8', timeout:15000, cwd:CLI_DIR });
    const out = (r.stdout||'')+(r.stderr||'');
    if (out.includes(errSub)) { passed++; } else { failed++; failures.push({name,code,errSub,out});
      console.log(`[FAIL] ${name}`); console.log(`  Want err: ${errSub}`); console.log(`  Got: ${out.slice(0,150)}`); }
  } catch(e) { failed++; failures.push({name,code,error:e.message}); console.log(`[ERR] ${name}`); }
  finally { try{fs.unlinkSync(f)}catch(e){} }
}

console.log('Deep test suite v3.1.0 — testing every feature to the root\n');

// ============ VARIABLES & TYPES ============
console.log('--- Variables & Types ---');
run('int literal', 'print(42)', '42');
run('float literal', 'print(3.14)', '3.14');
run('negative int', 'print(-5)', '-5');
run('negative float', 'print(-3.14)', '-3.14');
run('zero', 'print(0)', '0');
run('negative zero', 'print(-0)', '0');
run('string single', "print('hello')", 'hello');
run('string double', 'print("hello")', 'hello');
run('string empty', 'print("")', '');
run('string with escape', 'print("a\\nb")', 'a\nb');
run('string with tab', 'print("a\\tb")', 'a\tb');
run('string with quote', 'print("a\\"b")', 'a"b');
run('string with backslash', 'print("a\\\\b")', 'a\\b');
run('True capital', 'print(True)', 'True');
run('False capital', 'print(False)', 'False');
run('None', 'print(None)', 'None');
run('true lowercase', 'print(true)', 'True');
run('false lowercase', 'print(false)', 'False');
run('null lowercase', 'print(null)', 'None');
run('none lowercase', 'print(none)', 'None');
run('list literal', 'print([1, 2, 3])', '[1, 2, 3]');
run('list empty', 'print([])', '[]');
run('list nested', 'print([[1, 2], [3, 4]])', '[[1, 2], [3, 4]]');
run('list mixed', 'print([1, "two", true, None])', '[1, \'two\', True, None]');
run('dict literal', 'print({"a": 1, "b": 2})', "{'a': 1, 'b': 2}");
run('dict empty', 'print({})', '{}');
run('dict nested', 'print({"a": {"b": 1}})', "{'a': {'b': 1}}");
run('tuple literal', 'print((1, 2, 3))', '(1, 2, 3)');
run('tuple single', 'print((42,))', '(42)');
run('tuple empty', 'print(())', '()');
run('multi assign', 'a, b, c = 1, 2, 3\nprint(a, b, c)', '1 2 3');
run('swap', 'a = 1\nb = 2\na, b = b, a\nprint(a, b)', '2 1');
run('chained assign', 'a = b = 5\nprint(a, b)', '5 5');
run('triple string', 'x = """\nhello\nworld\n"""\nprint(x)', 'hello\nworld');

// ============ ARITHMETIC ============
console.log('\n--- Arithmetic ---');
run('add', 'print(1+2)', '3');
run('sub', 'print(10-3)', '7');
run('mul', 'print(4*5)', '20');
run('div', 'print(10/4)', '2.5');
run('div int', 'print(10/2)', '5');
run('mod pos', 'print(7%3)', '1');
run('mod neg dividend', 'print(-3%26)', '23');
run('mod neg dividend 2', 'print(-1%5)', '4');
run('mod neg dividend 3', 'print(-7%3)', '2');
run('mod neg divisor', 'print(7%-3)', '-2');
run('mod zero', 'print(0%5)', '0');
run('power', 'print(2**10)', '1024');
run('power neg exp', 'print(2**-1)', '0.5');
run('power zero', 'print(5**0)', '1');
run('power frac exp', 'print(9**0.5)', '3');
run('unary minus', 'x = 5\nprint(-x)', '-5');
run('unary plus', 'x = 5\nprint(+x)', '5');
run('float div precision', 'print(0.1+0.2)', '0.30000000000000004');
run('aug +=', 'x=5\nx+=3\nprint(x)', '8');
run('aug -=', 'x=10\nx-=4\nprint(x)', '6');
run('aug *=', 'x=3\nx*=4\nprint(x)', '12');
run('aug /=', 'x=10\nx/=2\nprint(x)', '5');
run('aug %=', 'x=10\nx%=3\nprint(x)', '1');
run('aug %= neg', 'x=-5\nx%=3\nprint(x)', '1');
run('string concat', 'print("a"+"b")', 'ab');
run('string mul', 'print("ab"*3)', 'ababab');
run('string mul zero', 'print("a"*0)', '');
run('string mul neg', 'print("a"*-1)', '');
run('list concat', 'print([1,2]+[3,4])', '[1, 2, 3, 4]');
run('list mul', 'print([0]*3)', '[0, 0, 0]');
run('list mul zero', 'print([1]*0)', '[]');
run('list mul neg', 'print([1]*-1)', '[]');
run('string+number coerce', 'print("x="+5)', 'x=5');
run('number+string coerce', 'print(5+"x")', '5x');

// ============ COMPARISON ============
console.log('\n--- Comparison ---');
run('eq true', 'print(5==5)', 'True');
run('eq false', 'print(5==3)', 'False');
run('neq', 'print(5!=3)', 'True');
run('lt', 'print(3<5)', 'True');
run('gt', 'print(5>3)', 'True');
run('lte', 'print(5<=5)', 'True');
run('gte', 'print(5>=5)', 'True');
run('eq string', 'print("a"=="a")', 'True');
run('neq string', 'print("a"!="b")', 'True');
run('lt string', 'print("a"<"b")', 'True');
run('eq list', 'print([1,2]==[1,2])', 'True');
run('neq list', 'print([1,2]==[1,3])', 'False');
run('eq None', 'print(None==None)', 'True');
run('eq bool', 'print(True==True)', 'True');
run('eq diff types', 'print(5=="5")', 'False');
run('in list', 'print(2 in [1,2,3])', 'True');
run('not in list', 'print(5 not in [1,2,3])', 'True');
run('in string', 'print("ell" in "hello")', 'True');
run('not in string', 'print("xyz" not in "hello")', 'True');
run('in dict key', 'print("a" in {"a":1})', 'True');
run('not in dict', 'print("b" not in {"a":1})', 'True');

// ============ LOGICAL ============
console.log('\n--- Logical ---');
run('and true', 'print(True and True)', 'True');
run('and false', 'print(True and False)', 'False');
run('or true', 'print(False or True)', 'True');
run('or false', 'print(False or False)', 'False');
run('not true', 'print(not True)', 'False');
run('not false', 'print(not False)', 'True');
run('and short circuit', 'print(False and undefined_var)', 'False');
run('or short circuit', 'print(True or undefined_var)', 'True');
run('chained and', 'print(1 < 2 and 3 < 4)', 'True');
run('chained or', 'print(1 > 2 or 3 < 4)', 'True');
run('not not', 'print(not not True)', 'True');

// ============ STRINGS ============
console.log('\n--- Strings ---');
run('len', 'print(len("hello"))', '5');
run('len empty', 'print(len(""))', '0');
run('upper', 'print(str_upper("hello"))', 'HELLO');
run('lower', 'print(str_lower("WORLD"))', 'world');
run('strip', 'print(str_strip("  hi  "))', 'hi');
run('split', 'print(str_split("a,b,c", ","))', "['a', 'b', 'c']");
run('split no sep', 'print(str_split("a b c"))', "['a', 'b', 'c']");
run('join', 'print(str_join("-", ["a","b","c"]))', 'a-b-c');
run('replace', 'print(str_replace("hello", "l", "r"))', 'herro');
run('contains', 'print(str_contains("hello", "ell"))', 'True');
run('starts_with', 'print(str_starts_with("hello", "he"))', 'True');
run('ends_with', 'print(str_ends_with("hello", "lo"))', 'True');
run('find', 'print(str_find("hello", "l"))', '2');
run('find not found', 'print(str_find("hello", "z"))', '-1');
run('count', 'print(str_count("hello", "l"))', '2');
run('repeat', 'print(str_repeat("ab", 3))', 'ababab');
run('pad_left', 'print(pad_left("5", 3, "0"))', '005');
run('pad_right', 'print(pad_right("hi", 5, "."))', 'hi...');
run('reverse', 'print(reverse_str("hello"))', 'olleh');
run('capitalize', 'print(capitalize("hello"))', 'Hello');
run('title_case', 'print(title_case("hello world"))', 'Hello World');
run('to_camel', 'print(to_camel_case("hello_world"))', 'helloWorld');
run('to_snake', 'print(to_snake_case("helloWorld"))', 'hello_world');
run('to_kebab', 'print(to_kebab_case("helloWorld"))', 'hello-world');
run('is_digit', 'print(is_digit("123"))', 'True');
run('is_digit false', 'print(is_digit("12a"))', 'False');
run('is_alpha', 'print(is_alpha("abc"))', 'True');
run('is_alpha false', 'print(is_alpha("ab1"))', 'False');
run('is_alnum', 'print(is_alnum("abc123"))', 'True');
run('is_space', 'print(is_space("   "))', 'True');
run('is_upper', 'print(is_upper("ABC"))', 'True');
run('is_lower', 'print(is_lower("abc"))', 'True');
run('string_format', 'print(string_format("{} + {} = {}", 1, 2, 3))', '1 + 2 = 3');
run('char_code', 'print(char_code("A"))', '65');
run('char_from', 'print(char_from(66))', 'B');
run('split_lines', 'print(split_lines("a\\nb\\nc"))', "['a', 'b', 'c']");
run('method upper', 's = "hello"\nprint(s.upper())', 'HELLO');
run('method lower', 's = "HELLO"\nprint(s.lower())', 'hello');
run('method strip', 's = "  hi  "\nprint(s.strip())', 'hi');
run('method split', 's = "a,b,c"\nprint(s.split(","))', "['a', 'b', 'c']");
run('method replace', 's = "hello"\nprint(s.replace("l", "r"))', 'herro');
run('method contains', 's = "hello"\nprint(s.contains("ell"))', 'True');
run('string index', 'print("hello"[1])', 'e');
run('string neg index', 'print("hello"[-1])', 'o');
run('string slice', 'print("hello"[1:4])', 'ell');
run('string slice start', 'print("hello"[:3])', 'hel');
run('string slice end', 'print("hello"[2:])', 'llo');
run('string slice neg', 'print("hello"[-3:])', 'llo');

// ============ INTERPOLATION ============
console.log('\n--- Interpolation ---');
run('basic interp', 'x = "world"\nprint("hello {x}")', 'hello world');
run('expr interp', 'print("{2+2}")', '4');
run('multi interp', 'a=1\nb=2\nprint("{a}+{b}={a+b}")', '1+2=3');
run('func interp', 'print("{len(\'hi\')}")', '2');
run('method interp', 'x = "hi"\nprint("{str_upper(x)}")', 'HI');
run('escape brace open', 'print("{{not")', '{not');
run('escape brace close', 'print("not}}")', 'not}');
run('escape both', 'print("{{x}}")', '{x}');
run('json string', "print('{\"x\": 10}')", '{"x": 10}');
run('dict in string', 'd = {"a": 1}\nprint("{d}")', "{'a': 1}");
run('list in string', 'l = [1, 2]\nprint("{l}")', '[1, 2]');
run('nested interp', 'd = {"name": "Bob"}\nprint("{d[\'name\']}")', 'Bob');

// ============ LISTS ============
console.log('\n--- Lists ---');
run('list index', 'print([10,20,30][1])', '20');
run('list neg index', 'print([10,20,30][-1])', '30');
run('list slice', 'print([1,2,3,4,5][1:3])', '[2, 3]');
run('list slice start', 'print([1,2,3,4,5][:2])', '[1, 2]');
run('list slice end', 'print([1,2,3,4,5][2:])', '[3, 4, 5]');
run('list slice neg', 'print([1,2,3,4,5][-2:])', '[4, 5]');
run('list slice out of range', 'print([1,2,3][0:100])', '[1, 2, 3]');
run('list slice empty', 'print([1,2,3][3:1])', '[]');
run('append', 'x=[1,2]\nlist_append(x,3)\nprint(x)', '[1, 2, 3]');
run('pop', 'x=[1,2,3]\nprint(list_pop(x))', '3');
run('pop idx', 'x=[1,2,3]\nprint(list_pop(x, 0))', '1');
run('insert', 'x=[1,3]\nlist_insert(x,1,2)\nprint(x)', '[1, 2, 3]');
run('remove', 'x=[1,2,3]\nlist_remove(x,2)\nprint(x)', '[1, 3]');
run('index', 'print(list_index([1,2,3], 2))', '1');
run('count', 'print(list_count([1,1,2], 1))', '2');
run('sort', 'x=[3,1,2]\nlist_sort(x)\nprint(x)', '[1, 2, 3]');
run('reverse', 'x=[1,2,3]\nlist_reverse(x)\nprint(x)', '[3, 2, 1]');
run('extend', 'x=[1,2]\nlist_extend(x,[3,4])\nprint(x)', '[1, 2, 3, 4]');
run('copy', 'x=[1,2]\ny=list_copy(x)\nlist_append(y,3)\nprint(x)', '[1, 2]');
run('len list', 'print(len([1,2,3]))', '3');
run('sum', 'print(sum([1,2,3,4]))', '10');
run('min', 'print(min([3,1,2]))', '1');
run('max', 'print(max([3,1,2]))', '3');
run('method append', 'x=[1]\nx.append(2)\nprint(x)', '[1, 2]');
run('method pop', 'x=[1,2,3]\nprint(x.pop())', '3');
run('method sort', 'x=[3,1,2]\nx.sort()\nprint(x)', '[1, 2, 3]');
run('method reverse', 'x=[1,2,3]\nx.reverse()\nprint(x)', '[3, 2, 1]');
run('list assign idx', 'x=[1,2,3]\nx[0]=99\nprint(x)', '[99, 2, 3]');
run('list assign neg', 'x=[1,2,3]\nx[-1]=99\nprint(x)', '[1, 2, 99]');
run('sorted', 'print(sorted([3,1,2]))', '[1, 2, 3]');
run('sorted rev', 'print(sorted([3,1,2], reverse=true))', '[3, 2, 1]');
run('sorted key', 'print(sorted(["bb","a","ccc"], key=lambda s: len(s)))', "['a', 'bb', 'ccc']");
run('reversed', 'print(reversed([1,2,3]))', '[3, 2, 1]');
run('map', 'print(map(lambda x: x*2, [1,2,3]))', '[2, 4, 6]');
run('filter', 'print(filter(lambda x: x>2, [1,2,3,4]))', '[3, 4]');
run('reduce', 'print(reduce(lambda a,b: a+b, [1,2,3,4]))', '10');
run('any', 'print(any([false, true, false]))', 'True');
run('all', 'print(all([true, true, false]))', 'False');
run('find', 'print(find(lambda x: x>3, [1,2,3,4,5]))', '4');
run('find none', 'print(find(lambda x: x>10, [1,2,3]))', 'None');
run('find_index', 'print(find_index(lambda x: x>3, [1,2,3,4]))', '3');
run('find_index nf', 'print(find_index(lambda x: x>10, [1,2,3]))', '-1');
run('count_fn', 'print(count(lambda x: x%2==0, [1,2,3,4,5,6]))', '3');
run('take', 'print(take([1,2,3,4,5], 3))', '[1, 2, 3]');
run('drop', 'print(drop([1,2,3,4,5], 2))', '[3, 4, 5]');
run('chunk', 'print(chunk([1,2,3,4,5], 2))', '[[1, 2], [3, 4], [5]]');
run('flatten', 'print(flatten([[1,2],[3,4],[5]]))', '[1, 2, 3, 4, 5]');
run('unique', 'print(unique([1,1,2,3,3,4]))', '[1, 2, 3, 4]');
run('interleave', 'print(interleave([1,3],[2,4]))', '[1, 2, 3, 4]');
run('groupby', 'print(groupby(lambda x: x%2, [1,2,3,4,5]))', "{'1': [1, 3, 5], '0': [2, 4]}");
run('max_by', 'people=[{"a":30},{"a":25}]\nprint(max_by(lambda p: p["a"], people)["a"])', '30');
run('min_by', 'people=[{"a":30},{"a":25}]\nprint(min_by(lambda p: p["a"], people)["a"])', '25');
run('range_of', 'print(range_of([5,3,8,1,9]))', '(1, 9)');
run('enumerate', 'for i, x in enumerate(["a","b"]):\n    print(i, x)', '0 a\n1 b');
run('zip', 'for a, b in zip([1,2],[3,4]):\n    print(a, b)', '1 3\n2 4');

// ============ DICTS ============
console.log('\n--- Dicts ---');
run('dict access', 'print({"a": 1}["a"])', '1');
run('dict get', 'print(dict_get({"a":1}, "a"))', '1');
run('dict get default', 'print(dict_get({"a":1}, "b", 99))', '99');
run('dict get none', 'print(dict_get({"a":1}, "b"))', 'None');
run('dict set', 'd={}\ndict_set(d,"x",1)\nprint(d["x"])', '1');
run('dict keys', 'print(dict_keys({"a":1,"b":2}))', "['a', 'b']");
run('dict values', 'print(dict_values({"a":1,"b":2}))', '[1, 2]');
run('dict contains', 'print(dict_contains({"a":1}, "a"))', 'True');
run('dict not contains', 'print(dict_contains({"a":1}, "b"))', 'False');
run('dict len', 'print(len({"a":1,"b":2}))', '2');
run('dict null coalesce', 'd={"a":1}\nprint(d["b"] ?? "def")', 'def');
run('dict assign', 'd={"a":1}\nd["a"]=99\nprint(d["a"])', '99');
run('dict add key', 'd={}\nd["new"]=42\nprint(d["new"])', '42');
run('dict pop', 'd={"a":1}\nprint(dict_pop(d, "a"))', '1');
run('dict pop default', 'print(dict_pop({"a":1}, "b", 99))', '99');
run('dict copy', 'd={"a":1}\nc=dict_copy(d)\nc["b"]=2\nprint(d)', "{'a': 1}");
run('dict update', 'd={"a":1}\ndict_update(d, {"b":2})\nprint(d)', "{'a': 1, 'b': 2}");
run('dict items', 'print(dict_items({"a":1}))', "[('a', 1)]");
run('dict iter', 'd={"a":1,"b":2}\nfor k in dict_keys(d):\n    print(k)', 'a\nb');
run('dict nested', 'd={"a":{"b":1}}\nprint(d["a"]["b"])', '1');
run('dict nested assign', 'd={"a":{"b":1}}\nd["a"]["b"]=99\nprint(d["a"]["b"])', '99');

// ============ CONTROL FLOW ============
console.log('\n--- Control Flow ---');
run('if true', 'if true:\n    print("yes")', 'yes');
run('if false', 'if false:\n    print("no")\nelse:\n    print("else")', 'else');
run('elif', 'x=2\nif x==1:\n    print("one")\nelif x==2:\n    print("two")', 'two');
run('single line if', 'if true: print("ok")', 'ok');
run('single line if else', 'if false: print("no")\nelse: print("yes")', 'yes');
run('while', 'i=0\nwhile i<3:\n    print(i)\n    i+=1', '0\n1\n2');
run('while break', 'i=0\nwhile true:\n    if i>=3: break\n    print(i)\n    i+=1', '0\n1\n2');
run('while continue', 'i=0\nwhile i<5:\n    i+=1\n    if i==3: continue\n    print(i)', '1\n2\n4\n5');
run('for range', 'for i in range(3):\n    print(i)', '0\n1\n2');
run('for range step', 'for i in range(0,10,2):\n    print(i)', '0\n2\n4\n6\n8');
run('for range neg step', 'for i in range(3,0,-1):\n    print(i)', '3\n2\n1');
run('for list', 'for x in [10,20,30]:\n    print(x)', '10\n20\n30');
run('for dict', 'd={"a":1,"b":2}\nfor k in dict_keys(d):\n    print(k)', 'a\nb');
run('for enumerate', 'for i, x in enumerate(["a","b"]):\n    print(i, x)', '0 a\n1 b');
run('for zip', 'for a, b in zip([1,2],[3,4]):\n    print(a, b)', '1 3\n2 4');
run('nested for', 'for i in range(2):\n    for j in range(2):\n        print(i, j)', '0 0\n0 1\n1 0\n1 1');
run('repeat with var', 'repeat 3 times i:\n    print(i)', '0\n1\n2');
run('repeat no var', 'repeat 2:\n    print("hi")', 'hi\nhi');
run('unless true', 'x=20\nunless x>10:\n    print("small")\nelse:\n    print("big")', 'big');
run('unless false', 'x=5\nunless x>10:\n    print("small")', 'small');
run('until', 'i=0\nuntil i>=3:\n    print(i)\n    i+=1', '0\n1\n2');
run('pass', 'if true:\n    pass\nprint("done")', 'done');
run('break in for', 'for i in range(10):\n    if i==3: break\n    print(i)', '0\n1\n2');
run('continue in for', 'for i in range(5):\n    if i==2: continue\n    print(i)', '0\n1\n3\n4');
run('ternary', 'x=5\nprint("big" if x>3 else "small")', 'big');

// ============ FUNCTIONS ============
console.log('\n--- Functions ---');
run('basic func', 'def f():\n    return 42\nprint(f())', '42');
run('func args', 'def add(a, b):\n    return a + b\nprint(add(3, 4))', '7');
run('func default', 'def f(a, b=10):\n    return a+b\nprint(f(5))', '15');
run('func default override', 'def f(a, b=10):\n    return a+b\nprint(f(5, 20))', '25');
run('lambda', 'f = lambda x: x * 2\nprint(f(5))', '10');
run('lambda multi', 'f = lambda a, b: a + b\nprint(f(1, 2))', '3');
run('lambda no args', 'f = lambda: 42\nprint(f())', '42');
run('recursion', 'def fact(n):\n    if n<=1: return 1\n    return n*fact(n-1)\nprint(fact(5))', '120');
run('fibonacci', 'def fib(n):\n    if n<=1: return n\n    return fib(n-1)+fib(n-2)\nprint(fib(10))', '55');
run('closure', 'def outer():\n    x = 10\n    def inner():\n        return x\n    return inner()\nprint(outer())', '10');
run('func as value', 'def f(x): return x*2\ng = f\nprint(g(5))', '10');
run('single line def', 'def f(x): return x * 2\nprint(f(5))', '10');
run('nested single line', 'def f(x):\n    if x > 0: return "pos"\n    return "neg"\nprint(f(5))\nprint(f(-1))', 'pos\nneg');
run('return none', 'def f():\n    return\nprint(f())', 'None');
run('no return', 'def f():\n    x = 1\nprint(f())', 'None');
run('kwargs sorted', 'print(sorted([3,1,2], reverse=true))', '[3, 2, 1]');
run('kwargs sorted key', 'print(sorted(["bb","a"], key=lambda s: len(s)))', "['a', 'bb']");
run('func pass func', 'def apply(f, x):\n    return f(x)\nprint(apply(lambda x: x*2, 5))', '10');

// ============ CLASSES ============
console.log('\n--- Classes ---');
run('class basic', 'class Foo:\n    def __init__(self, x):\n        self.x = x\nf = Foo(5)\nprint(f.x)', '5');
run('class method', 'class Foo:\n    def get_val(self):\n        return 42\nf = Foo()\nprint(f.get_val())', '42');
run('class __str__', 'class Foo:\n    def __str__(self):\n        return "FOO"\nf = Foo()\nprint(f)', 'FOO');
run('class field', 'class Foo:\n    def __init__(self):\n        self.val = 10\nf = Foo()\nprint(f.val)', '10');
run('class field assign', 'class Foo:\n    def __init__(self):\n        self.x = 1\nf = Foo()\nf.x = 99\nprint(f.x)', '99');
run('inheritance', 'class A:\n    def f(self):\n        return 1\nclass B(A):\n    pass\nb = B()\nprint(b.f())', '1');
run('override', 'class A:\n    def f(self):\n        return 1\nclass B(A):\n    def f(self):\n        return 2\nb = B()\nprint(b.f())', '2');
run('isinstance same', 'class A:\n    pass\na = A()\nprint(isinstance(a, "A"))', 'True');
run('isinstance parent', 'class A:\n    pass\nclass B(A):\n    pass\nb = B()\nprint(isinstance(b, "A"))', 'True');
run('isinstance wrong', 'class A:\n    pass\nclass B:\n    pass\nb = B()\nprint(isinstance(b, "A"))', 'False');
run('builder pattern', 'class B:\n    def __init__(self):\n        self.v = 0\n    def add(self, n):\n        self.v += n\n        return self\nb = B()\nb.add(5).add(10)\nprint(b.v)', '15');
run('class default param', 'class Foo:\n    def __init__(self, x, y=10):\n        self.x = x\n        self.y = y\nf = Foo(5)\nprint(f.x, f.y)', '5 10');
run('single line class', 'class Foo: pass\nf = Foo()\nprint(type(f))', 'Foo');
run('class with __init__ super', 'class Animal:\n    def __init__(self, name):\n        self.name = name\nclass Dog(Animal):\n    def __init__(self, name):\n        self.name = name\n        self.sound = "Woof"\nd = Dog("Rex")\nprint(d.name, d.sound)', 'Rex Woof');

// ============ MATCH/CASE ============
console.log('\n--- Match/Case ---');
run('match basic', 'match 2:\n    case 1:\n        print("one")\n    case 2:\n        print("two")', 'two');
run('match default', 'match 99:\n    case 1:\n        print("one")\n    default:\n        print("other")', 'other');
run('match string', 'match "hi":\n    case "hi":\n        print("hello")\n    default:\n        print("?")', 'hello');
run('match multi', 'def f(x):\n    match x:\n        case 1: return "one"\n        case 2: return "two"\n        default: return "many"\nprint(f(1))\nprint(f(2))\nprint(f(99))', 'one\ntwo\nmany');

// ============ PIPELINE/NULL/SPREAD/WALRUS ============
console.log('\n--- Pipeline/Null/Spread/Walrus ---');
run('pipeline', 'def f(x): return x*2\nprint(5 |> f)', '10');
run('pipeline chain', 'def d(x): return x*2\ndef a(x): return x+1\nprint(5 |> d |> a)', '11');
run('pipeline call args', 'def add(a,b): return a+b\nprint(3 |> add(2))', '5');
run('null coalesce none', 'x = None\nprint(x ?? "default")', 'default');
run('null coalesce value', 'x = "hi"\nprint(x ?? "default")', 'hi');
run('null coalesce dict', 'd = {"a": 1}\nprint(d["b"] ?? 99)', '99');
run('null coalesce chain', 'print(None ?? None ?? "found")', 'found');
run('spread list', 'a = [1, 2]\nprint([0, ...a, 3])', '[0, 1, 2, 3]');
run('spread call', 'def add3(a, b, c): return a+b+c\nnums = [1, 2, 3]\nprint(add3(...nums))', '6');
run('walrus', 'if (n := 5) > 3:\n    print(n)', '5');
run('walrus while', 'i = 0\nwhile (n := i + 1) < 4:\n    print(n)\n    i = n', '1\n2\n3');

// ============ GLOBAL / NONLOCAL ============
console.log('\n--- Global / Nonlocal ---');
run('global basic', 'count = 0\ndef inc():\n    global count\n    count += 1\ninc()\ninc()\nprint(count)', '2');
run('global return', 'x = 0\ndef tick():\n    global x\n    x += 1\n    return x\nprint(tick())\nprint(tick())', '1\n2');
run('global accumulator', 'total = 0\ndef add(n):\n    global total\n    total += n\nadd(5)\nadd(10)\nprint(total)', '15');
run('global multiple', 'a = 0\nb = 0\ndef f():\n    global a\n    global b\n    a = 10\n    b = 20\nf()\nprint(a, b)', '10 20');
run('global string', 'msg = "hi"\ndef f():\n    global msg\n    msg = "world"\nf()\nprint(msg)', 'world');
run('local no leak', 'x = 10\ndef f():\n    x = 99\nf()\nprint(x)', '10');
run('nonlocal basic', 'def mc():\n    c = 0\n    def inc():\n        nonlocal c\n        c += 1\n        return c\n    return inc\nc = mc()\nprint(c())\nprint(c())', '1\n2');
run('nonlocal modify', 'def outer():\n    x = 10\n    def inner():\n        nonlocal x\n        x += 5\n    inner()\n    print(x)\nouter()', '15');
run('nonlocal string', 'def outer():\n    msg = "hi"\n    def inner():\n        nonlocal msg\n        msg = "world"\n    inner()\n    print(msg)\nouter()', 'world');

// ============ TRY/EXCEPT ============
console.log('\n--- Try/Except ---');
run('try except', 'try:\n    x = 1/0\nexcept e:\n    print("caught")', 'caught');
run('try finally', 'try:\n    print("try")\nfinally:\n    print("fin")', 'try\nfin');
run('try except finally', 'try:\n    print("try")\nexcept e:\n    print("exc")\nfinally:\n    print("fin")', 'try\nfin');
run('raise', 'def f():\n    raise "err"\ntry:\n    f()\nexcept e:\n    print(e)', 'err');
run('try in loop', 'for i in range(3):\n    try:\n        if i==1: raise "skip"\n        print("ok {i}")\n    except e:\n        print("err {i}")', 'ok 0\nerr 1\nok 2');
run('nested try', 'try:\n    try:\n        print("inner")\n    except e:\n        print("inner catch")\n    print("outer")\nexcept e:\n    print("outer catch")', 'inner\nouter');
run('except raw message', 'try:\n    raise "custom"\nexcept e:\n    print(e)', 'custom');
runError('div by zero', 'print(1/0)', 'division by zero');
runError('mod by zero', 'print(5%0)', 'modulo by zero');
runError('undefined var', 'print(x)', 'not defined');
runError('index out of range', 'print([1,2][5])', 'out of range');

// ============ TYPE CONVERSION ============
console.log('\n--- Type Conversion ---');
run('int from str', 'print(int("42"))', '42');
run('int from float', 'print(int(3.7))', '3');
run('int from bool', 'print(int(true))', '1');
run('float from str', 'print(float("3.14"))', '3.14');
run('str from num', 'print(str(42))', '42');
run('bool 0', 'print(bool(0))', 'False');
run('bool 1', 'print(bool(1))', 'True');
run('bool empty str', 'print(bool(""))', 'False');
run('bool nonempty', 'print(bool("hi"))', 'True');
run('bool empty list', 'print(bool([]))', 'False');
run('bool nonempty list', 'print(bool([1]))', 'True');
run('type int', 'print(type(42))', 'int');
run('type float', 'print(type(3.14))', 'float');
run('type str', 'print(type("hi"))', 'str');
run('type bool', 'print(type(true))', 'bool');
run('type list', 'print(type([]))', 'list');
run('type dict', 'print(type({}))', 'dict');
run('type None', 'print(type(None))', 'NoneType');
run('int invalid', 'try:\n    int("abc")\nexcept e:\n    print("error")', 'error');

// ============ MATH ============
console.log('\n--- Math ---');
run('abs', 'print(abs(-5))', '5');
run('abs pos', 'print(abs(5))', '5');
run('round', 'print(round(3.14159, 2))', '3.14');
run('round 0', 'print(round(3.7))', '4');
run('floor', 'print(floor(3.7))', '3');
run('ceil', 'print(ceil(3.2))', '4');
run('sqrt', 'print(sqrt(16))', '4');
run('pow', 'print(pow(2, 8))', '256');
run('min multi', 'print(min(5, 2, 8))', '2');
run('max multi', 'print(max(5, 2, 8))', '8');
run('sign pos', 'print(sign(5))', '1');
run('sign neg', 'print(sign(-5))', '-1');
run('sign zero', 'print(sign(0))', '0');
run('clamp', 'print(clamp(15, 0, 10))', '10');
run('clamp low', 'print(clamp(-5, 0, 10))', '0');
run('format hex', 'print(format(255, "02x"))', 'ff');
run('format bin', 'print(format(10, "08b"))', '00001010');
run('format float', 'print(format(3.14159, ".2f"))', '3.14');
run('format comma', 'print(format(1234567, ",.2f"))', '1,234,567.00');
run('mean', 'print(mean([1,2,3,4,5]))', '3');
run('median odd', 'print(median([1,3,5]))', '3');
run('median even', 'print(median([1,2,3,4]))', '2.5');
run('product', 'print(product([2,3,4]))', '24');
run('deep_copy', 'a = [[1,2],[3,4]]\nb = deep_copy(a)\nb[0][0] = 99\nprint(a[0][0])', '1');

// ============ RANDOM ============
console.log('\n--- Random ---');
runContains('random range', 'print(random() >= 0)', 'True');
runContains('randint', 'print(randint(1, 10) >= 1)', 'True');
runContains('randint hi', 'print(randint(1, 10) <= 10)', 'True');
runContains('choice', 'print(choice([1,2,3]))', '');
runContains('uuid', 'print(uuid())', '-');

// ============ TIME ============
console.log('\n--- Time ---');
runContains('now', 'print(now())', '');
runContains('now_ms', 'print(now_ms())', '');
runContains('date_year', 'print(date_year())', '20');
runContains('date_month', 'print(date_month())', '');
runContains('date_day', 'print(date_day())', '');
runContains('date_format', 'print(date_format("YYYY"))', '20');

// ============ JSON ============
console.log('\n--- JSON ---');
run('json dumps', 'print(json_dumps({"a": 1}))', '{"a":1}');
run('json loads', 'd = json_loads(\'{"x": 10}\')\nprint(d["x"])', '10');
run('json round trip', 'd = {"a": 1, "b": [1,2,3]}\ns = json_dumps(d)\nd2 = json_loads(s)\nprint(d2["b"])', '[1, 2, 3]');
run('json pretty', 'd = {"a": 1}\nprint(len(json_pretty(d)) > 5)', 'True');
run('json nested', 'd = {"a": {"b": {"c": 1}}}\ns = json_dumps(d)\nd2 = json_loads(s)\nprint(d2["a"]["b"]["c"])', '1');

// ============ FS ============
console.log('\n--- FS ---');
run('fs write read', 'fs_write("/tmp/bt.txt", "hello")\nprint(fs_read("/tmp/bt.txt"))', 'hello');
run('fs exists', 'fs_write("/tmp/bt.txt", "x")\nprint(fs_exists("/tmp/bt.txt"))', 'True');
run('fs not exists', 'print(fs_exists("/tmp/nonexist_xyz.bckie"))', 'False');
run('fs append', 'fs_write("/tmp/bt.txt", "a")\nfs_append("/tmp/bt.txt", "b")\nprint(fs_read("/tmp/bt.txt"))', 'ab');
run('fs join', 'print(fs_join("a", "b", "c"))', 'a/b/c');
run('fs ext', 'print(fs_ext("file.txt"))', '.txt');
run('fs basename', 'print(fs_basename("/path/to/file.txt"))', 'file.txt');
run('fs read lines', 'fs_write("/tmp/bt.txt", "a\\nb\\nc")\nprint(len(fs_read_lines("/tmp/bt.txt")))', '3');
run('fs read csv', 'fs_write("/tmp/bt.csv", "a,b,c\\n1,2,3")\nrows = fs_read_csv("/tmp/bt.csv")\nprint(rows[1][0])', '1');

// ============ OS ============
console.log('\n--- OS ---');
runContains('os_name', 'print(os_name())', '');
runContains('os_arch', 'print(os_arch())', '');
runContains('os_home', 'print(os_home())', '');
runContains('os_cpu_count', 'print(os_cpu_count())', '');
runContains('os_pid', 'print(os_pid())', '');
runContains('os_env', 'print(os_env("HOME"))', '');

// ============ CRYPTO ============
console.log('\n--- Crypto ---');
run('md5', 'print(md5("hello"))', '5d41402abc4b2a76b9719d911017c592');
run('sha256', 'print(sha256("hello"))', '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
run('base64 enc', 'print(base64_encode("hello"))', 'aGVsbG8=');
run('base64 dec', 'print(base64_decode("aGVsbG8="))', 'hello');
run('url enc', 'print(url_encode("hello world"))', 'hello%20world');
run('url dec', 'print(url_decode("hello%20world"))', 'hello world');
run('hmac len', 'print(len(hmac_sha256("key", "msg")))', '64');
run('xor roundtrip', 'enc = crypto_encrypt_xor("secret", "key")\nprint(crypto_decrypt_xor(enc, "key"))', 'secret');

// ============ REGEX ============
console.log('\n--- Regex ---');
run('regex match', 'print(regex_match("\\\\d+", "abc123"))', 'True');
run('regex no match', 'print(regex_match("\\\\d+", "abc"))', 'False');
run('regex find all', 'print(regex_find_all("\\\\d+", "a1b2c3"))', "['1', '2', '3']");
run('regex replace', 'print(regex_replace("\\\\d+", "#", "a1b2"))', 'a#b#');
run('regex split', 'print(regex_split("\\\\s+", "a b  c"))', "['a', 'b', 'c']");

// ============ GAME ============
console.log('\n--- Game ---');
run('canvas create', 'import game\nc = game.canvas_create(640, 360)\nprint(game.canvas_width(c))', '640');
run('canvas height', 'import game\nc = game.canvas_create(640, 360)\nprint(game.canvas_height(c))', '360');
run('screen create', 'import game\ns = game.screen_create(40, 15)\nprint(game.screen_width(s))', '40');
run('color_rgb', 'import game\nprint(game.color_rgb(255, 0, 0))', '#ff0000');
run('color_rgb 2', 'import game\nprint(game.color_rgb(0, 255, 0))', '#00ff00');
runContains('color_random', 'import game\nprint(game.color_random())', '#');
runContains('canvas save', 'import game\nc = game.canvas_create(100, 100)\ngame.canvas_save_html(c, "/tmp/bt_game.html")\nprint(fs_exists("/tmp/bt_game.html"))', 'True');

// ============ EDGE CASES ============
console.log('\n--- Edge Cases ---');
run('empty list', 'print([])', '[]');
run('empty dict', 'print({})', '{}');
run('nested data', 'd = {"a": {"b": {"c": 42}}}\nprint(d["a"]["b"]["c"])', '42');
run('list of dicts', 'l = [{"x": 1}, {"x": 2}]\nprint(l[0]["x"])', '1');
run('dict of lists', 'd = {"items": [1, 2, 3]}\nprint(d["items"][1])', '2');
run('large number', 'print(10 ** 20)', '100000000000000000000');
run('float precision', 'print(1.0 / 3.0)', '0.3333333333333333');
run('negative zero', 'print(-0)', '0');
run('zero division', 'try:\n    print(1/0)\nexcept e:\n    print("caught")', 'caught');
run('modulo zero', 'try:\n    print(5%0)\nexcept e:\n    print("caught")', 'caught');
run('undefined var', 'try:\n    print(x)\nexcept e:\n    print("caught")', 'caught');
run('index out of range', 'try:\n    print([1,2][5])\nexcept e:\n    print("caught")', 'caught');
run('empty function', 'def f():\n    x = 1\nprint(f())', 'None');
run('pass only', 'def f():\n    pass\nprint(f())', 'None');
run('return none explicit', 'def f():\n    return\nprint(f())', 'None');
run('bool to str', 'print(str(True))', 'True');
run('none to str', 'print(str(None))', 'None');
run('list to str', 'print(str([1,2]))', '[1, 2]');
run('dict to str', 'print(str({"a":1}))', "{'a': 1}");
run('tuple to str', 'print(str((1,2)))', '(1, 2)');
run('range to list', 'print(list(range(3)))', '[0, 1, 2]');
run('string to list', 'print(list("abc"))', "['a', 'b', 'c']");
run('dict keys to list', 'd = {"a": 1, "b": 2}\nprint(list(dict_keys(d)))', "['a', 'b']");
run('for over string', 'for c in "abc":\n    print(c)', 'a\nb\nc');
run('for over range', 'count = 0\nfor i in range(5):\n    count += 1\nprint(count)', '5');

// ============ STRESS TESTS ============
console.log('\n--- Stress ---');
run('deep recursion', 'def f(n):\n    if n <= 0: return 0\n    return 1 + f(n - 1)\nprint(f(100))', '100');
run('large loop', 's = 0\nfor i in range(1000):\n    s += i\nprint(s)', '499500');
run('large list', 'l = []\nfor i in range(100):\n    list_append(l, i)\nprint(len(l))', '100');
run('string build', 's = ""\nfor i in range(50):\n    s += str(i)\nprint(len(s))', '90');
run('dict build', 'd = {}\nfor i in range(50):\n    d[str(i)] = i\nprint(len(d))', '50');

// ============ SUMMARY ============
console.log('\n' + '='.repeat(60));
console.log(`DEEP TEST RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log('='.repeat(60));

if (failed > 0) {
  console.log('\nFAILED TESTS:');
  for (const f of failures) {
    console.log(`\n  ${f.name}`);
    console.log(`  Code: ${(f.code||'').slice(0,100)}`);
    if (f.expected) console.log(`  Expected: ${JSON.stringify(f.expected).slice(0,120)}`);
    if (f.actual !== undefined) console.log(`  Actual:   ${JSON.stringify(f.actual).slice(0,120)}`);
    if (f.stderr) console.log(`  Stderr:   ${f.stderr.slice(0,120)}`);
  }
}

process.exit(failed > 0 ? 1 : 0);
