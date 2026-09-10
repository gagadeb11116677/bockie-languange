import * as ast from './ast';

export type BValue = number | string | boolean | null | BList | BDict | BFunction | BBuiltin | BRange | BClass | BInstance | BModule | BTuple;
export interface BList { __type: 'list'; items: BValue[]; }
export interface BTuple { __type: 'tuple'; items: BValue[]; }
export interface BDict { __type: 'dict'; entries: Map<string, BValue>; }
export interface BFunction { __type: 'function'; name: string; params: { name: string; default?: ast.Node | null }[]; body: ast.Node[]; closure: Environment; boundSelf?: BValue; }
export interface BBuiltin { __type: 'builtin'; name: string; fn: (...args: BValue[]) => BValue; }
export interface BRange { __type: 'range'; start: number; end: number; step: number; }
export interface BClass { __type: 'class'; name: string; base: BClass | null; methods: Map<string, BFunction | BBuiltin>; fields: Map<string, BValue>; init?: BFunction | BBuiltin; }
export interface BInstance { __type: 'instance'; cls: BClass; fields: Map<string, BValue>; }
export interface BModule { __type: 'module'; name: string; env: Environment; }

export class BreakSignal {}
export class ContinueSignal {}
export class ReturnSignal { constructor(public value: BValue) {} }
export class BockieError extends Error {
  public rawMessage: string;
  constructor(message: string, public line: number = 0) {
    super(`Runtime Error${line ? ` [line ${line}]` : ''}: ${message}`);
    this.rawMessage = message;
  }
}

export class Environment {
  vars: Map<string, BValue> = new Map();
  parent: Environment | null;
  constructor(parent: Environment | null = null) { this.parent = parent; }
  get(name: string): BValue | undefined { if (this.vars.has(name)) return this.vars.get(name); if (this.parent) return this.parent.get(name); return undefined; }
  set(name: string, value: BValue) { this.vars.set(name, value); }
  define(name: string, value: BValue) { this.vars.set(name, value); }
  has(name: string): boolean { return this.vars.has(name) || (this.parent?.has(name) ?? false); }
  delete(name: string) { this.vars.delete(name); }
}

export interface InterpreterOptions { output?: (s: string) => void; input?: () => string; cwd?: string; }

export class Interpreter {
  private globals: Environment;
  public output: (s: string) => void;
  private inputFn: () => string;
  public cwd: string;
  public loadedModules: Map<string, BModule> = new Map();
  private objectIds: Map<object, number> = new Map();
  private nextId = 1;

  constructor(opts: InterpreterOptions = {}) {
    this.globals = new Environment();
    this.output = opts.output ?? ((s) => process.stdout.write(s));
    this.inputFn = opts.input ?? this.defaultInput;
    this.cwd = opts.cwd ?? process.cwd();
    this.registerBuiltins();
  }

