import { WeaponSystem } from '../WeaponSystem';
import { Scene } from 'phaser';
import { Player } from '../../entities/Player';
import { Enemy } from '../../entities/Enemy';
import { Weapon } from '../../entities/Weapon';
import { Projectile } from '../../entities/Projectile';
import { PoolManager } from '../../managers/PoolManager';
import { WeaponFactory } from '../../weapons/WeaponFactory';
import { IWeaponBehavior } from '../../weapons/IWeaponBehavior';
import { Vector2 } from '../../utils/Vector2';

// Mock Phaser
(global as any).Phaser = {
  GameObjects: {
    Graphics: class MockGraphics {}
  }
};

// Mock dependencies
jest.mock('../../managers/PoolManager');
jest.mock('../../weapons/WeaponFactory');
jest.mock('../../entities/Player');
jest.mock('../../entities/Enemy');
jest.mock('../../entities/Projectile');

// Mock weapon behavior
class MockWeaponBehavior implements IWeaponBehavior {
  fire = jest.fn().mockReturnValue([]);
  getTargets = jest.fn().mockReturnValue([]);
  getDescription = jest.fn().mockReturnValue('Mock weapon');
}

describe('WeaponSystem', () => {
  let weaponSystem: WeaponSystem;
  let mockScene: jest.Mocked<Scene>;
  let mockPlayer: jest.Mocked<Player>;
  let mockEnemies: jest.Mocked<Enemy>[];
  let mockProjectilePool: jest.Mocked<PoolManager<Projectile>>;
  let mockWeapon: jest.Mocked<Weapon>;
  let mockBehavior: MockWeaponBehavior;
  
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Setup mock scene
    mockScene = {
      add: { 
        text: jest.fn().mockReturnValue({
          setOrigin: jest.fn(),
          setDepth: jest.fn(),
          destroy: jest.fn()
        }) 
      },
      time: { delayedCall: jest.fn() },
      tweens: {
        add: jest.fn()
      }
    } as any;
    
    // Setup mock player
    mockPlayer = {
      getPosition: jest.fn().mockReturnValue(new Vector2(100, 100))
    } as any;
    
    // Setup mock enemies
    mockEnemies = Array.from({ length: 5 }, (_, i) => ({
      id: `enemy${i}`,
      x: 150 + i * 50,
      y: 100,
      sprite: { active: true },
      isDying: false,
      takeDamage: jest.fn().mockReturnValue(false),
      enemyType: { color: 0xff0000 }
    })) as any[];
    
    // Setup mock projectile pool
    const mockProjectiles: any[] = Array.from({ length: 10 }, (_, i) => ({
      x: 0,
      y: 0,
      damage: 10,
      sprite: { active: true },
      update: jest.fn().mockReturnValue(false),
      reset: jest.fn(),
      fire: jest.fn()
    }));
    
    mockProjectilePool = {
      acquire: jest.fn().mockImplementation(() => {
        const proj = mockProjectiles.find(p => !p.sprite.active) || mockProjectiles[0];
        proj.sprite.active = true;
        return proj;
      }),
      release: jest.fn().mockImplementation((proj) => {
        proj.sprite.active = false;
      })
    } as any;
    
    (PoolManager as jest.MockedClass<typeof PoolManager>).mockImplementation(() => mockProjectilePool);
    
    // Setup mock weapon
    mockBehavior = new MockWeaponBehavior();
    mockWeapon = {
      canFire: jest.fn().mockReturnValue(true),
      getDamage: jest.fn().mockReturnValue(25),
      updateFireTime: jest.fn(),
      behavior: mockBehavior,
      range: 200
    } as any;
    
    // Mock WeaponFactory
    (WeaponFactory.createStarterWeapon as jest.Mock).mockReturnValue(mockWeapon);
    
    // Create weapon system
    weaponSystem = new WeaponSystem(mockScene);
  });

  describe('initialization', () => {
    it('should create projectile pool and starter weapon', () => {
      expect(PoolManager).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        100
      );
      expect(WeaponFactory.createStarterWeapon).toHaveBeenCalled();
    });
  });

  describe('weapon management', () => {
    it('should add weapons to the system', () => {
      const newWeapon = { ...mockWeapon } as any;
      weaponSystem.addWeapon(newWeapon);
      
      // Should have starter weapon + new weapon
      expect(weaponSystem['weapons']).toHaveLength(2);
    });
  });

  describe('update cycle', () => {
    it('should fire weapons when canFire returns true', () => {
      const mockProjectile = {
        x: 100,
        y: 100,
        damage: 25,
        sprite: { active: true },
        update: jest.fn().mockReturnValue(false),
        fire: jest.fn()
      };
      
      mockBehavior.fire.mockReturnValue([{
        projectile: mockProjectile,
        targetX: 200,
        targetY: 100,
        speed: 300
      }]);
      
      weaponSystem.update(16, 1000, mockPlayer, mockEnemies);
      
      expect(mockWeapon.canFire).toHaveBeenCalledWith(1000);
      expect(mockBehavior.fire).toHaveBeenCalled();
      expect(mockWeapon.updateFireTime).toHaveBeenCalledWith(1000);
      expect(mockProjectile.fire).toHaveBeenCalled();
    });

    it('should skip firing when canFire returns false', () => {
      mockWeapon.canFire.mockReturnValue(false);
      
      weaponSystem.update(16, 1000, mockPlayer, mockEnemies);
      
      expect(mockBehavior.fire).not.toHaveBeenCalled();
    });
  });

  describe('projectile collision', () => {
    it('should damage enemies on collision', () => {
      // Create active projectile near enemy
      const mockProjectile = {
        x: 155,
        y: 100,
        damage: 25,
        sprite: { active: true },
        update: jest.fn().mockReturnValue(false)
      };
      
      weaponSystem['activeProjectiles'].add(mockProjectile as any);
      
      weaponSystem.update(16, 1000, mockPlayer, mockEnemies);
      
      // Enemy at (150, 100) should be hit by projectile at (155, 100)
      expect(mockEnemies[0].takeDamage).toHaveBeenCalledWith(25);
    });

    it('should not damage dying enemies', () => {
      const mockProjectile = {
        x: 155,
        y: 100,
        damage: 25,
        sprite: { active: true },
        update: jest.fn().mockReturnValue(false)
      };
      
      mockEnemies[0].isDying = true;
      weaponSystem['activeProjectiles'].add(mockProjectile as any);
      
      weaponSystem.update(16, 1000, mockPlayer, mockEnemies);
      
      expect(mockEnemies[0].takeDamage).not.toHaveBeenCalled();
    });

    it('should remove projectiles after collision', () => {
      const mockProjectile = {
        x: 155,
        y: 100,
        damage: 25,
        sprite: { active: true },
        update: jest.fn().mockReturnValue(false)
      };
      
      weaponSystem['activeProjectiles'].add(mockProjectile as any);
      
      weaponSystem.update(16, 1000, mockPlayer, mockEnemies);
      
      expect(weaponSystem['activeProjectiles'].has(mockProjectile as any)).toBe(false);
      expect(mockProjectilePool.release).toHaveBeenCalledWith(mockProjectile);
    });

    it('should trigger callbacks on enemy death', () => {
      const onEnemyDeath = jest.fn();
      const onDamageDealt = jest.fn();
      weaponSystem.onEnemyDeath = onEnemyDeath;
      weaponSystem.onDamageDealt = onDamageDealt;
      
      // Enemy dies on hit
      mockEnemies[0].takeDamage.mockReturnValue(true);
      
      const mockProjectile = {
        x: 155,
        y: 100,
        damage: 25,
        sprite: { active: true },
        update: jest.fn().mockReturnValue(false)
      };
      
      weaponSystem['activeProjectiles'].add(mockProjectile as any);
      
      weaponSystem.update(16, 1000, mockPlayer, mockEnemies);
      
      expect(onDamageDealt).toHaveBeenCalledWith(25);
      expect(onEnemyDeath).toHaveBeenCalledWith(150, 100);
    });
  });

  describe('projectile lifecycle', () => {
    it('should remove expired projectiles', () => {
      const expiredProjectile = {
        sprite: { active: true },
        update: jest.fn().mockReturnValue(true) // Expired
      };
      
      weaponSystem['activeProjectiles'].add(expiredProjectile as any);
      
      weaponSystem.update(16, 1000, mockPlayer, mockEnemies);
      
      expect(weaponSystem['activeProjectiles'].has(expiredProjectile as any)).toBe(false);
      expect(mockProjectilePool.release).toHaveBeenCalledWith(expiredProjectile);
    });

    it('should update all active projectiles', () => {
      const projectiles = Array.from({ length: 3 }, () => ({
        sprite: { active: true },
        update: jest.fn().mockReturnValue(false)
      }));
      
      projectiles.forEach(p => weaponSystem['activeProjectiles'].add(p as any));
      
      weaponSystem.update(16, 1000, mockPlayer, mockEnemies);
      
      projectiles.forEach(p => {
        expect(p.update).toHaveBeenCalledWith(16);
      });
    });
  });

  describe('weapon upgrades', () => {
    it('should update weapons when upgrades change', () => {
      (window as any).upgradeManager = {
        getUpgradeLevel: jest.fn().mockReturnValue(2)
      };
      
      weaponSystem.updateWeaponsForUpgrades();
      
      expect((window as any).upgradeManager.getUpgradeLevel).toHaveBeenCalledWith('projectileCount');
    });
  });

  describe('performance', () => {
    it('should handle many projectiles efficiently', () => {
      // Add 50 active projectiles
      const projectiles = Array.from({ length: 50 }, (_, i) => ({
        x: 100 + i,
        y: 100,
        damage: 10,
        sprite: { active: true },
        update: jest.fn().mockReturnValue(false)
      }));
      
      projectiles.forEach(p => weaponSystem['activeProjectiles'].add(p as any));
      
      const startTime = performance.now();
      weaponSystem.update(16, 1000, mockPlayer, mockEnemies);
      const endTime = performance.now();
      
      // Should complete in under 5ms
      expect(endTime - startTime).toBeLessThan(5);
    });

    it('should use object pooling for projectiles', () => {
      // Mock behavior to actually use the pool
      mockBehavior.fire.mockImplementation((pos, enemies, pool) => {
        const projectile = pool.acquire();
        return [{
          projectile,
          targetX: 200,
          targetY: 100
        }];
      });
      
      // Fire 20 times
      for (let i = 0; i < 20; i++) {
        weaponSystem.update(16, i * 1000, mockPlayer, mockEnemies);
      }
      
      // Should reuse projectiles from pool
      expect(mockProjectilePool.acquire).toHaveBeenCalled();
      expect(mockProjectilePool.acquire.mock.calls.length).toBeGreaterThanOrEqual(20);
    });
  });

  describe('edge cases', () => {
    it('should handle empty enemy array', () => {
      expect(() => {
        weaponSystem.update(16, 1000, mockPlayer, []);
      }).not.toThrow();
    });

    it('should handle weapons with no valid targets', () => {
      mockBehavior.fire.mockReturnValue([]);
      
      weaponSystem.update(16, 1000, mockPlayer, mockEnemies);
      
      expect(weaponSystem['activeProjectiles'].size).toBe(0);
    });
  });
});