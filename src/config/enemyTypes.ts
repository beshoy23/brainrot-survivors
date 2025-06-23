import { EnemyTypeConfig, EnemyTypeId } from '../enemies/EnemyType';

export const ENEMY_TYPES: Record<EnemyTypeId, EnemyTypeConfig> = {
  [EnemyTypeId.BASIC]: {
    id: EnemyTypeId.BASIC,
    name: 'Basic Enemy',
    health: 10,
    speed: 150,
    damage: 10,
    size: 24,
    color: 0xff0000, // Red
    shape: 'square',
    spawnWeight: 10,
    minWaveTime: 0
  },
  
  [EnemyTypeId.FAST]: {
    id: EnemyTypeId.FAST,
    name: 'Fast Ghost',
    health: 5,
    speed: 280,
    damage: 5,
    size: 18,
    color: 0xff00ff, // Magenta
    shape: 'diamond',
    spawnWeight: 6,
    minWaveTime: 30 // Appears after 30 seconds
  },
  
  [EnemyTypeId.TANK]: {
    id: EnemyTypeId.TANK,
    name: 'Heavy Tank',
    health: 50,
    speed: 80,
    damage: 20,
    size: 36,
    color: 0x800000, // Dark red
    shape: 'square',
    spawnWeight: 3,
    minWaveTime: 60 // Appears after 1 minute
  },
  
  [EnemyTypeId.SWARM]: {
    id: EnemyTypeId.SWARM,
    name: 'Swarm Bug',
    health: 3,
    speed: 170,
    damage: 5,
    size: 14,
    color: 0xffaa00, // Orange
    shape: 'circle',
    spawnWeight: 8,
    minWaveTime: 45, // Appears after 45 seconds
    spawnGroupSize: 3 // Reduced from 8 for better balance
  },
  
  [EnemyTypeId.ELITE]: {
    id: EnemyTypeId.ELITE,
    name: 'Elite Boss',
    health: 200,
    speed: 120,
    damage: 30,
    size: 48,
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