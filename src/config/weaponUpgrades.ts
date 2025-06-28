import { WeaponType } from '../weapons/WeaponFactory';

export interface WeaponUpgradeDefinition {
  id: string;
  weaponType: WeaponType;
  name: string;
  description: string;
  icon: string;
  category: 'weapon';
  maxLevel: number;
  isWeaponUnlock: boolean;
}

// KICK-BASED WEAPON UNLOCKS ONLY - This is a physics brawler!
export const WEAPON_UPGRADES: Record<string, WeaponUpgradeDefinition> = {
  // No weapon unlocks - all kick techniques are unlocked via regular upgrades
  // See src/config/upgrades.ts for kick technique unlocks:
  // - uppercutVariation
  // - spinningKickVariation  
  // - groundPoundVariation
};

// Helper to check if player has weapon
export function hasWeapon(weaponId: string): boolean {
  const unlockedWeapons = (window as any).unlockedWeapons || new Set();
  return unlockedWeapons.has(weaponId);
}

// Helper to unlock weapon
export function unlockWeapon(weaponId: string): void {
  if (!(window as any).unlockedWeapons) {
    (window as any).unlockedWeapons = new Set();
  }
  (window as any).unlockedWeapons.add(weaponId);
}