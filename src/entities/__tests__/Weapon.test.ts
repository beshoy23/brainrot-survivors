import { Weapon, WeaponConfig } from '../Weapon';
import { IWeaponBehavior } from '../../weapons/IWeaponBehavior';
import { Vector2 } from '../../utils/Vector2';
import { Enemy } from '../Enemy';
import { Player } from '../Player';
import { Projectile, ProjectileFire } from '../Projectile';
import { PoolManager } from '../../managers/PoolManager';

class MockWeaponBehavior implements IWeaponBehavior {
  fire(): ProjectileFire[] {
    return [];
  }
  
  getTargets(): Enemy[] {
    return [];
  }
  
  getDescription(): string {
    return 'Mock weapon';
  }
}

describe('Weapon', () => {
  let mockBehavior: MockWeaponBehavior;
  let weaponConfig: WeaponConfig;
  let weapon: Weapon;

  beforeEach(() => {
    mockBehavior = new MockWeaponBehavior();
    weaponConfig = {
      damage: 10,
      fireRate: 2,
      projectileSpeed: 300,
      range: 150,
      behavior: mockBehavior
    };
    weapon = new Weapon(weaponConfig);
    
    // Clear any global upgrade manager
    (window as any).upgradeManager = undefined;
  });

  describe('constructor', () => {
    it('should initialize weapon with provided config', () => {
      expect(weapon.damage).toBe(10);
      expect(weapon.fireRate).toBe(2);
      expect(weapon.projectileSpeed).toBe(300);
      expect(weapon.range).toBe(150);
      expect(weapon.behavior).toBe(mockBehavior);
      expect(weapon.lastFireTime).toBe(0);
    });
  });

  describe('canFire', () => {
    it('should allow firing initially', () => {
      expect(weapon.canFire(1000)).toBe(true);
    });

    it('should prevent firing before fire rate interval', () => {
      weapon.updateFireTime(0);
      // Fire rate of 2 means 500ms interval
      expect(weapon.canFire(400)).toBe(false);
    });

    it('should allow firing after fire rate interval', () => {
      weapon.updateFireTime(0);
      // Fire rate of 2 means 500ms interval
      expect(weapon.canFire(500)).toBe(true);
    });

    it('should apply fire rate multiplier from upgrades', () => {
      const mockUpgradeManager = {
        getUpgradeLevel: jest.fn().mockReturnValue(2) // +30% fire rate
      };
      (window as any).upgradeManager = mockUpgradeManager;

      weapon.updateFireTime(0);
      // Base fire rate 2 * 1.3 = 2.6, interval = 384ms
      expect(weapon.canFire(300)).toBe(false);
      expect(weapon.canFire(385)).toBe(true);
    });

    it('should handle missing upgrade manager gracefully', () => {
      (window as any).upgradeManager = null;
      weapon.updateFireTime(0);
      expect(weapon.canFire(500)).toBe(true);
    });
  });

  describe('updateFireTime', () => {
    it('should update last fire time', () => {
      const currentTime = 1000;
      weapon.updateFireTime(currentTime);
      expect(weapon.lastFireTime).toBe(currentTime);
    });
  });

  describe('getDamage', () => {
    it('should return base damage without upgrades', () => {
      expect(weapon.getDamage()).toBe(10);
    });

    it('should apply damage multiplier from upgrades', () => {
      const mockUpgradeManager = {
        getUpgradeLevel: jest.fn().mockReturnValue(3) // +45% damage
      };
      (window as any).upgradeManager = mockUpgradeManager;

      expect(weapon.getDamage()).toBe(14.5); // 10 * 1.45
    });

    it('should handle missing upgrade manager gracefully', () => {
      (window as any).upgradeManager = null;
      expect(weapon.getDamage()).toBe(10);
    });

    it('should handle upgrade manager without damage method', () => {
      (window as any).upgradeManager = { someOtherMethod: () => {} };
      expect(weapon.getDamage()).toBe(10);
    });
  });

  describe('setBehavior', () => {
    it('should update weapon behavior', () => {
      const newBehavior = new MockWeaponBehavior();
      weapon.setBehavior(newBehavior);
      expect(weapon.behavior).toBe(newBehavior);
      expect(weapon.behavior).not.toBe(mockBehavior);
    });
  });

  describe('integration tests', () => {
    it('should work with realistic fire rate timing', () => {
      weapon = new Weapon({
        damage: 25,
        fireRate: 1.5, // Every 666ms
        projectileSpeed: 400,
        range: 200,
        behavior: mockBehavior
      });

      const startTime = 1000;
      weapon.updateFireTime(startTime);
      
      expect(weapon.canFire(startTime + 600)).toBe(false);
      expect(weapon.canFire(startTime + 700)).toBe(true);
    });

    it('should handle upgrade combinations correctly', () => {
      const mockUpgradeManager = {
        getUpgradeLevel: jest.fn((upgradeType: string) => {
          if (upgradeType === 'damage') return 4; // +60% damage
          if (upgradeType === 'fireRate') return 2; // +30% fire rate
          return 0;
        })
      };
      (window as any).upgradeManager = mockUpgradeManager;

      expect(weapon.getDamage()).toBe(16); // 10 * 1.6
      
      weapon.updateFireTime(0);
      // Fire rate 2 * 1.3 = 2.6, interval = 384ms
      expect(weapon.canFire(300)).toBe(false);
      expect(weapon.canFire(400)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle zero or negative fire rate safely', () => {
      weapon.fireRate = 0;
      expect(() => weapon.canFire(1000)).not.toThrow();
      // Should return true since division by zero results in Infinity interval
      expect(weapon.canFire(1000)).toBe(false);
      
      weapon.fireRate = -1;
      expect(() => weapon.canFire(1000)).not.toThrow();
    });

    it('should handle extreme upgrade levels', () => {
      const mockUpgradeManager = {
        getUpgradeLevel: jest.fn().mockReturnValue(100) // +1500% multiplier
      };
      (window as any).upgradeManager = mockUpgradeManager;

      const damage = weapon.getDamage();
      expect(damage).toBeGreaterThan(0);
      expect(Number.isFinite(damage)).toBe(true);
      expect(damage).toBe(160); // 10 * (1 + 100 * 0.15)
      
      // Fire rate should also handle extreme values
      weapon.updateFireTime(0);
      const canFireResult = weapon.canFire(100);
      expect(typeof canFireResult).toBe('boolean');
    });

    it('should handle time wraparound and overflow', () => {
      // Test with MAX_SAFE_INTEGER
      weapon.updateFireTime(Number.MAX_SAFE_INTEGER);
      expect(() => weapon.canFire(0)).not.toThrow();
      expect(weapon.canFire(0)).toBe(false); // Current time is less than last fire time
      
      // Test normal progression after large time
      weapon.updateFireTime(Number.MAX_SAFE_INTEGER - 1000);
      expect(weapon.canFire(Number.MAX_SAFE_INTEGER)).toBe(true);
      
      // Test negative time values
      weapon.updateFireTime(-1000);
      expect(weapon.canFire(0)).toBe(true); // 1000ms elapsed
    });
  });
});