// Created by xobe

export class KoinaHash<V> {
  private _keys: (string | undefined)[];
  private _values: (V | undefined)[];
  private _hashes: Uint32Array;
  private _meta: Uint8Array;
  private _order: Uint32Array;
  private _orderLen: number = 0;
  private _capacity: number;
  private _mask: number;
  private _size: number = 0;
  private _tombstones: number = 0;
  public collisions: number = 0;
  public rehashes: number = 0;
  public maxProbe: number = 0;
  public compactions: number = 0;
  public robinSwaps: number = 0;
  public hashCacheHits: number = 0;
  public hashCacheMisses: number = 0;
  private _hashCache: Map<string, number> = new Map();
  private static readonly MAX_PSL = 127;

  constructor(entries?: Iterable<[string, V]> | number) {
    if (typeof entries === 'number') {
      this.initStorage(entries);
    } else {
      this.initStorage(16);
      if (entries) for (const [k, v] of entries) this.set(k, v);
    }
  }

  static withCapacity<V>(cap: number): KoinaHash<V> {
    const h = new KoinaHash<V>();
    h.initStorage(cap);
    return h;
  }

  private initStorage(initialCapacity: number): void {
    let cap = 16;
    while (cap < initialCapacity) cap <<= 1;
    this._capacity = cap;
    this._mask = cap - 1;
    this._keys = new Array(cap);
    this._values = new Array(cap);
    this._hashes = new Uint32Array(cap);
    this._meta = new Uint8Array(cap);
    this._order = new Uint32Array(cap);
    this._orderLen = 0;
  }

  // v3.0 — Hash with adaptive caching. Short keys (<= 8 chars) compute hash directly
  // (faster than Map.get overhead). Long keys use cache.
  private static readonly CACHE_THRESHOLD = 8;
  private hashKeyCached(s: string): number {
    if (s.length <= KoinaHash.CACHE_THRESHOLD) {
      return this.computeHash(s);
    }
    const cached = this._hashCache.get(s);
    if (cached !== undefined) {
      this.hashCacheHits++;
      return cached;
    }
    this.hashCacheMisses++;
    const h = this.computeHash(s);
    this._hashCache.set(s, h);
    return h;
  }

  private hashKeyRaw(s: string): number {
    return this.computeHash(s);
  }

