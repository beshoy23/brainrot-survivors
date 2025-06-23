export class PoolManager<T> {
  private available: T[] = [];
  private active: Set<T> = new Set();

  constructor(
    private createFn: () => T,
    private resetFn: (item: T) => void,
    initialSize: number = 50
  ) {
    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      this.available.push(this.createFn());
    }
  }

  acquire(): T {
    let item: T;
    
    if (this.available.length > 0) {
      item = this.available.pop()!;
    } else {
      item = this.createFn();
    }
    
    this.active.add(item);
    return item;
  }

  release(item: T): void {
    if (!this.active.has(item)) return;
    
    this.resetFn(item);
    this.active.delete(item);
    this.available.push(item);
  }

  releaseAll(): void {
    this.active.forEach(item => {
      this.resetFn(item);
      this.available.push(item);
    });
    this.active.clear();
  }

  getActive(): T[] {
    return Array.from(this.active);
  }

  getActiveCount(): number {
    return this.active.size;
  }

  getTotalCount(): number {
    return this.active.size + this.available.length;
  }
}