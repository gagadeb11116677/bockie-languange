// Created by xobe

export class KoinaHash<V> {
  private _keys: (string | undefined)[];
  private _values: (V | undefined)[];
  private _hashes: Uint32Array;
  private _psl: Uint8Array;
  private _state: Uint8Array;
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
  private _autoCompactThreshold: number = 0.85;

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
    this._psl = new Uint8Array(cap);
    this._state = new Uint8Array(cap);
    this._order = new Uint32Array(cap);
    this._orderLen = 0;
  }

  private hashKey(s: string): number {
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

  get size(): number { return this._size; }
  get tombstones(): number { return this._tombstones; }
  isEmpty(): boolean { return this._size === 0; }

  has(key: string): boolean {
    const h = this.hashKey(key);
    const start = h & this._mask;
    let idx = start;
    let probe = 0;
    while (probe < this._capacity) {
      const st = this._state[idx];
      if (st === 0) return false;
      if (st === 1) {
        if (probe > this._psl[idx]) return false;
        if (this._hashes[idx] === h && this._keys[idx] === key) return true;
      }
      idx = (idx + 1) & this._mask;
      probe++;
    }
    return false;
  }

  get(key: string): V | undefined {
    const h = this.hashKey(key);
    const start = h & this._mask;
    let idx = start;
    let probe = 0;
    while (probe < this._capacity) {
      const st = this._state[idx];
      if (st === 0) return undefined;
      if (st === 1) {
        if (probe > this._psl[idx]) return undefined;
        if (this._hashes[idx] === h && this._keys[idx] === key) {
          return this._values[idx] as V;
        }
      }
      idx = (idx + 1) & this._mask;
      probe++;
    }
    return undefined;
  }

  set(key: string, value: V): this {
    if ((this._size + this._tombstones + 1) > (this._capacity * 0.7)) {
      if (this._tombstones > this._size * 0.5) {
        this.compact();
      } else {
        this.resize(this._capacity * 2);
      }
    }

    let curKey = key;
    let curVal = value;
    let curHash = this.hashKey(key);
    const start = curHash & this._mask;
    let idx = start;
    let probe = 0;
    let firstTombstone = -1;

    while (probe < this._capacity) {
      const st = this._state[idx];
      if (st === 0) {
        const insertIdx = firstTombstone >= 0 ? firstTombstone : idx;
        this._keys[insertIdx] = curKey;
        this._values[insertIdx] = curVal;
        this._hashes[insertIdx] = curHash;
        this._psl[insertIdx] = probe;
        this._state[insertIdx] = 1;
        this._size++;
        if (firstTombstone >= 0) this._tombstones--;
        else this._order[this._orderLen++] = insertIdx;
        if (probe > this.maxProbe) this.maxProbe = probe;
        return this;
      }
      if (st === 1 && this._hashes[idx] === curHash && this._keys[idx] === curKey) {
        this._values[idx] = curVal;
        return this;
      }
      if (st === 1) {
        this.collisions++;
        if (this._psl[idx] < probe) {
          const tmpK = this._keys[idx]!;
          const tmpV = this._values[idx]!;
          const tmpH = this._hashes[idx];
          const tmpP = this._psl[idx];
          this._keys[idx] = curKey;
          this._values[idx] = curVal;
          this._hashes[idx] = curHash;
          this._psl[idx] = probe;
          curKey = tmpK;
          curVal = tmpV;
          curHash = tmpH;
          probe = tmpP;
          this.robinSwaps++;
        }
      }
      if (st === 2 && firstTombstone < 0) firstTombstone = idx;
      idx = (idx + 1) & this._mask;
      probe++;
    }
    return this;
  }

  delete(key: string): boolean {
    const h = this.hashKey(key);
    const start = h & this._mask;
    let idx = start;
    let probe = 0;
    while (probe < this._capacity) {
      const st = this._state[idx];
      if (st === 0) return false;
      if (st === 1 && probe <= this._psl[idx] && this._hashes[idx] === h && this._keys[idx] === key) {
        this._keys[idx] = undefined;
        this._values[idx] = undefined;
        this._hashes[idx] = 0;
        this._psl[idx] = 0;
        this._state[idx] = 2;
        this._size--;
        this._tombstones++;
        return true;
      }
      if (st === 1 && probe > this._psl[idx]) return false;
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
    const oldPsl = this._psl;
    const oldState = this._state;
    const oldOrder = this._order;
    const oldOrderLen = this._orderLen;

    this._keys = new Array(this._capacity);
    this._values = new Array(this._capacity);
    this._hashes = new Uint32Array(this._capacity);
    this._psl = new Uint8Array(this._capacity);
    this._state = new Uint8Array(this._capacity);
    this._order = new Uint32Array(this._capacity);
    this._orderLen = 0;
    this._size = 0;
    this._tombstones = 0;
    this.maxProbe = 0;
    this.compactions++;

    for (let i = 0; i < oldOrderLen; i++) {
      const idx = oldOrder[i];
      if (idx >= 0 && oldState[idx] === 1) {
        this.set(oldKeys[idx] as string, oldValues[idx] as V);
      }
    }
  }

  autoCompactIfNeeded(): boolean {
    if (this._tombstones === 0) return false;
    const ratio = this._tombstones / Math.max(1, this._size);
    if (ratio > 0.5) {
      this.compact();
      return true;
    }
    return false;
  }

  reserve(capacity: number): void {
    if (capacity <= this._capacity) return;
    let newCap = this._capacity;
    while (newCap < capacity) newCap <<= 1;
    if (newCap > this._capacity) this.resize(newCap);
  }

  clear(): void {
    this._keys.fill(undefined);
    this._values.fill(undefined);
    this._hashes.fill(0);
    this._psl.fill(0);
    this._state.fill(0);
    this._order.fill(0);
    this._orderLen = 0;
    this._size = 0;
    this._tombstones = 0;
    this.maxProbe = 0;
  }

  *entries(): IterableIterator<[string, V]> {
    for (let i = 0; i < this._orderLen; i++) {
      const idx = this._order[i];
      if (idx >= 0 && this._state[idx] === 1) {
        yield [this._keys[idx] as string, this._values[idx] as V];
      }
    }
  }

  *keys(): IterableIterator<string> {
    for (let i = 0; i < this._orderLen; i++) {
      const idx = this._order[i];
      if (idx >= 0 && this._state[idx] === 1) {
        yield this._keys[idx] as string;
      }
    }
  }

  *values(): IterableIterator<V> {
    for (let i = 0; i < this._orderLen; i++) {
      const idx = this._order[i];
      if (idx >= 0 && this._state[idx] === 1) {
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
      if (idx >= 0 && this._state[idx] === 1) {
        fn(this._values[idx] as V, this._keys[idx] as string, this);
      }
    }
  }

  private resize(newCap: number): void {
    const oldKeys = this._keys;
    const oldValues = this._values;
    const oldHashes = this._hashes;
    const oldState = this._state;
    const oldOrder = this._order;
    const oldOrderLen = this._orderLen;

    this._capacity = newCap;
    this._mask = newCap - 1;
    this._keys = new Array(newCap);
    this._values = new Array(newCap);
    this._hashes = new Uint32Array(newCap);
    this._psl = new Uint8Array(newCap);
    this._state = new Uint8Array(newCap);
    this._order = new Uint32Array(newCap);
    this._orderLen = 0;
    this._size = 0;
    this._tombstones = 0;
    this.maxProbe = 0;
    this.rehashes++;

    for (let i = 0; i < oldOrderLen; i++) {
      const idx = oldOrder[i];
      if (idx >= 0 && oldState[idx] === 1) {
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
    algorithm: string;
    deletionStrategy: string;
    hashFunction: string;
    memoryPerSlotBytes: number;
  } {
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
      algorithm: 'robin_hood_v3',
      deletionStrategy: 'tombstone_with_autocompact',
      hashFunction: 'fnv1a_avalanche',
      memoryPerSlotBytes: 26,
    };
  }
}