  private computeHash(s: string): number {
    let h = 0x811c9dc5;
    const len = s.length;
    for (let i = 0; i < len; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return h >>> 0;
  }

  private static state(meta: number): number { return meta & 0x80; }
  private static psl(meta: number): number { return meta & 0x7F; }
  private static makeMeta(state: number, psl: number): number {
    return (state ? 0x80 : 0) | (psl & 0x7F);
  }

  get size(): number { return this._size; }
  get tombstones(): number { return this._tombstones; }
  isEmpty(): boolean { return this._size === 0; }

  has(key: string): boolean {
    const h = this.hashKeyCached(key);
    const start = h & this._mask;
    let idx = start;
    let probe = 0;
    const cap = this._capacity;
    const meta = this._meta;
    const hashes = this._hashes;
    const keys = this._keys;
    while (probe < cap) {
      const m = meta[idx];
      if (m === 0) return false;
      if ((m & 0x80) === 0x80 && hashes[idx] === h && keys[idx] === key) return true;
      if ((m & 0x80) === 0x80 && (m & 0x7F) < probe) return false;
      idx = (idx + 1) & this._mask;
      probe++;
    }
    return false;
  }

  get(key: string): V | undefined {
    const h = this.hashKeyCached(key);
    const start = h & this._mask;
    let idx = start;
    let probe = 0;
    const cap = this._capacity;
    const meta = this._meta;
    const hashes = this._hashes;
    const keys = this._keys;
    const values = this._values;
    while (probe < cap) {
      const m = meta[idx];
      if (m === 0) return undefined;
      if ((m & 0x80) === 0x80 && hashes[idx] === h && keys[idx] === key) {
        return values[idx] as V;
      }
      if ((m & 0x80) === 0x80 && (m & 0x7F) < probe) return undefined;
      idx = (idx + 1) & this._mask;
      probe++;
    }
    return undefined;
  }

  set(key: string, value: V): this {
    if ((this._size + this._tombstones + 1) > (this._capacity * 0.75)) {
      if (this._tombstones > this._size * 0.5) {
        this.compact();
      } else {
        const newCap = this._size > 1000000
          ? Math.floor(this._capacity * 1.5)
          : this._capacity * 2;
        this.resize(this.nextPow2(newCap));
      }
    }

    let curKey = key;
    let curVal = value;
    let curHash = this.hashKeyRaw(key);
    let idx = curHash & this._mask;
    let probe = 0;
    let firstTombstone = -1;
    const cap = this._capacity;
    const meta = this._meta;
    const hashes = this._hashes;
    const keys = this._keys;
    const values = this._values;

    while (probe < cap) {
      const m = meta[idx];
      if (m === 0) {
        const insertIdx = firstTombstone >= 0 ? firstTombstone : idx;
        keys[insertIdx] = curKey;
        values[insertIdx] = curVal;
        hashes[insertIdx] = curHash;
        meta[insertIdx] = 0x80 | Math.min(probe, KoinaHash.MAX_PSL);
        this._size++;
        if (firstTombstone >= 0) this._tombstones--;
        else this._order[this._orderLen++] = insertIdx;
        if (probe > this.maxProbe) this.maxProbe = probe;
        return this;
      }
      if ((m & 0x80) === 0x80 && hashes[idx] === curHash && keys[idx] === curKey) {
        values[idx] = curVal;
        return this;
      }
      if ((m & 0x80) === 0x80) {
        this.collisions++;
        const existingPsl = m & 0x7F;
        if (existingPsl < probe) {
          const tmpK = keys[idx]!;
          const tmpV = values[idx]!;
          const tmpH = hashes[idx];
          const tmpM = m;
          keys[idx] = curKey;
          values[idx] = curVal;
          hashes[idx] = curHash;
          meta[idx] = 0x80 | Math.min(probe, KoinaHash.MAX_PSL);
          curKey = tmpK;
          curVal = tmpV;
          curHash = tmpH;
          probe = tmpM & 0x7F;
          this.robinSwaps++;
        }
      }
      if (m === 0x02 && firstTombstone < 0) firstTombstone = idx;
      idx = (idx + 1) & this._mask;
      probe++;
    }
    return this;
  }

  delete(key: string): boolean {
    const h = this.hashKeyCached(key);
    let idx = h & this._mask;
    let probe = 0;
    const cap = this._capacity;
    const meta = this._meta;
    const hashes = this._hashes;
    const keys = this._keys;
    while (probe < cap) {
      const m = meta[idx];
      if (m === 0) return false;
      if ((m & 0x80) === 0x80 && (m & 0x7F) >= probe && hashes[idx] === h && keys[idx] === key) {
        keys[idx] = undefined;
        this._values[idx] = undefined;
        hashes[idx] = 0;
        meta[idx] = 0x02;
        this._size--;
        this._tombstones++;
        return true;
      }
      if ((m & 0x80) === 0x80 && (m & 0x7F) < probe) return false;
      idx = (idx + 1) & this._mask;
      probe++;
    }
    return false;
  }

  compact(): void {
    if (this._tombstones === 0) return;
    const oldKeys = this._keys;
    const oldValues = this._values;
    const oldHashes = this._hashes;
    const oldMeta = this._meta;
    const oldOrder = this._order;
    const oldOrderLen = this._orderLen;

    this._keys = new Array(this._capacity);
    this._values = new Array(this._capacity);
    this._hashes = new Uint32Array(this._capacity);
    this._meta = new Uint8Array(this._capacity);
    this._order = new Uint32Array(this._capacity);
    this._orderLen = 0;
    this._size = 0;
    this._tombstones = 0;
    this.maxProbe = 0;
    this.compactions++;

    for (let i = 0; i < oldOrderLen; i++) {
      const idx = oldOrder[i];
      if (idx >= 0 && (oldMeta[idx] & 0x80) === 0x80) {
        this.set(oldKeys[idx] as string, oldValues[idx] as V);
      }
    }
  }

  reserve(capacity: number): void {
    if (capacity <= this._capacity) return;
    let newCap = this._capacity;
    while (newCap < capacity) newCap <<= 1;
    if (newCap > this._capacity) this.resize(newCap);
  }

  private nextPow2(n: number): number {
    let c = 16;
    while (c < n) c <<= 1;
    return c;
  }

  bulkInsert(pairs: [string, V][]): this {
    const target = this._size + pairs.length;
    if (target > this._capacity * 0.75) {
      this.reserve(this.nextPow2(Math.ceil(target / 0.75)));
    }
    for (let i = 0; i < pairs.length; i++) {
      this.set(pairs[i][0], pairs[i][1]);
    }
    return this;
  }

  merge(other: KoinaHash<V>): this {
    for (const [k, v] of other.entries()) this.set(k, v);
    return this;
  }

  entriesArray(): [string, V][] {
    const out: [string, V][] = new Array(this._size);
    let n = 0;
    for (let i = 0; i < this._orderLen; i++) {
      const idx = this._order[i];
      if (idx >= 0 && (this._meta[idx] & 0x80) === 0x80) {
        out[n++] = [this._keys[idx] as string, this._values[idx] as V];
      }
    }
    return out;
  }

  keysArray(): string[] {
    const out: string[] = new Array(this._size);
    let n = 0;
    for (let i = 0; i < this._orderLen; i++) {
      const idx = this._order[i];
      if (idx >= 0 && (this._meta[idx] & 0x80) === 0x80) {
        out[n++] = this._keys[idx] as string;
      }
    }
    return out;
  }

  valuesArray(): V[] {
    const out: V[] = new Array(this._size);
    let n = 0;
    for (let i = 0; i < this._orderLen; i++) {
      const idx = this._order[i];
      if (idx >= 0 && (this._meta[idx] & 0x80) === 0x80) {
        out[n++] = this._values[idx] as V;
      }
    }
    return out;
  }

  clear(): void {
    this._keys.fill(undefined);
    this._values.fill(undefined);
    this._hashes.fill(0);
    this._meta.fill(0);
    this._order.fill(0);
    this._orderLen = 0;
    this._size = 0;
    this._tombstones = 0;
    this.maxProbe = 0;
    this._hashCache.clear();
  }

  *entries(): IterableIterator<[string, V]> {
    for (let i = 0; i < this._orderLen; i++) {
      const idx = this._order[i];
      if (idx >= 0 && (this._meta[idx] & 0x80) === 0x80) {
        yield [this._keys[idx] as string, this._values[idx] as V];
      }
    }
  }

  *keys(): IterableIterator<string> {
    for (let i = 0; i < this._orderLen; i++) {
      const idx = this._order[i];
      if (idx >= 0 && (this._meta[idx] & 0x80) === 0x80) {
        yield this._keys[idx] as string;
      }
    }
  }

  *values(): IterableIterator<V> {
    for (let i = 0; i < this._orderLen; i++) {
      const idx = this._order[i];
      if (idx >= 0 && (this._meta[idx] & 0x80) === 0x80) {
        yield this._values[idx] as V;
      }
    }
  }

  [Symbol.iterator](): IterableIterator<[string, V]> {
    return this.entries();
  }

  forEach(fn: (value: V, key: string, map: KoinaHash<V>) => void): void {
    for (let i = 0; i < this._orderLen; i++) {
      const idx = this._order[i];
      if (idx >= 0 && (this._meta[idx] & 0x80) === 0x80) {
        fn(this._values[idx] as V, this._keys[idx] as string, this);
      }
    }
  }

  private resize(newCap: number): void {
    const oldKeys = this._keys;
    const oldValues = this._values;
    const oldHashes = this._hashes;
    const oldMeta = this._meta;
    const oldOrder = this._order;
    const oldOrderLen = this._orderLen;

    this._capacity = newCap;
    this._mask = newCap - 1;
    this._keys = new Array(newCap);
    this._values = new Array(newCap);
    this._hashes = new Uint32Array(newCap);
    this._meta = new Uint8Array(newCap);
    this._order = new Uint32Array(newCap);
    this._orderLen = 0;
    this._size = 0;
    this._tombstones = 0;
    this.maxProbe = 0;
    this.rehashes++;

    for (let i = 0; i < oldOrderLen; i++) {
      const idx = oldOrder[i];
      if (idx >= 0 && (oldMeta[idx] & 0x80) === 0x80) {
        this.set(oldKeys[idx] as string, oldValues[idx] as V);
      }
    }
  }

  stats(): {
    size: number;
    capacity: number;
    tombstones: number;
    loadFactor: number;
    collisions: number;
    rehashes: number;
    maxProbe: number;
    compactions: number;
    robinSwaps: number;
    hashCacheHits: number;
    hashCacheMisses: number;
    hashCacheSize: number;
    hashCacheHitRate: number;
    algorithm: string;
    deletionStrategy: string;
    hashFunction: string;
    memoryPerSlotBytes: number;
    version: string;
    adaptiveResize: boolean;
  } {
    const total = this.hashCacheHits + this.hashCacheMisses;
    return {
      size: this._size,
      capacity: this._capacity,
      tombstones: this._tombstones,
      loadFactor: this._size / this._capacity,
      collisions: this.collisions,
      rehashes: this.rehashes,
      maxProbe: this.maxProbe,
      compactions: this.compactions,
      robinSwaps: this.robinSwaps,
      hashCacheHits: this.hashCacheHits,
      hashCacheMisses: this.hashCacheMisses,
      hashCacheSize: this._hashCache.size,
      hashCacheHitRate: total > 0 ? this.hashCacheHits / total : 0,
      algorithm: 'robin_hood_v3',
      deletionStrategy: 'tombstone_with_autocompact',
      hashFunction: 'fnv1a_avalanche_cached',
      memoryPerSlotBytes: 22,
      version: '3.0.0',
      adaptiveResize: this._size > 1000000,
    };
  }
}