  public getCwd() { return this.cwd; }
  public resolvePath(p: string): string { const path = require('path'); return path.isAbsolute(p) ? p : path.resolve(this.cwd, p); }
  public toJSON(v: BValue): any {
    if (v === null || v === undefined) return null;
    if (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') return v;
    if (typeof v === 'object' && '__type' in v) {
      if (v.__type === 'list' || v.__type === 'tuple') return v.items.map(i => this.toJSON(i));
      if (v.__type === 'dict') { const obj: any = {}; for (const [k, val] of v.entries) obj[k] = this.toJSON(val); return obj; }
    }
    return null;
  }
  public fromJSON(v: any): BValue {
    if (v === null) return null;
    if (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') return v;
    if (Array.isArray(v)) return { __type: 'list', items: v.map(i => this.fromJSON(i)) } as BList;
    if (typeof v === 'object') { const d: BDict = { __type: 'dict', entries: new Map() }; for (const k of Object.keys(v)) d.entries.set(k, this.fromJSON(v[k])); return d; }
    return null;
  }

  private defaultInput(): string {
    try {
      const buf: Buffer[] = []; const chunk = Buffer.alloc(1);
      while (true) { const bytesRead = require('fs').readSync(0, chunk, 0, 1); if (bytesRead === 0) break; if (chunk[0] === 0x0a || chunk[0] === 0x0d) break; buf.push(Buffer.from(chunk)); }
      return Buffer.concat(buf).toString('utf-8');
    } catch (e) { return ''; }
  }

  private registerBuiltins() {
    const define = (name: string, fn: (...args: BValue[]) => BValue) => { this.globals.define(name, { __type: 'builtin', name, fn } as BBuiltin); };
    const M = Math;
    define('print', (...args) => { this.output(args.map(a => this.toDisplay(a)).join(' ') + '\n'); return null; });
    define('input', (...args) => { if (args.length > 0) this.output(this.toDisplay(args[0])); return this.inputFn(); });
    define('len', (...args) => {
      const v = args[0];
      if (v === null || v === undefined) throw new BockieError('len() arg is None');
      if (typeof v === 'string') return v.length;
      if (typeof v === 'object' && '__type' in v) { if (v.__type === 'list' || v.__type === 'tuple') return v.items.length; if (v.__type === 'dict') return v.entries.size; if (v.__type === 'range') return Math.max(0, Math.ceil((v.end - v.start) / v.step)); }
      throw new BockieError('object has no len()');
    });
    define('range', (...args) => { let s=0,e=0,st=1; if (args.length===1) e=args[0] as number; else if (args.length===2) { s=args[0] as number; e=args[1] as number; } else if (args.length===3) { s=args[0] as number; e=args[1] as number; st=args[2] as number; } if (st===0) throw new BockieError('range() step must not be zero'); return { __type:'range', start:s, end:e, step:st } as BRange; });
    define('list', (...args) => { const v = args[0]; if (v===null||v===undefined) return { __type:'list', items:[] } as BList; if (typeof v==='object' && '__type' in v) { if (v.__type==='list') return { __type:'list', items:[...v.items] }; if (v.__type==='tuple') return { __type:'list', items:[...v.items] }; if (v.__type==='range') { const items:number[]=[]; if (v.step>0) for (let i=v.start;i<v.end;i+=v.step) items.push(i); else for (let i=v.start;i>v.end;i+=v.step) items.push(i); return { __type:'list', items }; } if (v.__type==='dict') return { __type:'list', items:[...v.entries.keys()].map(k=>k as BValue) }; } if (typeof v==='string') return { __type:'list', items:v.split('').map(c=>c as BValue) }; throw new BockieError('list() argument is not iterable'); });
    define('dict', (...args) => { const d: BDict = { __type:'dict', entries:new Map() }; if (args.length===0) return d; const v = args[0]; if (v!==null && typeof v==='object' && '__type' in v && v.__type==='list') for (const item of v.items) if (typeof item==='object' && item!==null && '__type' in item && item.__type==='tuple' && item.items.length===2) d.entries.set(this.toDisplay(item.items[0]), item.items[1]); return d; });
    define('tuple', (...args) => { const v = args[0]; if (v===null||v===undefined) return { __type:'tuple', items:[] } as BTuple; if (typeof v==='object' && '__type' in v && v.__type==='list') return { __type:'tuple', items:[...v.items] }; return { __type:'tuple', items:[v] }; });
    define('str', (...args) => this.toDisplay(args[0] ?? null));
    define('int', (...args) => { const v=args[0]; if (typeof v==='number') return Math.trunc(v); if (typeof v==='string') { const n=parseInt(v,10); if (isNaN(n)) throw new BockieError(`invalid literal for int(): '${v}'`); return n; } if (typeof v==='boolean') return v?1:0; throw new BockieError('int() argument must be number, string, or bool'); });
    define('float', (...args) => { const v=args[0]; if (typeof v==='number') return v; if (typeof v==='string') { const n=parseFloat(v); if (isNaN(n)) throw new BockieError(`invalid literal for float(): '${v}'`); return n; } if (typeof v==='boolean') return v?1.0:0.0; throw new BockieError('float() argument must be number, string, or bool'); });
    define('bool', (...args) => this.toBool(args[0] ?? null));
    define('type', (...args) => { const v=args[0]; if (v===null) return 'NoneType'; if (typeof v==='number') return Number.isInteger(v)?'int':'float'; if (typeof v==='string') return 'str'; if (typeof v==='boolean') return 'bool'; if (typeof v==='object' && '__type' in v) return v.__type==='instance'?v.cls.name:v.__type; return 'unknown'; });
    define('isinstance', (...args) => {
      const v=args[0], t=args[1];
      if (typeof t==='string') {
        if (typeof v==='object' && v!==null && '__type' in v && v.__type==='instance') {
          let cls:BClass|null=v.cls;
          while (cls) { if (cls.name===t) return true; cls=cls.base; }
          return false;
        }
        return this.typeName(v)===t;
      }
      if (typeof t==='object' && t!==null && '__type' in t && t.__type==='class') {
        let inst=v;
        if (typeof inst==='object' && inst!==null && '__type' in inst && inst.__type==='instance') {
          let cls:BClass|null=inst.cls;
          while (cls) { if (cls===t) return true; cls=cls.base; }
        }
      }
      return false;
    });
    define('enumerate', (...args) => { const items=this.collectItems(args); return { __type:'list', items:items.map((v,i)=>({ __type:'tuple', items:[i,v] } as BTuple)) } as BList; });
    define('zip', (...args) => { const lists=args.map(a=>this.collectItems([a])); const minLen=Math.min(...lists.map(l=>l.length)); const result:BValue[]=[]; for (let i=0;i<minLen;i++) result.push({ __type:'tuple', items:lists.map(l=>l[i]) } as BTuple); return { __type:'list', items:result } as BList; });
    define('sorted', (...args) => {
      let items:BValue[] = []; let reverse=false; let keyFn:BValue|null=null;
      for (const a of args) {
        if (typeof a==='object' && a!==null && '__type' in a && a.__type==='dict' && a.entries.has('name') && a.entries.get('name')==='reverse') { reverse = this.toBool(a.entries.get('value')!); }
        else if (typeof a==='object' && a!==null && '__type' in a && a.__type==='dict' && a.entries.has('name') && a.entries.get('name')==='key') { keyFn = a.entries.get('value')!; }
        else items.push(...this.collectItems([a]));
      }
      if (keyFn) { items.sort((a,b)=>{ const ka=this.callFunction(keyFn,[a]); const kb=this.callFunction(keyFn,[b]); return this.compare(ka,kb) as number; }); }
      else items.sort((a,b)=>(this.compare(a,b) as number));
      if (reverse) items.reverse();
      return { __type:'list', items } as BList;
    });
    define('reversed', (...args) => ({ __type:'list', items:[...this.collectItems(args)].reverse() } as BList));
    define('map', (...args) => { const fn=args[0]; const items=this.collectItems([args[1]]); return { __type:'list', items:items.map(item=>this.callFunction(fn,[item])) } as BList; });
    define('filter', (...args) => { const fn=args[0]; const items=this.collectItems([args[1]]); return { __type:'list', items:items.filter(item=>this.toBool(this.callFunction(fn,[item]))) } as BList; });
    define('reduce', (...args) => { const fn=args[0]; const items=this.collectItems([args[1]]); if (items.length===0) return args.length>2?args[2]:null; let acc=args.length>2?args[2]:items[0]; const start=args.length>2?0:1; for (let i=start;i<items.length;i++) acc=this.callFunction(fn,[acc,items[i]]); return acc; });
    define('any', (...args) => this.collectItems(args).some(v=>this.toBool(v)));
    define('all', (...args) => this.collectItems(args).every(v=>this.toBool(v)));
    define('find', (...args) => { const fn=args[0]; const items=this.collectItems([args[1]]); for (const item of items) { if (this.toBool(this.callFunction(fn,[item]))) return item; } return null; });
    define('find_index', (...args) => { const fn=args[0]; const items=this.collectItems([args[1]]); for (let i=0;i<items.length;i++) { if (this.toBool(this.callFunction(fn,[items[i]]))) return i; } return -1; });
    define('count', (...args) => { const fn=args[0]; const items=this.collectItems([args[1]]); return items.filter(item=>this.toBool(this.callFunction(fn,[item]))).length; });
    define('take', (...args) => { const items=this.collectItems([args[0]]); const n=args[1] as number; return { __type:'list', items:items.slice(0, n) } as BList; });
    define('drop', (...args) => { const items=this.collectItems([args[0]]); const n=args[1] as number; return { __type:'list', items:items.slice(n) } as BList; });
    define('chunk', (...args) => { const items=this.collectItems([args[0]]); const size=args[1] as number; const result:BValue[]=[]; for (let i=0;i<items.length;i+=size) result.push({ __type:'list', items:items.slice(i,i+size) } as BList); return { __type:'list', items:result } as BList; });
    define('interleave', (...args) => { const lists=args.map(a=>this.collectItems([a])); const maxLen=Math.max(...lists.map(l=>l.length)); const result:BValue[]=[]; for (let i=0;i<maxLen;i++) for (const l of lists) if (i<l.length) result.push(l[i]); return { __type:'list', items:result } as BList; });
    define('flatten', (...args) => { const items=this.collectItems(args); const result:BValue[]=[]; for (const item of items) if (typeof item==='object' && item!==null && '__type' in item && item.__type==='list') result.push(...item.items); else result.push(item); return { __type:'list', items:result } as BList; });
    define('unique', (...args) => { const items=this.collectItems(args); const seen:BValue[]=[]; for (const item of items) if (!seen.some(v=>this.equals(v,item))) seen.push(item); return { __type:'list', items:seen } as BList; });
    define('groupby', (...args) => { const fn=args[0]; const items=this.collectItems([args[1]]); const groups=new Map<string,BValue[]>(); for (const item of items) { const k=this.toDisplay(this.callFunction(fn,[item])); if (!groups.has(k)) groups.set(k,[]); groups.get(k)!.push(item); } const d:BDict={__type:'dict',entries:new Map()}; for (const [k,v] of groups) d.entries.set(k, { __type:'list', items:v } as BList); return d; });
    define('max_by', (...args) => { const fn=args[0]; const items=this.collectItems([args[1]]); if (items.length===0) return null; let best=items[0]; let bestKey=this.callFunction(fn,[items[0]]); for (let i=1;i<items.length;i++) { const k=this.callFunction(fn,[items[i]]); if (this.compare(k,bestKey) as number>0) { best=items[i]; bestKey=k; } } return best; });
    define('min_by', (...args) => { const fn=args[0]; const items=this.collectItems([args[1]]); if (items.length===0) return null; let best=items[0]; let bestKey=this.callFunction(fn,[items[0]]); for (let i=1;i<items.length;i++) { const k=this.callFunction(fn,[items[i]]); if (this.compare(k,bestKey) as number<0) { best=items[i]; bestKey=k; } } return best; });
    define('range_of', (...args) => { const items=this.collectItems(args); if (items.length===0) return [0,0] as any; const nums=items.map(v=>v as number); return { __type:'tuple', items:[Math.min(...nums), Math.max(...nums)] } as BTuple; });
    define('mean', (...args) => { const items=this.collectItems(args) as any[]; if (items.length===0) return 0; const nums = items.map((v,i) => { if (typeof v !== 'number') throw new BockieError(`mean() expects list of numbers, got ${this.typeName(v)} at index ${i}`); return v; }); return nums.reduce((a,v)=>a+v,0) / nums.length; });
    define('median', (...args) => { const items=[...this.collectItems(args)].sort((a,b)=>(this.compare(a,b) as number)) as any[]; const mid=Math.floor(items.length/2); return items.length%2===0? (items[mid-1]+items[mid])/2 : items[mid]; });
    define('variance', (...args) => { const items=this.collectItems(args) as any[]; if (items.length===0) return 0; const m=items.reduce((a,v)=>a+v,0)/items.length; return items.reduce((a,v)=>a+(v-m)*(v-m),0)/items.length; });
    define('std_dev', (...args) => Math.sqrt(this.collectItems(args).length>0 ? (()=>{ const items=this.collectItems(args) as any[]; const m=items.reduce((a,v)=>a+v,0)/items.length; return items.reduce((a,v)=>a+(v-m)*(v-m),0)/items.length; })() : 0));
    define('product', (...args) => { const items=this.collectItems(args) as any[]; return items.reduce((a,v)=>a*v,1); });
    define('deep_copy', (...args) => { const v=args[0]; if (typeof v==='object' && v!==null && '__type' in v) { if (v.__type==='list') return { __type:'list', items:v.items.map(i=>this.deepCopyValue(i)) }; if (v.__type==='dict') { const d:BDict={__type:'dict',entries:new Map()}; for (const [k,val] of v.entries) d.entries.set(k, this.deepCopyValue(val)); return d; } } return v; });
    define('string_contains', (...a) => (a[0] as string).includes(a[1] as string));
    define('split_lines', (...a) => ({ __type:'list', items:(a[0] as string).split(/\r?\n/) as BValue[] } as BList));
    define('starts_with', (...a) => (a[0] as string).startsWith(a[1] as string));
    define('ends_with', (...a) => (a[0] as string).endsWith(a[1] as string));
    define('to_lowercase', (...a) => (a[0] as string).toLowerCase());
    define('to_uppercase', (...a) => (a[0] as string).toUpperCase());
    define('trim', (...a) => (a[0] as string).trim());
    define('replace_all', (...a) => (a[0] as string).split(a[1] as string).join(a[2] as string));
    define('split_str', (...a) => ({ __type:'list', items:(a[0] as string).split(a[1] as string) as BValue[] } as BList));
    define('join_str', (...a) => { const sep=a[0] as string; const list=a[1] as BList; return list.items.map(i=>this.toDisplay(i)).join(sep); });
    define('char_code', (...a) => (a[0] as string).charCodeAt(0));
    define('char_from', (...a) => String.fromCharCode(a[0] as number));
    define('string_format', (...a) => { let s=a[0] as string; for (let i=1;i<a.length;i++) s=s.replace('{}', this.toDisplay(a[i])); return s; });
    define('pad_left', (...a) => this.expectString(a[0],'pad_left').padStart(this.expectNumber(a[1],'pad_left'), this.expectString(a.length>2?a[2]:' ','pad_left')));
    define('pad_right', (...a) => this.expectString(a[0],'pad_right').padEnd(this.expectNumber(a[1],'pad_right'), this.expectString(a.length>2?a[2]:' ','pad_right')));
    define('reverse_str', (...a) => (a[0] as string).split('').reverse().join(''));
    define('repeat_str', (...a) => (a[0] as string).repeat(a[1] as number));
    define('capitalize', (...a) => { const s=a[0] as string; return s.charAt(0).toUpperCase()+s.slice(1).toLowerCase(); });
    define('title_case', (...a) => (a[0] as string).replace(/\w\S*/g, (t:string)=>t.charAt(0).toUpperCase()+t.slice(1).toLowerCase()));
    define('is_digit', (...a) => /^\d+$/.test(a[0] as string));
    define('is_alpha', (...a) => /^[a-zA-Z]+$/.test(a[0] as string));
    define('is_alnum', (...a) => /^[a-zA-Z0-9]+$/.test(a[0] as string));
    define('is_space', (...a) => /^\s*$/.test(a[0] as string));
    define('is_upper', (...a) => /^[A-Z]+$/.test(a[0] as string));
    define('is_lower', (...a) => /^[a-z]+$/.test(a[0] as string));
    define('to_camel_case', (...a) => { const s=(a[0] as string).replace(/[^a-zA-Z0-9]+/g,' '); return s.split(' ').map((w,i)=>i===0?w.toLowerCase():w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()).join(''); });
    define('to_snake_case', (...a) => (a[0] as string).replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/,'').replace(/[^a-zA-Z0-9]+/g,'_'));
    define('to_kebab_case', (...a) => (a[0] as string).replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/,'').replace(/[^a-zA-Z0-9]+/g,'-'));
    define('repr', (...args) => this.toRepr(args[0]));
    define('id', (...args) => { if (typeof args[0]==='object' && args[0]!==null) return this.getObjectId(args[0]); return -1; });
    define('abs', (...args) => M.abs(args[0] as number));
    define('min', (...args) => { const items=this.collectItems(args); if (items.length===0) throw new BockieError('min() arg is empty'); return items.reduce((min,v)=>(this.compare(v,min) as number<0?v:min)); });
    define('max', (...args) => { const items=this.collectItems(args); if (items.length===0) throw new BockieError('max() arg is empty'); return items.reduce((max,v)=>(this.compare(v,max) as number>0?v:max)); });
    define('sum', (...args) => { const items=this.collectItems(args); const start=args.length>1?(args[1] as number):0; return items.reduce((acc:number,v)=>acc+(v as number),start); });
    define('round', (...args) => { const n=args[0] as number; const d=args.length>1?(args[1] as number):0; const f=M.pow(10,d); return M.round(n*f)/f; });
    define('floor', (...a) => M.floor(a[0] as number));
    define('ceil', (...a) => M.ceil(a[0] as number));
    define('sqrt', (...a) => M.sqrt(a[0] as number));
    define('pow', (...a) => M.pow(a[0] as number,a[1] as number));
    define('sin', (...a) => M.sin(a[0] as number));
    define('cos', (...a) => M.cos(a[0] as number));
    define('tan', (...a) => M.tan(a[0] as number));
    define('atan2', (...a) => M.atan2(a[0] as number,a[1] as number));
    define('log', (...a) => a.length===2?M.log(a[1] as number)/M.log(a[0] as number):M.log(a[0] as number));
    define('exp', (...a) => M.exp(a[0] as number));
    define('pi', () => M.PI);
    define('tau', () => M.PI*2);
    define('e', () => M.E);
    define('sign', (...a) => M.sign(a[0] as number));
    define('clamp', (...a) => M.max(a[1] as number, M.min(a[2] as number, a[0] as number)));
    define('hex', (...a) => M.floor(a[0] as number).toString(16));
    define('bin', (...a) => M.floor(a[0] as number).toString(2));
    define('oct', (...a) => M.floor(a[0] as number).toString(8));
    define('chr', (...a) => String.fromCharCode(a[0] as number));
    define('ord', (...a) => (a[0] as string).charCodeAt(0));
    define('random', () => M.random());
    define('randint', (...a) => M.floor(M.random()*((a[1] as number)-(a[0] as number)+1))+(a[0] as number));
    define('choice', (...args) => { const items=this.collectItems(args); if (items.length===0) throw new BockieError('choice() from empty sequence'); return items[M.floor(M.random()*items.length)]; });
    define('shuffle', (...args) => { const l=args[0] as BList; for (let i=l.items.length-1;i>0;i--) { const j=M.floor(M.random()*(i+1)); [l.items[i],l.items[j]]=[l.items[j],l.items[i]]; } return null; });
    define('sample', (...args) => { const items=this.collectItems([args[0]]); const k=args[1] as number; const s=[...items]; for (let i=s.length-1;i>0;i--) { const j=M.floor(M.random()*(i+1)); [s[i],s[j]]=[s[j],s[i]]; } return { __type:'list', items:s.slice(0,k) } as BList; });
    define('time', () => Date.now()/1000);
    define('now_ms', () => Date.now());
    define('now', () => Date.now()/1000);
    define('sleep', (...args) => { const ms=(args[0] as number)*1000; const start=Date.now(); while (Date.now()-start<ms) {} return null; });
    define('clock', () => Date.now()/1000);
    define('str_upper', (...a) => (a[0] as string).toUpperCase());
    define('str_lower', (...a) => (a[0] as string).toLowerCase());
    define('str_strip', (...a) => (a[0] as string).trim());
    define('str_split', (...args) => { const s=args[0] as string; const sep=args.length>1?(args[1] as string):null; const parts=sep?s.split(sep):s.split(/\s+/).filter(Boolean); return { __type:'list', items:parts } as BList; });
    define('str_join', (...args) => { const sep=args[0] as string; const l=args[1] as BList; return l.items.map(i=>this.toDisplay(i)).join(sep); });
    define('str_replace', (...a) => (a[0] as string).split(a[1] as string).join(a[2] as string));
    define('str_contains', (...a) => (a[0] as string).includes(a[1] as string));
    define('str_starts_with', (...a) => (a[0] as string).startsWith(a[1] as string));
    define('str_ends_with', (...a) => (a[0] as string).endsWith(a[1] as string));
    define('str_find', (...a) => (a[0] as string).indexOf(a[1] as string));
    define('str_count', (...a) => { const s=a[0] as string; const sub=a[1] as string; return sub===''?s.length+1:s.split(sub).length-1; });
    define('str_repeat', (...a) => (a[0] as string).repeat(a[1] as number));
    define('str_pad_left', (...a) => this.expectString(a[0],'str_pad_left').padStart(this.expectNumber(a[1],'str_pad_left'), this.expectString(a.length>2?a[2]:' ','str_pad_left')));
    define('str_pad_right', (...a) => this.expectString(a[0],'str_pad_right').padEnd(this.expectNumber(a[1],'str_pad_right'), this.expectString(a.length>2?a[2]:' ','str_pad_right')));
    define('str_reverse', (...a) => (a[0] as string).split('').reverse().join(''));
    define('format', (...args) => {
      const num = args[0];
      const fmt = args[1] as string;
      if (typeof num !== 'number') return String(num);
      const m = fmt.match(/^0?(\d+)([xdob])$/);
      if (m) {
        const w = parseInt(m[1], 10);
        const t = m[2];
        let base = 10;
        if (t === 'x') base = 16;
        else if (t === 'o') base = 8;
        else if (t === 'b') base = 2;
        let s = Math.floor(Math.abs(num)).toString(base);
        while (s.length < w) s = '0' + s;
        if (num < 0) s = '-' + s;
        return s;
      }
      const fm = fmt.match(/^\.(\d+)f$/);
      if (fm) {
        const digits = parseInt(fm[1], 10);
        return num.toFixed(digits);
      }
      const cm = fmt.match(/^,\.(\d+)f$/);
      if (cm) {
        const digits = parseInt(cm[1], 10);
        return num.toFixed(digits).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      }
      return String(num);
    });
    define('list_append', (...a) => { (a[0] as BList).items.push(a[1]); return null; });
    define('list_pop', (...a) => { const l=a[0] as BList; if (l.items.length===0) throw new BockieError('pop from empty list'); const i=a.length>1?(a[1] as number):l.items.length-1; return l.items.splice(i,1)[0]; });
    define('list_insert', (...a) => { (a[0] as BList).items.splice(a[1] as number,0,a[2]); return null; });
    define('list_remove', (...a) => { const l=a[0] as BList; const v=a[1]; const i=l.items.findIndex(x=>this.equals(x,v)); if (i===-1) throw new BockieError('list.remove(x): x not in list'); l.items.splice(i,1); return null; });
    define('list_index', (...a) => { const l=a[0] as BList; const v=a[1]; const i=l.items.findIndex(x=>this.equals(x,v)); if (i===-1) throw new BockieError('list.index(x): x not in list'); return i; });
    define('list_count', (...a) => { const l=a[0] as BList; const v=a[1]; return l.items.filter(x=>this.equals(x,v)).length; });
    define('list_sort', (...a) => { (a[0] as BList).items.sort((x,y)=>(this.compare(x,y) as number)); return null; });
    define('list_reverse', (...a) => { (a[0] as BList).items.reverse(); return null; });
    define('list_clear', (...a) => { (a[0] as BList).items.length=0; return null; });
    define('list_extend', (...a) => { const l=a[0] as BList; l.items.push(...this.collectItems([a[1]])); return null; });
    define('list_copy', (...a) => ({ __type:'list', items:[...(a[0] as BList).items] } as BList));
    define('dict_keys', (...a) => ({ __type:'list', items:[...(a[0] as BDict).entries.keys()].map(k=>k as BValue) } as BList));
    define('dict_values', (...a) => ({ __type:'list', items:[...(a[0] as BDict).entries.values()] } as BList));
    define('dict_items', (...a) => ({ __type:'list', items:[...(a[0] as BDict).entries.entries()].map(([k,v])=>({ __type:'tuple', items:[k as BValue,v] } as BTuple)) } as BList));
    define('dict_get', (...a) => { const d=a[0] as BDict; const k=this.toDisplay(a[1]); const def=a.length>2?a[2]:null; return d.entries.has(k)?d.entries.get(k)!:def; });
    define('dict_set', (...a) => { (a[0] as BDict).entries.set(this.toDisplay(a[1]),a[2]); return null; });
    define('dict_pop', (...a) => { const d=a[0] as BDict; const k=this.toDisplay(a[1]); const def=a.length>2?a[2]:null; if (d.entries.has(k)) { const v=d.entries.get(k)!; d.entries.delete(k); return v; } return def; });
    define('dict_contains', (...a) => (a[0] as BDict).entries.has(this.toDisplay(a[1])));
    define('dict_clear', (...a) => { (a[0] as BDict).entries.clear(); return null; });
    define('dict_copy', (...a) => { const d=a[0] as BDict; const c:BDict={ __type:'dict', entries:new Map() }; for (const [k,v] of d.entries) c.entries.set(k,v); return c; });
    define('dict_update', (...a) => { const d=a[0] as BDict; const o=a[1] as BDict; for (const [k,v] of o.entries) d.entries.set(k,v); return null; });
    define('json_dumps', (...a) => JSON.stringify(this.toJSON(a[0]), null, a.length>1?(a[1] as number):0));
    define('json_loads', (...a) => this.fromJSON(JSON.parse(a[0] as string)));
    define('json_pretty', (...a) => JSON.stringify(this.toJSON(a[0]), null, 2));
    define('exit', (...a) => process.exit(a.length>0?(a[0] as number):0));
    define('argv', () => ({ __type:'list', items:process.argv.slice(2).map(a=>a as BValue) } as BList));
    define('__raise__', (...a) => { throw new BockieError(a.length>0?this.toDisplay(a[0]):'raised'); });
    define('__kwarg__', (...a) => { return { __type:'dict', entries:new Map([['name',a[0]],['value',a[1]]]) } as BDict; });
    define('__slice__', (...a) => {
      const obj=a[0]; const start=a[1]; const end=a[2];
      if (typeof obj==='string') { const s=start===null?0:(start as number); const e=end===null?obj.length:(end as number); let x=s<0?obj.length+s:s; let y=e<0?obj.length+e:e; x=M.max(0,x); y=M.min(obj.length,y); if (y<x) y=x; return obj.substring(x,y); }
      if (typeof obj==='object' && obj!==null && '__type' in obj && (obj.__type==='list'||obj.__type==='tuple')) { const items=obj.items; const s=start===null?0:(start as number); const e=end===null?items.length:(end as number); let x=s<0?items.length+s:s; let y=e<0?items.length+e:e; x=M.max(0,x); y=M.min(items.length,y); if (y<x) y=x; return { __type:obj.__type, items:items.slice(x,y) } as BValue; }
      throw new BockieError('cannot slice object');
    });
    try { const { StdModules } = require('./modules'); StdModules.populate(this.globals, this); } catch (e) {}
    try { const { GameModule } = require('./game'); const ge=new Environment(this.globals); GameModule.populate(ge, this); this.globals.define('game', { __type:'module', name:'game', env:ge } as BModule); } catch (e) {}
  }

