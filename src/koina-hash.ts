// Created by xobe

export class KoinaHash<V> {
  private _keys: (string | undefined)[];
  private _values: (V | undefined)[];
  private _hashes: Uint32Array;
  private _state: Uint8Array;
  private _next: Int32Array;
  private _prev: Int32Array;
  private _capacity: number;
  private _mask: number;
  private _size: number = 0;
  private _tombstones: number = 0;
  private orderHead: number = -1;
  private orderTail: number = -1;
  public collisions: number = 0;
  public rehashes: number = 0;
  public maxProbe: number = 0;
  public robinSwaps: number = 0;

  constructor(entries?: Iterable<[string, V]> | number) {
    if (typeof entries === 'number') {
      this.initStorage(entries);
    } else {
      this.initStorage(16);
      if (entries) for (const [k, v] of entries) this.set(k, v);
    }
  }

  private initStorage(initialCapacity: number): void {
    let cap = 16;
    while (cap < initialCapacity) cap <<= 1;
    this._capacity = cap;
    this._mask = cap - 1;
    this._keys = new Array(cap);
    this._values = new Array(cap);
    this._hashes = new Uint32Array(cap);
    this._state = new Uint8Array(cap);
    this._next = new Int32Array(cap).fill(-1);
    this._prev = new Int32Array(cap).fill(-1);
  }

  private hashKey(s: string): number {
    let h = 0x811c9dc5;
    const len = s.length;
    for (let i = 0; i < len; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  get size(): number { return this._size; }
  get tombstones(): number { return this._tombstones; }
  isEmpty(): boolean { return this._size === 0; }

  has(key: string): boolean {
    const h = this.hashKey(key);
    let idx = h & this._mask;
    let dist = 0;
    while (dist < this._capacity) {
      const st = this._state[idx];
      if (st === 0) return false;
      if (st === 1 && this._hashes[idx] === h && this._keys[idx] === key) return true;
      idx = (idx + 1) & this._mask;
      dist++;
    }
    return false;
  }

  get(key: string): V | undefined {
    const h = this.hashKey(key);
    let idx = h & this._mask;
    let dist = 0;
    while (dist < this._capacity) {
      const st = this._state[idx];
      if (st === 0) return undefined;
      if (st === 1 && this._hashes[idx] === h && this._keys[idx] === key) {
        return this._values[idx] as V;
      }
      idx = (idx + 1) & this._mask;
      dist++;
    }
    return undefined;
  }

  set(key: string, value: V): this {
    if ((this._size + this._tombstones + 1) > (this._capacity * 0.75)) {
      this.resize(this._capacity * 2);
    }

    const h = this.hashKey(key);
    let idx = h & this._mask;
    let firstTombstone = -1;
    let dist = 0;

    while (dist < this._capacity) {
      const st = this._state[idx];
      if (st === 0) {
        const insertIdx = firstTombstone >= 0 ? firstTombstone : idx;
        this._keys[insertIdx] = key;
        this._values[insertIdx] = value;
        this._hashes[insertIdx] = h;
        this._state[insertIdx] = 1;
        this._size++;
        if (firstTombstone >= 0) this._tombstones--;
        if (this.orderHead < 0) {
          this.orderHead = insertIdx;
          this.orderTail = insertIdx;
        } else {
          this._next[this.orderTail] = insertIdx;
          this._prev[insertIdx] = this.orderTail;
          this.orderTail = insertIdx;
        }
        if (dist > this.maxProbe) this.maxProbe = dist;
        return this;
      }
      if (st === 1 && this._hashes[idx] === h && this._keys[idx] === key) {
        this._values[idx] = value;
        return this;
      }
      if (st === 1) this.collisions++;
      if (st === 2 && firstTombstone < 0) firstTombstone = idx;
      idx = (idx + 1) & this._mask;
      dist++;
    }
    return this;
  }

  delete(key: string): boolean {
    const h = this.hashKey(key);
    let idx = h & this._mask;
    let dist = 0;
    while (dist < this._capacity) {
      const st = this._state[idx];
      if (st === 0) return false;
      if (st === 1 && this._hashes[idx] === h && this._keys[idx] === key) {
        this._keys[idx] = undefined;
        this._values[idx] = undefined;
        this._hashes[idx] = 0;
        this._state[idx] = 2;
        this._size--;
        this._tombstones++;
        const pr = this._prev[idx];
        const nx = this._next[idx];
        if (pr >= 0) this._next[pr] = nx; else this.orderHead = nx;
        if (nx >= 0) this._prev[nx] = pr; else this.orderTail = pr;
        this._next[idx] = -1;
        this._prev[idx] = -1;
        return true;
      }
      idx = (idx + 1) & this._mask;
      dist++;
    }
    return false;
  }

  clear(): void {
    this._keys.fill(undefined);
    this._values.fill(undefined);
    this._hashes.fill(0);
    this._state.fill(0);
    this._next.fill(-1);
    this._prev.fill(-1);
    this._size = 0;
    this._tombstones = 0;
    this.orderHead = -1;
    this.orderTail = -1;
    this.maxProbe = 0;
  }

  *entries(): IterableIterator<[string, V]> {
    let idx = this.orderHead;
    while (idx >= 0) {
      if (this._state[idx] === 1) {
        yield [this._keys[idx] as string, this._values[idx] as V];
      }
      idx = this._next[idx];
    }
  }

  *keys(): IterableIterator<string> {
    let idx = this.orderHead;
    while (idx >= 0) {
      if (this._state[idx] === 1) {
        yield this._keys[idx] as string;
      }
      idx = this._next[idx];
    }
  }

  *values(): IterableIterator<V> {
    let idx = this.orderHead;
    while (idx >= 0) {
      if (this._state[idx] === 1) {
        yield this._values[idx] as V;
      }
      idx = this._next[idx];
    }
  }

  [Symbol.iterator](): IterableIterator<[string, V]> {
    return this.entries();
  }

  forEach(fn: (value: V, key: string, map: KoinaHash<V>) => void): void {
    let idx = this.orderHead;
    while (idx >= 0) {
      if (this._state[idx] === 1) {
        fn(this._values[idx] as V, this._keys[idx] as string, this);
      }
      idx = this._next[idx];
    }
  }

  private resize(newCap: number): void {
    const oldKeys = this._keys;
    const oldValues = this._values;
    const oldHashes = this._hashes;
    const oldState = this._state;
    const oldNext = this._next;
    const oldHead = this.orderHead;

    this._capacity = newCap;
    this._mask = newCap - 1;
    this._keys = new Array(newCap);
    this._values = new Array(newCap);
    this._hashes = new Uint32Array(newCap);
    this._state = new Uint8Array(newCap);
    this._next = new Int32Array(newCap).fill(-1);
    this._prev = new Int32Array(newCap).fill(-1);
    this._size = 0;
    this._tombstones = 0;
    this.orderHead = -1;
    this.orderTail = -1;
    this.maxProbe = 0;
    this.rehashes++;

    let idx = oldHead;
    while (idx >= 0) {
      if (oldState[idx] === 1) {
        this.set(oldKeys[idx] as string, oldValues[idx] as V);
      }
      idx = oldNext[idx];
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
    robinSwaps: number;
    algorithm: string;
    deletionStrategy: string;
  } {
    return {
      size: this._size,
      capacity: this._capacity,
      tombstones: this._tombstones,
      loadFactor: this._size / this._capacity,
      collisions: this.collisions,
      rehashes: this.rehashes,
      maxProbe: this.maxProbe,
      robinSwaps: this.robinSwaps,
      algorithm: 'open_addressing',
      deletionStrategy: 'tombstone',
    };
  }
}
