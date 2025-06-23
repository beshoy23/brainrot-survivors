import { EnemyTypeConfig, EnemyTypeId } from '../enemies/EnemyType';

export const ENEMY_TYPES: Record<EnemyTypeId, EnemyTypeConfig> = {
  [EnemyTypeId.BASIC]: {
    id: EnemyTypeId.BASIC,
    name: 'Basic Enemy',
    health: 3, // Further reduced for high density
    speed: 120, // Slower for dodgeability
    damage: 2, // Much lower damage
    size: 18, // Smaller
    color: 0xff0000, // Red
    shape: 'square',
    spawnWeight: 10,
    minWaveTime: 0
  },
  
  [EnemyTypeId.FAST]: {
    id: EnemyTypeId.FAST,
    name: 'Fast Ghost',
    health: 2, // Very fragile for high numbers
    speed: 220, // Reduced from 280
    damage: 1, // Minimal damage
    size: 14, // Smaller
    color: 0xff00ff, // Magenta
    shape: 'diamond',
    spawnWeight: 6,
    minWaveTime: 30 // Appears after 30 seconds
  },
  
  [EnemyTypeId.TANK]: {
    id: EnemyTypeId.TANK,
    name: 'Heavy Tank',
    health: 20, // Reduced for faster kills
    speed: 60, // Slower
    damage: 5, // Much reduced
    size: 28, // Smaller
    color: 0x800000, // Dark red
    shape: 'square',
    spawnWeight: 3,
    minWaveTime: 60 // Appears after 1 minute
  },
  
  [EnemyTypeId.SWARM]: {
    id: EnemyTypeId.SWARM,
    name: 'Swarm Bug',
    health: 1, // One-shot kills for high density
    speed: 140, // Reduced speed
    damage: 1, // Minimal damage
    size: 10, // Very tiny
    color: 0xffaa00, // Orange
    shape: 'circle',
    spawnWeight: 8,
    minWaveTime: 45, // Appears after 45 seconds
    spawnGroupSize: 5 // Groups of 5
  },
  
  [EnemyTypeId.ELITE]: {
    id: EnemyTypeId.ELITE,
    name: 'Elite Boss',
    health: 60, // Reduced for faster boss fights
    speed: 100, // Slower
    damage: 8, // Much reduced
    size: 40, // Smaller
    color: 0x4b0082, // Indigo
    shape: 'diamond',
    spawnWeight: 0, // Special spawn logic
    minWaveTime: 120 // Appears after 2 minutes
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