  private getObjectId(obj: object): number { if (!this.objectIds.has(obj)) this.objectIds.set(obj, this.nextId++); return this.objectIds.get(obj)!; }
  private typeName(v: BValue): string { if (v===null) return 'NoneType'; if (typeof v==='number') return Number.isInteger(v)?'int':'float'; if (typeof v==='string') return 'str'; if (typeof v==='boolean') return 'bool'; if (typeof v==='object' && '__type' in v) return v.__type==='instance'?v.cls.name:v.__type; return 'unknown'; }
  private collectItems(args: BValue[]): BValue[] { if (args.length===1 && typeof args[0]==='object' && args[0]!==null && '__type' in args[0]) { const v=args[0]; if (v.__type==='list'||v.__type==='tuple') return v.items; if (v.__type==='range') { const items:number[]=[]; if (v.step>0) for (let i=v.start;i<v.end;i+=v.step) items.push(i); else for (let i=v.start;i>v.end;i+=v.step) items.push(i); return items; } } return args; }

  run(source: string) { const { Parser } = require('./parser'); const parser = new Parser(); const program = parser.parse(source); this.executeBlock(program.body, this.globals); }
  private executeBlock(stmts: ast.Node[], env: Environment) { for (const stmt of stmts) this.execute(stmt, env); }

