export class PoolManager<T> {
  private available: T[] = [];
  private active: Set<T> = new Set();
  private allPooledItems: Set<T> = new Set(); // Track all items created by pool

  constructor(
    private createFn: () => T,
    private resetFn: (item: T) => void,
    initialSize: number = 50
  ) {
    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      const item = this.createFn();
      this.available.push(item);
      this.allPooledItems.add(item);
    }
  }

  acquire(): T {
    let item: T;
    
    if (this.available.length > 0) {
      item = this.available.pop()!;
    } else {
      item = this.createFn();
      this.allPooledItems.add(item); // Track new items
    }
    
    this.active.add(item);
    return item;
  }

  release(item: T): void {
    // Only release items that belong to this pool
    if (!this.allPooledItems.has(item)) {
      console.warn('Attempted to release non-pooled item');
      return;
    }
    
    // Prevent double-release
    if (!this.active.has(item)) return;
    
    try {
      this.resetFn(item);
    } catch (error) {
      console.error('Reset function failed:', error);
      // Still remove from active to prevent memory leak
    }
    
    this.active.delete(item);
    this.available.push(item);
  }

  releaseAll(): void {
    // Convert to array to avoid iterator issues
    const itemsToRelease = Array.from(this.active);
    
    // Clear active set first to prevent double-release
    this.active.clear();
    
    // Reset and return items to available pool
    itemsToRelease.forEach(item => {
      this.resetFn(item);
      this.available.push(item);
    });
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