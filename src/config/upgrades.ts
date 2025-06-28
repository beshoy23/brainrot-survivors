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
  // === CORE KICK MECHANICS === //
  kickForce: {
    id: 'kickForce',
    name: 'Kick Force',
    description: '+25% knockback power',
    maxLevel: 8,
    effect: (level) => ({ forceMultiplier: 1 + (level * 0.25) }),
    getValue: (level) => 1 + (level * 0.25),
    category: 'weapon'
  },
  kickSpeed: {
    id: 'kickSpeed', 
    name: 'Kick Speed',
    description: '+20% kick attack speed',
    maxLevel: 6,
    effect: (level) => ({ fireRateMultiplier: 1 + (level * 0.20) }),
    getValue: (level) => 1 + (level * 0.20),
    category: 'weapon'
  },
  kickRange: {
    id: 'kickRange',
    name: 'Kick Range',
    description: '+15% kick reach',
    maxLevel: 4,
    effect: (level) => ({ rangeMultiplier: 1 + (level * 0.15) }),
    getValue: (level) => 1 + (level * 0.15),
    category: 'weapon'
  },
  chainPower: {
    id: 'chainPower',
    name: 'Chain Reactions',
    description: '+30% chain knockback force',
    maxLevel: 5,
    effect: (level) => ({ chainForceMultiplier: 1 + (level * 0.30) }),
    getValue: (level) => 1 + (level * 0.30),
    category: 'weapon'
  },
  multiKick: {
    id: 'multiKick',
    name: 'Multi-Kick',
    description: 'Hit +1 enemy per kick',
    maxLevel: 3,
    effect: (level) => ({ additionalTargets: level }),
    getValue: (level) => level,
    category: 'weapon'
  },
  
  // === KICK TECHNIQUE UNLOCKS === //
  uppercutVariation: {
    id: 'uppercutVariation',
    name: 'Uppercut Technique',
    description: 'Unlock uppercut: high-arc single-target attack',
    maxLevel: 1,
    effect: (level) => ({ unlockUppercut: level > 0 }),
    getValue: (level) => level,
    category: 'weapon'
  },
  spinningKickVariation: {
    id: 'spinningKickVariation',
    name: 'Spinning Kick',
    description: 'Unlock spinning kick: 360° area attack',
    maxLevel: 1,
    effect: (level) => ({ unlockSpinningKick: level > 0 }),
    getValue: (level) => level,
    category: 'weapon'
  },
  groundPoundVariation: {
    id: 'groundPoundVariation',
    name: 'Ground Pound',
    description: 'Unlock ground pound: shockwave area attack',
    maxLevel: 1,
    effect: (level) => ({ unlockGroundPound: level > 0 }),
    getValue: (level) => level,
    category: 'weapon'
  },
  
  // === PLAYER SURVIVAL === //
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
    description: '+15% max health',
    maxLevel: 8,
    effect: (level) => ({ healthMultiplier: 1 + (level * 0.15) }),
    getValue: (level) => 1 + (level * 0.15),
    category: 'player'
  },
  healthRegen: {
    id: 'healthRegen',
    name: 'Regeneration',
    description: '+1 HP per second + heal 10 HP',
    maxLevel: 5,
    effect: (level) => ({ regenPerSecond: level * 1.0, instantHeal: 10 }),
    getValue: (level) => level * 1.0,
    category: 'player'
  },
  
  // === PHYSICS MODIFICATIONS === //
  bouncyEnemies: {
    id: 'bouncyEnemies',
    name: 'Bouncy Physics',
    description: 'Enemies bounce +2 more times',
    maxLevel: 4,
    effect: (level) => ({ additionalBounces: level * 2 }),
    getValue: (level) => level * 2,
    category: 'passive'
  },
  stickyEnemies: {
    id: 'stickyEnemies',
    name: 'Sticky Combos',
    description: 'Kicked enemies stick together (bigger projectiles)',
    maxLevel: 3,
    effect: (level) => ({ stickyRadius: level * 15, stickyChance: level * 0.3 }),
    getValue: (level) => level * 0.3,
    category: 'passive'
  },
  explosiveChains: {
    id: 'explosiveChains',
    name: 'Chain Explosions',
    description: 'Enemies explode after 3+ bounces',
    maxLevel: 2,
    effect: (level) => ({ explosionThreshold: 4 - level, explosionDamage: level * 10 }),
    getValue: (level) => level,
    category: 'passive'
  },
  magneticKicks: {
    id: 'magneticKicks',
    name: 'Magnetic Pull',
    description: 'Pull nearby enemies before kicking',
    maxLevel: 4,
    effect: (level) => ({ magnetRadius: level * 20, magnetForce: level * 100 }),
    getValue: (level) => level * 20,
    category: 'passive'
  },
  
  // === ESSENTIAL SURVIVAL === //
  xpMagnet: {
    id: 'xpMagnet',
    name: 'XP Magnet',
    description: '+20% pickup range',
    maxLevel: 5,
    effect: (level) => ({ magnetRangeMultiplier: 1 + (level * 0.2) }),
    getValue: (level) => 1 + (level * 0.2),
    category: 'passive'
  },
  armor: {
    id: 'armor',
    name: 'Armor',
    description: '-15% damage taken (max 60%)',
    maxLevel: 4,
    effect: (level) => ({ damageReduction: Math.min(level * 0.15, 0.6) }),
    getValue: (level) => Math.min(level * 0.15, 0.6),
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