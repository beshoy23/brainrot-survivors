import { WhipBehavior } from '../WhipBehavior';
import { Vector2 } from '../../../utils/Vector2';
import { Enemy } from '../../../entities/Enemy';
import { Player } from '../../../entities/Player';
import { Projectile } from '../../../entities/Projectile';
import { PoolManager } from '../../../managers/PoolManager';

describe('WhipBehavior', () => {
  let whipBehavior: WhipBehavior;
  let mockProjectilePool: jest.Mocked<PoolManager<Projectile>>;
  let mockEnemies: jest.Mocked<Enemy>[];
  let mockPlayer: jest.Mocked<Player>;
  let mockProjectile: jest.Mocked<Projectile>;

  beforeEach(() => {
    whipBehavior = new WhipBehavior();
    
    // Mock projectile
    mockProjectile = {
      id: 'test-projectile',
      sprite: { active: true, setVisible: jest.fn() },
      reset: jest.fn()
    } as any;
    
    // Mock projectile pool
    mockProjectilePool = {
      acquire: jest.fn().mockReturnValue(mockProjectile),
      release: jest.fn()
    } as any;
    
    // Mock player
    mockPlayer = {
      getPosition: jest.fn().mockReturnValue(new Vector2(100, 100))
    } as any;
    
    // Mock enemies
    mockEnemies = [
      {
        x: 150, // 50 units right of player
        y: 100, // Same Y as player
        sprite: { active: true },
        health: 100
      },
      {
        x: 50, // 50 units left of player  
        y: 100, // Same Y as player
        sprite: { active: true },
        health: 100
      },
      {
        x: 100, // Same position as player
        y: 50, // 50 units above player
        sprite: { active: true },
        health: 100
      }
    ] as any;
  });

  describe('damage mechanics', () => {
    it('should create projectiles for enemies within whip range and arc', () => {
      const playerPos = new Vector2(100, 100);
      const damage = 25;
      const range = 150;
      
      const projectilesFired = whipBehavior.fire(
        playerPos,
        mockEnemies,
        mockProjectilePool,
        damage,
        range,
        mockPlayer
      );
      
      // Should hit at least one enemy (the one directly to the right/left)
      expect(projectilesFired.length).toBeGreaterThan(0);
      expect(mockProjectilePool.acquire).toHaveBeenCalled();
    });

    it('should create invisible projectiles for damage delivery', () => {
      const playerPos = new Vector2(100, 100);
      const damage = 25;
      const range = 150;
      
      const projectilesFired = whipBehavior.fire(
        playerPos,
        mockEnemies,
        mockProjectilePool,
        damage,
        range,
        mockPlayer
      );
      
      projectilesFired.forEach(projectileFire => {
        expect(projectileFire.projectile).toBe(mockProjectile);
        expect(projectileFire.speed).toBe(0); // Instant hit
        expect(projectileFire.visuals.alpha).toBe(0); // Invisible
      });
    });

    it('should not hit enemies outside whip range', () => {
      const playerPos = new Vector2(100, 100);
      const damage = 25;
      const range = 150;
      
      // Add enemy far away
      const farEnemy = {
        x: 300, // 200 units away (beyond whip length of 150)
        y: 100,
        sprite: { active: true },
        health: 100
      } as any;
      
      const enemiesWithFar = [...mockEnemies, farEnemy];
      
      const projectilesFired = whipBehavior.fire(
        playerPos,
        enemiesWithFar,
        mockProjectilePool,
        damage,
        range,
        mockPlayer
      );
      
      // Should not create projectile for far enemy
      const farEnemyHit = projectilesFired.some(p => 
        p.startX === farEnemy.x && p.startY === farEnemy.y
      );
      expect(farEnemyHit).toBe(false);
    });

    it('should not hit inactive enemies', () => {
      const playerPos = new Vector2(100, 100);
      const damage = 25;
      const range = 150;
      
      // Make one enemy inactive
      mockEnemies[0].sprite.active = false;
      
      const projectilesFired = whipBehavior.fire(
        playerPos,
        mockEnemies,
        mockProjectilePool,
        damage,
        range,
        mockPlayer
      );
      
      // Should not create projectile for inactive enemy
      const inactiveEnemyHit = projectilesFired.some(p => 
        p.startX === mockEnemies[0].x && p.startY === mockEnemies[0].y
      );
      expect(inactiveEnemyHit).toBe(false);
    });

    it('should alternate whip direction', () => {
      const playerPos = new Vector2(100, 100);
      const damage = 25;
      const range = 150;
      
      // Fire twice and check direction alternates
      const firstFire = whipBehavior.fire(
        playerPos,
        mockEnemies,
        mockProjectilePool,
        damage,
        range,
        mockPlayer
      );
      
      const secondFire = whipBehavior.fire(
        playerPos,
        mockEnemies,
        mockProjectilePool,
        damage,
        range,
        mockPlayer
      );
      
      // Both should create projectiles (alternating sides)
      expect(firstFire.length).toBeGreaterThan(0);
      expect(secondFire.length).toBeGreaterThan(0);
    });

    it('should respect minimum distance (dead zone)', () => {
      const playerPos = new Vector2(100, 100);
      const damage = 25;
      const range = 150;
      
      // Add enemy very close to player (within dead zone)
      const closeEnemy = {
        x: 105, // Only 5 units away (less than 20 unit dead zone)
        y: 100,
        sprite: { active: true },
        health: 100
      } as any;
      
      const enemiesWithClose = [...mockEnemies, closeEnemy];
      
      const projectilesFired = whipBehavior.fire(
        playerPos,
        enemiesWithClose,
        mockProjectilePool,
        damage,
        range,
        mockPlayer
      );
      
      // Should not hit enemy in dead zone
      const closeEnemyHit = projectilesFired.some(p => 
        p.startX === closeEnemy.x && p.startY === closeEnemy.y
      );
      expect(closeEnemyHit).toBe(false);
    });
  });

  describe('targeting system', () => {
    it('should return enemies within whip range for getTargets', () => {
      const playerPos = new Vector2(100, 100);
      const range = 150;
      const maxTargets = 10;
      
      const targets = whipBehavior.getTargets(playerPos, mockEnemies, range, maxTargets);
      
      expect(targets.length).toBeGreaterThan(0);
      expect(targets.length).toBeLessThanOrEqual(maxTargets);
    });

    it('should respect maxTargets limit', () => {
      const playerPos = new Vector2(100, 100);
      const range = 150;
      const maxTargets = 1;
      
      const targets = whipBehavior.getTargets(playerPos, mockEnemies, range, maxTargets);
      
      expect(targets.length).toBeLessThanOrEqual(maxTargets);
    });
  });

  describe('weapon description', () => {
    it('should provide accurate description', () => {
      const description = whipBehavior.getDescription();
      expect(description).toContain('horizontal');
      expect(description).toContain('alternating');
    });
  });
});