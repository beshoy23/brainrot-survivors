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
    // Get all available upgrades
    const available = Object.values(UPGRADES).filter(upgrade => 
      this.canUpgrade(upgrade.id)
    );
    
    // Get available weapon unlocks
    const weaponUnlocks = Object.values(WEAPON_UPGRADES).filter(weapon =>
      !hasWeapon(weapon.id)
    );
    
    // Combine all options
    const allOptions = [...available, ...weaponUnlocks];
    
    // Shuffle and take the requested count
    const shuffled = [...allOptions].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
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