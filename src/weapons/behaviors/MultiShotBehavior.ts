import { IWeaponBehavior, ProjectileFire } from '../IWeaponBehavior';
import { Vector2 } from '../../utils/Vector2';
import { Enemy } from '../../entities/Enemy';
import { Projectile } from '../../entities/Projectile';
import { PoolManager } from '../../managers/PoolManager';

export class MultiShotBehavior implements IWeaponBehavior {
  constructor(private additionalShots: number = 0) {}
  
  fire(
    position: Vector2, 
    enemies: Enemy[], 
    projectilePool: PoolManager<Projectile>,
    damage: number,
    range: number
  ): ProjectileFire[] {
    const shotCount = 1 + this.additionalShots;
    const targets = this.getTargets(position, enemies, range, shotCount);
    
    if (targets.length === 0) return [];
    
    const projectiles: ProjectileFire[] = [];
    
    // If we have fewer targets than shots, distribute shots among available targets
    for (let i = 0; i < shotCount; i++) {
      const target = targets[i % targets.length];
      const projectile = projectilePool.acquire();
      
      projectiles.push({
        projectile,
        targetX: target.x,
        targetY: target.y
      });
    }
    
    return projectiles;
  }
  
  getTargets(
    position: Vector2, 
    enemies: Enemy[],
    range: number,
    maxTargets: number
  ): Enemy[] {
    // Find multiple nearest enemies
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
    return `Fires ${1 + this.additionalShots} projectiles at nearest enemies`;
  }
  
  setAdditionalShots(count: number): void {
    this.additionalShots = count;
  }
}