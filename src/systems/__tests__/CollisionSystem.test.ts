import { CollisionSystem } from '../CollisionSystem';
import { Player } from '../../entities/Player';
import { Enemy } from '../../entities/Enemy';
import { SpatialGrid } from '../../utils/SpatialGrid';
import { GameConfig } from '../../config/game';

// Mock dependencies
jest.mock('../../utils/SpatialGrid');
jest.mock('../../entities/Player');
jest.mock('../../entities/Enemy');

describe('CollisionSystem', () => {
  let collisionSystem: CollisionSystem;
  let mockPlayer: jest.Mocked<Player>;
  let mockEnemies: jest.Mocked<Enemy>[];
  let mockSpatialGrid: jest.Mocked<SpatialGrid<Enemy>>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create collision system
    collisionSystem = new CollisionSystem(1000, 1000);
    
    // Get mocked spatial grid
    mockSpatialGrid = (SpatialGrid as jest.MockedClass<typeof SpatialGrid>).mock.instances[0] as jest.Mocked<SpatialGrid<Enemy>>;
    
    // Create mock player
    mockPlayer = {
      sprite: { x: 100, y: 100 },
      takeDamage: jest.fn()
    } as any;
    
    // Create mock enemies
    mockEnemies = [
      {
        id: 'enemy1',
        sprite: { x: 110, y: 100, active: true },
        damage: 10,
        hitboxRadius: 16,
        isDying: false
      },
      {
        id: 'enemy2',
        sprite: { x: 90, y: 100, active: true },
        damage: 15,
        hitboxRadius: 16,
        isDying: false
      },
      {
        id: 'enemy3',
        sprite: { x: 200, y: 200, active: true },
        damage: 20,
        hitboxRadius: 16,
        isDying: false
      }
    ] as any[];
  });

  describe('update', () => {
    it('should rebuild spatial grid with active non-dying enemies', () => {
      mockSpatialGrid.getNearby.mockReturnValue([]);
      
      collisionSystem.update(1000, mockPlayer, mockEnemies);
      
      expect(mockSpatialGrid.clear).toHaveBeenCalledTimes(1);
      expect(mockSpatialGrid.insert).toHaveBeenCalledTimes(3);
      expect(mockSpatialGrid.insert).toHaveBeenCalledWith(mockEnemies[0]);
      expect(mockSpatialGrid.insert).toHaveBeenCalledWith(mockEnemies[1]);
      expect(mockSpatialGrid.insert).toHaveBeenCalledWith(mockEnemies[2]);
    });

    it('should not insert inactive or dying enemies', () => {
      mockEnemies[0].sprite.active = false;
      mockEnemies[1].isDying = true;
      mockSpatialGrid.getNearby.mockReturnValue([]);
      
      collisionSystem.update(1000, mockPlayer, mockEnemies);
      
      expect(mockSpatialGrid.insert).toHaveBeenCalledTimes(1);
      expect(mockSpatialGrid.insert).toHaveBeenCalledWith(mockEnemies[2]);
    });

    it('should query nearby enemies with correct radius', () => {
      mockSpatialGrid.getNearby.mockReturnValue([]);
      
      collisionSystem.update(1000, mockPlayer, mockEnemies);
      
      expect(mockSpatialGrid.getNearby).toHaveBeenCalledWith(
        100, // player x
        100, // player y
        GameConfig.player.hitboxRadius + 16 + 10 // player radius + max enemy radius + buffer
      );
    });

    it('should apply damage from colliding enemies on 150ms intervals', () => {
      // Setup collision detection
      mockSpatialGrid.getNearby.mockReturnValue([mockEnemies[0], mockEnemies[1]]);
      
      // First update - should apply damage
      collisionSystem.update(1000, mockPlayer, mockEnemies);
      expect(mockPlayer.takeDamage).toHaveBeenCalledWith(25); // 10 + 15 damage
      
      // Update at 100ms - should not apply damage (too soon)
      mockPlayer.takeDamage.mockClear();
      collisionSystem.update(1100, mockPlayer, mockEnemies);
      expect(mockPlayer.takeDamage).not.toHaveBeenCalled();
      
      // Update at 150ms - should apply damage again
      collisionSystem.update(1150, mockPlayer, mockEnemies);
      expect(mockPlayer.takeDamage).toHaveBeenCalledWith(25);
    });

    it('should not apply damage from dying enemies', () => {
      mockEnemies[0].isDying = true;
      mockSpatialGrid.getNearby.mockReturnValue([mockEnemies[0], mockEnemies[1]]);
      
      collisionSystem.update(1000, mockPlayer, mockEnemies);
      
      // Only enemy2's damage should be applied
      expect(mockPlayer.takeDamage).toHaveBeenCalledWith(15);
    });

    it('should handle no collisions', () => {
      mockSpatialGrid.getNearby.mockReturnValue([]);
      
      collisionSystem.update(1000, mockPlayer, mockEnemies);
      
      expect(mockPlayer.takeDamage).not.toHaveBeenCalled();
    });

    it('should sum damage from multiple enemies', () => {
      // Only first two enemies are close enough to collide
      mockSpatialGrid.getNearby.mockReturnValue([mockEnemies[0], mockEnemies[1]]);
      
      collisionSystem.update(1000, mockPlayer, mockEnemies);
      
      expect(mockPlayer.takeDamage).toHaveBeenCalledWith(25); // 10 + 15
    });
  });

  describe('collision detection', () => {
    it('should detect collision when enemy within combined radius', () => {
      // Enemy very close to player
      mockEnemies[0].sprite.x = 105;
      mockEnemies[0].sprite.y = 100;
      mockSpatialGrid.getNearby.mockReturnValue([mockEnemies[0]]);
      
      collisionSystem.update(1000, mockPlayer, mockEnemies);
      
      // Distance is 5, combined radius is ~24, so should collide
      expect(mockPlayer.takeDamage).toHaveBeenCalled();
    });

    it('should not detect collision when enemy outside combined radius', () => {
      // Enemy far from player
      mockEnemies[0].sprite.x = 150;
      mockEnemies[0].sprite.y = 150;
      mockSpatialGrid.getNearby.mockReturnValue([mockEnemies[0]]);
      
      collisionSystem.update(1000, mockPlayer, mockEnemies);
      
      // Distance is ~70, combined radius is ~24, so no collision
      expect(mockPlayer.takeDamage).not.toHaveBeenCalled();
    });
  });

  describe('performance', () => {
    it('should handle 200+ enemies efficiently', () => {
      // Create 200 enemies
      const manyEnemies = Array.from({ length: 200 }, (_, i) => ({
        id: `enemy${i}`,
        sprite: { x: Math.random() * 1000, y: Math.random() * 1000, active: true },
        damage: 10,
        hitboxRadius: 16,
        isDying: false
      })) as any[];
      
      // Only first 10 are nearby
      mockSpatialGrid.getNearby.mockReturnValue(manyEnemies.slice(0, 10));
      
      const startTime = performance.now();
      collisionSystem.update(1000, mockPlayer, manyEnemies);
      const endTime = performance.now();
      
      // Should complete in under 5ms
      expect(endTime - startTime).toBeLessThan(5);
      expect(mockSpatialGrid.insert).toHaveBeenCalledTimes(200);
    });
  });
});