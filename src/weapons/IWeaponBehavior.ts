import { Vector2 } from '../utils/Vector2';
import { Enemy } from '../entities/Enemy';
import { Projectile, ProjectileVisuals } from '../entities/Projectile';
import { PoolManager } from '../managers/PoolManager';

export interface ProjectileFire {
  projectile: Projectile;
  targetX: number;
  targetY: number;
  visuals?: ProjectileVisuals;
}

export interface IWeaponBehavior {
  // Find targets and create projectiles
  fire(
    position: Vector2, 
    enemies: Enemy[], 
    projectilePool: PoolManager<Projectile>,
    damage: number,
    range: number
  ): ProjectileFire[];
  
  // Get valid targets for this weapon
  getTargets(
    position: Vector2, 
    enemies: Enemy[],
    range: number,
    maxTargets: number
  ): Enemy[];
  
  // Get description for UI
  getDescription(): string;
}