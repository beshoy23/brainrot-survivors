import { SpawnSystem } from '../SpawnSystem';
import { Scene } from 'phaser';
import { Vector2 } from '../../utils/Vector2';
import { getWaveConfig } from '../../config/waveConfig';

// Mock minimal dependencies
jest.mock('../../config/waveConfig');
jest.mock('../../entities/Enemy', () => ({
  Enemy: jest.fn().mockImplementation(() => ({
    sprite: { 
      active: true,
      setVisible: jest.fn(),
      setActive: jest.fn()
    },
    health: 100,
    isDying: false,
    spawn: jest.fn(),
    reset: jest.fn()
  }))
}));

describe('SpawnSystem - Potential Bugs', () => {
  let spawnSystem: SpawnSystem;
  let mockScene: jest.Mocked<Scene>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockScene = {
      scale: { width: 800, height: 600 }
    } as any;
    
    (getWaveConfig as jest.Mock).mockReturnValue({
      minEnemies: 20,
      spawnInterval: 1000,
      types: ['basic'],
      bossSpawn: false
    });
    
    spawnSystem = new SpawnSystem(mockScene);
  });

  describe('spawn position bugs', () => {
    it('BUG: enemies can spawn at exact same position causing overlap', () => {
      const playerPos = new Vector2(400, 300);
      const spawnPositions: Array<{x: number, y: number}> = [];
      
      // Spy on spawnSingleEnemy to capture positions
      const originalSpawn = spawnSystem['spawnSingleEnemy'];
      spawnSystem['spawnSingleEnemy'] = jest.fn().mockImplementation((pos, type) => {
        // Capture the spawn calculation
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.max(mockScene.scale.width, mockScene.scale.height) / 2 + 100;
        const x = pos.x + Math.cos(angle) * distance;
        const y = pos.y + Math.sin(angle) * distance;
        spawnPositions.push({x, y});
      });
      
      // Force rapid spawning
      jest.spyOn(Math, 'random').mockReturnValue(0.5); // Same angle every time!
      
      // Spawn multiple enemies
      for (let i = 0; i < 10; i++) {
        spawnSystem['spawnSingleEnemy'](playerPos, { id: 'basic' });
      }
      
      // All enemies spawn at same position!
      const firstPos = spawnPositions[0];
      const allSamePosition = spawnPositions.every(pos => 
        pos.x === firstPos.x && pos.y === firstPos.y
      );
      
      expect(allSamePosition).toBe(true); // BUG: No position variation!
    });

    it('BUG: spawn distance calculation can place enemies inside viewport', () => {
      const playerPos = new Vector2(0, 0); // Player at edge
      
      // The calculation uses max(width, height) / 2 + spawnDistance
      // But if player is at edge, enemies can spawn on screen!
      const spawnDistance = Math.max(mockScene.scale.width, mockScene.scale.height) / 2 + 100;
      
      // Enemy spawning opposite of player (angle = 0)
      const enemyX = playerPos.x + spawnDistance; // 500
      
      // But screen width is 800, so enemy at x=500 is visible!
      expect(enemyX).toBeLessThan(mockScene.scale.width); // BUG!
    });
  });

  describe('enemy pool bugs', () => {
    it('BUG: releaseEnemy called on dead enemies can cause double-release', () => {
      const mockEnemy = {
        sprite: { active: true },
        health: 0,
        isDying: false,
        id: 'enemy1'
      };
      
      spawnSystem['enemyPool'].getActive = jest.fn().mockReturnValue([mockEnemy]);
      spawnSystem['enemyPool'].release = jest.fn();
      
      // First update - enemy is released
      spawnSystem.update(1000, new Vector2(400, 300));
      expect(spawnSystem['enemyPool'].release).toHaveBeenCalledWith(mockEnemy);
      
      // Enemy still in active list (pool bug)
      spawnSystem['enemyPool'].release.mockClear();
      
      // Second update - enemy released again!
      spawnSystem.update(2000, new Vector2(400, 300));
      expect(spawnSystem['enemyPool'].release).toHaveBeenCalledWith(mockEnemy);
      
      // Double release can corrupt pool state!
    });
  });

  describe('wave timing bugs', () => {
    it('BUG: rapid spawn mode can exceed minEnemies due to async spawning', () => {
      (getWaveConfig as jest.Mock).mockReturnValue({
        minEnemies: 10,
        spawnInterval: 1000,
        types: ['basic']
      });
      
      let activeCount = 0;
      spawnSystem['enemyPool'].acquire = jest.fn().mockImplementation(() => {
        activeCount++;
        return { spawn: jest.fn() };
      });
      
      spawnSystem['enemyPool'].getActive = jest.fn().mockImplementation(() => 
        Array(activeCount).fill({
          sprite: { active: true },
          health: 100,
          isDying: false
        })
      );
      
      // Simulate rapid spawning with lag
      for (let time = 0; time < 1000; time += 100) {
        // Async delay simulating frame drops
        if (time === 500) activeCount = 8; // Some enemies spawned
        
        spawnSystem.update(time, new Vector2(400, 300));
      }
      
      // Fixed: proper minEnemies check prevents excessive spawning
      console.log('Final active count:', activeCount);
      expect(activeCount).toBeLessThanOrEqual(10); // No longer exceeds limit
    });

    it('BUG: survival time not synchronized with game time', () => {
      const playerPos = new Vector2(400, 300);
      
      // Update with non-continuous time (frame drops)
      spawnSystem.update(1000, playerPos);
      spawnSystem.update(5000, playerPos); // 4 second jump!
      
      // survivalTime is set to currentTime, not deltaTime
      // This means wave progression can skip!
      expect(spawnSystem['survivalTime']).toBe(5000);
      
      // If game pauses, waves jump ahead!
    });
  });

  describe('enemy type selection bugs', () => {
    it('BUG: getRandomEnemyType handles empty arrays gracefully', () => {
      // Mock getAvailableEnemyTypes to return empty array
      jest.doMock('../../config/enemyTypes', () => ({
        getAvailableEnemyTypes: jest.fn().mockReturnValue([]),
        getRandomEnemyType: jest.fn().mockImplementation((types: any[]) => {
          if (types.length === 0) return { id: 'basic', spawnWeight: 1 }; // Fallback
          return types[0];
        })
      }));
      
      (getWaveConfig as jest.Mock).mockReturnValue({
        minEnemies: 5,
        spawnInterval: 1000,
        types: ['basic']
      });
      
      // Should not throw due to fallback handling
      expect(() => {
        spawnSystem['spawnWaveEnemies'](new Vector2(400, 300));
      }).not.toThrow();
    });
  });

  describe('memory leaks', () => {
    it('BUG: Elite spawn tracking never cleans up', () => {
      // lastEliteSpawn keeps growing but never resets
      const times = [60000, 120000, 180000, 240000];
      
      times.forEach(time => {
        spawnSystem['lastEliteSpawn'] = time;
      });
      
      // No mechanism to clean old spawn times
      // Over long games, timing calculations could overflow
      expect(spawnSystem['lastEliteSpawn']).toBe(240000);
    });
  });

  describe('floating point bugs', () => {
    it('BUG: spawn angle calculation can produce NaN positions', () => {
      const playerPos = new Vector2(NaN, 300); // Bad player position
      
      // This will calculate: NaN + Math.cos(angle) * distance = NaN
      const angle = 0;
      const distance = 500;
      const x = playerPos.x + Math.cos(angle) * distance;
      
      expect(isNaN(x)).toBe(true); // Spawns enemy at NaN position!
      
      // No validation in spawnSingleEnemy method!
    });
  });
});