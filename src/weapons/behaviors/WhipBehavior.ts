import { IWeaponBehavior, ProjectileFire } from '../IWeaponBehavior';
import { Vector2 } from '../../utils/Vector2';
import { Enemy } from '../../entities/Enemy';
import { Projectile } from '../../entities/Projectile';
import { PoolManager } from '../../managers/PoolManager';

// VS-style Whip - horizontal strike
export class WhipBehavior implements IWeaponBehavior {
  private lastDirection: number = 1; // 1 for right, -1 for left
  
  constructor(
    private whipLength: number = 150,
    private whipWidth: number = 30
  ) {}
  
  fire(
    position: Vector2, 
    enemies: Enemy[], 
    projectilePool: PoolManager<Projectile>,
    damage: number,
    range: number
  ): ProjectileFire[] {
    // Alternate whip direction
    this.lastDirection *= -1;
    
    // Find all enemies in whip area
    const hitEnemies: Enemy[] = [];
    
    for (const enemy of enemies) {
      if (!enemy.sprite.active) continue;
      
      const relativeX = enemy.x - position.x;
      const relativeY = enemy.y - position.y;
      
      // Check if enemy is on the correct side
      if ((this.lastDirection > 0 && relativeX > 0) || 
          (this.lastDirection < 0 && relativeX < 0)) {
        
        // Check if within whip range
        if (Math.abs(relativeX) <= this.whipLength && 
            Math.abs(relativeY) <= this.whipWidth) {
          hitEnemies.push(enemy);
        }
      }
    }
    
    // Damage all enemies in whip area instantly
    hitEnemies.forEach(enemy => {
      enemy.takeDamage(damage);
    });
    
    // Create visual effect projectile (doesn't actually move)
    if (hitEnemies.length > 0) {
      const projectile = projectilePool.acquire();
      const targetX = position.x + (this.lastDirection * this.whipLength);
      
      return [{
        projectile,
        targetX,
        targetY: position.y
      }];
    }
    
    return [];
  }
  
  getDescription(): string {
    return 'Strikes horizontally, alternating left and right';
  }
}