  private execute(node: ast.Node, env: Environment) {
    switch (node.type) {
      case 'ExprStmt': this.eval(node.expr, env); return;
      case 'If': if (this.toBool(this.eval(node.test, env))) this.executeBlock(node.body, env); else { let ex=false; for (const e of node.elifs) { if (this.toBool(this.eval(e.test, env))) { this.executeBlock(e.body, env); ex=true; break; } } if (!ex && node.elseBody) this.executeBlock(node.elseBody, env); } return;
      case 'Unless': if (!this.toBool(this.eval(node.test, env))) this.executeBlock(node.body, env); else if (node.elseBody) this.executeBlock(node.elseBody, env); return;
      case 'While': { let i=0; while (this.toBool(this.eval(node.test, env))) { if (++i>1e8) throw new BockieError('while loop exceeded 100M iterations'); try { this.executeBlock(node.body, env); } catch (e) { if (e instanceof BreakSignal) break; if (e instanceof ContinueSignal) continue; throw e; } } return; }
      case 'Until': { let i=0; while (!this.toBool(this.eval(node.test, env))) { if (++i>1e8) throw new BockieError('until loop exceeded 100M iterations'); try { this.executeBlock(node.body, env); } catch (e) { if (e instanceof BreakSignal) break; if (e instanceof ContinueSignal) continue; throw e; } } return; }
      case 'For': { const iv=this.eval(node.iterable, env); const items=this.toIterable(iv, node.line); let i=0; for (const item of items) { if (++i>1e8) throw new BockieError('for loop exceeded 100M iterations'); if (node.varNames.length===1) env.define(node.varNames[0], item); else { const ii=this.toIterable(item, node.line); for (let j=0;j<node.varNames.length;j++) env.define(node.varNames[j], ii[j] ?? null); } try { this.executeBlock(node.body, env); } catch (e) { if (e instanceof BreakSignal) break; if (e instanceof ContinueSignal) continue; throw e; } } return; }
      case 'Repeat': { const c=this.eval(node.count, env) as number; for (let i=0;i<c;i++) { if (node.varName) env.define(node.varName, i); try { this.executeBlock(node.body, env); } catch (e) { if (e instanceof BreakSignal) break; if (e instanceof ContinueSignal) continue; throw e; } } return; }
      case 'FuncDecl': { const fn: BFunction = { __type:'function', name:node.name, params:node.params, body:node.body, closure:env }; env.define(node.name, fn); return; }
      case 'Return': { const v=node.value?this.eval(node.value, env):null; throw new ReturnSignal(v); }
      case 'Break': throw new BreakSignal();
      case 'Continue': throw new ContinueSignal();
      case 'Pass': return;
      case 'ClassDecl': { const cls=this.buildClass(node, env); env.define(node.name, cls); return; }
      case 'Try': { try { this.executeBlock(node.body, env); if (node.elseBody) this.executeBlock(node.elseBody, env); } catch (e) { if (e instanceof BreakSignal || e instanceof ContinueSignal || e instanceof ReturnSignal) throw e; let h=false; for (const handler of node.handlers) { const he=new Environment(env); if (handler.varName) he.define(handler.varName, e instanceof BockieError?e.rawMessage:String(e)); try { this.executeBlock(handler.body, he); h=true; break; } catch (e2) { throw e2; } } if (!h && node.elseBody===null) { if (e instanceof BockieError) throw e; throw new BockieError(String(e)); } } finally { if (node.finallyBody) this.executeBlock(node.finallyBody, env); } return; }
      case 'Import': { for (const { name, alias } of node.names) { const mod=this.loadModule(name); env.define(alias ?? name, mod); } return; }
      case 'Global': { for (const name of node.names) if (!this.globals.has(name)) this.globals.define(name, null); return; }
      case 'Delete': { for (const t of node.targets) if (t.type==='Identifier') env.delete(t.name); return; }
      case 'Match': { const s=this.eval(node.subject, env); for (const c of node.cases) { const p=this.eval(c.pattern, env); if (this.equals(s,p)) { if (c.guard && !this.toBool(this.eval(c.guard, env))) continue; this.executeBlock(c.body, env); return; } } if (node.defaultCase) this.executeBlock(node.defaultCase, env); return; }
      case 'Assign': this.eval(node, env); return;
      case 'AugAssign': this.eval(node, env); return;
      case 'Walrus': this.eval(node, env); return;
      default: this.eval(node as ast.Node, env);
    }
  }

