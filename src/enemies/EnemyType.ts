export interface EnemyTypeConfig {
  id: string;
  name: string;
  health: number;
  speed: number;
  damage: number;
  size: number;
  color: number;
  shape: 'square' | 'circle' | 'diamond' | 'triangle';
  spawnWeight: number; // Relative spawn chance
  minWaveTime: number; // Seconds before this enemy type appears
  spawnGroupSize?: number; // For swarm enemies
}

export enum EnemyTypeId {
  BASIC = 'basic',
  FAST = 'fast',
  TANK = 'tank',
  SWARM = 'swarm',
  ELITE = 'elite'
}