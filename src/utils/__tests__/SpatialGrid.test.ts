import { SpatialGrid, GridEntity } from '../SpatialGrid';

// Mock entity for testing
class MockEntity implements GridEntity {
  constructor(
    public id: string,
    public x: number,
    public y: number
  ) {}
}

describe('SpatialGrid', () => {
  let spatialGrid: SpatialGrid<MockEntity>;
  
  beforeEach(() => {
    // Create a 1000x1000 world with 100x100 cells
    spatialGrid = new SpatialGrid(100, 1000, 1000);
  });

  describe('insert', () => {
    it('should insert entity into correct cell', () => {
      const entity = new MockEntity('e1', 150, 250);
      
      spatialGrid.insert(entity);
      
      // Entity at (150, 250) should be in cell (1, 2)
      const nearby = spatialGrid.getNearby(150, 250, 1);
      expect(nearby).toContain(entity);
    });

    it('should handle entities at cell boundaries', () => {
      const entity1 = new MockEntity('e1', 99, 99);   // Cell (0, 0)
      const entity2 = new MockEntity('e2', 100, 100); // Cell (1, 1)
      const entity3 = new MockEntity('e3', 101, 101); // Cell (1, 1)
      
      spatialGrid.insert(entity1);
      spatialGrid.insert(entity2);
      spatialGrid.insert(entity3);
      
      const nearbyCell00 = spatialGrid.getNearby(50, 50, 1);
      expect(nearbyCell00).toContain(entity1);
      expect(nearbyCell00).not.toContain(entity2);
      
      const nearbyCell11 = spatialGrid.getNearby(150, 150, 1);
      expect(nearbyCell11).toContain(entity2);
      expect(nearbyCell11).toContain(entity3);
      expect(nearbyCell11).not.toContain(entity1);
    });

    it('should handle multiple entities in same cell', () => {
      const entities = [
        new MockEntity('e1', 10, 10),
        new MockEntity('e2', 20, 20),
        new MockEntity('e3', 30, 30),
      ];
      
      entities.forEach(e => spatialGrid.insert(e));
      
      const nearby = spatialGrid.getNearby(25, 25, 50);
      expect(nearby).toHaveLength(3);
      expect(nearby).toEqual(expect.arrayContaining(entities));
    });
  });

  describe('remove', () => {
    it('should remove entity from grid', () => {
      const entity = new MockEntity('e1', 150, 250);
      
      spatialGrid.insert(entity);
      spatialGrid.remove(entity);
      
      const nearby = spatialGrid.getNearby(150, 250, 1);
      expect(nearby).not.toContain(entity);
    });

    it('should handle removing non-existent entity', () => {
      const entity = new MockEntity('e1', 150, 250);
      
      expect(() => spatialGrid.remove(entity)).not.toThrow();
    });
  });

  describe('update', () => {
    it('should move entity to new cell', () => {
      const entity = new MockEntity('e1', 50, 50); // Cell (0, 0)
      
      spatialGrid.insert(entity);
      
      // Move entity to new position
      entity.x = 250;
      entity.y = 250; // Cell (2, 2)
      spatialGrid.update(entity);
      
      // Should not be in old cell
      const oldCellNearby = spatialGrid.getNearby(50, 50, 1);
      expect(oldCellNearby).not.toContain(entity);
      
      // Should be in new cell
      const newCellNearby = spatialGrid.getNearby(250, 250, 1);
      expect(newCellNearby).toContainEqual(entity);
    });
  });

  describe('getNearby', () => {
    it('should return entities within radius', () => {
      const entities = [
        new MockEntity('e1', 100, 100),
        new MockEntity('e2', 150, 100),
        new MockEntity('e3', 180, 180),
        new MockEntity('e4', 120, 120),
      ];
      
      entities.forEach(e => spatialGrid.insert(e));
      
      // Query with radius 100 from (100, 100)
      const nearby = spatialGrid.getNearby(100, 100, 100);
      
      expect(nearby).toContain(entities[0]); // At query point
      expect(nearby).toContain(entities[1]); // 50 units away
      expect(nearby).toContain(entities[3]); // ~28 units away
      expect(nearby).toContain(entities[2]); // ~113 units away but in adjacent cell
    });

    it('should handle queries at world boundaries', () => {
      const entity = new MockEntity('e1', 10, 10);
      spatialGrid.insert(entity);
      
      const nearby = spatialGrid.getNearby(0, 0, 50);
      expect(nearby).toContain(entity);
    });

    it('should return unique entities even if in multiple queried cells', () => {
      const entity = new MockEntity('e1', 150, 150);
      spatialGrid.insert(entity);
      
      // Large radius that covers multiple cells
      const nearby = spatialGrid.getNearby(150, 150, 200);
      
      // Entity should appear only once
      expect(nearby.filter(e => e.id === 'e1')).toHaveLength(1);
    });

    it('should handle empty cells efficiently', () => {
      // Insert entities in one corner
      for (let i = 0; i < 10; i++) {
        spatialGrid.insert(new MockEntity(`e${i}`, i * 10, i * 10));
      }
      
      // Query far away - should return empty efficiently
      const nearby = spatialGrid.getNearby(900, 900, 50);
      expect(nearby).toHaveLength(0);
    });
  });

  describe('clear', () => {
    it('should remove all entities', () => {
      const entities = Array.from({ length: 100 }, (_, i) => 
        new MockEntity(`e${i}`, Math.random() * 1000, Math.random() * 1000)
      );
      
      entities.forEach(e => spatialGrid.insert(e));
      spatialGrid.clear();
      
      const nearby = spatialGrid.getNearby(500, 500, 1000);
      expect(nearby).toHaveLength(0);
    });
  });

  describe('performance', () => {
    it('should handle 200+ entities with O(1) query performance', () => {
      // Insert 200 entities spread across the world
      const entities = Array.from({ length: 200 }, (_, i) => 
        new MockEntity(`e${i}`, Math.random() * 1000, Math.random() * 1000)
      );
      
      entities.forEach(e => spatialGrid.insert(e));
      
      // Measure query time
      const iterations = 1000;
      const startTime = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        spatialGrid.getNearby(500, 500, 100);
      }
      
      const endTime = performance.now();
      const avgTime = (endTime - startTime) / iterations;
      
      // Average query should be under 0.1ms
      expect(avgTime).toBeLessThan(0.1);
    });

    it('should maintain performance with varying entity distributions', () => {
      // Test with clustered entities
      for (let i = 0; i < 100; i++) {
        spatialGrid.insert(new MockEntity(`cluster1-${i}`, 100 + i % 10, 100 + Math.floor(i / 10)));
        spatialGrid.insert(new MockEntity(`cluster2-${i}`, 800 + i % 10, 800 + Math.floor(i / 10)));
      }
      
      const startTime = performance.now();
      
      // Query in dense area
      const dense = spatialGrid.getNearby(105, 105, 50);
      
      // Query in sparse area
      const sparse = spatialGrid.getNearby(500, 500, 50);
      
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(1);
      expect(dense.length).toBeGreaterThan(sparse.length);
    });

    it('should efficiently rebuild grid each frame', () => {
      const entities = Array.from({ length: 200 }, (_, i) => 
        new MockEntity(`e${i}`, Math.random() * 1000, Math.random() * 1000)
      );
      
      const startTime = performance.now();
      
      // Simulate 60 frames
      for (let frame = 0; frame < 60; frame++) {
        spatialGrid.clear();
        entities.forEach(e => {
          // Move entities slightly
          e.x += Math.random() * 10 - 5;
          e.y += Math.random() * 10 - 5;
          spatialGrid.insert(e);
        });
      }
      
      const endTime = performance.now();
      
      // Should complete 60 rebuilds in under 100ms
      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  describe('edge cases', () => {
    it('should handle negative coordinates', () => {
      const entity = new MockEntity('e1', -50, -50);
      
      spatialGrid.insert(entity);
      const nearby = spatialGrid.getNearby(-50, -50, 10);
      
      expect(nearby).toContain(entity);
    });

    it('should handle very large coordinates', () => {
      const entity = new MockEntity('e1', 999999, 999999);
      
      spatialGrid.insert(entity);
      const nearby = spatialGrid.getNearby(999999, 999999, 10);
      
      expect(nearby).toContain(entity);
    });

    it('should handle zero radius queries', () => {
      const entity = new MockEntity('e1', 100, 100);
      spatialGrid.insert(entity);
      
      const nearby = spatialGrid.getNearby(100, 100, 0);
      expect(nearby).toContain(entity);
    });
  });
});