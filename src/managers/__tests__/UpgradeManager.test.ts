import { UpgradeManager } from '../UpgradeManager';
import { UPGRADES, UpgradeDefinition } from '../../config/upgrades';
import { WEAPON_UPGRADES, hasWeapon, unlockWeapon } from '../../config/weaponUpgrades';

// Mock dependencies
jest.mock('../../config/upgrades', () => ({
  UPGRADES: {
    damage: {
      id: 'damage',
      name: 'Damage Up',
      maxLevel: 10,
      category: 'weapon',
      effect: jest.fn(),
      getValue: jest.fn(level => 1 + level * 0.15)
    },
    fireRate: {
      id: 'fireRate',
      name: 'Fire Rate',
      maxLevel: 5,
      category: 'weapon',
      effect: jest.fn(),
      getValue: jest.fn(level => 1 + level * 0.15)
    },
    health: {
      id: 'health',
      name: 'Max Health',
      maxLevel: 10,
      category: 'player',
      effect: jest.fn(),
      getValue: jest.fn(level => 100 + level * 20)
    },
    moveSpeed: {
      id: 'moveSpeed',
      name: 'Move Speed',
      maxLevel: 5,
      category: 'player',
      effect: jest.fn(),
      getValue: jest.fn(level => 1 + level * 0.1)
    }
  }
}));

jest.mock('../../config/weaponUpgrades', () => ({
  WEAPON_UPGRADES: {
    whip: { id: 'whip', name: 'Whip', type: 'weapon' },
    axe: { id: 'axe', name: 'Axe', type: 'weapon' },
    garlic: { id: 'garlic', name: 'Garlic', type: 'weapon' }
  },
  hasWeapon: jest.fn(),
  unlockWeapon: jest.fn()
}));

