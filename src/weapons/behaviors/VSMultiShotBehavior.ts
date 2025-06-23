import { IWeaponBehavior, ProjectileFire } from '../IWeaponBehavior';
import { Vector2 } from '../../utils/Vector2';
import { Enemy } from '../../entities/Enemy';
import { Player } from '../../entities/Player';
import { Projectile } from '../../entities/Projectile';
import { PoolManager } from '../../managers/PoolManager';

// VS-style multishot with spread pattern
export class VSMultiShotBehavior implements IWeaponBehavior {
  constructor(private additionalShots: number = 0) {}
  
  fire(
    position: Vector2, 
    enemies: Enemy[], 
    projectilePool: PoolManager<Projectile>,
    damage: number,
    range: number,
    player?: Player
  ): ProjectileFire[] {
    const shotCount = 1 + this.additionalShots;
    const projectiles: ProjectileFire[] = [];
    
    // Find nearest enemy as primary target
    const primaryTarget = this.getNearestEnemy(position, enemies, range);
    if (!primaryTarget) return [];
    
    // Calculate base angle to primary target
    const baseAngle = Math.atan2(
      primaryTarget.y - position.y,
      primaryTarget.x - position.x
    );
    
    // VS-style spread configuration
    const spreadAngle = Math.PI / 8; // 22.5 degrees between projectiles
    const totalSpread = spreadAngle * (shotCount - 1);
    const startAngle = baseAngle - totalSpread / 2;
    
    // Fire projectiles in spread pattern
    for (let i = 0; i < shotCount; i++) {
      const projectile = projectilePool.acquire();
      
      // Calculate angle for this projectile
      const angle = shotCount === 1 ? baseAngle : startAngle + (spreadAngle * i);
      
      // Calculate target position along this angle
      const targetX = position.x + Math.cos(angle) * range;
      const targetY = position.y + Math.sin(angle) * range;
      
      projectiles.push({
        projectile,
        targetX,
        targetY,
        visuals: {
          color: 0xFFFF00, // Yellow
          shape: 'circle',
          size: 4
        }
      });
    }
    
    return projectiles;
  }
  
  private getNearestEnemy(position: Vector2, enemies: Enemy[], range: number): Enemy | null {
    let nearestEnemy: Enemy | null = null;
    let nearestDistance = range;
    
    for (const enemy of enemies) {
      if (!enemy.sprite.active) continue;
      
      const distance = Math.sqrt(
        Math.pow(enemy.x - position.x, 2) + 
        Math.pow(enemy.y - position.y, 2)
      );
      
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestEnemy = enemy;
      }
    }
    
    return nearestEnemy;
  }
  
  getDescription(): string {
    const shotCount = 1 + this.additionalShots;
    return shotCount === 1 
      ? 'Fires a single projectile' 
      : `Fires ${shotCount} projectiles in a spread pattern`;
  }
  
  setAdditionalShots(count: number): void {
    this.additionalShots = count;
  }
}