import { UPGRADES, UpgradeDefinition } from '../config/upgrades';
import { WEAPON_UPGRADES, WeaponUpgradeDefinition, hasWeapon, unlockWeapon } from '../config/weaponUpgrades';

export class UpgradeManager {
  private upgradeLevels: Map<string, number> = new Map();
  private static instance: UpgradeManager;

  private constructor() {
    // Initialize all upgrades at level 0
    Object.keys(UPGRADES).forEach(id => {
      this.upgradeLevels.set(id, 0);
    });
  }

  static getInstance(): UpgradeManager {
    if (!UpgradeManager.instance) {
      UpgradeManager.instance = new UpgradeManager();
      // Only freeze in production to allow test cleanup
      if (process.env.NODE_ENV !== 'test') {
        Object.defineProperty(UpgradeManager, 'instance', {
          writable: false,
          configurable: false
        });
      }
    }
    return UpgradeManager.instance;
  }

  getUpgradeLevel(id: string): number {
    return this.upgradeLevels.get(id) || 0;
  }

  canUpgrade(id: string): boolean {
    const upgrade = UPGRADES[id];
    if (!upgrade) return false;
    
    const currentLevel = this.getUpgradeLevel(id);
    return currentLevel < upgrade.maxLevel;
  }

  applyUpgrade(id: string): boolean {
    if (!this.canUpgrade(id)) return false;
    
    const currentLevel = this.getUpgradeLevel(id);
    const newLevel = currentLevel + 1;
    
    // Validate level is reasonable
    if (newLevel < 0 || newLevel > 100) {
      console.error('Invalid upgrade level:', newLevel);
      return false;
    }
    
    this.upgradeLevels.set(id, newLevel);
    
    // Apply the upgrade effect with error handling
    const upgrade = UPGRADES[id];
    try {
      upgrade.effect(newLevel);
    } catch (error) {
      console.error(`Failed to apply upgrade effect for ${id}:`, error);
      // Rollback the level change
      this.upgradeLevels.set(id, currentLevel);
      return false;
    }
    
    return true;
  }

  getRandomUpgrades(count: number): (UpgradeDefinition | WeaponUpgradeDefinition)[] {
    // Get all available regular upgrades
    const availableRegular = Object.values(UPGRADES).filter(upgrade => 
      this.canUpgrade(upgrade.id)
    );
    
    // Get available weapon unlocks
    const weaponUnlocks = Object.values(WEAPON_UPGRADES).filter(weapon =>
      !hasWeapon(weapon.id)
    );
    
    // Categorize regular upgrades
    const weaponCategoryUpgrades = availableRegular.filter(upgrade => 
      upgrade.category === 'weapon'
    );
    const nonWeaponUpgrades = availableRegular.filter(upgrade => 
      upgrade.category !== 'weapon'
    );
    
    // Combine all weapon-related upgrades (weapon category + weapon unlocks)
    const allWeaponUpgrades = [...weaponCategoryUpgrades, ...weaponUnlocks];
    
    // Guarantee at least 2 weapon upgrades (if available)
    const selectedUpgrades: (UpgradeDefinition | WeaponUpgradeDefinition)[] = [];
    const minWeaponUpgrades = Math.min(2, allWeaponUpgrades.length);
    
    // Select guaranteed weapon upgrades
    if (minWeaponUpgrades > 0) {
      const shuffledWeaponUpgrades = this.fisherYatesShuffle([...allWeaponUpgrades]);
      selectedUpgrades.push(...shuffledWeaponUpgrades.slice(0, minWeaponUpgrades));
    }
    
    // Fill remaining slots with any available upgrades
    const remainingSlots = count - selectedUpgrades.length;
    if (remainingSlots > 0) {
      // Get all remaining options (excluding already selected)
      const usedIds = new Set(selectedUpgrades.map(u => u.id));
      const remainingOptions = [...allWeaponUpgrades, ...nonWeaponUpgrades]
        .filter(upgrade => !usedIds.has(upgrade.id));
      
      // Shuffle and take remaining slots
      const shuffledRemaining = this.fisherYatesShuffle([...remainingOptions]);
      selectedUpgrades.push(...shuffledRemaining.slice(0, remainingSlots));
    }
    
    // Use Fisher-Yates shuffle for unbiased randomization
    return this.fisherYatesShuffle(selectedUpgrades);
  }

  getUpgradeStats(): Map<string, number> {
    // Return a copy to prevent external modification
    return new Map(this.upgradeLevels);
  }

  reset(): void {
    this.upgradeLevels.clear();
    Object.keys(UPGRADES).forEach(id => {
      this.upgradeLevels.set(id, 0);
    });
  }

  private fisherYatesShuffle<T>(array: T[]): T[] {
    const shuffled = [...array]; // Create a copy
    
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    return shuffled;
  }
}