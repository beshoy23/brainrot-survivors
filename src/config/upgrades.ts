export interface UpgradeDefinition {
  id: string;
  name: string;
  description: string;
  maxLevel: number;
  effect: (level: number) => any;
  getValue: (level: number) => number;
  category: 'weapon' | 'player' | 'passive';
}

export const UPGRADES: Record<string, UpgradeDefinition> = {
  // Weapon Upgrades
  damage: {
    id: 'damage',
    name: 'Damage Up',
    description: '+15% weapon damage',
    maxLevel: 10,
    effect: (level) => ({ damageMultiplier: 1 + (level * 0.15) }),
    getValue: (level) => 1 + (level * 0.15),
    category: 'weapon'
  },
  fireRate: {
    id: 'fireRate', 
    name: 'Fire Rate',
    description: '+15% attack speed',
    maxLevel: 5,
    effect: (level) => ({ fireRateMultiplier: 1 + (level * 0.15) }),
    getValue: (level) => 1 + (level * 0.15),
    category: 'weapon'
  },
  projectileCount: {
    id: 'projectileCount',
    name: 'Multi Shot',
    description: '+1 projectile',
    maxLevel: 3,
    effect: (level) => ({ additionalProjectiles: level }),
    getValue: (level) => level,
    category: 'weapon'
  },
  
  // Player Upgrades
  moveSpeed: {
    id: 'moveSpeed',
    name: 'Speed Boost',
    description: '+10% movement speed',
    maxLevel: 5,
    effect: (level) => ({ speedMultiplier: 1 + (level * 0.1) }),
    getValue: (level) => 1 + (level * 0.1),
    category: 'player'
  },
  maxHealth: {
    id: 'maxHealth',
    name: 'Health Up',
    description: '+25 max health',
    maxLevel: 10,
    effect: (level) => ({ additionalHealth: level * 25 }),
    getValue: (level) => level * 25,
    category: 'player'
  },
  healthRegen: {
    id: 'healthRegen',
    name: 'Regeneration',
    description: '+1 HP per 3 seconds',
    maxLevel: 5,
    effect: (level) => ({ regenPerSecond: level / 3 }),
    getValue: (level) => level / 3,
    category: 'player'
  },
  
  // Passive Upgrades
  xpMagnet: {
    id: 'xpMagnet',
    name: 'XP Magnet',
    description: '+30% pickup range',
    maxLevel: 5,
    effect: (level) => ({ magnetRangeMultiplier: 1 + (level * 0.3) }),
    getValue: (level) => 1 + (level * 0.3),
    category: 'passive'
  },
  xpBonus: {
    id: 'xpBonus',
    name: 'XP Bonus',
    description: '+20% XP gain',
    maxLevel: 5,
    effect: (level) => ({ xpMultiplier: 1 + (level * 0.2) }),
    getValue: (level) => 1 + (level * 0.2),
    category: 'passive'
  },
  armor: {
    id: 'armor',
    name: 'Armor',
    description: '-2 flat damage reduction',
    maxLevel: 5,
    effect: (level) => ({ flatDamageReduction: level * 2 }),
    getValue: (level) => level * 2,
    category: 'passive'
  }
};

// Helper function to get upgrade multipliers
export function getUpgradeValue(upgradeId: string): number {
  const manager = (window as any).upgradeManager;
  if (!manager) return 1;
  
  const level = manager.getUpgradeLevel(upgradeId);
  if (level === 0) return 1;
  
  const upgrade = UPGRADES[upgradeId];
  return upgrade ? upgrade.getValue(level) : 1;
}