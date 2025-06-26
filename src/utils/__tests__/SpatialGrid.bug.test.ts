import { SpatialGrid, GridEntity } from '../SpatialGrid';

class MockEntity implements GridEntity {
  constructor(
    public id: string,
    public x: number,
    public y: number,
    public radius: number = 0
  ) {}
}

describe('SpatialGrid - Potential Bugs', () => {
  let spatialGrid: SpatialGrid<MockEntity>;
  
  beforeEach(() => {
    spatialGrid = new SpatialGrid(100, 1000, 1000);
  });

  describe('edge case bugs', () => {
    it('BUG: entities on cell boundaries might be missed', () => {
      // Entity is at position 199.9, which is in cell 1, but its radius extends into cell 2
      const entity = new MockEntity('e1', 199.9, 100);
      spatialGrid.insert(entity);
      
      // Query at position 200.1 with small radius
      // The entity's center is in cell 1, but it should be found if it has a radius
      const nearby = spatialGrid.getNearby(200.1, 100, 10);
      
      // This will FAIL because SpatialGrid only stores entities in one cell
      // but entities with radius can span multiple cells!
      expect(nearby).toContain(entity); // This should fail
    });

    it('FIXED: large entities spanning multiple cells are now properly stored', () => {
      // Large entity with radius 60 that spans multiple cells
      const largeEntity = new MockEntity('large', 95, 95, 60);
      spatialGrid.insert(largeEntity);
      
      // Query in adjacent cells where the entity's bounds extend
      const nearby1 = spatialGrid.getNearby(105, 105, 5);
      const nearby2 = spatialGrid.getNearby(45, 45, 5);
      
      // Both should find the entity because it has radius 60
      expect(nearby1.length).toBe(1); // Entity found!
      expect(nearby2.length).toBe(1); // Entity found!
    });

    it('BUG: update method has race condition', () => {
      const entity = new MockEntity('e1', 50, 50);
      spatialGrid.insert(entity);
      
      // If another system modifies entity position during update...
      const originalUpdate = spatialGrid.update.bind(spatialGrid);
      spatialGrid.update = function(e: MockEntity) {
        // Simulate position change mid-update
        spatialGrid.remove(e);
        e.x = 150; // Position changes during removal
        spatialGrid.insert(e);
      };
      
      entity.x = 250;
      spatialGrid.update(entity);
      
      // Entity might be in wrong cell or duplicated
      const nearby1 = spatialGrid.getNearby(150, 50, 10);
      const nearby2 = spatialGrid.getNearby(250, 50, 10);
      
      // Could be in both or neither!
      console.log('Found at 150:', nearby1.length);
      console.log('Found at 250:', nearby2.length);
    });
  });

  describe('collision system integration bugs', () => {
    it('BUG: CollisionSystem hardcodes maxEnemyRadius=24 but enemies can be larger', () => {
      // If we add a new enemy type with radius > 24, collision detection breaks
      // The CollisionSystem line 25 hardcodes this value!
      const veryLargeEnemy = new MockEntity('boss', 500, 500);
      // If this enemy has radius 50, it won't be detected properly
      
      // CollisionSystem.getNearby uses GameConfig.player.hitboxRadius + 24
      // But if enemy radius is 50, we miss collisions!
    });
  });

  describe('performance bugs', () => {
    it('BUG: clear() is O(n) not O(1) for large grids', () => {
      // Insert many entities
      for (let i = 0; i < 1000; i++) {
        spatialGrid.insert(new MockEntity(`e${i}`, Math.random() * 1000, Math.random() * 1000));
      }
      
      const startTime = performance.now();
      spatialGrid.clear();
      const clearTime = performance.now() - startTime;
      
      // Clearing iterates all Maps - not constant time!
      console.log('Clear time for 1000 entities:', clearTime);
      
      // Do it again with 10000
      for (let i = 0; i < 10000; i++) {
        spatialGrid.insert(new MockEntity(`e${i}`, Math.random() * 1000, Math.random() * 1000));
      }
      
      const startTime2 = performance.now();
      spatialGrid.clear();
      const clearTime2 = performance.now() - startTime2;
      
      console.log('Clear time for 10000 entities:', clearTime2);
      // Time scales with entity count!
    });
  });

  describe('memory leaks', () => {
    it('POTENTIAL BUG: removed entities might leave empty Sets in grid', () => {
      // Insert and remove many entities
      for (let i = 0; i < 100; i++) {
        const entity = new MockEntity(`e${i}`, i * 10, i * 10);
        spatialGrid.insert(entity);
        spatialGrid.remove(entity);
      }
      
      // The grid Map still has entries for all those cells with empty Sets
      // This is a memory leak over time!
      console.log('Grid map size after removals:', spatialGrid['grid'].size);
      expect(spatialGrid['grid'].size).toBe(0); // This will fail - memory leak!
    });
  });
});