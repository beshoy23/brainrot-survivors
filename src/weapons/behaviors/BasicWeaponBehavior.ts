import { IWeaponBehavior, ProjectileFire } from '../IWeaponBehavior';
import { Vector2 } from '../../utils/Vector2';
import { Enemy } from '../../entities/Enemy';
import { Player } from '../../entities/Player';
import { Projectile } from '../../entities/Projectile';
import { PoolManager } from '../../managers/PoolManager';

export class BasicWeaponBehavior implements IWeaponBehavior {
  fire(
    position: Vector2, 
    enemies: Enemy[], 
    projectilePool: PoolManager<Projectile>,
    damage: number,
    range: number,
    player?: Player,
    weaponEffectSystem?: any
  ): ProjectileFire[] {
    const targets = this.getTargets(position, enemies, range, 1);
    if (targets.length === 0) return [];
    
    const target = targets[0];
    const projectile = projectilePool.acquire();
    
    return [{
      projectile,
      targetX: target.x,
      targetY: target.y
    }];
  }
  
  getTargets(
    position: Vector2, 
    enemies: Enemy[],
    range: number,
    maxTargets: number
  ): Enemy[] {
    // Find nearest enemy within range
    const validEnemies = enemies
      .filter(enemy => enemy.sprite.active)
      .map(enemy => ({
        enemy,
        distance: position.distanceTo(new Vector2(enemy.x, enemy.y))
      }))
      .filter(({ distance }) => distance <= range)
      .sort((a, b) => a.distance - b.distance);
    
    return validEnemies
      .slice(0, maxTargets)
      .map(({ enemy }) => enemy);
  }
  
  getDescription(): string {
    return 'Fires a single projectile at the nearest enemy';
  }
}