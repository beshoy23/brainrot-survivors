import { Vector2 } from '../utils/Vector2';
import { Enemy } from '../entities/Enemy';
import { Player } from '../entities/Player';
import { Projectile, ProjectileVisuals, FollowTarget, LiveTarget } from '../entities/Projectile';
import { PoolManager } from '../managers/PoolManager';

export interface ProjectileFire {
  projectile: Projectile;
  startX?: number; // Optional start position (defaults to player)
  startY?: number;
  targetX: number;
  targetY: number;
  speed?: number; // Optional speed override
  visuals?: ProjectileVisuals;
  followTarget?: FollowTarget; // For aura weapons that follow static position
  liveTarget?: LiveTarget; // For aura weapons that follow live object
}

export interface IWeaponBehavior {
  // Find targets and create projectiles
  fire(
    position: Vector2, 
    enemies: Enemy[], 
    projectilePool: PoolManager<Projectile>,
    damage: number,
    range: number,
    player?: Player,
    weaponEffectSystem?: any
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