describe('UpgradeManager', () => {
  let upgradeManager: UpgradeManager;

  beforeEach(() => {
    // Clear singleton instance
    (UpgradeManager as any).instance = undefined;
    
    // Reset all mocks
    jest.clearAllMocks();
    (hasWeapon as jest.Mock).mockReturnValue(false);
    
    // Get instance
    upgradeManager = UpgradeManager.getInstance();
  });

  describe('singleton pattern', () => {
    it('should return same instance on multiple calls', () => {
      const instance1 = UpgradeManager.getInstance();
      const instance2 = UpgradeManager.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should maintain state across getInstance calls', () => {
      const instance1 = UpgradeManager.getInstance();
      instance1.applyUpgrade('damage');
      
      const instance2 = UpgradeManager.getInstance();
      expect(instance2.getUpgradeLevel('damage')).toBe(1);
    });
  });

  describe('initialization', () => {
    it('should initialize all upgrades at level 0', () => {
      Object.keys(UPGRADES).forEach(id => {
        expect(upgradeManager.getUpgradeLevel(id)).toBe(0);
      });
    });
  });

  describe('getUpgradeLevel', () => {
    it('should return correct upgrade level', () => {
      upgradeManager.applyUpgrade('damage');
      upgradeManager.applyUpgrade('damage');
      
      expect(upgradeManager.getUpgradeLevel('damage')).toBe(2);
    });

    it('should return 0 for non-existent upgrades', () => {
      expect(upgradeManager.getUpgradeLevel('nonexistent')).toBe(0);
    });
  });

  describe('canUpgrade', () => {
    it('should allow upgrades below max level', () => {
      expect(upgradeManager.canUpgrade('damage')).toBe(true);
    });

    it('should prevent upgrades at max level', () => {
      // Apply upgrades to reach max level (10)
      for (let i = 0; i < 10; i++) {
        upgradeManager.applyUpgrade('damage');
      }
      
      expect(upgradeManager.canUpgrade('damage')).toBe(false);
    });

    it('should return false for non-existent upgrades', () => {
      expect(upgradeManager.canUpgrade('nonexistent')).toBe(false);
    });
  });

  describe('applyUpgrade', () => {
    it('should increase upgrade level and call effect', () => {
      const result = upgradeManager.applyUpgrade('damage');
      
      expect(result).toBe(true);
      expect(upgradeManager.getUpgradeLevel('damage')).toBe(1);
      expect(UPGRADES.damage.effect).toHaveBeenCalledWith(1);
    });

    it('should not apply upgrade at max level', () => {
      // Max out fireRate (max level 5)
      for (let i = 0; i < 5; i++) {
        upgradeManager.applyUpgrade('fireRate');
      }
      
      const result = upgradeManager.applyUpgrade('fireRate');
      
      expect(result).toBe(false);
      expect(upgradeManager.getUpgradeLevel('fireRate')).toBe(5);
    });

    it('should handle multiple different upgrades', () => {
      upgradeManager.applyUpgrade('damage');
      upgradeManager.applyUpgrade('health');
      upgradeManager.applyUpgrade('damage');
      
      expect(upgradeManager.getUpgradeLevel('damage')).toBe(2);
      expect(upgradeManager.getUpgradeLevel('health')).toBe(1);
      expect(upgradeManager.getUpgradeLevel('fireRate')).toBe(0);
    });
  });

  describe('getRandomUpgrades', () => {
    it('should return requested number of upgrades', () => {
      const upgrades = upgradeManager.getRandomUpgrades(3);
      expect(upgrades).toHaveLength(3);
    });

    it('should guarantee at least 2 weapon upgrades when available', () => {
      const upgrades = upgradeManager.getRandomUpgrades(3);
      
      const weaponUpgrades = upgrades.filter(u => 
        u.category === 'weapon' || (u as any).type === 'weapon'
      );
      
      expect(weaponUpgrades.length).toBeGreaterThanOrEqual(2);
    });

    it('should not return maxed out upgrades', () => {
      // Max out damage upgrade
      for (let i = 0; i < 10; i++) {
        upgradeManager.applyUpgrade('damage');
      }
      
      const upgrades = upgradeManager.getRandomUpgrades(3);
      
      const damageUpgrade = upgrades.find(u => u.id === 'damage');
      expect(damageUpgrade).toBeUndefined();
    });

    it('should include weapon unlocks when weapons not owned', () => {
      (hasWeapon as jest.Mock).mockImplementation((id) => id === 'whip');
      
      const upgrades = upgradeManager.getRandomUpgrades(4);
      
      const weaponUnlocks = upgrades.filter(u => 
        ['axe', 'garlic'].includes(u.id)
      );
      
      expect(weaponUnlocks.length).toBeGreaterThan(0);
    });

    it('should handle case when fewer upgrades available than requested', () => {
      // Max out all upgrades except one
      for (let i = 0; i < 10; i++) {
        upgradeManager.applyUpgrade('damage');
        upgradeManager.applyUpgrade('health');
      }
      for (let i = 0; i < 5; i++) {
        upgradeManager.applyUpgrade('fireRate');
      }
      
      // Mark all weapons as owned
      (hasWeapon as jest.Mock).mockReturnValue(true);
      
      const upgrades = upgradeManager.getRandomUpgrades(3);
      
      // Should only get moveSpeed upgrade
      expect(upgrades.length).toBeLessThanOrEqual(1);
      expect(upgrades[0]?.id).toBe('moveSpeed');
    });

    it('should not return duplicate upgrades', () => {
      const upgrades = upgradeManager.getRandomUpgrades(4);
      
      const ids = upgrades.map(u => u.id);
      const uniqueIds = new Set(ids);
      
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('getUpgradeStats', () => {
    it('should return current upgrade levels', () => {
      upgradeManager.applyUpgrade('damage');
      upgradeManager.applyUpgrade('damage');
      upgradeManager.applyUpgrade('health');
      
      const stats = upgradeManager.getUpgradeStats();
      
      expect(stats.get('damage')).toBe(2);
      expect(stats.get('health')).toBe(1);
      expect(stats.get('fireRate')).toBe(0);
    });

    it('should return a copy not reference', () => {
      const stats1 = upgradeManager.getUpgradeStats();
      stats1.set('damage', 99);
      
      const stats2 = upgradeManager.getUpgradeStats();
      expect(stats2.get('damage')).toBe(0);
    });
  });

  describe('reset', () => {
    it('should reset all upgrades to level 0', () => {
      // Apply some upgrades
      upgradeManager.applyUpgrade('damage');
      upgradeManager.applyUpgrade('health');
      upgradeManager.applyUpgrade('fireRate');
      
      // Reset
      upgradeManager.reset();
      
      // Check all are back to 0
      Object.keys(UPGRADES).forEach(id => {
        expect(upgradeManager.getUpgradeLevel(id)).toBe(0);
      });
    });
  });

  describe('integration with weapon system', () => {
    it('should work with global window.upgradeManager', () => {
      // Set global reference (as used by Weapon class)
      (window as any).upgradeManager = upgradeManager;
      
      upgradeManager.applyUpgrade('damage');
      upgradeManager.applyUpgrade('fireRate');
      
      expect((window as any).upgradeManager.getUpgradeLevel('damage')).toBe(1);
      expect((window as any).upgradeManager.getUpgradeLevel('fireRate')).toBe(1);
    });
  });
});