  private buildClass(node: ast.ClassDecl, env: Environment): BClass {
    let base: BClass | null = null;
    if (node.base) { const bv=this.eval(node.base, env); if (typeof bv==='object' && bv!==null && '__type' in bv && bv.__type==='class') base=bv; }
    const cls: BClass = { __type:'class', name:node.name, base, methods:new Map(base?[...base.methods]:[]), fields:new Map(base?[...base.fields]:[]) };
    const ce=new Environment(env);
    for (const s of node.body) {
      if (s.type==='FuncDecl') { const fn: BFunction = { __type:'function', name:s.name, params:s.params, body:s.body, closure:ce }; if (s.name==='__init__') cls.init=fn; else cls.methods.set(s.name, fn); }
      else if (s.type==='Assign' && s.target.type==='Identifier') cls.fields.set(s.target.name, this.eval(s.value, env));
    }
    return cls;
  }

  private loadModule(name: string): BModule {
    if (this.loadedModules.has(name)) return this.loadedModules.get(name)!;
    if (['game','math','random','time','os','fs','regex','datetime','process','crypto','http','json'].includes(name)) {
      if (name==='game') { const g=this.globals.get('game') as BModule; if (g) return g; }
      const m: BModule = { __type:'module', name, env:new Environment(this.globals) };
      this.loadedModules.set(name, m);
      return m;
    }
    const path=require('path'); const fp=path.resolve(this.cwd, name.replace(/\./g,'/')+'.bckie');
    if (!require('fs').existsSync(fp)) throw new BockieError(`Module not found: ${name}`);
    const src=require('fs').readFileSync(fp, 'utf-8');
    const { Parser }=require('./parser'); const p=new Parser(); const prog=p.parse(src);
    const me=new Environment(this.globals); this.executeBlock(prog.body, me);
    const m: BModule = { __type:'module', name, env:me };
    this.loadedModules.set(name, m);
    return m;
  }

