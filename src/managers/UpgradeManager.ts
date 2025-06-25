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
    this.upgradeLevels.set(id, currentLevel + 1);
    
    // Apply the upgrade effect
    const upgrade = UPGRADES[id];
    upgrade.effect(currentLevel + 1);
    
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
      const shuffledWeaponUpgrades = [...allWeaponUpgrades].sort(() => Math.random() - 0.5);
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
      const shuffledRemaining = [...remainingOptions].sort(() => Math.random() - 0.5);
      selectedUpgrades.push(...shuffledRemaining.slice(0, remainingSlots));
    }
    
    // Final shuffle to randomize order while maintaining weapon guarantee
    return selectedUpgrades.sort(() => Math.random() - 0.5);
  }

  getUpgradeStats(): Map<string, number> {
    return new Map(this.upgradeLevels);
  }

  reset(): void {
    this.upgradeLevels.clear();
    Object.keys(UPGRADES).forEach(id => {
      this.upgradeLevels.set(id, 0);
    });
  }
}