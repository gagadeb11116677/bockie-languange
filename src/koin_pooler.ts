// Created by xobe

import { BValue, BList, BDict } from './interpreter';
import { KoinaHash } from './koina-hash';

export class KoinPooler {
  private listPool: BList[] = [];
  private dictPool: KoinaHash<BValue>[] = [];
  private listPoolMax: number = 1024;
  private dictPoolMax: number = 512;
  public listAllocs: number = 0;
  public listReuses: number = 0;
  public dictAllocs: number = 0;
  public dictReuses: number = 0;
  public totalSavedBytes: number = 0;

  acquireList(): BList {
    if (this.listPool.length > 0) {
      const list = this.listPool.pop()!;
      list.items.length = 0;
      this.listReuses++;
      this.totalSavedBytes += 64;
      return list;
    }
    this.listAllocs++;
    return { __type: 'list', items: [] };
  }

  releaseList(list: BList): void {
    if (this.listPool.length < this.listPoolMax) {
      list.items.length = 0;
      this.listPool.push(list);
    }
  }

  acquireDict(): KoinaHash<BValue> {
    if (this.dictPool.length > 0) {
      const d = this.dictPool.pop()!;
      d.clear();
      this.dictReuses++;
      this.totalSavedBytes += 512;
      return d;
    }
    this.dictAllocs++;
    return new KoinaHash<BValue>();
  }

  releaseDict(d: KoinaHash<BValue>): void {
    if (this.dictPool.length < this.dictPoolMax) {
      d.clear();
      this.dictPool.push(d);
    }
  }

  getRSSMB(): number {
    const m = process.memoryUsage();
    return Math.round(m.rss / 1024 / 1024);
  }

  getHeapUsedMB(): number {
    const m = process.memoryUsage();
    return Math.round(m.heapUsed / 1024 / 1024);
  }

  stats() {
    return {
      listPoolSize: this.listPool.length,
      dictPoolSize: this.dictPool.length,
      listAllocs: this.listAllocs,
      listReuses: this.listReuses,
      dictAllocs: this.dictAllocs,
      dictReuses: this.dictReuses,
      totalSavedBytes: this.totalSavedBytes,
      rssMB: this.getRSSMB(),
      heapUsedMB: this.getHeapUsedMB(),
    };
  }

  reset(): void {
    this.listPool.length = 0;
    this.dictPool.length = 0;
    this.listAllocs = 0;
    this.listReuses = 0;
    this.dictAllocs = 0;
    this.dictReuses = 0;
    this.totalSavedBytes = 0;
  }
}

export const koinPooler = new KoinPooler();
