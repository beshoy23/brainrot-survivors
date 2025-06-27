import { WeaponSystem } from '../WeaponSystem';
import { Scene } from 'phaser';
import { Player } from '../../entities/Player';
import { Enemy } from '../../entities/Enemy';
import { Vector2 } from '../../utils/Vector2';

// Mock Phaser
(global as any).Phaser = {
  GameObjects: {
    Graphics: class MockGraphics {}
  }
};

describe('WeaponSystem - Potential Bugs', () => {
  let weaponSystem: WeaponSystem;
  let mockScene: jest.Mocked<Scene>;
  
  beforeEach(() => {
    mockScene = {
      add: { 
        text: jest.fn().mockReturnValue({
          setOrigin: jest.fn(),
          setDepth: jest.fn(),
          destroy: jest.fn()
        }),
        graphics: jest.fn().mockReturnValue({
          setVisible: jest.fn(),
          setActive: jest.fn(),
          setPosition: jest.fn(),
          setDepth: jest.fn(),
          destroy: jest.fn(),
          clear: jest.fn(),
          fillStyle: jest.fn(),
          fillCircle: jest.fn(),
          strokeCircle: jest.fn(),
          lineBetween: jest.fn()
        })
      },
      time: { delayedCall: jest.fn() },
      tweens: { add: jest.fn() }
    } as any;
    
    weaponSystem = new WeaponSystem(mockScene);
  });

  describe('projectile collision bugs', () => {
    it('BUG: projectile can hit same enemy multiple times', () => {
      const mockEnemy = {
        id: 'enemy1',
        x: 100,
        y: 100,
        sprite: { active: true },
        isDying: false,
        takeDamage: jest.fn().mockReturnValue(false),
        enemyType: { color: 0xff0000 }
      };
      
      const mockProjectile = {
        x: 100,
        y: 100,
        damage: 25,
        sprite: { active: true },
        update: jest.fn().mockReturnValue(false)
      };
      
      weaponSystem['activeProjectiles'].add(mockProjectile as any);
      
      // First frame - enemy takes damage
      weaponSystem.update(16, 1000, { getPosition: () => new Vector2(0, 0) } as any, [mockEnemy] as any);
      expect(mockEnemy.takeDamage).toHaveBeenCalledTimes(1);
      
      // Projectile removed but what if it wasn't? (e.g., piercing projectile)
      weaponSystem['activeProjectiles'].add(mockProjectile as any); // Re-add
      
      // Second frame - enemy takes damage again!
      weaponSystem.update(16, 1016, { getPosition: () => new Vector2(0, 0) } as any, [mockEnemy] as any);
      expect(mockEnemy.takeDamage).toHaveBeenCalledTimes(2); // BUG: Hit twice!
    });

    it('BUG: collision check uses hardcoded radius of 15', () => {
      const mockEnemy = {
        x: 100,
        y: 100,
        hitboxRadius: 30, // Large enemy
        sprite: { active: true },
        isDying: false,
        takeDamage: jest.fn()
      };
      
      const mockProjectile = {
        x: 125, // 25 units away
        y: 100,
        damage: 25,
        sprite: { active: true },
        update: jest.fn().mockReturnValue(false)
      };
      
      weaponSystem['activeProjectiles'].add(mockProjectile as any);
      
      // Distance is 25, but collision checks distance < 15
      // Should hit (enemy radius 30) but won't!
      weaponSystem.update(16, 1000, { getPosition: () => new Vector2(0, 0) } as any, [mockEnemy] as any);
      
      expect(mockEnemy.takeDamage).not.toHaveBeenCalled(); // BUG: Missed collision!
    });
  });

  describe('memory and performance bugs', () => {
    it('BUG: activeProjectiles Set never cleaned when projectiles expire off-screen', () => {
      // Add projectile that goes off-screen
      const offscreenProjectile = {
        x: 9999,
        y: 9999,
        sprite: { active: false }, // Inactive but not removed!
        update: jest.fn().mockReturnValue(false)
      };
      
      weaponSystem['activeProjectiles'].add(offscreenProjectile as any);
      
      // Update without the projectile hitting anything
      weaponSystem.update(16, 1000, { getPosition: () => new Vector2(0, 0) } as any, []);
      
      // Projectile should be removed but only if expired=true or !active
      // If update() doesn't return true, it stays forever!
      expect(weaponSystem['activeProjectiles'].has(offscreenProjectile as any)).toBe(false);
    });

    it('BUG: damage numbers never cleaned up if scene.time.delayedCall fails', () => {
      let destroyCalled = false;
      const mockText = {
        setOrigin: jest.fn(),
        setDepth: jest.fn(),
        destroy: jest.fn(() => { destroyCalled = true; })
      };
      
      mockScene.add.text = jest.fn().mockReturnValue(mockText);
      mockScene.time.delayedCall = jest.fn(); // But doesn't call the callback!
      
      // Create damage number
      weaponSystem['createDamageNumber'](100, 100, 25);
      
      // Text created but never destroyed - memory leak!
      expect(destroyCalled).toBe(false);
      
      // Over time, thousands of text objects accumulate
    });
  });

  describe('weapon behavior bugs', () => {
    it('BUG: weapon can fire at negative fire rate', () => {
      const mockWeapon = {
        canFire: jest.fn().mockImplementation((time) => {
          // What if fireRate is 0 or negative?
          const fireInterval = 1000 / 0; // Infinity!
          return true; // Always can fire
        }),
        updateFireTime: jest.fn(),
        getDamage: jest.fn().mockReturnValue(25),
        behavior: { fire: jest.fn().mockReturnValue([]) },
        range: 200
      };
      
      weaponSystem['weapons'] = [mockWeapon as any];
      
      // Weapon fires every frame!
      for (let i = 0; i < 60; i++) {
        weaponSystem.update(16, i * 16, { getPosition: () => new Vector2(0, 0) } as any, []);
      }
      
      expect(mockWeapon.behavior.fire).toHaveBeenCalledTimes(60); // Fires 60 times/second!
    });
  });

  describe('race conditions', () => {
    it('BUG: enemy can die between collision check and damage application', () => {
      const mockEnemy = {
        x: 100,
        y: 100,
        sprite: { 
          active: true,
          clear: jest.fn(),
          fillStyle: jest.fn()
        },
        isDying: false,
        takeDamage: jest.fn().mockImplementation(function() {
          // Enemy dies during damage application
          this.isDying = true;
          return true;
        }),
        enemyType: { color: 0xff0000 },
        drawEnemy: jest.fn()
      };
      
      const mockProjectile = {
        x: 100,
        y: 100,
        damage: 25,
        sprite: { active: true },
        update: jest.fn().mockReturnValue(false)
      };
      
      weaponSystem['activeProjectiles'].add(mockProjectile as any);
      weaponSystem.onEnemyDeath = jest.fn();
      
      // Enemy checked as !isDying in loop, but dies during collision handling
      weaponSystem.update(16, 1000, { getPosition: () => new Vector2(0, 0) } as any, [mockEnemy] as any);
      
      // Death callback might be called multiple times or not at all
      expect(weaponSystem.onEnemyDeath).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('BUG: NaN damage breaks everything', () => {
      const mockEnemy = {
        x: 100,
        y: 100,
        sprite: { active: true },
        isDying: false,
        takeDamage: jest.fn(),
        health: 100
      };
      
      const mockProjectile = {
        x: 100,
        y: 100,
        damage: NaN, // Bad damage value!
        sprite: { active: true },
        update: jest.fn().mockReturnValue(false)
      };
      
      weaponSystem['activeProjectiles'].add(mockProjectile as any);
      
      weaponSystem.update(16, 1000, { getPosition: () => new Vector2(0, 0) } as any, [mockEnemy] as any);
      
      // Enemy takes NaN damage - health becomes NaN
      expect(mockEnemy.takeDamage).toHaveBeenCalledWith(NaN);
      
      // This propagates through the entire game!
    });
  });
});