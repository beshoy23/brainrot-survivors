export enum WeightClass {
  LIGHT = 'light',
  MEDIUM = 'medium', 
  HEAVY = 'heavy',
  EXPLOSIVE = 'explosive'
}

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
  
  // Kick Physics Properties
  weightClass: WeightClass;
  kickMultiplier: number; // How far they fly when kicked (0.5 = half distance, 2.0 = double)
  chainDamageMultiplier: number; // How much damage they do when hitting others
  explosiveRadius?: number; // For explosive enemies
  explosiveDamage?: number; // For explosive enemies
}

export enum EnemyTypeId {
  BASIC = 'basic',
  FAST = 'fast',
  TANK = 'tank',
  SWARM = 'swarm',
  ELITE = 'elite'
}