import { IWeaponBehavior, ProjectileFire } from '../IWeaponBehavior';
import { Vector2 } from '../../utils/Vector2';
import { Enemy } from '../../entities/Enemy';
import { Player } from '../../entities/Player';
import { Projectile } from '../../entities/Projectile';
import { PoolManager } from '../../managers/PoolManager';

export class GroundPoundBehavior implements IWeaponBehavior {
  fire(
    position: Vector2, 
    enemies: Enemy[], 
    projectilePool: PoolManager<Projectile>,
    damage: number,
    range: number,
    player?: Player,
    weaponEffectSystem?: any
  ): ProjectileFire[] {
    // Find all enemies within ground pound area
    const targets = this.getTargetsInArea(position, enemies, range);
    if (targets.length === 0) return [];
    
    // Trigger player attack animation
    if (player) {
      player.playAttackAnimation();
    }
    
    // Create expanding shockwave effect by firing multiple projectiles in waves
    const projectileFires: ProjectileFire[] = [];
    
    // Create multiple shockwave rings
    for (let ring = 0; ring < 3; ring++) {
      const ringDelay = ring * 100; // 100ms between rings
      
      for (const target of targets) {
        const distance = position.distanceTo(new Vector2(target.sprite.x, target.sprite.y));
        const ringRadius = (ring + 1) * (range / 3);
        
        // Only include targets in this ring radius
        if (distance <= ringRadius && distance > ringRadius - (range / 3)) {
          const projectile = projectilePool.acquire();
          projectile.weaponType = 'groundpound';
          
          // Delayed projectile for wave effect
          projectileFires.push({
            projectile,
            targetX: target.sprite.x,
            targetY: target.sprite.y,
            visuals: {
              color: 0xFFAA00, // Orange for ground pound
              shape: 'circle',
              size: 5,
              alpha: 0.7,
              delay: ringDelay
            },
            speed: 400 // Slower for shockwave effect
          });
        }
      }
    }
    
    // If no ring-based targets, just hit all nearby targets
    if (projectileFires.length === 0) {
      for (const target of targets) {
        const projectile = projectilePool.acquire();
        projectile.weaponType = 'groundpound';
        
        projectileFires.push({
          projectile,
          targetX: target.sprite.x,
          targetY: target.sprite.y,
          visuals: {
            color: 0xFFAA00, // Orange for ground pound
            shape: 'circle',
            size: 5,
            alpha: 0.7
          }
        });
      }
    }
    
    return projectileFires;
  }
  
  getTargetsInArea(
    position: Vector2, 
    enemies: Enemy[], 
    range: number
  ): Enemy[] {
    return enemies
      .filter(enemy => enemy.sprite.active && !enemy.isDying)
      .filter(enemy => {
        const distance = position.distanceTo(new Vector2(enemy.sprite.x, enemy.sprite.y));
        return distance <= range;
      })
      .slice(0, 12); // Higher limit for area attack
  }
  
  getDescription(): string {
    return 'Ground pound that creates expanding shockwaves, hitting enemies in multiple waves';
  }
}