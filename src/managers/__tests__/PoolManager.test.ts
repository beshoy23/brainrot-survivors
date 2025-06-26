import { PoolManager } from '../PoolManager';

// Mock object for testing
class MockObject {
  public id: number;
  public active: boolean = false;
  public data: string = '';
  
  constructor(id: number) {
    this.id = id;
  }
  
  reset(): void {
    this.active = false;
    this.data = '';
  }
}

describe('PoolManager', () => {
  let createCount: number;
  let resetCount: number;
  let poolManager: PoolManager<MockObject>;
  
  const createFn = () => {
    createCount++;
    return new MockObject(createCount);
  };
  
  const resetFn = (item: MockObject) => {
    resetCount++;
    item.reset();
  };
  
  beforeEach(() => {
    createCount = 0;
    resetCount = 0;
    poolManager = new PoolManager(createFn, resetFn, 10);
  });

  describe('initialization', () => {
    it('should pre-create objects according to initial size', () => {
      expect(createCount).toBe(10);
      expect(poolManager.getTotalCount()).toBe(10);
      expect(poolManager.getActiveCount()).toBe(0);
    });
  });

  describe('acquire', () => {
    it('should reuse existing objects without creating new ones', () => {
      const obj1 = poolManager.acquire();
      const obj2 = poolManager.acquire();
      
      expect(createCount).toBe(10); // No new objects created
      expect(obj1.id).toBe(10); // Last created object (LIFO)
      expect(obj2.id).toBe(9);
      expect(poolManager.getActiveCount()).toBe(2);
    });

    it('should create new objects when pool is exhausted', () => {
      // Acquire all 10 pre-created objects
      for (let i = 0; i < 10; i++) {
        poolManager.acquire();
      }
      
      // Next acquire should create new object
      const obj11 = poolManager.acquire();
      expect(createCount).toBe(11);
      expect(obj11.id).toBe(11);
      expect(poolManager.getActiveCount()).toBe(11);
    });

    it('should track active objects correctly', () => {
      const objects = [];
      for (let i = 0; i < 5; i++) {
        objects.push(poolManager.acquire());
      }
      
      expect(poolManager.getActiveCount()).toBe(5);
      expect(poolManager.getActive()).toEqual(expect.arrayContaining(objects));
    });
  });

  describe('release', () => {
    it('should return objects to available pool and reset them', () => {
      const obj = poolManager.acquire();
      obj.active = true;
      obj.data = 'test';
      
      poolManager.release(obj);
      
      expect(resetCount).toBe(1);
      expect(obj.active).toBe(false);
      expect(obj.data).toBe('');
      expect(poolManager.getActiveCount()).toBe(0);
    });

    it('should reuse released objects on next acquire', () => {
      const obj1 = poolManager.acquire();
      const id1 = obj1.id;
      poolManager.release(obj1);
      
      const obj2 = poolManager.acquire();
      expect(obj2.id).toBe(id1); // Same object reused
      expect(createCount).toBe(10); // No new objects created
    });

    it('should ignore releasing objects not in active set', () => {
      const fakeObj = new MockObject(999);
      
      poolManager.release(fakeObj);
      
      expect(resetCount).toBe(0);
      expect(poolManager.getActiveCount()).toBe(0);
    });

    it('should handle double release gracefully', () => {
      const obj = poolManager.acquire();
      poolManager.release(obj);
      poolManager.release(obj); // Second release
      
      expect(resetCount).toBe(1); // Only reset once
      expect(poolManager.getActiveCount()).toBe(0);
    });
  });

  describe('releaseAll', () => {
    it('should release all active objects', () => {
      const objects = [];
      for (let i = 0; i < 5; i++) {
        const obj = poolManager.acquire();
        obj.active = true;
        objects.push(obj);
      }
      
      poolManager.releaseAll();
      
      expect(resetCount).toBe(5);
      expect(poolManager.getActiveCount()).toBe(0);
      objects.forEach(obj => {
        expect(obj.active).toBe(false);
      });
    });

    it('should make all objects available for reuse', () => {
      // Acquire 5 objects
      for (let i = 0; i < 5; i++) {
        poolManager.acquire();
      }
      
      poolManager.releaseAll();
      
      // Should be able to acquire same 5 objects without creating new ones
      for (let i = 0; i < 5; i++) {
        poolManager.acquire();
      }
      
      expect(createCount).toBe(10); // No new objects created
    });
  });

  describe('memory efficiency', () => {
    it('should maintain zero garbage collection during heavy usage', () => {
      const initialCreateCount = createCount;
      
      // Simulate game loop with rapid acquire/release
      for (let frame = 0; frame < 1000; frame++) {
        const objects = [];
        
        // Acquire 20 objects per frame
        for (let i = 0; i < 20; i++) {
          objects.push(poolManager.acquire());
        }
        
        // Release them all
        objects.forEach(obj => poolManager.release(obj));
      }
      
      // Should only create 10 additional objects (20 - 10 initial)
      expect(createCount).toBe(initialCreateCount + 10);
    });

    it('should handle variable load patterns efficiently', () => {
      // Simulate varying load
      const loads = [5, 15, 30, 10, 50, 20];
      let maxCreated = 10; // Initial pool size
      
      loads.forEach(load => {
        const objects = [];
        for (let i = 0; i < load; i++) {
          objects.push(poolManager.acquire());
        }
        
        if (load > maxCreated) {
          maxCreated = load;
        }
        
        // Release all
        objects.forEach(obj => poolManager.release(obj));
      });
      
      // Should only create objects up to max load
      expect(createCount).toBe(50); // Max load was 50
      expect(poolManager.getTotalCount()).toBe(50);
    });
  });

  describe('edge cases', () => {
    it('should handle zero initial size', () => {
      const emptyPool = new PoolManager(createFn, resetFn, 0);
      
      const obj = emptyPool.acquire();
      expect(obj).toBeDefined();
      expect(obj.id).toBe(createCount);
    });

    it('should maintain consistency with rapid acquire/release cycles', () => {
      const obj1 = poolManager.acquire();
      poolManager.release(obj1);
      const obj2 = poolManager.acquire();
      poolManager.release(obj2);
      
      expect(obj1).toBe(obj2); // Same object instance
      expect(poolManager.getTotalCount()).toBe(10);
    });

    it('should handle concurrent operations correctly', () => {
      const objects = [];
      
      // Acquire some objects
      for (let i = 0; i < 5; i++) {
        objects.push(poolManager.acquire());
      }
      
      // Release some while acquiring others
      poolManager.release(objects[0]);
      const newObj = poolManager.acquire();
      poolManager.release(objects[1]);
      
      expect(poolManager.getActiveCount()).toBe(4);
      expect(newObj).toBe(objects[0]); // Reused first released object
    });
  });
});