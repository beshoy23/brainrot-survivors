import { IWeaponBehavior, ProjectileFire } from '../IWeaponBehavior';
import { Vector2 } from '../../utils/Vector2';
import { Enemy } from '../../entities/Enemy';
import { Player } from '../../entities/Player';
import { Projectile } from '../../entities/Projectile';
import { PoolManager } from '../../managers/PoolManager';

export class SpinningKickBehavior implements IWeaponBehavior {
  fire(
    position: Vector2, 
    enemies: Enemy[], 
    projectilePool: PoolManager<Projectile>,
    damage: number,
    range: number,
    player?: Player,
    weaponEffectSystem?: any
  ): ProjectileFire[] {
    // Find all enemies within spinning kick range
    const targets = this.getTargetsInRange(position, enemies, range);
    if (targets.length === 0) return [];
    
    // Trigger player attack animation
    if (player) {
      player.playAttackAnimation();
    }
    
    // Create projectiles for all targets
    const projectileFires: ProjectileFire[] = [];
    
    for (const target of targets) {
      const projectile = projectilePool.acquire();
      projectile.weaponType = 'spinningkick';
      
      // Calculate angle for visual effect
      const dx = target.sprite.x - position.x;
      const dy = target.sprite.y - position.y;
      const angle = Math.atan2(dy, dx);
      
      // Create spinning kick projectile with radial effect
      projectileFires.push({
        projectile,
        targetX: target.sprite.x,
        targetY: target.sprite.y,
        visuals: {
          color: 0xFF00FF, // Magenta for spinning kick
          shape: 'circle',
          size: 4,
          alpha: 0.9,
          rotation: angle,
          trail: true
        }
      });
    }
    
    return projectileFires;
  }
  
  getTargetsInRange(
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
      .slice(0, 8); // Limit to 8 targets to prevent lag
  }
  
  getDescription(): string {
    return 'Spinning kick that hits all enemies in a circular area around the player';
  }
}