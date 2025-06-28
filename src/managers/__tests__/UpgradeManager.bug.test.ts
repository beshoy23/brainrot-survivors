import { UpgradeManager } from '../UpgradeManager';
import { UPGRADES } from '../../config/upgrades';
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
      effect: jest.fn()
    }
  }
}));

jest.mock('../../config/weaponUpgrades', () => ({
  WEAPON_UPGRADES: {
    // No weapon unlocks - all kick techniques are unlocked via regular upgrades
  },
  hasWeapon: jest.fn(),
  unlockWeapon: jest.fn()
}));

describe('UpgradeManager - Potential Bugs', () => {
  let upgradeManager: UpgradeManager;

  beforeEach(() => {
    // Clear singleton
    (UpgradeManager as any).instance = undefined;
    jest.clearAllMocks();
    upgradeManager = UpgradeManager.getInstance();
  });

  describe('singleton bugs', () => {
    it('BUG: singleton can be corrupted by prototype manipulation', () => {
      const instance1 = UpgradeManager.getInstance();
      
      // Malicious code could do this:
      (UpgradeManager as any).instance = null;
      
      const instance2 = UpgradeManager.getInstance();
      
      // Different instances! State lost!
      expect(instance1).not.toBe(instance2);
      
      // Player loses all upgrades mid-game!
    });

    it('BUG: race condition in getInstance() with concurrent calls', () => {
      (UpgradeManager as any).instance = undefined;
      
      const instances: UpgradeManager[] = [];
      const promises: Promise<void>[] = [];
      
      // Simulate concurrent calls
      for (let i = 0; i < 10; i++) {
        promises.push(new Promise(resolve => {
          setTimeout(() => {
            instances.push(UpgradeManager.getInstance());
            resolve();
          }, 0);
        }));
      }
      
      // In theory all should be same instance
      // But constructor isn't atomic!
    });
  });

  describe('upgrade level bugs', () => {
    it('BUG: negative upgrade levels break damage calculations', () => {
      // Force negative level
      upgradeManager['upgradeLevels'].set('damage', -5);
      
      const level = upgradeManager.getUpgradeLevel('damage');
      expect(level).toBe(-5);
      
      // Damage calculation: 1 + (-5 * 0.15) = 0.25
      // 75% damage reduction! Player does almost no damage
    });

    it('BUG: upgrade levels can exceed maxLevel through direct manipulation', () => {
      // Apply upgrades normally to max
      for (let i = 0; i < 10; i++) {
        upgradeManager.applyUpgrade('damage');
      }
      
      // Should be at max (10)
      expect(upgradeManager.canUpgrade('damage')).toBe(false);
      
      // But direct manipulation bypasses checks
      upgradeManager['upgradeLevels'].set('damage', 999);
      
      expect(upgradeManager.getUpgradeLevel('damage')).toBe(999);
      // Damage multiplier: 1 + (999 * 0.15) = 150.85x damage!
    });
  });

  describe('random upgrade bugs', () => {
    it('BUG: getRandomUpgrades can return fewer than requested', () => {
      // Max out all upgrades
      Object.keys(UPGRADES).forEach(id => {
        const upgrade = UPGRADES[id];
        for (let i = 0; i < upgrade.maxLevel; i++) {
          upgradeManager.applyUpgrade(id);
        }
      });
      
      // Mark all weapons as owned
      (hasWeapon as jest.Mock).mockReturnValue(true);
      
      // Request 3 upgrades but none available
      const upgrades = upgradeManager.getRandomUpgrades(3);
      
      expect(upgrades.length).toBe(0); // Player gets no choices!
    });

    it('BUG: Math.random() bias in shuffle algorithm', () => {
      // The shuffle uses array.sort(() => Math.random() - 0.5)
      // This is NOT a uniform distribution!
      
      const counts: Record<string, number> = {};
      
      // Run many times to see bias
      for (let i = 0; i < 1000; i++) {
        const upgrades = upgradeManager.getRandomUpgrades(2);
        upgrades.forEach(u => {
          counts[u.id] = (counts[u.id] || 0) + 1;
        });
      }
      
      // Some upgrades appear way more often than others
      console.log('Upgrade distribution:', counts);
      
      // This creates unfair gameplay!
    });
  });

  describe('state corruption bugs', () => {
    it('BUG: getUpgradeStats returns mutable Map reference', () => {
      upgradeManager.applyUpgrade('damage');
      
      const stats = upgradeManager.getUpgradeStats();
      
      // External code tries to modify the internal state
      stats.set('damage', 999);
      
      // Fixed: internal state protected by defensive copy
      expect(upgradeManager.getUpgradeLevel('damage')).toBe(1);
    });

    it('BUG: reset() should reset all upgrade levels', () => {
      // Apply some kick upgrades
      upgradeManager.applyUpgrade('kickForce');
      upgradeManager.applyUpgrade('kickSpeed');
      
      expect(upgradeManager.getUpgradeLevel('kickForce')).toBe(1);
      expect(upgradeManager.getUpgradeLevel('kickSpeed')).toBe(1);
      
      // Reset upgrade manager
      upgradeManager.reset();
      
      // All upgrade levels should be reset to 0
      expect(upgradeManager.getUpgradeLevel('kickForce')).toBe(0);
      expect(upgradeManager.getUpgradeLevel('kickSpeed')).toBe(0);
    });
  });

  describe('effect application bugs', () => {
    it('BUG: upgrade effects can throw errors and break the game', () => {
      // Mock effect that throws
      UPGRADES.damage.effect = jest.fn().mockImplementation(() => {
        throw new Error('Effect failed!');
      });
      
      // Fixed: error handling prevents crashes
      expect(() => {
        upgradeManager.applyUpgrade('damage');
      }).not.toThrow();
      
      // Level should be rolled back
      expect(upgradeManager.getUpgradeLevel('damage')).toBe(0);
    });

    it('BUG: effects are called with wrong level during concurrent upgrades', () => {
      let capturedLevels: number[] = [];
      
      UPGRADES.damage.effect = jest.fn().mockImplementation((level) => {
        // Simulate async effect
        setTimeout(() => {
          capturedLevels.push(level);
        }, 0);
      });
      
      // Apply multiple upgrades quickly
      upgradeManager.applyUpgrade('damage'); // Should call with 1
      upgradeManager.applyUpgrade('damage'); // Should call with 2
      
      // Effects might see wrong levels due to timing
    });
  });

  describe('weapon upgrade bugs', () => {
    it('BUG: weapon guarantee logic can fail with specific RNG', () => {
      // Only one weapon upgrade available
      (hasWeapon as jest.Mock).mockReturnValue(true);
      // No weapon upgrades in kick-based system
      
      // Request 3 upgrades with "guarantee 2 weapons" logic
      const upgrades = upgradeManager.getRandomUpgrades(3);
      
      // Can't guarantee 2 weapons when only 1 available!
      const weaponCount = upgrades.filter(u => 
        u.category === 'weapon' || (u as any).type === 'weapon'
      ).length;
      
      expect(weaponCount).toBeLessThan(2); // Guarantee failed!
    });
  });
});