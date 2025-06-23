import { IWeaponBehavior, ProjectileFire } from '../IWeaponBehavior';
import { Vector2 } from '../../utils/Vector2';
import { Enemy } from '../../entities/Enemy';
import { Projectile } from '../../entities/Projectile';
import { PoolManager } from '../../managers/PoolManager';

export class SpreadShotBehavior implements IWeaponBehavior {
  constructor(
    private spreadCount: number = 3,
    private spreadAngle: number = 30 // degrees
  ) {}
  
  fire(
    position: Vector2, 
    enemies: Enemy[], 
    projectilePool: PoolManager<Projectile>,
    damage: number,
    range: number
  ): ProjectileFire[] {
    const targets = this.getTargets(position, enemies, range, 1);
    if (targets.length === 0) return [];
    
    const target = targets[0];
    const projectiles: ProjectileFire[] = [];
    
    // Calculate base angle to target
    const dx = target.x - position.x;
    const dy = target.y - position.y;
    const baseAngle = Math.atan2(dy, dx);
    
    // Create spread pattern
    const angleStep = (this.spreadAngle * Math.PI / 180) / (this.spreadCount - 1);
    const startAngle = baseAngle - (this.spreadAngle * Math.PI / 180) / 2;
    
    for (let i = 0; i < this.spreadCount; i++) {
      const angle = startAngle + (angleStep * i);
      const projectile = projectilePool.acquire();
      
      // Calculate target position for this angle
      const targetX = position.x + Math.cos(angle) * range;
      const targetY = position.y + Math.sin(angle) * range;
      
      projectiles.push({
        projectile,
        targetX,
        targetY
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
    // Just need one target for direction
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
    return `Fires ${this.spreadCount} projectiles in a ${this.spreadAngle}° cone`;
  }
}