  private eval(node: ast.Node, env: Environment): BValue {
    switch (node.type) {
      case 'Number': return node.value;
      case 'String': return node.value;
      case 'Boolean': return node.value;
      case 'None': return null;
      case 'Identifier': { const v=env.get(node.name); if (v===undefined) throw new BockieError(`name '${node.name}' is not defined`, node.line); return v; }
      case 'List': { const items:BValue[]=[]; for (const el of node.elements) { if (el.type==='Spread') items.push(...this.toIterable(this.eval(el.expr, env), node.line)); else items.push(this.eval(el, env)); } return { __type:'list', items }; }
      case 'Tuple': return { __type:'tuple', items:node.elements.map(e=>this.eval(e, env)) };
      case 'Dict': { const d:BDict={ __type:'dict', entries:new Map() }; for (const p of node.pairs) d.entries.set(this.toDisplay(this.eval(p.key, env)), this.eval(p.value, env)); return d; }
      case 'Binary': return this.evalBinary(node, env);
      case 'Unary': { const v=this.eval(node.operand, env); if (node.op==='-') { if (typeof v!=='number') throw new BockieError('unary - requires a number', node.line); return -v; } if (node.op==='not') return !this.toBool(v); return v; }
      case 'Logical': { const l=this.toBool(this.eval(node.left, env)); if (node.op==='and') return l?this.toBool(this.eval(node.right, env)):false; return l?true:this.toBool(this.eval(node.right, env)); }
      case 'Pipeline': {
        const lv=this.eval(node.left, env);
        if (node.right.type==='Call') { const ex:BValue[]=[lv]; for (const a of (node.right as any).args) { if (a.type==='Spread') ex.push(...this.toIterable(this.eval(a.expr, env), node.line)); else ex.push(this.eval(a, env)); } return this.callFunction(this.eval((node.right as any).callee, env), ex); }
        const rv=this.eval(node.right, env);
        if (rv!==null && typeof rv==='object' && '__type' in rv && (rv.__type==='function'||rv.__type==='builtin')) return this.callFunction(rv, [lv]);
        return rv;
      }
      case 'NullCoalesce': { const l=this.eval(node.left, env); return (l===null||l===undefined)?this.eval(node.right, env):l; }
      case 'InterpString': { let r=''; for (const p of node.parts) r += typeof p==='string'?p:this.toDisplay(this.eval(p, env)); return r; }
      case 'Spread': return this.eval(node.expr, env);
      case 'Compare': return this.compare(this.eval(node.operands[0], env), this.eval(node.operands[1], env), node.ops[0]) as boolean;
      case 'Assign': { const v=this.eval(node.value, env); this.assignTo(node.target, v, env, node.line); return v; }
      case 'AugAssign': { const c=this.eval(node.target, env); const r=this.eval(node.value, env); const op=node.op.charAt(0); let res:BValue; if (op==='+') { if (typeof c==='string' && typeof r==='string') res=c+r; else if (typeof c==='number' && typeof r==='number') res=c+r; else if (typeof c==='object' && c!==null && '__type' in c && c.__type==='list' && typeof r==='object' && r!==null && '__type' in r && r.__type==='list') res={ __type:'list', items:[...c.items, ...r.items] }; else res=this.toDisplay(c)+this.toDisplay(r); } else if (op==='-') res=(c as number)-(r as number); else if (op==='*') res=(c as number)*(r as number); else if (op==='/') res=(c as number)/(r as number); else if (op==='%') res=this.trueMod(c as number, r as number); else throw new BockieError('unsupported augmented assignment', node.line); this.assignTo(node.target, res, env, node.line); return res; }
      case 'Walrus': { const v=this.eval(node.value, env); env.define(node.name, v); return v; }
      case 'Call': return this.evalCall(node, env);
      case 'Index': return this.getIndex(this.eval(node.obj, env), this.eval(node.index, env), node.line);
      case 'Member': return this.evalMember(node, env);
      case 'FuncDecl': return { __type:'function', name:node.name, params:node.params, body:node.body, closure:env };
      default: throw new BockieError(`Cannot evaluate node type ${(node as ast.Node).type}`);
    }
  }

  private evalBinary(node: ast.BinaryExpr, env: Environment): BValue {
    const left=this.eval(node.left, env); const right=this.eval(node.right, env);
    if (node.op==='**' && typeof left==='number' && typeof right==='number') return Math.pow(left, right);
    if (node.op==='+') { if (typeof left==='string' && typeof right==='string') return left+right; if (typeof left==='string'||typeof right==='string') return this.toDisplay(left)+this.toDisplay(right); if (typeof left==='object' && left!==null && '__type' in left && left.__type==='list' && typeof right==='object' && right!==null && '__type' in right && right.__type==='list') return { __type:'list', items:[...left.items, ...right.items] }; }
    if (typeof left==='number' && typeof right==='number') { switch (node.op) { case '+': return left+right; case '-': return left-right; case '*': return left*right; case '/': if (right===0) throw new BockieError('division by zero', node.line); return left/right; case '%': if (right===0) throw new BockieError('modulo by zero', node.line); return this.trueMod(left, right); } }
    if (node.op==='*') { if (typeof left==='object' && left!==null && '__type' in left && left.__type==='list' && typeof right==='number') { const n=Math.max(0,Math.floor(right)); const items:BValue[]=[]; for (let i=0;i<n;i++) items.push(...left.items); return { __type:'list', items }; } if (typeof left==='number' && typeof right==='object' && right!==null && '__type' in right && right.__type==='list') { const n=Math.max(0,Math.floor(left)); const items:BValue[]=[]; for (let i=0;i<n;i++) items.push(...right.items); return { __type:'list', items }; } if (typeof left==='string' && typeof right==='number') return right<=0?'':left.repeat(Math.floor(right)); if (typeof left==='number' && typeof right==='string') return left<=0?'':right.repeat(Math.floor(left)); }
    throw new BockieError(`unsupported operand type(s) for ${node.op}: ${typeof left} and ${typeof right}`, node.line);
  }

