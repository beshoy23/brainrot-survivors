import { PoolManager } from '../PoolManager';

class TestObject {
  public active: boolean = true;
  public id: number;
  
  constructor(id: number) {
    this.id = id;
  }
  
  reset(): void {
    this.active = false;
  }
}

describe('PoolManager - Potential Bugs', () => {
  let poolManager: PoolManager<TestObject>;
  let createCount: number;
  
  beforeEach(() => {
    createCount = 0;
    poolManager = new PoolManager(
      () => new TestObject(++createCount),
      (obj) => obj.reset(),
      10
    );
  });

  describe('concurrent access bugs', () => {
    it('BUG: acquire/release during iteration corrupts state', () => {
      // Acquire some objects
      const objects = [];
      for (let i = 0; i < 5; i++) {
        objects.push(poolManager.acquire());
      }
      
      // Get active objects and iterate
      const active = poolManager.getActive();
      
      // Release during iteration - corrupts iterator!
      active.forEach(obj => {
        poolManager.release(obj); // Modifying Set during iteration!
      });
      
      // State is now corrupted
      expect(poolManager.getActiveCount()).toBe(0);
    });

    it('BUG: double acquire of same object possible with race condition', () => {
      const obj1 = poolManager.acquire();
      poolManager.release(obj1);
      
      // In a race condition, two threads could both pop() the same object
      // JavaScript is single-threaded but async operations could cause issues
      
      const available = poolManager['available'];
      const lastItem = available[available.length - 1];
      
      // Simulate race: both "threads" see same available object
      const obj2 = poolManager.acquire();
      
      // If timing is bad, obj1 === obj2!
      expect(obj2.id).toBe(obj1.id); // Same object acquired twice
    });
  });

  describe('reset function bugs', () => {
    it('BUG: reset function can throw and break pool', () => {
      const badPool = new PoolManager<TestObject>(
        () => new TestObject(1),
        (obj) => {
          if (obj.id === 5) throw new Error('Reset failed!');
          obj.reset();
        },
        10
      );
      
      // Acquire and modify object
      const obj = badPool.acquire();
      obj.id = 5;
      
      // Release will throw - object stuck in limbo!
      expect(() => badPool.release(obj)).toThrow();
      
      // Object neither active nor available - memory leak!
      expect(badPool.getActiveCount()).toBe(1); // Still active!
      expect(badPool['available'].length).toBe(9); // Not returned!
    });

    it('BUG: reset function side effects can corrupt pool', () => {
      let externalState = 0;
      
      const sideEffectPool = new PoolManager<TestObject>(
        () => new TestObject(1),
        (obj) => {
          obj.reset();
          externalState++; // Side effect
          
          // What if this causes another acquire/release?
          if (externalState === 5) {
            // This could happen in real game code
            const another = sideEffectPool.acquire(); // Nested acquire!
          }
        },
        10
      );
      
      // This can cause infinite loops or stack overflow
    });
  });

  describe('memory bugs', () => {
    it('BUG: available array grows unbounded with releaseAll spam', () => {
      // Acquire all objects
      const objects = [];
      for (let i = 0; i < 10; i++) {
        objects.push(poolManager.acquire());
      }
      
      // Spam releaseAll
      for (let i = 0; i < 100; i++) {
        poolManager.releaseAll();
      }
      
      // Available array has duplicates!
      expect(poolManager['available'].length).toBeGreaterThan(10);
      
      // Memory leak - same objects added multiple times
    });

    it('BUG: circular references prevent garbage collection', () => {
      class CircularObject {
        public next: CircularObject | null = null;
        public id: number;
        
        constructor(id: number) {
          this.id = id;
        }
      }
      
      const circularPool = new PoolManager(
        () => new CircularObject(1),
        (obj) => { /* reset doesn't clear circular ref! */ },
        2
      );
      
      const obj1 = circularPool.acquire();
      const obj2 = circularPool.acquire();
      
      // Create circular reference
      obj1.next = obj2;
      obj2.next = obj1;
      
      circularPool.release(obj1);
      circularPool.release(obj2);
      
      // Objects can never be garbage collected!
      // Pool holds references forever
    });
  });

  describe('edge cases', () => {
    it('BUG: negative initial size breaks assumptions', () => {
      const badPool = new PoolManager(
        () => new TestObject(1),
        (obj) => obj.reset(),
        -10 // Negative size!
      );
      
      // No objects created, first acquire must create
      const obj = badPool.acquire();
      expect(obj).toBeDefined();
      
      // But available.length assumptions broken
      expect(badPool['available'].length).toBe(0);
    });

    it('BUG: createFn returning same object breaks pool', () => {
      const sameObject = new TestObject(999);
      
      const brokenPool = new PoolManager(
        () => sameObject, // Always returns same object!
        (obj) => obj.reset(),
        5
      );
      
      const obj1 = brokenPool.acquire();
      const obj2 = brokenPool.acquire();
      
      // Same object acquired twice!
      expect(obj1).toBe(obj2);
      
      // Pool is completely broken
      brokenPool.release(obj1);
      expect(brokenPool.getActiveCount()).toBe(1); // obj2 still active but same object!
    });

    it('BUG: release of non-pooled objects silently accepted', () => {
      const external = new TestObject(999);
      
      // Release object that was never acquired
      poolManager.release(external);
      
      // No error, but pool state corrupted
      expect(poolManager['available']).toContain(external);
      
      // Next acquire gets non-pooled object!
      const acquired = poolManager.acquire();
      // Could be the external object, breaking assumptions
    });
  });

  describe('performance degradation', () => {
    it('BUG: Set operations degrade with thousands of active objects', () => {
      const bigPool = new PoolManager(
        () => new TestObject(1),
        (obj) => obj.reset(),
        0
      );
      
      // Acquire thousands
      const objects = [];
      for (let i = 0; i < 10000; i++) {
        objects.push(bigPool.acquire());
      }
      
      // Release operations become O(n) due to Set.delete
      const start = performance.now();
      objects.forEach(obj => bigPool.release(obj));
      const end = performance.now();
      
      console.log(`Releasing 10k objects took ${end - start}ms`);
      
      // This can cause frame drops in game
    });
  });
});