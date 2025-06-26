import { SpawnSystem } from '../SpawnSystem';
import { Scene } from 'phaser';
import { PoolManager } from '../../managers/PoolManager';
import { Enemy } from '../../entities/Enemy';
import { Vector2 } from '../../utils/Vector2';
import { getWaveConfig } from '../../config/waveConfig';
import { EnemyTypeId } from '../../enemies/EnemyType';

// Mock dependencies
jest.mock('../../managers/PoolManager');
jest.mock('../../entities/Enemy');
jest.mock('../../config/waveConfig');
jest.mock('../../config/enemyTypes', () => ({
  ENEMY_TYPES: {
    basic: { id: 'basic', minWaveTime: 0, spawnWeight: 1, health: 100 },
    fast: { id: 'fast', minWaveTime: 30, spawnWeight: 1, health: 80 },
    swarm: { id: 'swarm', minWaveTime: 60, spawnWeight: 1, health: 40 },
    tank: { id: 'tank', minWaveTime: 120, spawnWeight: 1, health: 300 },
    elite: { id: 'elite', minWaveTime: 180, spawnWeight: 1, health: 500 }
  },
  getRandomEnemyType: jest.fn((types) => types[0])
}));

describe('SpawnSystem', () => {
  let spawnSystem: SpawnSystem;
  let mockScene: jest.Mocked<Scene>;
  let mockEnemyPool: jest.Mocked<PoolManager<Enemy>>;
  let mockEnemies: jest.Mocked<Enemy>[];
  
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Setup mock scene
    mockScene = {
      scale: { width: 800, height: 600 }
    } as any;
    
    // Setup mock enemies
    mockEnemies = Array.from({ length: 10 }, (_, i) => ({
      sprite: { active: true },
      health: 100,
      isDying: false,
      spawn: jest.fn(),
      reset: jest.fn()
    })) as any[];
    
    // Setup mock pool
    mockEnemyPool = {
      acquire: jest.fn().mockImplementation(() => {
        const enemy = mockEnemies.find(e => !e.sprite.active) || mockEnemies[0];
        enemy.sprite.active = true;
        return enemy;
      }),
      release: jest.fn().mockImplementation((enemy) => {
        enemy.sprite.active = false;
      }),
      getActive: jest.fn().mockImplementation(() => 
        mockEnemies.filter(e => e.sprite.active)
      )
    } as any;
    
    // Mock PoolManager constructor
    (PoolManager as jest.MockedClass<typeof PoolManager>).mockImplementation(() => mockEnemyPool);
    
    // Setup wave config
    (getWaveConfig as jest.Mock).mockImplementation((minute) => ({
      minEnemies: 20,
      spawnInterval: 1000,
      types: minute < 1 ? ['basic'] : ['basic', 'fast'],
      bossSpawn: minute >= 5
    }));
    
    // Create spawn system
    spawnSystem = new SpawnSystem(mockScene);
  });

  describe('wave progression', () => {
    it('should use correct wave config based on time', () => {
      const playerPos = new Vector2(400, 300);
      
      // At 0 minutes
      spawnSystem.update(0, playerPos);
      expect(getWaveConfig).toHaveBeenCalledWith(0);
      
      // At 2 minutes
      spawnSystem.update(120000, playerPos);
      expect(getWaveConfig).toHaveBeenCalledWith(2);
    });

    it('should only spawn available enemy types for current time', () => {
      const playerPos = new Vector2(400, 300);
      
      // At 45 seconds - should have basic and fast enemies
      spawnSystem.update(45000, playerPos);
      
      // Trigger spawn
      spawnSystem['spawnWaveEnemies'](playerPos);
      
      const spawnCall = mockEnemies[0].spawn.mock.calls[0];
      const enemyType = spawnCall[2];
      expect(['basic', 'fast']).toContain(enemyType.id);
    });
  });

  describe('spawn modes', () => {
    it('should enter rapid spawn mode when below minimum enemies', () => {
      const playerPos = new Vector2(400, 300);
      
      // Start with 0 active enemies, min is 20
      mockEnemyPool.getActive.mockReturnValue([]);
      
      // Multiple rapid spawns should occur
      for (let i = 0; i < 10; i++) {
        spawnSystem.update(i * 100, playerPos);
      }
      
      // Should acquire multiple enemies quickly
      expect(mockEnemyPool.acquire.mock.calls.length).toBeGreaterThan(5);
    });

    it('should use normal spawn mode when at minimum enemies', () => {
      const playerPos = new Vector2(400, 300);
      
      // Set active enemies to minimum (20)
      const activeEnemies = Array(20).fill({}).map(() => ({ sprite: { active: true } }));
      mockEnemyPool.getActive.mockReturnValue(activeEnemies);
      
      // First update
      spawnSystem.update(1000, playerPos);
      const firstAcquireCount = mockEnemyPool.acquire.mock.calls.length;
      
      // Second update 500ms later (before spawn interval)
      spawnSystem.update(1500, playerPos);
      
      // Should not spawn more (respecting interval)
      expect(mockEnemyPool.acquire.mock.calls.length).toBe(firstAcquireCount);
      
      // Third update at spawn interval
      spawnSystem.update(2000, playerPos);
      
      // Should spawn one more
      expect(mockEnemyPool.acquire.mock.calls.length).toBe(firstAcquireCount + 1);
    });
  });

  describe('spawn positioning', () => {
    it('should spawn enemies off-screen', () => {
      const playerPos = new Vector2(400, 300);
      
      spawnSystem['spawnSingleEnemy'](playerPos, { id: 'basic', health: 100 });
      
      const spawnCall = mockEnemies[0].spawn.mock.calls[0];
      const [x, y] = spawnCall;
      
      // Calculate distance from player
      const dx = x - playerPos.x;
      const dy = y - playerPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Should be off-screen (> 400 pixels away)
      expect(distance).toBeGreaterThan(400);
    });

    it('should spawn enemies in random directions', () => {
      const playerPos = new Vector2(400, 300);
      const angles: number[] = [];
      
      // Spawn 10 enemies and check angles
      for (let i = 0; i < 10; i++) {
        spawnSystem['spawnSingleEnemy'](playerPos, { id: 'basic', health: 100 });
        
        const spawnCall = mockEnemies[0].spawn.mock.calls[i];
        const [x, y] = spawnCall;
        
        const angle = Math.atan2(y - playerPos.y, x - playerPos.x);
        angles.push(angle);
      }
      
      // Angles should be distributed (not all the same)
      const uniqueAngles = new Set(angles.map(a => Math.round(a * 10) / 10));
      expect(uniqueAngles.size).toBeGreaterThan(5);
    });
  });

  describe('enemy cleanup', () => {
    it('should release dead enemies that are not dying', () => {
      const playerPos = new Vector2(400, 300);
      
      // Set some enemies as dead but not dying
      mockEnemies[0].health = 0;
      mockEnemies[0].isDying = false;
      mockEnemies[1].health = 0;
      mockEnemies[1].isDying = true; // This one is playing death animation
      
      mockEnemyPool.getActive.mockReturnValue([mockEnemies[0], mockEnemies[1]]);
      
      spawnSystem.update(1000, playerPos);
      
      // Should only release the non-dying dead enemy
      expect(mockEnemyPool.release).toHaveBeenCalledTimes(1);
      expect(mockEnemyPool.release).toHaveBeenCalledWith(mockEnemies[0]);
    });
  });

  describe('boss spawning', () => {
    it('should spawn elite enemies at minute marks when configured', () => {
      const playerPos = new Vector2(400, 300);
      
      // Configure wave to allow boss spawns
      (getWaveConfig as jest.Mock).mockReturnValue({
        minEnemies: 20,
        spawnInterval: 1000,
        types: ['basic'],
        bossSpawn: true
      });
      
      // Update at 5 minutes
      spawnSystem.update(300000, playerPos);
      
      // Should spawn an elite
      const eliteSpawn = mockEnemies.find(e => 
        e.spawn.mock.calls.some(call => call[2]?.id === EnemyTypeId.ELITE)
      );
      
      expect(eliteSpawn).toBeDefined();
    });

    it('should respect elite spawn interval', () => {
      const playerPos = new Vector2(400, 300);
      
      (getWaveConfig as jest.Mock).mockReturnValue({
        minEnemies: 0,
        spawnInterval: 1000,
        types: ['basic'],
        bossSpawn: true
      });
      
      // First elite spawn
      spawnSystem.update(60000, playerPos);
      const firstEliteCount = mockEnemies.filter(e => 
        e.spawn.mock.calls.some(call => call[2]?.id === EnemyTypeId.ELITE)
      ).length;
      
      // Too soon for another elite
      spawnSystem.update(90000, playerPos);
      const secondEliteCount = mockEnemies.filter(e => 
        e.spawn.mock.calls.some(call => call[2]?.id === EnemyTypeId.ELITE)
      ).length;
      
      expect(secondEliteCount).toBe(firstEliteCount);
    });
  });

  describe('health scaling', () => {
    it('should apply progressive health scaling over time', () => {
      const playerPos = new Vector2(400, 300);
      
      // Spy on the health scaling method
      const applyHealthScalingSpy = jest.spyOn(spawnSystem as any, 'applyHealthScaling');
      
      spawnSystem['spawnSingleEnemy'](playerPos, { id: 'basic', health: 100 });
      
      expect(applyHealthScalingSpy).toHaveBeenCalled();
    });
  });

  describe('performance', () => {
    it('should handle rapid spawn bursts efficiently', () => {
      const playerPos = new Vector2(400, 300);
      
      // Configure for rapid spawning
      mockEnemyPool.getActive.mockReturnValue([]);
      (getWaveConfig as jest.Mock).mockReturnValue({
        minEnemies: 100,
        spawnInterval: 1000,
        types: ['basic']
      });
      
      const startTime = performance.now();
      
      // Simulate 10 rapid spawn updates
      for (let i = 0; i < 10; i++) {
        spawnSystem.update(i * 100, playerPos);
      }
      
      const endTime = performance.now();
      
      // Should complete in under 10ms
      expect(endTime - startTime).toBeLessThan(10);
    });
  });
});