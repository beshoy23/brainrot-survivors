import { EnemyTypeConfig, EnemyTypeId, WeightClass } from '../enemies/EnemyType';

export const ENEMY_TYPES: Record<EnemyTypeId, EnemyTypeConfig> = {
  [EnemyTypeId.BASIC]: {
    id: EnemyTypeId.BASIC,
    name: 'Blonde Chicken',
    health: 4, // Increased from 3 for better balance
    speed: 120, // Slower for dodgeability
    damage: 2, // VS-style: meaningful damage per hit
    size: 18, // Smaller
    color: 0xffaa00, // Yellow/Blonde
    shape: 'square',
    spawnWeight: 10,
    minWaveTime: 0,
    // MEDIUM weight class - balanced physics
    weightClass: WeightClass.MEDIUM,
    kickMultiplier: 1.0, // Normal flight distance
    chainDamageMultiplier: 1.0 // Normal chain damage
  },
  
  [EnemyTypeId.FAST]: {
    id: EnemyTypeId.FAST,
    name: 'Red Chicken',
    health: 3, // Increased from 2 for better balance
    speed: 220, // Reduced from 280
    damage: 1, // VS-style: fast but weaker damage
    size: 14, // Smaller
    color: 0xcc0000, // Red - fast chicken
    shape: 'diamond',
    spawnWeight: 6,
    minWaveTime: 30, // Appears after 30 seconds
    // LIGHT weight class - flies far and fast
    weightClass: WeightClass.LIGHT,
    kickMultiplier: 1.5, // Flies 50% further
    chainDamageMultiplier: 0.8 // Less chain damage (lighter)
  },
  
  [EnemyTypeId.TANK]: {
    id: EnemyTypeId.TANK,
    name: 'Female Cow',
    health: 35, // Increased from 20 for meaningful tank fights
    speed: 60, // Slower
    damage: 5, // VS-style: dangerous contact damage
    size: 28, // Smaller
    color: 0x8b4513, // Brown cow
    shape: 'square',
    spawnWeight: 3,
    minWaveTime: 60, // Appears after 1 minute
    // HEAVY weight class - hard to kick but devastating chains
    weightClass: WeightClass.HEAVY,
    kickMultiplier: 0.6, // Flies less distance (heavy)
    chainDamageMultiplier: 2.0 // Double chain damage (devastating impact)
  },
  
  [EnemyTypeId.SWARM]: {
    id: EnemyTypeId.SWARM,
    name: 'Baby Chicken',
    health: 2, // Increased from 1 for better balance
    speed: 140, // Reduced speed
    damage: 1, // VS-style: meaningful swarm damage
    size: 12, // Small but visible
    color: 0xffff00, // Bright yellow baby chicken
    shape: 'circle',
    spawnWeight: 8,
    minWaveTime: 45, // Appears after 45 seconds
    spawnGroupSize: 5, // Groups of 5
    // LIGHT weight class - perfect for chain reactions
    weightClass: WeightClass.LIGHT,
    kickMultiplier: 1.8, // Flies very far (tiny and light)
    chainDamageMultiplier: 0.5 // Minimal chain damage
  },
  
  [EnemyTypeId.ELITE]: {
    id: EnemyTypeId.ELITE,
    name: 'Male Cow Boss',
    health: 120, // Doubled from 60 for real boss fights
    speed: 100, // Slower
    damage: 8, // VS-style: boss-level threat
    size: 40, // Smaller
    color: 0x654321, // Dark brown bull
    shape: 'diamond',
    spawnWeight: 0, // Special spawn logic
    minWaveTime: 120, // Appears after 2 minutes
    // EXPLOSIVE weight class - devastating area damage when kicked!
    weightClass: WeightClass.EXPLOSIVE,
    kickMultiplier: 0.8, // Moderate flight distance
    chainDamageMultiplier: 3.0, // Massive chain damage
    explosiveRadius: 60, // Large explosion radius
    explosiveDamage: 25 // High explosive damage
  }
};

// Helper function to get enemy types available at a given time
export function getAvailableEnemyTypes(survivalTimeSeconds: number): EnemyTypeConfig[] {
  return Object.values(ENEMY_TYPES).filter(
    type => type.minWaveTime <= survivalTimeSeconds && type.spawnWeight > 0
  );
}

// Helper function to get a weighted random enemy type
export function getRandomEnemyType(availableTypes: EnemyTypeConfig[]): EnemyTypeConfig {
  const totalWeight = availableTypes.reduce((sum, type) => sum + type.spawnWeight, 0);
  let random = Math.random() * totalWeight;
  
  for (const type of availableTypes) {
    random -= type.spawnWeight;
    if (random <= 0) {
      return type;
    }
  }
  
  return availableTypes[0]; // Fallback
}