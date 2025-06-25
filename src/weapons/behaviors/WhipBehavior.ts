import { IWeaponBehavior, ProjectileFire } from '../IWeaponBehavior';
import { Vector2 } from '../../utils/Vector2';
import { Enemy } from '../../entities/Enemy';
import { Player } from '../../entities/Player';
import { Projectile } from '../../entities/Projectile';
import { PoolManager } from '../../managers/PoolManager';

// VS-style Whip - creates wide horizontal slash effect
export class WhipBehavior implements IWeaponBehavior {
  private lastDirection: number = 1; // 1 for right, -1 for left
  private lastFireTime: number = 0;
  
  constructor(
    private whipLength: number = 150,
    private projectileCount: number = 3 // Multiple projectiles for width
  ) {}
  
  fire(
    position: Vector2, 
    enemies: Enemy[], 
    projectilePool: PoolManager<Projectile>,
    damage: number,
    range: number,
    player?: Player,
    weaponEffectSystem?: any
  ): ProjectileFire[] {
    const currentTime = Date.now();
    
    // Alternate whip direction
    this.lastDirection *= -1;
    
    // Create visual slash effect
    if (weaponEffectSystem && player) {
      weaponEffectSystem.createWhipSlash(player, this.lastDirection, this.whipLength);
    }
    
    this.lastFireTime = currentTime;
    
    // Find enemies in the slash area
    const enemiesHit = enemies.filter(enemy => {
      if (!enemy.sprite.active) return false;
      
      const relativeX = enemy.x - position.x;
      const relativeY = enemy.y - position.y;
      
      // Check if enemy is in the arc area
      const distance = Math.sqrt(relativeX * relativeX + relativeY * relativeY);
      if (distance > this.whipLength || distance < 20) return false;
      
      // Check angle - whip covers 90 degree arc
      const angle = Math.atan2(relativeY, relativeX);
      const targetAngle = this.lastDirection > 0 ? 0 : Math.PI; // 0 for right, PI for left
      const angleDiff = Math.abs(angle - targetAngle);
      
      return angleDiff < Math.PI / 4; // 45 degrees on each side
    });
    
    // Create invisible projectiles for hit detection
    const projectiles: ProjectileFire[] = [];
    enemiesHit.forEach(enemy => {
      const projectile = projectilePool.acquire();
      projectiles.push({
        projectile,
        startX: enemy.x,
        startY: enemy.y,
        targetX: enemy.x,
        targetY: enemy.y,
        speed: 0,
        visuals: {
          color: 0xFFFFFF,
          shape: 'circle',
          size: 1,
          alpha: 0 // Invisible - just for damage
        }
      });
    });
    
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