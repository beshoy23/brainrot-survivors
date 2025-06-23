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

// VS-style weapon unlocks
export const WEAPON_UPGRADES: Record<string, WeaponUpgradeDefinition> = {
  axe: {
    id: 'axe',
    weaponType: WeaponType.AXE,
    name: 'Axe',
    description: 'Throws powerful axes in a rotating pattern. High damage, moderate speed.',
    icon: '🪓',
    category: 'weapon',
    maxLevel: 1,
    isWeaponUnlock: true
  },
  
  garlic: {
    id: 'garlic',
    weaponType: WeaponType.GARLIC,
    name: 'Garlic',
    description: 'Damages all nearby enemies constantly. Perfect for close combat.',
    icon: '🧄',
    category: 'weapon',
    maxLevel: 1,
    isWeaponUnlock: true
  },
  
  whip: {
    id: 'whip',
    weaponType: WeaponType.WHIP,
    name: 'Whip',
    description: 'Strikes horizontally left and right. Good area coverage.',
    icon: '⚡',
    category: 'weapon',
    maxLevel: 1,
    isWeaponUnlock: true
  }
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