  private evalCall(node: ast.CallExpr, env: Environment): BValue {
    const callee=this.eval(node.callee, env);
    const args:BValue[]=[];
    for (const a of node.args) { if (a.type==='Spread') args.push(...this.toIterable(this.eval(a.expr, env), node.line)); else args.push(this.eval(a, env)); }
    if (callee===null || typeof callee!=='object' || !('__type' in callee)) throw new BockieError('object is not callable', node.line);
    if (callee.__type==='builtin') return callee.fn(...args);
    if (callee.__type==='function') { const fe=new Environment(callee.closure); let ps=0; if (callee.boundSelf!==undefined) { fe.define('self', callee.boundSelf); ps=1; } for (let i=ps;i<callee.params.length;i++) { const p=callee.params[i]; const ai=i-ps; if (ai<args.length) fe.define(p.name, args[ai]); else if (p.default) fe.define(p.name, this.eval(p.default, callee.closure)); else throw new BockieError(`${callee.name}() missing argument '${p.name}'`, node.line); } try { this.executeBlock(callee.body, fe); } catch (e) { if (e instanceof ReturnSignal) return e.value; throw e; } return null; }
    if (callee.__type==='class') { const inst:BInstance = { __type:'instance', cls:callee, fields:new Map(callee.fields) }; if (callee.init) { const init=callee.init; if (init.__type==='function') { const fe=new Environment(init.closure); fe.define('self', inst); for (let i=1;i<init.params.length;i++) { const p=init.params[i]; if (i-1<args.length) fe.define(p.name, args[i-1]); else if (p.default) fe.define(p.name, this.eval(p.default, init.closure)); } try { this.executeBlock(init.body, fe); } catch (e) { if (!(e instanceof ReturnSignal)) throw e; } } else init.fn(inst, ...args); } return inst; }
    throw new BockieError('object is not callable', node.line);
  }

  public callFunction(fn: BValue, args: BValue[]): BValue {
    if (typeof fn!=='object' || fn===null || !('__type' in fn)) throw new BockieError('object is not callable');
    if (fn.__type==='builtin') return fn.fn(...args);
    if (fn.__type==='function') { const fe=new Environment(fn.closure); let ps=0; if (fn.boundSelf!==undefined) { fe.define('self', fn.boundSelf); ps=1; } for (let i=ps;i<fn.params.length;i++) { const p=fn.params[i]; const ai=i-ps; if (ai<args.length) fe.define(p.name, args[ai]); else if (p.default) fe.define(p.name, this.eval(p.default, fn.closure)); } try { this.executeBlock(fn.body, fe); } catch (e) { if (e instanceof ReturnSignal) return e.value; throw e; } return null; }
    throw new BockieError('object is not callable');
  }

  private evalMember(node: ast.MemberExpr, env: Environment): BValue {
    const obj=this.eval(node.obj, env);
    if (typeof obj==='object' && obj!==null && '__type' in obj && obj.__type==='instance') { if (obj.fields.has(node.property)) return obj.fields.get(node.property)!; let cls:BClass|null=obj.cls; while (cls) { if (cls.methods.has(node.property)) { const fn=cls.methods.get(node.property)!; if (fn.__type==='function') return { ...fn, boundSelf:obj } as BFunction; return { __type:'builtin', name:`${cls.name}.${node.property}`, fn:(...args:BValue[])=>fn.fn(obj, ...args) }; } cls=cls.base; } throw new BockieError(`'${obj.cls.name}' object has no attribute '${node.property}'`, node.line); }
    if (typeof obj==='object' && obj!==null && '__type' in obj && obj.__type==='module') { const v=obj.env.get(node.property); if (v===undefined) throw new BockieError(`module '${obj.name}' has no attribute '${node.property}'`, node.line); return v; }
    if (typeof obj==='object' && obj!==null && '__type' in obj && obj.__type==='class') { if (obj.fields.has(node.property)) return obj.fields.get(node.property)!; if (obj.methods.has(node.property)) return obj.methods.get(node.property)!; throw new BockieError(`class '${obj.name}' has no attribute '${node.property}'`, node.line); }
    if (obj===null) throw new BockieError(`'None' has no attribute '${node.property}'`, node.line);
    if (typeof obj==='string') { const b=this.globals.get(`str_${node.property}`); if (b && typeof b==='object' && '__type' in b) return { __type:'builtin', name:`str.${node.property}`, fn:(...args:BValue[])=>(b as BBuiltin).fn(obj, ...args) }; throw new BockieError(`str has no attribute '${node.property}'`, node.line); }
    if (typeof obj==='object' && '__type' in obj && obj.__type==='list') { const b=this.globals.get(`list_${node.property}`); if (b && typeof b==='object' && '__type' in b) return { __type:'builtin', name:`list.${node.property}`, fn:(...args:BValue[])=>(b as BBuiltin).fn(obj, ...args) }; throw new BockieError(`list has no attribute '${node.property}'`, node.line); }
    if (typeof obj==='object' && '__type' in obj && obj.__type==='dict') { const b=this.globals.get(`dict_${node.property}`); if (b && typeof b==='object' && '__type' in b) return { __type:'builtin', name:`dict.${node.property}`, fn:(...args:BValue[])=>(b as BBuiltin).fn(obj, ...args) }; throw new BockieError(`dict has no attribute '${node.property}'`, node.line); }
    throw new BockieError(`object has no attribute '${node.property}'`, node.line);
  }

  private assignTo(target: ast.Node, value: BValue, env: Environment, line: number) {
    switch (target.type) {
      case 'Identifier': env.set(target.name, value); return;
      case 'Tuple': case 'List': { const items=this.toIterable(value, line); for (let i=0;i<target.elements.length;i++) this.assignTo(target.elements[i], items[i] ?? null, env, line); return; }
      case 'Member': { const obj=this.eval(target.obj, env); if (typeof obj==='object' && obj!==null && '__type' in obj && (obj.__type==='instance'||obj.__type==='class')) { obj.fields.set(target.property, value); return; } throw new BockieError('cannot assign to attribute of non-object', line); }
      case 'Index': { const obj=this.eval(target.obj, env); const idx=this.eval(target.index, env); if (typeof obj==='object' && obj!==null && '__type' in obj) { if (obj.__type==='list') { let i=idx as number; if (i<0) i=obj.items.length+i; if (i<0||i>=obj.items.length) throw new BockieError('list index out of range', line); obj.items[i]=value; return; } if (obj.__type==='dict') { obj.entries.set(this.toDisplay(idx), value); return; } } throw new BockieError('cannot assign to index', line); }
      default: throw new BockieError('invalid assignment target', line);
    }
  }

  private getIndex(obj: BValue, idx: BValue, line: number): BValue {
    if (typeof obj==='string') { let i=idx as number; if (i<0) i=obj.length+i; if (i<0||i>=obj.length) throw new BockieError('string index out of range', line); return obj[i]; }
    if (typeof obj==='object' && obj!==null && '__type' in obj) {
      if (obj.__type==='list'||obj.__type==='tuple') { let i=idx as number; if (i<0) i=obj.items.length+i; if (i<0||i>=obj.items.length) throw new BockieError('index out of range', line); return obj.items[i]; }
      if (obj.__type==='dict') { const k=this.toDisplay(idx); return obj.entries.has(k)?obj.entries.get(k)!:null; }
      if (obj.__type==='range') { let i=idx as number; if (i<0) i=Math.ceil((obj.end-obj.start)/obj.step)+i; return obj.start+i*obj.step; }
      if (obj.__type==='instance') { const k=this.toDisplay(idx); return obj.fields.has(k)?obj.fields.get(k)!:null; }
    }
    throw new BockieError('object is not subscriptable', line);
  }

