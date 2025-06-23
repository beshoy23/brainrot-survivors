import { IWeaponBehavior, ProjectileFire } from '../IWeaponBehavior';
import { Vector2 } from '../../utils/Vector2';
import { Enemy } from '../../entities/Enemy';
import { Projectile } from '../../entities/Projectile';
import { PoolManager } from '../../managers/PoolManager';

// VS-style Whip - creates wide horizontal projectile
export class WhipBehavior implements IWeaponBehavior {
  private lastDirection: number = 1; // 1 for right, -1 for left
  
  constructor(
    private whipLength: number = 150,
    private projectileCount: number = 3 // Multiple projectiles for width
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
    
    const projectiles: ProjectileFire[] = [];
    
    // Create multiple projectiles to form whip shape
    for (let i = 0; i < this.projectileCount; i++) {
      const projectile = projectilePool.acquire();
      
      // Spread projectiles vertically to create whip width
      const verticalOffset = (i - (this.projectileCount - 1) / 2) * 20;
      
      // Target position is horizontal from player
      const targetX = position.x + (this.lastDirection * this.whipLength);
      const targetY = position.y + verticalOffset;
      
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
    // Find enemies in whip direction
    return enemies
      .filter(enemy => {
        if (!enemy.sprite.active) return false;
        
        const relativeX = enemy.x - position.x;
        const relativeY = enemy.y - position.y;
        
        // Check if enemy is on the correct side and within range
        const onCorrectSide = (this.lastDirection > 0 && relativeX > 0) || 
                             (this.lastDirection < 0 && relativeX < 0);
        const withinRange = Math.abs(relativeX) <= this.whipLength && 
                           Math.abs(relativeY) <= 40; // Whip height
        
        return onCorrectSide && withinRange;
      })
      .slice(0, maxTargets);
  }
  
  getDescription(): string {
    return 'Strikes horizontally, alternating left and right';
  }
}