  private trueMod(a: number, b: number): number { return ((a % b) + b) % b; }
  private expectString(v: BValue, fnName: string, line: number = 0): string {
    if (typeof v === 'string') return v;
    if (typeof v === 'number') return String(v);
    if (typeof v === 'boolean') return v ? 'True' : 'False';
    if (v === null) return 'None';
    throw new BockieError(`${fnName}() expects string, got ${this.typeName(v)}`, line);
  }
  private expectNumber(v: BValue, fnName: string, line: number = 0): number {
    if (typeof v === 'number') return v;
    if (typeof v === 'boolean') return v ? 1 : 0;
    throw new BockieError(`${fnName}() expects number, got ${this.typeName(v)}`, line);
  }
  private expectList(v: BValue, fnName: string, line: number = 0): BList {
    if (typeof v === 'object' && v !== null && '__type' in v && v.__type === 'list') return v as BList;
    throw new BockieError(`${fnName}() expects list, got ${this.typeName(v)}`, line);
  }
  private deepCopyValue(v: BValue): BValue {
    if (typeof v === 'object' && v !== null && '__type' in v) {
      if (v.__type === 'list') return { __type: 'list', items: v.items.map(i => this.deepCopyValue(i)) } as BList;
      if (v.__type === 'dict') { const d: BDict = { __type: 'dict', entries: new Map() }; for (const [k, val] of v.entries) d.entries.set(k, this.deepCopyValue(val)); return d; }
    }
    return v;
  }
  private toBool(v: BValue): boolean { if (typeof v==='boolean') return v; if (typeof v==='number') return v!==0; if (typeof v==='string') return v.length>0; if (v===null) return false; if (typeof v==='object' && '__type' in v) { if (v.__type==='list'||v.__type==='tuple') return v.items.length>0; if (v.__type==='dict') return v.entries.size>0; if (v.__type==='range') return v.start!==v.end; if (v.__type==='instance') return true; } return true; }
  private toIterable(v: BValue, line: number): BValue[] {
    if (typeof v==='string') return v.split('').map(c=>c as BValue);
    if (typeof v==='object' && v!==null && '__type' in v) {
      if (v.__type==='list'||v.__type==='tuple') return v.items;
      if (v.__type==='dict') return [...v.entries.keys()].map(k=>k as BValue);
      if (v.__type==='range') { const items:number[]=[]; if (v.step>0) for (let i=v.start;i<v.end;i+=v.step) items.push(i); else for (let i=v.start;i>v.end;i+=v.step) items.push(i); return items; }
      if (v.__type==='instance') { let cls:BClass|null=v.cls; while (cls) { if (cls.methods.has('__iter__')) { const ifn=cls.methods.get('__iter__')!; if (ifn.__type==='function') { const fe=new Environment(ifn.closure); fe.define('self', v); try { this.executeBlock(ifn.body, fe); } catch (e) { if (e instanceof ReturnSignal) return this.toIterable(e.value, line); } } else return this.toIterable(ifn.fn(v), line); return []; } cls=cls.base; } }
    }
    throw new BockieError('object is not iterable', line);
  }
  private compare(a: BValue, b: BValue, op?: string): boolean | number {
    if (op==='in') {
      if (typeof b==='string') return b.includes(String(a));
      if (typeof b==='object' && b!==null && '__type' in b) {
        if (b.__type==='list'||b.__type==='tuple') return b.items.some(v=>this.equals(v,a));
        if (b.__type==='dict') return b.entries.has(this.toDisplay(a));
      }
      return false;
    }
    if (op==='not in') {
      if (typeof b==='string') return !b.includes(String(a));
      if (typeof b==='object' && b!==null && '__type' in b) {
        if (b.__type==='list'||b.__type==='tuple') return !b.items.some(v=>this.equals(v,a));
        if (b.__type==='dict') return !b.entries.has(this.toDisplay(a));
      }
      return true;
    }
    if (op==='=='||op==='!=') { const eq=this.equals(a, b); return op==='=='?eq:!eq; }
    if (typeof a==='number' && typeof b==='number') { switch (op) { case '<': return a<b; case '>': return a>b; case '<=': return a<=b; case '>=': return a>=b; } }
    if (typeof a==='string' && typeof b==='string') { switch (op) { case '<': return a<b; case '>': return a>b; case '<=': return a<=b; case '>=': return a>=b; } }
    if (op===undefined) { if (typeof a==='number' && typeof b==='number') return a-b; if (typeof a==='string' && typeof b==='string') return a.localeCompare(b); return 0; }
    throw new BockieError(`unsupported comparison: ${typeof a} ${op} ${typeof b}`);
  }
  private equals(a: BValue, b: BValue): boolean {
    if (a===b) return true;
    if (typeof a==='number' && typeof b==='number') return a===b;
    if (typeof a==='string' && typeof b==='string') return a===b;
    if (typeof a==='boolean' && typeof b==='boolean') return a===b;
    if (a===null && b===null) return true;
    if (typeof a==='object' && typeof b==='object' && a!==null && b!==null && '__type' in a && '__type' in b) { if (a.__type!==b.__type) return false; if (a.__type==='list' && b.__type==='list') { if (a.items.length!==b.items.length) return false; return a.items.every((v,i)=>this.equals(v, b.items[i])); } if (a.__type==='instance' && b.__type==='instance') return a===b; }
    return false;
  }
  toDisplay(v: BValue): string {
    if (v===null||v===undefined) return 'None';
    if (typeof v==='boolean') return v?'True':'False';
    if (typeof v==='number') return v.toString();
    if (typeof v==='string') return v;
    if (typeof v==='object' && '__type' in v) {
      if (v.__type==='list') return '['+v.items.map(i=>this.toRepr(i)).join(', ')+']';
      if (v.__type==='tuple') return '('+v.items.map(i=>this.toRepr(i)).join(', ')+')';
      if (v.__type==='dict') { const e=[...v.entries.entries()].map(([k,val])=>`'${k}': ${this.toRepr(val)}`); return '{'+e.join(', ')+'}'; }
      if (v.__type==='function') return `<function ${v.name}>`;
      if (v.__type==='builtin') return `<builtin ${v.name}>`;
      if (v.__type==='range') return `range(${v.start}, ${v.end}, ${v.step})`;
      if (v.__type==='class') return `<class '${v.name}'>`;
      if (v.__type==='instance') { let cls:BClass|null=v.cls; while (cls) { if (cls.methods.has('__str__')) { const fn=cls.methods.get('__str__')!; if (fn.__type==='function') { const fe=new Environment(fn.closure); fe.define('self', v); try { this.executeBlock(fn.body, fe); } catch (e) { if (e instanceof ReturnSignal) return this.toDisplay(e.value); } } else return this.toDisplay(fn.fn(v)); break; } cls=cls.base; } return `<${v.cls.name} instance>`; }
      if (v.__type==='module') return `<module '${v.name}'>`;
    }
    return String(v);
  }
  private toRepr(v: BValue): string { return typeof v==='string'?`'${v}'`:this.toDisplay(v); }
}
